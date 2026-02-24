#!/usr/bin/env node
import path from 'node:path';
import { scanCommand } from '../core/scanner.js';
import { generateNotices } from '../core/generate-notices.js';
import { addDisclaimer, verifyDisclaimer } from '../core/disclaimer.js';

const argv = process.argv.slice(2);
const cmd = argv[0];

async function printHelp() {
  console.log('license-auditor — CLI simples (scaffold)');
  console.log('Usage: license-auditor <command> [options]');
  console.log('Commands:');
  console.log('  scan [--root <path>]   Perform a license scan based on package.json/node_modules');
  console.log('  help                   Show this help');
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    await printHelp();
    return;
  }

  if (cmd === 'scan') {
    const idxRoot = argv.indexOf('--root');
    const root = idxRoot !== -1 && argv[idxRoot + 1] ? path.resolve(argv[idxRoot + 1]) : process.cwd();
    try {
      const res = await scanCommand({ root });
      process.stdout.write(JSON.stringify(res, null, 2) + '\n');
      const hasProblem = res.problematic && res.problematic.length > 0;
      process.exitCode = hasProblem ? 2 : 0;
    } catch (err) {
      console.error('Scan failed:', err?.message || err);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'notices') {
    const sub = argv[1];
    if (!sub || sub === 'help') {
      console.log('Usage: license-auditor notices generate [--pt-br] [--output <file>] [--root <path>]');
      process.exit(0);
    }
    if (sub === 'generate') {
      const ptBr = argv.includes('--pt-br');
      const idxOutput = argv.indexOf('--output');
      const output = idxOutput !== -1 && argv[idxOutput + 1] ? argv[idxOutput + 1] : undefined;
      const idxRoot = argv.indexOf('--root');
      const root = idxRoot !== -1 && argv[idxRoot + 1] ? path.resolve(argv[idxRoot + 1]) : process.cwd();
      try {
        const res = await generateNotices({ root, ptBr, output });
        console.log('Generated notices:', res);
        process.exit(0);
      } catch (err) {
        console.error('Failed to generate notices:', err?.message || err);
        process.exit(1);
      }
    }
  }

  if (cmd === 'disclaimer') {
    const sub = argv[1];
    if (!sub || sub === 'help') {
      console.log('Usage: license-auditor disclaimer <add|verify> [--disclaimer-path <path>] [--root <path>]');
      process.exit(0);
    }

    const idxDisclaimer = argv.indexOf('--disclaimer-path');
    const disclaimerPath = idxDisclaimer !== -1 && argv[idxDisclaimer + 1] ? argv[idxDisclaimer + 1] : 'docs/partials/AVISO-PROVENIENCIA.md';
    const idxRoot = argv.indexOf('--root');
    const root = idxRoot !== -1 && argv[idxRoot + 1] ? path.resolve(argv[idxRoot + 1]) : process.cwd();

    if (sub === 'add') {
      const dry = argv.includes('--dry-run');
      try {
        const res = await addDisclaimer({ root, disclaimerPath, dryRun: dry });
        console.log('Disclaimer inserted into files:', res.updatedFiles.length);
        process.exit(0);
      } catch (err) {
        console.error('Failed to add disclaimer:', err?.message || err);
        process.exit(1);
      }
    }

    if (sub === 'verify') {
      try {
        const res = await verifyDisclaimer({ root, disclaimerPath });
        if (res.missing.length) {
          console.error('Missing disclaimer in files:');
          for (const f of res.missing) console.error('-', f);
          process.exit(1);
        }
        console.log('All markdown files include the disclaimer.');
        process.exit(0);
      } catch (err) {
        console.error('Failed to verify disclaimers:', err?.message || err);
        process.exit(1);
      }
    }
  }

  console.error('Unknown command:', cmd);
  await printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error:', err?.message || err);
  process.exit(1);
});
