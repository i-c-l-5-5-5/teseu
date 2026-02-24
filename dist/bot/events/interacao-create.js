import { botRegistry } from "../core/registry.js";
export const interactionCreateEvent = {
    name: "interactionCreate",
    async execute(_client, ...args) {
        const interaction = args[0];
        if (interaction.isChatInputCommand()) {
            await botRegistry.executeCommand(interaction.commandName, interaction);
            return;
        }
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            await botRegistry.executeComponent(interaction);
        }
    },
};
