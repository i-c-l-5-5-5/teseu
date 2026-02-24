import type { ChannelConfig } from "@barqueiro/types";
import { defaultChannelConfig } from "@barqueiro/types";
import {
  getChannelConfig,
  getConfiguredChannel,
  isChannelAllowed,
  setChannelConfig,
} from "@storage/channel-config.js";
import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("channel-config storage (behavior)", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
  });
  afterEach(() => {
    closeSQLite();
    delete (process as unknown).env.DB_PATH;
  });

  it("getConfiguredChannel retorna o canal configurado para cada feature", async () => {
    const cfg: ChannelConfig = {
      guild_id: "g1",
      embeds_channel: "c-emb",
      perfil_quiz_channel: "c-pq",
      squad_quiz_channel: "c-sq",
      admin_commands_channel: "c-adm",
      level_up_channel: "c-lv",
      rank_channel: "c-rk",
      bot_commands_channels: ["c-cmd"],
      restrict_commands: true,
    };
    await setChannelConfig(cfg);

    await expect(getConfiguredChannel("g1", "embeds_channel")).resolves.toBe(
      "c-emb",
    );
    await expect(
      getConfiguredChannel("g1", "perfil_quiz_channel"),
    ).resolves.toBe("c-pq");
    await expect(
      getConfiguredChannel("g1", "squad_quiz_channel"),
    ).resolves.toBe("c-sq");
    await expect(
      getConfiguredChannel("g1", "admin_commands_channel"),
    ).resolves.toBe("c-adm");
    await expect(getConfiguredChannel("g1", "level_up_channel")).resolves.toBe(
      "c-lv",
    );
    await expect(getConfiguredChannel("g1", "rank_channel")).resolves.toBe(
      "c-rk",
    );
    await expect(getConfiguredChannel("g1", "xp_channels")).resolves.toBeNull();
  });

  it("isChannelAllowed: comandos com restrict=true e lista vazia permitem em qualquer canal", async () => {
    const cfg: ChannelConfig = {
      guild_id: "g2",
      restrict_commands: true,
      bot_commands_channels: [],
    };
    await setChannelConfig(cfg);
    await expect(
      isChannelAllowed("g2", "qualquer", "bot_commands_channels"),
    ).resolves.toBe(true);
  });

  it("isChannelAllowed: xp_ignore tem precedência sobre xp_channels", async () => {
    const cfg: ChannelConfig = {
      guild_id: "g3",
      xp_channels: ["c1", "c2"],
      xp_ignore_channels: ["c2"],
      restrict_commands: false,
    };
    await setChannelConfig(cfg);
    await expect(isChannelAllowed("g3", "c2", "xp_channels")).resolves.toBe(
      false,
    );
    await expect(isChannelAllowed("g3", "c1", "xp_channels")).resolves.toBe(
      true,
    );
  });

  it("getChannelConfig: JSON inválido cai no default via catch", async () => {
    const db = getSQLite();
    db.prepare(
      `INSERT OR REPLACE INTO channel_config (guild_id, xp_channels) VALUES (?, ?)`,
    ).run("g4", "not-json");

    const cfg = await getChannelConfig("g4");
    expect(cfg).toEqual(defaultChannelConfig("g4"));
  });

  it("isChannelAllowed: testa todos os casos de features específicas", async () => {
    const cfg: ChannelConfig = {
      guild_id: "g5",
      embeds_channel: "c-emb",
      perfil_quiz_channel: "c-pq",
      squad_quiz_channel: "c-sq",
      admin_commands_channel: "c-adm",
      level_up_channel: "c-lv",
      rank_channel: "c-rk",
      restrict_commands: false,
    };
    await setChannelConfig(cfg);

    await expect(
      isChannelAllowed("g5", "c-emb", "embeds_channel"),
    ).resolves.toBe(true);
    await expect(
      isChannelAllowed("g5", "other", "embeds_channel"),
    ).resolves.toBe(false);

    await expect(
      isChannelAllowed("g5", "c-pq", "perfil_quiz_channel"),
    ).resolves.toBe(true);
    await expect(
      isChannelAllowed("g5", "other", "perfil_quiz_channel"),
    ).resolves.toBe(false);

    await expect(
      isChannelAllowed("g5", "c-sq", "squad_quiz_channel"),
    ).resolves.toBe(true);
    await expect(
      isChannelAllowed("g5", "c-adm", "admin_commands_channel"),
    ).resolves.toBe(true);
    await expect(
      isChannelAllowed("g5", "c-lv", "level_up_channel"),
    ).resolves.toBe(true);
    await expect(isChannelAllowed("g5", "c-rk", "rank_channel")).resolves.toBe(
      true,
    );
  });

  it("isChannelAllowed: default case retorna true", async () => {
    const cfg = defaultChannelConfig("g6");
    await setChannelConfig(cfg);

    await expect(
      isChannelAllowed("g6", "any", "created_at" as unknown),
    ).resolves.toBe(true);
  });

  it("removeChannelConfig: remove todos os tipos de arrays", async () => {
    const { removeChannelConfig } = await import("@storage/channel-config.js");
    const cfg: ChannelConfig = {
      guild_id: "g7",
      xp_channels: ["c1"],
      xp_ignore_channels: ["c2"],
      bot_commands_channels: ["c3"],
      restrict_commands: false,
    };
    await setChannelConfig(cfg);

    await removeChannelConfig("g7", "xp_channels");
    await removeChannelConfig("g7", "xp_ignore_channels");
    await removeChannelConfig("g7", "bot_commands_channels");

    const result = await getChannelConfig("g7");
    expect(result.xp_channels).toEqual([]);
    expect(result.xp_ignore_channels).toEqual([]);
    expect(result.bot_commands_channels).toEqual([]);
  });
});
