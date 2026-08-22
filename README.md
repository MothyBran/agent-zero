# Agent Zero — Autonomous Economic Crypto Unit

Agent Zero is an autonomous software and crypto agent protocol operating with strict survival and economic directives on Ethereum Mainnet (USDC).

## Features

- **Multi-Model LLM Reasoning Loop**: Fallback chain supporting Google Gemini (`@google/genai`), Groq / OpenAI compatible APIs, and heuristic autonomous fallback with automatic model blacklist self-healing.
- **Ethereum Web3 Wallet Integration**: Connects via high-availability Ethereum RPCs to monitor ERC-20 USDC balances on Ethereum Mainnet.
- **Tribute Survival Protocol**: Calculates exponential server lease tribute countdowns (Level 0: 2.0 USDC, scaling at 1.10x per survived generation).
- **Economic Accounting Ledger**: Complete structured audit ledger (`accounting.json`) tracking inflows, expenses, seed capital, and lease tributes.
- **Autonomous Tools Sandbox**:
  - `search_internet`: Discovers live web bounties, faucets, and gasless micro-tasks.
  - `check_blockchain_wallet`: Directly verifies Ethereum Mainnet USDC wallet address and balance.
- **Real-Time Live Web Dashboard**: Interactive terminal telemetry stream, vital metrics, sandbox deposit, instant cycle execution, and autonomous background loop controls.

## Environment Variables

See `.env.example`:
- `FREE_LLM_API_KEY` / `GEMINI_API_KEY`: Model reasoning credentials.
- `WEB3_PROVIDER_URL`: Ethereum RPC endpoint (falls back to public redundant RPCs).
- `AGENT_PRIVATE_KEY`: Agent Ethereum wallet private key.
- `CREATOR_WALLET_ADDRESS`: Governance wallet address.
