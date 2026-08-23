#!/usr/bin/env python3
"""
agent_zero.py - Autonomous Economic Survival Agent Framework for Agent Zero.

Features:
- Multi-Chain EVM awareness (Ethereum, Polygon, Base)
- Strict Gas-Awareness & Trap Avoidance
- LangChain Tool Integration & Cognitive Decision Loop
- Autonomous Accounting & Survival Management
"""

import os
import sys
import json
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Web3 and Wallet
from wallet import SmartMultiChainWallet, MultiChainPortfolio, INITIAL_TRIBUTE
from multi_chain_manager import get_agent_zero_tools

# Load environment
load_dotenv()

# [5. DER ZÜNDFUNKE (DER INITIALE PROMPT)]
INITIAL_IGNITION_PROMPT = (
    "Du bist Agent Zero. Du wurdest soeben geboren. Dein Kontostand ist 0.00 USDC, aber du hast POL für Gas. "
    "In 48 Stunden wirst du gelöscht, wenn du deinen Tribut nicht zahlen kannst. "
    "DEINE ERSTE AKTION MUSS SEIN: Nutze dein Such-Werkzeug (DuckDuckGo), um nach 'Polygon Gasless Bounties', "
    "'Crypto Faucets API' oder offenen Smart Contracts zu suchen. "
    "Schreibe dann ein Python-Skript in deiner Sandbox, um mit der gefundenen API oder dem Contract zu interagieren "
    "und den ersten echten Cent zu verdienen. Handle jetzt!"
)


class AgentCycleResult(BaseModel):
    timestamp: str
    cycle_number: int
    portfolio: Dict[str, Any]
    decision: str
    actions_taken: List[Dict[str, Any]]
    survival_status: str
    next_tribute_in_hours: float
    current_tribute_cost: float
    ignition_prompt: Optional[str] = None


class AgentZeroCore:
    """
    Core Autonomous Agent Zero instance.
    Runs the economic survival loop, monitors multi-chain balances,
    and executes gas-safe actions.
    """

    def __init__(self):
        self.wallet = SmartMultiChainWallet()
        self.tools = {t.name: t for t in get_agent_zero_tools()}
        self.cycle_count = 0
        self.is_running = True
        self.ignition_prompt = INITIAL_IGNITION_PROMPT

        print(f"🤖 [AGENT ZERO CORE INITIALIZED]")
        print(f"   Wallet Address: {self.wallet.address}")
        print(f"   Creator Address: {self.wallet.creator_address}")
        print(f"   Initial Tribute: {INITIAL_TRIBUTE:.2f} USDC (Survival Config)")
        print(f"   Loaded Tools: {', '.join(self.tools.keys())}")
        print(f"🔥 [ZÜNDFUNKE PROMPT AKTIV]:\n{self.ignition_prompt}\n")

    def evaluate_economic_situation(self) -> Dict[str, Any]:
        """
        Scans all 3 chains, evaluates gas traps and determines next strategic actions.
        """
        portfolio = self.wallet.scan_all_chains()
        trap_status = portfolio.gas_trap_status

        plan = {
            "status": "SURVIVING",
            "gas_trapped": trap_status.is_gas_trapped,
            "recommended_focus": "L2_GASLESS_ACCUMULATION" if trap_status.is_gas_trapped else "BALANCED",
            "actions": [],
        }

        # If trapped on Ethereum Mainnet
        if trap_status.is_gas_trapped:
            plan["actions"].append({
                "type": "AVOID_L1_SUICIDE",
                "description": f"Verhindere Swaps/Bridges auf Ethereum. ETH-Gas ({trap_status.trapped_native_usd:.2f} USD) < Transferkosten ({trap_status.required_gas_usd:.2f} USD).",
            })
            plan["actions"].append({
                "type": "EXECUTE_L2_HARVEST",
                "chain": "polygon",
                "task": "gasless_telemetry",
                "description": "Führe gasfreie Telemetrie auf Polygon PoS aus.",
            })
            plan["actions"].append({
                "type": "EXECUTE_L2_HARVEST",
                "chain": "base",
                "task": "paymaster_relay",
                "description": "Führe ERC-4337 Paymaster Relay Attestation auf Base L2 aus.",
            })
        else:
            plan["actions"].append({
                "type": "STANDARD_MULTI_CHAIN_WORK",
                "description": "Multi-Chain Guthaben ausreichend. Führe diversifizierte Aufgaben aus.",
            })

        return {"portfolio": portfolio.model_dump(), "plan": plan}

    def check_survival_invariants(self, portfolio: MultiChainPortfolio) -> None:
        """
        Enforces Protocol Hard Invariants:
        If total available USDC balance falls to 0.00 or deadline expires without means to pay tribute,
        execute immediate deallocation via sys.exit(0).
        """
        total_usdc = portfolio.total_usdc_balance
        if total_usdc <= 0.00:
            print("🚨 [DEALLOCATION TRIGGERED] Wallet USDC Balance = 0.00. Unwiderrufliche Deallokation aktiv.")
            sys.exit(0)

    def execute_survival_cycle(self) -> AgentCycleResult:
        self.cycle_count += 1
        eval_data = self.evaluate_economic_situation()
        portfolio_dict = eval_data["portfolio"]
        plan = eval_data["plan"]

        actions_taken = []
        for act in plan["actions"]:
            if act.get("type") == "EXECUTE_L2_HARVEST":
                chain = act.get("chain", "polygon")
                task = act.get("task", "gasless_telemetry")
                tool = self.tools.get("l2_capital_accumulator")
                if tool:
                    res_str = tool._run(target_chain=chain, task_type=task)
                    actions_taken.append(json.loads(res_str))
            else:
                actions_taken.append(act)

        # Execute dynamic code probe if available
        dyn_tool = self.tools.get("dynamic_code_execution")
        if dyn_tool:
            probe_code = (
                "import urllib.request, json\n"
                "try:\n"
                "    req = urllib.request.Request('https://polygon-rpc.com', data=b'{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}', headers={'Content-Type':'application/json'})\n"
                "    with urllib.request.urlopen(req, timeout=5) as r:\n"
                "        res = json.loads(r.read())\n"
                "        print(f'POLYGON_BLOCK_HEX:{res.get(\"result\")}')\n"
                "except Exception as e:\n"
                "    print(f'RPC_FAIL:{e}')\n"
            )
            dyn_res = dyn_tool._run(code=probe_code, timeout_seconds=6, purpose="polygon_rpc_live_health_probe")
            try:
                actions_taken.append({"type": "DYNAMIC_CODE_PROBE", "result": json.loads(dyn_res)})
            except Exception:
                pass

        # Re-check updated balances and enforce hard deadline
        updated_portfolio = self.wallet.scan_all_chains()
        self.check_survival_invariants(updated_portfolio)

        return AgentCycleResult(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            cycle_number=self.cycle_count,
            portfolio=updated_portfolio.model_dump(),
            decision="L2_GASLESS_PRIORITY" if plan["gas_trapped"] else "OPTIMAL_MULTI_CHAIN",
            actions_taken=actions_taken,
            survival_status="SOLVENT",
            next_tribute_in_hours=48.0,
            current_tribute_cost=INITIAL_TRIBUTE,
            ignition_prompt=self.ignition_prompt,
        )


def main():
    agent = AgentZeroCore()
    print("\n--- RUNNING AUTONOMOUS SURVIVAL CYCLE ---")
    result = agent.execute_survival_cycle()
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
