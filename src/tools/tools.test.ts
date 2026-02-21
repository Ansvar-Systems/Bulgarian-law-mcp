/**
 * Tests for Bulgarian Law MCP tools.
 * Runs against the built database produced from real parliament.bg ingestion.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  if (db) db.close();
});

const EXPECTED_DOC_IDS = [
  'cybersecurity-act-2018',
  'electronic-communications-networks-and-physical-infrastructure-act',
  'electronic-identification-act-2016',
  'digital-content-and-digital-services-and-sale-of-goods-act',
  'whistleblower-protection-act-2023',
  'amendment-personal-data-protection-act-2019',
  'crypto-asset-markets-act-2025',
  'accessibility-requirements-for-products-and-services-act',
  'credit-servicers-and-credit-purchasers-act',
  'amendment-electronic-communications-act-2025',
];

describe('database integrity', () => {
  it('should have exactly 10 legal documents', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_documents').get() as { cnt: number };
    expect(row.cnt).toBe(10);
  });

  it('should have at least 500 provisions', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_provisions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThanOrEqual(500);
  });

  it('should have definitions extracted', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM definitions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThan(0);
  });

  it('should contain all expected document IDs', () => {
    const rows = db.prepare('SELECT id FROM legal_documents ORDER BY id').all() as { id: string }[];
    const ids = rows.map(r => r.id);
    expect(ids).toEqual([...EXPECTED_DOC_IDS].sort());
  });

  it('should have db_metadata with jurisdiction BG', () => {
    const row = db.prepare("SELECT value FROM db_metadata WHERE key = 'jurisdiction'").get() as { value: string };
    expect(row.value).toBe('BG');
  });

  it('should have journal_mode DELETE (WASM compatible)', () => {
    const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(row.journal_mode).toBe('delete');
  });
});

describe('document content checks', () => {
  it('Cybersecurity Act чл. 1 should be present and in Bulgarian', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'cybersecurity-act-2018' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('Този закон урежда');
    expect(row!.content).toContain('киберсигурността');
  });

  it('Electronic Identification Act чл. 1 should reference electronic identification', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'electronic-identification-act-2016' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('електронната идентификация');
  });

  it('Crypto-Asset Markets Act чл. 1 should mention crypto-assets', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'crypto-asset-markets-act-2025' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('криптоактиви');
  });

  it('Personal data amendment should include GDPR reference', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'amendment-personal-data-protection-act-2019' AND section = '10в'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('Регламент (ЕС) 2016/679');
  });
});

describe('FTS5 search', () => {
  it('should find provisions matching "киберсигурност"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH 'киберсигурност'"
    ).get() as { cnt: number };

    expect(rows.cnt).toBeGreaterThan(0);
  });

  it('should find provisions matching "криптоактиви"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH 'криптоактиви'"
    ).get() as { cnt: number };

    expect(rows.cnt).toBeGreaterThan(0);
  });

  it('should find provisions matching exact phrase "електронна идентификация"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH '\"електронна идентификация\"'"
    ).get() as { cnt: number };

    expect(rows.cnt).toBeGreaterThan(0);
  });
});

describe('negative cases', () => {
  it('should return no results for non-existent document', () => {
    const row = db.prepare(
      "SELECT id FROM legal_documents WHERE id = 'nonexistent-law-2099'"
    ).get();

    expect(row).toBeUndefined();
  });

  it('should return no results for non-existent provision', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'cybersecurity-act-2018' AND section = '999ZZZ'"
    ).get();

    expect(row).toBeUndefined();
  });
});
