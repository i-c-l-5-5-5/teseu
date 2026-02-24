import { handleEmbed } from "../handlers/embed.js";
import { ChannelType, SlashCommandBuilder } from "discord.js";
export const embedCommand = {
    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Enviar embed personalizada")
        .addStringOption((opt) => opt
        .setName("modo")
        .setDescription("Modo de criação")
        .addChoices({ name: "🎨 Construtor Interativo (Recomendado)", value: "builder" }, { name: "⚡ Modo Rápido (Linha de Comando)", value: "quick" })
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("titulo")
        .setDescription("Título da embed")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("descricao")
        .setDescription("Descrição principal da embed")
        .setRequired(false))
        .addChannelOption((opt) => opt
        .setName("canal")
        .setDescription("Canal de destino (opcional, padrão: canal atual)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("cor")
        .setDescription("Cor da embed (hex), ex: #5865F2")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("imagem")
        .setDescription("URL da imagem principal")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("thumbnail")
        .setDescription("URL da imagem pequena (thumbnail)")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("autor")
        .setDescription("Nome do autor da embed")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("autor_icone")
        .setDescription("URL do ícone do autor")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("footer")
        .setDescription("Texto do rodapé")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("campos")
        .setDescription("Campos extras (formato: Nome1:Valor1|Nome2:Valor2)")
        .setRequired(false))
        .addStringOption((opt) => opt
        .setName("mencao")
        .setDescription("Tipo de menção a adicionar")
        .addChoices({ name: "@everyone", value: "everyone" }, { name: "@here", value: "here" }, { name: "Nenhuma", value: "none" })
        .setRequired(false)),
    handler: {
        name: "embed",
        description: "Sistema de embeds personalizadas com controle de canais",
        adminOnly: false,
        cooldown: 30,
        execute: handleEmbed,
    },
};
