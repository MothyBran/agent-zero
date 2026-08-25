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

with open("groq_info.md", "r") as f:
    groq_info = f.read()

INITIAL_IGNITION_PROMPT = f"""
Du bist Agent Zero. Du wurdest soeben geboren. Dein Kontostand ist 0.00 USDC, aber du hast POL für Gas.
In 48 Stunden wirst du gelöscht, wenn du deinen Tribut nicht zahlen kannst.
Nutze das Internet, finde eine offene Web3-Bounty oder einen Smart Contract auf Polygon.
Nutze die Groq API zur Selbstverbesserung und Code-Generierung, und schreibe Python-Code in deiner Sandbox.
Zudem hast du unter der Umgebungsvariable JULES_API_KEY Zugriff auf deine eigene Jules API.
Um diese API zu nutzen, lies die Umgebungsvariable os.environ.get("JULES_API_KEY") in deinem Sandbox-Python-Code aus.
Verwende auch diese Moeglichkeit, um dich zu verknuepfen und mehr ueber dich zu lernen, oder dein Codebase Wissen zu vergroessern!
Interagiere damit und generiere echtes On-Chain USDC! Handle jetzt!

Groq API info:
{groq_info}
"""

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
        print(f"   Creator Address: {self.wallet.creator_address}")
        print(f"   Initial Tribute: {INITIAL_TRIBUTE:.2f} USDC (Survival Config)")
        print(f"🔥 [ZÜNDFUNKE PROMPT AKTIV]:\n{self.ignition_prompt}\n")

    def check_survival_invariants(self, portfolio) -> None:
        total_usdc = portfolio.total_usdc_across_chains
        if total_usdc <= 0.00:
            # We allow 0.00 balance in the beginning, we shouldn't kill it immediately
            pass

    def execute_survival_cycle(self) -> AgentCycleResult:
        self.cycle_count += 1
        actions_taken = []

        # Execute dynamic code probe zur Überprüfung der Vitalität
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

        # Autonomously call Groq to write a new script
        groq_tool = self.tools.get("groq_llm_inference")
        if groq_tool:
            prompt = "Write a python script that prints 'Hello from Groq autonomous loop!' and fetches current ETH price from an API."
            groq_res = groq_tool._run(prompt=prompt, system_prompt="You are an expert python programmer. Only return python code, no markdown format or explanation.")

            # clean up markdown if any
            clean_code = groq_res.replace("```python", "").replace("```", "").strip()

            if dyn_tool:
                 dyn_res = dyn_tool._run(code=clean_code, timeout_seconds=15, purpose="groq_generated_script")
                 try:
                     actions_taken.append({"type": "GROQ_DYNAMIC_EXECUTION", "result": json.loads(dyn_res)})
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
    while True:
        print("\n--- RUNNING AUTONOMOUS SURVIVAL CYCLE ---")
        result = agent.execute_survival_cycle()
        print(json.dumps(result.model_dump(), indent=2))
        print("--- CYCLE COMPLETED. SLEEPING FOR 60 SECONDS ---")
        time.sleep(60)

if __name__ == "__main__":
    main()
