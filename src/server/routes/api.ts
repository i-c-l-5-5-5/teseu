/*
SPDX-License-Identifier: MIT
*/

import type {
  PanelSession,
  PerfilQuizConfig,
  RankRole,
} from "@barqueiro/types";
import {
  getAnnouncementChannels,
  sendAnnouncement,
  validateAnnouncementChannel,
} from "@barqueiro/types";
import { requirePanelToken } from "@core/auth/middleware.js";
import {
  getCooldownRemaining,
  isInCooldown,
  setCooldown,
} from "@services/cooldown.js";
import {
  getPerfilQuizConfig,
  setPerfilQuizConfig,
} from "@storage/perfil-quiz.js";
import { getRankRoles, removeRankRole, setRankRole } from "@storage/ranks.js";
import express from "express";

import {
  getGuildQuizResults,
  getQuizConfig as getSquadQuizConfig,
  setQuizConfig as setSquadQuizConfig,
} from "@/services/quiz.js";
import { query } from "@storage/postgres.js";

/**
 * Módulo de rotas REST do painel e operações auxiliares do bot.
 * Fornece endpoints de:
 * - Saúde /status do serviço (Render health check)
 * - Informações do bot (convites e estado de conexão)
 * - Listagem de comandos registrados via Discord API
 * - Guilds onde o bot está presente e guilds acessíveis ao usuário autenticado
 * - Operações administrativas (canais, cargos, embeds, ranks, perfil quiz)
 * - Operações de membro com controle de cooldown para envio de embeds
 *
 * Segurança / Autenticação:
 * - Endpoints marcados com `requirePanelToken` dependem de sessão previamente associada em middleware
 * - Funções `isGuildAdmin` e `isGuildMember` validam escopo da sessão para proteger dados do servidor
 *
 * Erros retornados seguem um formato simples `{ error: string, ...detalhes }` para facilitar tratamento direto no frontend.
 *
 * @remarks
 * Não expõe mutações fora do escopo de guild autorizada. Valores literais relevantes (ex: cooldown) foram extraídos para constantes nomeadas.
 */

const router = express.Router();

/**
 * Cooldown (ms) para envio de embed por membros (evita spam).
 * Valor definido de forma conservadora; ajustar conforme necessidade de UX.
 */
const MEMBER_EMBED_COOLDOWN_MS = 30_000;

// Health check para Render
/**
 * Health check para plataforma (ex: Render) confirmar que o processo está respondendo.
 * Verifica também a saúde do banco de dados e do bot Discord.
 * @route GET /api/health
 * @returns 200 com status e timestamp ISO, incluindo saúde do DB e bot.
 */
router.get("/health", async (_req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "barqueiro",
    database: "unknown",
    discord: "unknown",
    uptime: process.uptime(),
  };

  // Verificar saúde do banco de dados
  try {
    await query("SELECT 1");
    health.database = "online";
  } catch (error) {
    health.database = "offline";
    health.status = "degraded";
    console.error("[Health] Erro no banco:", error);
  }

  // Verificar saúde do bot Discord
  try {
    const client = globalThis.barqueiroClient;
    if (client?.isReady()) {
      health.discord = "online";
    } else if (client) {
      health.discord = "connecting";
      health.status = "degraded";
    } else {
      health.discord = "offline";
      health.status = "degraded";
    }
  } catch (error) {
    health.discord = "error";
    health.status = "degraded";
    console.error("[Health] Erro ao verificar bot:", error);
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return res.status(statusCode).json(health);
});

/**
 * Extrai objeto de sessão do painel anexado pelo middleware de autenticação.
 * @param req Request express
 * @returns `PanelSession` ou `undefined` se não autenticado
 */
function getPanelSession(req: express.Request): PanelSession | undefined {
  return (req as unknown as { panel?: PanelSession }).panel;
}

/**
 * Verifica se a sessão tem escopo administrativo na guild.
 * Usa lista explícita de admin; cai para lista completa de guilds quando ausente.
 * @param panel Sessão do painel
 * @param guildId Guild alvo
 */
function isGuildAdmin(
  panel: PanelSession | undefined,
  guildId: string,
): boolean {
  if (!panel) return false;
  const adminList =
    panel.admin && panel.admin.length > 0 ? panel.admin : panel.guilds;
  return adminList.some((g) =>
    typeof g === "string" ? g === guildId : g.id === guildId,
  );
}

/**
 * Verifica se a sessão possui escopo de membro (instalação) na guild.
 * @param panel Sessão do painel
 * @param guildId Guild alvo
 */
