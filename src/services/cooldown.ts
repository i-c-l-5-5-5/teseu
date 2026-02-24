/*
SPDX-License-Identifier: MIT
*/
import type { CooldownEntry } from "@barqueiro/types";

/**
 * Intervalo (ms) entre limpezas automáticas de cooldown expirado.
 * Extraído para evitar magic-constant e facilitar ajuste futuro.
 */
const COOLDOWN_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Mapa global de cooldowns por chave (ex: `userId:action`).
 * @remarks
 * Estrutura simples; para grande escala considerar bucket ou TTL heap.
 */
const cooldowns = new Map<string, CooldownEntry>();

/**
 * Retorna true se entrada ainda está em cooldown; remove se expirado.
 * @param key Chave composta (ex: `${userId}:${acao}`)
 */
export function isInCooldown(key: string): boolean {
  const entry = cooldowns.get(key);
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.lastUsed >= entry.duration) {
    cooldowns.delete(key);
    return false;
  }

  return true;
}

/**
 * Registra/atualiza cooldown em milissegundos.
 * @param key Chave única
 * @param duration Duração em ms
 */
export function setCooldown(key: string, duration: number): void {
  cooldowns.set(key, {
    lastUsed: Date.now(),
    duration,
  });
}

/**
 * Retorna segundos restantes arredondados para cima.
 * @param key Chave do cooldown
 */
export function getCooldownRemaining(key: string): number {
  const entry = cooldowns.get(key);
  if (!entry) return 0;

  const now = Date.now();
  const remaining = entry.duration - (now - entry.lastUsed);
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Remove manualmente uma entrada de cooldown.
 */
export function clearCooldown(key: string): void {
  cooldowns.delete(key);
}

/**
 * Limpa entradas expiradas (housekeeping periódica).
 */
export function cleanupExpiredCooldowns(): void {
  const now = Date.now();
  for (const [key, entry] of cooldowns.entries()) {
    if (now - entry.lastUsed >= entry.duration) {
      cooldowns.delete(key);
    }
  }
}

// Agendamento periódico da limpeza
setInterval(cleanupExpiredCooldowns, COOLDOWN_CLEANUP_INTERVAL_MS);
