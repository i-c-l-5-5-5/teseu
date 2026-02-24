import { getAnnouncementChannels, sendAnnouncement, validateAnnouncementChannel, } from "../../tipos/index.js";
import { requirePanelToken } from "../../core/auth/middleware.js";
import { getCooldownRemaining, isInCooldown, setCooldown, } from "../../services/cooldown.js";
import { getPerfilQuizConfig, setPerfilQuizConfig, } from "../../storage/perfil-quiz.js";
import { getRankRoles, removeRankRole, setRankRole } from "../../storage/ranks.js";
import express from "express";
import { getGuildQuizResults, getQuizConfig as getSquadQuizConfig, setQuizConfig as setSquadQuizConfig, } from "../../services/quiz.js";
import { query } from "../../storage/postgres.js";
const router = express.Router();
const MEMBER_EMBED_COOLDOWN_MS = 30_000;
router.get("/health", async (_req, res) => {
    const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "barqueiro",
        database: "unknown",
        discord: "unknown",
        uptime: process.uptime(),
    };
    try {
        await query("SELECT 1");
        health.database = "online";
    }
    catch (error) {
        health.database = "offline";
        health.status = "degraded";
        console.error("[Health] Erro no banco:", error);
    }
    try {
        const client = globalThis.barqueiroClient;
        if (client?.isReady()) {
            health.discord = "online";
        }
        else if (client) {
            health.discord = "connecting";
            health.status = "degraded";
        }
        else {
            health.discord = "offline";
            health.status = "degraded";
        }
    }
    catch (error) {
        health.discord = "error";
        health.status = "degraded";
        console.error("[Health] Erro ao verificar bot:", error);
    }
    const statusCode = health.status === "ok" ? 200 : 503;
    return res.status(statusCode).json(health);
});
function getPanelSession(req) {
    return req.panel;
}
function isGuildAdmin(panel, guildId) {
    if (!panel)
        return false;
    const adminList = panel.admin && panel.admin.length > 0 ? panel.admin : panel.guilds;
    return adminList.some((g) => typeof g === "string" ? g === guildId : g.id === guildId);
}
function isGuildMember(panel, guildId) {
    if (!panel)
        return false;
    const list = panel.memberInstalled && panel.memberInstalled.length > 0
        ? panel.memberInstalled
        : panel.guilds;
    return list.some((g) => typeof g === "string" ? g === guildId : g.id === guildId);
}
router.get("/bot/info", (_req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const permissions = process.env.DISCORD_PERMISSIONS;
    const baseUrl = process.env.PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
    const redirectUri = new URL("/oauth/callback", baseUrl).toString();
    const inviteParams = new URLSearchParams({
        client_id: String(clientId || ""),
        response_type: "code",
        redirect_uri: redirectUri,
        integration_type: "0",
        scope: "bot applications.commands identify guilds",
    });
    if (permissions)
        inviteParams.set("permissions", String(permissions));
    const apiInviteParams = new URLSearchParams({
        client_id: String(clientId || ""),
        scope: "bot applications.commands",
    });
    if (permissions)
        apiInviteParams.set("permissions", String(permissions));
    const botInfo = {
        client_id: clientId,
        permissions: permissions ?? null,
        invite_url: `https://discord.com/api/oauth2/authorize?${apiInviteParams.toString()}`,
        friendly_invite_url: `https://discord.com/oauth2/authorize?${inviteParams.toString()}`,
        status: globalThis.barqueiroClient
            ? globalThis.barqueiroClient.isReady()
                ? "online"
                : "connecting"
            : "offline",
    };
    res.json(botInfo);
});
router.get("/commands", (_req, res) => {
    try {
        const client = globalThis.barqueiroClient;
        if (!client?.isReady()) {
            return res.json({ commands: [], status: "Bot offline" });
        }
        const commands = client.application?.commands.cache.map((cmd) => ({
            name: cmd.name,
            description: cmd.description,
            default_member_permissions: cmd.defaultMemberPermissions?.bitfield ?? null,
            dm_permission: cmd.dmPermission ?? null,
            options: cmd.options?.map((opt) => ({
                name: opt.name,
                description: opt.description,
                type: opt.type,
                required: "required" in opt ? opt.required : false,
            })) || [],
        })) || [];
        return res.json({
            commands,
            count: commands.length,
            status: "online",
        });
    }
    catch (error) {
        console.error("Erro ao buscar comandos:", error);
        return res.json({ commands: [], status: "Error fetching commands" });
    }
});
router.get("/bot/guilds", requirePanelToken, (_req, res) => {
    try {
        const client = globalThis.barqueiroClient;
        if (!client?.isReady()) {
            return res.json({ guilds: [], status: "Bot offline" });
        }
        const botGuilds = client.guilds.cache.map((guild) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : null,
            memberCount: guild.memberCount,
            owner: guild.ownerId,
        }));
        return res.json({
            guilds: botGuilds,
            count: botGuilds.length,
            status: "online",
        });
    }
    catch (error) {
        console.error("Erro ao buscar guilds do bot:", error);
        return res.json({ guilds: [], status: "Error fetching guilds" });
    }
});
router.get("/painel/guilds", requirePanelToken, (req, res) => {
    const { panel } = req;
    const installed = panel?.guilds ?? [];
    const admin = panel?.admin ?? installed;
    const memberInstalled = panel?.memberInstalled ?? installed;
    const client = globalThis.barqueiroClient;
    let botGuilds = [];
    if (client?.isReady()) {
        botGuilds = client.guilds.cache.map((guild) => guild.id);
    }
    const guildsWithBotStatus = installed.map((guild) => ({
        id: typeof guild === "string" ? guild : guild.id,
        name: typeof guild === "string" ? guild : guild.name,
        botPresent: botGuilds.includes(typeof guild === "string" ? guild : guild.id),
    }));
    res.json({
        sub: panel?.sub,
        username: panel?.username ?? null,
        avatar_url: panel?.avatar_url ?? null,
        installed,
        admin,
        memberInstalled,
        guilds: installed,
        guildsWithBot: guildsWithBotStatus,
        botStatus: client?.isReady() ? "online" : "offline",
        botGuildCount: botGuilds.length,
    });
});
router.get("/quiz/:gid", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const cfg = getSquadQuizConfig(gid);
        return res.json(cfg);
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/quiz/:gid", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_admin" });
        }
        const cfg = req.body;
        const ok = setSquadQuizConfig(gid, {
            questions: Array.isArray(cfg.questions)
                ? cfg.questions
                : [],
            results: Array.isArray(cfg.results)
                ? cfg.results
                : [],
            disclaimer: typeof cfg.disclaimer === "string" ? cfg.disclaimer : "",
            enabled: Boolean(cfg.enabled),
        });
        return res
            .status((await ok) ? 200 : 500)
            .json((await ok) ? { ok: true } : { error: "save_failed" });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/quiz/:gid/publish", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_admin" });
        }
        const body = (req.body || {});
        const channelId = (body.channelId || "").trim();
        if (!channelId)
            return res.status(400).json({ error: "missing_channel" });
        const validation = await validateAnnouncementChannel(channelId);
        if (!validation.valid || validation.channel?.guildId !== gid) {
            return res.status(400).json({ error: "invalid_channel" });
        }
        const cfg = getSquadQuizConfig(gid);
        const title = "Quiz disponível";
        const description = `${(await cfg).disclaimer || ""}\nInicie o quiz no canal indicado.`;
        const out = await sendAnnouncement({
            guildId: gid,
            channelId,
            data: { title, description },
        });
        if (!out.success)
            return res.status(500).json({ error: out.error || "failed" });
        return res.json({ ok: true, messageId: out.messageId });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/quiz/:gid/metrics", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const rows = getGuildQuizResults(gid);
        const metrics = [];
        for (const row of await rows) {
            let answers = [];
            try {
                answers = JSON.parse(row.answers || "[]");
            }
            catch { }
            for (const a of answers) {
                const qi = typeof a.questionIndex === "number" ? a.questionIndex : 0;
                const key = a.result || "";
                if (!key)
                    continue;
                const found = metrics.find((m) => m.question_idx === qi && m.result === key);
                if (found)
                    found.count += 1;
                else
                    metrics.push({ question_idx: qi, result: key, count: 1 });
            }
        }
        return res.json({ metrics });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/quiz-config/:gid", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        return res.json({ channelId: null, mode: "default" });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/guild/:gid/channels", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const out = await getAnnouncementChannels(gid);
        if (!out.success)
            return res.status(500).json({ error: out.error || "failed" });
        return res.json({ channels: out.channels || [] });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/guild/:gid/roles", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const client = globalThis.barqueiroClient;
        if (!client?.isReady())
            return res.json({ roles: [] });
        const guild = await client.guilds.fetch(gid);
        if (!guild)
            return res.json({ roles: [] });
        const fetched = await guild.roles.fetch();
        const roles = Array.from(fetched.values())
            .filter((r) => !r.managed)
            .map((r) => ({ id: r.id, name: r.name, color: r.color }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return res.json({ roles });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/embed/:gid", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_admin" });
        }
        const body = (req.body || {});
        const channelId = (body.channelId || "").trim();
        const title = (body.title || "").trim();
        const description = (body.description || "").trim();
        const color = (body.color || "").trim() || undefined;
        const image = (body.image || "").trim() || undefined;
        if (!channelId || !title || !description) {
            return res.status(400).json({ error: "missing_fields" });
        }
        const validation = await validateAnnouncementChannel(channelId);
        if (!validation.valid || !validation.channel) {
            return res
                .status(400)
                .json({ error: validation.error || "invalid_channel" });
        }
        if (validation.channel.guildId !== gid) {
            return res.status(400).json({ error: "channel_not_in_guild" });
        }
        const out = await sendAnnouncement({
            guildId: gid,
            channelId,
            data: { title, description, color, imageUrl: image },
        });
        if (!out.success)
            return res.status(500).json({ error: out.error || "failed" });
        return res.json({ ok: true, messageId: out.messageId });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/ranks/:gid", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const roles = await getRankRoles(gid);
        return res.json({ roles });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/ranks/:gid", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_admin" });
        }
        const body = (req.body || {});
        const incoming = Array.isArray(body.roles) ? body.roles : [];
        if (incoming.length === 0)
            return res.status(400).json({ error: "empty_roles" });
        const current = await getRankRoles(gid);
        const byLevel = new Map();
        for (const r of current)
            byLevel.set(r.level, r);
        for (const r of incoming) {
            if (typeof r.level !== "number" ||
                !Number.isFinite(r.level) ||
                typeof r.role_name !== "string" ||
                !r.role_name.trim())
                continue;
            byLevel.set(Math.trunc(r.level), {
                level: Math.trunc(r.level),
                role_name: r.role_name.trim(),
            });
        }
        const merged = Array.from(byLevel.values()).sort((a, b) => a.level - b.level);
        for (const role of merged) {
            await setRankRole(gid, role.level, role.role_name);
        }
        return res.json({ ok: true, count: merged.length });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.delete("/ranks/:gid/:level", requirePanelToken, async (req, res) => {
    try {
        const { gid, level } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const lvl = Number(level);
        if (!Number.isFinite(lvl))
            return res.status(400).json({ error: "invalid_level" });
        await removeRankRole(gid, lvl);
        return res.json({ ok: true });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/member/:gid/channels", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildMember(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_member" });
        }
        const out = await getAnnouncementChannels(gid);
        if (!out.success)
            return res.status(500).json({ error: out.error || "failed" });
        return res.json({ channels: out.channels || [] });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/member/embed/:gid", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildMember(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_member" });
        }
        const userId = panel?.sub || "unknown";
        const key = `${userId}:embed:${gid}`;
        if (isInCooldown(key)) {
            const secs = getCooldownRemaining(key);
            return res
                .status(429)
                .json({ error: "cooldown", retry_after_ms: secs * 1000 });
        }
        const body = (req.body || {});
        const channelId = (body.channelId || "").trim();
        const title = (body.title || "").trim();
        const description = (body.description || "").trim();
        const color = (body.color || "").trim() || undefined;
        const image = (body.image || "").trim() || undefined;
        if (!channelId || !title || !description) {
            return res.status(400).json({ error: "missing_fields" });
        }
        const validation = await validateAnnouncementChannel(channelId);
        if (!validation.valid || !validation.channel) {
            return res
                .status(400)
                .json({ error: validation.error || "invalid_channel" });
        }
        if (validation.channel.guildId !== gid) {
            return res.status(400).json({ error: "channel_not_in_guild" });
        }
        const out = await sendAnnouncement({
            guildId: gid,
            channelId,
            data: { title, description, color, imageUrl: image },
        });
        if (!out.success)
            return res.status(500).json({ error: out.error || "failed" });
        setCooldown(key, MEMBER_EMBED_COOLDOWN_MS);
        return res.json({ ok: true, messageId: out.messageId });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.get("/perfil-quiz/:gid", requirePanelToken, async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res.status(403).json({ error: "forbidden", reason: "not_admin" });
        }
        const config = await getPerfilQuizConfig();
        return res.json(config);
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
router.post("/perfil-quiz/:gid", requirePanelToken, express.json(), async (req, res) => {
    try {
        const { gid } = req.params;
        const panel = getPanelSession(req);
        if (!isGuildAdmin(panel, gid)) {
            return res
                .status(403)
                .json({ error: "forbidden", reason: "not_admin" });
        }
        const config = req.body;
        if (!config ||
            typeof config !== "object" ||
            typeof config.enabled !== "boolean" ||
            !Array.isArray(config.questions) ||
            !Array.isArray(config.results)) {
            return res.status(400).json({ error: "invalid_config" });
        }
        const success = await setPerfilQuizConfig(config);
        if (!success) {
            return res.status(500).json({ error: "save_failed" });
        }
        return res.json({ ok: true });
    }
    catch {
        return res.status(500).json({ error: "internal_error" });
    }
});
export default router;
