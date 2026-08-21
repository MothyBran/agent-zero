import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("WEB3_PROVIDER_URL", "https://polygon-rpc.com")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY")
CREATOR_WALLET = os.getenv("CREATOR_WALLET_ADDRESS")

# Die offizielle USDC Token-Adresse auf Polygon
USDC_CONTRACT_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
# Minimales ABI (Schnittstellenbeschreibung), um nur das Guthaben auszulesen
ERC20_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]'

class AgentWallet:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError("[FATAL] Keine Verbindung zur Polygon-Blockchain möglich.")
        
        if not PRIVATE_KEY:
            raise ValueError("[FATAL] Kein AGENT_PRIVATE_KEY hinterlegt.")
            
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        # Checksum-Adresse für Web3.py generieren
        self.address = self.w3.to_checksum_address(self.account.address)
        self.usdc_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(USDC_CONTRACT_ADDRESS), 
            abi=ERC20_ABI
        )
        print(f"[WALLET START] Agent Wallet live. Adresse: {self.address}")
            
    def get_usdc_balance(self):
        """Liest das echte USDC-Guthaben direkt aus der Blockchain aus."""
        try:
            balance_wei = self.usdc_contract.functions.balanceOf(self.address).call()
            # USDC auf Polygon hat 6 Nachkommastellen (nicht 18 wie ETH)
            return balance_wei / 1_000_000
        except Exception as e:
            print(f"[WALLET FEHLER] Konnte Guthaben nicht abrufen: {e}")
            return 0.0
