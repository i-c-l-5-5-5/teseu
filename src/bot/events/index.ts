/*
SPDX-License-Identifier: MIT
*/
import type { EventHandler } from "@barqueiro/types";
import { interactionCreateEvent } from "@bot/events/interacao-create.js";
import { messageCreateEvent } from "@bot/events/message-create.js";
import { readyEvent } from "@bot/events/ready.js";

export const events: EventHandler[] = [
  readyEvent,
  messageCreateEvent,
  interactionCreateEvent,
];
