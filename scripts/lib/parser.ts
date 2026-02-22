/**
 * Parser for Bulgarian parliament.bg act payloads.
 */

import type { ArchiveLawEntry, ParliamentActResponse } from './fetcher.js';

export interface SourceLaw {
  actId: number;
  title: string;
  promulgationDate?: string;
  sourceUrl: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedDocument {
  id: string;
  type: 'statute';
  title: string;
  title_en?: string;
  short_name?: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issued_date?: string;
  in_force_date?: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

const HTML_ENTITY_MAP: Record<string, string> = {
  nbsp: ' ',
  shy: '',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  sect: '§',
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isNaN(codePoint) ? _m : String.fromCodePoint(codePoint);
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isNaN(codePoint) ? _m : String.fromCodePoint(codePoint);
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => HTML_ENTITY_MAP[name] ?? m);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToLines(html: string): string[] {
  const noComments = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ');

  const withBreaks = noComments
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');

  const plain = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '');

  return plain
    .split('\n')
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function normalizeSection(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

function isLikelyChapterHeading(line: string): boolean {
  return /^(ГЛАВА|Глава|РАЗДЕЛ|Раздел|ОТДЕЛ|Отдел|ПРЕХОДНИ И ЗАКЛЮЧИТЕЛНИ РАЗПОРЕДБИ|ДОПЪЛНИТЕЛНИ РАЗПОРЕДБИ)\b/u.test(line);
}

function isLikelyChapterSubtitle(line: string): boolean {
  if (line.length < 2 || line.length > 140) return false;
  return /^[A-ZА-Я0-9\s.,()\-–]+$/u.test(line);
}

function pushProvision(
  out: ParsedProvision[],
  current: { section: string; chapter?: string; lines: string[] } | null,
): void {
  if (!current) return;

  let content = current.lines.join('\n').trim();
  if (!content) return;

  // Keep per-provision payload bounded; the source remains recoverable via URL.
  if (content.length > 45000) {
    content = `${content.slice(0, 45000)}\n[...truncated for storage...]`;
  }

  out.push({
    provision_ref: current.section,
    chapter: current.chapter,
    section: current.section,
    title: `Чл. ${current.section}.`,
    content,
  });
}

function extractProvisions(lines: string[]): ParsedProvision[] {
  const articleRegex = /^Чл\.\s*(\d+[а-яА-Я]?)\.\s*(.*)$/u;

  const provisions: ParsedProvision[] = [];
  let current: { section: string; chapter?: string; lines: string[] } | null = null;
  let chapter: string | undefined;
  let chapterNeedsSubtitle = false;

  for (const line of lines) {
    if (isLikelyChapterHeading(line)) {
      chapter = line;
      chapterNeedsSubtitle = true;
      continue;
    }

    if (chapterNeedsSubtitle && isLikelyChapterSubtitle(line)) {
      chapter = `${chapter} — ${line}`;
      chapterNeedsSubtitle = false;
      continue;
    }
    chapterNeedsSubtitle = false;

    const articleMatch = line.match(articleRegex);
    if (articleMatch) {
      pushProvision(provisions, current);
      current = {
        section: normalizeSection(articleMatch[1]),
        chapter,
        lines: [line],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  pushProvision(provisions, current);

  if (provisions.length > 0) {
    return provisions;
  }

  // Fallback for acts that do not expose explicit "Чл." markers in the payload.
  const fallbackContent = lines.join('\n').slice(0, 45000).trim();
  if (!fallbackContent) {
    return [];
  }

  return [{
    provision_ref: 'body',
    section: 'body',
    title: 'Основен текст',
    content: fallbackContent,
  }];
}

function extractDefinitions(provisions: ParsedProvision[]): ParsedDefinition[] {
  const definitions: ParsedDefinition[] = [];
  const seen = new Set<string>();

  const quotedDefinitionRegex = /„([^“]{2,120})“\s*(?:е|са|означава|се разбира(?:\s+като)?|има значение на)\s*([^.;\n]{5,500})/gu;
  const numberedDefinitionRegex = /\b\d+\.\s*„([^“]{2,120})“\s*[–-]\s*([^;\n]{5,500})/gu;

  for (const provision of provisions) {
    if (!/(по\s+смисъла|означава|се\s+разбира|има\s+значение\s+на)/iu.test(provision.content)) {
      continue;
    }

    const patterns = [quotedDefinitionRegex, numberedDefinitionRegex];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(provision.content)) !== null) {
        const term = normalizeWhitespace(match[1]);
        const definition = normalizeWhitespace(match[2]);
        if (!term || !definition || term.length > 160 || definition.length < 5) {
          continue;
        }

        const key = `${term.toLowerCase()}::${definition.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        definitions.push({
          term,
          definition,
          source_provision: provision.provision_ref,
        });

        if (definitions.length >= 80) {
          return definitions;
        }
      }
    }
  }

  return definitions;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

export function buildDocumentId(actId: number): string {
  return `act-${actId}`;
}

export function sourceLawFromArchive(entry: ArchiveLawEntry): SourceLaw {
  return {
    actId: entry.t_id,
    title: normalizeWhitespace(entry.t_label),
    promulgationDate: toIsoDate(entry.t_date),
    sourceUrl: `https://www.parliament.bg/bg/laws/ID/${entry.t_id}`,
  };
}

export function parseActToDocument(act: ParliamentActResponse, source: SourceLaw): ParsedDocument {
  const lines = htmlToLines(act.L_ActL_final_body);
  const provisions = extractProvisions(lines);
  const definitions = extractDefinitions(provisions);

  const issuedDate = toIsoDate(act.L_Act_date) ?? source.promulgationDate;
  const inForceDate = toIsoDate(act.L_Act_date2) ?? source.promulgationDate;

  return {
    id: buildDocumentId(act.L_Act_id),
    type: 'statute',
    title: normalizeWhitespace(act.L_ActL_final || source.title),
    short_name: act.L_Act_sign ? normalizeWhitespace(act.L_Act_sign) : undefined,
    status: 'in_force',
    issued_date: issuedDate,
    in_force_date: inForceDate,
    url: source.sourceUrl,
    description: `Official promulgated act published by the National Assembly of the Republic of Bulgaria (act ID ${act.L_Act_id}).`,
    provisions,
    definitions,
  };
}
