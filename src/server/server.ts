/*
SPDX-License-Identifier: MIT
*/
import "dotenv/config";

import path from "node:path";

// Importar rotas modulares
import apiRoutes from "@server/routes/api.js";
import pageRoutes from "@server/routes/pages.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { startKeepAlive } from "./keepalive.js";

// Express app
const app = express();

// Security headers with helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve("public")));

// ==== USAR ROTAS MODULARES ====
app.use("/api", apiRoutes);

// Rota adicional para callback duplo (compatibilidade)
app.get("/auth/oauth/callback", (req, res) => {
  // Redirecionar para a rota correta
  const query = req.url?.split("?")[1] || "";
  const queryString = query ? `?${query}` : "";
  const redirectUrl = `/auth/oauth/callback${queryString}`;
  res.redirect(redirectUrl);
});

app.use("/", pageRoutes);

// ==== INICIALIZAÇÃO ====
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;

const server = app.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production")
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// ==== KEEP-ALIVE PARA EVITAR HIBERNAÇÃO ====
// Calcula a URL base pública e inicia um ping periódico
const baseUrl =
  process.env.PUBLIC_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 3000}`;
const keepAliveInterval = process.env.KEEPALIVE_INTERVAL_MS
  ? Number.parseInt(process.env.KEEPALIVE_INTERVAL_MS)
  : 2 * 60 * 1000; // padrão: 2 minutos (mais agressivo para evitar hibernação)
const stopKeepAlive = startKeepAlive(baseUrl, keepAliveInterval);
export { server, stopKeepAlive };
export default app;
