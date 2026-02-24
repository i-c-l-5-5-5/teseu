export function startKeepAlive(baseUrl, intervalMs) {
    const enabledEnv = String(process.env.KEEPALIVE_ENABLED ?? "true").toLowerCase();
    const enabled = enabledEnv !== "false" && enabledEnv !== "0";
    if (!enabled)
        return () => { };
    const url = new URL("/", baseUrl).toString();
    if (process.env.NODE_ENV !== "production") {
        console.log(`[keepalive] habilitado: url=${url} intervalo=${intervalMs}ms`);
    }
    const timer = setInterval(async () => {
        try {
            const response = await fetch(url, { method: "GET", cache: "no-store" });
            if (!response.ok) {
                console.warn(`[keepalive] resposta não-OK (${response.status}) de ${url}`);
            }
            else if (process.env.NODE_ENV !== "production") {
                console.log(`[keepalive] ping OK: ${url}`);
            }
        }
        catch (error) {
            console.warn(`[keepalive] falha ao pingar ${url}:`, error.message);
        }
    }, intervalMs);
    return () => clearInterval(timer);
}
