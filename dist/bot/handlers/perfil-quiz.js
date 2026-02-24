import { finalizePerfilQuiz, getPerfilQuizPreview, getPerfilQuizProgress, } from "../../services/perfil-quiz.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, } from "discord.js";
import { clearPerfilQuizSession, getPerfilQuizConfig, getPerfilQuizSession, isPerfilQuizReady, startPerfilQuizSession, } from "../../storage/perfil-quiz.js";
export async function startPerfilQuiz(message, user) {
    try {
        if (!message.guild)
            return;
        const isReady = await isPerfilQuizReady();
        if (!isReady) {
            await message.reply({
                content: "❌ O quiz de perfil não está configurado ou ativo no momento.",
                allowedMentions: { repliedUser: false },
            });
            return;
        }
        const config = await getPerfilQuizConfig();
        if (config.channelId && message.channel.id !== config.channelId) {
            await message.reply({
                content: `❌ O quiz de perfil só pode ser iniciado em <#${config.channelId}>.`,
                allowedMentions: { repliedUser: false },
            });
            return;
        }
        const existingSession = await getPerfilQuizSession(user.id, message.guild.id);
        if (existingSession) {
            await message.reply({
                content: "⚠️ Você já tem um quiz de perfil em andamento. Use os botões da mensagem anterior para continuar.",
                allowedMentions: { repliedUser: false },
            });
            return;
        }
        const session = await startPerfilQuizSession(user.id, message.guild.id);
        await sendPerfilQuizQuestion(message, session);
    }
    catch (error) {
        console.error("Erro ao iniciar quiz de perfil:", error);
        await message
            .reply({
            content: "❌ Erro ao iniciar o quiz de perfil.",
            allowedMentions: { repliedUser: false },
        })
            .catch(() => { });
    }
}
async function sendPerfilQuizQuestion(message, session) {
    try {
        const config = await getPerfilQuizConfig();
        const question = config.questions[session.currentQuestion];
        if (!question) {
            await finalizePerfilQuiz(session);
            return;
        }
        const progress = await getPerfilQuizProgress(session);
        const preview = await getPerfilQuizPreview(session);
        const embed = new EmbedBuilder()
            .setTitle("🎯 Quiz de Perfil")
            .setDescription(question.text)
            .addFields([
            {
                name: "Progresso",
                value: `${progress}% (${session.currentQuestion + 1}/${config.questions.length})`,
                inline: true,
            },
            {
                name: "Tendência Atual",
                value: `${preview.topResult} (${preview.confidence}% confiança)`,
                inline: true,
            },
        ])
            .setColor("#5865F2")
            .setFooter({
            text: `Pergunta ${session.currentQuestion + 1} de ${config.questions.length}`,
        });
        const components = [];
        let currentRow = new ActionRowBuilder();
        question.answers.forEach((answer, index) => {
            if (index > 0 && index % 5 === 0) {
                components.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            const button = new ButtonBuilder()
                .setCustomId(`perfil_quiz_${session.userId}_${session.currentQuestion}_${index}`)
                .setLabel(answer.text.substring(0, 80))
                .setStyle(ButtonStyle.Primary);
            currentRow.addComponents(button);
        });
        if (currentRow.components.length > 0) {
            components.push(currentRow);
        }
        const cancelRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(`perfil_quiz_cancel_${session.userId}`)
            .setLabel("❌ Cancelar Quiz")
            .setStyle(ButtonStyle.Danger));
        components.push(cancelRow);
        await message.reply({
            content: `<@${session.userId}>`,
            embeds: [embed],
            components,
            allowedMentions: { repliedUser: false },
        });
    }
    catch (error) {
        console.error("Erro ao enviar pergunta do quiz:", error);
        await message
            .reply({
            content: "❌ Erro ao enviar pergunta do quiz.",
            allowedMentions: { repliedUser: false },
        })
            .catch(() => { });
    }
}
export async function handlePerfilQuizAnswer(interaction) {
    try {
        const { customId } = interaction;
        const parts = customId.split("_");
        if (parts[0] !== "perfil" || parts[1] !== "quiz")
            return;
        if (parts[2] === "cancel") {
            const userId = parts[3];
            if (interaction.user.id !== userId) {
                await interaction.reply({
                    content: "❌ Você não pode cancelar o quiz de outro usuário.",
                    ephemeral: true,
                });
                return;
            }
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "Este comando só pode ser usado em um servidor.",
                    ephemeral: true,
                });
                return;
            }
            await clearPerfilQuizSession(userId, interaction.guildId);
            await interaction.update({
                content: "❌ Quiz de perfil cancelado.",
                embeds: [],
                components: [],
            });
            return;
        }
        const userId = parts[2];
        const questionIndex = Number.parseInt(parts[3] ?? "0");
        const answerIndex = Number.parseInt(parts[4] ?? "0");
        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: "❌ Este quiz pertence a outro usuário.",
                ephemeral: true,
            });
            return;
        }
        if (!interaction.guild) {
            await interaction.reply({
                content: "❌ Este comando só pode ser usado em servidores.",
                ephemeral: true,
            });
            return;
        }
        const session = await getPerfilQuizSession(userId, interaction.guild.id);
        if (session?.currentQuestion !== questionIndex) {
            await interaction.reply({
                content: "❌ Sessão de quiz inválida ou expirada.",
                ephemeral: true,
            });
            return;
        }
        const config = await getPerfilQuizConfig();
        const question = config.questions[questionIndex];
        const answer = question?.answers[answerIndex];
        if (!question || !answer) {
            await interaction.reply({
                content: "❌ Resposta inválida.",
                ephemeral: true,
            });
            return;
        }
        session.answers.push({
            questionIndex,
            answerIndex,
            result: answer.result,
            weight: answer.weight || 1,
        });
        session.currentQuestion++;
        await (session.currentQuestion >= config.questions.length
            ? finalizePerfilQuiz(session)
            : sendPerfilQuizQuestionToInteraction(interaction, session));
    }
    catch (error) {
        console.error("Erro ao processar resposta do quiz de perfil:", error);
        await interaction
            .reply({
            content: "❌ Erro ao processar resposta do quiz.",
            ephemeral: true,
        })
            .catch(() => { });
    }
}
async function sendPerfilQuizQuestionToInteraction(interaction, session) {
    const config = await getPerfilQuizConfig();
    const question = config.questions[session.currentQuestion];
    if (!question) {
        throw new Error("Pergunta não encontrada");
    }
    const progress = await getPerfilQuizProgress(session);
    const preview = await getPerfilQuizPreview(session);
    const embed = new EmbedBuilder()
        .setTitle("🎯 Quiz de Perfil")
        .setDescription(question.text)
        .addFields([
        {
            name: "Progresso",
            value: `${progress}% (${session.currentQuestion + 1}/${config.questions.length})`,
            inline: true,
        },
        {
            name: "Tendência Atual",
            value: `${preview.topResult} (${preview.confidence}% confiança)`,
            inline: true,
        },
    ])
        .setColor("#5865F2")
        .setFooter({
        text: `Pergunta ${session.currentQuestion + 1} de ${config.questions.length}`,
    });
    const components = [];
    let currentRow = new ActionRowBuilder();
    question.answers.forEach((answer, index) => {
        if (index > 0 && index % 5 === 0) {
            components.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        const button = new ButtonBuilder()
            .setCustomId(`perfil_quiz_${session.userId}_${session.currentQuestion}_${index}`)
            .setLabel(answer.text.substring(0, 80))
            .setStyle(ButtonStyle.Primary);
        currentRow.addComponents(button);
    });
    if (currentRow.components.length > 0) {
        components.push(currentRow);
    }
    const cancelRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId(`perfil_quiz_cancel_${session.userId}`)
        .setLabel("❌ Cancelar Quiz")
        .setStyle(ButtonStyle.Danger));
    components.push(cancelRow);
    await interaction.update({
        content: `<@${session.userId}>`,
        embeds: [embed],
        components,
    });
}
