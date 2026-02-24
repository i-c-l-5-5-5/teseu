/*
SPDX-License-Identifier: MIT
*/

import type { EventHandler } from "@barqueiro/types";
import { botRegistry } from "@bot/core/registry.js";
import type { Interaction } from "discord.js";

export const interactionCreateEvent: EventHandler = {
  name: "interactionCreate",
  async execute(_client, ...args) {
    const interaction = args[0] as Interaction;
    if (interaction.isChatInputCommand()) {
      await botRegistry.executeCommand(interaction.commandName, interaction);
      return;
    }
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await botRegistry.executeComponent(interaction);
    }
  },
};
