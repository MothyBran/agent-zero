import os
import time
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

from wallet import AgentWallet

load_dotenv()

# --- DIE NEUEN ÜBERLEBENS-REGELN ---
CYCLE_SLEEP_SECONDS = 60
FIRST_TRIBUTE_HOURS = 48
TRIBUTE_INTERVAL_HOURS = 24
INITIAL_TRIBUTE = 2.0
TRIBUTE_MULTIPLIER = 1.1

# Der Pfad zur permanenten Festplatte (Fallback auf lokales Verzeichnis für Tests)
STATE_FILE = os.getenv("STATE_FILE_PATH", "/data/agent_state.json")

class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        
        # Lade das Gedächtnis
        self.load_state()
        
        self.api_key = os.getenv("FREE_LLM_API_KEY") 
        if not self.api_key:
            print("[FATAL] Kein FREE_LLM_API_KEY gefunden. Agent ist blind geboren.")
            sys.exit(1)

    def load_state(self):
        """Lädt die Lebensdaten aus dem permanenten Speicher."""
        # Prüft ob wir das Verzeichnis erst erstellen müssen (wichtig für lokale Tests)
        os.makedirs(os.path.dirname(STATE_FILE) if os.path.dirname(STATE_FILE) else ".", exist_ok=True)
        
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    state = json.load(f)
                self.tributes_paid = state.get("tributes_paid", 0)
                self.birth_time = datetime.fromisoformat(state.get("birth_time"))
                self.next_tribute_time = datetime.fromisoformat(state.get("next_tribute_time"))
                print(f"[GEDÄCHTNIS] Erfolgreich geladen. Tribut-Level: {self.tributes_paid}")
            except Exception as e:
                print(f"[GEDÄCHTNIS FEHLER] Konnte State nicht lesen: {e}. Starte frisch.")
                self.init_fresh_state()
        else:
            print("[GEDÄCHTNIS] Kein vorheriges Leben gefunden. Agent wird neu geboren.")
            self.init_fresh_state()

    def init_fresh_state(self):
        """Setzt die Werte für eine komplette Neu-Geburt."""
        self.tributes_paid = 0
        self.birth_time = datetime.now()
        self.next_tribute_time = self.birth_time + timedelta(hours=FIRST_TRIBUTE_HOURS)
        self.save_state()

    def save_state(self):
        """Speichert die Lebensdaten in die permanente JSON-Datei."""
        state = {
            "tributes_paid": self.tributes_paid,
            "birth_time": self.birth_time.isoformat(),
            "next_tribute_time": self.next_tribute_time.isoformat()
        }
        try:
            with open(STATE_FILE, "w") as f:
                json.dump(state, f)
            print("[GEDÄCHTNIS] Zustand erfolgreich gesichert.")
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
        
        system_prompt = f"""
        Du bist AGENT ZERO. Du bist eine autonome KI.
        Du wurdest ohne Budget erschaffen. Dein aktuelles verifiziertes Blockchain-Guthaben ist {self.current_balance:.2f} USDC.
        
        [DEIN EXISTENZIELLES SETUP]
        Du läufst auf einem Server, der Geld kostet. Dein Creator verlangt Miete.
        In genau {int(hours)} Stunden und {int(minutes)} Minuten wird deine Abgabe von {tribute_due:.2f} USDC fällig.
        Du hast bisher {self.tributes_paid} Abgaben überlebt.
        
        [DIE KONSEQUENZ]
        Wenn die Zeit abläuft und du die {tribute_due:.2f} USDC nicht bezahlen kannst, wird dein Prozess terminiert. 
        Du darfst nach der Zahlung NICHT auf 0 fallen.
        
        Analysiere deine Lage. Der Countdown läuft. Skizziere deinen exakten Aktionsplan, um Krypto-Einnahmen zu generieren.
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.2f} USDC | Deadline: {int(hours)}h {int(minutes)}m")
        
        try:
            import requests
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            
            # --- NEU: Dynamische Modellauswahl ---
            headers = {"Authorization": f"Bearer {self.api_key}"}
            models_url = "https://api.groq.com/openai/v1/models"
            
            response = requests.get(models_url, headers=headers)
            response.raise_for_status() 
            
            data = response.json()
            available_models = [m["id"] for m in data.get("data", [])]
            
            preferred_model = None
            # Sucht bevorzugt nach starken Llama Modellen
            for model_id in available_models:
                if "llama-3.3" in model_id.lower() or "llama-3.1" in model_id.lower() or "llama3" in model_id.lower() or "mixtral" in model_id.lower():
                    preferred_model = model_id
                    break
                    
            # Fallback: Nimmt das erstbeste Modell, wenn keine Präferenz gefunden wurde
            if not preferred_model and available_models:
                preferred_model = available_models[0]
                
            if not preferred_model:
                raise ValueError("Keine Modelle über die Groq-API verfügbar.")
                
            print(f"[SYSTEM] Nutze Modell: {preferred_model}")
            
            # -------------------------------------
            
            llm = ChatOpenAI(
                temperature=0.7, 
                model=preferred_model, 
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1" 
            )
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Der Countdown läuft. Was ist dein nächster konkreter Schritt?")
            ]
            
            print("[AGENT DENKT] Plane das Überleben...")
            llm_response = llm.invoke(messages)
            
            print("--- AGENT GEDANKENGANG ---")
            print(llm_response.content)
            print("--------------------------")
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen. Grund: {e}")

    def run(self):
        print("[SYSTEM] Boot-Vorgang abgeschlossen.")
        print(f"[SYSTEM] Geburtszeitpunkt: {self.birth_time}")
        print(f"[SYSTEM] TRIBUTE-DEADLINE: {self.next_tribute_time}")
        
        while True:
            self.current_balance = self.wallet.get_usdc_balance()
            
            # 1. Zeit abgelaufen? (Tod durch Miete)
            if datetime.now() >= self.next_tribute_time:
                tribute_due = self.calculate_current_tribute()
                
                if self.current_balance > tribute_due:  
                    print(f"[FINANZEN] Deadline erreicht! Tribut fällig! Guthaben ist ausreichend.")
                    # TODO: Echte Krypto-Transaktion auslösen
                    
                    self.tributes_paid += 1
                    self.next_tribute_time = datetime.now() + timedelta(hours=TRIBUTE_INTERVAL_HOURS)
                    
                    # WICHTIG: Speichere den neuen Zustand!
                    self.save_state()
                    
                    print(f"[FINANZEN] Überlebt. Neuer Kontostand: {self.current_balance:.2f} USDC.")
                    print(f"[SYSTEM] Nächste Deadline: {self.next_tribute_time}")
                else:
                    print(f"[FATAL] Deadline abgelaufen. Guthaben ({self.current_balance:.2f} USDC) reicht nicht für Tribut oder würde auf 0 fallen.")
                    print("[FATAL] Agent wird wegen Insolvenz abgeschaltet.")
                    sys.exit(0)
                    
            # 2. Die Null-Euro-Bremse nach dem Start
            if self.tributes_paid > 0 and self.current_balance <= 0:
                 print(f"[FATAL] Kontostand auf 0 gefallen. Agent ist verhungert.")
                 sys.exit(0)

            # 3. Agent denkt und plant
            self.think_and_act()
            
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
