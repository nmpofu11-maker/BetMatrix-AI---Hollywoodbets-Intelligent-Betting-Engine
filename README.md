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
