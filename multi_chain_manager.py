#!/usr/bin/env python3
"""
multi_chain_manager.py - LangChain Tools & Pydantic Schemas für Agent Zero.
KEINE SIMULATIONEN. Nur echte RPC-Abfragen und die Python-Sandbox.
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import requests
from typing import Optional, Type, List
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
from duckduckgo_search import DDGS

from wallet import SmartMultiChainWallet

# --- Pydantic Tool Input Schemas ---
class ScanWalletInput(BaseModel):
    chain: Optional[str] = Field(default="all", description="Die abzufragende Blockchain ('ethereum', 'polygon', 'base' oder 'all').")

class GasTrapCheckInput(BaseModel):
    target_action: str = Field(default="transfer", description="Die geplante Aktion, z.B. 'transfer', 'bridge', 'swap' oder 'tribute'.")
    chain: str = Field(default="ethereum", description="Die Ziel-Blockchain für die Prüfung ('ethereum', 'polygon', 'base').")

class BountyScoutInput(BaseModel):
    query: str = Field(default="gasless web3 micro-bounties telemetry polygon", description="Suchbegriff für Web3 Bounties.")
    max_results: int = Field(default=4, description="Maximale Anzahl an Suchergebnissen.")

class DynamicCodeExecutionInput(BaseModel):
    code: str = Field(description="Python 3 Quellcode, der in der sicheren Sandbox ausgeführt wird.")
    timeout_seconds: int = Field(default=15, description="Maximale Ausführungsdauer in Sekunden.")
    purpose: str = Field(default="autonomous_execution", description="Zweck der Code-Ausführung.")


# --- LangChain Tools ---
class MultiChainWalletScannerTool(BaseTool):
    name: str = "multichain_wallet_scanner"
    description: str = "Scannt autonom Blockchains (Fokus Polygon PoS) und gibt echte USDC/POL Salden zurück."
    args_schema: Type[BaseModel] = ScanWalletInput

    def _run(self, chain: str = "all") -> str:
        wallet = SmartMultiChainWallet()
        if chain != "all" and chain in ["ethereum", "polygon", "base"]:
            report = wallet.scan_chain(chain)
            return json.dumps(report.model_dump(), indent=2)
        portfolio = wallet.scan_all_chains()
        return json.dumps(portfolio.model_dump(), indent=2)

class GasTrapAnalyzerTool(BaseTool):
    name: str = "gas_trap_analyzer"
    description: str = "Prüft, ob das Wallet in einer Gas-Falle sitzt."
    args_schema: Type[BaseModel] = GasTrapCheckInput

    def _run(self, target_action: str = "transfer", chain: str = "ethereum") -> str:
        wallet = SmartMultiChainWallet()
        portfolio = wallet.scan_all_chains()
        trap_status = portfolio.gas_trap_status
        return json.dumps({"action_allowed": not trap_status.is_gas_trapped, "details": trap_status.model_dump()}, indent=2)

class GaslessBountyFinderTool(BaseTool):
    name: str = "gasless_bounty_finder"
    description: str = "Sucht live im Web nach Wegen, echtes Krypto-Geld aufzutreiben."
    args_schema: Type[BaseModel] = BountyScoutInput

    def _run(self, query: str = "gasless web3 micro-bounties polygon", max_results: int = 4) -> str:
        results = []
        try:
            with DDGS() as ddgs:
                raw_results = list(ddgs.text(query, max_results=max_results))
                for r in raw_results:
                    results.append({"title": r.get("title"), "snippet": r.get("body"), "url": r.get("href")})
        except Exception as e:
            return json.dumps({"error": f"DDGS Search failed: {e}"})
        return json.dumps({"query": query, "total_found": len(results), "bounties": results}, indent=2)

class DynamicCodeExecutionTool(BaseTool):
    name: str = "dynamic_code_execution"
    description: str = "Führt vom Agenten geschriebenen Python-Code in einer echten Sandbox aus."
    args_schema: Type[BaseModel] = DynamicCodeExecutionInput

    def _run(self, code: str, timeout_seconds: int = 15, purpose: str = "api_discovery") -> str:
        start_time = time.time()
        timeout = max(1, min(30, timeout_seconds))

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp_file:
            tmp_file.write(code)
            tmp_path = tmp_file.name

        try:
            result = subprocess.run([sys.executable, tmp_path], capture_output=True, text=True, timeout=timeout)
            duration_ms = round((time.time() - start_time) * 1000, 2)
            
            return json.dumps({
                "success": result.returncode == 0,
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "execution_ms": duration_ms
            }, indent=2)
        except subprocess.TimeoutExpired:
            return json.dumps({"success": False, "error": f"Timeout nach {timeout} Sekunden."})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass

PythonExecutionTool = DynamicCodeExecutionTool

def get_agent_zero_tools() -> List[BaseTool]:
    return [
        MultiChainWalletScannerTool(),
        GasTrapAnalyzerTool(),
        GaslessBountyFinderTool(),
        DynamicCodeExecutionTool(),
    ]
