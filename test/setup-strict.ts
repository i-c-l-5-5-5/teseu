// Falhar em console.error quando STRICT_TESTS=1
if (process.env.STRICT_TESTS === "1") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    // Permitir alguns erros de testes simulados (mensagens conhecidas)
    const msg = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    const allowList = [
      "Erro ao executar comando err:",
      "Erro ao executar comando err2:",
      "Erro ao executar componente btn:err:",
      "Erro ao executar componente btn:new:",
      "[SQLite] Erro ao buscar leaderboard:",
      "[SQLite] Erro ao adicionar XP",
      "[SQLite] Erro ao buscar XP",
      "[SQLite] Banco de dados não disponível",
    ];
    if (allowList.some((prefix) => msg.includes(prefix))) {
      return originalError(...args);
    }
    // Lançar para falhar o teste
    throw new Error(`console.error chamado: ${msg}`);
  };
}
