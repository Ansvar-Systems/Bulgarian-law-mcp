/**
 * Parser and law catalog for Bulgarian Law MCP real ingestion.
 *
 * Converts /api/v1/act/{id} payloads from parliament.bg into seed JSON documents.
 */

import type { ParliamentActResponse } from './fetcher.js';

export interface TargetLaw {
  id: string;
  actId: number;
  titleEn: string;
  shortName: string;
  description: string;
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
  title_en: string;
  short_name: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issued_date: string;
  in_force_date: string;
  url: string;
  description: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

export const TARGET_LAWS: TargetLaw[] = [
  {
    id: 'cybersecurity-act-2018',
    actId: 78098,
    titleEn: 'Cybersecurity Act',
    shortName: 'ZKS',
    description: 'Primary framework for cybersecurity governance and obligations in Bulgaria. Regulates national authorities, incident handling, and requirements for entities covered by the law.',
  },
  {
    id: 'electronic-communications-networks-and-physical-infrastructure-act',
    actId: 77744,
    titleEn: 'Electronic Communications Networks and Physical Infrastructure Act',
    shortName: 'ZECSNPI',
    description: 'Regulates deployment and access rules for electronic communications networks and supporting physical infrastructure. Covers rights, obligations, and coordination between public and private stakeholders.',
  },
  {
    id: 'electronic-identification-act-2016',
    actId: 15565,
    titleEn: 'Electronic Identification Act',
    shortName: 'ZEI',
    description: 'Sets the legal framework for electronic identification and trust relationships in digital services. Defines assurance, registration, and supervision requirements for eID means.',
  },
  {
    id: 'digital-content-and-digital-services-and-sale-of-goods-act',
    actId: 163477,
    titleEn: 'Digital Content and Digital Services and Sale of Goods Act',
    shortName: 'ZDCSGS',
    description: 'Establishes consumer rights and trader obligations for supply of digital content, digital services, and sale of goods. Provides conformity, remedies, and contract-performance rules.',
  },
  {
    id: 'whistleblower-protection-act-2023',
    actId: 164632,
    titleEn: 'Whistleblower Protection Act',
    shortName: 'WPA',
    description: 'Introduces protection and reporting-channel obligations for persons reporting violations. Sets confidentiality, anti-retaliation safeguards, and enforcement framework.',
  },
  {
    id: 'amendment-personal-data-protection-act-2019',
    actId: 78179,
    titleEn: 'Act Amending and Supplementing the Personal Data Protection Act',
    shortName: 'ZZLD-2019',
    description: 'Amending act updating the legal framework around personal data protection. Contains detailed revisions and additions to the Personal Data Protection Act.',
  },
  {
    id: 'crypto-asset-markets-act-2025',
    actId: 165936,
    titleEn: 'Crypto-Asset Markets Act',
    shortName: 'CAMA',
    description: 'Regulates public offering, admission to trading, and service provision related to crypto-assets. Establishes licensing, supervisory powers, and compliance obligations.',
  },
  {
    id: 'accessibility-requirements-for-products-and-services-act',
    actId: 165848,
    titleEn: 'Accessibility Requirements for Products and Services Act',
    shortName: 'ARPSA',
    description: 'Defines accessibility requirements for products and services and related conformity mechanisms. Aligns market obligations and supervisory controls for accessibility compliance.',
  },
  {
    id: 'credit-servicers-and-credit-purchasers-act',
    actId: 165829,
    titleEn: 'Credit Servicers and Credit Purchasers Act',
    shortName: 'CSCPA',
    description: 'Sets licensing and operational rules for credit servicers and credit purchasers, including supervisory requirements. Covers borrower protections and conduct obligations.',
  },
  {
    id: 'amendment-electronic-communications-act-2025',
    actId: 166496,
    titleEn: 'Act Amending and Supplementing the Electronic Communications Act',
    shortName: 'ZES-2025',
    description: 'Amending act introducing revisions to the Electronic Communications Act. Includes updates to definitions, obligations, and sectoral regulatory provisions.',
  },
];

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
  copy: '©',
  sect: '§',
  euro: '€',
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
  return text.replace(/\s+/g, ' ').trim();
}

function htmlToLines(html: string): string[] {
  const noMsoComments = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ');

  const withBreaks = noMsoComments
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');

  const plain = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
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
  return /^(ГЛАВА|Глава|РАЗДЕЛ|Раздел|ОТДЕЛ|Отдел)\b/u.test(line);
}

function isLikelyChapterSubtitle(line: string): boolean {
  if (line.length < 2 || line.length > 140) return false;
  return /^[A-ZА-Я0-9\s.,()\-–]+$/u.test(line);
}

function extractProvisions(lines: string[]): ParsedProvision[] {
  const articleRegex = /^Чл\.\s*(\d+[а-яА-Я]?)\.\s*(.*)$/u;

  let chapter: string | undefined;
  let chapterNeedsSubtitle = false;

  const provisions: ParsedProvision[] = [];
  let current: { section: string; chapter?: string; lines: string[] } | null = null;

  const pushCurrent = (): void => {
    if (!current) return;
    const content = current.lines.join('\n').trim();
    if (!content) {
      current = null;
      return;
    }

    const section = current.section;
    provisions.push({
      provision_ref: section,
      chapter: current.chapter,
      section,
      title: `Чл. ${section}.`,
      content,
    });

    current = null;
  };

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
      pushCurrent();
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

  pushCurrent();

  return provisions;
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

    const buckets = [quotedDefinitionRegex, numberedDefinitionRegex];
    for (const regex of buckets) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(provision.content)) !== null) {
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

        if (definitions.length >= 250) {
          return definitions;
        }
      }
    }
  }

  return definitions;
}

function toIsoDate(value: string | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function parseActToDocument(act: ParliamentActResponse, target: TargetLaw): ParsedDocument {
  const lines = htmlToLines(act.L_ActL_final_body);
  const provisions = extractProvisions(lines);
  const definitions = extractDefinitions(provisions);

  const issuedDate = toIsoDate(act.L_Act_date) || toIsoDate(act.L_Act_date2);
  const inForceDate = toIsoDate(act.L_Act_date2) || issuedDate;

  return {
    id: target.id,
    type: 'statute',
    title: normalizeWhitespace(act.L_ActL_final),
    title_en: target.titleEn,
    short_name: target.shortName,
    status: 'in_force',
    issued_date: issuedDate,
    in_force_date: inForceDate,
    url: `https://www.parliament.bg/bg/laws/ID/${act.L_Act_id}`,
    description: target.description,
    provisions,
    definitions,
  };
}
