#!/usr/bin/env node
/**
 * Sync the knowledge database from docs → TypeScript module.
 *
 * The API route reads from src/lib/knowledge-db.ts (because inlining the
 * markdown as a TS string is the reliable way to ship it to Vercel without
 * filesystem reads at runtime). That TS file is generated from the
 * authoritative source at docs/Memorial_Church_Knowledge_Database.md.
 *
 * Re-run this script whenever you update the markdown so the running app
 * picks up the new content:
 *
 *   npm run sync-knowledge
 *
 * The script uses JSON.stringify to handle all escaping correctly.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcPath = path.join(repoRoot, 'docs', 'Memorial_Church_Knowledge_Database.md');
const outPath = path.join(repoRoot, 'src', 'lib', 'knowledge-db.ts');

const content = fs.readFileSync(srcPath, 'utf8');
const output = `const knowledgeDB = ${JSON.stringify(content)};\nexport default knowledgeDB;\n`;
fs.writeFileSync(outPath, output);

const lines = content.split('\n').length;
const bytes = Buffer.byteLength(content, 'utf8');
console.log(`Synced knowledge DB: ${lines} lines, ${bytes.toLocaleString()} bytes.`);
console.log(`  From: docs/Memorial_Church_Knowledge_Database.md`);
console.log(`  To:   src/lib/knowledge-db.ts`);
