/**
 * Response metadata utilities for Bulgarian Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: 'lex.bg (lex.bg) — Народно събрание (National Assembly of Bulgaria)',
    jurisdiction: 'BG',
    disclaimer:
      'This data is sourced from the lex.bg under public domain. ' +
      'The authoritative versions are maintained by Народно събрание (National Assembly of Bulgaria). ' +
      'Always verify with the official lex.bg portal (lex.bg).',
    freshness,
  };
}
