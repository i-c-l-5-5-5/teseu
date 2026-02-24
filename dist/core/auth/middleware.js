import { jwtVerify } from "jose";
const DISCORD_BRAND_COLOR = "#5865F2";
export async function requireDiscordSession(req, res, next) {
    try {
        const { cookies } = req;
        const secret = process.env.PANEL_JWT_SECRET;
        if (!secret)
            throw new Error("sem token");
        const panelToken = cookies?.panel_session;
        if (panelToken) {
            try {
                const { payload } = await jwtVerify(panelToken, new TextEncoder().encode(secret));
                req.panel =
                    payload;
                return next();
            }
            catch { }
        }
        const base = process.env.PUBLIC_BASE_URL ??
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
    catch {
        const base = process.env.PUBLIC_BASE_URL ??
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
export async function requirePanelToken(req, res, next) {
    try {
        await requireDiscordSession(req, res, () => { });
        if (res.headersSent)
            return;
    }
    catch { }
    try {
        const { cookies } = req;
        const token = cookies?.panel_session;
        const secret = process.env.PANEL_JWT_SECRET;
        if (token && secret) {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
            req.panel =
                payload;
            return next();
        }
    }
    catch {
    }
    const expected = process.env.PANEL_TOKEN;
    const got = req.header("x-panel-token");
    if (!expected || got !== expected) {
        res.status(401).json({ error: "Não autorizado. Faça login em /login." });
        return;
    }
    return next();
}
function generateLoginPage(loginDiscord) {
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
