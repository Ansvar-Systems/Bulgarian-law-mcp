/**
 * Tests for Bulgarian Law MCP tools.
 * Runs against the built database produced from official parliament.bg ingestion.
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

describe('database integrity', () => {
  it('should have large real corpus of legal documents', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_documents').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThanOrEqual(1500);
  });

  it('should have large real corpus of provisions', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_provisions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThanOrEqual(10000);
  });

  it('should have extracted definitions', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM definitions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThan(0);
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

describe('document presence checks', () => {
  it('should include known key acts by official IDs', () => {
    const ids = ['act-78098', 'act-15565', 'act-165936'];

    for (const id of ids) {
      const row = db.prepare('SELECT id FROM legal_documents WHERE id = ?').get(id) as { id: string } | undefined;
      expect(row?.id).toBe(id);
    }
  });

  it('Cybersecurity Act (act-78098) чл. 1 should be present and Bulgarian', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'act-78098' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('Този закон урежда');
    expect(row!.content).toContain('киберсигурността');
  });

  it('Electronic Identification Act (act-15565) чл. 1 should reference eID', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'act-15565' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('електронната идентификация');
  });

  it('Crypto-Asset Markets Act (act-165936) чл. 1 should mention crypto-assets', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'act-165936' AND section = '1'"
    ).get() as { content: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.content).toContain('криптоактиви');
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
      "SELECT content FROM legal_provisions WHERE document_id = 'act-78098' AND section = '999ZZZ'"
    ).get();

    expect(row).toBeUndefined();
  });
});
