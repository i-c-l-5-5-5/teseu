/*
SPDX-License-Identifier: MIT
*/
import type { PanelSession } from "@barqueiro/types";
import type express from "express";
import { jwtVerify } from "jose";

/**
 * Middleware de autenticação do painel.
 * Responsabilidades principais:
 * - Validar cookie JWT `panel_session` (sessão Discord) e anexar objeto `panel` em `req`
 * - Fornecer fallback legível (HTML) quando o usuário acessa páginas sem sessão
 * - Proteger rotas da API retornando JSON padronizado (error: auth_required)
 * - Fallback legado por header estático `x-panel-token` (mantido apenas para transição)
 *
 * @remarks
 * O fallback por header será removido futuramente; preferir sempre cookie JWT.
 * Mantemos constantes extraídas (ex: cor de marca) para reduzir magic-constants.
 */

/**
 * Cor de marca do Discord usada em botões de login.
 * @see https://discord.com/brand-new
 */
const DISCORD_BRAND_COLOR = "#5865F2";

/**
 * Exige sessão Discord (cookie JWT). Se ausente:
 * - Retorna JSON 401 em chamadas de API
 * - Renderiza página de login com link Discord em acessos HTML
 *
 * Não invalida explicitamente tokens expirados; simplesmente força relogar.
 * @param req Express Request
 * @param res Express Response
 * @param next Próximo middleware
 */
export async function requireDiscordSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  try {
    const { cookies } = req as unknown as { cookies?: Record<string, string> };
    const secret = process.env.PANEL_JWT_SECRET;
    if (!secret) throw new Error("sem token");

    // Discord (painel)
    const panelToken = cookies?.panel_session;
    if (panelToken) {
      try {
        const { payload } = await jwtVerify(
          panelToken,
          new TextEncoder().encode(secret),
        );
        (req as unknown as { panel?: PanelSession }).panel =
          payload as unknown as PanelSession;
        return next();
      } catch {}
    }

    // Sem sessão válida: renderiza página de login Discord e preserva 'next'
    const base =
      process.env.PUBLIC_BASE_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      "http://localhost:3000";
    const nextUrl = encodeURIComponent(req.originalUrl || "/");
    const loginDiscord = `${new URL("/auth/login", base).toString()}?next=${nextUrl}`;
    const accept = (req.headers.accept || "").toString();
    const isApi = req.path.startsWith("/api/");

    if (isApi || accept.includes("application/json")) {
      res
        .status(401)
        .json({ error: "auth_required", login_discord: loginDiscord });
      return;
    }

    const html = generateLoginPage(loginDiscord);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(401).send(html);
  } catch {
    // Fallback em caso de erro inesperado
    const base =
      process.env.PUBLIC_BASE_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      "http://localhost:3000";
    const nextUrl = encodeURIComponent(req.originalUrl || "/");
    const loginDiscord = `${new URL("/auth/login", base).toString()}?next=${nextUrl}`;
    const accept = (req.headers.accept || "").toString();
    const isApi = req.path.startsWith("/api/");

    if (isApi || accept.includes("application/json")) {
      res
        .status(401)
        .json({ error: "auth_required", login_discord: loginDiscord });
      return;
    }

    const html = generateLoginPage(loginDiscord);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(401).send(html);
  }
}

/**
 * Middleware para rotas protegidas do painel (inclui admin/member).
 * Fluxo:
 * 1. Tenta validar sessão Discord (reutilizando requireDiscordSession)
 * 2. Se cookie JWT válido, segue
 * 3. Caso contrário tenta fallback legado por header `x-panel-token` comparado a `PANEL_TOKEN`
 * 4. Se falhar, 401 JSON
 *
 * @deprecated Fallback por header será removido; usar sempre cookie JWT.
 */
export async function requirePanelToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  // Antes de tudo, exigir sessão Discord
  try {
    await requireDiscordSession(req, res, () => {});
    if (res.headersSent) return; // já redirecionado/negado
  } catch {}

  // 1) Sessão via cookie JWT (recomendada)
  try {
    const { cookies } = req as unknown as { cookies?: Record<string, string> };
    const token = cookies?.panel_session;
    const secret = process.env.PANEL_JWT_SECRET;
    if (token && secret) {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      (req as unknown as { panel?: PanelSession }).panel =
        payload as unknown as PanelSession;
      return next();
    }
  } catch {
    // Se inválido/expirado, cai no fallback
  }

  // 2) Fallback legado: header estático
  const expected = process.env.PANEL_TOKEN;
  const got = req.header("x-panel-token");
  if (!expected || got !== expected) {
    res.status(401).json({ error: "Não autorizado. Faça login em /login." });
    return;
  }
  return next();
}

/**
 * Gera página de login mínima com botão Discord.
 * @param loginDiscord URL de login gerada pelo fluxo OAuth
 * @returns HTML completo (inline CSS sem dependências externas)
 */
function generateLoginPage(loginDiscord: string): string {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Entrar — Barqueiro</title>
        <style>
          :root{color-scheme:light dark}
          body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
          .card{border:1px solid #ddd;border-radius:12px;padding:24px;max-width:560px;margin:16px}
          h1{font-size:1.25rem;margin:0 0 8px}
          p{margin:0 0 12px;line-height:1.4}
          .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
          .btn{appearance:none;border:1px solid rgba(27,31,36,.15);border-radius:6px;padding:10px 16px;background:${DISCORD_BRAND_COLOR};color:white;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px;box-shadow:rgba(27,31,36,.1) 0 1px 0}
          .btn:hover{filter:brightness(0.95)}
          .sub{font-size:.9rem;color:#666}
        </style>
      </head>
      <body>
        <main class="card">
          <h1>Entrar</h1>
          <p>Para acessar o site e o painel, entre com sua conta do Discord.</p>
          <p class="row">
            <a class="btn" href="${loginDiscord}" rel="noreferrer noopener">Continuar com Discord</a>
          </p>
          <p class="sub"><a class="sub" href="/debug/oauth" rel="noreferrer noopener">Precisa de ajuda? Verificar configuração do OAuth</a></p>
        </main>
      </body>
    </html>`;
}
