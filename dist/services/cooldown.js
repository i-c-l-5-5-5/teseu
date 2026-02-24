const COOLDOWN_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cooldowns = new Map();
export function isInCooldown(key) {
    const entry = cooldowns.get(key);
    if (!entry)
        return false;
    const now = Date.now();
    if (now - entry.lastUsed >= entry.duration) {
        cooldowns.delete(key);
        return false;
    }
    return true;
}
export function setCooldown(key, duration) {
    cooldowns.set(key, {
        lastUsed: Date.now(),
        duration,
    });
}
export function getCooldownRemaining(key) {
    const entry = cooldowns.get(key);
    if (!entry)
        return 0;
    const now = Date.now();
    const remaining = entry.duration - (now - entry.lastUsed);
    return Math.max(0, Math.ceil(remaining / 1000));
}
export function clearCooldown(key) {
    cooldowns.delete(key);
}
export function cleanupExpiredCooldowns() {
    const now = Date.now();
    for (const [key, entry] of cooldowns.entries()) {
        if (now - entry.lastUsed >= entry.duration) {
            cooldowns.delete(key);
        }
    }
}
setInterval(cleanupExpiredCooldowns, COOLDOWN_CLEANUP_INTERVAL_MS);
