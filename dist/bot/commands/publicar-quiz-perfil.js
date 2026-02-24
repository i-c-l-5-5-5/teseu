import { handleAtivarQuizPerfilExemplo, handleConfigQuizPerfil, handlePublicarQuizPerfil, } from "../handlers/publicar-quiz-perfil.js";
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
export const publicarQuizPerfilCommand = {
    data: new SlashCommandBuilder()
        .setName("publicar-quiz-perfil")
        .setDescription("ADM: Gerencia o quiz de criação de perfil")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) => sub
        .setName("publicar")
        .setDescription("Publica o quiz no canal especificado")
        .addChannelOption((opt) => opt
        .setName("canal")
        .setDescription("Canal de destino (padrão: canal atual)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("exemplo")
        .setDescription("Ativa a configuração exemplo do quiz"))
        .addSubcommand((sub) => sub
        .setName("config")
        .setDescription("Configura aspectos do quiz")
        .addStringOption((opt) => opt
        .setName("acao")
        .setDescription("Ação de configuração")
        .setRequired(true)
        .addChoices({ name: "🔧 Status do Quiz", value: "status" }, { name: "⚙️ Ativar/Desativar", value: "toggle" }, { name: "🎨 Cor Padrão", value: "cor" }, { name: "📋 Listar Resultados", value: "resultados" }, { name: "❓ Listar Questões", value: "questoes" }))
        .addStringOption((opt) => opt
        .setName("valor")
        .setDescription("Valor da configuração (quando aplicável)")
        .setRequired(false))),
    handler: {
        name: "publicar-quiz-perfil",
        description: "Sistema completo de gerenciamento do quiz de perfil",
        adminOnly: true,
        cooldown: 10,
        execute: async (interaction) => {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case "publicar":
                    await handlePublicarQuizPerfil(interaction);
                    break;
                case "exemplo":
                    await handleAtivarQuizPerfilExemplo(interaction);
                    break;
                case "config":
                    await handleConfigQuizPerfil(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "❌ Subcomando não reconhecido.",
                        ephemeral: true,
                    });
            }
        },
    },
};
