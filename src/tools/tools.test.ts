/**
 * Tests for Bulgarian Law MCP tools.
 * Runs against the built database to verify seed data and tool functions.
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
  it('should have 10 legal documents', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_documents').get() as { cnt: number };
    expect(row.cnt).toBe(10);
  });

  it('should have at least 150 provisions', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM legal_provisions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThanOrEqual(150);
  });

  it('should have definitions', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM definitions').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThan(0);
  });

  it('should have EU documents extracted', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM eu_documents').get() as { cnt: number };
    expect(row.cnt).toBeGreaterThan(0);
  });

  it('should have EU references extracted', () => {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM eu_references').get() as { cnt: number };
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

describe('ZZLD - Personal Data Protection Act', () => {
  it('should find ZZLD by title_en', () => {
    const row = db.prepare(
      "SELECT id FROM legal_documents WHERE title_en LIKE '%Personal Data Protection%'"
    ).get() as { id: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.id).toBe('zzld-personal-data-protection');
  });

  it('should have Art. 1 mentioning GDPR', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'zzld-personal-data-protection' AND provision_ref = '1'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('Regulation (EU) 2016/679');
  });

  it('should have Art. 38 mentioning breach notification 72 hours', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'zzld-personal-data-protection' AND provision_ref = '38'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('72 hours');
  });

  it('should have GDPR EU reference', () => {
    const row = db.prepare(
      "SELECT eu_document_id FROM eu_references WHERE document_id = 'zzld-personal-data-protection' AND eu_document_id LIKE '%2016/679%'"
    ).get() as { eu_document_id: string } | undefined;
    expect(row).toBeDefined();
  });
});

describe('Cybersecurity Act', () => {
  it('should find Cybersecurity Act', () => {
    const row = db.prepare(
      "SELECT id FROM legal_documents WHERE title_en = 'Cybersecurity Act'"
    ).get() as { id: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.id).toBe('cybersecurity-act');
  });

  it('should have Art. 10 about incident notification', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'cybersecurity-act' AND provision_ref = '10'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('incident');
    expect(row!.content).toContain('notification');
  });

  it('should reference NIS Directive', () => {
    const row = db.prepare(
      "SELECT eu_document_id FROM eu_references WHERE document_id = 'cybersecurity-act' AND eu_document_id LIKE '%2016/1148%'"
    ).get() as { eu_document_id: string } | undefined;
    expect(row).toBeDefined();
  });
});

describe('Penal Code - Cybercrime', () => {
  it('should have Art. 319a about unauthorised access', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'penal-code-cybercrime' AND provision_ref = '319a'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('unauthorised access');
  });

  it('should have Art. 319d about system interference', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'penal-code-cybercrime' AND provision_ref = '319d'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('hinders the functioning');
  });
});

describe('FTS5 search', () => {
  it('should find provisions matching "personal data"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH '\"personal data\"'"
    ).get() as { cnt: number };
    expect(rows.cnt).toBeGreaterThan(0);
  });

  it('should find provisions matching "cybersecurity"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH 'cybersecurity'"
    ).get() as { cnt: number };
    expect(rows.cnt).toBeGreaterThan(0);
  });

  it('should find provisions matching "electronic signature"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH '\"electronic signature\"'"
    ).get() as { cnt: number };
    expect(rows.cnt).toBeGreaterThan(0);
  });

  it('should find provisions matching "trade secret"', () => {
    const rows = db.prepare(
      "SELECT COUNT(*) as cnt FROM provisions_fts WHERE provisions_fts MATCH '\"trade secret\"'"
    ).get() as { cnt: number };
    expect(rows.cnt).toBeGreaterThan(0);
  });
});

describe('Electronic Commerce Act', () => {
  it('should have hosting liability provision (Art. 15)', () => {
    const row = db.prepare(
      "SELECT content FROM legal_provisions WHERE document_id = 'zet-electronic-commerce' AND provision_ref = '15'"
    ).get() as { content: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.content).toContain('storage');
    expect(row!.content).toContain('recipient');
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
      "SELECT content FROM legal_provisions WHERE document_id = 'zzld-personal-data-protection' AND provision_ref = '999ZZZ'"
    ).get();
    expect(row).toBeUndefined();
  });
});
