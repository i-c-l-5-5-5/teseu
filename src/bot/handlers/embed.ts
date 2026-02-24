/*
SPDX-License-Identifier: MIT
*/
import { isChannelAllowed } from "@storage/channel-config.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
  type ColorResolvable,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { MODAL_TIMEOUT_MS } from "@/tipos/common.js";
import type { EmbedData } from "@/tipos/embed.js";

/**
 * Construtor interativo de embed com preview em tempo real
 */
async function mostrarConstrutorEmbed(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) return;

  const isAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
    false;

  // Dados iniciais da embed
  const embedData: EmbedData = {
    title: interaction.options.getString("titulo") || undefined,
    description: interaction.options.getString("descricao") || undefined,
    fields: [],
  };

  // Função para gerar preview da embed
  const gerarPreview = (): EmbedBuilder => {
    const embed = new EmbedBuilder()
      .setTitle(embedData.title || "Sem título")
      .setDescription(embedData.description || "Sem descrição")
      .setColor((embedData.color as ColorResolvable) || "#5865F2")
      .setTimestamp();

    if (embedData.image) embed.setImage(embedData.image);
    if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
    if (embedData.author) {
      embed.setAuthor({
        name: embedData.author,
        iconURL: embedData.authorIcon,
      });
    }
    if (embedData.footer) embed.setFooter({ text: embedData.footer });
    if (embedData.fields.length > 0) embed.addFields(embedData.fields);

    return embed;
  };

  // Função para gerar botões de ação
  const gerarBotoes = () => {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("edit_basic")
        .setLabel("Editar Básico")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId("add_field")
        .setLabel("Adicionar Campo")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId("edit_style")
        .setLabel("Estilo/Imagens")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🎨"),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("select_channel")
        .setLabel("Escolher Canal")
        .setStyle(ButtonStyle.Success)
        .setEmoji("📢"),
      new ButtonBuilder()
        .setCustomId("send_embed")
        .setLabel("Enviar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀")
        .setDisabled(!embedData.title || !embedData.description),
      new ButtonBuilder()
        .setCustomId("cancel_embed")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌"),
    );

    return [row1, row2];
  };

  // Enviar preview inicial
  let targetChannelId = interaction.channelId;
  const infoEmbed = new EmbedBuilder()
    .setTitle("🎨 Construtor de Embed Interativo")
    .setDescription(
      "Use os botões abaixo para criar sua embed personalizada.\n" +
        `**Canal de destino:** <#${targetChannelId}>\n\n` +
        "**Preview da sua embed:**",
    )
    .setColor("#5865F2");

  const payload = {
    embeds: [infoEmbed, gerarPreview()],
    components: gerarBotoes(),
    ephemeral: true,
    fetchReply: true,
  } as const;
  const response =
    interaction.replied || interaction.deferred
      ? await interaction.editReply(payload)
      : await interaction.reply(payload);

  // Coletor de interações
  const collector = response.createMessageComponentCollector();

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({
        content: "❌ Apenas quem iniciou pode interagir.",
        ephemeral: true,
      });
      return;
    }

    // Modal para edição básica
    if (i.customId === "edit_basic") {
      const modal = new ModalBuilder()
        .setCustomId("modal_edit_basic")
        .setTitle("Editar Título e Descrição");

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_title")
            .setLabel("Título da Embed")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setValue(embedData.title || "")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_description")
            .setLabel("Descrição")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setValue(embedData.description || "")
            .setRequired(true),
        ),
      );

      await i.showModal(modal);

      // Aguardar submit do modal
      try {
        const submitted = await i.awaitModalSubmit({
          filter: (mi) => mi.user.id === i.user.id,
          time: MODAL_TIMEOUT_MS,
        });

        embedData.title = submitted.fields.getTextInputValue("input_title");
        embedData.description =
          submitted.fields.getTextInputValue("input_description");

        await submitted.deferUpdate();
        await interaction.editReply({
          embeds: [infoEmbed, gerarPreview()],
          components: gerarBotoes(),
        });
      } catch {
        // Timeout do modal
      }
    }

    // Modal para adicionar campo
    else if (i.customId === "add_field") {
      const modal = new ModalBuilder()
        .setCustomId("modal_add_field")
        .setTitle("Adicionar Campo");

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("field_name")
            .setLabel("Nome do Campo")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("field_value")
            .setLabel("Valor do Campo")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1024)
            .setRequired(true),
        ),
      );

      await i.showModal(modal);

      try {
        const submitted = await i.awaitModalSubmit({
          filter: (mi) => mi.user.id === i.user.id,
          time: MODAL_TIMEOUT_MS,
        });

        embedData.fields.push({
          name: submitted.fields.getTextInputValue("field_name"),
          value: submitted.fields.getTextInputValue("field_value"),
          inline: false,
        });

        await submitted.deferUpdate();
        await interaction.editReply({
          embeds: [infoEmbed, gerarPreview()],
          components: gerarBotoes(),
        });
      } catch {
        // Timeout
      }
    }

    // Modal para estilo e imagens
    else if (i.customId === "edit_style") {
      const modal = new ModalBuilder()
        .setCustomId("modal_edit_style")
        .setTitle("Estilo e Imagens");

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_color")
            .setLabel("Cor (hex, ex: #FF0000)")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(7)
            .setValue(embedData.color || "")
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_image")
            .setLabel("URL da Imagem Principal")
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.image || "")
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_thumbnail")
            .setLabel("URL do Thumbnail")
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.thumbnail || "")
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("input_footer")
            .setLabel("Texto do Rodapé")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2048)
            .setValue(embedData.footer || "")
            .setRequired(false),
        ),
      );

      await i.showModal(modal);

      try {
        const submitted = await i.awaitModalSubmit({
          filter: (mi) => mi.user.id === i.user.id,
          time: MODAL_TIMEOUT_MS,
        });

        const color = submitted.fields.getTextInputValue("input_color");
        if (color && /^#[\dA-Fa-f]{6}$/.test(color)) {
          embedData.color = color;
        }

        embedData.image =
          submitted.fields.getTextInputValue("input_image") || undefined;
        embedData.thumbnail =
          submitted.fields.getTextInputValue("input_thumbnail") || undefined;
        embedData.footer =
          submitted.fields.getTextInputValue("input_footer") || undefined;

        await submitted.deferUpdate();
        await interaction.editReply({
          embeds: [infoEmbed, gerarPreview()],
          components: gerarBotoes(),
        });
      } catch {
        // Timeout
      }
    }

    // Seleção de canal
    else if (i.customId === "select_channel") {
      if (!interaction.guild) return;
      const canais = interaction.guild.channels.cache.filter(
        (c) =>
          c.type === ChannelType.GuildText &&
          interaction.guild?.members.me &&
          c.permissionsFor(interaction.guild.members.me)?.has("SendMessages"),
      );

      const menu = new StringSelectMenuBuilder()
        .setCustomId("menu_select_channel")
        .setPlaceholder("Escolha o canal de destino")
        .addOptions(
          Array.from(canais.values())
            .slice(0, 25)
            .map((canal) => ({
              label: canal.name,
              value: canal.id,
              description: `Enviar embed para #${canal.name}`,
              default: canal.id === targetChannelId,
            })),
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        menu,
      );

      await i.update({
        embeds: [infoEmbed, gerarPreview()],
        components: [row, ...gerarBotoes()],
      });

      const selectCollector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
      });

      selectCollector.on("collect", async (si) => {
        if (si.customId === "menu_select_channel") {
          targetChannelId = si.values[0] ?? "";
          infoEmbed.setDescription(
            "Use os botões abaixo para criar sua embed personalizada.\n" +
              `**Canal de destino:** <#${targetChannelId}>\n\n` +
              "**Preview da sua embed:**",
          );

          await si.update({
            embeds: [infoEmbed, gerarPreview()],
            components: gerarBotoes(),
          });
        }
      });
    }

    // Enviar embed
    else if (i.customId === "send_embed") {
      await i.deferUpdate();

      if (!interaction.guild) return;
      const targetChannel = interaction.guild.channels.cache.get(
        targetChannelId,
      ) as TextChannel;

      if (!targetChannel) {
        await i.followUp({
          content: "❌ Canal não encontrado.",
          ephemeral: true,
        });
        return;
      }

      // Verificar permissões para não-admins
      if (!isAdmin && interaction.guildId) {
        const allowed = await isChannelAllowed(
          interaction.guildId,
          targetChannelId,
          "embeds_channel",
        );
        if (!allowed) {
          await i.followUp({
            content:
              "❌ Você não tem permissão para enviar embeds neste canal.",
            ephemeral: true,
          });
          return;
        }
      }

      // Enviar embed
      try {
        await targetChannel.send({ embeds: [gerarPreview()] });
        await i.editReply({
          content: `✅ Embed enviada com sucesso para ${targetChannel}!`,
          embeds: [],
          components: [],
        });
      } catch {
        await i.followUp({
          content: "❌ Erro ao enviar embed. Verifique as permissões do bot.",
          ephemeral: true,
        });
      }
    }

    // Cancelar
    else if (i.customId === "cancel_embed") {
      await i.update({
        content: "❌ Criação de embed cancelada.",
        embeds: [],
        components: [],
      });
    }
  });
}

