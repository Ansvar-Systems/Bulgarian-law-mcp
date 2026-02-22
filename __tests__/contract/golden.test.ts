/**
 * Golden contract tests for Bulgarian Law MCP.
 * Skipped automatically when database.db is not present (e.g. CI without data).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/database.db');
const dbAvailable = existsSync(DB_PATH);

let db: InstanceType<typeof Database>;

describe.skipIf(!dbAvailable)('Bulgarian Law MCP — Golden Contract Tests', () => {
  beforeAll(() => {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = DELETE');
  });

  // ── Database integrity ────────────────────────────────────────────

  describe('Database integrity', () => {
    it('should have at least 1 000 legal documents', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_documents').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThanOrEqual(1000);
    });

    it('should have at least 10 000 provisions', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_provisions').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThanOrEqual(10000);
    });

    it('should have FTS index rows matching provisions count', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM provisions_fts').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThan(0);
    });

    it('should have definitions', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM definitions').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThanOrEqual(3000);
    });

    it('should have definitions FTS index', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM definitions_fts').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThan(0);
    });
  });

  // ── Article retrieval ─────────────────────────────────────────────

  describe('Article retrieval', () => {
    it('should retrieve provisions for act-8678 (Agricultural Producers Support Act)', () => {
      const rows = db.prepare(
        "SELECT id, section, content FROM legal_provisions WHERE document_id = 'act-8678'"
      ).all() as { id: number; section: string; content: string }[];
      expect(rows.length).toBeGreaterThan(0);
      const sec2b = rows.find((r) => r.section === '2б');
      expect(sec2b).toBeDefined();
      expect(sec2b!.content).toContain('Разплащателна агенция');
    });

    it('should retrieve provisions for act-15535 (Insurance Code) — largest document', () => {
      const row = db.prepare(
        "SELECT COUNT(*) as cnt FROM legal_provisions WHERE document_id = 'act-15535'"
      ).get() as { cnt: number };
      expect(row.cnt).toBeGreaterThanOrEqual(600);
    });

    it('should retrieve a specific provision by primary key', () => {
      const row = db.prepare(
        'SELECT document_id, section, content FROM legal_provisions WHERE id = 1'
      ).get() as { document_id: string; section: string; content: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.document_id).toBe('act-8678');
      expect(row!.section).toBe('2б');
    });
  });

  // ── Full-text search ──────────────────────────────────────────────

  describe('Full-text search', () => {
    it('should find results for "застраховане" (insurance) in provisions FTS', () => {
      const rows = db.prepare(
        "SELECT content FROM provisions_fts WHERE provisions_fts MATCH 'застраховане' LIMIT 5"
      ).all() as { content: string }[];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].content.toLowerCase()).toContain('застрахов');
    });

    it('should find results in definitions FTS', () => {
      const rows = db.prepare(
        "SELECT term, definition FROM definitions_fts WHERE definitions_fts MATCH 'сигурност' LIMIT 5"
      ).all() as { term: string; definition: string }[];
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  // ── EU cross-references ───────────────────────────────────────────

  describe('EU cross-references', () => {
    it('should have eu_documents table with at least one entry', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM eu_documents').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThanOrEqual(1);
    });

    it('should contain Regulation 2015/2403 in eu_documents', () => {
      const row = db.prepare(
        "SELECT id, title FROM eu_documents WHERE id = 'regulation:2015/2403'"
      ).get() as { id: string; title: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.title).toContain('2015/2403');
    });

    it('should have eu_references linking act-42272 to Regulation 2015/2403', () => {
      const row = db.prepare(
        "SELECT * FROM eu_references WHERE document_id = 'act-42272' AND eu_document_id = 'regulation:2015/2403'"
      ).get() as Record<string, unknown> | undefined;
      expect(row).toBeDefined();
      expect(row!.reference_type).toBe('references');
    });
  });

  // ── Key laws present ──────────────────────────────────────────────

  describe('Key laws present', () => {
    it('should contain the Insurance Code (act-15535)', () => {
      const row = db.prepare(
        "SELECT title FROM legal_documents WHERE id = 'act-15535'"
      ).get() as { title: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.title).toBe('Кодекс за застраховането');
    });

    it('should contain the National Security Agency Act amendment (act-9648)', () => {
      const row = db.prepare(
        "SELECT title FROM legal_documents WHERE id = 'act-9648'"
      ).get() as { title: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.title).toContain('Национална сигурност');
    });

    it('should contain the Constitution amendment (act-15497)', () => {
      const row = db.prepare(
        "SELECT title FROM legal_documents WHERE id = 'act-15497'"
      ).get() as { title: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.title).toContain('Конституцията на Република България');
    });

    it('should contain the Weapons/Explosives Act amendment (act-42272)', () => {
      const row = db.prepare(
        "SELECT title FROM legal_documents WHERE id = 'act-42272'"
      ).get() as { title: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.title).toContain('оръжията');
    });
  });

  // ── Negative tests ────────────────────────────────────────────────

  describe('Negative tests', () => {
    it('should return no results for fictional document', () => {
      const row = db.prepare(
        "SELECT COUNT(*) as cnt FROM legal_provisions WHERE document_id = 'fictional-law-2099'"
      ).get() as { cnt: number };
      expect(row.cnt).toBe(0);
    });

    it('should return no results for nonsense FTS query', () => {
      const rows = db.prepare(
        "SELECT content FROM provisions_fts WHERE provisions_fts MATCH 'xyzzy42nonexistent' LIMIT 1"
      ).all();
      expect(rows.length).toBe(0);
    });

    it('should not have a document with id "act-0"', () => {
      const row = db.prepare(
        "SELECT id FROM legal_documents WHERE id = 'act-0'"
      ).get();
      expect(row).toBeUndefined();
    });
  });

  // ── list_sources metadata ─────────────────────────────────────────

  describe('list_sources metadata', () => {
    it('should have db_metadata table entries', () => {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM db_metadata').get() as { cnt: number };
      expect(row.cnt).toBeGreaterThan(0);
    });

    it('should have jurisdiction set to BG', () => {
      const row = db.prepare(
        "SELECT value FROM db_metadata WHERE key = 'jurisdiction'"
      ).get() as { value: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.value).toBe('BG');
    });

    it('should have schema_version set to 2', () => {
      const row = db.prepare(
        "SELECT value FROM db_metadata WHERE key = 'schema_version'"
      ).get() as { value: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.value).toBe('2');
    });

    it('should have tier set to free', () => {
      const row = db.prepare(
        "SELECT value FROM db_metadata WHERE key = 'tier'"
      ).get() as { value: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.value).toBe('free');
    });
  });
});
