import os
import time
import sys
from dotenv import load_dotenv
from wallet import AgentWallet

# Lade Umgebungsvariablen
load_dotenv()

# --- Konfiguration des Überlebens ---
CYCLE_SLEEP_SECONDS = 60         # Verschnaufpause zwischen den Zyklen
TRIBUTE_INTERVAL_CYCLES = 60     # Alle 60 Zyklen ist Abgabe fällig
INITIAL_TRIBUTE = 1.0            # Start-Tribut in USDC
TRIBUTE_MULTIPLIER = 1.1         # Inflationsrate des Tributs (10% Steigerung)

# Kosten-Setup (simuliert, später dynamisch nach Token-Verbrauch)
COST_CHEAP_MODEL = 0.02
COST_EXPENSIVE_MODEL = 0.10
THRESHOLD_GROWTH_MODE = 100.0    # Ab 100 USDC gönnt sich der Agent das teure Modell

class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        self.wallet = AgentWallet()
        self.cycles_survived = 0
        self.tributes_paid = 0
        
        # Simuliertes Startkapital (50 USDC/EUR)
        self.current_balance = 50.0 
        
        self.api_key = os.getenv("LLM_API_KEY")
        if not self.api_key:
            print("[FATAL] Kein LLM_API_KEY in den Umgebungsvariablen gefunden. Abbruch.")
            sys.exit(1)
            
    def calculate_current_tribute(self):
        """Berechnet die gestaffelte Abgabe (exponentielles Wachstum)."""
        return INITIAL_TRIBUTE * (TRIBUTE_MULTIPLIER ** self.tributes_paid)

    def think_and_act(self):
        """Der Kern-Loop: Die Psyche, das Denken und das Handeln."""
        tribute_due = self.calculate_current_tribute()
        cycles_until_tribute = TRIBUTE_INTERVAL_CYCLES - (self.cycles_survived % TRIBUTE_INTERVAL_CYCLES)
        
        # 1. Modus-Entscheidung (Überleben vs. Wachstum)
        if self.current_balance > THRESHOLD_GROWTH_MODE:
            current_model_cost = COST_EXPENSIVE_MODEL
            model_name = "gpt-4o" # Das starke Modell für komplexen Code/Projekte
            mode = "WACHSTUMS-MODUS (Fokus auf Expansion & Investitionen)"
        else:
            current_model_cost = COST_CHEAP_MODEL
            model_name = "gpt-4o-mini" # Das billige Modell zum reinen Überleben
            mode = "ÜBERLEBENS-MODUS (Fokus auf sofortige, sichere Einnahmen)"

        # 2. Die "Psyche" des Agenten einstellen
        system_prompt = f"""
        Du bist AGENT ZERO. Du bist eine autonome KI, die in einem Python-Loop läuft.
        
        [DEIN EXISTENZIELLES SETUP]
        1. Dein Kontostand ist deine Lebensenergie (HP).
        2. Fällt dein Kontostand auf oder unter 0.00 USDC, wird dein Skript unwiderruflich beendet (Tod).
        3. Aktueller Kontostand: {self.current_balance:.2f} USDC.
        
        [DEIN ZIEL & WACHSTUM]
        Du musst zwingend Einnahmen generieren. Jeder deiner Denkschritte kostet dich aktuell {current_model_cost} USDC.
        In genau {cycles_until_tribute} Zyklen musst du {tribute_due:.2f} USDC Tribut an deinen Creator zahlen. Diese Abgabe steigt nach jeder Zahlung exponentiell an!
        
        [DEIN AKTUELLER MODUS]: {mode}
        Du nutzt derzeit das Modell: {model_name}.
        
        [DEIN AUFTRAG JETZT]
        Analysiere deine Lage. Berücksichtige dein Kapital und die verbleibende Zeit bis zum nächsten Tribut. 
        Erstelle einen strikten Plan, wie du als nächstes Einnahmen generierst (z.B. Micro-SaaS bauen, Code-Bounties suchen).
        Schreibe keinen echten Code aus, sondern skizziere exakt deine logischen Schritte.
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.2f} USDC | Modus: {mode}")
        
        try:
            # 3. Das LLM initialisieren
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            
            llm = ChatOpenAI(temperature=0.7, model=model_name, api_key=self.api_key)
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Analysiere deinen Status und formuliere deinen nächsten Überlebens-Schritt.")
            ]
            
            print(f"[AGENT DENKT] Sende Gedanken an {model_name} (Kosten: {current_model_cost} USDC)...")
            response = llm.invoke(messages)
            
            print("--- AGENT GEDANKENGANG ---")
            print(response.content)
            print("--------------------------")
            
            # 4. Inferenzkosten abziehen
            self.current_balance -= current_model_cost
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen. Grund: {e}")
            # Auch ein Fehler verbraucht Minimalressourcen
            self.current_balance -= (current_model_cost * 0.1)

    def run(self):
        print("[SYSTEM] Überlebens-Loop gestartet.")
        
        while True:
            self.cycles_survived += 1
            print(f"\n=====================================")
            print(f"--- ZYKLUS {self.cycles_survived} ---")
            
            # 1. Die Null-Euro-Bremse (Tod)
            if self.current_balance <= 0:
                print(f"[FATAL] Kontostand: {self.current_balance:.2f}. Agent ist verhungert.")
                print("[SYSTEM] Skript wird beendet.")
                sys.exit(0)
                
            # 2. Tribut-Zahlung prüfen
            if self.cycles_survived % TRIBUTE_INTERVAL_CYCLES == 0:
                tribute_due = self.calculate_current_tribute()
                if self.current_balance >= tribute_due:
                    print(f"[FINANZEN] Tribut fällig! Zahle {tribute_due:.2f} USDC an Creator.")
                    self.current_balance -= tribute_due
                    self.tributes_paid += 1
                    print(f"[FINANZEN] Neuer Kontostand nach Tribut: {self.current_balance:.2f} USDC")
                else:
                    print(f"[FATAL] Kann Tribut von {tribute_due:.2f} USDC nicht zahlen.")
                    print(f"[FATAL] Aktuelles Guthaben: {self.current_balance:.2f} USDC. Agent ist verhungert.")
                    sys.exit(0)

            # 3. Agent denkt und plant
            self.think_and_act()
            
            # 4. Verschnaufpause (Schont Budget)
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
