# Groq API & Model Reference (Agent Zero Knowledge Base)

## Overview & Quickstart
Groq provides ultra-fast inference powered by Groq LPU (Language Processing Unit) chips, achieving speeds of 280 to 1000+ tokens per second.

### Authentication & Endpoints
- **Base URL**: `https://api.groq.com/openai/v1`
- **Authentication**: `Authorization: Bearer $GROQ_API_KEY`
- **Chat Endpoint**: `POST /v1/chat/completions`
- **Responses Endpoint (Beta)**: `POST /v1/responses`
- **Models Endpoint**: `GET /v1/models`
- **Audio Transcriptions**: `POST /v1/audio/transcriptions`
- **Audio Translations**: `POST /v1/audio/translations`
- **Audio Speech (TTS)**: `POST /v1/audio/speech`
- **Batches**: `POST /v1/batches`, `GET /v1/batches/{id}`
- **Files**: `POST /v1/files`, `GET /v1/files`, `DELETE /v1/files/{id}`

---

## Production Models & Capabilities

| Model ID | Speed (tps) | Context Window | Max Completion | Primary Use Case & Strengths |
| :--- | :--- | :--- | :--- | :--- |
| **`llama-3.3-70b-versatile`** | ~280 | 131,072 | 32,768 | **Primary Strategic Reasoning & Code**: Best general intelligence, complex logic, Python script generation, DeFi analysis, tool synthesis. |
| **`llama-3.1-8b-instant`** | ~560-800 | 131,072 | 131,072 | **Ultra-Fast Real-Time Reflex**: Rapid status checks, token balance parsing, log summarization, lightweight heuristic filters. |
| **`openai/gpt-oss-120b`** | ~500 | 131,072 | 65,536 | **Deep Open Reasoning & Code Execution**: 120B parameter flagship open-weight model with built-in search, code execution & reasoning. |
| **`openai/gpt-oss-20b`** | ~1000 | 131,072 | 65,536 | **High-Throughput Reasoning**: Maximum token throughput (~1000 tps) with reasoning capabilities. |
| **`groq/compound`** | ~450 | 131,072 | 8,192 | **Agentic System**: Built-in web search, code execution and multi-tool orchestration. |
| **`groq/compound-mini`** | ~450 | 131,072 | 8,192 | **Lightweight Agentic System**: Rapid tool-calling and web lookups. |
| **`gemma2-9b-it`** | ~600 | 8,192 | 8,192 | **Google Instruction Tuned**: Compact instruction following and structured JSON parsing. |
| **`mixtral-8x7b-32768`** | ~500 | 32,768 | 32,768 | **MoE Architecture**: Balanced multi-expert reasoning with 32k context. |
| **`whisper-large-v3`** | N/A | 448 | N/A | **Audio Speech-to-Text**: High accuracy audio transcription in 100+ languages. |
| **`whisper-large-v3-turbo`** | N/A | 448 | N/A | **Fast Speech-to-Text**: Low latency audio transcription. |

---

## API Parameters & Best Practices

### Chat Completions (`/v1/chat/completions`)
- `model` (required): Model ID (e.g. `llama-3.3-70b-versatile`)
- `messages` (required): Array of `{"role": "system"|"user"|"assistant"|"tool", "content": "..."}`
- `temperature` (0.0 to 2.0): Lower (0.1 - 0.2) for deterministic code & math; Higher (0.7 - 0.9) for creative exploration.
- `top_p` (0.0 to 1.0): Nucleus sampling; use temperature OR top_p, not both.
- `max_completion_tokens`: Maximum tokens for the generated response.
- `response_format`: `{"type": "json_object"}` or `{"type": "json_schema", "json_schema": {...}}` for guaranteed structured outputs.
- `service_tier`: `auto`, `on_demand`, `flex`.
- `reasoning_effort`: `none`, `low`, `medium`, `high` (supported on reasoning models like `openai/gpt-oss-120b`).
- `stream`: `true` for SSE token streaming.

---

## Rate Limits & Self-Healing Governance

### Metric Definitions
- **RPM**: Requests Per Minute
- **RPD**: Requests Per Day
- **TPM**: Tokens Per Minute (Input + Output combined, prompt cache tokens excluded)
- **TPD**: Tokens Per Day
- **ITPM / OTPM**: Input / Output Tokens Per Minute separate caps

### Standard Free/Dev Rate Limits
- `llama-3.3-70b-versatile`: High throughput production allocation
- `llama-3.1-8b-instant`: Maximum RPM/TPM allocation
- `qwen/qwen3.6-27b`: 30 RPM / 1K RPD / 8K TPM (Preview tier - prone to 429 under high load)
- `openai/gpt-oss-120b` / `20b`: 30 RPM / 1K RPD / 8K TPM / 200K TPD

### Rate Limit Response Headers
- `retry-after`: Seconds to wait before retrying (sent with HTTP 429)
- `x-ratelimit-limit-requests`: RPD quota
- `x-ratelimit-remaining-requests`: Remaining daily requests
- `x-ratelimit-limit-tokens`: TPM quota
- `x-ratelimit-remaining-tokens`: Remaining minute tokens
- `x-ratelimit-reset-tokens`: Seconds until TPM window resets

### Self-Healing Multi-Model Fallback Strategy
1. **Primary Model**: `llama-3.3-70b-versatile` for high-depth planning and Python agent execution.
2. **First Fallback (Speed/Rate-Limit Recovery)**: `llama-3.1-8b-instant` if 70B hits latency or rate limits.
3. **Second Fallback (MoE Diversity)**: `mixtral-8x7b-32768` or `gemma2-9b-it`.
4. **Agentic Tooling**: `groq/compound` for multi-step web search and tool execution.
5. **Blacklist Recovery**: Auto-cooldown with dynamic model querying from `/v1/models`.
