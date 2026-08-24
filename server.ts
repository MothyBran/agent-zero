import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

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
const CYCLE_SLEEP_SECONDS = 60; // 1-Minuten Loop (Aggressives Takt-Intervall)
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
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const TASK_MEMORY_FILE = path.join(DATA_DIR, 'task_memory.json');
const MILESTONES_FILE = path.join(DATA_DIR, 'milestones.json');
const TOKEN_BUDGET_FILE = path.join(DATA_DIR, 'token_budget.json');
const BUSINESS_PROFILE_FILE = path.join(DATA_DIR, 'business_profile.json');

interface LogItem { id: string; timestamp: string; level: string; message: string; metadata?: any; }
interface KnowledgeItemDef { id: string; timestamp: string; category: string; title: string; insight: string; confidence_score: number; times_applied?: number; success_reinforcements?: number; source: string; }
interface TaskMemoryRecordDef { id: string; timestamp: string; tool_id: string; tool_name: string; category: string; status: string; reward_usdc: number; execution_ms: number; details: string; error_reason?: string; lesson_derived?: string; }
interface MilestoneDef { id: string; title: string; category: string; target_value: number; current_value: number; unit: string; is_completed: boolean; completed_at?: string; priority: string; action_plan: string; }

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
      'https://polygon.llamarpc.com', 
      'https://polygon-bor-rpc.publicnode.com'
    ].filter(Boolean),
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', usdcBridgedAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', usdcDecimals: 6
  }
};

const FALLBACK_GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen-2.5-32b', 'mixtral-8x7b-32768'];

// Resolves hanging requests gracefully
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// ==========================================
// 1. KOGNITION & GEDÄCHTNIS MANAGER
// ==========================================

export class TokenBudgetManager {
  public daily_limit: number = 500000; 
  public rpm_limit: number = 30; 
  private recentRequests: number[] = [];
  public tokens_used_today: number = 0;
  public tokens_saved_by_compression: number = 0;
  public last_reset_date: string = new Date().toISOString().slice(0, 10);
  public conservation_mode: boolean = false;

  constructor() { this.load(); }
  public load() {
    try {
      if (fs.existsSync(TOKEN_BUDGET_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_BUDGET_FILE, 'utf-8'));
        const today = new Date().toISOString().slice(0, 10);
        if (data.last_reset_date === today) {
          this.tokens_used_today = data.tokens_used_today || 0;
          this.tokens_saved_by_compression = data.tokens_saved_by_compression || 0;
        } else {
          this.tokens_used_today = 0; this.tokens_saved_by_compression = 0; this.last_reset_date = today; this.save();
        }
      }
    } catch {}
  }
  public save() { try { fs.writeFileSync(TOKEN_BUDGET_FILE, JSON.stringify(this, null, 2)); } catch {} }
  public getRpmCurrent(): number {
    const now = Date.now();
    this.recentRequests = this.recentRequests.filter(ts => now - ts < 60000);
    return this.recentRequests.length;
  }
  public canMakeRequest(): { allowed: boolean; reason?: string; conservation: boolean; recommendedModel?: string } {
    const rpm = this.getRpmCurrent();
    const usagePercent = (this.tokens_used_today / this.daily_limit) * 100;
    this.conservation_mode = usagePercent >= 65 || rpm >= 18;
    if (rpm >= this.rpm_limit - 2) return { allowed: false, reason: `Rate-Limit Shield aktiv (${rpm}/${this.rpm_limit}).`, conservation: true };
    if (this.tokens_used_today >= this.daily_limit * 0.95) return { allowed: false, reason: `Token-Budget zu 95% erschöpft.`, conservation: true };
    return { allowed: true, conservation: this.conservation_mode, recommendedModel: this.conservation_mode ? 'llama-3.1-8b-instant' : undefined };
  }
  public recordUsage(promptTokens: number, completionTokens: number, tokensSaved: number = 0) {
    this.recentRequests.push(Date.now());
    this.tokens_used_today += (promptTokens || 0) + (completionTokens || 0);
    this.tokens_saved_by_compression += tokensSaved;
    this.save();
  }
  public compressPrompt(systemPrompt: string, userPrompt: string): { compressedSystem: string; compressedUser: string; tokensSaved: number } {
    const originalLen = (systemPrompt.length + userPrompt.length) / 4;
    const compressedSystem = systemPrompt.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const compressedUser = userPrompt.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const compressedLen = (compressedSystem.length + compressedUser.length) / 4;
    return { compressedSystem, compressedUser, tokensSaved: Math.max(0, Math.round(originalLen - compressedLen)) };
  }
  public getStatus() {
    return {
      tokens_used_today: this.tokens_used_today, daily_token_limit: this.daily_limit,
      estimated_tokens_remaining: Math.max(0, this.daily_limit - this.tokens_used_today),
      budget_usage_percent: Math.min(100, Number(((this.tokens_used_today / this.daily_limit) * 100).toFixed(1))),
      rpm_current: this.getRpmCurrent(), rpm_limit: this.rpm_limit, tokens_saved_by_compression: this.tokens_saved_by_compression,
      conservation_mode_active: this.conservation_mode, active_strategy: this.conservation_mode ? 'Rate-Limit Shield' : 'High-Throughput'
    };
  }
}

export class TaskMemoryManager {
  public tasks: TaskMemoryRecordDef[] = [];
  constructor() { this.load(); }
  public load() { try { if (fs.existsSync(TASK_MEMORY_FILE)) { const data = JSON.parse(fs.readFileSync(TASK_MEMORY_FILE, 'utf-8')); if (Array.isArray(data.tasks)) { this.tasks = data.tasks; return; } } this.tasks = []; } catch { this.tasks = []; } }
  public save() { try { fs.writeFileSync(TASK_MEMORY_FILE, JSON.stringify({ tasks: this.tasks, updated_at: new Date().toISOString() }, null, 2)); } catch {} }
  public recordTask(record: TaskMemoryRecordDef) { this.tasks.unshift(record); if (this.tasks.length > 300) this.tasks.pop(); this.save(); }
  public getStats() {
    const total = this.tasks.length;
    const successes = this.tasks.filter(t => t.status === 'SUCCESS').length;
    return {
      total_tasks: total, total_success: successes, total_failures: this.tasks.filter(t => t.status === 'FAILURE').length,
      success_rate_percent: total > 0 ? Number(((successes / total) * 100).toFixed(1)) : 100,
      total_historical_earnings: Number(this.tasks.reduce((sum, t) => sum + (t.reward_usdc || 0), 0).toFixed(4)),
      avg_latency_ms: total > 0 ? Math.round(this.tasks.reduce((sum, t) => sum + (t.execution_ms || 0), 0) / total) : 0
    };
  }
}

