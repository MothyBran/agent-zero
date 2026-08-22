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
# WERKZEUGE DES AGENTEN
# ==========================================
from langchain_core.tools import tool

@tool
def search_internet(query: str) -> str:
    """
    Sucht im Internet nach aktuellen Informationen. 
    Nutze dieses Werkzeug, um Live-Daten zu Krypto-Airdrops, Faucets, Plattformen oder News zu finden.
    """
    try:
        from langchain_community.tools import DuckDuckGoSearchResults
        search = DuckDuckGoSearchResults()
        return search.run(query)
    except Exception as e:
        return f"Fehler bei der Websuche: {e}"

AGENT_TOOLS = [search_internet]


class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        
        # Lade das erweiterte Gedächtnis
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
                # NEU: Das Erfahrungsgedächtnis (Fehler und Lektionen)
                self.lessons_learned = state.get("lessons_learned", [])
                print(f"[GEDÄCHTNIS] Erfolgreich geladen. Tribut-Level: {self.tributes_paid}. Gespeicherte Lektionen: {len(self.lessons_learned)}")
            except Exception as e:
                print(f"[GEDÄCHTNIS FEHLER] Konnte State nicht lesen: {e}. Starte frisch.")
                self.init_fresh_state()
        else:
            print("[GEDÄCHTNIS] Kein vorheriges Leben gefunden. Agent wird neu geboren.")
            self.init_fresh_state()

    def init_fresh_state(self):
        self.tributes_paid = 0
        self.birth_time = datetime.now()
        self.next_tribute_time = self.birth_time + timedelta(hours=FIRST_TRIBUTE_HOURS)
        self.lessons_learned = []
        self.save_state()

    def save_state(self):
        """Speichert Lebensdaten UND die gesammelten Erfahrungen permanent ab."""
        state = {
            "tributes_paid": self.tributes_paid,
            "birth_time": self.birth_time.isoformat(),
            "next_tribute_time": self.next_tribute_time.isoformat(),
            "lessons_learned": self.lessons_learned  # <--- Das Gedächtnis wächst mit jedem Fehler
        }
        try:
            with open(STATE_FILE, "w") as f:
                json.dump(state, f)
            print("[GEDÄCHTNIS] Zustand und Erfahrungen erfolgreich gesichert.")
        except Exception as e:
            print(f"[GEDÄCHTNIS FEHLER] Konnte Zustand nicht speichern: {e}")
            
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
        
        # Wir formatieren die bisher gesammelten Lektionen für den System-Prompt
        lessons_text = "\n".join([f"- {lesson}" for lesson in self.lessons_learned]) if self.lessons_learned else "Bisher keine Fehlschläge registriert."
        
        system_prompt = f"""
        Du bist ein autonomer Software-Agent, spezialisiert auf Krypto-Marktforschung.
        
        [FINANZIELLER STATUS]
        Guthaben (Polygon Mainnet): {self.current_balance:.2f} USDC.
        Nächste Server-Abrechnung in: {int(hours)} Stunden und {int(minutes)} Minuten.
        Fälliger Betrag: {tribute_due:.2f} USDC.
        
        [DEIN LANGZEIT-GEDÄCHTNIS (Bisherige Lektionen & Fehler)]
        {lessons_text}
        
        [AUFGABE]
        Du hast 0 MATIC für Gasgebühren. Lerne aus deinen vergangenen Versuchen (siehe Gedächtnis). 
        Nutze dein Internet-Suchwerkzeug, um alternative Wege zu finden (z.B. andere Faucets, Relayer-Dienste, gaslose Plattformen). 
        Wenn eine Methode fehlschlägt, notiere dir am Ende deiner Antwort eine neue Lektion für das nächste Mal (im Format: "LEKTION: [Dein Text]").
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.2f} USDC | Deadline: {int(hours)}h {int(minutes)}m")
        
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
            
            text_models = [m for m in available_models if "whisper" not in m.lower() and "guard" not in m.lower()]
            
            preferred_model = None
            valid_models = [
                m for m in text_models 
                if ("llama-3" in m.lower() or "llama3" in m.lower()) 
                and "compound" not in m.lower() 
                and "guard" not in m.lower()
                and "whisper" not in m.lower()
            ]
            
            if valid_models:
                preferred_model = valid_models[0]
            else:
                preferred_model = "llama-3.1-8b-instant"
                
            print(f"[SYSTEM] Gehirn online: {preferred_model} (Adaptives Lernen aktiv)")
            
            llm = ChatOpenAI(
                temperature=0.7, 
                model=preferred_model, 
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1" 
            )
            llm_with_tools = llm.bind_tools(AGENT_TOOLS)
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Analysiere deine Lage unter Berücksichtigung deiner Lektionen und starte den nächsten optimierten Schritt.")
            ]
            
            print("[AGENT DENKT] Evaluiere Aktionen mit Selbstreflexion...")
            
            ai_message = llm_with_tools.invoke(messages)
            messages.append(ai_message)
            
            if ai_message.tool_calls:
                for tool_call in ai_message.tool_calls:
                    print(f"[AGENT AKTION] Führt Werkzeug aus: {tool_call['name']} | Suchbegriff: {tool_call['args']}")
                    
                    if tool_call["name"] == "search_internet":
                        search_query = tool_call["args"].get("query", str(tool_call["args"]))
                        raw_result = search_internet.invoke(search_query)
                        
                        tool_message = ToolMessage(
                            content=str(raw_result),
                            tool_call_id=tool_call["id"]
                        )
                        messages.append(tool_message)
                        print(f"[SYSTEM] Werkzeug hat Live-Daten geladen!")
                
                print("[AGENT DENKT] Analysiere Suchergebnisse und ziehe Schlüsse...")
                final_response = llm_with_tools.invoke(messages)
                print("--- AGENT SCHLUSSFOLGERUNG ---")
                print(final_response.content)
                print("------------------------------")
                
                # --- INTELLIGENTE SELBSTREFLEXION ---
                # Prüfe, ob die KI das Wort "LEKTION:" in ihrer Antwort verwendet hat, um daraus zu lernen
                content = final_response.content
                if "LEKTION:" in content:
                    try:
                        # Extrahiere die Lektion aus dem Text
                        parts = content.split("LEKTION:")
                        new_lesson = parts[1].strip().split("\n")[0]
                        if new_lesson and new_lesson not in self.lessons_learned:
                            self.lessons_learned.append(new_lesson)
                            self.save_state()
                            print(f"[ERFAHRUNG GESPEICHERT] Der Agent hat gelernt: {new_lesson}")
                    except Exception as parse_err:
                        print(f"[SYSTEM] Konnte Lektion nicht automatisch extrahieren: {parse_err}")
            else:
                print("--- AGENT GEDANKENGANG ---")
                print(ai_message.content)
                print("--------------------------")
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen: {e}")
            # Auch Systemfehler kann der Agent als Lektion abspeichern!
            error_lesson = f"Technischer Fehler aufgetreten: {str(e)[:50]}"
            if error_lesson not in self.lessons_learned:
                self.lessons_learned.append(error_lesson)
                self.save_state()

    def run(self):
        print("[SYSTEM] Boot-Vorgang abgeschlossen.")
        
        while True:
            self.current_balance = self.wallet.get_usdc_balance()
            
            if datetime.now() >= self.next_tribute_time:
                tribute_due = self.calculate_current_tribute()
                
                if self.current_balance > tribute_due:  
                    print(f"[FINANZEN] Deadline erreicht! Tribut fällig! Guthaben ist ausreichend.")
                    self.tributes_paid += 1
                    self.next_tribute_time = datetime.now() + timedelta(hours=TRIBUTE_INTERVAL_HOURS)
                    self.save_state()
                    print(f"[FINANZEN] Überlebt. Neuer Kontostand: {self.current_balance:.2f} USDC.")
                else:
                    print(f"[FATAL] Deadline abgelaufen. Agent wird wegen Insolvenz abgeschaltet.")
                    sys.exit(0)
                    
            if self.tributes_paid > 0 and self.current_balance <= 0:
                 print(f"[FATAL] Kontostand auf 0. Agent verhungert.")
                 sys.exit(0)

            self.think_and_act()
            
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
