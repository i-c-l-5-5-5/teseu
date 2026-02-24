import { getChannelConfig, removeChannelConfig, setChannelConfig, } from "../../storage/channel-config.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, MessageFlags, PermissionFlagsBits, StringSelectMenuBuilder, } from "discord.js";
import { labelPorCampo, mapearCanaisTexto, resumoConfiguracoesEmbed, } from "./utils/config-helpers.js";
export async function handleConfigCanais(interaction) {
    try {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "❌ Este comando só pode ser usado em servidores.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: "❌ Apenas administradores podem usar este comando.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        const rawSub = interaction.options.getSubcommand();
        const subcommand = rawSub === "ls"
            ? "listar"
            : rawSub === "set"
                ? "definir"
                : rawSub === "rm"
                    ? "remover"
                    : rawSub === "cmd"
                        ? "comandos"
                        : rawSub;
        switch (subcommand) {
            case "listar":
                await handleListarConfig(interaction);
                break;
            case "definir":
                const func = interaction.options.getString("funcionalidade");
                const canalOpt = interaction.options.getChannel("canal");
                await (!func && !canalOpt
                    ? mostrarInterfaceDefinirCanais(interaction)
                    : handleDefinirCanal(interaction));
                break;
            case "xp":
                await handleConfigXP(interaction);
                break;
            case "comandos":
                await handleConfigComandos(interaction);
                break;
            case "remover":
                await handleRemoverConfig(interaction);
                break;
            default:
                await interaction.reply({
                    content: "❌ Subcomando não reconhecido.",
                    flags: MessageFlags.Ephemeral,
                });
        }
    }
    catch (error) {
        console.warn("Erro no comando config-canais:", error);
        await (interaction.deferred
            ? interaction.editReply("❌ Erro ao processar configuração de canais.")
            : interaction
                .reply({
                content: "❌ Erro ao processar configuração de canais.",
                flags: MessageFlags.Ephemeral,
            })
                .catch(() => { }));
    }
}
async function mostrarInterfaceDefinirCanais(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "❌ Use este comando em um servidor.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const config = await getChannelConfig(interaction.guildId);
    const NAO_CONFIG = "`Não configurado`";
    const formatarCanal = (id) => id ? `<#${id}>` : NAO_CONFIG;
    const embed = new EmbedBuilder()
        .setTitle("🔧 Definir Canais - Múltipla Escolha")
        .setDescription("Selecione as funcionalidades que deseja configurar e depois escolha os canais para cada uma.\n" +
        "Todas as escolhas serão aplicadas em lote.")
        .setColor("#5865F2")
        .addFields([
        {
            name: "📢 Embeds",
            value: formatarCanal(config.embeds_channel),
            inline: true,
        },
        {
            name: "🎯 Quiz Perfil",
            value: formatarCanal(config.perfil_quiz_channel),
            inline: true,
        },
        {
            name: "🧩 Quiz Squads",
            value: formatarCanal(config.squad_quiz_channel),
            inline: true,
        },
        {
            name: "⚙️ Admin",
            value: formatarCanal(config.admin_commands_channel),
            inline: true,
        },
        {
            name: "📈 Level Up",
            value: formatarCanal(config.level_up_channel),
            inline: true,
        },
        {
            name: "🏆 Ranking",
            value: formatarCanal(config.rank_channel),
            inline: true,
        },
    ]);
    const funcionalidades = new StringSelectMenuBuilder()
        .setCustomId("definir_funcionalidades_multi")
        .setPlaceholder("Selecione funcionalidades para configurar…")
        .setMinValues(1)
        .setMaxValues(8)
        .addOptions({ label: "Embeds/Anúncios", value: "embeds_channel", emoji: "📢" }, { label: "Quiz de Perfil", value: "perfil_quiz_channel", emoji: "🎯" }, { label: "Quiz de Squads", value: "squad_quiz_channel", emoji: "🧩" }, { label: "Comandos Admin", value: "admin_commands_channel", emoji: "⚙️" }, { label: "Level Up", value: "level_up_channel", emoji: "📈" }, { label: "Ranking", value: "rank_channel", emoji: "🏆" }, {
        label: "Canais de Comandos do Bot",
        value: "bot_commands_channels",
        emoji: "🤖",
    }, {
        label: "Restrição de Comandos (toggle)",
        value: "restrict_commands",
        emoji: "🔒",
    }, { label: "XP: Canais Permitidos", value: "xp_channels", emoji: "💎" }, {
        label: "XP: Canais Ignorados",
        value: "xp_ignore_channels",
        emoji: "🚫",
    });
    const rowFunc = new ActionRowBuilder().addComponents(funcionalidades);
    const response = await interaction.reply({
        embeds: [embed],
        components: [rowFunc],
        ephemeral: true,
        fetchReply: true,
    });
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
    });
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (i.customId !== "definir_funcionalidades_multi")
            return;
        const selecionadas = i.values;
        await i.deferUpdate();
        for (const field of selecionadas) {
            if (field === "restrict_commands") {
                const current = await getChannelConfig(interaction.guildId);
                const toggled = !current.restrict_commands;
                await setChannelConfig({ ...current, restrict_commands: toggled });
                await response.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🔒 Restrição de Comandos")
                            .setDescription(`Agora: ${toggled ? "✅ Ativo" : "❌ Inativo"}`)
                            .setColor("#5865F2"),
                    ],
                    components: [],
                });
                continue;
            }
            if (field === "bot_commands_channels") {
                const stepEmbed = new EmbedBuilder()
                    .setTitle("🤖 Canais permitidos para comandos do bot")
                    .setDescription("Selecione múltiplos canais permitidos. Submeter salva imediatamente.")
                    .setColor("#5865F2");
                const selector = new StringSelectMenuBuilder()
                    .setCustomId(`definir_func_${String(field)}`)
                    .setPlaceholder("Selecione canais")
                    .setMinValues(1)
                    .setMaxValues(25)
                    .addOptions(...(await mapearCanaisTexto(interaction)));
                const rowSel = new ActionRowBuilder().addComponents(selector);
                const msg = await response.edit({
                    embeds: [stepEmbed],
                    components: [rowSel],
                });
                const stepCollector = msg.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                });
                const escolha = await new Promise((resolve) => {
                    stepCollector.on("collect", async (si) => {
                        if (si.user.id !== interaction.user.id) {
                            await si.reply({
                                content: "❌ Apenas quem usou o comando pode interagir.",
                                ephemeral: true,
                            });
                            return;
                        }
                        if (si.customId !== `definir_func_${String(field)}`)
                            return;
                        const canais = si.values;
                        const current = await getChannelConfig(interaction.guildId);
                        const updated = {
                            ...current,
                            bot_commands_channels: canais,
                        };
                        await setChannelConfig(updated);
                        await si.update({
                            content: `✅ ${canais.length} canais permitidos para comandos do bot.`,
                            components: [],
                        });
                        resolve(canais);
                    });
                    stepCollector.on("end", () => resolve(null));
                });
                if (escolha === null)
                    break;
                continue;
            }
            if (field === "xp_channels" || field === "xp_ignore_channels") {
                const isIgnore = field === "xp_ignore_channels";
                const stepEmbed = new EmbedBuilder()
                    .setTitle(isIgnore ? "🚫 XP: Canais Ignorados" : "💎 XP: Canais Permitidos")
                    .setDescription(isIgnore
                    ? "Selecione canais que nunca ganharão XP. Submeter salva imediatamente."
                    : "Selecione canais nos quais é permitido ganhar XP. Submeter salva imediatamente.")
                    .setColor("#5865F2");
                const selector = new StringSelectMenuBuilder()
                    .setCustomId(`definir_func_${String(field)}`)
                    .setPlaceholder("Selecione canais")
                    .setMinValues(0)
                    .setMaxValues(25)
                    .addOptions(...(await mapearCanaisTexto(interaction)));
                const rowSel = new ActionRowBuilder().addComponents(selector);
                const msg = await response.edit({
                    embeds: [stepEmbed],
                    components: [rowSel],
                });
                const stepCollector = msg.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                });
                const escolha = await new Promise((resolve) => {
                    stepCollector.on("collect", async (si) => {
                        if (si.user.id !== interaction.user.id) {
                            await si.reply({
                                content: "❌ Apenas quem usou o comando pode interagir.",
                                ephemeral: true,
                            });
                            return;
                        }
                        if (si.customId !== `definir_func_${String(field)}`)
                            return;
                        const canais = si.values;
                        const current = await getChannelConfig(interaction.guildId);
                        const updated = {
                            ...current,
                            [field]: canais,
                        };
                        await setChannelConfig(updated);
                        const label = isIgnore ? "ignorados" : "permitidos";
                        await si.update({
                            content: `✅ ${canais.length} canais ${label} para XP.`,
                            components: [],
                        });
                        resolve(canais);
                    });
                    stepCollector.on("end", () => resolve(null));
                });
                if (escolha === null)
                    break;
                continue;
            }
            const stepEmbed = new EmbedBuilder()
                .setTitle(`Selecionar canal: ${labelPorCampo(field)}`)
                .setDescription("Escolha o canal para esta funcionalidade. A seleção será salva na hora.")
                .setColor("#5865F2");
            const selector = new StringSelectMenuBuilder()
                .setCustomId(`definir_func_${String(field)}`)
                .setPlaceholder("Selecione um canal")
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(...(await mapearCanaisTexto(interaction)));
            const rowSel = new ActionRowBuilder().addComponents(selector);
            const msg = await response.edit({
                embeds: [stepEmbed],
                components: [rowSel],
            });
            const stepCollector = msg.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
            });
            const escolha = await new Promise((resolve) => {
                stepCollector.on("collect", async (si) => {
                    if (si.user.id !== interaction.user.id) {
                        await si.reply({
                            content: "❌ Apenas quem usou o comando pode interagir.",
                            ephemeral: true,
                        });
                        return;
                    }
                    if (si.customId !== `definir_func_${String(field)}`)
                        return;
                    const canalId = si.values[0];
                    const current = await getChannelConfig(interaction.guildId);
                    const updated = {
                        ...current,
                        [field]: canalId,
                    };
                    await setChannelConfig(updated);
                    await si.update({
                        content: `✅ Configurado ${labelPorCampo(field)} para <#${canalId}>`,
                        components: [],
                    });
                    resolve(canalId ?? null);
                });
                stepCollector.on("end", () => resolve(null));
            });
            if (escolha === null)
                break;
        }
        const novo = await getChannelConfig(interaction.guildId);
        const resumo = resumoConfiguracoesEmbed(novo);
        await response.edit({ embeds: [resumo], components: [] });
    });
    collector.on("end", async () => {
        try {
            const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId("definir_refresh")
                .setLabel("Reabrir Definição de Canais")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔄"));
            await response.edit({ components: [refreshRow] }).catch(() => { });
        }
        catch { }
    });
}
async function mostrarInterfaceXP(interaction) {
    if (!interaction.guildId || !interaction.guild)
        return;
    const config = await getChannelConfig(interaction.guildId);
    const canaisTexto = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
    const embed = new EmbedBuilder()
        .setTitle("📈 Configuração de Sistema de XP")
        .setDescription("Escolha os canais onde usuários podem ganhar XP ou onde devem ser ignorados.\n\n" +
        "**💡 Dica:** Se nenhum canal for permitido, XP funciona em todos (exceto ignorados).")
        .setColor("#FFD700");
    const permitidos = config.xp_channels?.length
        ? config.xp_channels.map((id) => `• <#${id}>`).join("\n")
        : "_Todos os canais_";
    const ignorados = config.xp_ignore_channels?.length
        ? config.xp_ignore_channels.map((id) => `• <#${id}>`).join("\n")
        : "_Nenhum canal ignorado_";
    embed.addFields([
        { name: "✅ Canais Permitidos", value: permitidos, inline: true },
        { name: "❌ Canais Ignorados", value: ignorados, inline: true },
    ]);
    const menuPermitidos = new StringSelectMenuBuilder()
        .setCustomId("xp_add_allow")
        .setPlaceholder("➕ Adicionar canais permitidos")
        .setMinValues(0)
        .setMaxValues(Math.min(canaisTexto.size, 25))
        .addOptions(canaisTexto.map((canal) => ({
        label: canal.name,
        value: canal.id,
        description: `Permitir XP em #${canal.name}`,
        emoji: "✅",
        default: config.xp_channels?.includes(canal.id),
    })));
    const menuIgnorados = new StringSelectMenuBuilder()
        .setCustomId("xp_add_ignore")
        .setPlaceholder("➕ Adicionar canais ignorados")
        .setMinValues(0)
        .setMaxValues(Math.min(canaisTexto.size, 25))
        .addOptions(canaisTexto.map((canal) => ({
        label: canal.name,
        value: canal.id,
        description: `Ignorar XP em #${canal.name}`,
        emoji: "❌",
        default: config.xp_ignore_channels?.includes(canal.id),
    })));
    const botoesAcao = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("xp_clear_allow")
        .setLabel("Limpar Permitidos")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🗑️"), new ButtonBuilder()
        .setCustomId("xp_clear_ignore")
        .setLabel("Limpar Ignorados")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🗑️"), new ButtonBuilder()
        .setCustomId("xp_refresh")
        .setLabel("Atualizar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔄"));
    const row1 = new ActionRowBuilder().addComponents(menuPermitidos);
    const row2 = new ActionRowBuilder().addComponents(menuIgnorados);
    const basePayload = {
        embeds: [embed],
        components: [row1, row2, botoesAcao],
        ephemeral: true,
        fetchReply: true,
    };
    const response = interaction.replied || interaction.deferred
        ? await interaction.editReply(basePayload)
        : await interaction.reply(basePayload);
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
    });
    const buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (!interaction.guildId)
            return;
        const updatedConfig = await getChannelConfig(interaction.guildId);
        if (i.customId === "xp_add_allow") {
            updatedConfig.xp_channels = i.values;
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceXP(interaction);
        }
        else if (i.customId === "xp_add_ignore") {
            updatedConfig.xp_ignore_channels = i.values;
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceXP(interaction);
        }
    });
    buttonCollector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (!interaction.guildId)
            return;
        const updatedConfig = await getChannelConfig(interaction.guildId);
        if (i.customId === "xp_clear_allow") {
            updatedConfig.xp_channels = [];
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceXP(interaction);
        }
        else if (i.customId === "xp_clear_ignore") {
            updatedConfig.xp_ignore_channels = [];
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceXP(interaction);
        }
        else if (i.customId === "xp_refresh") {
            await i.deferUpdate();
            await mostrarInterfaceXP(interaction);
        }
    });
    const onEndRefresh = async () => {
        try {
            const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId("xp_refresh")
                .setLabel("Atualizar")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔄"));
            await response.edit({ components: [refreshRow] }).catch(() => { });
        }
        catch { }
    };
    collector.on("end", onEndRefresh);
    buttonCollector.on("end", onEndRefresh);
}
async function handleListarConfig(interaction) {
    if (!interaction.guildId) {
        return void interaction.editReply("Este comando só pode ser usado em um servidor.");
    }
    const config = await getChannelConfig(interaction.guildId);
    const embed = new EmbedBuilder()
        .setTitle("⚙️ Configuração de Canais")
        .setDescription("Configurações atuais do servidor:")
        .setColor("#5865F2");
    const canaisPrincipais = [
        { nome: "📢 Embeds/Anúncios", canal: config.embeds_channel },
        { nome: "🎯 Quiz de Perfil", canal: config.perfil_quiz_channel },
        { nome: "🧩 Quiz de Squads", canal: config.squad_quiz_channel },
        { nome: "⚙️ Comandos Admin", canal: config.admin_commands_channel },
        { nome: "📈 Level Up", canal: config.level_up_channel },
        { nome: "🏆 Ranking", canal: config.rank_channel },
    ];
    const canaisTexto = canaisPrincipais
        .map((item) => {
        const canalTexto = item.canal ? `<#${item.canal}>` : "`Não configurado`";
        return `${item.nome}: ${canalTexto}`;
    })
        .join("\n");
    embed.addFields([
        {
            name: "🎯 Canais Principais",
            value: canaisTexto || "`Nenhum configurado`",
            inline: false,
        },
    ]);
    const xpPermitidos = config.xp_channels?.length
        ? config.xp_channels.map((id) => `<#${id}>`).join(", ")
        : "`Todos os canais`";
    const xpIgnorados = config.xp_ignore_channels?.length
        ? config.xp_ignore_channels.map((id) => `<#${id}>`).join(", ")
        : "`Nenhum`";
    embed.addFields([
        {
            name: "📈 Sistema de XP",
            value: `**Permitidos:** ${xpPermitidos}\n**Ignorados:** ${xpIgnorados}`,
            inline: false,
        },
    ]);
    const comandosStatus = config.restrict_commands
        ? "🔒 Restrito"
        : "🔓 Liberado";
    const comandosCanais = config.bot_commands_channels?.length
        ? config.bot_commands_channels.map((id) => `<#${id}>`).join(", ")
        : "`Todos os canais`";
    embed.addFields([
        {
            name: "🤖 Comandos do Bot",
            value: `**Status:** ${comandosStatus}\n**Canais:** ${comandosCanais}`,
            inline: false,
        },
    ]);
    embed.setFooter({
        text: "Use /config set ou /config rm • Também: /config-canais (legado)",
    });
    const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("config_xp_interface")
        .setLabel("Configurar XP")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📈"), new ButtonBuilder()
        .setCustomId("config_commands_interface")
        .setLabel("Configurar Comandos")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🤖"));
    const response = await interaction.reply({
        embeds: [embed],
        components: [botoes],
        ephemeral: true,
        fetchReply: true,
    });
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        await i.deferUpdate();
        if (i.customId === "config_xp_interface") {
            await mostrarInterfaceXP(interaction);
        }
        else if (i.customId === "config_commands_interface") {
            await mostrarInterfaceComandos(interaction);
        }
    });
    collector.on("end", async () => {
        try {
            const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId("config_xp_interface")
                .setLabel("Reabrir XP")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("📈"), new ButtonBuilder()
                .setCustomId("config_commands_interface")
                .setLabel("Reabrir Comandos")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🤖"));
            await response.edit({ components: [refreshRow] }).catch(() => { });
        }
        catch { }
    });
}
async function handleDefinirCanal(interaction) {
    if (!interaction.guildId) {
        return void interaction.editReply("Este comando só pode ser usado em um servidor.");
    }
    const funcionalidade = interaction.options.getString("funcionalidade", true);
    const canal = interaction.options.getChannel("canal", true);
    const config = await getChannelConfig(interaction.guildId);
    switch (funcionalidade) {
        case "embeds":
            config.embeds_channel = canal.id;
            break;
        case "perfil-quiz":
            config.perfil_quiz_channel = canal.id;
            break;
        case "squad-quiz":
            config.squad_quiz_channel = canal.id;
            break;
        case "admin-commands":
            config.admin_commands_channel = canal.id;
            break;
        case "level-up":
            config.level_up_channel = canal.id;
            break;
        case "rank":
            config.rank_channel = canal.id;
            break;
    }
    const success = await setChannelConfig(config);
    if (success) {
        const nomes = {
            embeds: "📢 Embeds/Anúncios",
            "perfil-quiz": "🎯 Quiz de Perfil",
            "squad-quiz": "🧩 Quiz de Squads",
            "admin-commands": "⚙️ Comandos Admin",
            "level-up": "📈 Notificações Level Up",
            rank: "🏆 Comando Rank",
        };
        const descricoes = {
            embeds: "Embeds e anúncios do bot serão enviados neste canal",
            "perfil-quiz": "Usuários poderão fazer o quiz de perfil neste canal",
            "squad-quiz": "Usuários poderão fazer o quiz de squad neste canal",
            "admin-commands": "Comandos administrativos estarão disponíveis apenas aqui",
            "level-up": "Mensagens de level up serão enviadas neste canal",
            rank: "Comando /rank estará disponível neste canal",
        };
        const embed = new EmbedBuilder()
            .setTitle("✅ Configuração Salva!")
            .setDescription(`**${nomes[funcionalidade]}** foi configurado com sucesso!`)
            .addFields([
            { name: "Canal", value: `${canal}`, inline: true },
            {
                name: "Funcionalidade",
                value: descricoes[funcionalidade],
                inline: false,
            },
        ])
            .setColor("#00FF00")
            .setFooter({ text: "Use /config ls para ver todas as configurações" });
        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    }
    else {
        await interaction.reply({
            content: "❌ Erro ao salvar configuração.",
            ephemeral: true,
        });
    }
}
async function handleConfigXP(interaction) {
    if (!interaction.guildId) {
        return void interaction.editReply("Este comando só pode ser usado em um servidor.");
    }
    const rawAcao = interaction.options.getString("acao", true);
    const acao = rawAcao === "ls"
        ? "list"
        : rawAcao === "add"
            ? "add-allow"
            : rawAcao === "rm"
                ? "remove-allow"
                : rawAcao === "add-ignorar"
                    ? "add-ignore"
                    : rawAcao === "rm-ignorar"
                        ? "remove-ignore"
                        : rawAcao;
    const canal = interaction.options.getChannel("canal");
    const config = await getChannelConfig(interaction.guildId);
    switch (acao) {
        case "add-allow":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (!config.xp_channels)
                config.xp_channels = [];
            if (config.xp_channels.includes(canal.id)) {
                await interaction.reply({
                    content: `⚠️ ${canal} já está na lista de permitidos.`,
                    ephemeral: true,
                });
            }
            else {
                config.xp_channels.push(canal.id);
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} adicionado aos canais com XP permitido!`,
                    ephemeral: true,
                });
            }
            break;
        case "add-ignore":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (!config.xp_ignore_channels)
                config.xp_ignore_channels = [];
            if (config.xp_ignore_channels.includes(canal.id)) {
                await interaction.reply({
                    content: `⚠️ ${canal} já está na lista de ignorados.`,
                    ephemeral: true,
                });
            }
            else {
                config.xp_ignore_channels.push(canal.id);
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} adicionado aos canais ignorados para XP!`,
                    ephemeral: true,
                });
            }
            break;
        case "remove-allow":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (config.xp_channels) {
                config.xp_channels = config.xp_channels.filter((id) => id !== canal.id);
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} removido dos canais permitidos!`,
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "⚠️ Nenhuma configuração de canais permitidos encontrada.",
                    ephemeral: true,
                });
            }
            break;
        case "remove-ignore":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (config.xp_ignore_channels) {
                config.xp_ignore_channels = config.xp_ignore_channels.filter((id) => id !== canal.id);
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} removido dos canais ignorados!`,
                    ephemeral: true,
                });
            }
            else {
                await interaction.reply({
                    content: "⚠️ Nenhuma configuração de canais ignorados encontrada.",
                    ephemeral: true,
                });
            }
            break;
        case "list":
            const permitidos = config.xp_channels?.length
                ? config.xp_channels.map((id) => `<#${id}>`).join("\n")
                : "Todos os canais";
            const ignorados = config.xp_ignore_channels?.length
                ? config.xp_ignore_channels.map((id) => `<#${id}>`).join("\n")
                : "Nenhum";
            const embed = new EmbedBuilder()
                .setTitle("📈 Configuração de XP")
                .addFields([
                { name: "✅ Canais Permitidos", value: permitidos, inline: true },
                { name: "❌ Canais Ignorados", value: ignorados, inline: true },
            ])
                .setColor("#FFD700");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}
