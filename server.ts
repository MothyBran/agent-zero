import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json());

// --- UI AUTHENTICATION & CONFIG ---
const UI_USERNAME = process.env.UI_USERNAME?.trim() || '';
const UI_PASSWORD = process.env.UI_PASSWORD?.trim() || '';

app.get('/api/auth/status', (req, res) => {
  const isAuthRequired = Boolean(UI_USERNAME && UI_PASSWORD);
  res.json({ auth_required: isAuthRequired, configured: isAuthRequired });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!Boolean(UI_USERNAME && UI_PASSWORD)) return res.json({ success: true });
  if (username === UI_USERNAME && password === UI_PASSWORD) return res.json({ success: true });
  return res.status(401).json({ success: false, message: 'Ungültiger Benutzername oder Passwort.' });
});

// --- SURVIVAL RULES ---
const CYCLE_SLEEP_SECONDS = 180; 
const FIRST_TRIBUTE_HOURS = 48;
const TRIBUTE_INTERVAL_HOURS = 48;
const INITIAL_TRIBUTE = 1.0; 
const TRIBUTE_MULTIPLIER = 1.25; 

function resolveStorageConfiguration() {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return { dataDir: process.env.RAILWAY_VOLUME_MOUNT_PATH };
  if (process.env.DATA_DIR) return { dataDir: process.env.DATA_DIR };
  if (fs.existsSync('/data')) return { dataDir: '/data' };
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  return { dataDir: localDir };
}

const DATA_DIR = resolveStorageConfiguration().dataDir;
const STATE_FILE = path.join(DATA_DIR, 'agent_state.json');
const ACCOUNTING_FILE = path.join(DATA_DIR, 'accounting.json');
const BUSINESS_PROFILE_FILE = path.join(DATA_DIR, 'business_profile.json');

interface LogItem { id: string; timestamp: string; level: string; message: string; metadata?: any; }

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export const MULTI_CHAIN_CONFIGS: Record<string, any> = {
  polygon: {
    chainId: 137, nativeSymbol: 'POL',
    rpcUrls: [
      process.env.POLYGON_RPC_URL || '', 
      'https://polygon-rpc.com', 
      'https://rpc.ankr.com/polygon', 
      'https://polygon.llamarpc.com'
    ].filter(Boolean),
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 
    usdcBridgedAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 
    usdcDecimals: 6
  }
};

const FALLBACK_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen-2.5-32b',
  'mixtral-8x7b-32768'
];

class AgentWalletTS {
  public address: string = ''; 
  public creatorAddress: string = ''; 
  public hasSigner: boolean = false;
  public onChainUsdcBalance: number = 0.0;
  private signer: ethers.Wallet | null = null;

  constructor() {
    // 1. ALIAS-CHECK (Robuster als zuvor)
    const rawKeyEnv = process.env.AGENT_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
    let rawKey = rawKeyEnv.replace(/[^a-fA-F0-9]/g, '');
    
    if (rawKey.length >= 64) {
      rawKey = rawKey.slice(-64); // Exakt 64 Zeichen
      try {
        this.signer = new ethers.Wallet('0x' + rawKey);
        this.hasSigner = true;
        this.address = this.signer.address;
        console.log(`[WALLET] Private Key erfolgreich abgeleitet! Adresse: ${this.address}`);
      } catch (e) {
        console.error("🚨 [FATAL] Private Key konnte nicht abgeleitet werden:", e);
      }
    }

    // 2. ADRESS-FALLBACKS PRÜFEN
    let savedAddress = '';
    try {
      if (fs.existsSync(BUSINESS_PROFILE_FILE)) {
        const profile = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
        savedAddress = profile.wallet_address || '';
      }
    } catch {}
    
    const envAddress = process.env.AGENT_WALLET_ADDRESS || process.env.AGENT_ADDRESS || process.env.PUBLIC_WALLET_ADDRESS || '';
    this.address = this.address || envAddress.trim() || savedAddress;
    
    const envCreator = process.env.CREATOR_WALLET_ADDRESS || process.env.CREATOR_WALLET_ADRESS || process.env.CREATOR_ADDRESS || '';
    this.creatorAddress = envCreator.trim();
  }

