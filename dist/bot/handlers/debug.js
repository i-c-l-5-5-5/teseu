import { botRegistry } from "../core/registry.js";
import { getDB } from "../../storage/db-connector.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, MessageFlags, } from "discord.js";
export async function handleDebug(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "❌ Use este comando em um servidor.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    const subcommand = interaction.options.getSubcommand(false) || "info";
    switch (subcommand) {
        case "info":
            await handleDebugInfo(interaction);
            break;
        case "db-write":
            await handleDebugDbWrite(interaction);
            break;
        case "db-read":
            await handleDebugDbRead(interaction);
            break;
        default:
            await interaction.reply({
                content: "❌ Subcomando não reconhecido.",
                flags: MessageFlags.Ephemeral,
            });
    }
}
async function handleDebugInfo(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const gerarEmbed = () => {
            const statsAtual = botRegistry.getStats();
            const uptimeAtual = process.uptime();
            const memoryAtual = process.memoryUsage();
            const uptimeFormatted = new Date(uptimeAtual * 1000)
                .toISOString()
                .substr(11, 8);
            return new EmbedBuilder()
                .setTitle("🔍 Debug - Sistema do Bot")
                .setColor("#00FF00")
                .addFields({
                name: "⚙️ Registry",
                value: `\`\`\`yaml
Comandos: ${statsAtual.commands}
Componentes: ${statsAtual.components}  
Eventos: ${statsAtual.events}
Cooldowns Ativos: ${statsAtual.activeCooldowns}\`\`\``,
                inline: false,
            }, {
                name: "📋 Comandos Registrados",
                value: statsAtual.commandNames.length > 0
                    ? `\`${statsAtual.commandNames.join("`, `")}\``
                    : "`Nenhum`",
                inline: false,
            }, {
                name: "🔗 Componentes Registrados",
                value: statsAtual.componentIds.length > 0
                    ? (() => {
                        const components = `\`${statsAtual.componentIds.slice(0, 10).join("\`, \`")}\``;
                        const extra = statsAtual.componentIds.length > 10
                            ? `\n+${statsAtual.componentIds.length - 10} mais...`
                            : "";
                        return components + extra;
                    })()
                    : "`Nenhum`",
                inline: false,
            }, {
                name: "📊 Sistema",
                value: `\`\`\`yaml
Uptime: ${uptimeFormatted}
RAM: ${Math.round(memoryAtual.rss / 1024 / 1024)}MB
Heap: ${Math.round(memoryAtual.heapUsed / 1024 / 1024)}MB
Node: ${process.version}\`\`\``,
                inline: false,
            })
                .setFooter({ text: `Servidor: ${interaction.guildId} • Atualizado` })
                .setTimestamp();
        };
        const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("debug_refresh")
            .setLabel("Atualizar")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔄"), new ButtonBuilder()
            .setCustomId("debug_clear_cooldowns")
            .setLabel("Limpar Cooldowns")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🗑️"), new ButtonBuilder()
            .setCustomId("debug_memory")
            .setLabel("Garbage Collect")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("♻️"));
        const response = await interaction.editReply({
            embeds: [gerarEmbed()],
            components: [botoes],
        });
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
        });
        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({
                    content: "❌ Apenas quem iniciou pode interagir.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (i.customId === "debug_refresh") {
                await i.deferUpdate();
                await interaction.editReply({
                    embeds: [gerarEmbed()],
                    components: [botoes],
                });
            }
            else if (i.customId === "debug_clear_cooldowns") {
                await i.deferUpdate();
                botRegistry.clearCooldowns();
                await i.followUp({
                    content: "✅ Todos os cooldowns foram limpos!",
                    flags: MessageFlags.Ephemeral,
                });
                await interaction.editReply({
                    embeds: [gerarEmbed()],
                    components: [botoes],
                });
            }
            else if (i.customId === "debug_memory") {
                await i.deferUpdate();
                if (global.gc) {
                    global.gc();
                    await i.followUp({
                        content: "♻️ Garbage collection executado!",
                        flags: MessageFlags.Ephemeral,
                    });
                }
                else {
                    await i.followUp({
                        content: "❌ Garbage collection não disponível. Execute o Node com flag --expose-gc",
                        flags: MessageFlags.Ephemeral,
                    });
                }
                await interaction.editReply({
                    embeds: [gerarEmbed()],
                    components: [botoes],
                });
            }
        });
        collector.on("end", async () => {
            try {
                const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                    .setCustomId("debug_refresh")
                    .setLabel("Atualizar")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🔄"));
                await interaction.editReply({ components: [refreshRow] });
            }
            catch {
            }
        });
    }
    catch (error) {
        console.error("Erro no comando debug:", error);
        await interaction.editReply({
            content: "❌ Erro ao obter informações de debug.",
        });
    }
}
async function handleDebugDbWrite(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const valorCustom = interaction.options.getString("valor");
        const testKey = `mcp_test_${Date.now()}`;
        const testValue = JSON.stringify({
            timestamp: new Date().toISOString(),
            test: "write_persistence",
            source: "discord_debug",
            custom_value: valorCustom || "default_test",
            user_id: interaction.user.id,
            guild_id: interaction.guildId,
        });
        const db = getDB();
        await db.run(`INSERT INTO config (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`, [testKey, testValue]);
        const result = (await db.get("SELECT key, value, updated_at FROM config WHERE key = $1", [testKey]));
        if (!result) {
            await interaction.editReply({
                content: "❌ Falha: Dado não foi encontrado após inserção!",
            });
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle("✅ Teste de Escrita no Banco")
            .setColor("#00FF00")
            .setDescription("Dado inserido e verificado com sucesso!")
            .addFields({ name: "🔑 Chave", value: `\`${result.key}\``, inline: false }, {
            name: "📝 Valor",
            value: `\`\`\`json\n${result.value}\n\`\`\``,
            inline: false,
        }, {
            name: "⏰ Timestamp",
            value: `<t:${Math.floor(new Date(result.updated_at).getTime() / 1000)}:F>`,
            inline: false,
        }, {
            name: "💡 Persistência",
            value: "Use `/debug db-read` para verificar se o dado persiste após delay",
            inline: false,
        })
            .setFooter({ text: "Teste de persistência PostgreSQL via Discord" });
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error("Erro ao testar escrita no banco:", error);
        await interaction.editReply({
            content: `❌ Erro ao escrever no banco: ${error instanceof Error ? error.message : String(error)}`,
        });
    }
}
async function handleDebugDbRead(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const db = getDB();
        const results = (await db.all(`SELECT key, value, updated_at 
       FROM config 
       WHERE key LIKE 'mcp_test%' 
       ORDER BY updated_at DESC 
       LIMIT 5`, []));
        if (results.length === 0) {
            await interaction.editReply({
                content: "📭 Nenhum teste de escrita encontrado.\n\n💡 Use `/debug db-write` primeiro!",
            });
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle("📖 Últimos Testes de Escrita")
            .setColor("#5865F2")
            .setDescription(`Encontrados ${results.length} registros de teste:`)
            .setFooter({ text: "Verificação de persistência PostgreSQL" });
        for (const [index, result] of results.entries()) {
            const parsedValue = JSON.parse(result.value);
            const timeAgo = Math.floor((Date.now() - new Date(result.updated_at).getTime()) / 1000);
            embed.addFields({
                name: `${index + 1}. ${result.key}`,
                value: `**Fonte:** ${parsedValue.source || "unknown"}\n` +
                    `**Criado:** <t:${Math.floor(new Date(result.updated_at).getTime() / 1000)}:R> (${timeAgo}s atrás)\n` +
                    `**Valor:** \`${parsedValue.custom_value || parsedValue.test || "N/A"}\``,
                inline: false,
            });
        }
        await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
        console.error("Erro ao ler testes do banco:", error);
        await interaction.editReply({
            content: `❌ Erro ao ler do banco: ${error instanceof Error ? error.message : String(error)}`,
        });
    }
}