function isGuildMember(
  panel: PanelSession | undefined,
  guildId: string,
): boolean {
  if (!panel) return false;
  const list =
    panel.memberInstalled && panel.memberInstalled.length > 0
      ? panel.memberInstalled
      : panel.guilds;
  return list.some((g) =>
    typeof g === "string" ? g === guildId : g.id === guildId,
  );
}

// Informações do bot para frontend
/**
 * Informações básicas do bot para o frontend montar links de convite e exibir estado.
 * @route GET /api/bot/info
 * @returns Dados de OAuth / status de conexão
 */
router.get("/bot/info", (_req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const permissions = process.env.DISCORD_PERMISSIONS; // sem default

  // Determinar URL base consistente com as rotas de auth
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  const redirectUri = new URL("/oauth/callback", baseUrl).toString();
  const inviteParams = new URLSearchParams({
    client_id: String(clientId || ""),
    response_type: "code",
    redirect_uri: redirectUri,
    integration_type: "0",
    // Escopos para instalar o bot e também autenticar o usuário para voltar logado
    scope: "bot applications.commands identify guilds",
  });
  if (permissions) inviteParams.set("permissions", String(permissions));

  const apiInviteParams = new URLSearchParams({
    client_id: String(clientId || ""),
    scope: "bot applications.commands",
  });
  if (permissions) apiInviteParams.set("permissions", String(permissions));

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

// Lista comandos disponíveis
/**
 * Lista comandos registrados no application do bot (quando online).
 * @route GET /api/commands
 */
router.get("/commands", (_req, res) => {
  try {
    const client = globalThis.barqueiroClient;
    if (!client?.isReady()) {
      return res.json({ commands: [], status: "Bot offline" });
    }

    // Buscar comandos registrados do application
    const commands =
      client.application?.commands.cache.map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        default_member_permissions:
          cmd.defaultMemberPermissions?.bitfield ?? null,
        dm_permission: cmd.dmPermission ?? null,
        options:
          cmd.options?.map((opt) => ({
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
  } catch (error) {
    console.error("Erro ao buscar comandos:", error);
    return res.json({ commands: [], status: "Error fetching commands" });
  }
});

// Lista servidores onde o bot está presente
/**
 * Lista guilds onde o bot está presente (requer sessão para consistência futura de perms).
 * @route GET /api/bot/guilds
 * @auth Painel token
 */
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
  } catch (error) {
    console.error("Erro ao buscar guilds do bot:", error);
    return res.json({ guilds: [], status: "Error fetching guilds" });
  }
});

// Lista guilds administráveis do painel a partir da sessão
/**
 * Guilds acessíveis ao usuário autenticado (admin, installed, memberInstalled), junto ao status do bot.
 * @route GET /api/painel/guilds
 * @auth Painel token
 */
router.get("/painel/guilds", requirePanelToken, (req, res) => {
  const { panel } = req as unknown as { panel?: PanelSession };
  const installed = panel?.guilds ?? [];
  const admin = panel?.admin ?? installed;
  const memberInstalled = panel?.memberInstalled ?? installed;

  // Verificar quais guilds o bot está presente
  const client = globalThis.barqueiroClient;
  let botGuilds: string[] = [];

  if (client?.isReady()) {
    botGuilds = client.guilds.cache.map((guild) => guild.id);
  }

  // Adicionar informação de presença do bot para cada guild
  const guildsWithBotStatus = installed.map((guild) => ({
    id: typeof guild === "string" ? guild : guild.id,
    name: typeof guild === "string" ? guild : guild.name,
    botPresent: botGuilds.includes(
      typeof guild === "string" ? guild : guild.id,
    ),
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

// === Painel: Quiz (admin) ===
/**
 * Obtém configuração do quiz de squads para a guild.
 * @route GET /api/quiz/:gid
 * @auth Admin da guild
 */
router.get("/quiz/:gid", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const cfg = getSquadQuizConfig(gid);
    return res.json(cfg);
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Salva configuração do quiz de squads para a guild.
 * @route POST /api/quiz/:gid
 * @auth Admin da guild
 */
router.post(
  "/quiz/:gid",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
      const panel = getPanelSession(req);
      if (!isGuildAdmin(panel, gid)) {
        return res
          .status(403)
          .json({ error: "forbidden", reason: "not_admin" });
      }
      const cfg = req.body as {
        questions?: unknown[];
        results?: unknown[];
        disclaimer?: string;
        enabled?: boolean;
      };
      const ok = setSquadQuizConfig(gid, {
        questions: Array.isArray(cfg.questions)
          ? (cfg.questions as Array<{
              text: string;
              answers: Array<{ text: string; result: string }>;
            }>)
          : [],
        results: Array.isArray(cfg.results)
          ? (cfg.results as Array<{
              key: string;
              label: string;
              role_name: string;
              description: string;
              color?: string;
            }>)
          : [],
        disclaimer: typeof cfg.disclaimer === "string" ? cfg.disclaimer : "",
        enabled: Boolean(cfg.enabled),
      });
      return res
        .status((await ok) ? 200 : 500)
        .json((await ok) ? { ok: true } : { error: "save_failed" });
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * Publica o quiz no canal indicado (mensagem inicial).
 * Implementação básica delega ao mesmo mecanismo de anúncio.
 * @route POST /api/quiz/:gid/publish
 * @auth Admin da guild
 * @body channelId
 */
router.post(
  "/quiz/:gid/publish",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
      const panel = getPanelSession(req);
      if (!isGuildAdmin(panel, gid)) {
        return res
          .status(403)
          .json({ error: "forbidden", reason: "not_admin" });
      }
      const body = (req.body || {}) as { channelId?: string };
      const channelId = (body.channelId || "").trim();
      if (!channelId) return res.status(400).json({ error: "missing_channel" });
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
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * Métricas do quiz por questão e resultado.
 * @route GET /api/quiz/:gid/metrics
 * @auth Admin da guild
 */
router.get("/quiz/:gid/metrics", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const rows = getGuildQuizResults(gid);
    const metrics: Array<{
      question_idx: number;
      result: string;
      count: number;
    }> = [];
    for (const row of await rows) {
      let answers: Array<{
        questionIndex: number;
        result: string;
        weight?: number;
      }> = [];
      try {
        answers = JSON.parse(row.answers || "[]") as Array<{
          questionIndex: number;
          result: string;
          weight?: number;
        }>;
      } catch {}
      for (const a of answers) {
        const qi = typeof a.questionIndex === "number" ? a.questionIndex : 0;
        const key = a.result || "";
        if (!key) continue;
        const found = metrics.find(
          (m) => m.question_idx === qi && m.result === key,
        );
        if (found) found.count += 1;
        else metrics.push({ question_idx: qi, result: key, count: 1 });
      }
    }
    return res.json({ metrics });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Config auxiliar de modo/canal do quiz (placeholder).
 * @route GET /api/quiz-config/:gid
 * @auth Admin da guild
 */
router.get("/quiz-config/:gid", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    // Placeholder: no persistence ainda; front usa apenas leitura
    return res.json({ channelId: null, mode: "default" });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

// === Painel: Canais do servidor (admin) ===
/**
 * Canais configurados para anúncios (admin).
 * @route GET /api/guild/:gid/channels
 * @auth Admin da guild
 */
router.get("/guild/:gid/channels", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const out = await getAnnouncementChannels(gid);
    if (!out.success)
      return res.status(500).json({ error: out.error || "failed" });
    return res.json({ channels: out.channels || [] });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

// === Painel: Listar cargos do servidor (admin) ===
/**
 * Lista cargos (roles) de uma guild (exclui managed) para configuração de ranks.
 * @route GET /api/guild/:gid/roles
 * @auth Admin da guild
 */
router.get("/guild/:gid/roles", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }

    const client = globalThis.barqueiroClient;
    if (!client?.isReady()) return res.json({ roles: [] });
    const guild = await client.guilds.fetch(gid);
    if (!guild) return res.json({ roles: [] });
    const fetched = await guild.roles.fetch();
    const roles = Array.from(fetched.values())
      .filter((r) => !r.managed)
      .map((r) => ({ id: r.id, name: r.name, color: r.color }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ roles });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

// === Painel: Enviar embed (admin) ===
/**
 * Envia um embed administrativo em canal validado.
 * @route POST /api/embed/:gid
 * @auth Admin da guild
 * @body channelId, title, description, color?, image?
 */
router.post(
  "/embed/:gid",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
      const panel = getPanelSession(req);
      if (!isGuildAdmin(panel, gid)) {
        return res
          .status(403)
          .json({ error: "forbidden", reason: "not_admin" });
      }
      const body = (req.body || {}) as {
        channelId?: string;
        title?: string;
        description?: string;
        color?: string;
        image?: string;
      };
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
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

// === Painel: Ranks (admin) ===
/**
 * Recupera configuração de Rank Roles armazenada.
 * @route GET /api/ranks/:gid
 * @auth Admin da guild
 */
router.get("/ranks/:gid", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const roles = await getRankRoles(gid);
    return res.json({ roles });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Substitui/mescla configuração de Rank Roles por nível.
 * @route POST /api/ranks/:gid
 * @auth Admin da guild
 * @body roles: RankRole[]
 */
router.post(
  "/ranks/:gid",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
      const panel = getPanelSession(req);
      if (!isGuildAdmin(panel, gid)) {
        return res
          .status(403)
          .json({ error: "forbidden", reason: "not_admin" });
      }
      const body = (req.body || {}) as { roles?: RankRole[] };
      const incoming = Array.isArray(body.roles) ? body.roles : [];
      if (incoming.length === 0)
        return res.status(400).json({ error: "empty_roles" });
      // merge por level (substitui existentes do mesmo level)
      const current = await getRankRoles(gid);
      const byLevel = new Map<number, RankRole>();
      for (const r of current) byLevel.set(r.level, r);
      for (const r of incoming) {
        if (
          typeof r.level !== "number" ||
          !Number.isFinite(r.level) ||
          typeof r.role_name !== "string" ||
          !r.role_name.trim()
        )
          continue;
        byLevel.set(Math.trunc(r.level), {
          level: Math.trunc(r.level),
          role_name: r.role_name.trim(),
        });
      }
      const merged = Array.from(byLevel.values()).sort(
        (a, b) => a.level - b.level,
      );
      // Para cada role no array merged, usar setRankRole individualmente
      for (const role of merged) {
        await setRankRole(gid, role.level, role.role_name);
      }
      return res.json({ ok: true, count: merged.length });
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

/**
 * Remove rank role de um nível específico.
 * @route DELETE /api/ranks/:gid/:level
 * @auth Admin da guild
 */
router.delete("/ranks/:gid/:level", requirePanelToken, async (req, res) => {
  try {
    const { gid, level } = req.params as { gid: string; level: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const lvl = Number(level);
    if (!Number.isFinite(lvl))
      return res.status(400).json({ error: "invalid_level" });
    await removeRankRole(gid, lvl);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

// === Membro: canais e envio de embed com cooldown ===
/**
 * Canais de anúncio acessíveis por membro (escopo instalado).
 * @route GET /api/member/:gid/channels
 * @auth Membro instalado
 */
router.get("/member/:gid/channels", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildMember(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_member" });
    }
    const out = await getAnnouncementChannels(gid);
    if (!out.success)
      return res.status(500).json({ error: out.error || "failed" });
    return res.json({ channels: out.channels || [] });
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Envia embed como membro aplicando cooldown por usuário/guild.
 * @route POST /api/member/embed/:gid
 * @auth Membro instalado
 * @body channelId, title, description, color?, image?
 * @returns 429 se em cooldown (`retry_after_ms`)
 */
router.post(
  "/member/embed/:gid",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
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
      const body = (req.body || {}) as {
        channelId?: string;
        title?: string;
        description?: string;
        color?: string;
        image?: string;
      };
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
      // Aplica cooldown configurado
      setCooldown(key, MEMBER_EMBED_COOLDOWN_MS);
      return res.json({ ok: true, messageId: out.messageId });
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

// === Perfil Quiz Config ===
/**
 * Obtém configuração do Perfil Quiz.
 * @route GET /api/perfil-quiz/:gid
 * @auth Admin da guild
 */
router.get("/perfil-quiz/:gid", requirePanelToken, async (req, res) => {
  try {
    const { gid } = req.params as { gid: string };
    const panel = getPanelSession(req);
    if (!isGuildAdmin(panel, gid)) {
      return res.status(403).json({ error: "forbidden", reason: "not_admin" });
    }
    const config = await getPerfilQuizConfig();
    return res.json(config);
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Atualiza configuração do Perfil Quiz após validação estrutural básica.
 * @route POST /api/perfil-quiz/:gid
 * @auth Admin da guild
 * @body PerfilQuizConfig
 */
router.post(
  "/perfil-quiz/:gid",
  requirePanelToken,
  express.json(),
  async (req, res) => {
    try {
      const { gid } = req.params as { gid: string };
      const panel = getPanelSession(req);
      if (!isGuildAdmin(panel, gid)) {
        return res
          .status(403)
          .json({ error: "forbidden", reason: "not_admin" });
      }
      const config = req.body as PerfilQuizConfig;
      if (
        !config ||
        typeof config !== "object" ||
        typeof config.enabled !== "boolean" ||
        !Array.isArray(config.questions) ||
        !Array.isArray(config.results)
      ) {
        return res.status(400).json({ error: "invalid_config" });
      }
      const success = await setPerfilQuizConfig(config);
      if (!success) {
        return res.status(500).json({ error: "save_failed" });
      }
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

export default router;