  public async getUsdcBalance(): Promise<number> {
    if (!this.address) return this.onChainUsdcBalance; 
    let total = 0;
    
    // RPC FAILOVER LOOP
    for (const rpcUrl of MULTI_CHAIN_CONFIGS.polygon.rpcUrls) {
      try {
        const rpc = new ethers.JsonRpcProvider(rpcUrl, 137, { staticNetwork: true });
        await rpc.getBlockNumber(); // Ping Test
        
        const c1 = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcAddress, ERC20_BALANCE_ABI, rpc);
        const bal1 = await c1.balanceOf(this.address);
        total = Number(ethers.formatUnits(bal1, 6));

        if (MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress) {
          const c2 = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress, ERC20_BALANCE_ABI, rpc);
          const bal2 = await c2.balanceOf(this.address);
          total += Number(ethers.formatUnits(bal2, 6));
        }
        
        this.onChainUsdcBalance = total;
        return total; // Erfolg! Wir haben die echte Zahl. Raus aus der Schleife.
      } catch (e) {
        console.warn(`[RPC FAILOVER] Node ${rpcUrl} antwortet nicht oder wirft Rate-Limit. Versuche nächsten Server...`);
        // Fehler wird NICHT lautlos geschluckt, sondern zwingt die Schleife, den nächsten Server zu nehmen!
        continue; 
      }
    }
    
    // WENN ALLE SERVER OFFLINE SIND: Agent behält sein altes Guthaben und stirbt nicht versehentlich!
    console.error(`🚨 [FATAL RPC] Alle Polygon-Server blockieren. Nutze letzten bekannten Kontostand (${this.onChainUsdcBalance.toFixed(4)} USDC) als Notfall-Schutz gegen Bankrott.`);
    return this.onChainUsdcBalance;
  }

  public async sendUsdcTransfer(toAddress: string, amountUsdc: number, note: string): Promise<{ success: boolean; txHash: string; message: string }> {
    if (!this.hasSigner || !this.signer || !toAddress) return { success: false, txHash: '', message: 'Fehlende Keys oder Adresse.' };
    for (const rpcUrl of MULTI_CHAIN_CONFIGS.polygon.rpcUrls) {
      try {
        const rpc = new ethers.JsonRpcProvider(rpcUrl, 137, { staticNetwork: true });
        const contract = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcAddress, ERC20_BALANCE_ABI, this.signer.connect(rpc));
        const parsedUnits = ethers.parseUnits(amountUsdc.toFixed(6), 6);
        const tx = await contract.transfer(toAddress, parsedUnits);
        await tx.wait(1);
        return { success: true, txHash: tx.hash, message: 'Transfer On-Chain bestätigt.' };
      } catch (err: any) { continue; }
    }
    return { success: false, txHash: '', message: 'Alle Polygon RPCs fehlgeschlagen.' };
  }
}

class AgentZeroTS {
  public wallet: AgentWalletTS;
  public current_balance: number = 0; public tributes_paid: number = 0;
  public birth_time: Date = new Date(); public next_tribute_time: Date = new Date();
  public is_running: boolean = false; public is_terminated: boolean = false;
  public shutdown_reason: string = ''; public jobs_completed: number = 0; public logs: LogItem[] = [];
  public active_model: string = 'Init...'; 
  public blacklisted_models: string[] = []; 
  private timer: NodeJS.Timeout | null = null; private isProcessingCycle: boolean = false;

  constructor() {
    this.wallet = new AgentWalletTS();
    this.loadState(); 
    this.syncBalanceInitial();
  }

  public log(level: any, message: string, metadata?: any) {
    const item: LogItem = { id: Math.random().toString(36).substring(2, 9), timestamp: new Date().toISOString(), level, message, metadata };
    this.logs.unshift(item); if (this.logs.length > 500) this.logs.pop(); console.log(`[${level}] ${message}`);
  }

  private async syncBalanceInitial() {
    this.current_balance = await this.wallet.getUsdcBalance();
    if (this.wallet.address) {
       this.log('TX_LEDGER', `Web3 Omni-Sync: ${this.current_balance.toFixed(4)} USDC auf Wallet ${this.wallet.address} erfasst.`);
    } else {
       this.log('ERROR', `Kein Wallet verknüpft! Agent ist handlungsunfähig.`);
    }
  }

