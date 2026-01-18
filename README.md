# Mini-integration + LLM-assisted support & ops (TypeScript / Node.js)

This project implements a small but operable integration service focused on robust APIs,
operational thinking, and safe, mature use of LLMs. The goal is to demonstrate how to
build a minimal integration surface that can be run, monitored, and supported in
practice, rather than to build a feature-complete system.

The service provides event ingestion with strict validation and API-key authentication,
lightweight operational status per customer, health checks suitable for monitoring, and
LLM-assisted log / incident analysis with deterministic fallback behavior.

## Endpoints

- POST /events – Ingest customer events with strict schema validation
- GET /status?customer_id=... – Returns basic metrics for the last 10 minutes
- GET /health – Health and configuration checks
- POST /analyze-logs – Structured incident analysis (LLM-assisted, deterministic fallback)

## Requirements

- Node.js 20+
- npm

## Setup and run locally

```bash
cp .env.example .env
npm install
npm run dev
The service starts on http://localhost:3000.
```

The service starts on:
http://localhost:3000

Authentication

All endpoints require an API key:

X-API-Key: <API_KEY>

Missing key → 401 Unauthorized

Invalid key → 403 Forbidden

How to test (examples)
Health check
curl http://localhost:3000/health \
 -H 'X-API-Key: dev-secret-key'

Ingest event
curl -X POST http://localhost:3000/events \
 -H 'Content-Type: application/json' \
 -H 'X-API-Key: dev-secret-key' \
 -d '{
"customer_id": "abc123",
"timestamp": "2026-01-18T10:00:00Z",
"type": "order_created",
"payload": {
"order_id": "o-991",
"amount": 123.45
}
}'

Status (last 10 minutes)
curl "http://localhost:3000/status?customer_id=abc123" \
 -H 'X-API-Key: dev-secret-key'

Analyze logs (LLM track A)
curl -X POST http://localhost:3000/analyze-logs \
 -H 'Content-Type: application/json' \
 -H 'X-API-Key: dev-secret-key' \
 -d "$(jq -Rs '{logs: .}' logs.sample.txt)"

Error handling

400 – Validation errors (machine-readable details)

401 / 403 – Authentication errors

500 – Unexpected internal errors only

Design choices & tradeoffs

In-memory storage is used to keep the implementation simple and fast within the
given timebox. Persistence (e.g. SQLite or a database) is a deliberate TODO.

Single API-key authentication keeps the integration surface minimal.

Strict schema validation ensures predictable behavior and clear errors.

Structured logging enables support and ops use without additional tooling.
