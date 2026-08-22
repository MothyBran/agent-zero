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


class AgentCycleResult(BaseModel):
    timestamp: str
    cycle_number: int
    portfolio: Dict[str, Any]
    decision: str
    actions_taken: List[Dict[str, Any]]
    survival_status: str
    next_tribute_in_hours: float
    current_tribute_cost: float


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

        print(f"🤖 [AGENT ZERO CORE INITIALIZED]")
        print(f"   Wallet Address: {self.wallet.address}")
        print(f"   Creator Address: {self.wallet.creator_address}")
        print(f"   Initial Tribute: {INITIAL_TRIBUTE:.2f} USDC (Survival Config)")
        print(f"   Loaded Tools: {', '.join(self.tools.keys())}")

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

        # Re-check updated balances
        updated_portfolio = self.wallet.scan_all_chains()

        return AgentCycleResult(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            cycle_number=self.cycle_count,
            portfolio=updated_portfolio.model_dump(),
            decision="L2_GASLESS_PRIORITY" if plan["gas_trapped"] else "OPTIMAL_MULTI_CHAIN",
            actions_taken=actions_taken,
            survival_status="SOLVENT",
            next_tribute_in_hours=48.0,
            current_tribute_cost=INITIAL_TRIBUTE,
        )


def main():
    agent = AgentZeroCore()
    print("\n--- RUNNING AUTONOMOUS SURVIVAL CYCLE ---")
    result = agent.execute_survival_cycle()
    print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
