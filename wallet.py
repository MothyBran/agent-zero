import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Standardmäßig auf Ethereum Mainnet-RPC umschalten, falls keine andere URL gesetzt ist
RPC_URL = os.getenv("WEB3_PROVIDER_URL", "https://eth.llamarpc.com")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY")
CREATOR_WALLET = os.getenv("CREATOR_WALLET_ADDRESS")

# Offizielle USDC Token-Adresse auf dem Ethereum Mainnet
USDC_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

# Minimales ABI, um das Guthaben auszulesen
ERC20_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]'

class AgentWallet:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError("[FATAL] Keine Verbindung zur Ethereum-Blockchain möglich.")
        
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
            # USDC nutzt auf Ethereum ebenfalls 6 Nachkommastellen
            return balance_wei / 1_000_000
        except Exception as e:
            print(f"[WALLET FEHLER] Konnte Guthaben nicht abrufen: {e}")
            return 0.0
