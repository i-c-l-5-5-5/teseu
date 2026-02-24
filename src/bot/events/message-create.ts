/*
SPDX-License-Identifier: MIT
*/

import type { EventHandler } from "@barqueiro/types";
import { addMessageXP } from "@services/ranking.js";
import {
  getConfiguredChannel,
  isChannelAllowed,
} from "@storage/channel-config.js";
import type { Message, Role } from "discord.js";

export const messageCreateEvent: EventHandler = {
  name: "messageCreate",
  async execute(_client, ...args) {
    const message = args[0] as Message;
    if (!message.guild || message.author.bot) return;

    // Processar comando !perfil-quiz
    if (message.content.trim() === "!perfil-quiz") {
      const { startPerfilQuiz } = await import("@bot/handlers/perfil-quiz.js");
      await startPerfilQuiz(message, message.author);
      return;
    }

    const { guild } = message;
    if (!guild) return;

    // Verificar se o canal permite XP
    const canGainXP = await isChannelAllowed(
      guild.id,
      message.channel.id,
      "xp_channels",
    );
    if (!canGainXP) return;

    // Adicionar XP usando o novo sistema
    const result = await addMessageXP(
      message.author.id,
      guild.id,
      message.channel.id,
    );

    if (result.leveledUp) {
      // Verificar se há canal configurado para notificações
      const levelUpChannel = await getConfiguredChannel(
        guild.id,
        "level_up_channel",
      );
      let notificationChannel = message.channel;

      if (levelUpChannel) {
        const configuredChannel = guild.channels.cache.get(levelUpChannel);
        if (configuredChannel?.isTextBased()) {
          notificationChannel = configuredChannel;
        }
      }

      // Notificar level up
      try {
        if (
          notificationChannel.isTextBased() &&
          "send" in notificationChannel
        ) {
          await notificationChannel.send(
            `🎉 Parabéns ${message.author}! Você subiu para o nível **${result.newLevel}**!${
              result.newRank
                ? ` Você ganhou o cargo **${result.newRank}**!`
                : ""
            }`,
          );
        }
      } catch (error) {
        console.error("Erro ao enviar notificação de level up:", error);
      }

      // Atribuir cargo se necessário
      if (result.newRank) {
        try {
          const member = await guild.members.fetch(message.author.id);
          let role = guild.roles.cache.find(
            (r: Role) => r.name === result.newRank,
          );

          if (!role) {
            role = await guild.roles.create({
              name: result.newRank,
              reason: "Cargo automático por nível",
            });
          }

          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);
          }
        } catch (error) {
          console.error("Erro ao atribuir cargo de rank:", error);
        }
      }
    }
  },
};
