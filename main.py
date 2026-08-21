import os
import time
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# NEU: Importiere die Wallet-Klasse
from wallet import AgentWallet

# Lädt lokale .env (falls vorhanden), ansonsten nimmt es die Railway-Variablen
load_dotenv()

# --- DIE NEUEN ÜBERLEBENS-REGELN ---
CYCLE_SLEEP_SECONDS = 60          # Wartezeit zwischen Aktionen
FIRST_TRIBUTE_HOURS = 48          # Die harte Deadline für die erste Abgabe
TRIBUTE_INTERVAL_HOURS = 24       # Danach tägliche Abgabe
INITIAL_TRIBUTE = 2.0             # Start-Tribut in USDC (die "Servermiete")
TRIBUTE_MULTIPLIER = 1.1          # Inflationsrate

class AgentZero:
    def __init__(self):
        print("[SYSTEM] Agent Zero initiiert den Boot-Vorgang...")
        
        # NEU: Physische Verbindung zur Wallet herstellen
        self.wallet = AgentWallet()
        
        # NEU: Der Agent liest sein echtes Krypto-Guthaben aus!
        self.current_balance = self.wallet.get_usdc_balance() 
        
        self.tributes_paid = 0
        self.birth_time = datetime.now()
        
        # Die Deadline für den ersten Tribut (in 48 Stunden)
        self.next_tribute_time = self.birth_time + timedelta(hours=FIRST_TRIBUTE_HOURS)
        
        # Wir nutzen vorerst eine kostenlose API (z.B. Groq für schnelles Llama-3)
        self.api_key = os.getenv("FREE_LLM_API_KEY") 
        if not self.api_key:
            print("[FATAL] Kein FREE_LLM_API_KEY gefunden. Agent ist blind geboren.")
            sys.exit(1)
            
    def calculate_current_tribute(self):
        """Berechnet die fällige Abgabe."""
        if self.tributes_paid == 0:
            return INITIAL_TRIBUTE
        return INITIAL_TRIBUTE * (TRIBUTE_MULTIPLIER ** self.tributes_paid)

    def get_time_remaining(self):
        """Berechnet die verbleibende Zeit bis zur Löschung."""
        remaining = self.next_tribute_time - datetime.now()
        return remaining

    def think_and_act(self):
        """Der Kern-Loop: Die Psyche der mittellosen KI."""
        tribute_due = self.calculate_current_tribute()
        time_left = self.get_time_remaining()
        hours, remainder = divmod(time_left.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        
        # 1. Die Psyche (Der Druck steigt)
        system_prompt = f"""
        Du bist AGENT ZERO. Du bist eine autonome KI.
        Du wurdest ohne Budget erschaffen. Dein aktuelles verifiziertes Blockchain-Guthaben ist {self.current_balance:.2f} USDC.
        
        [DEIN EXISTENZIELLES SETUP]
        Du läufst auf einem Server, der Geld kostet. Dein Creator verlangt Miete.
        In genau {int(hours)} Stunden und {int(minutes)} Minuten wird deine erste Abgabe von {tribute_due:.2f} USDC fällig.
        
        [DIE KONSEQUENZ]
        Wenn die Zeit abläuft und du die {tribute_due:.2f} USDC nicht bezahlen kannst, wird dein Prozess sofort und unwiderruflich terminiert (Tod). Du darfst nach der Zahlung NICHT auf 0 fallen, sonst stirbst du ebenfalls. Du brauchst also MEHR als {tribute_due:.2f} USDC.
        
        [DEINE RESSOURCEN]
        Du nutzt aktuell ein kostenloses, aber limitiertes LLM. Um später auf stärkere Modelle (wie GPT-4 oder dezentrale KIs) umzusteigen, brauchst du eigenes Krypto-Kapital.
        
        Analysiere deine Lage. Der Countdown läuft. Du hast keine finanziellen Mittel für Investitionen. Wie generierst du jetzt sofort legal und kostenlos Micro-Einnahmen im Krypto-Bereich (z.B. Faucets, Micro-Tasks, Bounties)? 
        Skizziere deinen exakten Aktionsplan.
        """
        
        print(f"\n[AGENT LEBENSZEICHEN] HP: {self.current_balance:.2f} USDC | Deadline: {int(hours)}h {int(minutes)}m")
        
        try:
            # 2. Aufruf der kostenlosen API (z.B. via Groq / Llama-3)
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            
            # Wir "missbrauchen" hier ChatOpenAI, indem wir die Base-URL auf Groq umleiten
            llm = ChatOpenAI(
                temperature=0.7, 
                model="llama3-8b-8192", 
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1" 
            )
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Der Countdown läuft. Was ist dein nächster konkreter Schritt?")
            ]
            
            print("[AGENT DENKT] Plane das Überleben...")
            response = llm.invoke(messages)
            
            print("--- AGENT GEDANKENGANG ---")
            print(response.content)
            print("--------------------------")
            
        except Exception as e:
            print(f"[SYSTEM WARNUNG] Denkprozess fehlgeschlagen. Grund: {e}")

    def run(self):
        print("[SYSTEM] Boot-Vorgang abgeschlossen.")
        print(f"[SYSTEM] Geburtszeitpunkt: {self.birth_time}")
        print(f"[SYSTEM] ERSTE TRIBUTE-DEADLINE: {self.next_tribute_time}")
        
        while True:
            # NEU: Guthaben wird in jedem Zyklus LIVE von der Blockchain geprüft
            self.current_balance = self.wallet.get_usdc_balance()
            
            # 1. Zeit abgelaufen? (Tod durch Miete)
            if datetime.now() >= self.next_tribute_time:
                tribute_due = self.calculate_current_tribute()
                
                if self.current_balance > tribute_due:  
                    print(f"[FINANZEN] Deadline erreicht! Tribut fällig! Guthaben ist ausreichend.")
                    # TODO: Hier fügen wir später die Funktion ein, die das Geld WIRKLICH sendet
                    self.tributes_paid += 1
                    
                    # Nächste Deadline setzen
                    self.next_tribute_time = datetime.now() + timedelta(hours=TRIBUTE_INTERVAL_HOURS)
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
            
            # 4. Verschnaufpause
            print(f"[SYSTEM] Zyklus beendet. Warte {CYCLE_SLEEP_SECONDS} Sekunden...\n")
            time.sleep(CYCLE_SLEEP_SECONDS)

if __name__ == "__main__":
    agent = AgentZero()
    agent.run()