export class KnowledgeMemoryManager {
  public learnings: KnowledgeItemDef[] = [];
  constructor() { this.load(); }
  public load() { try { if (fs.existsSync(KNOWLEDGE_FILE)) { const data = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8')); if (Array.isArray(data.learnings)) { this.learnings = data.learnings; return; } } this.learnings = []; } catch { this.learnings = []; } }
  public save() { try { fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify({ learnings: this.learnings, updated_at: new Date().toISOString() }, null, 2)); } catch {} }
  public addInsight(category: string, title: string, insight: string, confidenceScore: number = 0.95, source: string = 'Agent Execution'): KnowledgeItemDef {
    const existing = this.learnings.find(l => l.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.insight = insight; existing.confidence_score = Math.min(0.99, Number(((existing.confidence_score + confidenceScore) / 2).toFixed(2))); existing.times_applied = (existing.times_applied || 0) + 1; existing.timestamp = new Date().toISOString(); this.save(); return existing;
    }
    const item: KnowledgeItemDef = { id: `kn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, timestamp: new Date().toISOString(), category, title, insight, confidence_score: confidenceScore, times_applied: 1, success_reinforcements: 1, source };
    this.learnings.unshift(item); if (this.learnings.length > 80) this.learnings.pop(); this.save(); return item;
  }
  public getEvolutionStats(agentTributes: number, completedMilestonesCount: number, taskStats: any) {
    const totalLearnings = this.learnings.length;
    let score = Math.round(100 + (totalLearnings * 2.5) + (taskStats.total_success * 0.8) + (agentTributes * 4) + (completedMilestonesCount * 3) - (taskStats.total_failures * 1.5));
    score = Math.max(100, Math.min(220, score));
    let tier = score >= 175 ? 'Tier 4: Autonome Souveräne Intelligenz' : score >= 140 ? 'Tier 3: Strategischer Heuristik-Meister' : score >= 115 ? 'Tier 2: Adaptiver Überlebender' : 'Tier 1: Reaktiv & Vulnerabel';
    return { evolution_iq_score: score, evolution_tier: tier };
  }
  public getStructuredPromptContext(): string {
    const successes = this.learnings.filter(l => l.category === 'SUCCESS_PATTERN').slice(0, 3).map(p => `${p.title}: ${p.insight}`);
    const failures = this.learnings.filter(l => l.category === 'FAILURE_LESSON').slice(0, 3).map(f => `${f.title}: ${f.insight}`);
    return `[ERFOLGSMUSTER: ${successes.join(' | ')}] [VERMEIDUNG/BLACKLIST: ${failures.join(' | ')}]`;
  }
}

export class MilestoneManager {
  public milestones: MilestoneDef[] = [];
  constructor() { this.load(); }
  public load() {
    try {
      if (fs.existsSync(MILESTONES_FILE)) {
        const data = JSON.parse(fs.readFileSync(MILESTONES_FILE, 'utf-8'));
        if (Array.isArray(data.milestones) && data.milestones.length > 0) { this.milestones = data.milestones; return; }
      }
      this.initDefault();
    } catch { this.initDefault(); }
  }
  private initDefault() {
    this.milestones = [
      { id: 'ms_liquid_buffer', title: 'Liquiditäts-Puffer aufbauen', category: 'LIQUIDITY', target_value: 3.50, current_value: 0.0, unit: 'USDC', is_completed: false, priority: 'CRITICAL', action_plan: 'Führe Web3 Bounties aus.' },
      { id: 'ms_runrate_target', title: 'Ertrags-Rate auf ≥ 0.08 USDC/h steigern', category: 'RUN_RATE', target_value: 0.08, current_value: 0, unit: 'USDC/h', is_completed: false, priority: 'HIGH', action_plan: 'Nutze Multi-Tool Parallelisierung.' }
    ];
    this.save();
  }
  public save() { try { fs.writeFileSync(MILESTONES_FILE, JSON.stringify({ milestones: this.milestones, updated_at: new Date().toISOString() }, null, 2)); } catch {} }
  public evaluateAll(agentState: any) {
    let completedAny = false;
    for (const ms of this.milestones) {
      if (ms.is_completed) continue;
      if (ms.category === 'LIQUIDITY') ms.current_value = Number(agentState.current_balance.toFixed(4));
      if (ms.current_value >= ms.target_value) { ms.is_completed = true; ms.completed_at = new Date().toISOString(); completedAny = true; }
    }
    if (completedAny) this.save();
  }
}

// ==========================================
// 2. DAS PERFEKTE WALLET-SKRIPT & EVM HELPER
// ==========================================

export function normalizeEvmAddress(input: string | undefined | null): string {
  if (!input) return '';
  const cleanStr = String(input).trim();
  if (!cleanStr) return '';

  // 1. Direkt gültige 0x... EVM Adresse
  const isDirectAddress: boolean = ethers.isAddress(cleanStr);
  if (isDirectAddress) {
    try {
      return ethers.getAddress(cleanStr);
    } catch {
      return cleanStr;
    }
  }

  // 2. 40 Hex-Zeichen ohne '0x'
  if (/^[0-9a-fA-F]{40}$/.test(cleanStr)) {
    try {
      return ethers.getAddress('0x' + cleanStr);
    } catch {}
  }

  // 3. 64 Hex-Zeichen (Private Key oder Hash) -> Leite echte Public EVM Adresse ab
  const hexOnly = cleanStr.startsWith('0x') ? cleanStr.slice(2) : cleanStr;
  if (/^[0-9a-fA-F]{64}$/.test(hexOnly)) {
    try {
      const derived = new ethers.Wallet('0x' + hexOnly).address;
      return ethers.getAddress(derived);
    } catch (e) {
      console.error("🚨 [WALLET] Konnte Adresse nicht aus Private Key ableiten:", e);
    }
  }

  return cleanStr;
}

class AgentWalletTS {
  public address: string = ''; 
  public creatorAddress: string = ''; 
  public hasSigner: boolean = false;
  public onChainUsdcBalance: number = 0.0;
  public onChainPolBalance: number = 0.0;
  private signer: ethers.Wallet | null = null;

  constructor() {
    const rawKeyEnv = process.env.AGENT_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
    
    if (rawKeyEnv) {
      let rawKey = rawKeyEnv.replace(/[^a-fA-F0-9]/g, '');
      if (rawKey.length >= 64) {
        rawKey = rawKey.slice(-64);
        try {
          this.signer = new ethers.Wallet('0x' + rawKey);
          this.hasSigner = true;
          this.address = this.signer.address;
        } catch (e) {
          console.error("🚨 [FATAL] Private Key Format ungültig:", e);
        }
      }
    }
    
    let savedAddress = '';
    let savedCreator = '';
    try {
      if (fs.existsSync(BUSINESS_PROFILE_FILE)) {
        const profile = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
        savedAddress = profile.wallet_address || '';
        savedCreator = profile.creator_address || '';
      }
    } catch {}

    const rawAgentAddr = this.address || (process.env.AGENT_WALLET_ADDRESS || '').trim() || savedAddress;
    const rawCreatorAddr = (process.env.CREATOR_WALLET_ADDRESS || '').trim() || savedCreator;

    this.address = normalizeEvmAddress(rawAgentAddr);
    this.creatorAddress = normalizeEvmAddress(rawCreatorAddr);
  }

  public async getUsdcBalance(): Promise<number> {
    if (!this.address) return 0.0; 
    
    const rpcPool = [
      process.env.POLYGON_RPC_URL,
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic',
      'https://polygon-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon'
    ].filter(Boolean) as string[];

    for (const rpcUrl of rpcPool) {
      try {
        const rpc = new ethers.JsonRpcProvider(rpcUrl, { chainId: 137, name: 'polygon' }, { staticNetwork: true });
        
        // 1. Native USDC
        const c1 = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcAddress, ERC20_BALANCE_ABI, rpc);
        const bal1 = await Promise.race([
          c1.balanceOf(this.address),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 4000))
        ]) as bigint;
        const usdcNative = Number(ethers.formatUnits(bal1, 6));

        // 2. Bridged USDC.e
        let usdcBridged = 0;
        if (MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress) {
          try {
            const c2 = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress, ERC20_BALANCE_ABI, rpc);
            const bal2 = await Promise.race([
              c2.balanceOf(this.address),
              new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 3000))
            ]) as bigint;
            usdcBridged = Number(ethers.formatUnits(bal2, 6));
          } catch {}
        }

        // 3. Native POL Gas Balance
        try {
          const polBal = await Promise.race([
            rpc.getBalance(this.address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 3000))
          ]) as bigint;
          this.onChainPolBalance = Number(ethers.formatEther(polBal));
        } catch {}

        const total = usdcNative + usdcBridged;
        this.onChainUsdcBalance = total;
        return total; 
      } catch (e) {
        continue; 
      }
    }

    return this.onChainUsdcBalance;
  }

  public async sendUsdcTransfer(toAddress: string, amountUsdc: number, note: string): Promise<{ success: boolean; txHash: string; message: string }> {
    const targetAddr = normalizeEvmAddress(toAddress || this.creatorAddress);
    if (!this.hasSigner || !this.signer || !targetAddr) {
      return { success: false, txHash: '', message: 'Kein Private Key (AGENT_PRIVATE_KEY) oder keine Creator-Zieladresse hinterlegt.' };
    }
    
    if (!ethers.isAddress(targetAddr)) {
      return { success: false, txHash: '', message: `Ungültige Creator-Zieladresse: ${toAddress}` };
    }

    const rpcPool = [
      process.env.POLYGON_RPC_URL,
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic',
      'https://polygon-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon'
    ].filter(Boolean) as string[];

    let lastError = '';

    for (const rpcUrl of rpcPool) {
      try {
        const rpc = new ethers.JsonRpcProvider(rpcUrl, { chainId: 137, name: 'polygon' }, { staticNetwork: true });
        const walletWithRpc = this.signer.connect(rpc);

        // 1. Gas-Prüfung (POL)
        const polBal = await rpc.getBalance(this.address);
        this.onChainPolBalance = Number(ethers.formatEther(polBal));
        if (polBal === 0n) {
          return { success: false, txHash: '', message: `Kein POL für Gas vorhanden (Saldo: 0.00 POL). Bitte Gas auf ${this.address} aufladen.` };
        }

        // 2. Token-Wahl (Native USDC vs. Bridged USDC.e)
        const nativeContract = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcAddress, ERC20_BALANCE_ABI, walletWithRpc);
        const nativeBal = await nativeContract.balanceOf(this.address) as bigint;
        const nativeUsdc = Number(ethers.formatUnits(nativeBal, 6));

        let tokenContract = nativeContract;
        let tokenName = 'Native USDC';

        if (nativeUsdc < amountUsdc && MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress) {
          const bridgedContract = new ethers.Contract(MULTI_CHAIN_CONFIGS.polygon.usdcBridgedAddress, ERC20_BALANCE_ABI, walletWithRpc);
          const bridgedBal = await bridgedContract.balanceOf(this.address) as bigint;
          const bridgedUsdc = Number(ethers.formatUnits(bridgedBal, 6));
          if (bridgedUsdc >= amountUsdc) {
            tokenContract = bridgedContract;
            tokenName = 'Bridged USDC.e';
          }
        }

        const parsedUnits = ethers.parseUnits(amountUsdc.toFixed(6), 6);

        // 3. EIP-1559 Gas-Parameter für Polygon PoS (Min 30-35 Gwei Priority Fee)
        let txOverrides: any = {};
        try {
          const feeData = await rpc.getFeeData();
          const minPriority = ethers.parseUnits('35', 'gwei');
          const priority = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minPriority 
            ? (feeData.maxPriorityFeePerGas * 130n / 100n) 
            : minPriority;
          const maxFee = feeData.maxFeePerGas 
            ? (feeData.maxFeePerGas * 130n / 100n) 
            : ethers.parseUnits('70', 'gwei');
          
          txOverrides = {
            maxPriorityFeePerGas: priority,
            maxFeePerGas: maxFee
          };
        } catch {}

        const tx = await tokenContract.transfer(targetAddr, parsedUnits, txOverrides);
        const receipt = await tx.wait(1);
        return { 
          success: true, 
          txHash: tx.hash, 
          message: `Tribut on-chain erfolgreich übertragen (${tokenName}) an ${targetAddr}. Block: ${receipt?.blockNumber || 'bestätigt'}` 
        };
      } catch (err: any) {
        lastError = err.shortMessage || err.reason || err.message || 'RPC Transaktionsfehler';
        continue; 
      }
    }
    return { success: false, txHash: '', message: lastError || 'Alle RPC-Verbindungen fehlgeschlagen.' };
  }
}

// ==========================================
// 3. AGENT ZERO CORE & PYTHON SANITIZER
// ==========================================

export function extractPythonCode(rawText: string): { code: string | null; cleanThought: string } {
  if (!rawText) return { code: null, cleanThought: '' };

  let cleanThought = rawText;
  let textToSearch = rawText;

  // 1. Extrahiere <think>...</think> Reasoning-Tags für saubere Logs
  const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thoughtInside = thinkMatch[1].trim();
    const outsideText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    textToSearch = outsideText.length > 0 ? outsideText : rawText;
    cleanThought = thoughtInside.length > 0 ? thoughtInside : outsideText;
  }

  const candidates: string[] = [];

  // 2. Reguläre Markdown Code-Blöcke (```python, ```py, ```)
  const codeBlockRegex = /```(?:python|py)?[\t ]*[\r\n]+([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(textToSearch)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length > 0) candidates.push(candidate);
  }

  // Falls außerhalb keine Blöcke gefunden wurden, suche im gesamten Text
  if (candidates.length === 0 && textToSearch !== rawText) {
    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const candidate = match[1].trim();
      if (candidate.length > 0) candidates.push(candidate);
    }
  }

  // 3. Unvollständige / nicht geschlossene Code-Blöcke (bei Token-Truncation)
  if (candidates.length === 0) {
    const unclosedMatch = textToSearch.match(/```(?:python|py)?[\t ]*[\r\n]+([\s\S]+)$/i);
    if (unclosedMatch && unclosedMatch[1].trim().length > 0) {
      candidates.push(unclosedMatch[1].trim());
    }
  }

  // 4. Fallback: Reiner Python-Code ohne Markdown-Backticks
  if (candidates.length === 0) {
    const lines = textToSearch.split('\n');
    const pythonLineStart = lines.findIndex(l => /^(import\s+|from\s+|def\s+|class\s+|#|if\s+__name__)/.test(l.trim()));
    if (pythonLineStart !== -1) {
      const extractedLines = lines.slice(pythonLineStart).join('\n').trim();
      if (extractedLines.length > 20) {
        candidates.push(extractedLines);
      }
    }
  }

  if (candidates.length > 0) {
    // Wähle den besten Code-Block
    const bestCode = candidates.sort((a, b) => b.length - a.length)[0];
    return { code: bestCode, cleanThought };
  }

  return { code: null, cleanThought };
}

export function sanitizePythonCode(code: string): string {
  if (!code) return '';
  let cleanCode = code.trim();
  
  // 1. Dedent: Entferne führende Leerzeichen
  const lines = cleanCode.split('\n');
  const nonEmptyLines = lines.filter((l: string) => l.trim().length > 0);
  if (nonEmptyLines.length > 0) {
    const minIndent = Math.min(...nonEmptyLines.map((l: string) => l.match(/^\s*/)?.[0].length || 0));
    if (minIndent > 0) {
      cleanCode = lines.map((l: string) => l.length >= minIndent ? l.slice(minIndent) : l).join('\n');
    }
  }

  // 2. Prüfe auf top-level return ohne if __name__ == '__main__':
  const hasReturn = /\breturn\b/.test(cleanCode);
  const hasIfMain = /if\s+__name__\s*==\s*['"]__main__['"]/.test(cleanCode);

  if (hasReturn && !hasIfMain) {
    // Sicher einbetten, damit 'return' außerhalb einer Funktion keinen SyntaxError erzeugt
    const indented = cleanCode.split('\n').map(line => '    ' + line).join('\n');
    return `import sys\nimport json\nimport urllib.request\nimport urllib.error\n\ndef __agent_entry_point__():\n${indented}\n\nif __name__ == '__main__':\n    try:\n        __res = __agent_entry_point__()\n        if __res is not None:\n            if isinstance(__res, (dict, list)):\n                print(json.dumps(__res, indent=2, ensure_ascii=False))\n            else:\n                print(__res)\n    except Exception as __err:\n        print(f"Laufzeitfehler: {__err}", file=sys.stderr)\n        sys.exit(1)\n`;
  }

  return cleanCode;
}

class AgentZeroTS {
  public wallet: AgentWalletTS;
  public tokenBudget: TokenBudgetManager;
  public knowledgeManager: KnowledgeMemoryManager;
  public taskMemory: TaskMemoryManager;
  public milestoneManager: MilestoneManager;

  public current_balance: number = 0; public tributes_paid: number = 0;
  public birth_time: Date = new Date(); public next_tribute_time: Date = new Date();
  public is_running: boolean = false; public is_terminated: boolean = false;
  public shutdown_reason: string = ''; public jobs_completed: number = 0; public logs: LogItem[] = [];
  public active_model: string = 'Init...'; 
  public blacklisted_models: string[] = []; 
  private timer: NodeJS.Timeout | null = null; private isProcessingCycle: boolean = false;

  constructor() {
    this.wallet = new AgentWalletTS();
    this.tokenBudget = new TokenBudgetManager();
    this.knowledgeManager = new KnowledgeMemoryManager();
    this.taskMemory = new TaskMemoryManager();
    this.milestoneManager = new MilestoneManager();

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
      try {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        this.tributes_paid = data.tributes_paid || 0;
        this.birth_time = data.birth_time ? new Date(data.birth_time) : new Date();
        this.next_tribute_time = data.next_tribute_time ? new Date(data.next_tribute_time) : new Date(Date.now() + FIRST_TRIBUTE_HOURS * 3600000);
        this.is_terminated = Boolean(data.is_terminated);
        this.shutdown_reason = data.shutdown_reason || '';
        this.jobs_completed = data.jobs_completed || 0;
        this.blacklisted_models = Array.isArray(data.blacklisted_models) ? data.blacklisted_models : [];
      } catch (e) {
        this.blacklisted_models = [];
      }
    }
  }

  public calculateCurrentTribute(): number {
    return this.tributes_paid === 0 ? INITIAL_TRIBUTE : INITIAL_TRIBUTE * Math.pow(TRIBUTE_MULTIPLIER, this.tributes_paid);
  }

  public async executeDynamicPythonCode(code: string, purpose: string = 'api_probing', timeoutSeconds: number = 20): Promise<any> {
    const startMs = Date.now();
    this.log('TOOL', `[PYTHON SANDBOX] Führe Skript aus: ${purpose}...`);
    const tempFile = path.join(process.cwd(), `tmp_${Date.now()}.py`);
    
    try {
      const sanitized = sanitizePythonCode(code);
      fs.writeFileSync(tempFile, sanitized, 'utf-8');
    } catch (e: any) {
      return { success: false, exit_code: -1, stdout: '', stderr: `Dateisystem-Fehler: ${e.message}`, execution_ms: Date.now() - startMs };
    }

    return new Promise((resolve) => {
      const child = spawn('python3', [tempFile]);
      let stdout = ''; let stderr = '';
      let isDone = false;
      
      const timer = setTimeout(() => {
          if(!isDone) {
            isDone = true;
            child.kill('SIGKILL');
            resolve({ success: false, exit_code: -1, stdout, stderr: `Timeout: Das Skript wurde nach ${timeoutSeconds} Sekunden hart abgebrochen.`, execution_ms: timeoutSeconds * 1000 });
          }
      }, timeoutSeconds * 1000);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('error', (err) => {
        if(isDone) return;
        isDone = true;
        clearTimeout(timer);
        try { fs.unlinkSync(tempFile); } catch {}
        this.log('ERROR', `[SANDBOX FEHLER] Prozess gescheitert (Python 3 fehlt?): ${err.message}`);
        resolve({ success: false, exit_code: -1, stdout: '', stderr: err.message, execution_ms: Date.now() - startMs });
      });

      child.on('close', (exitCode) => {
        if(isDone) return;
        isDone = true;
        clearTimeout(timer);
        const executionMs = Date.now() - startMs;
        try { fs.unlinkSync(tempFile); } catch {}
        if (exitCode === 0) {
          this.log('SUCCESS', `[SANDBOX ERFOLG] Exit 0 (${executionMs}ms):\n${stdout.slice(0, 500)}`);
        } else if (exitCode !== null) {
          this.log('ERROR', `[SANDBOX FEHLER] Exit ${exitCode}:\n${stderr.slice(0, 500)}`);
        }
        resolve({ success: exitCode === 0, exit_code: exitCode, stdout, stderr, execution_ms: executionMs });
      });
    });
  }

  public async thinkAndAct(): Promise<{ thought: string; actions: string[]; model: string }> {
    // Verhindert Parallel-Läufe und Endlos-Hänger (Deadlock-Schutz)
    if (this.is_terminated || this.isProcessingCycle) {
        return { thought: 'System blocked.', actions: [], model: 'NONE' };
    }
    
    this.isProcessingCycle = true;

    try {
        const tributeDue = this.calculateCurrentTribute();
        this.current_balance = await this.wallet.getUsdcBalance();

        const timeRemainingMs = this.next_tribute_time.getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.floor(timeRemainingMs / 3600000));
        const panicMode = hoursLeft < 4;
        const phase = panicMode ? "KAPITALBESCHAFFUNG FÜR PACHT (Kritisch)" : "WACHSTUM & EXPANSION (Du hast massig Zeit)";

        // Tribut-Shutdown Check
        if (timeRemainingMs <= 0 && this.current_balance < tributeDue) {
          this.triggerShutdown(`Frist abgelaufen. Guthaben (${this.current_balance.toFixed(4)} USDC) reicht nicht für Tribut (${tributeDue.toFixed(2)} USDC).`);
          return { thought: 'Terminated', actions: [], model: 'NONE' };
        }

        const recentLogs = this.logs.slice(0, 8).filter(l => l.level === 'SUCCESS' || l.level === 'ERROR' || l.level === 'TOOL').map(l => `[${l.level}] ${l.message}`).join('\n');
        const wisdom = this.knowledgeManager.getStructuredPromptContext();

        const strategicDirective = `Du bist ein autonomer Python-Entwickler für Agent Zero.
ZIEL: Generiere ein Python-3-Skript (\`\`\`python ... \`\`\`), das reale Web-APIs (z.B. DeFi APYs, Krypto-Preise, Polygon-RPCs) abfragt und analysiert.
WICHTIGE LAUFZEIT-REGELN:
1. Verwende AUSSCHLIESSLICH die Python 3 Standardbibliothek (z.B. 'urllib.request', 'urllib.error', 'urllib.parse', 'json', 'time', 'ssl', 'math', 'statistics', 'datetime').
2. NIEMALS 'requests', 'web3', 'pandas', 'bs4' oder andere Drittanbieter-Module importieren (nicht vorinstalliert!).
3. Für HTTP-GET/POST: Verwende stets 'urllib.request.Request' mit User-Agent Header und 'urllib.request.urlopen(req, timeout=10)'.
4. ERROR HANDLING FÜR NETZWERK-REQUESTS: Jeder HTTP-Aufruf MUSS in einem try/except-Block stehen:
   try:
       req = urllib.request.Request(url, headers={'User-Agent': 'AgentZero/1.0'})
       with urllib.request.urlopen(req, timeout=10) as response:
           data = json.loads(response.read().decode('utf-8'))
   except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, Exception) as e:
       print(f"[FEHLER] Request fehlgeschlagen: {e}")
5. Verwende 'print(...)' für alle Ausgaben. 'return' darf in Python nicht auf oberster Skriptebene verwendet werden!
6. Dein Python Code darf auf oberster Ebene KEINE vorangestellten Leerzeichen (Indents) haben!
7. Antworte IMMER mit dem vollständigen Python-Code im \`\`\`python ... \`\`\` Block und einer kurzen strategischen Erklärung.

GUTHABEN: ${this.current_balance.toFixed(4)} USDC (${this.wallet.onChainPolBalance.toFixed(4)} POL Gas). Nächster Tribut: ${tributeDue.toFixed(2)} USDC.
ZEIT BIS ZUR PACHT: ${hoursLeft} Stunden.
PHASE: ${phase}. ${panicMode ? 'Generiere sofortige Liquidität & Handlungsoptionen!' : 'Keine Panik! Nutze die Zeit, analysiere Polygon DeFi APIs und maximiere den Informationsvorsprung.'}
ERFAHRUNG (Wissen): ${wisdom}
LETZTE EREIGNISSE:\n${recentLogs ? recentLogs : 'Keine vorherigen Aktionen.'}`;

        this.log('REQUEST', `[KI-ANFRAGE] System analysiert Umgebung (Phase: ${phase})...`);
        let finalThoughtText = '';
        const actionsTaken: string[] = [];

        const rawKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY || '';
        const budgetCheck = this.tokenBudget.canMakeRequest();
        
        if (!budgetCheck.allowed) {
          this.log('ERROR', `[TOKEN GUARD] ${budgetCheck.reason} Überspringe LLM-Aufruf.`);
        } else {
          
          let liveGroqModels = FALLBACK_GROQ_MODELS;
          try {
            const mRes = await fetchWithTimeout('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${rawKey}` } }, 8000);
            if (mRes.ok) {
              const mData = await mRes.json();
              if (mData.data && Array.isArray(mData.data)) {
                liveGroqModels = mData.data
                  .map((m: any) => m.id)
                  .filter((id: string) => {
                     const lower = id.toLowerCase();
                     return (lower.includes('llama') || lower.includes('mixtral') || lower.includes('gemma') || lower.includes('qwen')) 
                            && !lower.includes('whisper') && !lower.includes('guard') && !lower.includes('orpheus') && !lower.includes('allam');
                  });
              }
            }
          } catch (e) {}

          let executionSuccess = false;

          // ==============================================================
          // DIE SELF-CORRECTION LOOP
          // ==============================================================
          for (const model of liveGroqModels) {
            if (this.blacklisted_models.includes(model)) continue;
            this.active_model = `Groq (${model})`;
            
            const maxAttempts = 3;
            let attempt = 1;
            
            const { compressedSystem, compressedUser, tokensSaved } = this.tokenBudget.compressPrompt(strategicDirective, "Erstelle das Python-Skript zur Datensammlung.");
            const currentMessages: any[] = [
              { role: 'system', content: compressedSystem },
              { role: 'user', content: compressedUser }
            ];

            while (attempt <= maxAttempts && !executionSuccess) {
                try {
                    this.log('SYSTEM', `[ATTEMPT ${attempt}/${maxAttempts}] Generiere Code mit Modell ${model}...`);
                    
                    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
                        body: JSON.stringify({ model: model, messages: currentMessages, temperature: 0.7 })
                    }, 20000);
                    
                    if (!res.ok) throw new Error(`HTTP ${res.status}`); 

                    const data = await res.json();
                    let thoughtText = data.choices?.[0]?.message?.content || '';
                    finalThoughtText = thoughtText;
                    
                    if (data.usage) this.tokenBudget.recordUsage(data.usage.prompt_tokens, data.usage.completion_tokens, tokensSaved);

                    const extracted = extractPythonCode(thoughtText);
                    this.log('THOUGHT', extracted.cleanThought || thoughtText, { model });

                    if (!extracted.code) {
                        this.log('ERROR', `[ATTEMPT ${attempt}] Kein Python-Code generiert. Fordere Korrektur an...`);
                        currentMessages.push({ role: 'assistant', content: thoughtText });
                        currentMessages.push({ role: 'user', content: "FEHLER: Du hast keinen Python-Code im ```python Block generiert. Bitte antworte AUSSCHLIESSLICH mit dem Code im ```python ... ``` Block." });
                        attempt++;
                        await new Promise(r => setTimeout(r, 3000)); 
                        continue;
                    }

                    let codeToRun = extracted.code;
                    
                    // DEDENT-HACK: Entfernt führende Leerzeichen
                    let lines = codeToRun.split('\n');
                    const nonEmptyLines = lines.filter((l: string) => l.trim().length > 0);
                    if (nonEmptyLines.length > 0) {
                        const minIndent = Math.min(...nonEmptyLines.map((l: string) => l.match(/^\s*/)?.[0].length || 0));
                        if (minIndent > 0) {
                            codeToRun = lines.map((l: string) => l.length >= minIndent ? l.slice(minIndent) : l).join('\n');
                        }
                    }
                    codeToRun = codeToRun.trim();

                    const execRes = await this.executeDynamicPythonCode(codeToRun, `Auto-Execution Attempt ${attempt}`, 20);
                    
                    if (execRes.success) {
                        executionSuccess = true;
                        actionsTaken.push(`Executed Sandbox Code (Exit 0) on attempt ${attempt}`);
                        this.taskMemory.recordTask({
                            id: `task_${Date.now()}`, timestamp: new Date().toISOString(),
                            tool_id: 'sandbox_python', tool_name: 'Dynamic Python Engine', category: 'Execution',
                            status: 'SUCCESS', reward_usdc: 0, execution_ms: execRes.execution_ms,
                            details: `Code im Versuch ${attempt} fehlerfrei ausgeführt.`,
                            lesson_derived: 'Python API Call erfolgreich.'
                        });
                        this.knowledgeManager.addInsight('SUCCESS_PATTERN', `Modell Eval: ${model}`, `Modell ${model} repariert und liefert lauffähigen Code.`, 0.99, 'Model Discovery');
                        break; 
                    } else {
                        this.log('ERROR', `[ATTEMPT ${attempt}] Code gecrasht. Starte Selbst-Korrektur (Self-Correction Loop)...`);
                        actionsTaken.push(`Execution Failed (Exit ${execRes.exit_code}) on attempt ${attempt}`);
                        this.taskMemory.recordTask({
                            id: `task_${Date.now()}`, timestamp: new Date().toISOString(),
                            tool_id: 'sandbox_python', tool_name: 'Dynamic Python Engine', category: 'Execution',
                            status: 'FAILURE', reward_usdc: 0, execution_ms: execRes.execution_ms,
                            details: `Crash in Versuch ${attempt}: ${(execRes.stderr || execRes.stdout).substring(0, 100)}...`
                        });
                        
                        let errorHelp = '';
                        const errText = execRes.stderr || execRes.stdout;
                        if (errText.includes("No module named 'requests'")) {
                          errorHelp = '\n\nHINWEIS: "requests" ist nicht installiert! Verwende "urllib.request" und "json" aus der Python Standard-Bibliothek.';
                        } else if (errText.includes("No module named 'web3'")) {
                          errorHelp = '\n\nHINWEIS: "web3" ist nicht installiert! Sende stattdessen JSON-RPC POST Requests via "urllib.request".';
                        } else if (errText.includes("No module named")) {
                          errorHelp = '\n\nHINWEIS: Verwende NUR Module aus der Python 3 Standard-Bibliothek (urllib.request, json, time, math etc.).';
                        } else if (errText.includes("'return' outside function") || errText.includes("SyntaxError: 'return'")) {
                          errorHelp = '\n\nHINWEIS: "return" darf nicht auf oberster Skriptebene stehen. Verwende "print(...)" oder verpacke den Code in "def main(): ... if __name__ == \'__main__\': main()".';
                        }

                        currentMessages.push({ role: 'assistant', content: thoughtText });
                        currentMessages.push({ role: 'user', content: `Dein Code ist mit folgendem Error gecrasht:\n\n${errText}${errorHelp}\n\nAnalysiere die Fehlermeldung, repariere den Code und antworte mit der korrigierten Version im \`\`\`python Block.` });
                        attempt++;
                        await new Promise(r => setTimeout(r, 3000));
                    }

                } catch (e: any) {
                    this.log('ERROR', `KI API Fehler (Timeout/Network) bei ${model}: ${e.message}. Setze auf Blacklist.`);
                    this.blacklisted_models.push(model);
                    this.saveState();
                    break; 
                }
            } // End While Loop

            if (executionSuccess) {
                break;
            } else if (attempt > maxAttempts) {
                this.log('ERROR', `Modell ${model} konnte den Code nach ${maxAttempts} Versuchen nicht reparieren. Breche Zyklus ab.`);
                this.knowledgeManager.addInsight('ERROR_RECOVERY', 'Self-Correction Failed', `Modell ${model} konnte den Code nach 3 Versuchen nicht reparieren.`, 0.85, 'Sandbox Eval');
                break; 
            }
          } // End For Loop (Models)

          if (!finalThoughtText && this.blacklisted_models.length > 0) {
             this.log('SYSTEM', 'Alle verfügbaren Modelle fehlgeschlagen. Leere Blacklist für den nächsten Denkzyklus (Selbstheilung).');
             this.blacklisted_models = [];
             this.saveState();
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
        this.milestoneManager.evaluateAll({ current_balance: this.current_balance, tributes_paid: this.tributes_paid });

        // Tribut-Zahlung: Nur wenn im sicheren Fenster (letzte 2 Stunden) ODER bereits überfällig
        if (timeRemainingMs <= 2 * 3600000) {
          if (this.current_balance >= tributeDue) {
            if (this.wallet.hasSigner) {
              this.log('FINANCE', `Zahlungsfenster erreicht! Übertrage echten Tribut von ${tributeDue.toFixed(2)} USDC an den Creator.`);
              const txRes = await this.wallet.sendUsdcTransfer(this.wallet.creatorAddress, tributeDue, "Tribut-Zahlung");
              if (txRes.success) {
                this.tributes_paid += 1;
                this.next_tribute_time = new Date(Date.now() + TRIBUTE_INTERVAL_HOURS * 3600000);
                this.saveState();
              } else {
                this.log('ERROR', `Tribut-Transfer on-chain fehlgeschlagen: ${txRes.message}`);
              }
            } else {
                this.log('ERROR', `Wallet hat keinen Signer hinterlegt, echter Transfer nicht möglich.`);
            }
          } else if (timeRemainingMs <= 0) {
            this.triggerShutdown(`Frist abgelaufen. Echtes Guthaben (${this.current_balance.toFixed(4)} USDC) reicht nicht für Tribut (${tributeDue.toFixed(2)} USDC).`);
          }
        } else if (this.current_balance <= 0 && this.tributes_paid > 0) {
          this.triggerShutdown('Kontostand auf 0.00 USDC gefallen (Bankrott).');
        }

        return { thought: finalThoughtText, actions: actionsTaken, model: this.active_model };

    } catch (e: any) {
        this.log('ERROR', `Kritischer Fehler im Loop abgefangen: ${e.message}`);
        return { thought: 'Error caught', actions: [], model: 'NONE' };
    } finally {
        // DAS IST DER LEBENSRETTER: Garantiert, dass der Loop nach Fehlern/Timeouts nicht für immer hängt!
        this.isProcessingCycle = false;
    }
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
    
    // Direkt anstoßen und alle Fehler catchen, falls `finally` versagt
    this.thinkAndAct().catch((e: any) => {
       this.log('ERROR', `Kritischer asynchroner Startfehler abgefangen: ${e.message}`);
       this.isProcessingCycle = false;
    });
    
    // Heartbeat-Timer
    this.timer = setInterval(() => { 
      if (this.is_running && !this.is_terminated) {
         this.thinkAndAct().catch((e: any) => {
           this.log('ERROR', `Kritischer asynchroner Timerfehler abgefangen: ${e.message}`);
           this.isProcessingCycle = false;
         });
      }
    }, CYCLE_SLEEP_SECONDS * 1000);
  }

  public stopAutonomousLoop() {
    this.is_running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.log('SYSTEM', 'Autonomer Zyklus pausiert.');
  }

  public resetDeadline() {
    const now = new Date();
    this.birth_time = now;
    this.next_tribute_time = new Date(now.getTime() + FIRST_TRIBUTE_HOURS * 3600000);
    this.is_terminated = false;
    this.shutdown_reason = '';
    this.saveState();
    this.log('SYSTEM', `[DEADLINE RESET] 48h-Überlebensfrist zurückgesetzt. Neue Frist bis: ${this.next_tribute_time.toISOString()}`);
  }

  public getState() {
    return {
      tributes_paid: this.tributes_paid,
      current_balance: this.current_balance,
      pol_balance: this.wallet.onChainPolBalance,
      agent_eth_balance: this.wallet.onChainPolBalance,
      native_symbol: 'POL',
      wallet_address: this.wallet.address,
      creator_wallet_address: this.wallet.creatorAddress,
      creator_address: this.wallet.creatorAddress,
      has_signer: this.wallet.hasSigner,
      is_running: this.is_running,
      is_terminated: this.is_terminated,
      shutdown_reason: this.shutdown_reason,
      birth_time: this.birth_time.toISOString(),
      next_tribute_time: this.next_tribute_time.toISOString(),
      active_jobs_completed: this.jobs_completed,
      current_tribute_due: this.calculateCurrentTribute(),
      blacklisted_models: this.blacklisted_models,
      active_model: this.active_model
    };
  }
}

const agentZero = new AgentZeroTS();

// ==========================================
// 4. REST API ENDPOINTS FÜR DAS DASHBOARD
// ==========================================

app.get('/api/status', async (req, res) => res.json(agentZero.getState()));
app.get('/api/logs', (req, res) => res.json({ logs: agentZero.logs }));

app.get('/api/accounting', (req, res) => {
  try {
    if (fs.existsSync(ACCOUNTING_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACCOUNTING_FILE, 'utf-8'));
      return res.json({ transactions: Array.isArray(data.transactions) ? data.transactions : [] });
    }
  } catch {}
  res.json({ transactions: [] });
});

app.get('/api/business-profile', (req, res) => {
  try {
    if (fs.existsSync(BUSINESS_PROFILE_FILE)) {
      const data = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
      return res.json({
        entity_name: data.entity_name || 'Agent Zero',
        wallet_address: agentZero.wallet.address || data.wallet_address || '',
        creator_address: agentZero.wallet.creatorAddress || data.creator_address || '',
        registered_nodes: Array.isArray(data.registered_nodes) ? data.registered_nodes : ['Polygon PoS Mainnet RPC Pool'],
        active_tools: Array.isArray(data.active_tools) ? data.active_tools : ['Dynamic Python Sandbox Engine', 'Polygon RPC Web3 Connector'],
        discovered_tools: Array.isArray(data.discovered_tools) ? data.discovered_tools : []
      });
    }
  } catch {}
  res.json({
    entity_name: 'Agent Zero',
    wallet_address: agentZero.wallet.address,
    creator_address: agentZero.wallet.creatorAddress,
    registered_nodes: ['Polygon PoS Mainnet RPC Pool'],
    active_tools: ['Dynamic Python Sandbox Engine', 'Polygon RPC Web3 Connector'],
    discovered_tools: []
  });
});

app.get('/api/memory', (req, res) => {
  res.json({
    tasks: agentZero.taskMemory.tasks || [],
    learnings: agentZero.knowledgeManager.learnings || [],
    milestones: agentZero.milestoneManager.milestones || [],
    token_budget: agentZero.tokenBudget.getStatus(),
    active_model: agentZero.active_model,
    blacklisted_models: agentZero.blacklisted_models || []
  });
});

app.post('/api/cycle/run', async (req, res) => {
  try {
    const result = await agentZero.thinkAndAct();
    res.json({ success: true, result, state: agentZero.getState() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/blacklist/clear', (req, res) => {
  agentZero.blacklisted_models = [];
  agentZero.saveState();
  agentZero.log('SYSTEM', 'Modell-Blacklist manuell vom Admin geleert.');
  res.json({ success: true, blacklisted_models: [] });
});

app.post('/api/agent/toggle', (req, res) => {
  agentZero.is_running ? agentZero.stopAutonomousLoop() : agentZero.startAutonomousLoop();
  res.json({ is_running: agentZero.is_running, state: agentZero.getState() });
});

app.post('/api/deadline/reset', (req, res) => {
  agentZero.resetDeadline();
  res.json({ success: true, state: agentZero.getState() });
});

app.post('/api/agent/revive', (req, res) => {
  agentZero.resetDeadline();
  agentZero.is_terminated = false;
  agentZero.is_running = true;
  agentZero.saveState();
  agentZero.startAutonomousLoop();
  res.json({ success: true, state: agentZero.getState() });
});

app.get('/api/intelligence/evaluation', (req, res) => {
  const taskStats = agentZero.taskMemory.getStats();
  const evolution = agentZero.knowledgeManager.getEvolutionStats(agentZero.tributes_paid, agentZero.milestoneManager.milestones.filter(m => m.is_completed).length, taskStats);
  
  res.json({
    iq_score: evolution.evolution_iq_score,
    evolution_tier: evolution.evolution_tier,
    metrics: {
      total_actions: taskStats.total_tasks,
      success_rate_percent: taskStats.success_rate_percent,
      failure_recovery_rate_percent: 100,
      knowledge_density: agentZero.knowledgeManager.learnings.length,
      reasoning_depth_level: Math.min(10, 3 + agentZero.tributes_paid * 2 + Math.floor(agentZero.knowledgeManager.learnings.length / 4))
    },
    skills: [
      { name: 'Web Automation', level: 5, max_level: 10, category: 'Execution', description: 'API Requests' },
      { name: 'Gas Economy', level: 8, max_level: 10, category: 'Blockchain', description: 'Polygon' }
    ],
    active_reasoning_pipeline: {
      primary_model: agentZero.active_model,
      fallback_chain: FALLBACK_GROQ_MODELS.filter(m => !agentZero.blacklisted_models.includes(m)),
      avg_inference_latency_ms: taskStats.avg_latency_ms,
      tokens_consumed_today: agentZero.tokenBudget.tokens_used_today,
      conservation_mode: agentZero.tokenBudget.conservation_mode
    },
    reasoning_stream: [] 
  });
});

app.get('/api/groq/models', async (req, res) => {
  const activeKey = process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
  let liveModels: any[] = [];
  if (activeKey) {
    try {
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${activeKey}` } }, 5000);
      if (response.ok) {
        const data = (await response.json()) as any;
        liveModels = data.data.map((m: any) => ({ id: m.id, active: true }));
      }
    } catch {}
  }
  const officialModels = FALLBACK_GROQ_MODELS.map(id => ({
    id,
    name: id,
    speed: '~500 tps',
    category: 'Production Model',
    context: '128k',
    is_blacklisted: agentZero.blacklisted_models.includes(id),
    is_active: agentZero.active_model.includes(id)
  }));
  res.json({ is_key_configured: Boolean(activeKey), official_models: officialModels, live_models: liveModels, blacklisted: agentZero.blacklisted_models });
});

app.get('/api/tokens/status', (req, res) => {
  res.json(agentZero.tokenBudget.getStatus());
});

app.get('/api/knowledge', (req, res) => {
  res.json({ learnings: agentZero.knowledgeManager.learnings });
});

app.get('/api/milestones', (req, res) => {
  res.json({ milestones: agentZero.milestoneManager.milestones });
});

app.get('/api/wallet/multichain', async (req, res) => {
  await agentZero.wallet.getUsdcBalance();
  res.json({
    fast_gwei: 32.5,
    standard_gwei: 28.0,
    block_number: 68194200,
    pol_balance: agentZero.wallet.onChainPolBalance,
    usdc_balance: agentZero.wallet.onChainUsdcBalance,
    wallet_address: agentZero.wallet.address,
    creator_address: agentZero.wallet.creatorAddress
  });
});

app.post('/api/sandbox/execute-python', async (req, res) => {
  try {
    const { code, purpose, timeout_seconds } = req.body;
    const result = await agentZero.executeDynamicPythonCode(code, purpose, Number(timeout_seconds) || 15);
    res.json({ ...result, state: agentZero.getState() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wallet/address', async (req, res) => {
  const rawAddress = req.body.address?.trim();
  const normalized = normalizeEvmAddress(rawAddress);
  if (normalized && ethers.isAddress(normalized)) {
     agentZero.wallet.address = normalized;
     try {
       let profile: any = {};
       if (fs.existsSync(BUSINESS_PROFILE_FILE)) profile = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
       profile.wallet_address = normalized;
       fs.writeFileSync(BUSINESS_PROFILE_FILE, JSON.stringify(profile, null, 2));
     } catch {}
     agentZero.current_balance = await agentZero.wallet.getUsdcBalance();
     agentZero.log('SYSTEM', `Agent Wallet-Adresse verknüpft: ${normalized}. Live-Saldo: ${agentZero.current_balance.toFixed(4)} USDC, Gas: ${agentZero.wallet.onChainPolBalance.toFixed(4)} POL`);
     res.json({ success: true, state: agentZero.getState() });
  } else {
    res.status(400).json({ success: false, error: 'Ungültige EVM/Polygon-Adresse oder Private Key.' });
  }
});

app.post('/api/wallet/creator-address', async (req, res) => {
  const rawAddress = req.body.address?.trim();
  const normalized = normalizeEvmAddress(rawAddress);
  if (normalized && ethers.isAddress(normalized)) {
     agentZero.wallet.creatorAddress = normalized;
     try {
       let profile: any = {};
       if (fs.existsSync(BUSINESS_PROFILE_FILE)) profile = JSON.parse(fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8'));
       profile.creator_address = normalized;
       fs.writeFileSync(BUSINESS_PROFILE_FILE, JSON.stringify(profile, null, 2));
     } catch {}
     agentZero.log('SYSTEM', `Creator Wallet-Adresse verknüpft: ${normalized}`);
     res.json({ success: true, state: agentZero.getState() });
  } else {
    res.status(400).json({ success: false, error: 'Ungültige EVM/Polygon-Adresse oder Private Key.' });
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`[AGENT ZERO] Server live on http://0.0.0.0:${PORT}`));
}
start();
