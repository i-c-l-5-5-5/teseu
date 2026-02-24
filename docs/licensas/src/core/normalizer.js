// Enhanced normalizer: prefer spdx-expression-parse + spdx-correct when available
// Otherwise, fall back to a heuristic normalizer.
let spdxParse = null;
let spdxCorrect = null;
let spdxLicenseList = null;
let spdxLoaded = false;

async function tryLoadSpdx() {
  if (spdxLoaded) return;
  spdxLoaded = true;
  try {
    // dynamic import so the module is optional
    spdxParse = (await import('spdx-expression-parse')).default || (await import('spdx-expression-parse'));
  } catch {}
  try {
    spdxCorrect = (await import('spdx-correct')).default || (await import('spdx-correct'));
  } catch {}
  try {
    // load the official SPDX license list (used to recognize GitHub license keys)
    spdxLicenseList = (await import('spdx-license-list')).default || (await import('spdx-license-list'));
  } catch {}
}

function fallbackNormalize(raw) {
  if (!raw) return 'UNKNOWN';
  if (Array.isArray(raw)) return raw.map((r) => fallbackNormalize(r)).join(' OR ');
  if (typeof raw === 'object') return raw.type ? fallbackNormalize(raw.type) : 'UNKNOWN';

  let s = String(raw).trim();
  s = s.replace(/\s+/g, ' ');
  const map = { mit: 'MIT', isc: 'ISC', 'apache-2.0': 'Apache-2.0', apache: 'Apache-2.0', gpl: 'GPL', agpl: 'AGPL', lgpl: 'LGPL' };
  // try to split on logical operators and clean tokens
  const parts = s.split(/\s+(OR|AND)\s+/i);
  return parts
    .map((p) => {
      if (/^(OR|AND)$/i.test(p)) return p.toUpperCase();
      // quick map lookup first
      const key = p.toLowerCase();
      if (map[key]) return map[key];

      // attempt to correct using spdx-correct when available
      let token = p.trim();
      try {
        if (spdxCorrect) token = spdxCorrect(token) || token;
      } catch {}

      // if spdx-license-list is available, try to match by id or name
      try {
        if (spdxLicenseList) {
          // normalized id (e.g. 'MIT', 'Apache-2.0')
          const id = String(token).trim();
          if (spdxLicenseList[id]) return id;

          // try case-insensitive id match
          const matchId = Object.keys(spdxLicenseList).find((k) => k.toLowerCase() === String(token).toLowerCase());
          if (matchId) return matchId;

          // try matching by license name
          const matchByName = Object.entries(spdxLicenseList).find(([, v]) => (v && v.name && String(v.name).toLowerCase() === String(token).toLowerCase()));
          if (matchByName) return matchByName[0];
        }
      } catch {}

      return token;
    })
    .join(' ');
}

/**
 * Normalize a license value into a canonical string (preferably SPDX-like).
 * Supports strings, arrays and simple objects ({ type }).
 * Falls back to a heuristic normalizer when full SPDX libraries are not available.
 * @param {string|array|object} raw
 * @returns {Promise<string>}
 */
export async function normalizeLicense(raw) {
  // attempt to use spdx libraries if present
  await tryLoadSpdx();

  // If the input string contains logical operators (OR/AND), the spdx parser
  // may not correctly preserve both sides when non-canonical tokens are used
  // (for example: "Apache OR mit"). In that case, fall back to the heuristic
  // normalizer which preserves the logical operator and normalizes tokens.
  if (spdxParse && typeof raw === 'string' && /\b(OR|AND)\b/i.test(raw)) {
    return fallbackNormalize(raw);
  }

  if (spdxParse) {
    try {
      // support arrays and objects
      if (Array.isArray(raw)) return raw.map((r) => awaitOrFallback(r)).join(' OR ');
      if (typeof raw === 'object') raw = raw.type || raw;

      return awaitOrFallback(raw);
    } catch (e) {
      // fallthrough to fallback
    }
  }
  return fallbackNormalize(raw);

  // helper: parse and generate canonical string or fallback
  function awaitOrFallback(value) {
    try {
      const s = String(value).trim();
      // if spdx-correct is available, try to correct common mistakes
      const corrected = spdxCorrect ? spdxCorrect(s) || s : s;
      // if spdx-parse available, parse and reconstruct a canonical form
      if (spdxParse) {
        try {
          const parsed = spdxParse(corrected);
          // convert parsed AST back to a useful string — simple walker
          return astToExpression(parsed);
        } catch (e) {
          return corrected;
        }
      }
      return corrected;
    } catch (e) {
      return fallbackNormalize(value);
    }
  }

  function astToExpression(ast) {
    // spdx-expression-parse returns a tree; we build expression recursively.
    if (!ast) return 'UNKNOWN';
    if (typeof ast === 'string') return ast;
    if (ast.license) return ast.license;
    if (ast.left && ast.right && ast.conjunction) {
      return `${astToExpression(ast.left)} ${ast.conjunction.toUpperCase()} ${astToExpression(ast.right)}`;
    }
    // fallback to JSON dump
    return JSON.stringify(ast);
  }
}

export default normalizeLicense;