/**
 * Handler unificado para comando /embed
 * - Administradores podem enviar para qualquer canal
 * - Membros só podem enviar para canais configurados
 */
export async function handleEmbed(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: "Este comando só pode ser usado em um servidor.",
      ephemeral: true,
    });
    return;
  }

  // Verificar modo de operação
  const modo = interaction.options.getString("modo") || "builder";

  if (modo === "builder") {
    await mostrarConstrutorEmbed(interaction);
    return;
  }

  // Modo rápido (legado)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Verificar se o usuário é administrador
  const isAdmin =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
    false;

  // Obter canal de destino
  const rawChannel =
    interaction.options.getChannel("canal") ?? interaction.channel;

  if (!rawChannel || !("send" in rawChannel)) {
    return void interaction.editReply(
      "❌ Canal inválido. Selecione um canal de texto.",
    );
  }

  const targetChannel = rawChannel as TextChannel;

  if (
    "guildId" in targetChannel &&
    targetChannel.guildId !== interaction.guildId
  ) {
    return void interaction.editReply("❌ Canal inválido ou não encontrado.");
  }

  // Para não-admins, verificar se o canal está configurado para embeds
  if (!isAdmin) {
    const allowed = await isChannelAllowed(
      interaction.guildId,
      targetChannel.id,
      "embeds_channel",
    );
    if (!allowed) {
      return void interaction.editReply(
        "❌ Este canal não está configurado para receber embeds. " +
          "Peça a um administrador para configurar os canais permitidos com `/config set funcionalidade:embeds`.",
      );
    }
  }

  // Validar permissões do bot no canal
  if (
    !interaction.guild.members.me
      ?.permissionsIn(targetChannel)
      .has(["SendMessages", "EmbedLinks"])
  ) {
    return void interaction.editReply(
      "❌ O bot não tem permissões necessárias no canal de destino.",
    );
  }

  // Obter dados da embed
  const titulo = interaction.options.getString("titulo", true);
  const descricao = interaction.options.getString("descricao", true);
  const cor = interaction.options.getString("cor");
  const imagem = interaction.options.getString("imagem");
  const thumbnail = interaction.options.getString("thumbnail");
  const autor = interaction.options.getString("autor");
  const autorIcone = interaction.options.getString("autor_icone");
  const footer = interaction.options.getString("footer");
  const campos = interaction.options.getString("campos");
  const mencao = interaction.options.getString("mencao");

  // Criar embed
  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setTimestamp();

  // Definir cor
  if (cor && /^#[\dA-Fa-f]{6,8}$/.test(cor)) {
    embed.setColor(cor as ColorResolvable);
  } else {
    embed.setColor(0x5865f2);
  }

  // Adicionar imagem principal
  if (imagem) {
    try {
      new URL(imagem);
      embed.setImage(imagem);
    } catch {
      return void interaction.editReply(
        "❌ URL da imagem principal é inválida.",
      );
    }
  }

  // Adicionar thumbnail
  if (thumbnail) {
    try {
      new URL(thumbnail);
      embed.setThumbnail(thumbnail);
    } catch {
      return void interaction.editReply("❌ URL do thumbnail é inválida.");
    }
  }

  // Adicionar autor
  if (autor) {
    const authorData: { name: string; iconURL?: string } = { name: autor };
    if (autorIcone) {
      try {
        new URL(autorIcone);
        authorData.iconURL = autorIcone;
      } catch {
        return void interaction.editReply(
          "❌ URL do ícone do autor é inválida.",
        );
      }
    }
    embed.setAuthor(authorData);
  }

  // Adicionar footer personalizado ou padrão
  if (footer) {
    embed.setFooter({ text: footer });
  } else if (isAdmin) {
    embed.setFooter({
      text: "Anúncio oficial",
      iconURL: interaction.guild.iconURL() ?? undefined,
    });
  } else {
    embed.setFooter({
      text: `Enviado por ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL(),
    });
  }

  // Adicionar campos extras
  if (campos) {
    try {
      const fieldPairs = campos.split("|");
      for (const pair of fieldPairs) {
        const [name, value] = pair.split(":");
        if (name && value && name.trim() && value.trim()) {
          embed.addFields({
            name: name.trim(),
            value: value.trim(),
            inline: false,
          });
        }
      }
    } catch {
      return void interaction.editReply(
        "❌ Formato de campos inválido. Use: Nome1:Valor1|Nome2:Valor2",
      );
    }
  }

  // Preparar menção (apenas para admins)
  let mentionText = "";
  if (isAdmin && mencao && mencao !== "none") {
    switch (mencao) {
      case "everyone":
        mentionText = "@everyone";
        break;
      case "here":
        mentionText = "@here";
        break;
    }
  }

  // Enviar embed
  try {
    const messageOptions: { embeds: EmbedBuilder[]; content?: string } = {
      embeds: [embed],
    };

    if (mentionText) {
      messageOptions.content = mentionText;
    }

    await targetChannel.send(messageOptions);

    const statusMessage = isAdmin
      ? `✅ Anúncio enviado com sucesso para ${targetChannel.toString()}!`
      : `✅ Embed enviada com sucesso para ${targetChannel.toString()}!`;

    await interaction.editReply(statusMessage);
  } catch (error) {
    console.error(
      "Erro ao enviar embed:",
      error instanceof Error ? error.message : String(error),
    );
    await interaction.editReply(
      "❌ Erro ao enviar embed. Verifique as permissões do bot.",
    );
  }
}
