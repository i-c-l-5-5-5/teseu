import { PermissionFlagsBits } from "discord.js";
class BotRegistry {
    commands = new Map();
    components = new Map();
    events = new Map();
    cooldowns = new Map();
    register(item) {
        if ("data" in item && "handler" in item) {
            this.commands.set(item.data.name, item.handler);
        }
        else if ("customId" in item && "type" in item) {
            const id = typeof item.customId === "string"
                ? item.customId
                : item.customId.source;
            this.components.set(id, item);
        }
        else if ("name" in item && "execute" in item) {
            this.events.set(item.name, item);
        }
    }
    unregister(name, type) {
        switch (type) {
            case "command":
                this.commands.delete(name);
                break;
            case "component":
                this.components.delete(name);
                break;
            case "event":
                this.events.delete(name);
                break;
        }
    }
    async executeCommand(commandName, interaction) {
        const handler = this.commands.get(commandName);
        if (!handler) {
            await interaction.reply({
                content: "❌ Comando não encontrado ou desabilitado.",
                ephemeral: true,
            });
            return;
        }
        const context = this.createCommandContext(interaction);
        if (!this.checkPermissions(handler, context)) {
            await interaction.reply({
                content: "🔒 Você não tem permissão para usar este comando.",
                ephemeral: true,
            });
            return;
        }
        if (!this.checkCooldown(handler, context.userId)) {
            const remaining = this.getRemainingCooldown(handler, context.userId);
            await interaction.reply({
                content: `⏱️ Aguarde **${remaining}s** antes de usar este comando novamente.`,
                ephemeral: true,
            });
            return;
        }
        try {
            this.applyCooldown(handler, context.userId);
            await handler.execute(interaction);
        }
        catch (error) {
            console.error(`Erro ao executar comando ${commandName}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            const replyOptions = {
                content: `Erro ao executar comando: ${errorMessage}`,
                ephemeral: true,
            };
            await (interaction.replied || interaction.deferred
                ? interaction.editReply(replyOptions)
                : interaction.reply(replyOptions));
        }
    }
    async executeComponent(interaction) {
        const { customId } = interaction;
        let handler = this.components.get(customId);
        if (!handler) {
            for (const [_key, comp] of this.components) {
                if (comp.customId instanceof RegExp && comp.customId.test(customId)) {
                    handler = comp;
                    break;
                }
            }
        }
        if (!handler) {
            await interaction.reply({
                content: "❌ Componente não encontrado ou expirado.",
                ephemeral: true,
            });
            return;
        }
        try {
            await handler.execute(interaction);
        }
        catch (error) {
            console.error(`Erro ao executar componente ${customId}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            const replyOptions = {
                content: `Erro no componente: ${errorMessage}`,
                ephemeral: true,
            };
            await (interaction.replied || interaction.deferred
                ? interaction.editReply(replyOptions)
                : interaction.reply(replyOptions));
        }
    }
    registerEvents(client) {
        for (const [name, handler] of this.events) {
            const runner = async (...args) => handler.execute(client, ...args);
            (handler.once
                ? client.once
                : client.on).call(client, name, runner);
        }
    }
    createCommandContext(interaction) {
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
            false;
        return {
            interaction,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            isAdmin,
        };
    }
    checkPermissions(handler, context) {
        return !handler.adminOnly || context.isAdmin;
    }
    checkCooldown(handler, userId) {
        if (!handler.cooldown)
            return true;
        const cooldownKey = `${handler.name}:${userId}`;
        const expireTime = this.cooldowns.get(cooldownKey);
        if (!expireTime)
            return true;
        return Date.now() > expireTime;
    }
    applyCooldown(handler, userId) {
        if (!handler.cooldown)
            return;
        const cooldownKey = `${handler.name}:${userId}`;
        const expireTime = Date.now() + handler.cooldown * 1000;
        this.cooldowns.set(cooldownKey, expireTime);
        setTimeout(() => {
            this.cooldowns.delete(cooldownKey);
        }, handler.cooldown * 1000);
    }
    getRemainingCooldown(handler, userId) {
        if (!handler.cooldown)
            return 0;
        const cooldownKey = `${handler.name}:${userId}`;
        const expireTime = this.cooldowns.get(cooldownKey);
        if (!expireTime)
            return 0;
        return Math.ceil((expireTime - Date.now()) / 1000);
    }
    clearCooldowns() {
        this.cooldowns.clear();
    }
    getStats() {
        return {
            commands: this.commands.size,
            components: this.components.size,
            events: this.events.size,
            activeCooldowns: this.cooldowns.size,
            commandNames: Array.from(this.commands.keys()),
            componentIds: Array.from(this.components.keys()),
            eventNames: Array.from(this.events.keys()),
        };
    }
    hasCommand(name) {
        return this.commands.has(name);
    }
    hasComponent(customId) {
        return this.components.has(customId);
    }
}
export const botRegistry = new BotRegistry();
export const registerCommand = (command) => botRegistry.register(command);
export const registerComponent = (component) => botRegistry.register(component);
export const registerEvent = (event) => botRegistry.register(event);
