import { interactionCreateEvent } from "../events/interacao-create.js";
import { messageCreateEvent } from "../events/message-create.js";
import { readyEvent } from "../events/ready.js";
export const events = [
    readyEvent,
    messageCreateEvent,
    interactionCreateEvent,
];
