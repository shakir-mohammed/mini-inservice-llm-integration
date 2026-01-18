Chosen LLM track: Spår A — LLM log-/incidentanalys.
Selected because it best demonstrates operational robustness, evidence-based analysis, and safe LLM usage with deterministic fallback under failure conditions.

Configuration
Required environment variables:

env

PORT=3000
API_KEY=dev-secret-key
Optional environment variables for LLM support:

env

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
LLM_TIMEOUT_MS=15000
If OPENAI_API_KEY is not configured, or if the LLM call fails or times out, the service
automatically falls back to deterministic analysis.

Authentication
All endpoints require an API key sent via the request header:

X-API-Key: <API_KEY>
Missing keys result in 401 Unauthorized.
Invalid keys result in 403 Forbidden.

API usage examples
Health check:

bash

curl http://localhost:3000/health \
 -H 'X-API-Key: dev-secret-key'
Ingest event:

bash

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
Status (last 10 minutes):

bash

curl "http://localhost:3000/status?customer_id=abc123" \
 -H 'X-API-Key: dev-secret-key'
Analyze logs (LLM track A):

bash

curl -X POST http://localhost:3000/analyze-logs \
 -H 'Content-Type: application/json' \
 -H 'X-API-Key: dev-secret-key' \
 -d "$(jq -Rs '{logs: .}' logs.sample.txt)"
The analyze-logs endpoint returns structured JSON containing a summary of the incident,
likely causes with explicit evidence from the input logs, suggested next steps, missing
observability, and a draft customer-facing message.

Error handling
The API returns clear and predictable error responses:

400 for validation errors with machine-readable details

401 / 403 for authentication failures

500 only for unexpected internal errors

Logging and observability
The service uses structured logging. Logs include customer_id when available, endpoint,
HTTP status code, and failure reason. LLM execution outcomes (success, timeout, fallback)
are also logged. Sensitive data such as API keys and request bodies are redacted from logs.

Design notes and tradeoffs
Events are stored in-memory and compacted by time to keep the implementation simple and
fast within the timebox. Persistence (for example SQLite or a database) is a deliberate
TODO.

Authentication is implemented using a single API key provided via environment variable
to keep the integration surface minimal.

The LLM is treated as untrusted input. All LLM output must be valid JSON, match a strict
schema, and provide explicit evidence from the input logs. If any of these checks fail,
the service falls back to deterministic analysis to ensure reliability.

Timeouts, schema validation, and fallback behavior ensure the service remains operational
even if the LLM is slow or unavailable.

Test strategy
Manual API contract testing is demonstrated via the curl examples above. Deterministic
fallback guarantees that the analyze-logs endpoint always returns valid output. Unit
tests for time-window logic and schema validation would be the next step, but are out of
scope for the given timebox.

Notes
AI assistance was used during development. All LLM output is treated as untrusted and is
validated before use. Deterministic fallbacks ensure the service remains reliable and
operable even when the LLM is unavailable.
