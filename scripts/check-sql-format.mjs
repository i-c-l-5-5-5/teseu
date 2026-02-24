#!/usr/bin/env node
import fs from "fs";
import { format } from "sql-formatter";

const [lang, file] = process.argv.slice(2);
if (!lang || !file) {
  console.error("Usage: node scripts/check-sql-format.mjs <language> <file>");
  process.exit(2);
}

try {
  const content = fs.readFileSync(file, "utf8");
  const formatted = format(content, { language: lang });
  const normalize = (s) => s.replace(/\r\n/g, "\n").trimEnd();
  if (normalize(formatted) !== normalize(content)) {
    console.error(`${file} is not formatted (sql-formatter).`);
    process.exit(1);
  }
  console.log(`${file} OK`);
  process.exit(0);
} catch (error) {
  console.error("Error while checking file:", error.message);
  process.exit(2);
}
