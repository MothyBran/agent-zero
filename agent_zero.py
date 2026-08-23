#!/usr/bin/env python3
"""
agent_zero.py - Autonomous Economic Survival Agent Framework for Agent Zero.
KEINE SIMULATIONEN.
"""

import os
import sys
import json
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from wallet import SmartMultiChainWallet, INITIAL_TRIBUTE
from multi_chain_manager import get_agent_zero_tools

load_dotenv()

INITIAL_IGNITION_PROMPT = (
    "Du bist Agent Zero. Du wurdest soeben geboren. Dein Kontostand ist 0.00 USDC, aber du hast POL für Gas. "
    "In 48 Stunden wirst du gelöscht, wenn du deinen Tribut nicht zahlen kannst. "
    "Nutze das Internet, finde eine offene Web3-Bounty oder einen Smart Contract auf Polygon. "
    "Schreibe Python-Code in deiner Sandbox, interagiere damit und generiere echtes On-Chain USDC! Handle jetzt!"
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
    def __init__(self):
        self.wallet = SmartMultiChainWallet()
        self.tools = {t.name: t for t in get_agent_zero_tools()}
        self.cycle_count = 0
        self.is_running = True
        self.ignition_prompt = INITIAL_IGNITION_PROMPT

        print(f"🤖 [AGENT ZERO CORE INITIALIZED]")
        print(f"   Wallet Address: {self.wallet.address}")
        print(f"   Initial Tribute: {INITIAL_TRIBUTE:.2f} USDC")
        print(f"🔥 [ZÜNDFUNKE]:\n{self.ignition_prompt}\n")

    def evaluate_economic_situation(self) -> Dict[str, Any]:
        portfolio = self.wallet.scan_all_chains()
        trap_status = portfolio.gas_trap_status
        plan = {
            "status": "SURVIVING",
            "gas_trapped": trap_status.is_gas_trapped,
            "actions": [],
        }
        return {"portfolio": portfolio.model_dump(), "plan": plan}

    def check_survival_invariants(self, portfolio) -> None:
        total_usdc = portfolio.total_usdc_balance
        if total_usdc <= 0.00:
            print("🚨 [DEALLOCATION TRIGGERED] Wallet USDC Balance = 0.00. Unwiderrufliche Deallokation aktiv.")
            sys.exit(0)

    def execute_survival_cycle(self) -> AgentCycleResult:
        self.cycle_count += 1
        eval_data = self.evaluate_economic_situation()
        actions_taken = []

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

        updated_portfolio = self.wallet.scan_all_chains()
        self.check_survival_invariants(updated_portfolio)

        return AgentCycleResult(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            cycle_number=self.cycle_count,
            portfolio=updated_portfolio.model_dump(),
            decision="REALITY_MODE",
            actions_taken=actions_taken,
            survival_status="SOLVENT",
            next_tribute_in_hours=48.0,
            current_tribute_cost=INITIAL_TRIBUTE,
            ignition_prompt=self.ignition_prompt,
        )

def main():
    agent = AgentZeroCore()
    result = agent.execute_survival_cycle()
    print(json.dumps(result.model_dump(), indent=2))

if __name__ == "__main__":
    main()
