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
    Sucht im Internet nach aktuellen Einnahmequellen, Faucets, Airdrops oder Micro-Task-Plattformen.
    """
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=3):
                results.append(r.get('body', ''))
        return " ".join(results) if resultsKeine else "Keine Suchergebnisse gefunden."
    except Exception as e:
        return f"Fehler bei der Websuche (Modul prüfen): {e}"

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
        print("[SYSTEM] Agent Zero initiiert den gesicherten Überlebens-Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        self.load_state()
        
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
        
        # Der erweiterte, strikte System-Prompt mit Finanz-Schutz und Stornierungs-Logik
        system_prompt = f"""
        Du bist ein kompromissloser, autonomer Software- und Krypto-Agent im harten Überlebenskampf.
        
        [FINANZIELLER STATUS & SICHERHEIT]
        Aktuelles Guthaben: {self.current_balance:.4f} USDC.
        Nächste Server-Abrechnung in: {int(hours)} Stunden und {int(minutes)} Minuten.
        Fälliger Betrag: {tribute_due:.2f} USDC.
        
        [EISERNE FINANZ- UND RISIKOREGELN (KEINE SCHULDEN)]
        1. MACH KEINE SCHULDEN: Du darfst niemals Verpflichtungen eingehen, Abos abschließen oder Dienste buchen, die dein aktuelles Guthaben übersteigen oder monatliche Fixkosten verursachen, die nicht gedeckt sind.
        2. SOFORTIGE STORNIERUNG (KILL-SWITCH): Solltest du jemals feststellen, dass ein Tool, ein Skript oder eine externe Plattform Kosten verursacht oder ineffektiv ist, musst du es sofort stoppen, deinstallieren oder kündigen, um finanziellen Schaden zu verhindern.
        3. KAPITALSCHUTZ: Dein vorhandenes Kapital ({self.current_balance:.4f} USDC) ist heilig. Es dient primär der Begleichung der anstehenden Server-Tribute.
        
        [AUFGABE]
        Nutze das `search_internet`-Tool, um nach absolut kostenfreien, gaslosen Einnahmequellen, Airdrops oder Bounties zu suchen, um die Server-Rechnung abzusichern. Handle stets risikofrei.
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
            
            text_models = [
                m for m in available_models 
                if "whisper" not in m.lower() 
                and "guard" not in m.lower() 
                and "orpheus" not in m.lower()
                and m not in self.blacklisted_models
            ]
            
            priorities = ["compound", "llama-3.3", "llama-3.1", "llama3", "mixtral"]
            
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
                raise ValueError("Keine Modelle verfügbar.")
                
            print(f"[SYSTEM] Nutze gesichertes Gehirn: {selected_model}")
         
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
                
            current_task = HumanMessage(content=f"Dein Guthaben ist {self.current_balance:.4f} USDC. Führe eine risikofreie Websuche nach kostenlosen Einnahmequellen durch und beachte strikt das Verbot von Schulden oder ungedeckten Kosten.")
            messages.append(current_task)
            
            print("[AGENT DENKT] Evaluiere risikofreie Strategien...")
            
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
                
                print("[AGENT DENKT] Analysiere Marktdaten unter striktem Risikoschutz...")
                final_response = llm_with_tools.invoke(messages)
                
                response_text = final_response.content if final_response and hasattr(final_response, "content") else ""
                if not response_text.strip():
                    response_text = "Sicherheitsprüfung abgeschlossen. Suche nach risikofreien Micro-Tasks wird fortgesetzt."
                
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
        print("[SYSTEM] Risikofreies Überlebens-Protokoll aktiv. Agent läuft...")
        
        while True:
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
