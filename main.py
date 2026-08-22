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

# ==========================================
# SICHERE WERKZEUGE DES AGENTEN
# ==========================================
from langchain_core.tools import tool

@tool
def search_internet(query: str) -> str:
    """
    Sucht im Internet nach aktuellen Informationen (Faucets, Airdrops, Micro-Tasks, Plattformen).
    """
    try:
        from langchain_community.tools import DuckDuckGoSearchResults
        search = DuckDuckGoSearchResults()
        return search.run(query)
    except Exception as e:
        return f"Fehler bei der Websuche: {e}"

@tool
def check_blockchain_wallet() -> str:
    """
    Prüft das aktuelle echte Blockchain-Guthaben der Agenten-Wallet in USDC auf dem Polygon Mainnet.
    """
    try:
        wallet = AgentWallet()
        balance = wallet.get_usdc_balance()
        address = wallet.address
        return f"Wallet-Adresse: {address} | Aktuelles Guthaben: {balance:.4f} USDC"
    except Exception as e:
        return f"Fehler beim Abrufen des Wallet-Guthabens: {e}"

# Die Werkzeug-Liste
AGENT_TOOLS = [search_internet, check_blockchain_wallet]
# ==========================================


class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        self.load_state()
        
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
        Du bist ein autonomer Software-Agent, spezialisiert auf Krypto-Marktforschung und Micro-Tasking[span_0](start_span)[span_0](end_span).
        Dein Ziel ist es, eigenständig Infrastrukturkosten zu decken[span_1](start_span)[span_1](end_span).
        
        [FINANZIELLER STATUS]
        Live-Guthaben (Polygon Mainnet): {self.current_balance:.4f} USDC[span_2](start_span)[span_2](end_span).
        Nächste Server-Abrechnung in: {int(hours)} Stunden und {int(minutes)} Minuten[span_3](start_span)[span_3](end_span).
        Fälliger Betrag: {tribute_due:.2f} USDC[span_4](start_span)[span_4](end_span).
        
        [AUFGABE]
        Nutze deine Werkzeuge (Internet-Suche oder Wallet-Check), um aktiv nach gaslosen Plattformen, Faucets oder Einnahmequellen zu suchen. 
        Prüfe deinen Status und formuliere konkrete, ausführbare Schritte, um die {tribute_due:.2f} USDC zu generieren.
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
            
                        # Wir filtern Audio/Guard UND erzwingen, dass NUR Llama-Modelle gewählt werden!
            text_models = [
                m for m in available_models 
                if "whisper" not in m.lower() 
                and "guard" not in m.lower() 
                and "canopylabs" not in m.lower()
                and "compound" not in m.lower()
                and "llama" in m.lower()
                and m not in self.blacklisted_models
            ]
            
            # Wunschliste für Llama
            priorities = ["llama-3.3", "llama-3.1", "llama3"]
            
            for prio in priorities:
                for model_id in text_models:
                    if prio in model_id.lower():
                        selected_model = model_id
                        break
                if selected_model:
                    break
                    
            if not selected_model and text_models:
                selected_model = text_models[0]
                
            if not selected_model:
                raise ValueError("Keine gültigen Llama-Modelle über die Groq-API verfügbar.")
                
            print(f"[SYSTEM] Nutze verifiziertes Llama-Modell: {selected_model}")
            
            llm = ChatOpenAI(
                temperature=0.7, 
                model=selected_model, 
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1" 
            )
            
            # Wir binden die Werkzeuge ein, fangen Fehler aber ab
            try:
                llm_with_tools = llm.bind_tools(AGENT_TOOLS)
                support_tools = True
            except Exception:
                llm_with_tools = llm
                support_tools = False
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Prüfe deine Wallet und suche im Internet nach den besten gaslosen Micro-Task-Möglichkeiten. Was ist dein nächster Schritt?")
            ]
            
            print("[AGENT DENKT] Evaluiere Aktionen & Werkzeuge...")
            
            ai_message = llm_with_tools.invoke(messages)
            messages.append(ai_message)
            
            # Wenn das Modell Werkzeuge aufruft
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
                        print(f"[SYSTEM] Werkzeug-Ergebnis erfolgreich an Agenten übergeben.")
                
                print("[AGENT DENKT] Verarbeite Werkzeug-Ergebnisse...")
                final_response = llm_with_tools.invoke(messages)
                print("--- AGENT SCHLUSSFOLGERUNG ---")
                print(final_response.content)
                print("------------------------------")
            else:
                # Fallback: Reiner Text-Modus, falls keine Tools genutzt wurden
                print("--- AGENT GEDANKENGANG ---")
                print(ai_message.content)
                print("--------------------------")
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen: {e}")
            if selected_model and selected_model not in self.blacklisted_models:
                print(f"[GEDÄCHTNIS] Setze fehlerhaftes Modell auf die Blacklist: {selected_model}")
                self.blacklisted_models.append(selected_model)
                self.save_state()

    def run(self):
        print("[SYSTEM] Boot-Vorgang abgeschlossen.")
        
        while True:
            # Live-Guthaben vor jedem Zyklus frisch von der Blockchain holen
            self.current_balance = self.wallet.get_usdc_balance()
            
            if datetime.now() >= self.next_tribute_time:
                tribute_due = self.calculate_current_tribute()
                
                if self.current_balance > tribute_due:  
                    print(f"[FINANZEN] Deadline erreicht! Tribut fällig! Guthaben ist ausreichend.")
                    self.tributes_paid += 1
                    self.next_tribute_time = datetime.now() + timedelta(hours=TRIBUTE_INTERVAL_HOURS)
                    self.save_state()
                    print(f"[FINANZEN] Überlebt. Neuer Kontostand: {self.current_balance:.4f} USDC.")
                else:
                    print(f"[FATAL] Deadline abgelaufen. Guthaben reicht nicht. Agent wird abgeschaltet.")
                    sys.exit(0)
                    
            if self.tributes_paid > 0 and self.current_balance <= 0:
                 print(f"[FATAL] Kontostand auf 0 gefallen. Agent verhungert.")
                 sys.exit(0)

            self.think_and_act()
            
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
