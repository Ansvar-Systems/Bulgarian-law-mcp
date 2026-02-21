#!/usr/bin/env tsx
/**
 * Bulgarian Law MCP real-data ingestion.
 *
 * Fetches promulgated laws from the official parliament.bg API and writes
 * normalized seed JSON documents under data/seed/.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchLegislation } from './lib/fetcher.js';
import { TARGET_LAWS, parseActToDocument } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');

interface Args {
  limit: number | null;
  skipFetch: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let skipFetch = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      i++;
      continue;
    }

    if (args[i] === '--skip-fetch') {
      skipFetch = true;
    }
  }

  return { limit, skipFetch };
}

function ensureDirectories(): void {
  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });
}

function clearSeedDirectory(): void {
  const files = fs.readdirSync(SEED_DIR)
    .filter(name => name.endsWith('.json'));

  for (const file of files) {
    fs.unlinkSync(path.join(SEED_DIR, file));
  }
}

async function ingestOne(target: (typeof TARGET_LAWS)[number], index: number, skipFetch: boolean): Promise<{ provisions: number; definitions: number; seedPath: string }> {
  const sourcePath = path.join(SOURCE_DIR, `${target.actId}.json`);

  let actPayload: unknown;
  if (skipFetch && fs.existsSync(sourcePath)) {
    actPayload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } else {
    actPayload = await fetchLegislation(target.actId);
    fs.writeFileSync(sourcePath, JSON.stringify(actPayload, null, 2));
  }

  const parsed = parseActToDocument(actPayload as Parameters<typeof parseActToDocument>[0], target);
  if (parsed.provisions.length === 0) {
    throw new Error('No article provisions extracted');
  }

  const seedName = `${String(index + 1).padStart(2, '0')}-${target.id}.json`;
  const seedPath = path.join(SEED_DIR, seedName);
  fs.writeFileSync(seedPath, JSON.stringify(parsed, null, 2));

  return {
    provisions: parsed.provisions.length,
    definitions: parsed.definitions.length,
    seedPath,
  };
}

async function main(): Promise<void> {
  const { limit, skipFetch } = parseArgs();

  console.log('Bulgarian Law MCP -- Real Legislation Ingestion');
  console.log('===============================================');
  console.log('Source: https://www.parliament.bg/api/v1/act/{id}');
  console.log('Method: API (official National Assembly portal)');
  console.log('Rate limit: 1.2s between requests');

  ensureDirectories();
  clearSeedDirectory();

  const targets = limit ? TARGET_LAWS.slice(0, limit) : TARGET_LAWS;
  console.log(`Target laws: ${targets.length}`);
  if (skipFetch) console.log('Mode: --skip-fetch (use cached payloads where available)');

  let succeeded = 0;
  let failed = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${targets.length}] ${target.actId} ${target.titleEn} ... `);

    try {
      const result = await ingestOne(target, i, skipFetch);
      totalProvisions += result.provisions;
      totalDefinitions += result.definitions;
      succeeded += 1;
      console.log(`OK (${result.provisions} provisions, ${result.definitions} definitions)`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAILED (${message})`);
    }
  }

  console.log('\nIngestion Summary');
  console.log('-----------------');
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total provisions: ${totalProvisions}`);
  console.log(`Total definitions: ${totalDefinitions}`);
  console.log(`Seed directory: ${SEED_DIR}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Fatal ingestion error:', error);
  process.exit(1);
});
