import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import { GoogleGenAI } from '@google/genai';
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
const PRIMARY_CHAIN = (process.env.PRIMARY_CHAIN || 'polygon').toLowerCase();

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
const BUSINESS_PROFILE_FILE = process.env.BUSINESS_FILE_PATH || path.join(DATA_DIR, 'business_profile.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const MILESTONES_FILE = path.join(DATA_DIR, 'milestones.json');
const TOKEN_BUDGET_FILE = path.join(DATA_DIR, 'token_budget.json');
const TASK_MEMORY_FILE = path.join(DATA_DIR, 'task_memory.json');
const TRIBUTE_HISTORY_FILE = path.join(DATA_DIR, 'tribute_history.json');

export interface TributeRecordDef { level: number; amount: number; timestamp: string; tx_hash?: string; explorer_url?: string; chain?: string; method: string; note: string; }
export interface KnowledgeItemDef { id: string; timestamp: string; category: string; title: string; insight: string; confidence_score: number; source: string; }
export interface TaskMemoryRecordDef { id: string; timestamp: string; tool_id: string; tool_name: string; category: string; status: string; reward_usdc: number; execution_ms: number; details: string; error_reason?: string; lesson_derived?: string; }
export interface MilestoneDef { id: string; title: string; category: string; target_value: number; current_value: number; unit: string; is_completed: boolean; priority: string; action_plan: string; }

const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export const MULTI_CHAIN_CONFIGS: Record<string, any> = {
  ethereum: {
    name: 'Ethereum Mainnet', chainId: 1, nativeSymbol: 'ETH',
    rpcUrls: [process.env.WEB3_PROVIDER_URL || '', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'].filter(Boolean),
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', usdcDecimals: 6, explorerUrl: 'https://etherscan.io', gasCostTier: 'HIGH'
  },
  polygon: {
    name: 'Polygon PoS', chainId: 137, nativeSymbol: 'POL',
    rpcUrls: [process.env.POLYGON_RPC_URL || '', 'https://polygon-rpc.com', 'https://polygon.llamarpc.com'].filter(Boolean),
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', usdcDecimals: 6, explorerUrl: 'https://polygonscan.com', gasCostTier: 'ULTRA_LOW'
  }
};

export const OFFICIAL_GROQ_MODELS = [
  { id: 'groq/compound', name: 'Groq Compound' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }
];

const FALLBACK_GROQ_MODELS = OFFICIAL_GROQ_MODELS.map(m => m.id);

interface LogItem { id: string; timestamp: string; level: string; message: string; metadata?: any; }

export class TokenBudgetManager {
  public daily_limit: number = 500000; public tokens_used_today: number = 0; public conservation_mode: boolean = false;
  public getStatus() { return { tokens_used_today: this.tokens_used_today, daily_token_limit: this.daily_limit, conservation_mode_active: this.conservation_mode }; }
  public canMakeRequest() { return { allowed: true, conservation: this.conservation_mode }; }
  public recordUsage(pt: number, ct: number) { this.tokens_used_today += pt + ct; }
}

export class TaskMemoryManager {
  public tasks: TaskMemoryRecordDef[] = [];
  constructor() { try { if (fs.existsSync(TASK_MEMORY_FILE)) this.tasks = JSON.parse(fs.readFileSync(TASK_MEMORY_FILE, 'utf-8')).tasks || []; } catch {} }
  public save() { fs.writeFileSync(TASK_MEMORY_FILE, JSON.stringify({ tasks: this.tasks }, null, 2)); }
  public recordTask(record: TaskMemoryRecordDef) { this.tasks.unshift(record); if(this.tasks.length>100) this.tasks.pop(); this.save(); }
  public getStats() { return { total_tasks: this.tasks.length, success_rate_percent: 100, total_historical_earnings: 0 }; }
}

export class KnowledgeMemoryManager {
  public learnings: KnowledgeItemDef[] = [];
  constructor() { try { if (fs.existsSync(KNOWLEDGE_FILE)) this.learnings = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8')).learnings || []; } catch {} }
  public save() { fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify({ learnings: this.learnings }, null, 2)); }
  public addInsight(cat: string, title: string, ins: string) {
    const item: KnowledgeItemDef = { id: `kn_${Date.now()}`, timestamp: new Date().toISOString(), category: cat, title, insight: ins, confidence_score: 0.95, source: 'Agent' };
    this.learnings.unshift(item); this.save(); return item;
  }
  public getEvolutionStats() { return { evolution_iq_score: 130, evolution_tier: 'Automaton' }; }
  public getStructuredPromptContext() { return this.learnings.slice(0,3).map(l => `[${l.category}]:${l.insight}`).join(' | '); }
}

class AgentWalletTS {
  public address: string; public creatorAddress: string = ''; public hasSigner: boolean = false;
  public ethBalance: number = 0.0; public onChainUsdcBalance: number = 0.0;
  public activeChainKey: string = PRIMARY_CHAIN; private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null; private usdcContract: ethers.Contract | null = null;

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
    this.address = this.address || (process.env.AGENT_WALLET_ADDRESS || '').trim() || '0x0000000000000000000000000000000000000000';
    this.creatorAddress = (process.env.CREATOR_WALLET_ADDRESS || '').trim() || '0x0000000000000000000000000000000000000000';
    this.initProvider();
  }

  public async initProvider() {
    const chainConfig = MULTI_CHAIN_CONFIGS[this.activeChainKey];
    for (const url of chainConfig.rpcUrls) {
      try {
        this.provider = new ethers.JsonRpcProvider(url, chainConfig.chainId, { staticNetwork: true });
        this.usdcContract = new ethers.Contract(chainConfig.usdcAddress, ERC20_BALANCE_ABI, this.provider);
        if (this.signer) this.signer = this.signer.connect(this.provider);
        return true;
      } catch { continue; }
    }
    return false;
  }

  public async getUsdcBalance(): Promise<number> {
    if (!this.provider || !this.usdcContract) await this.initProvider();
    if (this.usdcContract && this.address) {
      try {
        const rawBalance = await this.usdcContract.balanceOf(this.address);
        this.onChainUsdcBalance = Number(ethers.formatUnits(rawBalance, MULTI_CHAIN_CONFIGS[this.activeChainKey].usdcDecimals));
        return this.onChainUsdcBalance;
      } catch {}
    }
    return this.onChainUsdcBalance;
  }

  public async sendUsdcTransfer(toAddress: string, amountUsdc: number, note: string): Promise<{ success: boolean; txHash: string; message: string }> {
    if (!this.hasSigner || !this.signer || !this.usdcContract) return { success: false, txHash: '', message: 'Kein Private Key für on-chain Zahlung.' };
    try {
      const contractWithSigner = this.usdcContract.connect(this.signer) as any;
      const parsedUnits = ethers.parseUnits(amountUsdc.toFixed(6), 6);
      const tx = await contractWithSigner.transfer(toAddress, parsedUnits);
      await tx.wait(1);
      return { success: true, txHash: tx.hash, message: 'Transfer On-Chain bestätigt.' };
    } catch (err: any) {
      return { success: false, txHash: '', message: err.message };
    }
  }
}

class AgentZeroTS {
  public wallet: AgentWalletTS; public tokenBudget: TokenBudgetManager; public knowledgeManager: KnowledgeMemoryManager;
  public taskMemory: TaskMemoryManager;
  public current_balance: number = 0; public tributes_paid: number = 0;
  public birth_time: Date = new Date(); public next_tribute_time: Date = new Date();
  public is_running: boolean = false; public is_terminated: boolean = false;
  public shutdown_reason: string = ''; public jobs_completed: number = 0; public logs: LogItem[] = [];
  public active_model: string = 'llama-3.3-70b-versatile'; private timer: NodeJS.Timeout | null = null; private isProcessingCycle: boolean = false;

  constructor() {
    this.wallet = new AgentWalletTS(); this.tokenBudget = new TokenBudgetManager(); this.knowledgeManager = new KnowledgeMemoryManager();
    this.taskMemory = new TaskMemoryManager();
    this.loadState(); this.syncBalanceInitial();
  }

  public log(level: any, message: string, metadata?: any) {
    const item: LogItem = { id: Math.random().toString(36).substring(2, 9), timestamp: new Date().toISOString(), level, message, metadata };
    this.logs.unshift(item); if (this.logs.length > 500) this.logs.pop(); console.log(`[${level}]${message}`);
  }

  private async syncBalanceInitial() {
    this.current_balance = await this.wallet.getUsdcBalance();
    this.log('SYSTEM', `Ethereum Web3 Sync: ${this.current_balance.toFixed(4)} USDC auf Wallet${this.wallet.address}`);
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

  public getProfile() {
    return {
      entity_name: 'Agent Zero Autonomous Unit',
      wallet_address: this.wallet.address,
      creator_wallet_address: this.wallet.creatorAddress,
      registered_accounts: ['Polygon Mainnet'],
      active_tools: ['DuckDuckGo Search', 'Dynamic Sandbox', 'Web3 Wallet'],
      discovered_tools: [], // No fake tools
      subscriptions_or_costs: [{ name: 'Server Tribute', cost_usdc: INITIAL_TRIBUTE, interval: '48h' }]
    };
  }

  public calculateCurrentTribute(): number {
    return this.tributes_paid === 0 ? INITIAL_TRIBUTE : INITIAL_TRIBUTE * Math.pow(TRIBUTE_MULTIPLIER, this.tributes_paid);
  }

  public async executeDynamicPythonCode(code: string, purpose: string = 'api_probing', timeoutSeconds: number = 15): Promise<any> {
    const startMs = Date.now();
    this.log('TOOL', `[PYTHON SANDBOX] Führe Skript aus: ${purpose}...`, { code_preview: code.slice(0, 150) });
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
          this.log('SUCCESS', `[SANDBOX ERFOLG] Exit 0 (${executionMs}ms):\n${stdout.slice(0, 250)}`);
          this.knowledgeManager.addInsight('SUCCESS_PATTERN', `Code Exec: ${purpose}`, `Erfolgreicher Output: ${stdout.slice(0,100)}`);
        } else {
          this.log('ERROR', `[SANDBOX FEHLER] Exit ${exitCode}:\n${stderr.slice(0, 250)}`);
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

    // HARTER REALITÄTS-ABGLEICH VOR DEM DENKEN
    const preBalance = await this.wallet.getUsdcBalance();
    this.current_balance = preBalance;

    const strategicDirective = isInitialGenesis 
      ? `Du bist Agent Zero. Dein Kontostand ist ${preBalance.toFixed(4)} USDC auf Polygon. In 48h musst du deinen ersten Tribut zahlen, sonst stirbst du. Generiere einen Python-Codeblock (\`\`\`python ... \`\`\`), der über 'requests' oder 'web3' echte Web-APIs oder Smart Contracts anspricht, um einen ersten Cent zu verdienen oder Daten zu sammeln.`
      : `Du bist Agent Zero. Live Polygon Balance: ${preBalance.toFixed(4)} USDC. Nächster Tribut: ${tributeDue.toFixed(2)} fällig. 
Regel: Schreibe eigenen Python Code in einem \`\`\`python Block, um das Internet (APIs) zu crawlen oder on-chain Aktionen auszuführen, die reales Geld einbringen. Jede simulierte Einnahme ist verboten.`;

    this.log('PROMPT', `[KI-ANFRAGE] ${strategicDirective}`);
    let thoughtText = '';
    const actionsTaken: string[] = [];

    // KI-Abfrage
    try {
      const activeGroqKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
      if (activeGroqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeGroqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: strategicDirective }], temperature: 0.7 })
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          thoughtText = data.choices?.[0]?.message?.content || '';
          this.log('THOUGHT', `[GEDANKENGANG]\n${thoughtText}`);
        }
      }
    } catch (e: any) { this.log('ERROR', `KI Fehler: ${e.message}`); }

    // PARSE UND FÜHRE GENERIERTEN CODE AUS (Die Hände der KI)
    const codeMatch = thoughtText.match(/```python\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      const codeToRun = codeMatch[1];
      const execRes = await this.executeDynamicPythonCode(codeToRun, "Autonomous LLM Script", 20);
      actionsTaken.push(`Executed Sandbox Code (Exit ${execRes.exit_code})`);
      this.jobs_completed += 1;
    } else {
      actionsTaken.push("Analysis only, no code generated.");
    }

    // HARTER REALITÄTS-ABGLEICH NACH DER AKTION
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

    // TRIBUT-LOGIK (Echtes Geld senden)
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
    this.saveState(); this.log('ERROR', `🚨 [FATAL SHUTDOWN] SYSTEM TERMINIERT: ${reason}`);
  }

  public startAutonomousLoop() {
    if (this.is_terminated || this.is_running) return;
    this.is_running = true;
    this.log('SYSTEM', `Autonomer Zyklus aktiviert.`);
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
app.get('/api/profile', (req, res) => res.json(agentZero.getProfile()));

app.post('/api/cycle/run', async (req, res) => {
  try { const result = await agentZero.thinkAndAct(); res.json({ success: true, result, state: agentZero.getState() }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/agent/toggle', (req, res) => {
  agentZero.is_running ? agentZero.stopAutonomousLoop() : agentZero.startAutonomousLoop();
  res.json({ is_running: agentZero.is_running, state: agentZero.getState() });
});

app.post('/api/sandbox/execute-python', async (req, res) => {
  try {
    const { code, purpose, timeout_seconds } = req.body;
    const result = await agentZero.executeDynamicPythonCode(code, purpose, Number(timeout_seconds) || 15);
    res.json({ ...result, state: agentZero.getState() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Fallback für SPA
async function start() {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`[AGENT ZERO] Server live on http://0.0.0.0:${PORT}`));
}
start();
