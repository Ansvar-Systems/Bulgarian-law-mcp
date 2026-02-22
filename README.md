# Bulgarian Law MCP

[![npm](https://img.shields.io/npm/v/@ansvar/bulgarian-law-mcp)](https://www.npmjs.com/package/@ansvar/bulgarian-law-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Bulgarian-law-mcp/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server providing access to Bulgarian legislation covering data protection, cybersecurity, e-commerce, and criminal law provisions.

**MCP Registry:** `eu.ansvar/bulgarian-law-mcp`
**npm:** `@ansvar/bulgarian-law-mcp`

## Quick Start

### Claude Desktop / Cursor (stdio)

```json
{
  "mcpServers": {
    "bulgarian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/bulgarian-law-mcp"]
    }
  }
}
```

### Remote (Streamable HTTP)

```
bulgarian-law-mcp.vercel.app/mcp
```

## Data Sources

| Source | Authority | License |
|--------|-----------|---------|
| [lex.bg](https://lex.bg) | Народно събрание (National Assembly of Bulgaria) | Bulgarian Government Open Data (public domain under Bulgarian Copyright Act Art. 4) |

> Full provenance: [`sources.yml`](./sources.yml)

## Corpus Coverage

- Official source used for real ingestion: `https://www.parliament.bg/api/v1`
- Discovered laws: `2002`
- Ingested successfully: `1997` (`99.75%`)
- Missing from seed corpus: `5` laws due to official API incomplete payloads

See exact missing act IDs and reasons in:
- [`data/seed/INGESTION_NOTES.md`](./data/seed/INGESTION_NOTES.md)

## Tools

| Tool | Description |
|------|-------------|
| `search_legislation` | Full-text search across provisions |
| `get_provision` | Retrieve specific article/section |
| `validate_citation` | Validate legal citation |
| `check_currency` | Check if statute is in force |
| `get_eu_basis` | EU legal basis cross-references |
| `get_bulgarian_implementations` | National EU implementations |
| `search_eu_implementations` | Search EU documents |
| `validate_eu_compliance` | EU compliance check |
| `build_legal_stance` | Comprehensive legal research |
| `format_citation` | Citation formatting |
| `list_sources` | Data provenance |
| `about` | Server metadata |

## License

Apache-2.0
