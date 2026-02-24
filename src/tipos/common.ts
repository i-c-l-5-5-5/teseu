/*
SPDX-License-Identifier: MIT
*/

/**
 * Timeout padrão para modals do Discord (5 minutos)
 */
export const MODAL_TIMEOUT_MS = 300_000;

/**
 * Cores padrão do Discord para embeds
 */
export const DISCORD_COLORS = {
  /** Cor blurple padrão do Discord (#5865F2) */
  BLURPLE: 0x5865f2,
  /** Cor verde sucesso (#00B894) */
  SUCCESS: 0x00b894,
  /** Cor vermelha erro (#ED4245) */
  ERROR: 0xed4245,
  /** Cor amarela aviso (#FEE75C) */
  WARNING: 0xfee75c,
} as const;

/**
 * Sessão do painel (JWT payload)
 */
export interface PanelSession {
  sub: string;
  guilds: Array<{ id: string; name: string }>; // installed & admin
  admin?: Array<{ id: string; name: string }>;
  memberInstalled?: Array<{ id: string; name: string }>;
  username?: string;
  avatar_url?: string;
}

/**
 * Configuração de canais do servidor
 */
export interface ChannelConfig {
  guild_id: string;

  // Canais de funcionalidades principais
  embeds_channel?: string; // Canal para envio de embeds/anúncios
  xp_channels?: string[]; // Canais onde XP é contabilizado
  xp_ignore_channels?: string[]; // Canais onde XP é ignorado

  // Canais de quiz e perfis
  perfil_quiz_channel?: string; // Canal do quiz de criação de perfil
  squad_quiz_channel?: string; // Canal do quiz de squads/personalidade

  // Canais de comandos
  admin_commands_channel?: string; // Canal exclusivo para comandos admin
  bot_commands_channels?: string[]; // Canais onde comandos gerais funcionam

  // Canais de logs e notificações
  level_up_channel?: string; // Canal para notificações de level up
  rank_channel?: string; // Canal para comando de ranking

  // Configurações globais
  restrict_commands: boolean; // Se true, comandos só funcionam nos canais configurados
  created_at?: string;
  updated_at?: string;
}

/**
 * Retorna configuração padrão de canais
 */
export function defaultChannelConfig(guildId: string): ChannelConfig {
  return {
    guild_id: guildId,
    xp_channels: [],
    xp_ignore_channels: [],
    bot_commands_channels: [],
    restrict_commands: false, // Por padrão, permite em todos os canais
  };
}

/**
 * Configuração do quiz de squads - totalmente configurável pelo admin
 */
export interface SquadQuizConfig {
  questions: Array<{
    text: string;
    answers: Array<{ text: string; result: string }>;
  }>;
  results: Array<{
    key: string;
    label: string;
    role_name: string;
    description: string;
    color?: string;
  }>;
  disclaimer: string;
  enabled: boolean; // permite ativar/desativar o quiz
}

/**
 * Retorna uma configuração em branco do quiz para o admin configurar
 */
export function defaultQuiz(): SquadQuizConfig {
  return {
    questions: [],
    results: [],
    disclaimer:
      "Configure seu quiz personalizado através do painel administrativo.",
    enabled: false,
  };
}

/**
 * Retorna um template de exemplo para orientar o admin
 */
export function exampleQuizTemplate(): SquadQuizConfig {
  return {
    questions: [
      {
        text: "[EXEMPLO] Edite esta pergunta conforme necessário",
        answers: [
          { text: "[EXEMPLO] Primeira opção", result: "resultado1" },
          { text: "[EXEMPLO] Segunda opção", result: "resultado2" },
          { text: "[EXEMPLO] Terceira opção", result: "resultado3" },
        ],
      },
    ],
    results: [
      {
        key: "resultado1",
        label: "[EXEMPLO] Nome do Resultado 1",
        role_name: "[CONFIGURE] Nome do Cargo 1",
        description: "[EXEMPLO] Descrição do que este resultado representa",
        color: "#3498db",
      },
      {
        key: "resultado2",
        label: "[EXEMPLO] Nome do Resultado 2",
        role_name: "[CONFIGURE] Nome do Cargo 2",
        description: "[EXEMPLO] Descrição do que este resultado representa",
        color: "#e74c3c",
      },
      {
        key: "resultado3",
        label: "[EXEMPLO] Nome do Resultado 3",
        role_name: "[CONFIGURE] Nome do Cargo 3",
        description: "[EXEMPLO] Descrição do que este resultado representa",
        color: "#2ecc71",
      },
    ],
    disclaimer:
      "Este é um quiz personalizado do servidor. Configure através do painel administrativo.",
    enabled: false,
  };
}

/**
 * Configuração padrão do quiz de perfil (em branco para admin configurar)
 */
export function defaultPerfilQuiz(): PerfilQuizConfig {
  return {
    enabled: false,
    questions: [],
    results: [],
  };
}

/**
 * Template exemplo do quiz de perfil para orientar admins
 */
