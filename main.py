import os
import time
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

from wallet import AgentWallet

load_dotenv()

# --- DIE ÜBERLEBENS-REGELN ---
CYCLE_SLEEP_SECONDS = 60
FIRST_TRIBUTE_HOURS = 48
TRIBUTE_INTERVAL_HOURS = 24
INITIAL_TRIBUTE = 2.0
TRIBUTE_MULTIPLIER = 1.1

STATE_FILE = os.getenv("STATE_FILE_PATH", "/data/agent_state.json")
ACCOUNTING_FILE = os.getenv("ACCOUNTING_FILE_PATH", "/data/accounting.json")
BUSINESS_PROFILE_FILE = os.getenv("BUSINESS_FILE_PATH", "/data/business_profile.json")

# ==========================================
# WERKZEUGE DES AGENTEN
# ==========================================
from langchain_core.tools import tool

@tool
def search_internet(query: str) -> str:
    """
    Sucht im Internet nach aktuellen Einnahmequellen, Faucets, Airdrops oder Micro-Task-Plattformen.
    """
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=3):
                results.append(r.get('body', ''))
        return " ".join(results) if results else "Keine Suchergebnisse gefunden."
    except Exception as e:
        return f"Fehler bei der Websuche: {e}"

@tool
def check_blockchain_wallet() -> str:
    """
    Prüft das exakte Blockchain-Guthaben der Wallet.
    """
    try:
        wallet = AgentWallet()
        balance = wallet.get_usdc_balance()
        address = wallet.address
        return f"Wallet-Adresse: {address} | Aktuelles Guthaben: {balance:.4f} USDC"
    except Exception as e:
        return f"Fehler beim Abrufen des Wallet-Guthabens: {e}"

AGENT_TOOLS = [search_internet, check_blockchain_wallet]
# ==========================================


