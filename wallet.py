import os
from web3 import Web3
from dotenv import load_dotenv

# Lädt lokale .env (falls vorhanden), ansonsten nimmt es die Railway-Variablen
load_dotenv()

# Konfiguration (Polygon Mainnet)
RPC_URL = os.getenv("WEB3_PROVIDER_URL", "https://polygon-rpc.com")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY")
CREATOR_WALLET = os.getenv("CREATOR_WALLET_ADDRESS")

class AgentWallet:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError("CRITICAL: Keine Verbindung zur Blockchain möglich.")
        
        if not PRIVATE_KEY:
            print("SYSTEM WARNUNG: Kein privater Schlüssel gefunden. Agent läuft blind/ohne Geld.")
            self.account = None
        else:
            self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
            print(f"SYSTEM START: Agent Wallet initialisiert. Adresse: {self.account.address}")
            
    def get_matic_balance(self):
        """Prüft das Guthaben für Transaktionsgebühren (Gas)."""
        if not self.account: 
            return 0.0
        balance_wei = self.w3.eth.get_balance(self.account.address)
        return float(self.w3.from_wei(balance_wei, 'ether'))

    def check_survival_status(self, required_tribute_amount=0):
        """Die Kernfunktion: Lebt der Agent noch?"""
        # In einer echten Umgebung lesen wir hier den USDC Smart Contract aus.
        # Für den Start simulieren wir die 50 EUR (bzw. USDC)
        current_balance = 50.0 
        
        print(f"[WALLET CHECK] Aktuelles Guthaben: {current_balance} USDC")
        
        if current_balance <= 0:
            print("[SYSTEM FATAL] Guthaben bei 0. Agent ist verhungert.")
            return False
            
        if required_tribute_amount > 0 and current_balance < required_tribute_amount:
            print(f"[SYSTEM FATAL] Guthaben ({current_balance}) reicht nicht für Tribut ({required_tribute_amount}).")
            return False
            
        return True

# Kurzer Test-Aufruf, wenn die Datei direkt ausgeführt wird
if __name__ == "__main__":
    wallet = AgentWallet()
    if wallet.account:
        print(f"MATIC für Gebühren vorhanden: {wallet.get_matic_balance()}")
        wallet.check_survival_status()
