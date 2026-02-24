# Resumo: Problemas de lint/format e correções aplicadas

Este documento descreve os erros que encontramos ao tentar padronizar formatação e linting no projeto, por que eles ocorreram e exatamente como foram resolvidos — para você consultar depois.

## 1) Sintomas observados

- Ao rodar `npm run format` apenas o Prettier foi executado. Os outros formatadores/linters (stylelint, sql-formatter, yamllint) não foram executados ou o script abortava.
- Ao rodar `npm run lint` o ESLint travou por um erro de configuração: `Key '@typescript-eslint': Expected an object` — posteriormente houve erros por resolver nativo do import-resolver.

## 2) Causas principais

- O pacote distribuído originalmente (`morallus-config.tgz`) não trazia um binário CLI. Era apenas um pacote de configuração (o pacote se chama `@morallus-software/shared-config`). Os scripts do projeto estavam chamando um CLI inexistente (`morallus-config`), por isso o processo abortava depois do Prettier.
- Dependências de desenvolvimento (devDependencies) exigidas pelos CLIs não são instaladas automaticamente quando um projeto consome um pacote de _configs_ — era necessário instalar essas CLIs no repo consumidor.
- O `sql-formatter` CLI disponível não suportava `--check` (flag inexistente), por isso checks precisavam ser implementados por workaround.
- O ESLint estava usando a configuração flat (ESLint 9+) e exigia que o plugin do `@typescript-eslint` fosse um _plugin object_ (não o default wrapper). Havia também um problema com o resolver `typescript` que dependia de `unrs-resolver` — esse pacote tenta carregar bindings nativos e causava crash no ambiente.

## 3) Correções aplicadas (lista detalhada)

### 3.1 Scripts e dependências

- Atualizei `package.json` para apontar para a configuração local de `shared-config` (`file:./shared-config`) e adicionei os CLIs exigidos como devDependencies quando necessário.
- Tornei os scripts de format/lint mais robustos e cross-platform-aware:
  - `db:lint` — agora usa um helper Node para checar SQL porque a CLI não tem `--check`.
  - `lint:yaml` — usa `yamllint` (nome do CLI correto) para verificar os workflows.
  - `style:lint` — chama `stylelint "**/*.{css,scss}"` com `--allow-empty-input` para não falhar quando não existirem arquivos CSS/SCSS.
  - `format` — combina `prettier --write`, `stylelint --fix`, `sql-formatter -o` (escreve o arquivo) e `yamllint`.
  - `format:check` — combina `prettier --check`, `stylelint` (modo de check com --allow-empty-input), verificação SQL (via helper Node) e `yamllint`.

Arquivos alterados:

- `package.json` — scripts reorganizados e corrigidos (flags e paths para shared-config).

### 3.2 Workaround para sql-formatter

- Adicionei `scripts/check-sql-format.mjs` — script Node que usa a biblioteca `sql-formatter` para verificar se um arquivo SQL está formatado. Ele normaliza line endings/trailing whitespace antes de comparar para evitar falsos positivos. Esse script permite `format:check` com a versão do CLI instalada.

### 3.3 ESLint (flat config) e resolver

- Corrigi a importação do plugin do `@typescript-eslint` em `shared-config/configs/eslint/typescript.js` para usar o entrypoint raw-plugin (`@typescript-eslint/eslint-plugin/use-at-your-own-risk/raw-plugin`). Isso expõe os objetos `parser` e `plugin` no formato esperado pelo flat config.
- Atualizei `parserOptions.project` para incluir `tsconfig.eslint.json` (arquivo novo) que estende o `tsconfig.json` e inclui os arquivos de teste (`test/**`) e `vitest.config.ts`. Isso evita os erros do tipo "TSConfig não inclui o arquivo" para testes e arquivos de configuração.
- Removi o `typescript` do `settings.import/resolver` e mantive apenas `node` com extensões `.ts/.tsx`. Motivo: o resolver `typescript` dependia de `unrs-resolver` com bindings nativos que estavam falhando no ambiente local (causava crash do ESLint). Com essa alteração o ESLint deixou de travar; as falhas restantes passaram a ser _erros legítimos de código_ (como @typescript-eslint/no-unsafe-\* etc.).

Arquivos alterados:

- `shared-config/configs/eslint/typescript.js` — import raw-plugin + parserOptions.project + globals ajustados + remove typescript resolver
- `tsconfig.eslint.json` — novo arquivo para incluir `test` e `vitest.config.ts` para lint typed.

## 4) Resultado após as correções

- `npm run format` agora executa com Prettier + stylelint (fix) + sql-formatter (escreve arquivos) + yamllint. Scripts não abortam mais por um CLI inexistente.
- `npm run format:check` e `npm run db:lint` agora realizam checks consistentes (sql checks via helper script) sem false failures.
- `npm run lint` (ESLint) deixou de travar por erro de configuração / resolver — passou a rodar e reportar problemas reais do código (muitas regras estritas encontraram erros válidos). Não relaxamos regras — os erros restantes devem ser corrigidos no código.

## 5) Como reproduzir localmente

1. Instale dependências (caso não tenha):

```powershell
npm install
```

2. Checar formatação (sem alterar):

```powershell
npm run format:check
```

3. Aplicar formatação automática:

```powershell
npm run format
```

4. Lint (ESLint) — atenção: vai reportar muitos erros de código (intencional):

```powershell
npm run lint
```

5. Checar somente as SQLs (db):

```powershell
npm run db:lint
```

6. Checar YAMLs:

```powershell
npm run lint:yaml
```

## 6) Próximos passos recomendados

- Escolhas (você decide):
  - A) Corrigir os erros do ESLint reportados mantendo todas as regras — posso começar por prioridades (ex.: erros de segurança/`no-unsafe-*` primeiro) e aplicar correções por arquivos/commits.
  - B) Se preferir resolução de import TypeScript completa, eu posso tentar reativar `import/resolver: typescript` (requer garantir que `unrs-resolver` bindings funcionem no ambiente ou usar alternativa não nativa), mas isso pode mascarar problemas de binding.
  - C) Manter as regras como estão e adicionar instruções no CI para usar os novos scripts de `format:check` e `lint`.

## 7) Referências — arquivos principais alterados

- `package.json` (scripts)
- `scripts/check-sql-format.mjs` (novo)
- `tsconfig.eslint.json` (novo)
- `shared-config/configs/eslint/typescript.js` (modificado)

---

Se quiser que eu comece a corrigir os erros reportados pelo ESLint (opção A) eu já começo agora, priorizando os que impactam segurança e tipos: `@typescript-eslint/no-unsafe-*` e `no-undef` first. Diga qual caminho prefere. 👇
