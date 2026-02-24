// SPDX-License-Identifier: MIT
import type { PanelSession, RequestWithNext } from "@barqueiro/types";
import crypto from "crypto";
import type { Request, Response } from "express";
import express from "express";
import { SignJWT } from "jose";

// Tipo RequestWithNext movido para src/tipos (index.ts)

const router = express.Router();

// Sanitização do parâmetro 'next' para evitar open redirect
function sanitizeNext(input?: string | null): string {
  if (!input || typeof input !== "string") return "/";
  try {
    const url = new URL(input, "http://localhost");
    if (url.pathname.startsWith("/")) return url.pathname;
  } catch {}
  return "/";
}

// Login com Discord OAuth2 (scopes: identify, guilds)
router.get("/login", (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId)
    return res.status(500).send("DISCORD_CLIENT_ID não configurado.");

  // Determinar URL base para redirect URI
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  const state = crypto.randomUUID();
  const redirectUri = new URL("/auth/oauth/callback", baseUrl).toString();
  const isHttps =
    req.secure ||
    (req.headers["x-forwarded-proto"] || "")
      .toString()
      .split(",")[0]
      ?.trim() === "https" ||
    baseUrl.startsWith("https://");

  // Debug logs
  if (process.env.NODE_ENV !== "production")
    console.log("OAuth Login Debug:", {
      state,
      isHttps,
      redirectUri,
      baseUrl,
      clientId: `${clientId?.substring(0, 8)}...`,
    });

  // Preserva o 'next' via cookie para usar após redirect
  const next = (req as RequestWithNext).query?.next;
  if (next) {
    res.cookie("panel_next", next, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 1000 * 60 * 10, // 10 min
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
    maxAge: 1000 * 60 * 15, // 15 min (aumentei de 10 para 15)
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

// Rota específica para convite do bot (sem necessidade de state)
router.get("/bot/invite", (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId)
    return res.status(500).send("DISCORD_CLIENT_ID não configurado.");

  const permissions = process.env.DISCORD_PERMISSIONS; // usar somente env, sem default

  // Determinar URL base para redirect URI
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  // Usar /oauth/callback (não /auth/oauth/callback) para compatibilidade com Discord
  const redirectUri = new URL("/oauth/callback", baseUrl).toString();

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  if (permissions) url.searchParams.set("permissions", String(permissions));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("integration_type", "0");
  // Incluir escopos de usuário para voltar logado (identify, guilds) além do bot
  // e permitir instalação de comandos (applications.commands)
  url.searchParams.set("scope", "bot applications.commands identify guilds");

  // Marcar como convite do bot no cookie
  const isHttps =
    req.secure ||
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

  // Preservar 'next' para redirecionar após o callback
  try {
    const next = (req as unknown as { query?: { next?: string } }).query?.next;
    if (next) {
      res.cookie("panel_next", next, {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 1000 * 60 * 10,
      });
    }
  } catch {}

  if (process.env.NODE_ENV !== "production")
    console.log("Bot Invite Redirect:", url.toString());
  return res.redirect(url.toString());
});

// Callback do Discord OAuth2
router.get("/oauth/callback", async (req: Request, res: Response) => {
  try {
    const { cookies } = req as unknown as { cookies?: Record<string, string> };
    const { query } = req as unknown as { query?: Record<string, string> };
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

    // Verificar se houve erro do Discord
    if (error) {
      console.error("Discord OAuth Error:", error);
      return res.status(400).send(`Erro do Discord: ${error}`);
    }

    if (!code) {
      return res.status(400).send("Código de autorização não fornecido");
    }

    // Se é convite do bot, não validar state
    if (isBotInvite) {
      if (process.env.NODE_ENV !== "production")
        console.log("Processando convite do bot (sem validação de state)");
      res.clearCookie("bot_invite", { path: "/" });
    } else if (state || savedState) {
      // Se há state OU savedState, fazer validação completa
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
          .send(
            `State não confere. Recebido: ${state}, Esperado: ${savedState}`,
          );
      }

      res.clearCookie("oauth_state", { path: "/" });
    } else {
      // Se não há state NEM savedState, assumir que é um convite direto do Discord
      if (process.env.NODE_ENV !== "production")
        console.log(
          "Convite direto do Discord detectado (sem state nem cookie)",
        );
    }
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    // Determinar URL base para redirect URI (deve ser igual ao usado no login/bot invite)
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${process.env.PORT || 3000}`;

    // Para o callback, determinar qual redirect_uri foi usado baseado no tipo de convite
    const redirectAuth = new URL("/auth/oauth/callback", baseUrl).toString();
    const redirectCompat = new URL("/oauth/callback", baseUrl).toString();
    const primaryRedirect =
      isBotInvite || (!state && !savedState) ? redirectCompat : redirectAuth;
    const secondaryRedirect =
      primaryRedirect === redirectCompat ? redirectAuth : redirectCompat;

    if (!clientId || !clientSecret)
      return res
        .status(500)
        .send("DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET não configurados");

    // Preparar dados para requisição do token (com fallback)
    async function exchangeToken(
      redirectUriToUse: string,
      cId: string,
      cSecret: string,
      authCode: string,
    ) {
      const tokenData = {
        client_id: cId,
        client_secret: cSecret,
        grant_type: "authorization_code" as const,
        code: authCode,
        redirect_uri: redirectUriToUse,
      } as const;
      return await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          tokenData as unknown as Record<string, string>,
        ),
      });
    }

    if (process.env.NODE_ENV !== "production")
      console.log(
        "Token exchange: trying primary redirect_uri",
        primaryRedirect,
      );
    let tokenResp = await exchangeToken(
      primaryRedirect,
      clientId,
      clientSecret,
      code,
    );

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.warn("Primary token exchange failed:", tokenResp.status, txt);
      // Se 400 e mensagem de invalid redirect, tentar fallback
      if (tokenResp.status === 400 && /invalid_grant|redirect_uri/i.test(txt)) {
        if (process.env.NODE_ENV !== "production")
          console.log(
            "Token exchange: trying secondary redirect_uri",
            secondaryRedirect,
          );
        tokenResp = await exchangeToken(
          secondaryRedirect,
          clientId,
          clientSecret,
          code,
        );
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
        .send(
          `Falha ao obter token do Discord: ${tokenResp.status} - ${errorText}`,
        );
    }

    const tokenJson = (await tokenResp.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
    };
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
    const me = (await meResp.json()) as {
      id: string;
      username: string;
      discriminator?: string;
      avatar?: string | null;
    };
    const guilds = (await guildsResp.json()) as Array<{
      id: string;
      name: string;
      owner: boolean;
      permissions: string;
    }>;
    // Admin (bit ADMINISTRATOR 0x8)
    const adminGuilds = guilds.filter((g) => {
      try {
        return (BigInt(g.permissions) & 0x8n) !== 0n;
      } catch {
        return false;
      }
    });
    // Interseção com guilds onde o bot está
    const client = globalThis.barqueiroClient;
    const botGuildIds = client
      ? new Set(client.guilds.cache.map((g) => g.id))
      : new Set<string>();
    const manageable = adminGuilds.filter((g) => botGuildIds.has(g.id));
    const memberInstalled = guilds.filter((g) => botGuildIds.has(g.id));

    const secret = process.env.PANEL_JWT_SECRET;
    if (!secret)
      return res.status(500).send("PANEL_JWT_SECRET não configurado");
    const now = Math.floor(Date.now() / 1000);
    // guilds: mantém compatibilidade (lista instaladas). admin: todas onde usuário é admin.
    // Monta avatar do Discord
    const discordAvatar = me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const payload: PanelSession = {
      sub: me.id,
      guilds: manageable.map((g) => ({ id: g.id, name: g.name })),
      admin: adminGuilds.map((g) => ({ id: g.id, name: g.name })),
      memberInstalled: memberInstalled.map((g) => ({ id: g.id, name: g.name })),
      username: me.username,
      avatar_url: discordAvatar,
    };
    const jwt = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 60 * 60 * 24)
      .sign(new TextEncoder().encode(secret));
    const isHttps =
      req.secure ||
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
    } catch {}
    return res.redirect("/");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("/oauth/callback erro:", msg);
    res.status(500).send("Falha ao autenticar");
  }
});

// Logout limpa cookie de sessão
router.post("/logout", (_req, res) => {
  res.clearCookie("panel_session", { path: "/" });
  res.clearCookie("gh_session", { path: "/" });
  res.clearCookie("gh_next", { path: "/" });
  res.clearCookie("gh_oauth_state", { path: "/" });
  res.json({ ok: true });
});

// Logout limpa cookie de sessão
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("panel_session", { path: "/" });
  res.clearCookie("gh_session", { path: "/" });
  res.clearCookie("gh_next", { path: "/" });
  res.clearCookie("gh_oauth_state", { path: "/" });
  res.json({ ok: true });
});

export default router;
