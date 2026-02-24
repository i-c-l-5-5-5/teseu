import type { ChannelConfig } from "@barqueiro/types";
import {
  getChannelConfig,
  isChannelAllowed,
  removeChannelConfig,
  setChannelConfig,
} from "@storage/channel-config.js";
import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Channel Config Storage", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
  });

  afterEach(() => {
    closeSQLite();
    delete process.env.DB_PATH;
  });

  describe("getChannelConfig", () => {
    it("deve retornar configuração padrão para guild nova", async () => {
      const config = await getChannelConfig("guild-new");

      expect(config.guild_id).toBe("guild-new");
      expect(config.xp_channels).toEqual([]);
      expect(config.bot_commands_channels).toEqual([]);
    });

    it("deve retornar configuração existente", async () => {
      const testConfig: ChannelConfig = {
        guild_id: "guild-123",
        embeds_channel: "channel-embeds",
        xp_channels: ["channel-1", "channel-2"],
        xp_ignore_channels: ["channel-ignore"],
        perfil_quiz_channel: "channel-quiz",
        bot_commands_channels: ["channel-cmd"],
        restrict_commands: true,
      };

      await setChannelConfig(testConfig);
      const retrieved = await getChannelConfig("guild-123");

      expect(retrieved.guild_id).toBe("guild-123");
      expect(retrieved.embeds_channel).toBe("channel-embeds");
      expect(retrieved.xp_channels).toEqual(["channel-1", "channel-2"]);
      expect(retrieved.restrict_commands).toBe(true);
    });
  });

  describe("setChannelConfig", () => {
    it("deve salvar configuração completa", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-save",
        embeds_channel: "embeds-123",
        xp_channels: ["xp-1", "xp-2"],
        xp_ignore_channels: ["ignore-1"],
        perfil_quiz_channel: "quiz-123",
        squad_quiz_channel: "squad-123",
        admin_commands_channel: "admin-123",
        bot_commands_channels: ["bot-1", "bot-2"],
        level_up_channel: "levelup-123",
        rank_channel: "rank-123",
        restrict_commands: false,
      };

      const success = await setChannelConfig(config);
      expect(success).toBe(true);

      const retrieved = await getChannelConfig("guild-save");
      expect(retrieved.embeds_channel).toBe("embeds-123");
      expect(retrieved.xp_channels).toEqual(["xp-1", "xp-2"]);
    });

    it("deve substituir configuração existente", async () => {
      const config1: ChannelConfig = {
        guild_id: "guild-replace",
        embeds_channel: "old-channel",
        restrict_commands: false,
      };

      const config2: ChannelConfig = {
        guild_id: "guild-replace",
        embeds_channel: "new-channel",
        restrict_commands: false,
      };

      await setChannelConfig(config1);
      await setChannelConfig(config2);

      const retrieved = await getChannelConfig("guild-replace");
      expect(retrieved.embeds_channel).toBe("new-channel");
    });
  });

  describe("removeChannelConfig", () => {
    it("deve remover configuração específica", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-remove",
        embeds_channel: "embeds-123",
        xp_channels: ["xp-1"],
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const removed = await removeChannelConfig(
        "guild-remove",
        "embeds_channel",
      );

      expect(removed).toBe(true);

      const retrieved = await getChannelConfig("guild-remove");
      expect(retrieved.embeds_channel).toBeUndefined();
      expect(retrieved.xp_channels).toEqual(["xp-1"]);
    });
  });

  describe("isChannelAllowed", () => {
    it("deve permitir quando lista vazia (sem restrição)", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-allow",
        xp_channels: [],
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const allowed = await isChannelAllowed(
        "guild-allow",
        "any-channel",
        "xp_channels",
      );

      expect(allowed).toBe(true);
    });

    it("deve permitir canal na whitelist", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-whitelist",
        xp_channels: ["channel-1", "channel-2"],
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const allowed = await isChannelAllowed(
        "guild-whitelist",
        "channel-1",
        "xp_channels",
      );

      expect(allowed).toBe(true);
    });

    it("deve bloquear canal não listado", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-blacklist",
        xp_channels: ["channel-1"],
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const allowed = await isChannelAllowed(
        "guild-blacklist",
        "channel-2",
        "xp_channels",
      );

      expect(allowed).toBe(false);
    });

    it("deve validar diferentes tipos de canais", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-multi",
        bot_commands_channels: ["cmd-1", "cmd-2"],
        xp_channels: ["xp-1"],
      };

      await setChannelConfig(config);

      const cmdAllowed = await isChannelAllowed(
        "guild-multi",
        "cmd-1",
        "bot_commands_channels",
      );
      const xpAllowed = await isChannelAllowed(
        "guild-multi",
        "xp-1",
        "xp_channels",
      );

      expect(cmdAllowed).toBe(true);
      expect(xpAllowed).toBe(true);
    });
  });

  describe("Edge Cases e Validações", () => {
    it("deve lidar com arrays undefined", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-undefined",
        embeds_channel: "embeds-123",
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const retrieved = await getChannelConfig("guild-undefined");

      expect(retrieved.xp_channels).toEqual([]);
      expect(retrieved.bot_commands_channels).toEqual([]);
    });

    it("deve preservar arrays vazios", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-empty-arrays",
        xp_channels: [],
        bot_commands_channels: [],
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const retrieved = await getChannelConfig("guild-empty-arrays");

      expect(retrieved.xp_channels).toEqual([]);
      expect(retrieved.bot_commands_channels).toEqual([]);
    });

    it("deve lidar com muitos canais na lista", async () => {
      const manyChannels = Array.from({ length: 50 }, (_, i) => `channel-${i}`);
      const config: ChannelConfig = {
        guild_id: "guild-many",
        xp_channels: manyChannels,
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const retrieved = await getChannelConfig("guild-many");

      expect(retrieved.xp_channels).toEqual(manyChannels);
      expect(retrieved.xp_channels?.length).toBe(50);
    });

    it("deve serializar e deserializar JSON corretamente", async () => {
      const complexConfig: ChannelConfig = {
        guild_id: "guild-json",
        xp_channels: ["ch-1", "ch-2", "ch-3"],
        xp_ignore_channels: ["ignore-1"],
        bot_commands_channels: ["cmd-1", "cmd-2"],
        restrict_commands: true,
      };

      await setChannelConfig(complexConfig);
      const retrieved = await getChannelConfig("guild-json");

      expect(JSON.stringify(retrieved.xp_channels)).toBe(
        JSON.stringify(complexConfig.xp_channels),
      );
      expect(retrieved.restrict_commands).toBe(true);
    });

    it("deve remover campo inexistente sem erro", async () => {
      const config: ChannelConfig = {
        guild_id: "guild-no-field",
        embeds_channel: "embeds-123",
        restrict_commands: false,
      };

      await setChannelConfig(config);
      const removed = await removeChannelConfig(
        "guild-no-field",
        "nonexistent_field" as unknown,
      );

      expect(typeof removed).toBe("boolean");
    });

    it("deve manter integridade ao atualizar parcialmente", async () => {
      const initial: ChannelConfig = {
        guild_id: "guild-partial",
        embeds_channel: "embeds-1",
        xp_channels: ["xp-1", "xp-2"],
        restrict_commands: false,
      };

      await setChannelConfig(initial);

      const partial: ChannelConfig = {
        guild_id: "guild-partial",
        embeds_channel: "embeds-2",
        restrict_commands: false,
      };

      await setChannelConfig(partial);
      const retrieved = await getChannelConfig("guild-partial");

      expect(retrieved.embeds_channel).toBe("embeds-2");
    });
  });
});
