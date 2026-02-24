import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, } from "discord.js";
import { getQuiz } from "../../storage/config-mod.js";
import { DISCORD_COLORS } from "../../tipos/common.js";
export async function publishSquadQuiz(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: "Somente em servidor.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has("Administrator")) {
        await interaction.reply({
            content: "Apenas administradores podem publicar o quiz.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const { guild } = interaction;
    const cfg = await getQuiz(guild.id);
    await mostrarInterfacePublicacaoQuiz(interaction, cfg);
}
async function mostrarInterfacePublicacaoQuiz(interaction, cfg) {
    if (!interaction.guild)
        return;
    let targetChannelId = interaction.options.getChannel("canal")?.id || interaction.channelId;
    let selectedQuestionIdx = cfg.questions.map((_, idx) => idx);
    let selectedResultKeys = cfg.results.map((r) => r.key);
    const gerarEmbed = () => {
        return new EmbedBuilder()
            .setTitle("📢 Publicar Quiz de Personalidade")
            .setDescription(`**Canal de destino:** <#${targetChannelId}>\n\n` +
            "Configure e publique o quiz para os membros do servidor.")
            .addFields([
            {
                name: "📊 Estatísticas do Quiz",
                value: `• **Questões selecionadas:** ${selectedQuestionIdx.length}/${cfg.questions.length}\n` +
                    `• **Resultados selecionados:** ${selectedResultKeys.length}/${cfg.results.length}\n` +
                    `• **Tempo estimado:** ${Math.ceil(cfg.questions.length * 0.5)} min`,
                inline: true,
            },
            {
                name: "🎯 Informações",
                value: `• Atribui cargos automaticamente\n` +
                    `• Cria cargos com cores personalizadas\n` +
                    `• ${cfg.results.length} perfis possíveis`,
                inline: true,
            },
        ])
            .setColor("#5865F2");
    };
    const gerarBotoes = () => {
        const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("squad_select_channel")
            .setLabel("Escolher Canal")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📢"), new ButtonBuilder()
            .setCustomId("squad_select_questions")
            .setLabel("Selecionar Perguntas")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("❓"), new ButtonBuilder()
            .setCustomId("squad_select_results")
            .setLabel("Selecionar Resultados")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🏷️"), new ButtonBuilder()
            .setCustomId("squad_preview")
            .setLabel("Preview")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("👁️"));
        const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("squad_publish")
            .setLabel("Publicar Agora")
            .setStyle(ButtonStyle.Success)
            .setEmoji("🚀"), new ButtonBuilder()
            .setCustomId("squad_cancel")
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("❌"));
        return [row1, row2];
    };
    const response = await interaction.reply({
        embeds: [gerarEmbed()],
        components: gerarBotoes(),
        flags: MessageFlags.Ephemeral,
        fetchReply: true,
    });
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
        if (i.customId === "squad_select_channel") {
            if (!interaction.guild)
                return;
            const canais = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_squad_channel")
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
        else if (i.customId === "squad_select_questions") {
            const options = cfg.questions.slice(0, 25).map((q, idx) => ({
                label: `${idx + 1}. ${q.text.slice(0, 90)}`,
                value: String(idx),
                description: q.text.length > 90 ? q.text.slice(90, 140) : "",
                default: selectedQuestionIdx.includes(idx),
            }));
            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_squad_questions")
                .setPlaceholder("Escolha as perguntas a incluir")
                .setMinValues(1)
                .setMaxValues(Math.min(options.length, 25))
                .addOptions(options);
            const row = new ActionRowBuilder().addComponents(menu);
            await i.update({
                embeds: [gerarEmbed()],
                components: [row, ...gerarBotoes()],
            });
        }
        else if (i.customId === "squad_select_results") {
            const options = cfg.results.slice(0, 25).map((r) => ({
                label: r.label,
                value: r.key,
                description: r.role_name,
                default: selectedResultKeys.includes(r.key),
            }));
            const menu = new StringSelectMenuBuilder()
                .setCustomId("menu_squad_results")
                .setPlaceholder("Escolha os resultados válidos")
                .setMinValues(1)
                .setMaxValues(Math.min(options.length, 25))
                .addOptions(options);
            const row = new ActionRowBuilder().addComponents(menu);
            await i.update({
                embeds: [gerarEmbed()],
                components: [row, ...gerarBotoes()],
            });
        }
        else if (i.customId === "squad_preview") {
            const previewEmbed = new EmbedBuilder()
                .setTitle("👁️ Preview do Quiz")
                .setDescription(`**${cfg.disclaimer}**\n\n` +
                "Assim é como os usuários verão o quiz:")
                .addFields(cfg.questions.slice(0, 3).map((q, idx) => ({
                name: `Pergunta ${idx + 1}: ${q.text}`,
                value: q.answers.map((a) => `• ${a.text}`).join("\n"),
                inline: false,
            })))
                .addFields([
                {
                    name: "🎯 Possíveis Resultados",
                    value: cfg.results
                        .map((r) => `• **${r.label}** → ${r.role_name}`)
                        .join("\n"),
                    inline: false,
                },
            ])
                .setColor("#5865F2");
            if (cfg.questions.length > 3) {
                previewEmbed.setFooter({
                    text: `... e mais ${cfg.questions.length - 3} perguntas`,
                });
            }
            await i.reply({ embeds: [previewEmbed], flags: MessageFlags.Ephemeral });
        }
        else if (i.customId === "squad_publish") {
            await i.deferUpdate();
            if (!interaction.guild)
                return;
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
            if (!targetChannel || !("send" in targetChannel)) {
                await i.followUp({
                    content: "❌ Canal inválido.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const filteredCfg = {
                ...cfg,
                questions: selectedQuestionIdx
                    .map((idx) => cfg.questions[idx])
                    .filter((q) => q !== undefined),
                results: cfg.results.filter((r) => selectedResultKeys.includes(r.key)),
            };
            const quizEmbed = new EmbedBuilder()
                .setTitle("Teste de Personalidade")
                .setDescription(`${filteredCfg.disclaimer}\n\nClique em "Iniciar" para responder ${filteredCfg.questions.length} perguntas de múltipla escolha.`)
                .setColor(DISCORD_COLORS.BLURPLE);
            const startBtn = new ButtonBuilder()
                .setCustomId("quiz:start")
                .setLabel("Iniciar")
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(startBtn);
            await targetChannel.send({
                embeds: [quizEmbed],
                components: [row],
            });
            await i.editReply({
                content: `✅ Quiz publicado com sucesso em ${targetChannel}!`,
                embeds: [],
                components: [],
            });
        }
        else if (i.customId === "squad_cancel") {
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
        if (i.customId === "menu_squad_channel") {
            targetChannelId = i.values[0] ?? "";
            await i.update({
                embeds: [gerarEmbed()],
                components: gerarBotoes(),
            });
        }
        else if (i.customId === "menu_squad_questions") {
            selectedQuestionIdx = i.values.map((v) => Number(v));
            await i.update({ embeds: [gerarEmbed()], components: gerarBotoes() });
        }
        else if (i.customId === "menu_squad_results") {
            selectedResultKeys = i.values;
            await i.update({ embeds: [gerarEmbed()], components: gerarBotoes() });
        }
    });
}
async function runQuiz(interaction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: "Somente em servidor.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const { guild } = interaction;
    const cfg = await getQuiz(guild.id);
    const answers = {};
    await interaction.reply({
        content: "Preparando o quiz...",
        flags: MessageFlags.Ephemeral,
    });
    const msg = (await interaction.fetchReply());
    for (let i = 0; i < cfg.questions.length; i++) {
        const q = cfg.questions[i];
        if (!q)
            continue;
        const embed = new EmbedBuilder()
            .setTitle(`Pergunta ${i + 1}/${cfg.questions.length}`)
            .setDescription(q.text)
            .setColor(DISCORD_COLORS.BLURPLE);
        const select = new StringSelectMenuBuilder()
            .setCustomId(`quiz:q:${i}:${interaction.user.id}`)
            .setPlaceholder("Escolha uma opção")
            .addOptions(q.answers.map((a) => ({ label: a.text, value: a.result })));
        const row = new ActionRowBuilder().addComponents(select);
        await interaction.editReply({
            content: undefined,
            embeds: [embed],
            components: [row],
        });
        let pick = null;
        try {
            pick = await msg.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                filter: (i) => i.user.id === interaction.user.id &&
                    i.customId === `quiz:q:${i}:${interaction.user.id}`,
            });
        }
        catch {
            pick = null;
        }
        if (!pick) {
            await interaction.editReply({
                content: "Erro ao processar sua resposta.",
                embeds: [],
                components: [],
            });
            return;
        }
        const resultKey = pick.values[0];
        if (!resultKey)
            continue;
        const w = 1;
        answers[resultKey] = (answers[resultKey] ?? 0) + w;
        await pick.update({
            content: `Você escolheu: ${q.answers.find((a) => a.result === resultKey)?.text}`,
            embeds: [],
            components: [],
        });
    }
    const orderedKeys = cfg.results.map((r) => r.key);
    const scores = orderedKeys.map((k) => ({ key: k, score: answers[k] ?? 0 }));
    scores.sort((a, b) => b.score - a.score ||
        orderedKeys.indexOf(a.key) - orderedKeys.indexOf(b.key));
    const winnerKey = scores[0]?.key ?? cfg.results[0]?.key;
    const winner = cfg.results.find((r) => r.key === winnerKey) ?? cfg.results[0];
    if (!winner) {
        await interaction.editReply({
            content: "❌ Erro ao determinar resultado.",
            embeds: [],
            components: [],
        });
        return;
    }
    const roleName = winner.role_name;
    let role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
        let colorNum = undefined;
        if (winner.color && /^#?[\dA-Fa-f]{6}$/.test(winner.color)) {
            const hex = winner.color.startsWith("#")
                ? winner.color.slice(1)
                : winner.color;
            colorNum = Number.parseInt(hex, 16);
        }
        role = await guild.roles.create({
            name: roleName,
            color: colorNum,
            reason: "Quiz resultado",
        });
    }
    const member = await guild.members.fetch(interaction.user.id);
    await member.roles.add(role).catch(() => { });
    const avatar = interaction.user.displayAvatarURL?.({ size: 128 }) ?? null;
    const rules = guild.rulesChannelId
        ? `https://discord.com/channels/${guild.id}/${guild.rulesChannelId}`
        : undefined;
    const resultEmbed = new EmbedBuilder()
        .setTitle("Resultado do Quiz de Personalidade")
        .setDescription(`Você foi classificado como ${winner.label}.\n\nCargo atribuído: **${roleName}**${rules ? `\n\nConfira as regras do servidor: ${rules}` : ""}`)
        .setColor(DISCORD_COLORS.SUCCESS);
    if (avatar)
        resultEmbed.setThumbnail(avatar);
    await interaction.followUp({
        embeds: [resultEmbed],
        flags: MessageFlags.Ephemeral,
    });
}
export async function handleQuizComponents(interaction) {
    if (interaction.isButton() && interaction.customId === "quiz:start") {
        await runQuiz(interaction);
    }
}
