import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as _exec, execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(_exec);
const execFile = promisify(_execFile);

function s(v) {
  return v == null ? '' : String(v);
}

function nl(txt) {
  return txt.replace(/\r\n?|\n/g, '\n');
}

function header({ projectName, license, ptBr }) {
  const now = new Date().toISOString();
  if (ptBr) {
    return [
      'AVISOS DE TERCEIROS',
      '====================',
      '',
      `${projectName} — Licença do projeto: ${license}`,
      `Este arquivo lista componentes de terceiros incluídos (produção) e seus respectivos avisos/licenças.`,
      `Gerado em: ${now}`,
      '',
      'Observações:',
      '- Este arquivo é gerado automaticamente; não edite manualmente.',
      '- Para atualizar, execute: npm run licenses:notice',
      '- Os textos de licença de terceiros são reproduzidos no idioma original para preservar validade jurídica.',
      '',
    ].join('\n');
  }
  return [
    'THIRD-PARTY NOTICES',
    '====================',
    '',
    `${projectName} — Project license: ${license}`,
    `This file lists third-party components included (production) and their notices/licenses.`,
    `Generated at: ${now}`,
    '',
    'Notes:',
    '- This file is generated automatically; do not edit manually.',
    '- To update, run: npm run licenses:notice',
    '- Third-party license texts are reproduced in their original language to preserve legal validity.',
    '',
  ].join('\n');
}

async function renderPackageBlock(pkgId, meta) {
  const lines = [];
  lines.push('----------------------------------------------------------------');
  lines.push(`Pacote: ${pkgId}`);
  lines.push(`Licenças: ${s(meta.licenses)}`);
  if (meta.publisher) lines.push(`Publicador: ${s(meta.publisher)}`);
  if (meta.email) lines.push(`Contato: ${s(meta.email)}`);
  if (meta.repository) lines.push(`Repositório: ${s(meta.repository)}`);

  if (meta.licenseFile) {
    try {
      const content = await fs.readFile(meta.licenseFile, 'utf-8');
      const trimmed = nl(content).trim();
      if (trimmed) {
        lines.push('');
        lines.push('--- Início do texto de licença ---');
        lines.push(trimmed);
        lines.push('--- Fim do texto de licença ---');
      }
    } catch (err) {
      lines.push('');
      lines.push(`(Aviso) Não foi possível ler o arquivo de licença: ${meta.licenseFile} — ${err.message}`);
    }
  }

  // NOTICE files in package path
  const pkgDir = meta.path;
  if (pkgDir) {
    const candidates = ['NOTICE', 'NOTICE.txt', 'NOTICE.md', 'Notice', 'notice', 'notice.txt'];
    for (const f of candidates) {
      try {
        const noticePath = path.join(pkgDir, f);
        const stat = await fs.stat(noticePath).catch(() => null);
        if (stat && stat.isFile()) {
          const ncontent = nl(await fs.readFile(noticePath, 'utf-8')).trim();
          if (ncontent) {
            lines.push('');
            lines.push('--- Início do NOTICE ---');
            lines.push(ncontent);
            lines.push('--- Fim do NOTICE ---');
          }
          break;
        }
      } catch {}
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate a THIRD-PARTY or AVISOS file with license texts and notices.
 * @param {Object} options
 * @param {string} [options.root]
 * @param {boolean} [options.ptBr]
 * @param {string} [options.output]
 * @returns {Promise<{output:string,packages:number}>}
 */
export async function generateNotices({ root = process.cwd(), ptBr = false, output } = {}) {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf-8'));
  const projectName = `${pkg.name}@${pkg.version}`;
  const projectLicense = pkg.license || 'UNSPECIFIED';

  let results = null;
  const cachePath = path.join(root, '.oraculo', 'licenses.json');
  try {
    const buf = await fs.readFile(cachePath, 'utf-8');
    results = JSON.parse(buf);
  } catch {}

  // Try programmatic API
  if (!results) {
    try {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const licenseChecker = require('license-checker-rseidelsohn');
      results = await new Promise((resolve, reject) => {
        licenseChecker.init({ start: root, production: true, direct: false, relativeLicensePath: true, json: true }, (err, json) => {
          if (err) reject(err);
          else resolve(json);
        });
      });
    } catch (err) {
      // ignore — fallback will try npx
    }
  }

  // Fallback to npx license-checker if available
  if (!results) {
    try {
      const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const { stdout } = await execFile(cmd, ['--yes', 'license-checker-rseidelsohn', '--production', '--json'], { maxBuffer: 10 * 1024 * 1024 });
      results = JSON.parse(stdout);
    } catch (e) {
      try {
        const cmd = 'npx --yes license-checker-rseidelsohn --production --json';
        const { stdout } = await exec(cmd, { maxBuffer: 10 * 1024 * 1024, shell: true });
        results = JSON.parse(stdout);
      } catch (err) {
        throw new Error('Failed to obtain license information via cache, API or npx');
      }
    }
  }

  // Cache the JSON for offline runs
  try {
    const dir = path.join(root, '.oraculo');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'licenses.json'), JSON.stringify(results, null, 2), 'utf-8');
  } catch {}

  const entries = Object.entries(results).filter(([id]) => !id.startsWith(`${pkg.name}@`)).sort((a, b) => a[0].localeCompare(b[0]));

  const parts = [header({ projectName, license: projectLicense, ptBr })];
  for (const [id, meta] of entries) {
    parts.push(await renderPackageBlock(id, meta));
  }

  const finalTxt = parts.join('\n');
  const out = output ? path.resolve(root, output) : path.join(root, ptBr ? 'AVISOS-DE-TERCEIROS.pt-BR.txt' : 'THIRD-PARTY-NOTICES.txt');
  await fs.writeFile(out, finalTxt, 'utf-8');
  return { output: out, packages: entries.length };
}

export default generateNotices;
