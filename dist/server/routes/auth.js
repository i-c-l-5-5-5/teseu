import crypto from "crypto";
import express from "express";
import { SignJWT } from "jose";
const router = express.Router();
function sanitizeNext(input) {
    if (!input || typeof input !== "string")
        return "/";
    try {
        const url = new URL(input, "http://localhost");
        if (url.pathname.startsWith("/"))
            return url.pathname;
    }
    catch { }
    return "/";
}
router.get("/login", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId)
        return res.status(500).send("DISCORD_CLIENT_ID não configurado.");
    const baseUrl = process.env.PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
    const state = crypto.randomUUID();
    const redirectUri = new URL("/auth/oauth/callback", baseUrl).toString();
    const isHttps = req.secure ||
        (req.headers["x-forwarded-proto"] || "")
            .toString()
            .split(",")[0]
            ?.trim() === "https" ||
        baseUrl.startsWith("https://");
    if (process.env.NODE_ENV !== "production")
        console.log("OAuth Login Debug:", {
            state,
            isHttps,
            redirectUri,
            baseUrl,
            clientId: `${clientId?.substring(0, 8)}...`,
        });
    const next = req.query?.next;
    if (next) {
        res.cookie("panel_next", next, {
            httpOnly: true,
            sameSite: "lax",
            secure: isHttps,
            path: "/",
            maxAge: 1000 * 60 * 10,
        });
    }
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("state", state);
    res.cookie("oauth_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 1000 * 60 * 15,
    });
    if (process.env.NODE_ENV !== "production")
        console.log("OAuth State Cookie Set:", {
            state,
            cookieOptions: {
                httpOnly: true,
                sameSite: "lax",
                secure: isHttps,
                path: "/",
                maxAge: 1000 * 60 * 15,
            },
        });
    return res.redirect(url.toString());
});
router.get("/bot/invite", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId)
        return res.status(500).send("DISCORD_CLIENT_ID não configurado.");
    const permissions = process.env.DISCORD_PERMISSIONS;
    const baseUrl = process.env.PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
    const redirectUri = new URL("/oauth/callback", baseUrl).toString();
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    if (permissions)
        url.searchParams.set("permissions", String(permissions));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("integration_type", "0");
    url.searchParams.set("scope", "bot applications.commands identify guilds");
    const isHttps = req.secure ||
        (req.headers["x-forwarded-proto"] || "")
            .toString()
            .split(",")[0]
            ?.trim() === "https" ||
        baseUrl.startsWith("https://");
    res.cookie("bot_invite", "true", {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 1000 * 60 * 15,
    });
    try {
        const next = req.query?.next;
        if (next) {
            res.cookie("panel_next", next, {
                httpOnly: true,
                sameSite: "lax",
                secure: isHttps,
                path: "/",
                maxAge: 1000 * 60 * 10,
            });
        }
    }
    catch { }
    if (process.env.NODE_ENV !== "production")
        console.log("Bot Invite Redirect:", url.toString());
    return res.redirect(url.toString());
});
router.get("/oauth/callback", async (req, res) => {
    try {
        const { cookies } = req;
        const { query } = req;
        const code = query?.code;
        const state = query?.state;
        const error = query?.error;
        const savedState = cookies?.oauth_state;
        const isBotInvite = cookies?.bot_invite === "true";
        if (process.env.NODE_ENV !== "production")
            console.log("OAuth Callback Debug:", {
                hasError: !!error,
                error,
                hasSavedState: !!savedState,
                isBotInvite,
                stateMatch: state === savedState,
                state,
                savedState,
                allCookies: Object.keys(cookies || {}),
                allQuery: Object.keys(query || {}),
                fullUrl: req.url,
            });
        if (error) {
            console.error("Discord OAuth Error:", error);
            return res.status(400).send(`Erro do Discord: ${error}`);
        }
        if (!code) {
            return res.status(400).send("Código de autorização não fornecido");
        }
        if (isBotInvite) {
            if (process.env.NODE_ENV !== "production")
                console.log("Processando convite do bot (sem validação de state)");
            res.clearCookie("bot_invite", { path: "/" });
        }
        else if (state || savedState) {
            if (!state) {
                return res.status(400).send("Parâmetro state não fornecido");
            }
            if (!savedState) {
                return res
                    .status(400)
                    .send("State salvo não encontrado (cookie pode ter expirado)");
            }
            if (state !== savedState) {
                return res
                    .status(400)
                    .send(`State não confere. Recebido: ${state}, Esperado: ${savedState}`);
            }
            res.clearCookie("oauth_state", { path: "/" });
        }
        else {
            if (process.env.NODE_ENV !== "production")
                console.log("Convite direto do Discord detectado (sem state nem cookie)");
        }
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const baseUrl = process.env.PUBLIC_BASE_URL ||
            process.env.RENDER_EXTERNAL_URL ||
            `http://localhost:${process.env.PORT || 3000}`;
        const redirectAuth = new URL("/auth/oauth/callback", baseUrl).toString();
        const redirectCompat = new URL("/oauth/callback", baseUrl).toString();
        const primaryRedirect = isBotInvite || (!state && !savedState) ? redirectCompat : redirectAuth;
        const secondaryRedirect = primaryRedirect === redirectCompat ? redirectAuth : redirectCompat;
        if (!clientId || !clientSecret)
            return res
                .status(500)
                .send("DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET não configurados");
        async function exchangeToken(redirectUriToUse, cId, cSecret, authCode) {
            const tokenData = {
                client_id: cId,
                client_secret: cSecret,
                grant_type: "authorization_code",
                code: authCode,
                redirect_uri: redirectUriToUse,
            };
            return await fetch("https://discord.com/api/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(tokenData),
            });
        }
        if (process.env.NODE_ENV !== "production")
            console.log("Token exchange: trying primary redirect_uri", primaryRedirect);
        let tokenResp = await exchangeToken(primaryRedirect, clientId, clientSecret, code);
        if (!tokenResp.ok) {
            const txt = await tokenResp.text();
            console.warn("Primary token exchange failed:", tokenResp.status, txt);
            if (tokenResp.status === 400 && /invalid_grant|redirect_uri/i.test(txt)) {
                if (process.env.NODE_ENV !== "production")
                    console.log("Token exchange: trying secondary redirect_uri", secondaryRedirect);
                tokenResp = await exchangeToken(secondaryRedirect, clientId, clientSecret, code);
            }
        }
        if (process.env.NODE_ENV !== "production")
            console.log("Discord Token Response:", {
                status: tokenResp.status,
                statusText: tokenResp.statusText,
            });
        if (!tokenResp.ok) {
            const errorText = await tokenResp.text();
            console.error("Discord Token Error (after fallback):", errorText);
            return res
                .status(401)
                .send(`Falha ao obter token do Discord: ${tokenResp.status} - ${errorText}`);
        }
        const tokenJson = (await tokenResp.json());
        const headers = {
            Authorization: `${tokenJson.token_type} ${tokenJson.access_token}`,
        };
        const meResp = await fetch("https://discord.com/api/users/@me", {
            headers,
        });
        const guildsResp = await fetch("https://discord.com/api/users/@me/guilds", {
            headers,
        });
        if (!meResp.ok || !guildsResp.ok)
            return res.status(401).send("Falha ao obter dados do Discord");
        const me = (await meResp.json());
        const guilds = (await guildsResp.json());
        const adminGuilds = guilds.filter((g) => {
            try {
                return (BigInt(g.permissions) & 0x8n) !== 0n;
            }
            catch {
                return false;
            }
        });
        const client = globalThis.barqueiroClient;
        const botGuildIds = client
            ? new Set(client.guilds.cache.map((g) => g.id))
            : new Set();
        const manageable = adminGuilds.filter((g) => botGuildIds.has(g.id));
        const memberInstalled = guilds.filter((g) => botGuildIds.has(g.id));
        const secret = process.env.PANEL_JWT_SECRET;
        if (!secret)
            return res.status(500).send("PANEL_JWT_SECRET não configurado");
        const now = Math.floor(Date.now() / 1000);
        const discordAvatar = me.avatar
            ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/0.png`;
        const payload = {
            sub: me.id,
            guilds: manageable.map((g) => ({ id: g.id, name: g.name })),
            admin: adminGuilds.map((g) => ({ id: g.id, name: g.name })),
            memberInstalled: memberInstalled.map((g) => ({ id: g.id, name: g.name })),
            username: me.username,
            avatar_url: discordAvatar,
        };
        const jwt = await new SignJWT(payload)
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt(now)
            .setExpirationTime(now + 60 * 60 * 24)
            .sign(new TextEncoder().encode(secret));
        const isHttps = req.secure ||
            (req.headers["x-forwarded-proto"] || "")
                .toString()
                .split(",")[0]
                ?.trim() === "https" ||
            String(process.env.PUBLIC_BASE_URL || "").startsWith("https://");
        res.cookie("panel_session", jwt, {
            httpOnly: true,
            sameSite: "lax",
            secure: isHttps,
            path: "/",
            maxAge: 1000 * 60 * 60 * 24,
        });
        try {
            const next = sanitizeNext(cookies?.panel_next);
            res.clearCookie("panel_next", { path: "/" });
            return res.redirect(next || "/");
        }
        catch { }
        return res.redirect("/");
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("/oauth/callback erro:", msg);
        res.status(500).send("Falha ao autenticar");
    }
});
router.post("/logout", (_req, res) => {
    res.clearCookie("panel_session", { path: "/" });
    res.clearCookie("gh_session", { path: "/" });
    res.clearCookie("gh_next", { path: "/" });
    res.clearCookie("gh_oauth_state", { path: "/" });
    res.json({ ok: true });
});
router.post("/logout", (_req, res) => {
    res.clearCookie("panel_session", { path: "/" });
    res.clearCookie("gh_session", { path: "/" });
    res.clearCookie("gh_next", { path: "/" });
    res.clearCookie("gh_oauth_state", { path: "/" });
    res.json({ ok: true });
});
export default router;
