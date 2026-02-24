/*
SPDX-License-Identifier: MIT
*/

import path from "node:path";

import type { PanelSession } from "@barqueiro/types";
import { requireDiscordSession } from "@core/auth/middleware.js";
import express from "express";

const router = express.Router();

// Rota raiz: redireciona para convite do bot
router.get("/", (_req, res) => {
  res.redirect("/invite");
});

// Arquivos estáticos (landing page) — sem autenticação
const publicDir = path.resolve(process.cwd(), "public");
router.use(express.static(publicDir));

// Endpoint de sessão leve (exibe apenas Discord)
router.get("/session", requireDiscordSession, (req, res) => {
  const panel = (req as unknown as { panel?: PanelSession }).panel ?? null;
  res.json({ panel });
});

// Link de convite do bot
router.get("/invite", (_req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId)
    return res.status(500).send("DISCORD_CLIENT_ID não configurado.");
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "bot applications.commands");
  // Opcional: defina DISCORD_PERMISSIONS para sugerir permissões no convite
  if (process.env.DISCORD_PERMISSIONS) {
    url.searchParams.set(
      "permissions",
      String(process.env.DISCORD_PERMISSIONS),
    );
  }
  // Encaminha guild_id/disable_guild_select se vierem na query para pré-selecionar servidor
  // Ex.: /invite?guild_id=123&disable_guild_select=1
  try {
    const reqAny = _req as unknown as { query?: Record<string, string> };
    const q = reqAny.query ?? {};
    if (q.guild_id) url.searchParams.set("guild_id", q.guild_id);
    if (q.disable_guild_select)
      url.searchParams.set("disable_guild_select", q.disable_guild_select);
  } catch {}
  return res.redirect(url.toString());
});

// Debug simples do OAuth (sem expor segredos)
router.get("/debug/oauth", requireDiscordSession, (_req, res) => {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = new URL(
      "/auth/oauth/callback",
      process.env.PUBLIC_BASE_URL ??
        process.env.RENDER_EXTERNAL_URL ??
        "http://localhost:3000",
    ).toString();
    const html = `<!doctype html>
      <html><head><meta charset="utf-8"><title>Debug OAuth</title></head><body>
      <h1>Configuração OAuth</h1>
      <h2>Discord</h2>
      <p><strong>Client ID:</strong> ${clientId || "❌ não configurado"}</p>
      <p><strong>Redirect URI:</strong> ${redirectUri}</p>
      <p><a href="/">← Voltar</a></p>
      </body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).send(`Erro: ${msg}`);
  }
});

// Rota de compatibilidade: redireciona /oauth/callback para /auth/oauth/callback
router.get("/oauth/callback", (req, res) => {
  const queryString =
    Object.keys(req.query).length > 0
      ? `?${new URLSearchParams(
          req.query as Record<string, string>,
        ).toString()}`
      : "";
  res.redirect(`/auth/oauth/callback${queryString}`);
});

export default router;
