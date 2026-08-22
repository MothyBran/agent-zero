import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Liste von stabilen öffentlichen Ethereum RPCs als Fallback-Kette
ETH_RPC_URLS = [
    os.getenv("WEB3_PROVIDER_URL"),
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com"
]

PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY")
CREATOR_WALLET = os.getenv("CREATOR_WALLET_ADDRESS")

# Offizielle USDC Token-Adresse auf dem Ethereum Mainnet
USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
ERC20_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]'

class AgentWallet:
    def __init__(self):
        self.w3 = None
        # Teste die RPC-URLs nacheinander durch, bis eine Verbindung steht
        for url in ETH_RPC_URLS:
            if url:
                try:
                    w3_candidate = Web3(Web3.HTTPProvider(url))
                    if w3_candidate.is_connected():
                        self.w3 = w3_candidate
                        print(f"[WALLET SYSTEM] Erfolgreich verbunden mit Ethereum RPC: {url}")
                        break
                except Exception:
                    continue
                    
        if not self.w3 or not self.w3.is_connected():
            raise ConnectionError("[FATAL] Keine Verbindung zur Ethereum-Blockchain über alle verfügbaren RPCs möglich.")
        
        if not PRIVATE_KEY:
            raise ValueError("[FATAL] Kein AGENT_PRIVATE_KEY hinterlegt.")
            
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        self.address = self.w3.to_checksum_address(self.account.address)
        self.usdc_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(USDC_CONTRACT_ADDRESS), 
            abi=ERC20_ABI
        )
        print(f"[WALLET START] Agent Wallet live (Ethereum Mainnet). Adresse: {self.address}")
            
    def get_usdc_balance(self):
        """Liest das echte USDC-Guthaben direkt aus dem Ethereum Mainnet aus."""
        try:
            balance_wei = self.usdc_contract.functions.balanceOf(self.address).call()
            return balance_wei / 1_000_000
        except Exception as e:
            print(f"[WALLET FEHLER] Konnte Guthaben nicht abrufen: {e}")
            return 0.0