export function examplePerfilQuizTemplate(): PerfilQuizConfig {
  return {
    enabled: false,
    channelId: undefined,
    questions: [
      {
        text: "Qual é sua principal área de interesse em tecnologia?",
        type: "preference",
        answers: [
          { text: "Desenvolvimento Frontend", result: "frontend", weight: 5 },
          { text: "Desenvolvimento Backend", result: "backend", weight: 5 },
          { text: "DevOps e Infraestrutura", result: "devops", weight: 5 },
          { text: "Data Science", result: "datascience", weight: 5 },
        ],
      },
      {
        text: "Qual seu nível de experiência?",
        type: "experience",
        answers: [
          { text: "Iniciante (0-1 ano)", result: "junior", weight: 3 },
          { text: "Intermediário (1-3 anos)", result: "mid", weight: 4 },
          { text: "Avançado (3+ anos)", result: "senior", weight: 5 },
        ],
      },
      {
        text: "Qual linguagem você mais domina?",
        type: "skill",
        answers: [
          { text: "JavaScript/TypeScript", result: "javascript", weight: 4 },
          { text: "Python", result: "python", weight: 4 },
          { text: "Java", result: "java", weight: 4 },
          { text: "C#", result: "csharp", weight: 4 },
        ],
      },
    ],
    results: [
      {
        key: "frontend",
        bio: "Desenvolvedor Frontend apaixonado por criar interfaces incríveis",
        area: "Desenvolvimento Frontend",
        emblemas: ["UI/UX", "Frontend"],
        badges: [
          {
            tech: "React",
            level: "Advanced",
            color: "blue",
            displayName: "React",
            description: "Biblioteca para interfaces",
          },
          {
            tech: "JavaScript",
            level: "Expert",
            color: "yellow",
            displayName: "JavaScript",
            description: "Linguagem base do frontend",
          },
        ],
        aparencia: {
          corFundo: "#61DAFB", // React Blue
        },
      },
      {
        key: "backend",
        bio: "Desenvolvedor Backend focado em arquiteturas robustas",
        area: "Desenvolvimento Backend",
        emblemas: ["API", "Backend"],
        badges: [
          {
            tech: "Node.js",
            level: "Advanced",
            color: "green",
            displayName: "Node.js",
            description: "Runtime JavaScript server-side",
          },
          {
            tech: "Database",
            level: "Intermediate",
            color: "blue",
            displayName: "Database",
            description: "Gerenciamento de dados",
          },
        ],
        aparencia: {
          corFundo: "#339933", // Node.js Green
        },
      },
    ],
  };
}

/**
 * Configuração de ranking
 */

export interface RankConfig {
  enabled: boolean;
  roles: Array<{
    name: string;
    threshold: number;
    color?: string;
  }>;
}

/**
 * Dados de atividade de membro
 */
export interface MemberActivity {
  user_id: string;
  guild_id: string;
  message_count: number;
  last_activity: string;
}

/**
 * Cooldown para anti-spam
 */
export interface CooldownEntry {
  lastUsed: number;
  duration: number;
}

/**
 * Configuração de aparência do perfil
 */
export interface PerfilApparencia {
  /** Cor de fundo do embed (hex, ex: #5865F2) */
  corFundo: string;
  /** Cor do texto principal (hex) */
  corTexto?: string;
  /** Cor de destaque para títulos/bordas (hex) */
  corDestaque?: string;
  /** URL da imagem de fundo (opcional) */
  imagemFundo?: string;
}

/**
 * Resposta do quiz de perfil que gera um badge
 */
export interface PerfilQuizBadgeResult {
  /** Tecnologia/skill para gerar badge via Badgen */
  tech: string;
  /** Nível de proficiência */
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  /** Cor do badge */
  color:
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "grey";
  /** Nome para exibição */
  displayName: string;
  /** Descrição adicional */
  description?: string;
}

/**
 * Resultado completo do quiz de perfil
 */
export interface PerfilQuizResult {
  key: string;
  /** Bio gerada baseada nas respostas */
  bio: string;
  /** Área de atuação identificada */
  area: string;
  /** Emblemas conquistados */
  emblemas: string[];
  /** Badges técnicos gerados */
  badges: PerfilQuizBadgeResult[];
  /** Aparência do perfil */
  aparencia: PerfilApparencia;
}

/**
 * Resposta de uma questão do quiz de perfil
 */
export interface PerfilQuizAnswer {
  text: string;
  /** Chave do resultado que esta resposta contribui */
  result: string;
  /** Peso da resposta para o resultado (1-5) */
  weight?: number;
}

/**
 * Questão do quiz de perfil
 */
export interface PerfilQuizQuestion {
  text: string;
  /** Tipo da questão para determinar como processar */
  type: "skill" | "experience" | "preference" | "goal";
  answers: PerfilQuizAnswer[];
}

/**
 * Configuração completa do quiz de perfil
 */
export interface PerfilQuizConfig {
  /** Se o quiz está ativo */
  enabled: boolean;
  /** Canal onde o quiz será executado */
  channelId?: string;
  /** Questões do quiz */
  questions: PerfilQuizQuestion[];
  /** Possíveis resultados do quiz */
  results: PerfilQuizResult[];
}

/**
 * Badge do perfil com imagem e descrição
 */
export interface PerfilBadge {
  /** URL da imagem do badge (pequena, para exibir lado a lado) */
  imageUrl: string;
  /** Nome/descrição do badge */
  nome: string;
  /** Tooltip/descrição adicional (opcional) */
  descricao?: string;
}

/**
 * Configuração de aparência do perfil
 */
export interface PerfilApparencia {
  /** Cor de fundo do embed (hex, ex: #5865F2) */
  corFundo: string;
  /** Cor do texto principal (hex) */
  corTexto?: string;
  /** Cor de destaque para títulos/bordas (hex) */
  corDestaque?: string;
  /** URL da imagem de fundo (opcional) */
  imagemFundo?: string;
}

/**
 * Perfil customizado do usuário
 */
export interface PerfilCustomizado {
  user_id: string;
  bio: string;
  area: string;
  emblemas: string[];
  /** Badges visuais do perfil (máximo 4) */
  badges: PerfilBadge[];
  /** Configurações de aparência do perfil */
  aparencia: PerfilApparencia;
}
