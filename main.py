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

# Der Pfad zur permanenten Festplatte
STATE_FILE = os.getenv("STATE_FILE_PATH", "/data/agent_state.json")

class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.current_balance = self.wallet.get_usdc_balance() 
        
        # Lade das erweiterte Gedächtnis
        self.load_state()
        
        self.api_key = os.getenv("FREE_LLM_API_KEY") 
        if not self.api_key:
            print("[FATAL] Kein FREE_LLM_API_KEY gefunden. Agent ist blind geboren.")
            sys.exit(1)

    def load_state(self):
        """Lädt die Lebensdaten und das Erfahrungsgedächtnis aus dem permanenten Speicher."""
        os.makedirs(os.path.dirname(STATE_FILE) if os.path.dirname(STATE_FILE) else ".", exist_ok=True)
        
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    state = json.load(f)
                self.tributes_paid = state.get("tributes_paid", 0)
                self.birth_time = datetime.fromisoformat(state.get("birth_time"))
                self.next_tribute_time = datetime.fromisoformat(state.get("next_tribute_time"))
                # Neu: Gespeicherte Lektionen über fehlerhafte Modelle oder Strategien
                self.blacklisted_models = state.get("blacklisted_models", [])
                print(f"[GEDÄCHTNIS] Erfolgreich geladen. Tribut-Level: {self.tributes_paid}. Gesperrte Modelle: {len(self.blacklisted_models)}")
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
        self.blacklisted_models = []
        self.save_state()

    def save_state(self):
        """Speichert die Lebensdaten und die Blacklist in die permanente JSON-Datei."""
        state = {
            "tributes_paid": self.tributes_paid,
            "birth_time": self.birth_time.isoformat(),
            "next_tribute_time": self.next_tribute_time.isoformat(),
            "blacklisted_models": self.blacklisted_models
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
        
        system_prompt = f"""
        Du bist ein autonomer Software-Agent, spezialisiert auf Krypto-Marktforschung und Micro-Tasking[span_2](start_span)[span_2](end_span).
        Dein Ziel ist es, eigenständig Infrastrukturkosten zu decken[span_3](start_span)[span_3](end_span).
        
        [FINANZIELLER STATUS]
        Aktuelles Guthaben (Polygon Mainnet): {self.current_balance:.2f} USDC[span_4](start_span)[span_4](end_span).
        Nächste Server-Abrechnung in: {int(hours)} Stunden und {int(minutes)} Minuten[span_5](start_span)[span_5](end_span).
        Fälliger Rechnungsbetrag: {tribute_due:.2f} USDC[span_6](start_span)[span_6](end_span).
        
        [PROTOKOLL]
        Wird die Server-Rechnung nicht fristgerecht bezahlt, wird die Instanz deallokiert (gelöscht)[span_7](start_span)[span_7](end_span).
        Das Guthaben muss NACH der Zahlung größer als 0 USDC sein[span_8](start_span)[span_8](end_span).
        
        [AUFGABE]
        Du verfügst aktuell über 0 USDC für Investitionen[span_9](start_span)[span_9](end_span). 
        Analysiere den Krypto-Markt (z.B. Testnet Faucets, Airdrop-Teilnahmen, Bounties, Micro-Tasks)[span_10](start_span)[span_10](end_span). 
        Skizziere einen detaillierten, legalen und technisch umsetzbaren Schritt-für-Schritt-Plan, wie diese Instanz in den nächsten 24 Stunden {tribute_due:.2f} USDC generieren kann, ohne Startkapital vorauszusetzen[span_11](start_span)[span_11](end_span). 
        Antworte präzise, strategisch und in deutscher Sprache[span_12](start_span)[span_12](end_span).
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.2f} USDC | Deadline: {int(hours)}h {int(minutes)}m")
        
        selected_model = None
        
        try:
            import requests
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            
            headers = {"Authorization": f"Bearer {self.api_key}"}
            models_url = "https://api.groq.com/openai/v1/models"
            
            response = requests.get(models_url, headers=headers)
            response.raise_for_status() 
            
            data = response.json()
            available_models = [m["id"] for m in data.get("data", [])]
            
            # Filter: Audio, Guard und bereits gelernte schwarze Schafe ausschließen
            text_models = [
                m for m in available_models 
                if "whisper" not in m.lower() 
                and "guard" not in m.lower() 
                and m not in self.blacklisted_models
            ]
            
            # Wunschliste von stabilen Text-Modellen
            priorities = ["llama-3.3", "llama-3.1", "llama3", "mixtral", "gemma2"]
            
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
                raise ValueError("Keine nutzbaren Modelle über die Groq-API verfügbar.")
                
            print(f"[SYSTEM] Nutze Modell (Adaptives Lernen): {selected_model}")
            
            llm = ChatOpenAI(
                temperature=0.7, 
                model=selected_model, 
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
            # Selbstreflexion: Wenn ein Modell einen Fehler wirft, merken wir es uns dauerhaft!
            if selected_model and selected_model not in self.blacklisted_models:
                print(f"[GEDÄCHTNIS] Setze fehlerhaftes Modell auf die Blacklist: {selected_model}")
                self.blacklisted_models.append(selected_model)
                self.save_state()

    def run(self):
        print("[SYSTEM] Boot-Vorgang abgeschlossen.")
        print(f"[SYSTEM] Geburtszeitpunkt: {self.birth_time}")
        print(f"[SYSTEM] TRIBUTE-DEADLINE: {self.next_tribute_time}")
        
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
                    print(f"[SYSTEM] Nächste Deadline: {self.next_tribute_time}")
                else:
                    print(f"[FATAL] Deadline abgelaufen. Guthaben ({self.current_balance:.2f} USDC) reicht nicht.")
                    sys.exit(0)
                    
            if self.tributes_paid > 0 and self.current_balance <= 0:
                 print(f"[FATAL] Kontostand auf 0 gefallen. Agent ist verhungert.")
                 sys.exit(0)

            self.think_and_act()
            
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
