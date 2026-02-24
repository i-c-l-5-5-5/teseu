#!/usr/bin/env node
import path from 'node:path';
import { exists, readPackageJsonSync, findLicenseFile } from './fs-utils.js';
import { normalizeLicense } from './normalizer.js';

export async function scan({ root = process.cwd(), includeDev = false } = {}) {
  const nmDir = path.join(root, 'node_modules');
  const result = {
    generatedAt: new Date().toISOString(),
    totalPackages: 0,
    totalFiltered: 0,
    licenseCounts: {},
    packages: [],
    problematic: [],
  };

  if (!exists(nmDir)) {
    // nothing to scan — possibly a library without node_modules
    return result;
  }

  // iterate top-level entries and scoped packages
  const entries = [];
  try {
    const dirEntries = await fsReaddir(nmDir);
    for (const e of dirEntries) entries.push(e);
  } catch (err) {
    // fallback synchronous
    try {
      const syncNames = require('node:fs').readdirSync(nmDir, { withFileTypes: true });
      for (const d of syncNames) entries.push(d.name);
    } catch (err2) {
      return result;
    }
  }

  for (const entryName of entries) {
    if (entryName === '.bin') continue;
    const full = path.join(nmDir, entryName);
    if (entryName.startsWith('@')) {
      // scoped packages
      try {
        const scoped = await fsReaddir(full);
        for (const s of scoped) {
          const p = path.join(full, s);
          if (await fsStatIsDir(p)) await processPackage(p, result);
        }
      } catch {
        // ignore
      }
    } else {
      if (await fsStatIsDir(full)) await processPackage(full, result);
    }
  }

  // compute counts, filter @types/*
  const filtered = result.packages.filter((p) => !p.name.startsWith('@types/'));
  result.totalPackages = result.packages.length;
  result.totalFiltered = filtered.length;

  for (const p of filtered) result.licenseCounts[p.license] = (result.licenseCounts[p.license] || 0) + 1;

  // no default problematic rule — caller/CLI can use allow/fail rules
  return result;

  // helpers
  async function processPackage(pkgDir, resObj) {
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!exists(pkgJsonPath)) return;
    const data = readPackageJsonSync(pkgJsonPath);
    if (!data) return;
    const name = data.name || path.basename(pkgDir);
    const version = data.version || '0.0.0';
    const rawLicense = data.license || data.licenses || null;
    const licenseValue = await normalizeLicense(rawLicense || 'UNKNOWN');
    const licenseFile = findLicenseFile(pkgDir);
    resObj.packages.push({
      name,
      version,
      license: licenseValue,
      repository: (data.repository && (typeof data.repository === 'string' ? data.repository : data.repository.url)) || null,
      private: !!data.private,
      licenseFile: licenseFile ? licenseFile.file : null,
      licenseText: licenseFile ? licenseFile.text : null,
      path: pkgDir,
    });
  }
}

// small promisified helpers that tolerate missing import in some runtimes
async function fsReaddir(p) {
  const fs = await import('node:fs');
  return fs.promises.readdir(p, { withFileTypes: false }).catch(() => []);
}

async function fsStatIsDir(p) {
  const fs = await import('node:fs');
  try {
    const stat = await fs.promises.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function scanCommand(opts) {
  const res = await scan(opts);
  // mark problematic by a simple heuristic: any UNKNOWN
  const problematic = res.packages.filter((p) => p.license === 'UNKNOWN');
  res.problematic = problematic;
  return res;
}
