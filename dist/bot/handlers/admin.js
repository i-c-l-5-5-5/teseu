import { getChannelConfig, setChannelConfig } from "../../storage/channel-config.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import { MODAL_TIMEOUT_MS } from "../../tipos/common.js";
export async function handleAdmin(interaction) {
    try {
        if (!interaction.guildId || !interaction.guild) {
            await interaction.reply({
                content: "❌ Este comando só pode ser usado em servidores.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await mostrarMenuPrincipal(interaction);
    }
    catch (error) {
        console.error("Erro no comando admin:", error);
        await (interaction.deferred
            ? interaction.editReply("❌ Erro ao abrir o painel de administração.")
            : interaction
                .reply({
                content: "❌ Erro ao abrir o painel de administração.",
                flags: MessageFlags.Ephemeral,
            })
                .catch(() => { }));
    }
}
async function mostrarMenuPrincipal(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("⚙️ Painel de Administração do Barqueiro")
        .setDescription("Bem-vindo ao painel de administração! Selecione a área que deseja configurar abaixo.\n\n" +
        "**Áreas disponíveis:**\n" +
        "🔧 **Canais** - Configure canais para diferentes funcionalidades\n" +
        "📢 **Embeds** - Crie e publique embeds personalizadas\n" +
        "🎯 **Quiz de Perfil** - Gerencie o quiz de criação de perfil\n" +
        "🧩 **Quiz de Squads** - Publique o quiz de personalidade\n" +
        "🏆 **Ranking** - Configure o sistema de ranking\n" +
        "📊 **Visualizar Status** - Veja o status atual das configurações")
        .setColor("#5865F2")
        .setFooter({ text: "Use os menus abaixo para navegar" });
    const menuPrincipal = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId("admin_menu_principal")
        .setPlaceholder("Selecione uma área de configuração...")
        .addOptions({
        label: "Configuração de Canais",
        description: "Defina canais para funcionalidades do bot",
        value: "config_canais",
        emoji: "🔧",
    }, {
        label: "Embeds e Anúncios",
        description: "Crie e publique embeds personalizadas",
        value: "embeds",
        emoji: "📢",
    }, {
        label: "Quiz de Perfil",
        description: "Gerencie o quiz de criação de perfil",
        value: "quiz_perfil",
        emoji: "🎯",
    }, {
        label: "Quiz de Squads",
        description: "Publique o quiz de personalidade",
        value: "quiz_squads",
        emoji: "🧩",
    }, {
        label: "Ranking",
        description: "Configure o sistema de ranking",
        value: "ranking",
        emoji: "🏆",
    }, {
        label: "Visualizar Status",
        description: "Veja o status de todas as configurações",
        value: "status",
        emoji: "📊",
    }));
    let response;
    const payload = {
        embeds: [embed],
        components: [menuPrincipal],
        ephemeral: true,
        fetchReply: true,
    };
    if (interaction.isCommand()) {
        response =
            interaction.replied || interaction.deferred
                ? await interaction.editReply(payload)
                : await interaction.reply(payload);
    }
    else {
        await interaction.deferUpdate();
        response = (await interaction.message?.edit(payload));
    }
    const collector = response.createMessageComponentCollector();
    collector.on("collect", async (componentInteraction) => {
        if (componentInteraction.user.id !== interaction.user.id) {
            await componentInteraction.reply({
                content: "❌ Apenas quem iniciou pode interagir.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        try {
            if (componentInteraction.isStringSelectMenu()) {
                if (componentInteraction.customId === "admin_menu_principal") {
                    const selected = componentInteraction.values[0];
                    switch (selected) {
                        case "config_canais":
                            await mostrarMenuCanais(componentInteraction);
                            break;
                        case "embeds":
                            await mostrarMenuEmbeds(componentInteraction);
                            break;
                        case "quiz_perfil":
                            await mostrarMenuQuizPerfil(componentInteraction);
                            break;
                        case "quiz_squads":
                            await mostrarMenuQuizSquads(componentInteraction);
                            break;
                        case "ranking":
                            await mostrarMenuRanking(componentInteraction);
                            break;
                        case "status":
                            await mostrarStatus(componentInteraction);
                            break;
                    }
                }
                else if (componentInteraction.customId === "admin_select_funcionalidade") {
                    await handleSelectFuncionalidade(componentInteraction);
                }
            }
            else if (componentInteraction.isChannelSelectMenu()) {
                await handleAdminChannelSelect(componentInteraction);
            }
            else if (componentInteraction.isButton()) {
                if (componentInteraction.customId === "admin_voltar_principal") {
                    await mostrarMenuPrincipal(interaction);
                }
                else if (componentInteraction.customId === "admin_voltar_canais") {
                    await mostrarMenuCanais(interaction);
                }
                else if (componentInteraction.customId === "admin_ver_status") {
                    await mostrarStatus(interaction);
                }
            }
        }
        catch (error) {
            console.error("Erro ao processar interação:", error);
            if (!componentInteraction.replied && !componentInteraction.deferred) {
                await componentInteraction.reply({
                    content: "❌ Erro ao processar sua seleção.",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    });
    collector.on("end", async () => {
        try {
            const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId("admin_voltar_principal")
                .setLabel("Voltar ao Início")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("↩️"), new ButtonBuilder()
                .setCustomId("admin_ver_status")
                .setLabel("Atualizar")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔄"));
            await response.edit({ components: [refreshRow] }).catch(() => { });
        }
        catch { }
    });
}
async function mostrarMenuCanais(interaction) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Este painel só funciona em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const NAO_CONFIGURADO = "Não configurado";
    const formatarCanal = (canalId) => canalId ? `<#${canalId}>` : NAO_CONFIGURADO;
    const embed = new EmbedBuilder()
        .setTitle("🔧 Configuração de Canais")
        .setDescription("**Configure os canais do bot de forma rápida!**\n\n" +
        "Selecione abaixo QUAL funcionalidade deseja configurar, e depois escolha o(s) canal(is).\n\n" +
        "**Configurações atuais:**\n" +
        `📢 **Embeds**: ${formatarCanal(config.embeds_channel)}\n` +
        `🎯 **Quiz Perfil**: ${formatarCanal(config.perfil_quiz_channel)}\n` +
        `🧩 **Quiz Squads**: ${formatarCanal(config.squad_quiz_channel)}\n` +
        `🏆 **Ranking**: ${formatarCanal(config.rank_channel)}\n` +
        `📈 **Level Up**: ${formatarCanal(config.level_up_channel)}\n` +
        `⚙️ **Comandos Admin**: ${formatarCanal(config.admin_commands_channel)}`)
        .setColor("#5865F2")
        .setFooter({ text: "Escolha a funcionalidade e depois o canal" });
    const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId("admin_select_funcionalidade")
        .setPlaceholder("Selecione a funcionalidade para configurar...")
        .addOptions({
        label: "Canal de Embeds/Anúncios",
        description: "Onde embeds serão publicadas",
        value: "embeds_channel",
        emoji: "📢",
    }, {
        label: "Canal do Quiz de Perfil",
        description: "Onde o quiz de perfil será publicado",
        value: "perfil_quiz_channel",
        emoji: "🎯",
    }, {
        label: "Canal do Quiz de Squads",
        description: "Onde o quiz de squads será publicado",
        value: "squad_quiz_channel",
        emoji: "🧩",
    }, {
        label: "Canal de Ranking",
        description: "Onde o ranking será exibido",
        value: "rank_channel",
        emoji: "🏆",
    }, {
        label: "Canal de Level Up",
        description: "Onde avisos de level up aparecerão",
        value: "level_up_channel",
        emoji: "📈",
    }, {
        label: "Canal de Comandos Admin",
        description: "Restringir comandos admin a um canal",
        value: "admin_commands_channel",
        emoji: "⚙️",
    }, {
        label: "Configurar Canais de XP",
        description: "Definir canais permitidos/ignorados para XP",
        value: "xp_config",
        emoji: "💎",
    }, {
        label: "Ver Todas as Configurações",
        description: "Listar todas as configurações atuais",
        value: "listar_config",
        emoji: "📋",
    }));
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("⬅️ Voltar ao Menu Principal")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [menu, botaoVoltar],
    });
}
async function handleSelectFuncionalidade(interaction) {
    const funcionalidade = interaction.values[0];
    if (!funcionalidade) {
        await interaction.reply({
            content: "❌ Funcionalidade não selecionada.",
            ephemeral: true,
        });
        return;
    }
    if (funcionalidade === "xp_config") {
        await mostrarConfigXP(interaction);
        return;
    }
    if (funcionalidade === "listar_config") {
        await mostrarListarConfig(interaction);
        return;
    }
    const embed = new EmbedBuilder()
        .setTitle(`🔧 Configurar ${getFuncionalidadeNome(funcionalidade)}`)
        .setDescription(`Selecione o canal que deseja usar para **${getFuncionalidadeNome(funcionalidade)}**.\n\n` +
        "O canal selecionado será salvo automaticamente.")
        .setColor("#5865F2");
    const channelSelector = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder()
        .setCustomId(`admin_channel_${funcionalidade}`)
        .setPlaceholder("Selecione um canal...")
        .setChannelTypes(ChannelType.GuildText));
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_canais")
        .setLabel("⬅️ Voltar")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [channelSelector, botaoVoltar],
    });
}
async function handleAdminChannelSelect(interaction) {
    const funcionalidade = interaction.customId.replace("admin_channel_", "");
    const channelId = interaction.values[0];
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Esta ação só pode ser usada em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const updated = { ...config, [funcionalidade]: channelId };
    await setChannelConfig(updated);
    const embed = new EmbedBuilder()
        .setTitle("✅ Canal Configurado!")
        .setDescription(`**${getFuncionalidadeNome(funcionalidade)}** foi configurado para <#${channelId}>\n\n` +
        "Você pode:\n" +
        "• Configurar outro canal\n" +
        "• Ver todas as configurações\n" +
        "• Voltar ao menu principal")
        .setColor("#00FF00");
    const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_canais")
        .setLabel("Configurar Outro")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔧"), new ButtonBuilder()
        .setCustomId("admin_ver_status")
        .setLabel("Ver Status")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📊"), new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("Menu Principal")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️"));
    await interaction.update({
        embeds: [embed],
        components: [botoes],
    });
}
async function mostrarMenuEmbeds(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("📢 Builder de Embeds")
        .setDescription("Selecione os campos que deseja editar e, em seguida, informe os valores nos modais. Ao final, publique no canal de embeds configurado.")
        .setColor("#5865F2");
    const seletorCampos = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId("embed_builder_campos")
        .setPlaceholder("Selecione os campos do embed…")
        .setMinValues(1)
        .setMaxValues(5)
        .addOptions({ label: "Título", value: "title", emoji: "📝" }, { label: "Descrição", value: "description", emoji: "📄" }, { label: "Cor (hex)", value: "color", emoji: "🎨" }, { label: "Rodapé", value: "footer", emoji: "🔻" }, { label: "Imagem", value: "image", emoji: "🖼️" }));
    const acoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("embed_publicar")
        .setLabel("Publicar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📢"), new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("Voltar")
        .setStyle(ButtonStyle.Secondary));
    const draft = new EmbedBuilder();
    const msg = await interaction.update({
        embeds: [embed],
        components: [seletorCampos, acoes],
        fetchReply: true,
    });
    const collector = msg.createMessageComponentCollector();
    collector.on("collect", async (ci) => {
        if (ci.user.id !== interaction.user.id) {
            await ci.reply({
                content: "❌ Apenas quem iniciou pode interagir.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (ci.isStringSelectMenu() && ci.customId === "embed_builder_campos") {
            await ci.deferUpdate();
            for (const field of ci.values) {
                await abrirModalCampo(ci, field, draft);
            }
            await msg
                .edit({ embeds: [draft.toJSON()], components: [seletorCampos, acoes] })
                .catch(() => { });
        }
        else if (ci.isButton()) {
            if (ci.customId === "embed_publicar") {
                await publicarEmbed(ci, draft);
            }
            else if (ci.customId === "admin_voltar_principal") {
                await mostrarMenuPrincipal(interaction);
            }
        }
    });
    collector.on("end", async () => msg.edit({ components: [] }).catch(() => { }));
}
async function abrirModalCampo(interaction, field, draft) {
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_${field}`)
        .setTitle(`Definir ${field}`);
    const input = new TextInputBuilder()
        .setCustomId("valor")
        .setLabel("Valor")
        .setStyle(field === "description" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(field === "description" ? 4000 : 256);
    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    await interaction.showModal(modal);
    const submitted = await interaction
        .awaitModalSubmit({ time: MODAL_TIMEOUT_MS })
        .catch(() => null);
    if (!submitted)
        return;
    const valor = submitted.fields.getTextInputValue("valor");
    if (field === "title")
        draft.setTitle(valor);
    else if (field === "description")
        draft.setDescription(valor);
    else if (field === "color")
        draft.setColor(/^#?[\dA-Fa-f]{6}$/.test(valor) ? `#${valor.replace("#", "")}` : null);
    else if (field === "footer")
        draft.setFooter({ text: valor });
    else if (field === "image")
        draft.setImage(valor);
    await submitted
        .reply({ content: `✅ Definido ${field}.`, flags: MessageFlags.Ephemeral })
        .catch(() => { });
}
async function publicarEmbed(interaction, draft) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Use em um servidor.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const channelId = config.embeds_channel;
    if (!channelId) {
        await interaction.reply({
            content: "❌ Nenhum canal de embeds configurado.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const channel = interaction.guild?.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
            content: "❌ Canal inválido para embeds.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const textChannel = channel;
    await textChannel.send({ embeds: [draft] });
    await interaction.reply({
        content: "✅ Embed publicada!",
        flags: MessageFlags.Ephemeral,
    });
}
async function mostrarMenuQuizPerfil(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🎯 Quiz de Perfil")
        .setDescription("**Gerencie o quiz de criação de perfil!**\n\n" +
        "Use o comando `/publicar-quiz-perfil` com as opções:\n\n" +
        "📤 **publicar** - Publique o quiz em um canal\n" +
        "⚙️ **config** - Configure as opções do quiz\n" +
        "📋 **exemplo** - Ative configuração de exemplo para testes")
        .setColor("#5865F2")
        .setFooter({ text: "Use /publicar-quiz-perfil para começar" });
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("⬅️ Voltar ao Menu Principal")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [botaoVoltar],
    });
}
async function mostrarMenuQuizSquads(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("🧩 Quiz de Squads")
        .setDescription("**Publique o quiz de personalidade!**\n\n" +
        "Use o comando `/publicar-quiz` para publicar o quiz de squads em um canal.")
        .setColor("#5865F2")
        .setFooter({ text: "Use /publicar-quiz para começar" });
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("⬅️ Voltar ao Menu Principal")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [botaoVoltar],
    });
}
async function mostrarMenuRanking(interaction) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Este painel só funciona em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const { getRankConfig, setRankConfig, getRankRoles, setRankRole, removeRankRole, } = await import("../../services/ranking.js");
    const rankCfg = await getRankConfig(guildId);
    const roles = await getRankRoles(guildId);
    const embed = new EmbedBuilder()
        .setTitle("🏆 Ranking")
        .setDescription("Gerencie canal, ativação e cargos por nível.")
        .addFields([
        {
            name: "Canal do Ranking",
            value: config.rank_channel
                ? `<#${config.rank_channel}>`
                : "`Não configurado`",
            inline: true,
        },
        {
            name: "Status",
            value: rankCfg.enabled ? "✅ Ativo" : "❌ Inativo",
            inline: true,
        },
        {
            name: "Cargos",
            value: roles.length > 0
                ? roles.map((r) => `• Nível ${r.threshold} → ${r.name}`).join("\n")
                : "`Nenhum cargo configurado`",
            inline: false,
        },
    ])
        .setColor("#5865F2")
        .setFooter({ text: "Use os botões abaixo para configurar" });
    const botoes1 = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("rank_toggle")
        .setLabel(rankCfg.enabled ? "Desativar" : "Ativar")
        .setStyle(rankCfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(rankCfg.enabled ? "⏸️" : "✅"), new ButtonBuilder()
        .setCustomId("rank_set_channel")
        .setLabel("Definir Canal")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📢"));
    const botoes2 = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("rank_add_role")
        .setLabel("Adicionar Cargo por Nível")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"), new ButtonBuilder()
        .setCustomId("rank_remove_role")
        .setLabel("Remover Cargo por Nível")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🗑️"), new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("Voltar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬅️"));
    const msg = await interaction.update({
        embeds: [embed],
        components: [botoes1, botoes2],
        fetchReply: true,
    });
    const collector = msg.createMessageComponentCollector();
    collector.on("collect", async (ci) => {
        if (ci.user.id !== interaction.user.id) {
            await ci.reply({
                content: "❌ Apenas quem iniciou pode interagir.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (ci.isButton()) {
            if (ci.customId === "rank_toggle") {
                await ci.deferUpdate();
                const next = !rankCfg.enabled;
                await setRankConfig(guildId, { ...rankCfg, enabled: next });
                await mostrarMenuRanking(interaction);
            }
            else if (ci.customId === "rank_set_channel") {
                const canais = interaction.guild?.channels.cache.filter((c) => c.type === ChannelType.GuildText) ?? new Map();
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("rank_menu_channel")
                    .setPlaceholder("Escolha o canal do ranking")
                    .addOptions(Array.from(canais.values())
                    .slice(0, 25)
                    .map((c) => {
                    const channel = c;
                    return {
                        label: channel.name,
                        value: channel.id,
                        description: `Usar #${channel.name}`,
                        default: channel.id === config.rank_channel,
                    };
                }));
                const row = new ActionRowBuilder().addComponents(menu);
                await ci.update({
                    embeds: [embed],
                    components: [row, botoes1, botoes2],
                });
            }
            else if (ci.customId === "rank_add_role" ||
                ci.customId === "rank_remove_role") {
                const isRemove = ci.customId === "rank_remove_role";
                const modal = new ModalBuilder()
                    .setCustomId(isRemove ? "rank_modal_remove" : "rank_modal_add")
                    .setTitle(isRemove ? "Remover Cargo por Nível" : "Adicionar Cargo por Nível");
                const inputLevel = new TextInputBuilder()
                    .setCustomId("level")
                    .setLabel("Nível")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder("Ex: 10");
                const inputRole = new TextInputBuilder()
                    .setCustomId("role")
                    .setLabel("Nome do Cargo")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(!isRemove)
                    .setPlaceholder("Ex: Bronze");
                const row1 = new ActionRowBuilder().addComponents(inputLevel);
                const row2 = new ActionRowBuilder().addComponents(inputRole);
                modal.addComponents(row1, ...(isRemove ? [] : [row2]));
                await ci.showModal(modal);
                const submitted = await ci
                    .awaitModalSubmit({ time: MODAL_TIMEOUT_MS })
                    .catch(() => null);
                if (submitted) {
                    const levelStr = submitted.fields.getTextInputValue("level");
                    const level = Number(levelStr);
                    if (!Number.isFinite(level) || level <= 0) {
                        await submitted.reply({
                            content: "❌ Nível inválido.",
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                    if (isRemove) {
                        await removeRankRole(guildId, level);
                        await submitted.reply({
                            content: `🗑️ Cargo do nível ${level} removido.`,
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                    else {
                        const roleName = submitted.fields.getTextInputValue("role");
                        await setRankRole(guildId, level, roleName);
                        await submitted.reply({
                            content: `➕ Cargo '${roleName}' configurado para nível ${level}.`,
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                    await mostrarMenuRanking(interaction);
                }
            }
            else if (ci.customId === "admin_voltar_principal") {
                await mostrarMenuPrincipal(interaction);
            }
        }
        else if (ci.isStringSelectMenu() && ci.customId === "rank_menu_channel") {
            const channelId = ci.values[0];
            const updatedConfig = await getChannelConfig(guildId);
            updatedConfig.rank_channel = channelId;
            await setChannelConfig(updatedConfig);
            await ci.update({
                content: `✅ Canal do ranking definido para <#${channelId}>`,
                components: [],
            });
            await mostrarMenuRanking(interaction);
        }
    });
    collector.on("end", async () => msg.edit({ components: [] }).catch(() => { }));
}
async function mostrarStatus(interaction) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Este painel só funciona em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const NAO_CONFIGURADO = "❌ Não configurado";
    const formatarCanal = (canalId) => canalId ? `<#${canalId}>` : NAO_CONFIGURADO;
    const embed = new EmbedBuilder()
        .setTitle("📊 Status das Configurações")
        .setDescription("**Configurações Atuais do Servidor:**\n\n" +
        "**🔧 Canais:**\n" +
        `📢 Embeds: ${formatarCanal(config.embeds_channel)}\n` +
        `🎯 Quiz Perfil: ${formatarCanal(config.perfil_quiz_channel)}\n` +
        `🧩 Quiz Squads: ${formatarCanal(config.squad_quiz_channel)}\n` +
        `🏆 Ranking: ${formatarCanal(config.rank_channel)}\n` +
        `📈 Level Up: ${formatarCanal(config.level_up_channel)}\n` +
        `⚙️ Admin: ${formatarCanal(config.admin_commands_channel)}\n\n` +
        "**💎 Sistema de XP:**\n" +
        `Canais permitidos: ${config.xp_channels?.length || 0}\n` +
        `Canais ignorados: ${config.xp_ignore_channels?.length || 0}\n\n` +
        "**🔒 Restrições:**\n" +
        `Comandos restritos: ${config.restrict_commands ? "✅ Sim" : "❌ Não"}`)
        .setColor("#5865F2")
        .setFooter({ text: "Use o painel para configurar" });
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_principal")
        .setLabel("⬅️ Voltar ao Menu Principal")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [botaoVoltar],
    });
}
async function mostrarConfigXP(interaction) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Este painel só funciona em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const embed = new EmbedBuilder()
        .setTitle("💎 Configuração de XP")
        .setDescription("**Configure quais canais permitem ganho de XP!**\n\n" +
        "Você pode:\n" +
        "✅ **Adicionar canais permitidos** - Apenas esses ganham XP\n" +
        "❌ **Adicionar canais ignorados** - Esses nunca ganham XP\n" +
        "📋 **Ver configuração atual**\n\n" +
        `**Status atual:**\n` +
        `Canais permitidos: ${config.xp_channels?.length || 0}\n` +
        `Canais ignorados: ${config.xp_ignore_channels?.length || 0}`)
        .setColor("#5865F2")
        .setFooter({ text: "Use /config xp para configurar em detalhes" });
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_canais")
        .setLabel("⬅️ Voltar")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [botaoVoltar],
    });
}
async function mostrarListarConfig(interaction) {
    const { guildId } = interaction;
    if (!guildId) {
        await interaction.reply({
            content: "❌ Este painel só funciona em servidores.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(guildId);
    const NAO_CONFIGURADO_BADGE = "❌ Não configurado";
    const formatarCanal = (canalId) => canalId ? `<#${canalId}>` : NAO_CONFIGURADO_BADGE;
    const embed = new EmbedBuilder()
        .setTitle("📋 Todas as Configurações")
        .setDescription("**Configurações de Canais:**\n\n" +
        `📢 **Embeds**: ${formatarCanal(config.embeds_channel)}\n` +
        `🎯 **Quiz Perfil**: ${formatarCanal(config.perfil_quiz_channel)}\n` +
        `🧩 **Quiz Squads**: ${formatarCanal(config.squad_quiz_channel)}\n` +
        `🏆 **Ranking**: ${formatarCanal(config.rank_channel)}\n` +
        `📈 **Level Up**: ${formatarCanal(config.level_up_channel)}\n` +
        `⚙️ **Admin**: ${formatarCanal(config.admin_commands_channel)}\n\n` +
        "**Sistema de XP:**\n" +
        `Canais permitidos: ${config.xp_channels?.length || 0}\n` +
        `Canais ignorados: ${config.xp_ignore_channels?.length || 0}\n\n` +
        `Comandos restritos: ${config.restrict_commands ? "✅ Sim" : "❌ Não"}`)
        .setColor("#5865F2");
    const botaoVoltar = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("admin_voltar_canais")
        .setLabel("⬅️ Voltar")
        .setStyle(ButtonStyle.Secondary));
    await interaction.update({
        embeds: [embed],
        components: [botaoVoltar],
    });
}
function getFuncionalidadeNome(funcionalidade) {
    const nomes = {
        embeds_channel: "Embeds/Anúncios",
        perfil_quiz_channel: "Quiz de Perfil",
        squad_quiz_channel: "Quiz de Squads",
        rank_channel: "Ranking",
        level_up_channel: "Level Up",
        admin_commands_channel: "Comandos Admin",
        xp_config: "Configuração de XP",
        listar_config: "Listar Configurações",
    };
    return nomes[funcionalidade] || funcionalidade;
}
