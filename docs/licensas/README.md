Proveniência e Autoria

AVISO: Este repositório adota o aviso de "Proveniência e Autoria" em arquivos Markdown. Use `license-auditor disclaimer add` para inserir o aviso nos arquivos que não o contenham nas primeiras linhas.

# license-auditor (scaffold)

Ferramenta consolidada para auditoria de licenças em projetos Node.js. Este scaffold provê:

- Um CLI mínimo (`license-auditor`) com comando `scan` para inspecionar `node_modules` e `package.json`.
- Um CLI mínimo (`license-auditor`) com comandos `scan` e `notices generate` para inspecionar `node_modules` e gerar THIRD-PARTY-NOTICES/AVISOS.
- Módulos `src/core` reutilizáveis (scanner, normalizer, fs-utils).
- Um teste simples para validar a função core do scanner.

Como usar (local):

1. Instale dependências do seu projeto-alvo (ou crie uma pasta de teste com `package.json` e `node_modules`).
2. Execute:

```powershell
npm run scan
```

Para testar o scanner do scaffold:

```powershell
npm test
```

Uso do gerador de avisos (notices):

1. Gerar avisos em português (default output):

```powershell
npm run notices:notice -- --pt-br
```

2. Gerar avisos com caminho/arquivo personalizado:

```powershell
node ./bin/license-auditor notices generate --output my-notices.txt
```

Próximos passos sugeridos:

- Subcomandos de disclaimer:
	- `license-auditor disclaimer add [--disclaimer-path <path>] [--root <path>]` — insere o aviso `AVISO-PROVENIENCIA.md` nas headings de arquivos .md que não contenham o marcador.
	- `license-auditor disclaimer verify [--disclaimer-path <path>] [--root <path>]` — verifica e lista arquivos .md sem o aviso nas primeiras 30 linhas.

	Exemplo:

	```powershell
	npm run disclaimer:add -- --disclaimer-path docs/partials/AVISO-PROVENIENCIA.md
	npm run disclaimer:verify
	```
 - Adicionar outras features do repo original: `generate-notices`, `disclaimer` e `validate` como subcomandos do CLI.
- Adicionar testes unitários e integração, e CI (GitHub Actions).

Melhorias de normalização (SPDX)
--------------------------------

O normalizador do scaffold tenta usar bibliotecas SPDX quando instaladas para produzir expressões canônicas e correções comuns.
Se desejar instalar as bibliotecas opcionais, execute:

```powershell
npm install --save-dev spdx-expression-parse spdx-correct
```

Com essas bibliotecas instaladas, `normalizeLicense` fará parse e normalização mais precisa de expressões complexas como "Apache-2.0 OR MIT".

Além disso, quando disponível, o projeto usa `spdx-license-list` para reconhecer as chaves oficiais de licença do GitHub (por exemplo: `mit`, `apache-2.0`, `bsd-3-clause`) e mapear à forma canônica.
