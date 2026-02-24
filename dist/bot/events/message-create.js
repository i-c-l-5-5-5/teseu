import { addMessageXP } from "../../services/ranking.js";
import { getConfiguredChannel, isChannelAllowed, } from "../../storage/channel-config.js";
export const messageCreateEvent = {
    name: "messageCreate",
    async execute(_client, ...args) {
        const message = args[0];
        if (!message.guild || message.author.bot)
            return;
        if (message.content.trim() === "!perfil-quiz") {
            const { startPerfilQuiz } = await import("../handlers/perfil-quiz.js");
            await startPerfilQuiz(message, message.author);
            return;
        }
        const { guild } = message;
        if (!guild)
            return;
        const canGainXP = await isChannelAllowed(guild.id, message.channel.id, "xp_channels");
        if (!canGainXP)
            return;
        const result = await addMessageXP(message.author.id, guild.id, message.channel.id);
        if (result.leveledUp) {
            const levelUpChannel = await getConfiguredChannel(guild.id, "level_up_channel");
            let notificationChannel = message.channel;
            if (levelUpChannel) {
                const configuredChannel = guild.channels.cache.get(levelUpChannel);
                if (configuredChannel?.isTextBased()) {
                    notificationChannel = configuredChannel;
                }
            }
            try {
                if (notificationChannel.isTextBased() &&
                    "send" in notificationChannel) {
                    await notificationChannel.send(`🎉 Parabéns ${message.author}! Você subiu para o nível **${result.newLevel}**!${result.newRank
                        ? ` Você ganhou o cargo **${result.newRank}**!`
                        : ""}`);
                }
            }
            catch (error) {
                console.error("Erro ao enviar notificação de level up:", error);
            }
            if (result.newRank) {
                try {
                    const member = await guild.members.fetch(message.author.id);
                    let role = guild.roles.cache.find((r) => r.name === result.newRank);
                    if (!role) {
                        role = await guild.roles.create({
                            name: result.newRank,
                            reason: "Cargo automático por nível",
                        });
                    }
                    if (!member.roles.cache.has(role.id)) {
                        await member.roles.add(role);
                    }
                }
                catch (error) {
                    console.error("Erro ao atribuir cargo de rank:", error);
                }
            }
        }
    },
};
