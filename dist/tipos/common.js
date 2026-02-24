export const MODAL_TIMEOUT_MS = 300_000;
export const DISCORD_COLORS = {
    BLURPLE: 0x5865f2,
    SUCCESS: 0x00b894,
    ERROR: 0xed4245,
    WARNING: 0xfee75c,
};
export function defaultChannelConfig(guildId) {
    return {
        guild_id: guildId,
        xp_channels: [],
        xp_ignore_channels: [],
        bot_commands_channels: [],
        restrict_commands: false,
    };
}
export function defaultQuiz() {
    return {
        questions: [],
        results: [],
        disclaimer: "Configure seu quiz personalizado através do painel administrativo.",
        enabled: false,
    };
}
export function exampleQuizTemplate() {
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
        disclaimer: "Este é um quiz personalizado do servidor. Configure através do painel administrativo.",
        enabled: false,
    };
}
export function defaultPerfilQuiz() {
    return {
        enabled: false,
        questions: [],
        results: [],
    };
}
export function examplePerfilQuizTemplate() {
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
                    corFundo: "#61DAFB",
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
                    corFundo: "#339933",
                },
            },
        ],
    };
}
