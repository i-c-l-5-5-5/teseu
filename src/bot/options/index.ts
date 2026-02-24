/*
SPDX-License-Identifier: MIT
*/
import type { SlashCommandStringOption } from "discord.js";

export function squadTypeOption(
  opt: SlashCommandStringOption,
): SlashCommandStringOption {
  return opt
    .setName("tipo")
    .setDescription("Tipo de personalidade")
    .addChoices(
      { name: "Analyst", value: "Analyst" },
      { name: "Diplomat", value: "Diplomat" },
      { name: "Sentinel", value: "Sentinel" },
      { name: "Explorer", value: "Explorer" },
    )
    .setRequired(true);
}