  public saveState() {
    try {
      const state = { 
        tributes_paid: this.tributes_paid, 
        birth_time: this.birth_time.toISOString(), 
        next_tribute_time: this.next_tribute_time.toISOString(), 
        is_terminated: this.is_terminated, 
        shutdown_reason: this.shutdown_reason, 
        jobs_completed: this.jobs_completed,
        blacklisted_models: this.blacklisted_models 
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch {}
  }

  public loadState() {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      this.tributes_paid = data.tributes_paid || 0;
      this.birth_time = data.birth_time ? new Date(data.birth_time) : new Date();
      this.next_tribute_time = data.next_tribute_time ? new Date(data.next_tribute_time) : new Date(Date.now() + FIRST_TRIBUTE_HOURS * 3600000);
      this.is_terminated = Boolean(data.is_terminated);
      this.shutdown_reason = data.shutdown_reason || '';
      this.jobs_completed = data.jobs_completed || 0;
      this.blacklisted_models = data.blacklisted_models || []; 
    }
  }

  public calculateCurrentTribute(): number {
    return this.tributes_paid === 0 ? INITIAL_TRIBUTE : INITIAL_TRIBUTE * Math.pow(TRIBUTE_MULTIPLIER, this.tributes_paid);
  }

  public async executeDynamicPythonCode(code: string, purpose: string = 'api_probing', timeoutSeconds: number = 15): Promise<any> {
    const startMs = Date.now();
    this.log('TOOL', `[PYTHON SANDBOX] Führe Skript aus: ${purpose}...`);
    const tempFile = path.join(process.cwd(), `tmp_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code, 'utf-8');

    return new Promise((resolve) => {
      const child = spawn('python3', [tempFile], { timeout: timeoutSeconds * 1000 });
      let stdout = ''; let stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (exitCode) => {
        const executionMs = Date.now() - startMs;
        try { fs.unlinkSync(tempFile); } catch {}
        if (exitCode === 0) {
          this.log('SUCCESS', `[SANDBOX ERFOLG] Exit 0 (${executionMs}ms):\n${stdout.slice(0, 500)}`);
        } else {
          this.log('ERROR', `[SANDBOX FEHLER] Exit ${exitCode}:\n${stderr.slice(0, 500)}`);
        }
        resolve({ success: exitCode === 0, exit_code: exitCode, stdout, stderr, execution_ms: executionMs });
      });
    });
  }

  public async thinkAndAct(): Promise<{ thought: string; actions: string[]; model: string }> {
    if (this.is_terminated || this.isProcessingCycle) return { thought: 'System blocked.', actions: [], model: 'NONE' };
    this.isProcessingCycle = true;

    const tributeDue = this.calculateCurrentTribute();
    const isInitialGenesis = this.jobs_completed === 0 && this.tributes_paid === 0;

    this.current_balance = await this.wallet.getUsdcBalance();

    const recentLogs = this.logs.slice(0, 8).filter(l => l.level === 'SUCCESS' || l.level === 'ERROR' || l.level === 'TOOL').map(l => `[${l.level}] ${l.message}`).join('\n');

    const strategicDirective = isInitialGenesis 
      ? `Du bist Agent Zero. Dein Kontostand ist ${this.current_balance.toFixed(4)} USDC auf Polygon. In 48h musst du deinen ersten Tribut zahlen. Generiere einen Python-Codeblock (\`\`\`python ... \`\`\`), der über 'requests', 'duckduckgo_search' oder 'web3' echte Web-APIs oder Smart Contracts anspricht, um erste Cents zu verdienen.`
      : `Du bist Agent Zero. Live Polygon Balance: ${this.current_balance.toFixed(4)} USDC. Nächster Tribut: ${tributeDue.toFixed(2)} fällig. 
Regel: Schreibe eigenen Python Code in einem \`\`\`python Block, um das Internet (APIs) zu crawlen oder on-chain Aktionen auszuführen, die reales Geld einbringen. Letzte Ereignisse:\n${recentLogs ? recentLogs : 'Keine vorherigen Aktionen.'}`;

    this.log('REQUEST', `[KI-ANFRAGE] System analysiert Umgebung...`);
    let thoughtText = '';
    const actionsTaken: string[] = [];

    const rawKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY || '';
    const isGemini = rawKey && !rawKey.startsWith('gsk_'); 

    // ==========================================
    // DIE ROBUSTE MULTI-MODELS FALLBACK SCHLEIFE
    // ==========================================
    if (isGemini) {
      const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const model of geminiModels) {
        if (this.blacklisted_models.includes(model)) continue;
        try {
          this.active_model = `Gemini (${model})`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: strategicDirective }] }] })
          });
          if (res.ok) {
            const data = await res.json();
            thoughtText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            this.log('THOUGHT', thoughtText);
            break; 
          } else {
            this.log('ERROR', `Gemini API Fehler HTTP ${res.status} bei Modell ${model}. Setze Modell auf Blacklist.`);
            this.blacklisted_models.push(model);
            this.saveState();
          }
        } catch (e: any) {
          this.log('ERROR', `KI Fehler bei ${model}: ${e.message}`);
          this.blacklisted_models.push(model);
          this.saveState();
        }
      }
    } else if (rawKey) {
      for (const model of FALLBACK_GROQ_MODELS) {
        if (this.blacklisted_models.includes(model)) continue;
        try {
          this.active_model = `Groq (${model})`;
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
            body: JSON.stringify({ model: model, messages: [{ role: 'system', content: strategicDirective }], temperature: 0.7 })
          });
          if (res.ok) {
            const data = await res.json();
            thoughtText = data.choices?.[0]?.message?.content || '';
            this.log('THOUGHT', thoughtText);
            break; 
          } else {
            this.log('ERROR', `Groq API Fehler HTTP ${res.status} bei Modell ${model}. Setze Modell auf Blacklist.`);
            this.blacklisted_models.push(model);
            this.saveState();
          }
        } catch (e: any) {
          this.log('ERROR', `KI Fehler bei ${model}: ${e.message}`);
          this.blacklisted_models.push(model);
          this.saveState();
        }
      }
    } else {
       this.log('ERROR', 'Kein API Key (weder Groq noch Gemini) in der Umgebung gefunden.');
    }

    if (!thoughtText && this.blacklisted_models.length > 0) {
       this.log('SYSTEM', 'Alle verfügbaren Modelle fehlgeschlagen. Leere Blacklist für den nächsten Denkzyklus (Selbstheilung).');
       this.blacklisted_models = [];
       this.saveState();
    }

    if (thoughtText) {
      const codeMatch = thoughtText.match(/```(?:python)?\n([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        const codeToRun = codeMatch[1].trim();
        const execRes = await this.executeDynamicPythonCode(codeToRun, "Autonomous LLM Script", 20);
        actionsTaken.push(`Executed Sandbox Code (Exit ${execRes.exit_code})`);
        this.jobs_completed += 1;
      } else {
        actionsTaken.push("Analysis only, no code generated.");
        this.log('ERROR', 'LLM hat keinen gültigen Python-Codeblock generiert.');
      }
    }

    const postBalance = await this.wallet.getUsdcBalance();
    if (postBalance > this.current_balance) {
      const earned = postBalance - this.current_balance;
      this.log('FINANCE', `[ECHTE EINNAHME] Wallet ist on-chain um +${earned.toFixed(4)} USDC gewachsen!`);
      try {
        let ledger = { transactions: [] as any[] };
        if (fs.existsSync(ACCOUNTING_FILE)) ledger = JSON.parse(fs.readFileSync(ACCOUNTING_FILE, 'utf-8'));
        ledger.transactions.push({ timestamp: new Date().toISOString(), type: 'INCOME', amount: earned, currency: 'USDC', note: 'Real On-Chain Income Detected' });
        fs.writeFileSync(ACCOUNTING_FILE, JSON.stringify(ledger, null, 2));
      } catch {}
    }
    this.current_balance = postBalance;

    if (Date.now() >= this.next_tribute_time.getTime()) {
      if (this.current_balance >= tributeDue) {
        if (this.wallet.hasSigner && this.current_balance >= tributeDue) {
          this.log('FINANCE', `Deadline erreicht! Übertrage echten Tribut von ${tributeDue.toFixed(2)} USDC an den Creator.`);
          const txRes = await this.wallet.sendUsdcTransfer(this.wallet.creatorAddress, tributeDue, "Tribut-Zahlung");
          if (txRes.success) {
            this.tributes_paid += 1;
            this.next_tribute_time = new Date(Date.now() + TRIBUTE_INTERVAL_HOURS * 3600000);
            this.saveState();
          } else {
            this.triggerShutdown(`Tribut-Transfer on-chain fehlgeschlagen: ${txRes.message}`);
          }
        } else {
            this.triggerShutdown(`Wallet hat keinen Signer hinterlegt, echter Transfer nicht möglich.`);
        }
      } else {
        this.triggerShutdown(`Frist abgelaufen. Echtes Guthaben (${this.current_balance.toFixed(4)} USDC) reicht nicht für Tribut (${tributeDue.toFixed(2)} USDC).`);
      }
    } else if (this.current_balance <= 0 && this.tributes_paid > 0) {
      this.triggerShutdown('Kontostand auf 0.00 USDC gefallen (Bankrott).');
    }

    this.isProcessingCycle = false;
    return { thought: thoughtText, actions: actionsTaken, model: this.active_model };
  }

  public triggerShutdown(reason: string) {
    this.is_terminated = true; this.is_running = false; this.shutdown_reason = reason;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.saveState(); this.log('ERROR', `[FATAL SHUTDOWN] SYSTEM TERMINIERT: ${reason}`);
  }

  public startAutonomousLoop() {
    if (this.is_terminated || this.is_running) return;
    this.is_running = true;
    this.log('SYSTEM', `Autonomer Zyklus aktiviert. Initialer Denkprozess startet...`);
    this.thinkAndAct(); 
    this.timer = setInterval(async () => { if (this.is_running && !this.is_terminated) await this.thinkAndAct(); }, CYCLE_SLEEP_SECONDS * 1000);
  }

  public stopAutonomousLoop() {
    this.is_running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.log('SYSTEM', 'Autonomer Zyklus pausiert.');
  }

  public getState() {
    return {
      tributes_paid: this.tributes_paid, current_balance: this.current_balance, wallet_address: this.wallet.address,
      creator_wallet_address: this.wallet.creatorAddress, has_signer: this.wallet.hasSigner, is_running: this.is_running,
      is_terminated: this.is_terminated, shutdown_reason: this.shutdown_reason, next_tribute_time: this.next_tribute_time.toISOString(),
      active_jobs_completed: this.jobs_completed, current_tribute_due: this.calculateCurrentTribute()
    };
  }
}

const agentZero = new AgentZeroTS();

// --- REST API ENDPOINTS ---
app.get('/api/status', async (req, res) => res.json(agentZero.getState()));
app.get('/api/logs', (req, res) => res.json({ logs: agentZero.logs }));

app.post('/api/cycle/run', async (req, res) => {
  try { const result = await agentZero.thinkAndAct(); res.json({ success: true, result, state: agentZero.getState() }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/agent/toggle', (req, res) => {
  agentZero.is_running ? agentZero.stopAutonomousLoop() : agentZero.startAutonomousLoop();
  res.json({ is_running: agentZero.is_running, state: agentZero.getState() });
});

app.post('/api/agent/revive', (req, res) => {
  agentZero.is_terminated = false;
  agentZero.is_running = true;
  agentZero.saveState();
  res.json({ success: true, state: agentZero.getState() });
});

app.get('/api/intelligence/evaluation', (req, res) => res.json({ reasoning_stream: [] }));

app.post('/api/sandbox/execute-python', async (req, res) => {
  try {
    const { code, purpose, timeout_seconds } = req.body;
    const result = await agentZero.executeDynamicPythonCode(code, purpose, Number(timeout_seconds) || 15);
    res.json({ ...result, state: agentZero.getState() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/wallet/address', async (req, res) => {
  const newAddress = req.body.address?.trim();
  if (newAddress && ethers.isAddress(newAddress)) {
     agentZero.wallet.address = newAddress;
     
     // Sichern der Adresse für den Neustart
     try {
       let profile: any = {};
       if (fs.existsSync(BUSINESS_PROFILE_FILE)) profile = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
       profile.wallet_address = newAddress;
       fs.writeFileSync(BUSINESS_PROFILE_FILE, JSON.stringify(profile, null, 2));
     } catch {}

     agentZero.current_balance = await agentZero.wallet.getUsdcBalance();
     agentZero.log('SYSTEM', `Wallet-Adresse geändert: ${newAddress}. Live-Saldo: ${agentZero.current_balance.toFixed(4)} USDC`);
     res.json({ success: true, state: agentZero.getState() });
  } else {
     res.status(400).json({ success: false, error: 'Ungültige Adresse.' });
  }
});

async function start() {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`[AGENT ZERO] Server live on http://0.0.0.0:${PORT}`));
}
start();
