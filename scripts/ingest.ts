#!/usr/bin/env tsx
/**
 * Bulgarian Law MCP real-data ingestion (full archive coverage).
 *
 * Workflow:
 * 1) Discover all promulgated laws through archive endpoints
 * 2) Fetch each act payload from /api/v1/act/{id} with respectful throttling
 * 3) Parse provisions and definitions
 * 4) Write seed JSONs to data/seed/
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchArchivePeriod,
  fetchArchiveYears,
  fetchLegislation,
  type ArchiveLawEntry,
} from './lib/fetcher.js';
import { parseActToDocument, sourceLawFromArchive } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SOURCE_ACTS_DIR = path.resolve(SOURCE_DIR, 'acts');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const CATALOG_PATH = path.resolve(SOURCE_DIR, 'archive-laws.json');
const REPORT_PATH = path.resolve(SOURCE_DIR, 'ingestion-report.json');

interface Args {
  limit: number | null;
  skipFetch: boolean;
  skipDiscovery: boolean;
  resume: boolean;
}

interface IngestionIssue {
  actId: number;
  title: string;
  reason: string;
}

interface DiscoveryIssue {
  year: number;
  month: number;
  reason: string;
}

interface IngestionReport {
  discovered: number;
  attempted: number;
  succeeded: number;
  failed: number;
  totalProvisions: number;
  totalDefinitions: number;
  generatedAt: string;
  issues: IngestionIssue[];
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let skipFetch = false;
  let skipDiscovery = false;
  let resume = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      i++;
      continue;
    }

    if (args[i] === '--skip-fetch') {
      skipFetch = true;
      continue;
    }

    if (args[i] === '--skip-discovery') {
      skipDiscovery = true;
      continue;
    }

    if (args[i] === '--resume') {
      resume = true;
    }
  }

  return { limit, skipFetch, skipDiscovery, resume };
}

function ensureDirectories(): void {
  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SOURCE_ACTS_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });
}

function clearSeedDirectory(): void {
  const files = fs.readdirSync(SEED_DIR).filter(name => name.endsWith('.json'));
  for (const file of files) {
    fs.unlinkSync(path.join(SEED_DIR, file));
  }
}

function normalizeDate(value: string): string {
  return value.slice(0, 10);
}

async function discoverArchiveLaws(): Promise<ArchiveLawEntry[]> {
  const years = await fetchArchiveYears();
  const all: ArchiveLawEntry[] = [];
  let bucketCount = 0;

  for (const yearBucket of years) {
    for (const monthBucket of yearBucket.t_month_list) {
      bucketCount += 1;
      try {
        const entries = await fetchArchivePeriod(yearBucket.t_year, monthBucket.t_month);
        all.push(...entries);
        console.log(
          `  [catalog ${String(bucketCount).padStart(3, '0')}] ${yearBucket.t_year}-${String(monthBucket.t_month).padStart(2, '0')} -> ${entries.length}`,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.log(
          `  [catalog ${String(bucketCount).padStart(3, '0')}] ${yearBucket.t_year}-${String(monthBucket.t_month).padStart(2, '0')} -> FAILED (${reason})`,
        );
      }
    }
  }

  const byId = new Map<number, ArchiveLawEntry>();
  for (const item of all) {
    if (!byId.has(item.t_id)) {
      byId.set(item.t_id, item);
    }
  }

  const deduped = Array.from(byId.values()).sort((a, b) =>
    normalizeDate(a.t_date).localeCompare(normalizeDate(b.t_date)) || a.t_id - b.t_id,
  );

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(deduped, null, 2));
  return deduped;
}

function loadCatalogFromDisk(): ArchiveLawEntry[] {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalog file not found: ${CATALOG_PATH}`);
  }

  const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid catalog format in ${CATALOG_PATH}`);
  }

  return parsed as ArchiveLawEntry[];
}

function seedPathFor(index: number, total: number, actId: number): string {
  const width = Math.max(4, String(total).length);
  const prefix = String(index + 1).padStart(width, '0');
  return path.join(SEED_DIR, `${prefix}-act-${actId}.json`);
}

function sourcePathFor(actId: number): string {
  return path.join(SOURCE_ACTS_DIR, `${actId}.json`);
}

async function main(): Promise<void> {
  const { limit, skipFetch, skipDiscovery, resume } = parseArgs();

  console.log('Bulgarian Law MCP -- Full Archive Ingestion');
  console.log('===========================================');
  console.log('Source: https://www.parliament.bg/api/v1');
  console.log('Methods: archive-list + archive-period + act/{id}');
  console.log('Rate limit: 1.2s between requests');
  if (limit) console.log(`Limit: ${limit}`);
  if (skipFetch) console.log('Mode: --skip-fetch');
  if (skipDiscovery) console.log('Mode: --skip-discovery');
  if (resume) console.log('Mode: --resume');

  ensureDirectories();

  if (!resume) {
    clearSeedDirectory();
  }

  let discovered: ArchiveLawEntry[];
  if (skipDiscovery) {
    console.log(`\nLoading existing catalog from ${CATALOG_PATH}...`);
    discovered = loadCatalogFromDisk();
  } else {
    console.log('\nDiscovering archive catalog...');
    discovered = await discoverArchiveLaws();
  }

  const laws = limit ? discovered.slice(0, limit) : discovered;

  console.log(`Discovered: ${discovered.length}`);
  console.log(`Target set: ${laws.length}`);

  let succeeded = 0;
  let failed = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;
  const issues: IngestionIssue[] = [];

  for (let i = 0; i < laws.length; i++) {
    const law = laws[i];
    const sourcePath = sourcePathFor(law.t_id);
    const seedPath = seedPathFor(i, laws.length, law.t_id);

    if (resume && fs.existsSync(seedPath)) {
      const existing = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as { provisions?: unknown[]; definitions?: unknown[] };
      succeeded += 1;
      totalProvisions += existing.provisions?.length ?? 0;
      totalDefinitions += existing.definitions?.length ?? 0;
      process.stdout.write(`[${String(i + 1).padStart(4, '0')}/${laws.length}] ${law.t_id} resume-skip\n`);
      continue;
    }

    process.stdout.write(`[${String(i + 1).padStart(4, '0')}/${laws.length}] ${law.t_id} ${law.t_label} ... `);

    try {
      let actPayload: unknown;
      if (skipFetch && fs.existsSync(sourcePath)) {
        actPayload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      } else {
        actPayload = await fetchLegislation(law.t_id);
        fs.writeFileSync(sourcePath, JSON.stringify(actPayload, null, 2));
      }

      const sourceLaw = sourceLawFromArchive(law);
      const parsed = parseActToDocument(actPayload as Parameters<typeof parseActToDocument>[0], sourceLaw);

      if (parsed.provisions.length === 0) {
        throw new Error('No provisions extracted');
      }

      fs.writeFileSync(seedPath, JSON.stringify(parsed, null, 2));

      succeeded += 1;
      totalProvisions += parsed.provisions.length;
      totalDefinitions += parsed.definitions.length;

      process.stdout.write(`OK (${parsed.provisions.length} provisions)\n`);
    } catch (error) {
      failed += 1;
      const reason = error instanceof Error ? error.message : String(error);
      issues.push({ actId: law.t_id, title: law.t_label, reason });
      process.stdout.write(`FAILED (${reason})\n`);
    }
  }

  const report: IngestionReport = {
    discovered: discovered.length,
    attempted: laws.length,
    succeeded,
    failed,
    totalProvisions,
    totalDefinitions,
    generatedAt: new Date().toISOString(),
    issues,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\nIngestion Summary');
  console.log('-----------------');
  console.log(`Discovered laws: ${report.discovered}`);
  console.log(`Attempted: ${report.attempted}`);
  console.log(`Succeeded: ${report.succeeded}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Total provisions: ${report.totalProvisions}`);
  console.log(`Total definitions: ${report.totalDefinitions}`);
  console.log(`Catalog: ${CATALOG_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Fatal ingestion error:', error);
  process.exit(1);
});
