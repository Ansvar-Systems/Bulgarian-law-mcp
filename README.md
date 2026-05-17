# Bulgarian Law MCP Server

<!-- ANSVAR-CTA-BEGIN -->
> ### ▶ Try this MCP instantly via Ansvar Gateway
> **50 free queries/day · no card required · OAuth signup at [ansvar.eu/gateway](https://ansvar.eu/gateway)**
>
> One endpoint, one OAuth signup, access from any MCP-compatible client.

### Connect

**Claude Code** (one line):

```bash
claude mcp add ansvar --transport http https://gateway.ansvar.eu/mcp
```

**Claude Desktop / Cursor** — add to `claude_desktop_config.json` (or `mcp.json`):

```json
{
  "mcpServers": {
    "ansvar": {
      "type": "url",
      "url": "https://gateway.ansvar.eu/mcp"
    }
  }
}
```

**Claude.ai** — Settings → Connectors → Add custom connector → paste `https://gateway.ansvar.eu/mcp`

First request opens an OAuth flow at [ansvar.eu/gateway](https://ansvar.eu/gateway). After signup, your client is bound to your account; tier (free / premium / team / company) determines fan-out, quota, and which downstream MCPs are reachable.

---

## Self-host this MCP

You can also clone this repo and build the corpus yourself. The schema,
fetcher, and tool implementations all live here. What is not in the repo is
the pre-built database — TDM and standards-licensing constraints on the
upstream sources mean we host the corpus on Ansvar infrastructure rather
than redistribute it as a public artifact.

Build your own: run this repo's ingestion script (entry-point varies per
repo — typically `scripts/ingest.sh`, `npm run ingest`, or `make ingest`;
check the repo root).
<!-- ANSVAR-CTA-END -->


**The Lex.bg alternative for the AI age.**

[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Bulgarian-law-mcp?style=social)](https://github.com/Ansvar-Systems/Bulgarian-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/EU_INTEGRATION_GUIDE.md)
[![Provisions](https://img.shields.io/badge/provisions-17%2C103-blue)](docs/EU_INTEGRATION_GUIDE.md)

Query **1,997 Bulgarian statutes** -- from the Закон за защита на личните данни (ЗЗЛД) and Наказателен кодекс to the Граждански процесуален кодекс, Търговски закон, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Bulgarian legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Bulgarian legal research is scattered across Lex.bg, the Държавен вестник (State Gazette), and EUR-Lex. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking if a statute is still in force
- A **legal tech developer** building tools on Bulgarian law
- A **researcher** tracing legislative provisions across 1,997 statutes

...you shouldn't need dozens of browser tabs and manual cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Bulgarian law **searchable, cross-referenceable, and AI-readable**.

---

## Example Queries

Once connected, just ask naturally:

- *"Търсене 'защита на личните данни' -- какви задължения предвижда ЗЗЛД?"*
- *"Действа ли Наказателният кодекс в актуалния му вид?"*
- *"Намери разпоредби за търговски дружества в Търговския закон"*
- *"Кои европейски актове са въведени чрез Закона за електронното управление?"*
- *"Кои български закони прилагат GDPR?"*
- *"Потвърди цитат: ЗЗЛД чл. 6, ал. 1"*
- *"Изгради правна позиция относно задълженията за уведомяване при нарушения на сигурността"*
- *"Съответства ли българското законодателство на изискванията на NIS2?"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | 1,997 statutes | Comprehensive Bulgarian legislation from parliament.bg |
| **Provisions** | 17,103 sections | Full-text searchable with FTS5 |
| **EU Cross-References** | Included | Directives and regulations linked to Bulgarian transpositions |
| **Database Size** | 93 MB | Optimized SQLite, portable |
| **Daily Updates** | Automated | Freshness checks against Lex.bg / Държавен вестник |

**Verified data only** -- every citation is validated against official sources (parliament.bg, Lex.bg). Zero LLM-generated content.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from official Bulgarian parliamentary and legislative sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by statute + article/section reference
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
parliament.bg / Lex.bg → Parse → SQLite → FTS5 snippet() → MCP response
                            ↑                      ↑
                    Provision parser        Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search Lex.bg by statute name | Search by plain Bulgarian: *"лични данни съгласие"* |
| Navigate multi-chapter statutes manually | Get the exact provision with context |
| Manual cross-referencing between laws | `build_legal_stance` aggregates across sources |
| "Is this statute still in force?" → check manually | `check_currency` tool → answer in seconds |
| Find EU basis → dig through EUR-Lex | `get_eu_basis` → linked EU directives instantly |
| Check multiple sites for updates | Daily automated freshness checks |
| No API, no integration | MCP protocol → AI-native |

**Traditional:** Search Lex.bg → Download PDF → Ctrl+F → Cross-reference → Check EUR-Lex for EU basis → Repeat

**This MCP:** *"Кои разпоредби на ЗЗЛД въвеждат чл. 9 от GDPR за специалните категории данни?"* → Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across 17,103 provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by statute + article/section reference |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple statutes for a legal topic |
| `format_citation` | Format citations per Bulgarian conventions (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |
| `list_sources` | List all available statutes with metadata and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### EU Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU directives/regulations that underpin a Bulgarian statute |
| `get_bulgarian_implementations` | Find Bulgarian laws implementing a specific EU act |
| `search_eu_implementations` | Search EU documents with Bulgarian implementation counts |
| `get_provision_eu_basis` | Get EU law references for a specific provision |
| `validate_eu_compliance` | Check implementation status of Bulgarian statutes against EU directives |

---

## EU Law Integration

Bulgaria is an EU member state. Bulgarian legislation directly transposes EU directives and implements EU regulations, creating a traceable mapping between Bulgarian and EU law.

Key areas of EU-Bulgarian law alignment:

- **GDPR (2016/679)** -- implemented via the Закон за защита на личните данни (ЗЗЛД, amended 2019)
- **NIS2 Directive (2022/2555)** -- transposed into Bulgarian cybersecurity legislation
- **eIDAS Regulation (910/2014)** -- applicable directly; supplemented by the Закон за електронния документ и електронните удостоверителни услуги
- **DORA (2022/2554)** -- financial sector digital resilience obligations
- **AI Act (2024/1689)** -- EU regulation applicable directly across all member states
- **AML Directives** -- implemented via Bulgarian anti-money laundering legislation

The EU bridge tools provide bi-directional lookup: find which Bulgarian statutes implement a given EU act, or find which EU acts underpin a given Bulgarian provision.

| Metric | Value |
|--------|-------|
| **EU Member State** | Since 2007 |
| **Legal System** | Civil law (continental European tradition) |
| **Official Gazette** | Държавен вестник (dv.parliament.bg) |
| **EUR-Lex Integration** | Automated metadata fetching |

See [EU_INTEGRATION_GUIDE.md](docs/EU_INTEGRATION_GUIDE.md) for detailed documentation.

---

## Data Sources & Freshness

All content is sourced from authoritative Bulgarian legal databases:

- **[parliament.bg](https://www.parliament.bg/)** -- National Assembly of Bulgaria, official legislation database
- **[Lex.bg](https://lex.bg/)** -- Consolidated Bulgarian legislation
- **[Държавен вестник](https://dv.parliament.bg/)** -- Official State Gazette (primary legislative publication)
- **[EUR-Lex](https://eur-lex.europa.eu/)** -- Official EU law database (metadata only)

### Automated Freshness Checks (Daily)

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors all data sources:

| Source | Check | Method |
|--------|-------|--------|
| **Statute amendments** | Lex.bg / parliament.bg comparison | All 1,997 statutes checked |
| **New statutes** | Държавен вестник publications (90-day window) | Diffed against database |
| **EU reference staleness** | Git commit timestamps | Flagged if >90 days old |

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from official Bulgarian legislative publications (parliament.bg, Lex.bg). However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Verify critical citations** against primary sources (Държавен вестник) for court filings
> - **EU cross-references** are extracted from Bulgarian statute text, not EUR-Lex full text
> - **Always confirm** current in-force status via Lex.bg before relying on a provision professionally

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [PRIVACY.md](PRIVACY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. See [PRIVACY.md](PRIVACY.md) for Висш адвокатски съвет (Supreme Bar Council of Bulgaria) compliance guidance.

---

## Documentation

- **[EU Integration Guide](docs/EU_INTEGRATION_GUIDE.md)** -- Detailed EU cross-reference documentation
- **[EU Usage Examples](docs/EU_USAGE_EXAMPLES.md)** -- Practical EU lookup examples
- **[Security Policy](SECURITY.md)** -- Vulnerability reporting and scanning details
- **[Disclaimer](DISCLAIMER.md)** -- Legal disclaimers and professional use notices
- **[Privacy](PRIVACY.md)** -- Client confidentiality and data handling

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Bulgarian-law-mcp
cd Bulgarian-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest statutes from parliament.bg / Lex.bg
npm run build:db            # Rebuild SQLite database
npm run check-updates       # Check for amendments and new statutes
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** 93 MB (efficient, portable)
- **Reliability:** 100% ingestion success rate

---

## More Ansvar MCPs

Full fleet at [ansvar.eu/gateway](https://ansvar.eu/gateway).
## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law expansion (Supreme Court of Cassation, Constitutional Court)
- EU Regulations MCP integration (full EU law text, CJEU case law)
- Historical statute versions and amendment tracking
- Secondary legislation (наредби, правилници)

---

## Roadmap

- [x] Core statute database with FTS5 search
- [x] Full corpus ingestion (1,997 statutes, 17,103 provisions)
- [x] EU law integration tools
- [x] Vercel Streamable HTTP deployment

- [x] Daily freshness checks
- [ ] Case law expansion (ВКС, КС)
- [ ] Historical statute versions (amendment tracking)
- [ ] Secondary legislation expansion

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{bulgarian_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Bulgarian Law MCP Server: Production-Grade Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Bulgarian-law-mcp},
  note = {Comprehensive Bulgarian legal database with 1,997 statutes and 17,103 provisions}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Bulgarian National Assembly / Lex.bg (public domain)
- **EU Metadata:** EUR-Lex (EU public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the European market. This MCP server started as our internal reference tool for Bulgarian law -- turns out everyone building for the Bulgarian and EU markets has the same research frustrations.

So we're open-sourcing it. Navigating 1,997 statutes shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
