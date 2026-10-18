# BetMatrix AI — Hollywoodbets Intelligent Betting Engine

BetMatrix is an evidence-first betting ledger, fixture-ingestion and risk-analysis application.

## Data integrity rules

- Production starts with **no fabricated tickets, fixtures, odds, bankroll, win rates or AI conclusions**.
- A ticket number by itself is treated as an identifier, not proof of ticket contents.
- Team trap/anchor classifications must come from the user's supplied settled-ticket ledger or an explicitly verified data source.
- Missing bookmaker fields remain unavailable rather than being replaced with defaults.
- AI output is advisory and must not be presented as guaranteed outcomes or financial advice.
- Live fixture data must carry source/provenance information; when the official source cannot be retrieved, the app returns no verified fixture instead of inventing one.

## Development

`npm install`

`npm run typecheck`

`npm run build`

`npm start`

The production build creates both the Vite client and a bundled Express server at `dist/server.cjs`.

## Required configuration

Copy `.env.example` to `.env` and configure `GEMINI_API_KEY` if AI-assisted analysis is desired. The application remains usable for ledger management and deterministic calculations without Gemini.

## Verified-data layer

The application now has a separate evidence store at data/verified-data.json and a source-adapter layer.

- **Bookmaker/source adapters:** configured documented feeds can be synchronised through POST /api/verified-data/sync-fixtures. Adapters never manufacture missing odds.
- **Fixture provenance:** every verified fixture carries source ID, source name, source type, retrieval time and evidence status.
- **Ticket verification:** POST /api/verified-data/verify-ticket requires actual ticket content. A ticket number alone cannot verify ownership or contents.
- **Historical-result ingestion:** POST /api/verified-data/ingest-results accepts actual settled results and records their provenance.
- **Evidence scoring:** /api/verified-data/predict/:fixtureId derives 1X2 probabilities from supplied verified odds and reports evidence quality/risk separately. It does not claim predictive certainty.
- **Data status:** GET /api/verified-data/status reports fixture/result/ticket counts, configured adapters and a canonical data hash.

### Source configuration

The supported adapter framework currently covers configured Hollywoodbets feeds, SportMonks and TheRundown endpoints. Provider URLs and API keys belong in environment configuration. The engine does not use bookmaker account passwords, session cookies or private ticket pages.

### What remains unknown

If no authorised source is configured, live bookmaker data remains unavailable. If odds or results are incomplete, the engine returns UNKNOWN/null rather than inventing values. A successful build or health check does not mean that live sports data is available.


### Optional Unified Football Intelligence ticket sync

BetMatrix can manually push pending tickets from its persistent app ledger to the Unified Football Intelligence service. This is separate from the verified-data evidence ledger.

Configure these server-side environment variables:

- `LEDGER_ADMIN_TOKEN`: authorizes the push action (and the existing ledger-reset operation).
- `UNIFIED_FOOTBALL_INTELLIGENCE_URL`: the HTTPS origin of the deployed Unified Football Intelligence app.
- `UNIFIED_TICKET_IMPORT_TOKEN`: must equal `PROVIDER_DIAGNOSTICS_TOKEN` on the Unified service.

Then open **Verified Data Centre**, enter the ledger admin token, and select **Push pending tickets**. The server sends batches of at most 50 tickets, with a maximum of 500 pending tickets per action. The admin token is not stored in browser storage.

Unified accepts only pending tickets whose supported market/pick can be normalized and whose provider fixture IDs all resolve to the same current, corroborated, identity-reviewed canonical fixture. Unsupported markets, missing provider IDs, unresolved mappings and conflicts are rejected rather than matched by team names. Repeated imports are idempotent.

The source ticket's settled status, bookmaker odds and model claims are not trusted by Unified. Imported tickets remain pending and settle only when Unified has verified canonical result evidence. A rejected import is not proof that the ticket or fixture is invalid; it means the required canonical evidence or supported mapping is missing.
