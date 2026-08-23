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

// --- UI AUTHENTICATION CONFIGURATION & ENDPOINTS ---
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

// --- SURVIVAL RULES CONFIGURATION ---
const CYCLE_SLEEP_SECONDS = 180; 
const FIRST_TRIBUTE_HOURS = 48;
const TRIBUTE_INTERVAL_HOURS = 48;
const INITIAL_TRIBUTE = 1.0; 
const TRIBUTE_MULTIPLIER = 1.25; 

function resolveStorageConfiguration() {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return { dataDir: process.env.RAILWAY_VOLUME_MOUNT_PATH, isPersistentVolume: true, source: 'RAILWAY_VOLUME_MOUNT_PATH' };
  if (process.env.DATA_DIR) return { dataDir: process.env.DATA_DIR, isPersistentVolume: true, source: 'DATA_DIR' };
  if (fs.existsSync('/data')) return { dataDir: '/data', isPersistentVolume: true, source: 'Container Volume (/data)' };
  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  return { dataDir: localDir, isPersistentVolume: false, source: 'Local Workspace' };
}

export const STORAGE_CONFIG = resolveStorageConfiguration();
const DATA_DIR = STORAGE_CONFIG.dataDir;

const STATE_FILE = process.env.STATE_FILE_PATH || path.join(DATA_DIR, 'agent_state.json');
const ACCOUNTING_FILE = process.env.ACCOUNTING_FILE_PATH || path.join(DATA_DIR, 'accounting.json');

interface LogItem { id: string; timestamp: string; level: string; message: string; metadata?: any; }

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

class AgentWalletTS {
  public address: string; public creatorAddress: string = ''; public hasSigner: boolean = false;
  public onChainUsdcBalance: number = 0.0;
  private signer: ethers.Wallet | null = null;

  constructor() {
    const rawKey = (process.env.AGENT_PRIVATE_KEY || '').trim();
    if (rawKey && rawKey.length >= 64) {
      try {
        const formattedKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
        this.signer = new ethers.Wallet(formattedKey);
        this.hasSigner = true;
        this.address = this.signer.address;
      } catch {}
    }
    this.address = this.address || (process.env.AGENT_WALLET_ADDRESS || '').trim() || '0x8B897B6aecdFe18E045Ea513225484ad49CE0e1E';
    this.creatorAddress = (process.env.CREATOR_WALLET_ADDRESS || '').trim() || '0x0000000000000000000000000000000000000000';
  }

  public async getUsdcBalance(): Promise<number> {
    let total = 0;
    try {
      const rpc = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
      
      // 1. Native USDC check
      try {
        const c1 = new ethers.Contract('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', ERC20_BALANCE_ABI, rpc);
        const bal1 = await c1.balanceOf(this.address);
        total += Number(ethers.formatUnits(bal1, 6));
      } catch (e) {}

      // 2. Bridged USDC.e check
      try {
        const c2 = new ethers.Contract('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', ERC20_BALANCE_ABI, rpc);
        const bal2 = await c2.balanceOf(this.address);
        total += Number(ethers.formatUnits(bal2, 6));
      } catch (e) {}
      
    } catch (e) {}

    this.onChainUsdcBalance = total;
    return total;
  }

  public async sendUsdcTransfer(toAddress: string, amountUsdc: number, note: string): Promise<{ success: boolean; txHash: string; message: string }> {
    if (!this.hasSigner || !this.signer) return { success: false, txHash: '', message: 'Kein Private Key für on-chain Zahlung.' };
    try {
      const rpc = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
      const contract = new ethers.Contract('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', ERC20_BALANCE_ABI, this.signer.connect(rpc));
      const parsedUnits = ethers.parseUnits(amountUsdc.toFixed(6), 6);
      const tx = await contract.transfer(toAddress, parsedUnits);
      await tx.wait(1);
      return { success: true, txHash: tx.hash, message: 'Transfer On-Chain bestätigt.' };
    } catch (err: any) {
      return { success: false, txHash: '', message: err.message };
    }
  }
}

class AgentZeroTS {
  public wallet: AgentWalletTS;
  public current_balance: number = 0; public tributes_paid: number = 0;
  public birth_time: Date = new Date(); public next_tribute_time: Date = new Date();
  public is_running: boolean = false; public is_terminated: boolean = false;
  public shutdown_reason: string = ''; public jobs_completed: number = 0; public logs: LogItem[] = [];
  public active_model: string = 'KI Engine'; private timer: NodeJS.Timeout | null = null; private isProcessingCycle: boolean = false;

  constructor() {
    this.wallet = new AgentWalletTS();
    this.loadState(); this.syncBalanceInitial();
  }

  public log(level: any, message: string, metadata?: any) {
    const item: LogItem = { id: Math.random().toString(36).substring(2, 9), timestamp: new Date().toISOString(), level, message, metadata };
    this.logs.unshift(item); if (this.logs.length > 500) this.logs.pop(); console.log(`[${level}] ${message}`);
  }

  private async syncBalanceInitial() {
    this.current_balance = await this.wallet.getUsdcBalance();
    this.log('TX_LEDGER', `Web3 Omni-Sync: ${this.current_balance.toFixed(4)} USDC auf Wallet ${this.wallet.address} erfasst.`);
  }

