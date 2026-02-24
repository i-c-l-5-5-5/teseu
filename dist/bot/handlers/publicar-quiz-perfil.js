import { examplePerfilQuizTemplate } from "../../tipos/index.js";
import { getPerfilQuizConfig, isPerfilQuizReady, setPerfilQuizConfig, } from "../../storage/perfil-quiz.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, PermissionFlagsBits, StringSelectMenuBuilder, } from "discord.js";
export async function handlePublicarQuizPerfil(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: "❌ Apenas administradores podem usar este comando.",
            ephemeral: true,
        });
        return;
    }
    const targetChannel = interaction.options.getChannel("canal") || interaction.channel;
    if (!targetChannel || !("send" in targetChannel)) {
        await interaction.reply({
            content: "❌ Canal inválido ou sem permissão de envio.",
            ephemeral: true,
        });
        return;
    }
    const isReady = await isPerfilQuizReady();
    const config = await getPerfilQuizConfig();
    if (!isReady) {
        await mostrarConfigInicialQuiz(interaction);
        return;
    }
    await mostrarInterfacePublicacao(interaction, config);
}
async function mostrarConfigInicialQuiz(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("⚙️ Quiz de Perfil Não Configurado")
        .setDescription("O quiz de perfil não está configurado ainda. Escolha uma opção abaixo para começar:")
        .addFields([
        {
            name: "🚀 Configuração Rápida (Recomendado)",
            value: "Ativa um quiz básico com:\n" +
                "• 3 perguntas sobre área e experiência\n" +
                "• Resultados para Frontend, Backend, DevOps\n" +
                "• Badges automáticos com Badgen\n" +
                "• Cores personalizadas por área",
            inline: false,
        },
        {
            name: "🎨 Configuração Manual",
            value: "Acesse o painel admin em: `/config`\nCrie perguntas e resultados personalizados",
            inline: false,
        },
    ])
        .setColor("#FFA500");
    const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("quiz_setup_example")
        .setLabel("Usar Configuração Exemplo")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀"), new ButtonBuilder()
        .setCustomId("quiz_setup_manual")
        .setLabel("Configurar Manualmente")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎨"), new ButtonBuilder()
        .setCustomId("quiz_setup_cancel")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌"));
    const payloadSetup = {
        embeds: [embed],
        components: [botoes],
        ephemeral: true,
        fetchReply: true,
    };
    const response = interaction.replied || interaction.deferred
        ? await interaction.editReply(payloadSetup)
        : await interaction.reply(payloadSetup);
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem iniciou pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (i.customId === "quiz_setup_example") {
            await i.deferUpdate();
            await handleAtivarQuizPerfilExemplo(interaction);
        }
        else if (i.customId === "quiz_setup_manual") {
            await i.deferUpdate();
            await interaction.editReply(payloadSetup);
        }
        else if (i.customId === "quiz_setup_cancel") {
            await i.deferUpdate();
            await interaction.editReply(payloadSetup);
        }
    });
}
async function mostrarInterfacePublicacao(interaction, config) {
    if (!interaction.guild)
        return;
    let targetChannelId = interaction.options.getChannel("canal")?.id || interaction.channelId;
    let selectedQuestionIdx = config.questions.map((_, idx) => idx);
    const gerarEmbed = () => {
        return new EmbedBuilder()
            .setTitle("📢 Publicar Quiz de Perfil")
            .setDescription(`**Status:** ${config.enabled ? "✅ Ativo" : "❌ Desativado"}\n` +
            `**Canal de destino:** <#${targetChannelId}>\n\n` +
            "Use os botões abaixo para configurar e publicar o quiz.")
            .addFields([
            {
                name: "📊 Estatísticas do Quiz",
                value: `• **Questões selecionadas:** ${selectedQuestionIdx.length}/${config.questions.length}\n` +
                    `• **Resultados:** ${config.results.length}\n` +
                    `• **Tempo estimado:** ${Math.ceil(config.questions.length * 0.5)} min`,
                inline: true,
            },
            {
                name: "🎯 Informações",
                value: "• Quiz interativo com botões\n" +
                    "• Cria perfis personalizados\n" +
                    "• Badges e cores dinâmicas",
                inline: true,
            },
        ])
            .setColor(config.enabled ? "#00FF00" : "#FF0000");
    };
    const gerarBotoes = () => {
        const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("quiz_select_channel")
            .setLabel("Escolher Canal")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📢"), new ButtonBuilder()
            .setCustomId("quiz_select_questions")
            .setLabel("Selecionar Perguntas")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("❓"), new ButtonBuilder()
            .setCustomId("quiz_toggle")
            .setLabel(config.enabled ? "Desativar" : "Ativar")
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(config.enabled ? "❌" : "✅"), new ButtonBuilder()
            .setCustomId("quiz_preview")
            .setLabel("Preview")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("👁️"));
        const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("quiz_publish")
            .setLabel("Publicar Agora")
            .setStyle(ButtonStyle.Success)
            .setEmoji("🚀")
            .setDisabled(!config.enabled), new ButtonBuilder()
            .setCustomId("quiz_cancel")
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("❌"));
        return [row1, row2];
    };
    const payloadPublish = {
        embeds: [gerarEmbed()],
        components: gerarBotoes(),
        ephemeral: true,
        fetchReply: true,
    };
    const response = interaction.replied || interaction.deferred
        ? await interaction.editReply(payloadPublish)
        : await interaction.reply(payloadPublish);
    const collector = response.createMessageComponentCollector();
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem iniciou pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (i.customId === "quiz_select_channel") {
            if (!interaction.guild)
                return;
            const canais = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_quiz_channel")
                .setPlaceholder("Escolha o canal")
                .addOptions(Array.from(canais.values())
                .slice(0, 25)
                .map((canal) => ({
                label: canal.name,
                value: canal.id,
                description: `Publicar em #${canal.name}`,
                default: canal.id === targetChannelId,
            })));
            const row = new ActionRowBuilder().addComponents(menu);
            await i.update({
                embeds: [gerarEmbed()],
                components: [row, ...gerarBotoes()],
            });
        }
        else if (i.customId === "quiz_select_questions") {
            const options = config.questions.slice(0, 25).map((q, idx) => ({
                label: `${idx + 1}. ${q.text.slice(0, 90)}`,
                value: String(idx),
                description: q.text.length > 90 ? q.text.slice(90, 140) : "",
                default: selectedQuestionIdx.includes(idx),
            }));
            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_quiz_questions")
                .setPlaceholder("Escolha as perguntas que deseja incluir")
                .setMinValues(1)
                .setMaxValues(Math.min(options.length, 25))
                .addOptions(options);
            const row = new ActionRowBuilder().addComponents(menu);
            await i.update({
                embeds: [gerarEmbed()],
                components: [row, ...gerarBotoes()],
            });
        }
        else if (i.customId === "quiz_toggle") {
            config.enabled = !config.enabled;
            await setPerfilQuizConfig(config);
            await i.update({
                embeds: [gerarEmbed()],
                components: gerarBotoes(),
            });
        }
        else if (i.customId === "quiz_preview") {
            const previewEmbed = new EmbedBuilder()
                .setTitle("👁️ Preview do Quiz")
                .setDescription("Assim é como os usuários verão o quiz:")
                .addFields(config.questions.slice(0, 3).map((q, idx) => ({
                name: `Pergunta ${idx + 1}: ${q.text}`,
                value: q.answers.map((a) => `• ${a.text}`).join("\n"),
                inline: false,
            })))
                .setColor("#5865F2");
            if (config.questions.length > 3) {
                previewEmbed.setFooter({
                    text: `... e mais ${config.questions.length - 3} perguntas`,
                });
            }
            await i.reply({ embeds: [previewEmbed], ephemeral: true });
        }
        else if (i.customId === "quiz_publish") {
            await i.deferUpdate();
            if (!interaction.guild)
                return;
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
            if (!targetChannel || !("send" in targetChannel)) {
                await i.followUp({ content: "❌ Canal inválido.", ephemeral: true });
                return;
            }
            config.channelId = targetChannelId;
            await setPerfilQuizConfig(config);
            await publicarMensagemQuiz(targetChannel, {
                ...config,
                questions: selectedQuestionIdx.map((idx) => config.questions[idx]),
            });
            await i.editReply({
                content: `✅ Quiz publicado com sucesso em ${targetChannel}!`,
                embeds: [],
                components: [],
            });
        }
        else if (i.customId === "quiz_cancel") {
            await i.update({
                content: "❌ Publicação cancelada.",
                embeds: [],
                components: [],
            });
        }
    });
    const selectCollector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
    });
    selectCollector.on("collect", async (i) => {
        if (i.customId === "menu_quiz_channel") {
            targetChannelId = i.values[0] ?? "";
            await i.update({
                embeds: [gerarEmbed()],
                components: gerarBotoes(),
            });
        }
        else if (i.customId === "menu_quiz_questions") {
            selectedQuestionIdx = i.values.map((v) => Number(v));
            await i.update({
                embeds: [gerarEmbed()],
                components: gerarBotoes(),
            });
        }
    });
}
async function publicarMensagemQuiz(channel, config) {
    const embed = new EmbedBuilder()
        .setTitle("🎯 Quiz de Criação de Perfil")
        .setDescription("**Crie seu perfil personalizado respondendo algumas perguntas!**\n\n" +
        "Este quiz irá:\n" +
        "• 📝 Definir sua bio e área de atuação\n" +
        "• 🏆 Atribuir badges baseados em suas skills\n" +
        "• 🎨 Personalizar as cores do seu perfil\n" +
        "• ⚡ Gerar emblemas únicos\n\n" +
        "**Para começar, clique no botão abaixo:**")
        .addFields([
        {
            name: "📊 Informações",
            value: `• **Questões:** ${config.questions.length}\n` +
                `• **Possíveis Resultados:** ${config.results.length}\n` +
                `• **Tempo Estimado:** ${Math.ceil(config.questions.length * 0.5)} minutos`,
            inline: true,
        },
        {
            name: "🎪 Recursos",
            value: "• Badges dinâmicos\n• Cores personalizadas\n• Bio customizada\n• Emblemas únicos",
            inline: true,
        },
    ])
        .setColor("#5865F2")
        .setTimestamp()
        .setFooter({ text: "Clique em 'Iniciar Quiz' para começar!" });
    const botao = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("start_perfil_quiz")
        .setLabel("Iniciar Quiz")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎯"));
    await channel.send({
        embeds: [embed],
        components: [botao],
    });
}
export async function handleConfigQuizPerfil(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: "❌ Apenas administradores podem usar este comando.",
            ephemeral: true,
        });
        return;
    }
    const acao = interaction.options.getString("acao", true);
    const valor = interaction.options.getString("valor");
    const config = await getPerfilQuizConfig();
    switch (acao) {
        case "status":
            await handleStatusQuiz(interaction, config);
            break;
        case "toggle":
            await handleToggleQuiz(interaction, config);
            break;
        case "cor":
            await handleCorPadrao(interaction, config, valor);
            break;
        case "resultados":
            await handleListarResultados(interaction, config);
            break;
        case "questoes":
            await handleListarQuestoes(interaction, config);
            break;
        default:
            await interaction.reply({
                content: "❌ Ação não reconhecida.",
                ephemeral: true,
            });
    }
}
async function handleStatusQuiz(interaction, config) {
    const canal = config.channelId ? `<#${config.channelId}>` : "Não definido";
    const corPadrao = config.results[0]?.aparencia?.corFundo || "#5865F2";
    const embed = new EmbedBuilder()
        .setTitle("📊 Status do Quiz de Perfil")
        .setDescription(`**Estado:** ${config.enabled ? "🟢 Ativo" : "🔴 Inativo"}\n` +
        `**Canal:** ${canal}\n` +
        `**Questões:** ${config.questions.length}\n` +
        `**Resultados:** ${config.results.length}\n` +
        `**Cor Padrão:** ${corPadrao}`)
        .addFields([
        {
            name: "⚙️ Configurações Disponíveis",
            value: "• `/publicar-quiz-perfil config toggle` - Ativar/Desativar\n" +
                "• `/publicar-quiz-perfil config cor #FF0000` - Mudar cor padrão\n" +
                "• `/publicar-quiz-perfil config questoes` - Ver questões\n" +
                "• `/publicar-quiz-perfil config resultados` - Ver resultados",
            inline: false,
        },
    ])
        .setColor(config.enabled ? "#00FF00" : "#FF0000")
        .setFooter({ text: "Use o painel admin para configurações avançadas" });
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
async function handleToggleQuiz(interaction, config) {
    config.enabled = !config.enabled;
    const success = await setPerfilQuizConfig(config);
    if (success) {
        const status = config.enabled ? "ativado" : "desativado";
        const emoji = config.enabled ? "✅" : "⏸️";
        await interaction.reply({
            content: `${emoji} Quiz de perfil **${status}** com sucesso!`,
            ephemeral: true,
        });
    }
    else {
        await interaction.reply({
            content: "❌ Erro ao alterar status do quiz.",
            ephemeral: true,
        });
    }
}
async function handleCorPadrao(interaction, config, valor) {
    if (!valor) {
        const corAtual = config.results[0]?.aparencia?.corFundo || "#5865F2";
        await interaction.reply({
            content: `🎨 Cor padrão atual: **${corAtual}**\n\nPara alterar, use: \`/publicar-quiz-perfil config cor #NOVA_COR\``,
            ephemeral: true,
        });
        return;
    }
    if (!/^#[\da-f]{6}$/i.test(valor)) {
        await interaction.reply({
            content: "❌ Cor inválida! Use formato hexadecimal: `#FF0000`",
            ephemeral: true,
        });
        return;
    }
    config.results.forEach((result) => {
        if (!result.aparencia) {
            result.aparencia = { corFundo: valor };
        }
        else if (!result.aparencia.corFundo) {
            result.aparencia.corFundo = valor;
        }
    });
    const success = await setPerfilQuizConfig(config);
    await (success
        ? interaction.reply({
            content: `🎨 Cor padrão alterada para **${valor}**!`,
            ephemeral: true,
        })
        : interaction.reply({
            content: "❌ Erro ao salvar nova cor.",
            ephemeral: true,
        }));
}
async function handleListarResultados(interaction, config) {
    if (config.results.length === 0) {
        await interaction.reply({
            content: "❌ Nenhum resultado configurado.",
            ephemeral: true,
        });
        return;
    }
    const embed = new EmbedBuilder()
        .setTitle("🏆 Resultados do Quiz")
        .setDescription("Possíveis perfis que os usuários podem obter:")
        .setColor("#5865F2");
    config.results
        .slice(0, 10)
        .forEach((result, index) => {
        const cor = result.aparencia?.corFundo || "#5865F2";
        const badges = result.badges.length;
        embed.addFields([
            {
                name: `${index + 1}. ${result.area}`,
                value: `**Bio:** ${result.bio.slice(0, 50)}${result.bio.length > 50 ? "..." : ""}\n` +
                    `**Badges:** ${badges}\n` +
                    `**Cor:** ${cor}`,
                inline: true,
            },
        ]);
    });
    if (config.results.length > 10) {
        embed.setFooter({
            text: `E mais ${config.results.length - 10} resultados...`,
        });
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
async function handleListarQuestoes(interaction, config) {
    if (config.questions.length === 0) {
        await interaction.reply({
            content: "❌ Nenhuma questão configurada.",
            ephemeral: true,
        });
        return;
    }
    const embed = new EmbedBuilder()
        .setTitle("❓ Questões do Quiz")
        .setDescription("Perguntas que serão feitas aos usuários:")
        .setColor("#5865F2");
    config.questions.slice(0, 5).forEach((question, index) => {
        const opcoes = question.answers
            .map((answer, i) => `${i + 1}. ${answer.text}`)
            .join("\n");
        embed.addFields([
            {
                name: `${index + 1}. ${question.text}`,
                value: opcoes.slice(0, 200) + (opcoes.length > 200 ? "..." : ""),
                inline: false,
            },
        ]);
    });
    if (config.questions.length > 5) {
        embed.setFooter({
            text: `E mais ${config.questions.length - 5} questões...`,
        });
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
export async function handleAtivarQuizPerfilExemplo(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.editReply({
            content: "❌ Apenas administradores podem usar este comando.",
        });
        return;
    }
    const exampleConfig = examplePerfilQuizTemplate();
    exampleConfig.enabled = true;
    exampleConfig.channelId = interaction.channel?.id;
    const success = await setPerfilQuizConfig(exampleConfig);
    if (success) {
        const embed = new EmbedBuilder()
            .setTitle("✅ Quiz de Perfil Configurado!")
            .setDescription("A configuração exemplo foi ativada com sucesso!\n\n" +
            "**O que foi configurado:**\n" +
            "• 3 perguntas sobre experiência e preferências\n" +
            "• Resultados para Frontend, Backend e outras áreas\n" +
            "• Badges automáticos usando Badgen\n" +
            "• Cores personalizadas por perfil\n\n" +
            "Agora você pode usar `/publicar-quiz-perfil publicar` para disponibilizar aos usuários!")
            .addFields([
            {
                name: "⚙️ Próximos Passos",
                value: "• Use `/publicar-quiz-perfil publicar` novamente para publicar\n" +
                    "• Ou acesse `/publicar-quiz-perfil config status` para ver o status\n" +
                    "• Personalize no painel admin para configurações avançadas",
                inline: false,
            },
        ])
            .setColor("#00FF00")
            .setFooter({ text: "Configuração exemplo ativada • Pronto para usar!" });
        await interaction.editReply({
            embeds: [embed],
            components: [],
        });
    }
    else {
        await interaction.editReply({
            content: "❌ Erro ao salvar configuração. Tente novamente.",
        });
    }
}
