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
