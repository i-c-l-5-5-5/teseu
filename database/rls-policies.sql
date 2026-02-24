-- Row Level Security (RLS) Policies para Supabase/PostgreSQL
-- Estas políticas garantem segurança adicional no acesso aos dados
-- Desabilitar RLS temporariamente para configuração (será reabilitado ao final)
-- Nota: Em produção, estas políticas devem ser aplicadas por um usuário com privilégios adequados
-- =====================================================
-- TABELA: xp
-- =====================================================
-- Permite leitura pública (para leaderboards e rankings)
-- Permite escrita apenas pelo service role (backend do bot)
ALTER TABLE
  xp ENABLE ROW LEVEL SECURITY;

-- Política de leitura: qualquer um pode ler dados de XP
CREATE POLICY
  "Permitir leitura pública de XP" ON xp FOR
SELECT
  USING (true);

-- Política de inserção/atualização: apenas service role
CREATE POLICY
  "Permitir escrita de XP pelo service role" ON xp FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: rank_roles
-- =====================================================
ALTER TABLE
  rank_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir leitura pública de rank_roles" ON rank_roles FOR
SELECT
  USING (true);

CREATE POLICY
  "Permitir escrita de rank_roles pelo service role" ON rank_roles FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: config
-- =====================================================
-- Configurações devem ser acessíveis apenas pelo backend
ALTER TABLE
  config ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir acesso total à config pelo service role" ON config FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: channel_config
-- =====================================================
ALTER TABLE
  channel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir leitura pública de channel_config" ON channel_config FOR
SELECT
  USING (true);

CREATE POLICY
  "Permitir escrita de channel_config pelo service role" ON channel_config FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: quiz_configs
-- =====================================================
ALTER TABLE
  quiz_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir leitura pública de quiz_configs" ON quiz_configs FOR
SELECT
  USING (true);

CREATE POLICY
  "Permitir escrita de quiz_configs pelo service role" ON quiz_configs FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: perfil_quiz_config
-- =====================================================
ALTER TABLE
  perfil_quiz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir leitura pública de perfil_quiz_config" ON perfil_quiz_config FOR
SELECT
  USING (true);

CREATE POLICY
  "Permitir escrita de perfil_quiz_config pelo service role" ON perfil_quiz_config FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: squad_quiz_responses
-- =====================================================
-- Respostas devem ser privadas, mas o service role precisa de acesso total
ALTER TABLE
  squad_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir acesso total a squad_quiz_responses pelo service role" ON squad_quiz_responses FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: perfil
-- =====================================================
-- Perfis podem ser lidos por todos, mas escritos apenas pelo service role
ALTER TABLE
  perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir leitura pública de perfil" ON perfil FOR
SELECT
  USING (true);

CREATE POLICY
  "Permitir escrita de perfil pelo service role" ON perfil FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABELA: perfil_quiz_sessions
-- =====================================================
-- Sessões são temporárias e devem ser acessíveis apenas pelo service role
ALTER TABLE
  perfil_quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY
  "Permitir acesso total a perfil_quiz_sessions pelo service role" ON perfil_quiz_sessions FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- GRANTS adicionais para o usuário postgres
-- =====================================================
-- Garante que o usuário postgres (usado pela connection string) tenha acesso total
GRANT
  ALL ON ALL TABLES IN SCHEMA public TO postgres;

GRANT
  ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

GRANT
  USAGE ON SCHEMA public TO postgres;

-- =====================================================
-- Função auxiliar para bypass de RLS em queries administrativas
-- =====================================================
-- Esta função pode ser usada pelo backend para operações que precisam
-- ignorar RLS temporariamente (usar com cautela)
CREATE
OR REPLACE FUNCTION bypass_rls() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Esta função existe apenas como placeholder
  -- Em produção, configurar permissões adequadas via Supabase Dashboard
  RAISE NOTICE 'RLS bypass function called';
END;
$$;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT
  ON POLICY "Permitir leitura pública de XP" ON xp IS 'Permite que qualquer usuário leia dados de XP para exibição de rankings e leaderboards';

COMMENT
  ON POLICY "Permitir escrita de XP pelo service role" ON xp IS 'Apenas o backend do bot (service_role) pode inserir/atualizar dados de XP';

COMMENT
  ON TABLE xp IS 'Tabela de experiência e níveis dos usuários. Leitura pública, escrita restrita ao backend';

COMMENT
  ON TABLE config IS 'Configurações sensíveis do sistema. Acesso restrito apenas ao backend';

COMMENT
  ON TABLE squad_quiz_responses IS 'Respostas dos quizzes dos usuários. Dados privados, acesso apenas pelo backend';