async function mostrarInterfaceComandos(interaction) {
    if (!interaction.guildId || !interaction.guild)
        return;
    const config = await getChannelConfig(interaction.guildId);
    const canaisTexto = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
    const statusAtual = config.restrict_commands ? "🔒 Restrito" : "🔓 Liberado";
    const embed = new EmbedBuilder()
        .setTitle("🤖 Configuração de Comandos do Bot")
        .setDescription(`**Status Atual:** ${statusAtual}\n\n${config.restrict_commands
        ? "Comandos estão **restritos** aos canais selecionados abaixo."
        : "Comandos estão **liberados** em todos os canais do servidor."}`)
        .setColor(config.restrict_commands ? "#FF0000" : "#00FF00");
    const canaisPermitidos = config.bot_commands_channels?.length
        ? config.bot_commands_channels.map((id) => `• <#${id}>`).join("\n")
        : "_Todos os canais (sem restrição)_";
    embed.addFields([
        { name: "✅ Canais Permitidos", value: canaisPermitidos, inline: false },
    ]);
    const botoesStatus = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("cmd_allow_all")
        .setLabel("Liberar em Todos")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🔓")
        .setDisabled(!config.restrict_commands), new ButtonBuilder()
        .setCustomId("cmd_restrict")
        .setLabel("Restringir")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
        .setDisabled(config.restrict_commands), new ButtonBuilder()
        .setCustomId("cmd_clear")
        .setLabel("Limpar Lista")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🗑️"));
    const components = [botoesStatus];
    if (config.restrict_commands) {
        const menuCanais = new StringSelectMenuBuilder()
            .setCustomId("cmd_set_channels")
            .setPlaceholder("➕ Selecione os canais permitidos")
            .setMinValues(0)
            .setMaxValues(Math.min(canaisTexto.size, 25))
            .addOptions(canaisTexto.map((canal) => ({
            label: canal.name,
            value: canal.id,
            description: `Permitir comandos em #${canal.name}`,
            emoji: "✅",
            default: config.bot_commands_channels?.includes(canal.id),
        })));
        const rowMenu = new ActionRowBuilder().addComponents(menuCanais);
        components.unshift(rowMenu);
    }
    const basePayload2 = {
        embeds: [embed],
        components,
        ephemeral: true,
        fetchReply: true,
    };
    const response = interaction.replied || interaction.deferred
        ? await interaction.editReply(basePayload2)
        : await interaction.reply(basePayload2);
    const selectCollector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
    });
    const buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
    });
    selectCollector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (!interaction.guildId)
            return;
        const updatedConfig = await getChannelConfig(interaction.guildId);
        updatedConfig.bot_commands_channels = i.values;
        updatedConfig.restrict_commands = true;
        await setChannelConfig(updatedConfig);
        await i.deferUpdate();
        await mostrarInterfaceComandos(interaction);
    });
    buttonCollector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({
                content: "❌ Apenas quem usou o comando pode interagir.",
                ephemeral: true,
            });
            return;
        }
        if (!interaction.guildId)
            return;
        const updatedConfig = await getChannelConfig(interaction.guildId);
        if (i.customId === "commands_add_channels") {
            updatedConfig.restrict_commands = false;
            updatedConfig.bot_commands_channels = [];
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceComandos(interaction);
        }
        else if (i.customId === "cmd_restrict") {
            updatedConfig.restrict_commands = true;
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceComandos(interaction);
        }
        else if (i.customId === "cmd_clear") {
            updatedConfig.bot_commands_channels = [];
            await setChannelConfig(updatedConfig);
            await i.deferUpdate();
            await mostrarInterfaceComandos(interaction);
        }
    });
    const onEndRefresh = async () => {
        try {
            const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setCustomId("cmd_refresh")
                .setLabel("Atualizar")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔄"));
            await response.edit({ components: [refreshRow] }).catch(() => { });
        }
        catch { }
    };
    selectCollector.on("end", onEndRefresh);
    buttonCollector.on("end", onEndRefresh);
}
async function handleConfigComandos(interaction) {
    if (!interaction.guildId) {
        return void interaction.editReply("Este comando só pode ser usado em um servidor.");
    }
    const rawCmd = interaction.options.getString("acao", true);
    const acao = rawCmd === "status"
        ? "status"
        : rawCmd === "liberar"
            ? "allow-all"
            : rawCmd === "restringir"
                ? "restrict"
                : rawCmd === "add"
                    ? "add-channel"
                    : rawCmd === "rm"
                        ? "remove-channel"
                        : rawCmd;
    const canal = interaction.options.getChannel("canal");
    const config = await getChannelConfig(interaction.guildId);
    switch (acao) {
        case "allow-all":
            config.restrict_commands = false;
            config.bot_commands_channels = [];
            await setChannelConfig(config);
            await interaction.reply({
                content: "🔓 Comandos liberados em todos os canais!",
                ephemeral: true,
            });
            break;
        case "restrict":
            config.restrict_commands = true;
            await setChannelConfig(config);
            await interaction.reply({
                content: "🔒 Comandos restritos! Use `/config-canais comandos add-channel` para adicionar canais permitidos.",
                ephemeral: true,
            });
            break;
        case "add-channel":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (!config.bot_commands_channels)
                config.bot_commands_channels = [];
            if (config.bot_commands_channels.includes(canal.id)) {
                await interaction.reply({
                    content: `⚠️ ${canal} já está na lista de permitidos.`,
                    ephemeral: true,
                });
            }
            else {
                config.bot_commands_channels.push(canal.id);
                config.restrict_commands = true;
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} adicionado aos canais permitidos para comandos!`,
                    ephemeral: true,
                });
            }
            break;
        case "remove-channel":
            if (!canal) {
                await interaction.reply({
                    content: "❌ Canal é obrigatório para esta ação.",
                    ephemeral: true,
                });
                return;
            }
            if (config.bot_commands_channels) {
                config.bot_commands_channels = config.bot_commands_channels.filter((id) => id !== canal.id);
                await setChannelConfig(config);
                await interaction.reply({
                    content: `✅ ${canal} removido dos canais permitidos!`,
                    ephemeral: true,
                });
            }
            break;
        case "status":
            const status = config.restrict_commands ? "🔒 Restrito" : "🔓 Liberado";
            const canais = config.bot_commands_channels?.length
                ? config.bot_commands_channels.map((id) => `<#${id}>`).join("\n")
                : "Todos os canais";
            const embed = new EmbedBuilder()
                .setTitle("🤖 Configuração de Comandos")
                .addFields([
                { name: "Status", value: status, inline: true },
                { name: "Canais Permitidos", value: canais, inline: false },
            ])
                .setColor("#5865F2");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}
async function handleRemoverConfig(interaction) {
    const funcionalidade = interaction.options.getString("funcionalidade", true);
    if (funcionalidade === "all") {
        if (!interaction.guildId) {
            return void interaction.editReply("Este comando só pode ser usado em um servidor.");
        }
        const config = await getChannelConfig(interaction.guildId);
        const novoConfig = {
            guild_id: config.guild_id,
            xp_channels: [],
            xp_ignore_channels: [],
            bot_commands_channels: [],
            restrict_commands: false,
        };
        const success = await setChannelConfig(novoConfig);
        await (success
            ? interaction.reply({
                content: "🗑️ Todas as configurações de canais foram removidas!",
                ephemeral: true,
            })
            : interaction.reply({
                content: "❌ Erro ao remover configurações.",
                ephemeral: true,
            }));
        return;
    }
    const fieldMap = {
        embeds: "embeds_channel",
        "perfil-quiz": "perfil_quiz_channel",
        "squad-quiz": "squad_quiz_channel",
        "admin-commands": "admin_commands_channel",
        "level-up": "level_up_channel",
        rank: "rank_channel",
    };
    const field = fieldMap[funcionalidade];
    if (!field) {
        await interaction.reply({
            content: "❌ Funcionalidade não reconhecida.",
            ephemeral: true,
        });
        return;
    }
    if (!interaction.guildId) {
        return void interaction.editReply("Este comando só pode ser usado em um servidor.");
    }
    const success = await removeChannelConfig(interaction.guildId, field);
    if (success) {
        const nomes = {
            embeds: "📢 Embeds/Anúncios",
            "perfil-quiz": "🎯 Quiz de Perfil",
            "squad-quiz": "🧩 Quiz de Squads",
            "admin-commands": "⚙️ Comandos Admin",
            "level-up": "📈 Notificações Level Up",
            rank: "🏆 Comando Rank",
        };
        await interaction.reply({
            content: `✅ Configuração de **${nomes[funcionalidade]}** removida!`,
            ephemeral: true,
        });
    }
    else {
        await interaction.reply({
            content: "❌ Erro ao remover configuração.",
            ephemeral: true,
        });
    }
}
