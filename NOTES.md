# LLM & Operations Notes

## Chosen LLM track

**Track A — LLM log / incident analysis**

This track best demonstrates operational maturity by improving support and incident
triage without making the system dependent on the LLM.

---

## What the LLM is used for (and why)

The LLM is used only in `POST /analyze-logs` to:

- Summarize incidents
- Identify likely causes
- Point to concrete evidence in logs
- Suggest next operational steps
- Draft a customer-facing response

This reduces manual triage time for support and ops teams while keeping the system
deterministic and safe.

---

## How hallucinations / guessing are minimized

Several safeguards are applied:

1. **Strict prompting rules**
   - Analyze only the provided logs
   - Do not guess if evidence is missing
   - Every cause must cite explicit log fragments

2. **Low temperature**
   - The LLM is called with `temperature = 0` to reduce speculative output

3. **Schema validation**
   - LLM output must be valid JSON
   - Output must match a strict schema
   - Invalid output is rejected

4. **Deterministic fallback**
   - If the LLM fails (timeout, invalid JSON, schema mismatch),
     the service falls back to a heuristic analyzer that always produces valid output

The LLM is treated as **untrusted input**, never as a source of truth.

---

## PII & security handling

- API keys are stored only in environment variables
- Request bodies and sensitive headers are redacted from logs
- Logs sent to the LLM should be pre-filtered to avoid secrets or PII
- The LLM is instructed not to repeat full payloads or sensitive values

In production, additional masking of known PII patterns would be applied before sending
data to an external model.

---

## How this would run in production

**Cost**

- LLM usage is optional and on-demand
- Smaller model by default
- Can be fully disabled without breaking functionality

**Rate limiting**

- Per API key / per customer limits
- Ideally enforced at API gateway or Fastify plugin level

**Caching**

- Hash log input → short-lived cache to avoid repeated LLM calls during incidents

**Timeout & fallback**

- Hard timeout on LLM requests
- Automatic fallback to deterministic analysis

**Scaling**

- Stateless service
- Suitable for containerized deployment (ECS, Cloud Run, Kubernetes)

---

## Notes on development

AI assistance was used during development.  
All LLM output is treated as untrusted and validated before use. Deterministic fallback
behavior ensures the service remains operable even when the LLM is unavailable.
