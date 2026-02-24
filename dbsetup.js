#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * dbsetup.js - Script de inicialização para Fly.io
 *
 * Este arquivo existe apenas para compatibilidade com configurações antigas do Fly.io.
 * A inicialização real do banco de dados é feita no código TypeScript em src/storage/
 */

console.log("[dbsetup.js] Script de compatibilidade executado");
console.log(
  "[dbsetup.js] A inicialização do banco será feita pelo código principal",
);

// Não faz nada, apenas sai com sucesso
process.exit(0);
