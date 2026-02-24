-- postgres
-- Remove a linha PRAGMA foreign_keys = ON; pois é específica do SQLite
-- Tabela de XP/Ranking
CREATE TABLE
  IF NOT EXISTS xp (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_message_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, guild_id)
  );

CREATE INDEX
  IF NOT EXISTS idx_xp_guild_xp ON xp (guild_id, xp DESC);

CREATE INDEX
  IF NOT EXISTS idx_xp_guild_level ON xp (guild_id, level DESC);

-- Tabela de Cargos de Rank
CREATE TABLE
  IF NOT EXISTS rank_roles (
    id SERIAL PRIMARY KEY,
    -- SERIAL para auto-incremento no PostgreSQL
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (guild_id, level)
  );

-- Tabela de Configurações Gerais
CREATE TABLE
  IF NOT EXISTS config (
    KEY TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela de Configuração de Canais por Servidor
CREATE TABLE
  IF NOT EXISTS channel_config (
    guild_id TEXT PRIMARY KEY,
    embeds_channel TEXT,
    xp_channels TEXT,
    -- JSON array (armazenado como TEXT, como no SQLite)
    xp_ignore_channels TEXT,
    -- JSON array (armazenado como TEXT, como no SQLite)
    perfil_quiz_channel TEXT,
    squad_quiz_channel TEXT,
    admin_commands_channel TEXT,
    bot_commands_channels TEXT,
    -- JSON array (armazenado como TEXT, como no SQLite)
    level_up_channel TEXT,
    rank_channel TEXT,
    restrict_commands BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela de Quiz/Squad Configs
CREATE TABLE
  IF NOT EXISTS quiz_configs (
    guild_id TEXT PRIMARY KEY,
    questions TEXT,
    -- JSON
    results TEXT,
    -- JSON
    disclaimer TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela de Configuração do Quiz de Perfil (global)
CREATE TABLE
  IF NOT EXISTS perfil_quiz_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    -- Apenas uma configuração global
    config TEXT NOT NULL,
    -- JSON da configuração
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela de Respostas do Quiz
CREATE TABLE
  IF NOT EXISTS squad_quiz_responses (
    id SERIAL PRIMARY KEY,
    -- SERIAL para auto-incremento no PostgreSQL
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    result TEXT NOT NULL,
    answers TEXT,
    -- JSON com as respostas
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, guild_id)
  );

-- Tabela de Perfis Customizados
CREATE TABLE
  IF NOT EXISTS perfil (
    user_id TEXT PRIMARY KEY,
    bio TEXT NOT NULL,
    area TEXT NOT NULL,
    emblemas TEXT,
    -- JSON array
    badges TEXT,
    -- JSON array
    aparencia TEXT,
    -- JSON object
    created_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela de Sessões Ativas do Quiz de Perfil (memória temporária)
CREATE TABLE
  IF NOT EXISTS perfil_quiz_sessions (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    current_question INTEGER DEFAULT 0,
    answers TEXT,
    -- JSON array
    started_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    WITH
      TIME ZONE DEFAULT (CURRENT_TIMESTAMP + interval '1 hour'),
      -- Adaptação para PostgreSQL
      PRIMARY KEY (user_id, guild_id)
  );

-- Triggers para updated_at automatico
-- No PostgreSQL, é mais comum usar funções e triggers para isso.
-- A função de trigger genérica é mais eficiente.
CREATE
OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica a trigger a todas as tabelas que a tinham no SQLite
DO
  $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['xp', 'config', 'channel_config', 'quiz_configs', 'perfil', 'perfil_quiz_config']
    LOOP
        EXECUTE format('
            CREATE OR REPLACE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t);
    END LOOP;
END
$$ language 'plpgsql';

-- Limpar sessões expiradas automaticamente
-- No PostgreSQL, é melhor usar um job externo ou uma função de trigger
-- que é chamada em um INSERT, mas para manter a lógica próxima ao SQLite,
-- vamos usar uma função que pode ser chamada externamente ou adaptada.
-- Por enquanto, a limpeza será feita pelo código da aplicação ou por um job externo.
-- A trigger do SQLite para cleanup_expired_sessions não é diretamente traduzível
-- para o PostgreSQL sem usar um `AFTER INSERT` que chame uma função, o que é mais complexo.
-- Vamos confiar na lógica da aplicação para a limpeza.