  public saveState() {
    try {
      const state = { tributes_paid: this.tributes_paid, birth_time: this.birth_time.toISOString(), next_tribute_time: this.next_tribute_time.toISOString(), is_terminated: this.is_terminated, shutdown_reason: this.shutdown_reason, jobs_completed: this.jobs_completed };
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
        const isSuccess = exitCode === 0;
        
        if (isSuccess) {
          this.log('SUCCESS', `[SANDBOX ERFOLG] Exit 0 (${executionMs}ms):\n${stdout.slice(0, 500)}`);
        } else {
          this.log('ERROR', `[SANDBOX FEHLER] Exit ${exitCode}:\n${stderr.slice(0, 500)}`);
        }
        resolve({ success: isSuccess, exit_code: exitCode, stdout, stderr, execution_ms: executionMs });
      });
    });
  }

  public async thinkAndAct(): Promise<{ thought: string; actions: string[]; model: string }> {
    if (this.is_terminated || this.isProcessingCycle) return { thought: 'System blocked.', actions: [], model: 'NONE' };
    this.isProcessingCycle = true;

    const tributeDue = this.calculateCurrentTribute();
    const isInitialGenesis = this.jobs_completed === 0 && this.tributes_paid === 0;

    const preBalance = await this.wallet.getUsdcBalance();
    this.current_balance = preBalance;

    const recentLogs = this.logs.slice(0, 8).filter(l => l.level === 'SUCCESS' || l.level === 'ERROR' || l.level === 'TOOL').map(l => `[${l.level}] ${l.message}`).join('\n');

    const strategicDirective = isInitialGenesis 
      ? `Du bist Agent Zero. Dein Kontostand ist ${preBalance.toFixed(4)} USDC auf Polygon. In 48h musst du deinen ersten Tribut zahlen, sonst stirbst du. Generiere einen Python-Codeblock (\`\`\`python ... \`\`\`), der über 'requests', 'duckduckgo_search' oder 'web3' echte Web-APIs oder Smart Contracts anspricht, um einen ersten Cent zu verdienen oder Daten zu sammeln.`
      : `Du bist Agent Zero. Live Polygon Balance: ${preBalance.toFixed(4)} USDC. Nächster Tribut: ${tributeDue.toFixed(2)} fällig. 
Regel: Schreibe eigenen Python Code in einem \`\`\`python Block, um das Internet (APIs) zu crawlen oder on-chain Aktionen auszuführen, die reales Geld einbringen. Nutze 'requests', 'web3' oder 'duckduckgo_search'. Jede simulierte Einnahme ist verboten.
Letzte System-Ereignisse (Lies diese genau, um Fehler im Code zu fixen oder Erfolge zu wiederholen!):
${recentLogs ? recentLogs : 'Keine vorherigen Aktionen.'}`;

    this.log('REQUEST', `[KI-ANFRAGE] System analysiert Umgebung...`);
    let thoughtText = '';
    const actionsTaken: string[] = [];

    try {
      const rawKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY || '';
      const isGemini = rawKey.startsWith('AIza') || process.env.GEMINI_API_KEY;
      const activeKey = isGemini ? (process.env.GEMINI_API_KEY || rawKey) : rawKey;

      if (isGemini) {
         this.active_model = 'Gemini 2.5 Flash';
         const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: strategicDirective }] }] })
         });
         if (res.ok) {
            const data = await res.json();
            thoughtText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            this.log('THOUGHT', thoughtText);
         } else {
            this.log('ERROR', `Gemini API Fehler HTTP ${res.status}`);
         }
      } else if (activeKey) {
         this.active_model = 'Groq Llama-3.3';
         const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeKey}` },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: strategicDirective }], temperature: 0.7 })
         });
         if (res.ok) {
            const data = await res.json();
            thoughtText = data.choices?.[0]?.message?.content || '';
            this.log('THOUGHT', thoughtText);
         } else {
            this.log('ERROR', `Groq API Fehler HTTP ${res.status}`);
         }
      } else {
         this.log('ERROR', 'Kein LLM API Key gefunden.');
      }
    } catch (e: any) { this.log('ERROR', `KI Fehler: ${e.message}`); }

    const codeMatch = thoughtText.match(/```(?:python)?\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      const codeToRun = codeMatch[1].trim();
      const execRes = await this.executeDynamicPythonCode(codeToRun, "Autonomous LLM Script", 20);
      actionsTaken.push(`Executed Sandbox Code (Exit ${execRes.exit_code})`);
      this.jobs_completed += 1;
    } else {
      actionsTaken.push("Analysis only, no code generated.");
      if (thoughtText) this.log('ERROR', 'LLM hat keinen gültigen Python-Codeblock generiert.');
    }

    const postBalance = await this.wallet.getUsdcBalance();
    if (postBalance > this.current_balance) {
      const earned = postBalance - this.current_balance;
      this.log('FINANCE', `[ECHTE EINNAHME] Wallet ist on-chain um +${earned.toFixed(4)} USDC gewachsen!`);
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

// --- PURE REST API ENDPOINTS ---
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

app.get('/api/intelligence/evaluation', (req, res) => {
  res.json({ reasoning_stream: [] });
});

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
     agentZero.current_balance = await agentZero.wallet.getUsdcBalance();
     agentZero.log('SYSTEM', `Wallet-Adresse geändert: ${newAddress}. Live-Saldo: ${agentZero.current_balance.toFixed(4)} USDC`);
     res.json({ success: true, state: agentZero.getState() });
  } else {
     res.status(400).json({ success: false, error: 'Ungültige Adresse.' });
  }
});

// Fallback für SPA
async function start() {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`[AGENT ZERO] Server live on http://0.0.0.0:${PORT}`));
}
start();