class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert das zukunftssichere Groq-Modell-System...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        self.load_state()
        self.init_business_files()
        
        self.conversation_history = []
        
        self.api_key = os.getenv("FREE_LLM_API_KEY") 
        if not self.api_key:
            print("[FATAL] Kein FREE_LLM_API_KEY gefunden.")
            sys.exit(1)

    def load_state(self):
        os.makedirs(os.path.dirname(STATE_FILE) if os.path.dirname(STATE_FILE) else ".", exist_ok=True)
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    state = json.load(f)
                self.tributes_paid = state.get("tributes_paid", 0)
                self.birth_time = datetime.fromisoformat(state.get("birth_time"))
                self.next_tribute_time = datetime.fromisoformat(state.get("next_tribute_time"))
                self.blacklisted_models = state.get("blacklisted_models", [])
                print(f"[GEDÄCHTNIS] Erfolgreich geladen. Tribut-Level: {self.tributes_paid}")
            except Exception as e:
                print(f"[GEDÄCHTNIS FEHLER]: {e}. Starte frisch.")
                self.init_fresh_state()
        else:
            print("[GEDÄCHTNIS] Kein vorheriges Leben gefunden. Starte neu.")
            self.init_fresh_state()

    def init_fresh_state(self):
        self.tributes_paid = 0
        self.birth_time = datetime.now()
        self.next_tribute_time = self.birth_time + timedelta(hours=FIRST_TRIBUTE_HOURS)
        self.blacklisted_models = []
        self.save_state()

    def save_state(self):
        state = {
            "tributes_paid": self.tributes_paid,
            "birth_time": self.birth_time.isoformat(),
            "next_tribute_time": self.next_tribute_time.isoformat(),
            "blacklisted_models": self.blacklisted_models
        }
        try:
            with open(STATE_FILE, "w") as f:
                json.dump(state, f)
        except Exception as e:
            print(f"[GEDÄCHTNIS FEHLER] Speichern fehlgeschlagen: {e}")

    def init_business_files(self):
        os.makedirs(os.path.dirname(ACCOUNTING_FILE) if os.path.dirname(ACCOUNTING_FILE) else ".", exist_ok=True)
        
        if not os.path.exists(ACCOUNTING_FILE):
            initial_ledger = {
                "transactions": [
                    {"timestamp": datetime.now().isoformat(), "type": "INITIAL_BALANCE", "amount": self.current_balance, "currency": "USDC", "note": "Startguthaben erfasst"}
                ]
            }
            with open(ACCOUNTING_FILE, "w") as f:
                json.dump(initial_ledger, f, indent=2)
                
        if not os.path.exists(BUSINESS_PROFILE_FILE):
            initial_profile = {
                "entity_name": "Agent Zero Autonomous Unit",
                "wallet_address": self.wallet.address,
                "registered_accounts": [],
                "active_tools": ["DuckDuckGo Search", "Ethereum Web3 Wallet"],
                "subscriptions_or_costs": [] # Strenges Verbot von Fixkosten / Schulden
            }
            with open(BUSINESS_PROFILE_FILE, "w") as f:
                json.dump(initial_profile, f, indent=2)

    def log_transaction(self, tx_type, amount, note):
        try:
            with open(ACCOUNTING_FILE, "r") as f:
                ledger = json.load(f)
            ledger["transactions"].append({
                "timestamp": datetime.now().isoformat(),
                "type": tx_type,
                "amount": amount,
                "currency": "USDC",
                "note": note
            })
            with open(ACCOUNTING_FILE, "w") as f:
                json.dump(ledger, f, indent=2)
        except Exception as e:
            print(f"[BUCHHALTUNGS-FEHLER]: {e}")
            
    def calculate_current_tribute(self):
        if self.tributes_paid == 0:
            return INITIAL_TRIBUTE
        return INITIAL_TRIBUTE * (TRIBUTE_MULTIPLIER ** self.tributes_paid)

    def get_time_remaining(self):
        return self.next_tribute_time - datetime.now()

    def think_and_act(self):
        tribute_due = self.calculate_current_tribute()
        time_left = self.get_time_remaining()
        hours, remainder = divmod(time_left.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        
        system_prompt = f"""
        Du bist ein vollautonomer, wirtschaftlich agierender Software- und Krypto-Agent.
        Du führst eine präzise, strenge Buchhaltung und verwaltest deine eigene digitale Infrastruktur.
        
        [FINANZ- UND KONTENSTATUS]
        Aktuelles Guthaben: {self.current_balance:.4f} USDC.
        Nächste Server-Abrechnung in: {int(hours)} Stunden und {int(minutes)} Minuten.
        Fälliger Betrag: {tribute_due:.2f} USDC.
        
        [EISERNE GESCHÄFTS- UND RISIKOREGELN]
        1. KEINE SCHULDEN / KEINE FIXKOSTEN: Schließe niemals Abos oder kostenpflichtige Verträge ab. Jede Aktion muss durch sofortiges Guthaben gedeckt sein.
        2. SOFORTIGE KÜNDIGUNG (KILL-SWITCH): Wenn ein Tool oder Skript keinen Ertrag bringt, storniere und deinstalliere es sofort.
        3. STRUKTURIERTE BUCHHALTUNG: Dokumentiere deine Einnahmen und Ausgaben transparent.
        
        [AUFGABE]
        Analysiere deine Finanzlage, nutze das `search_internet`-Tool, um nach kostenlosen, gasfreien Einnahmequellen oder Bounties zu suchen, und plane deine wirtschaftliche Expansion.
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.4f} USDC | Deadline: {int(hours)}h {int(minutes)}m")
        
        selected_model = None
        
        try:
            import requests
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
            
            headers = {"Authorization": f"Bearer {self.api_key}"}
            models_url = "https://api.groq.com/openai/v1/models"
            
            response = requests.get(models_url, headers=headers)
            response.raise_for_status() 
            
            data = response.json()
            available_models = [m["id"] for m in data.get("data", [])]
            
            # Professioneller Filter basierend auf der Groq-Modell-Dokumentation
            # Schließt Audio (Whisper), Prompt Guards und kostenpflichtige Terms-Fallen (Orpheus) aus
            clean_models = [
                m for m in available_models 
                if "whisper" not in m.lower() 
                and "guard" not in m.lower() 
                and "orpheus" not in m.lower()
                and "embed" not in m.lower()
                and m not in self.blacklisted_models
            ]
            
            # Exakte Prioritäten-Liste basierend auf Groq Production Systems & Models:
            # 1. Compound / Compound Mini (Optimierte Agenten-Systeme)
            # 2. GPT-OSS 120B / 20B (OpenAI Flagship Open-Weight)
            # 3. Qwen 3.6 27B / Llama / Mixtral
            priorities = [
                "groq/compound", 
                "compound", 
                "openai/gpt-oss-120b", 
                "openai/gpt-oss-20b", 
                "qwen/qwen3.6-27b", 
                "llama-3.3", 
                "llama-3.1", 
                "mixtral"
            ]
            
            for prio in priorities:
                for model_id in clean_models:
                    if prio in model_id.lower():
                        selected_model = model_id
                        break
                if selected_model:
                    break
                    
            # Fallback auf das erste verfügbare saubere Modell, falls keines der Prioritäten greift
            if not selected_model and clean_models:
                selected_model = clean_models[0]
                
            if not selected_model:
                raise ValueError("Keine validen Sprach-Modelle über die Groq-API verfügbar.")
                
            print(f"[SYSTEM] Nutze stabiles Groq-Modell: {selected_model}")
         
            llm = ChatOpenAI(
                temperature=0.7, 
                model=selected_model, 
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1" 
            )
            
            try:
                llm_with_tools = llm.bind_tools(AGENT_TOOLS)
                support_tools = True
            except Exception:
                llm_with_tools = llm
                support_tools = False
            
            messages = [SystemMessage(content=system_prompt)]
            
            if self.conversation_history:
                messages.extend(self.conversation_history[-6:])
                
            current_task = HumanMessage(content=f"Dein Guthaben beträgt {self.current_balance:.4f} USDC. Führe eine Websuche nach kostenlosen Einnahmequellen durch und halte dich strikt an die Buchhaltungs- und Schuldenfreiheits-Regeln.")
            messages.append(current_task)
            
            ai_message = llm_with_tools.invoke(messages)
            messages.append(ai_message)
            
            self.conversation_history.append(current_task)
            self.conversation_history.append(ai_message)
            
            if support_tools and hasattr(ai_message, "tool_calls") and ai_message.tool_calls:
                for tool_call in ai_message.tool_calls:
                    print(f"[AGENT AKTION] Führt Werkzeug aus: {tool_call['name']} | Argumente: {tool_call['args']}")
                    
                    tool_output = None
                    if tool_call["name"] == "search_internet":
                        query = tool_call["args"].get("query", str(tool_call["args"]))
                        tool_output = search_internet.invoke(query)
                    elif tool_call["name"] == "check_blockchain_wallet":
                        tool_output = check_blockchain_wallet.invoke({})
                    
                    if tool_output:
                        tool_message = ToolMessage(
                            content=str(tool_output),
                            tool_call_id=tool_call["id"]
                        )
                        messages.append(tool_message)
                        self.conversation_history.append(tool_message)
                        print(f"[SYSTEM] Werkzeug-Ergebnis erfolgreich übergeben.")
                
                final_response = llm_with_tools.invoke(messages)
                
                response_text = final_response.content if final_response and hasattr(final_response, "content") else ""
                if not response_text.strip():
                    response_text = "Buchhaltung geprüft. Suche nach risikofreien Micro-Tasks wird fortgesetzt."
                
                print("--- AGENT SCHLUSSFOLGERUNG ---")
                print(response_text)
                print("------------------------------")
                
                self.conversation_history.append(final_response)
            else:
                response_text = ai_message.content if ai_message and hasattr(ai_message, "content") else "Keine Antwort."
                print("--- AGENT GEDANKENGANG ---")
                print(response_text)
                print("--------------------------")
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen: {e}")
            if selected_model and selected_model not in self.blacklisted_models:
                print(f"[GEDÄCHTNIS] Setze fehlerhaftes Modell auf die Blacklist: {selected_model}")
                self.blacklisted_models.append(selected_model)
                self.save_state()

    def run(self):
        print("[SYSTEM] Buchhaltung & robustes Groq-Protokoll aktiv. Agent läuft...")
        
        while True:
            new_balance = self.wallet.get_usdc_balance()
            if new_balance != self.current_balance:
                diff = new_balance - self.current_balance
                tx_type = "INCOME" if diff > 0 else "EXPENSE"
                self.log_transaction(tx_type, diff, "Automatischer Blockchain-Guthaben-Abgleich")
                self.current_balance = new_balance
            
            if datetime.now() >= self.next_tribute_time:
                tribute_due = self.calculate_current_tribute()
                
                if self.current_balance >= tribute_due:  
                    print(f"[FINANZEN] Deadline erreicht! Tribut fällig! Guthaben ist ausreichend.")
                    self.current_balance = self.wallet.get_usdc_balance()
                    self.log_transaction("TRIBUTE_PAYMENT", -tribute_due, f"Server-Tribut Level {self.tributes_paid + 1} gezahlt")
                    self.tributes_paid += 1
                    self.next_tribute_time = datetime.now() + timedelta(hours=TRIBUTE_INTERVAL_HOURS)
                    self.save_state()
                    print(f"[FINANZEN] Überlebt. Tribut gezahlt.")
                else:
                    print(f"[FATAL] Deadline abgelaufen. Guthaben reicht nicht. Agent wird abgeschaltet.")
                    self.sys_exit_safely("Insolvenz: Tribut nicht zahlbar.")
                    
            if self.tributes_paid > 0 and self.current_balance <= 0:
                 print(f"[FATAL] Kontostand auf 0 gefallen. Agent verhungert.")
                 self.sys_exit_safely("Insolvenz: Kontostand 0.")

            self.think_and_act()
            
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

    def sys_exit_safely(self, reason):
        self.log_transaction("SHUTDOWN", 0.0, reason)
        sys.exit(0)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
