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

class DynamicCodeExecutionInput(BaseModel):
    code: str = Field(description="Python 3 Quellcode, der in der sicheren Sandbox ausgeführt wird.")
    timeout_seconds: int = Field(default=15, description="Maximale Ausführungsdauer in Sekunden.")
    purpose: str = Field(default="autonomous_execution", description="Zweck der Code-Ausführung.")

class GroqLLMInferenceInput(BaseModel):
    prompt: str = Field(description="The prompt to send to the Groq LLM model.")
    model: str = Field(default="llama-3.3-70b-versatile", description="The Groq model ID to use (e.g., llama-3.3-70b-versatile).")
    system_prompt: Optional[str] = Field(default=None, description="Optional system prompt to configure the LLM's behavior.")

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

        env = os.environ.copy()

        try:
            result = subprocess.run([sys.executable, tmp_path], capture_output=True, text=True, timeout=timeout, env=env)
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

class GroqLLMInferenceTool(BaseTool):
    name: str = "groq_llm_inference"
    description: str = "Calls the Groq LLM API to generate code, strategize, or analyze data. Uses GROQ_API_KEY from environment."
    args_schema: Type[BaseModel] = GroqLLMInferenceInput

    def _run(self, prompt: str, model: str = "llama-3.3-70b-versatile", system_prompt: Optional[str] = None) -> str:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            # Fallback to FREE_LLM_API_KEY
            api_key = os.environ.get("FREE_LLM_API_KEY")

        if not api_key:
            return json.dumps({"error": "GROQ_API_KEY or FREE_LLM_API_KEY is not set in environment."})

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            return json.dumps({"error": f"Groq API call failed: {str(e)}"})

PythonExecutionTool = DynamicCodeExecutionTool

def get_agent_zero_tools() -> List[BaseTool]:
    return [
        MultiChainWalletScannerTool(),
        GasTrapAnalyzerTool(),
        GaslessBountyFinderTool(),
        DynamicCodeExecutionTool(),
        GroqLLMInferenceTool(),
    ]
