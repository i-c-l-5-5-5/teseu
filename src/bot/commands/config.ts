/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handleConfigCanais } from "@bot/handlers/config-canais.js";
import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

/**
 * Comando simplificado `config` (pt-br) com subcomandos curtos
 */
export const configCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("ADM: Configurações do bot (comandos curtos)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // ls
    .addSubcommand((sub) =>
      sub.setName("ls").setDescription("Listar configurações atuais"),
    )
    // set
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Definir canal para uma funcionalidade")
        .addStringOption((opt) =>
          opt
            .setName("funcionalidade")
            .setDescription("Funcionalidade a configurar")
            .setRequired(true)
            .addChoices(
              { name: "📢 Embeds/Anúncios", value: "embeds" },
              { name: "🎯 Quiz de Perfil", value: "perfil-quiz" },
              { name: "🧩 Quiz de Squads", value: "squad-quiz" },
              { name: "⚙️ Comandos Admin", value: "admin-commands" },
              { name: "📈 Notificações Level Up", value: "level-up" },
              { name: "🏆 Comando Rank", value: "rank" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal a ser configurado")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    // rm
    .addSubcommand((sub) =>
      sub
        .setName("rm")
        .setDescription("Remover configuração de uma funcionalidade")
        .addStringOption((opt) =>
          opt
            .setName("funcionalidade")
            .setDescription("Funcionalidade a remover")
            .setRequired(true)
            .addChoices(
              { name: "📢 Embeds/Anúncios", value: "embeds" },
              { name: "🎯 Quiz de Perfil", value: "perfil-quiz" },
              { name: "🧩 Quiz de Squads", value: "squad-quiz" },
              { name: "⚙️ Comandos Admin", value: "admin-commands" },
              { name: "📈 Notificações Level Up", value: "level-up" },
              { name: "🏆 Comando Rank", value: "rank" },
              { name: "🚫 Todas as configurações", value: "all" },
            ),
        ),
    )
    // xp grupo: usamos um subcommand único com opção acao curta
    .addSubcommand((sub) =>
      sub
        .setName("xp")
        .setDescription("XP: adicionar/remover/listar canais")
        .addStringOption((opt) =>
          opt
            .setName("acao")
            .setDescription("Ação: ls | add | rm | add-ignorar | rm-ignorar")
            .setRequired(true)
            .addChoices(
              { name: "📋 Listar", value: "ls" },
              { name: "➕ Adicionar permitido", value: "add" },
              { name: "➖ Remover permitido", value: "rm" },
              { name: "❌ Adicionar ignorado", value: "add-ignorar" },
              { name: "🗑️ Remover ignorado", value: "rm-ignorar" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal (obrigatório exceto ls)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    // cmd grupo
    .addSubcommand((sub) =>
      sub
        .setName("cmd")
        .setDescription("Comandos do bot: status/liberar/restringir/add/rm")
        .addStringOption((opt) =>
          opt
            .setName("acao")
            .setDescription("Ação: status | liberar | restringir | add | rm")
            .setRequired(true)
            .addChoices(
              { name: "📋 Status", value: "status" },
              { name: "🔓 Liberar em todos", value: "liberar" },
              { name: "🔒 Restringir", value: "restringir" },
              { name: "➕ Add canal", value: "add" },
              { name: "➖ Remover canal", value: "rm" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("canal")
            .setDescription("Canal (quando aplicável)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    ) as SlashCommandBuilder,

  handler: {
    name: "config",
    description: "Configurações do bot (comandos curtos)",
    adminOnly: true,
    cooldown: 5,
    execute: handleConfigCanais,
  },
};
