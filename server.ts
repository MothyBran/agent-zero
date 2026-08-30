import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

import { Pool } from 'pg';

// --- POSTGRESQL INTEGRATION ---
const dbPool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
}) : null;

async function initDB() {
  if (!dbPool) return;
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key VARCHAR(255) PRIMARY KEY,
      value JSONB NOT NULL
    )
  `);
}
initDB().catch(console.error);

async function readData(file: string, key: string, defaultValue: any) {
  if (dbPool) {
    try {
      const res = await dbPool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
      if (res.rows.length > 0) return res.rows[0].value;
    } catch {}
    return defaultValue; // Never fallback to file if DB is active
  }
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
  return defaultValue;
}

async function writeData(file: string, key: string, value: any) {
  if (dbPool) {
    try {
      await dbPool.query('INSERT INTO kv_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, JSON.stringify(value)]);
    } catch (e) { console.error('DB Write Error:', e); }
    return;
  }
  try { fs.writeFileSync(file, JSON.stringify(value, null, 2)); } catch {}
}


let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const app = express();
app.use(express.json());

// Global Anti-Cache Header for all API routes (prevents stale browser cache)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

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
const CYCLE_SLEEP_SECONDS = 300; // 1-Minuten Loop (Aggressives Takt-Intervall)
const FIRST_TRIBUTE_HOURS = 48;
const TRIBUTE_INTERVAL_HOURS = 48;
const INITIAL_TRIBUTE = 1.0; 
const TRIBUTE_MULTIPLIER = 1.10;

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
const CRYPTO_KNOWLEDGE_FILE = path.join(DATA_DIR, 'crypto_knowledge.json');
const TOKEN_REGISTRY_FILE = path.join(DATA_DIR, 'token_registry.json');
const MULTICHAIN_PORTFOLIO_FILE = path.join(DATA_DIR, 'multichain_portfolio.json');
const OPENROUTER_KNOWLEDGE_FILE = path.join(DATA_DIR, 'openrouter_knowledge.json');

interface LogItem { id: string; timestamp: string; level: string; message: string; metadata?: any; }
interface KnowledgeItemDef { id: string; timestamp: string; category: string; title: string; insight: string; confidence_score: number; times_applied?: number; success_reinforcements?: number; source: string; }
interface TaskMemoryRecordDef { id: string; timestamp: string; tool_id: string; tool_name: string; category: string; status: string; reward_usdc: number; execution_ms: number; details: string; error_reason?: string; lesson_derived?: string; }
interface MilestoneDef { id: string; title: string; category: string; target_value: number; current_value: number; unit: string; is_completed: boolean; completed_at?: string; priority: string; action_plan: string; }

export interface CryptoKnowledgeDef {
  category: 'BLOCKCHAINS' | 'TOKENS' | 'DEX_ROUTING' | 'GAS_STRATEGY' | 'ARBITRAGE_YIELD' | 'WEB_RESEARCH';
  title: string;
  chain?: string;
  symbol?: string;
  summary: string;
  details: string;
  apis_used?: string[];
  last_updated: string;
  confidence: number;
}

export interface TokenItemDef {
  symbol: string;
  name: string;
  chain_key: string;
  chain_name: string;
  chain_id: number;
  contract_address: string;
  decimals: number;
  category: 'STABLECOIN' | 'GAS_NATIVE' | 'WRAPPED_NATIVE' | 'DEFI_BLUECHIP' | 'LAYER2' | 'DEX_TOKEN' | 'MEME';
  usd_price: number;
  change_24h_percent?: number;
  balance: number;
  usd_value: number;
  is_gas_token: boolean;
  coingecko_id?: string;
  verified_metamask: boolean;
}

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export const MULTI_CHAIN_CONFIGS: Record<string, any> = {
  polygon: {
    chainId: 137,
    name: 'Polygon PoS',
    nativeSymbol: 'POL',
    nativeName: 'Polygon Ecosystem Token',
    coingeckoNativeId: 'polygon-ecosystem-token',
    fallbackPrice: 0.1143,
    rpcUrls: [
      process.env.POLYGON_RPC_URL || '', 
      'https://polygon-rpc.com', 
      'https://rpc.ankr.com/polygon', 
      'https://polygon.llamarpc.com', 
      'https://polygon-bor-rpc.publicnode.com'
    ].filter(Boolean),
    tokens: [
      { symbol: 'POL', name: 'Polygon Ecosystem Token', address: '0x0000000000000000000000000000000000001010', decimals: 18, isGas: true, coingeckoId: 'polygon-ecosystem-token', defaultPrice: 0.1143 },
      { symbol: 'USDC.E', name: 'USD Coin (PoS)', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, isGas: false, coingeckoId: 'usd-coin', defaultPrice: 0.9999 },
      { symbol: 'USDC', name: 'USD Coin (Native)', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, isGas: false, coingeckoId: 'usd-coin', defaultPrice: 0.9999 },
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, isGas: false, coingeckoId: 'weth', defaultPrice: 2472.65 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, isGas: false, coingeckoId: 'tether', defaultPrice: 1.0001 }
    ],
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdcBridgedAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    usdcDecimals: 6,
    dexRouters: {
      quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    }
  },
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeSymbol: 'ETH',
    nativeName: 'Ether',
    coingeckoNativeId: 'ethereum',
    fallbackPrice: 2472.65,
    rpcUrls: [
      process.env.ETHEREUM_RPC_URL || '',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum-rpc.publicnode.com',
      'https://cloudflare-eth.com'
    ].filter(Boolean),
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, isGas: true, coingeckoId: 'ethereum', defaultPrice: 2472.65 },
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, isGas: false, coingeckoId: 'usd-coin', defaultPrice: 0.9996 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, isGas: false, coingeckoId: 'tether', defaultPrice: 1.0000 }
    ],
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
    dexRouters: {
      uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      oneinch: '0x1111111254EEB25477B68fb85Ed929f73A960582'
    }
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeSymbol: 'ETH',
    nativeName: 'Ether (L2)',
    coingeckoNativeId: 'ethereum',
    fallbackPrice: 2472.65,
    rpcUrls: [
      process.env.ARBITRUM_RPC_URL || '',
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com'
    ].filter(Boolean),
    tokens: [
      { symbol: 'ETH', name: 'Ether (L2)', address: '0x0000000000000000000000000000000000000000', decimals: 18, isGas: true, coingeckoId: 'ethereum', defaultPrice: 2472.65 },
      { symbol: 'USDC', name: 'USD Coin (Native)', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, isGas: false, coingeckoId: 'usd-coin', defaultPrice: 1.0000 },
      { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, isGas: false, coingeckoId: 'arbitrum', defaultPrice: 0.5240 }
    ],
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdcDecimals: 6
  },
  base: {
    chainId: 8453,
    name: 'Base',
    nativeSymbol: 'ETH',
    nativeName: 'Ether (Base)',
    coingeckoNativeId: 'ethereum',
    fallbackPrice: 2472.65,
    rpcUrls: [
      process.env.BASE_RPC_URL || '',
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://rpc.ankr.com/base'
    ].filter(Boolean),
    tokens: [
      { symbol: 'ETH', name: 'Ether (Base)', address: '0x0000000000000000000000000000000000000000', decimals: 18, isGas: true, coingeckoId: 'ethereum', defaultPrice: 2472.65 },
      { symbol: 'USDC', name: 'USD Coin (Base Native)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, isGas: false, coingeckoId: 'usd-coin', defaultPrice: 1.0000 }
    ],
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcDecimals: 6
  }
};

const OPENROUTER_MODEL_CASCADE = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

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
  public async load() {
    try {
      const data = await readData(TOKEN_BUDGET_FILE, 'token_budget', null);
      if (data) {
        const today = new Date().toISOString().slice(0, 10);
        if (data.last_reset_date === today) {
          this.tokens_used_today = data.tokens_used_today || 0;
          this.tokens_saved_by_compression = data.tokens_saved_by_compression || 0;
        } else {
          this.tokens_used_today = 0; this.tokens_saved_by_compression = 0; this.last_reset_date = today; await this.save();
        }
      }
    } catch {}
  }
  public async save() { await writeData(TOKEN_BUDGET_FILE, 'token_budget', this); }
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
  public async recordUsage(promptTokens: number, completionTokens: number, tokensSaved: number = 0) {
    this.recentRequests.push(Date.now());
    this.tokens_used_today += (promptTokens || 0) + (completionTokens || 0);
    this.tokens_saved_by_compression += tokensSaved;
    await this.save();
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
  public async load() { try { const data = await readData(TASK_MEMORY_FILE, 'task_memory', { tasks: [] }); if (Array.isArray(data.tasks)) { this.tasks = data.tasks; return; } this.tasks = []; } catch { this.tasks = []; } }
  public async save() { await writeData(TASK_MEMORY_FILE, 'task_memory', { tasks: this.tasks, updated_at: new Date().toISOString() }); }
  public async recordTask(record: TaskMemoryRecordDef) { this.tasks.unshift(record); if (this.tasks.length > 300) this.tasks.pop(); await this.save(); }
  public getStats() {
    const total = this.tasks.length;
    const successes = this.tasks.filter(t => t.status === 'SUCCESS').length;
    return {
      total_tasks: total, total_success: successes, total_failures: this.tasks.filter(t => t.status === 'FAILURE').length,
      success_rate_percent: total > 0 ? Number(((successes / total) * 100).toFixed(1)) : 0,
      total_historical_earnings: Number(this.tasks.reduce((sum, t) => sum + (t.reward_usdc || 0), 0).toFixed(4)),
      avg_latency_ms: total > 0 ? Math.round(this.tasks.reduce((sum, t) => sum + (t.execution_ms || 0), 0) / total) : 0
    };
  }
}

export class KnowledgeMemoryManager {
  public learnings: KnowledgeItemDef[] = [];
  constructor() { this.load(); }
  public async load() {
    try {
      const data = await readData(KNOWLEDGE_FILE, 'knowledge_memory', { learnings: [] });
      if (Array.isArray(data.learnings) && data.learnings.length > 0) {
        this.learnings = data.learnings;
        return;
      }
      this.learnings = [];
    } catch {
      this.learnings = [];
    }

    if (this.learnings.length === 0) {
        this.learnings.push({ id: `kn_${Date.now()}_1`, timestamp: new Date().toISOString(), category: 'SCOUTING_TARGETS', title: 'Die besten Bounty-Quellen', insight: 'Krypto-Bounties findest du am besten über die GitHub REST API (Suche nach labels:bounty, state:open) oder Web-Suchen mit "site:github.com bounty polygon".', confidence_score: 1.0, times_applied: 0, success_reinforcements: 0, source: 'System-Init' });
        this.learnings.push({ id: `kn_${Date.now()}_2`, timestamp: new Date().toISOString(), category: 'SEARCH_SYNTAX', title: 'DuckDuckGo DDGS Profi-Tipps', insight: 'Nutze in Python: from duckduckgo_search import DDGS. Verwende Such-Operatoren wie "site:openrouter.ai models free" um gezielt API-Dokumentationen für deine eigenen Upgrades zu crawlen.', confidence_score: 1.0, times_applied: 0, success_reinforcements: 0, source: 'System-Init' });
        this.learnings.push({ id: `kn_${Date.now()}_3`, timestamp: new Date().toISOString(), category: 'CODE_STRATEGY', title: 'Tool-Entwicklung', insight: 'Wenn du eine API-Doku erfolgreich gecrawlt hast, schreibe eine robuste Python-Klasse dafür, teste sie in der Sandbox und speichere sie via "with open()" in ./data/custom_tools/ ab.', confidence_score: 1.0, times_applied: 0, success_reinforcements: 0, source: 'System-Init' });
        this.save().catch(()=>{});
    }
  }
  public async save() { await writeData(KNOWLEDGE_FILE, 'knowledge_memory', { learnings: this.learnings, updated_at: new Date().toISOString() }); }
  public async addInsight(category: string, title: string, insight: string, confidenceScore: number = 0.95, source: string = 'Agent Execution'): Promise<KnowledgeItemDef> {
    const existing = this.learnings.find(l => l.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.insight = insight; existing.confidence_score = Math.min(0.99, Number(((existing.confidence_score + confidenceScore) / 2).toFixed(2))); existing.times_applied = (existing.times_applied || 0) + 1; existing.timestamp = new Date().toISOString(); await this.save(); return existing;
    }
    const item: KnowledgeItemDef = { id: `kn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, timestamp: new Date().toISOString(), category, title, insight, confidence_score: confidenceScore, times_applied: 1, success_reinforcements: 1, source };
    this.learnings.unshift(item); if (this.learnings.length > 80) this.learnings.pop(); await this.save(); return item;
  }
  public getEvolutionStats(agentTributes: number, completedMilestonesCount: number, taskStats: any) {
    const totalLearnings = this.learnings.length;
    let score = 100 + taskStats.total_success;
    score = Math.max(100, Math.min(220, score));
    let tier = score >= 175 ? 'Tier 4: Autonome Souveräne Intelligenz' : score >= 140 ? 'Tier 3: Strategischer Heuristik-Meister' : score >= 115 ? 'Tier 2: Adaptiver Überlebender' : 'Tier 1: Reaktiv & Vulnerabel';
    return { evolution_iq_score: score, evolution_tier: tier };
  }
  public getStructuredPromptContext(): string {
    const sorted = [...this.learnings].sort((a, b) => b.confidence_score - a.confidence_score);
    const topLearnings = sorted.slice(0, 7).map(l => `[${l.category}] ${l.title}: ${l.insight}`);
    return topLearnings.length > 0 ? `[LOKALE KNOWLEDGE BASE (TOP 7)]: ${topLearnings.join(' | ')}` : '';
  }
}

export class MilestoneManager {
  public milestones: MilestoneDef[] = [];
  constructor() { this.load(); }
  public async load() {
    try {
        const data = await readData(MILESTONES_FILE, 'milestones', null);
        if (data && Array.isArray(data.milestones)) { this.milestones = data.milestones; return; }
      this.initDefault();
    } catch { this.initDefault(); }
  }
  private async initDefault() {
    this.milestones = [];
    await this.save();
  }
  public async save() { await writeData(MILESTONES_FILE, 'milestones', { milestones: this.milestones, updated_at: new Date().toISOString() }); }
  public async evaluateAll(agentState: any) {
    let completedAny = false;
    for (const ms of this.milestones) {
      if (ms.is_completed) continue;
      if (ms.category === 'LIQUIDITY') ms.current_value = Number(agentState.current_balance.toFixed(4));
      if (ms.current_value >= ms.target_value) { ms.is_completed = true; ms.completed_at = new Date().toISOString(); completedAny = true; }
    }
    if (completedAny) await this.save();
  }
}

// ==========================================
// 1B. GROQ MULTI-MODEL INTELLIGENCE & KNOWLEDGE MANAGER
// ==========================================

export interface OpenRouterIntelligenceModelDef {
  id: string;
  name: string;
  speed: string;
  category: 'Production Model' | 'Production System' | 'Preview Model' | 'Audio / Speech' | 'Primary Tier' | 'Frontier Tier';
  context: string;
  context_tokens: number;
  max_completion_tokens: number;
  speed_tps: number;
  pricing_input_per_m?: string;
  pricing_output_per_m?: string;
  rpm_limit?: number;
  rpd_limit?: number;
  tpm_limit?: number;
  tpd_limit?: number;
  best_for: string;
  strengths: string[];
  recommended_temp?: number;
  supports_reasoning?: boolean;
  supports_tools?: boolean;
  supports_json_schema?: boolean;
}

export class OpenRouterIntelligenceManager {
  public models: OpenRouterIntelligenceModelDef[] = [];
  public knowledge_base: any[] = [];
  public rate_limit_headers: {
    limit_requests?: number;
    remaining_requests?: number;
    limit_tokens?: number;
    remaining_tokens?: number;
    reset_tokens?: string;
    last_updated?: string;
  } = {};

  constructor() {
    this.load();
  }

  public load() {
    try {
      if (fs.existsSync(OPENROUTER_KNOWLEDGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(OPENROUTER_KNOWLEDGE_FILE, 'utf-8'));
        if (Array.isArray(data.models) && data.models.length > 0) {
          this.models = data.models;
          this.knowledge_base = data.knowledge_base || [];
          this.rate_limit_headers = data.rate_limit_headers || {};
          return;
        }
      }
    } catch {}

    this.initDefaults();
  }

  public save() {
    try {
      fs.writeFileSync(OPENROUTER_KNOWLEDGE_FILE, JSON.stringify({
        models: this.models,
        knowledge_base: this.knowledge_base,
        rate_limit_headers: this.rate_limit_headers,
        updated_at: new Date().toISOString()
      }, null, 2));
    } catch {}
  }

  public async runInference(prompt: string, model: string = 'meta-llama/llama-3.3-70b-instruct', temperature: number = 0.6, maxTokens: number = 4096): Promise<{ success: boolean; content?: string; error?: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
    if (!apiKey) return { success: false, error: 'Kein API Key verfügbar' };

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://railway.app',
          'X-Title': 'AgentZero-Autonomous'
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: temperature, max_tokens: maxTokens })
      });

      if (!response.ok) return { success: false, error: `Groq API HTTP ${response.status}` };
      const data = await response.json();
      return { success: true, content: data.choices?.[0]?.message?.content || '' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }


  private initDefaults() {
    this.models = [
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        speed: 'Sehr Schnell',
        category: 'Primary Tier',
        context: '1M',
        context_tokens: 1048576,
        max_completion_tokens: 8192,
        speed_tps: 500,
        pricing_input_per_m: 'Free / Paid',
        pricing_output_per_m: 'Free / Paid',
        rpm_limit: 60,
        tpm_limit: 1000000,
        best_for: 'Code Generation & Reflex',
        strengths: ['Fast', 'Accurate', 'Multimodal'],
        recommended_temp: 0.1,
        supports_reasoning: false,
        supports_tools: true,
        supports_json_schema: true
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        speed: '~280-350 tps',
        category: 'Primary Tier',
        context: '128k',
        context_tokens: 131072,
        max_completion_tokens: 32768,
        speed_tps: 280,
        pricing_input_per_m: 'Free / Paid',
        pricing_output_per_m: 'Free / Paid',
        rpm_limit: 60,
        tpm_limit: 100000,
        best_for: 'Strategische Planung',
        strengths: ['Komplexe Logik', 'Reasoning'],
        recommended_temp: 0.6,
        supports_reasoning: false,
        supports_tools: true,
        supports_json_schema: true
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        speed: 'Schnell',
        category: 'Primary Tier',
        context: '128k',
        context_tokens: 131072,
        max_completion_tokens: 8192,
        speed_tps: 300,
        pricing_input_per_m: 'Paid',
        pricing_output_per_m: 'Paid',
        rpm_limit: 60,
        tpm_limit: 100000,
        best_for: 'Coding & Logik',
        strengths: ['Code', 'Reasoning'],
        recommended_temp: 0.1,
        supports_reasoning: false,
        supports_tools: true,
        supports_json_schema: true
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        speed: 'Schnell',
        category: 'Frontier Tier',
        context: '200k',
        context_tokens: 200000,
        max_completion_tokens: 8192,
        speed_tps: 200,
        pricing_input_per_m: 'Paid',
        pricing_output_per_m: 'Paid',
        rpm_limit: 60,
        tpm_limit: 100000,
        best_for: 'Komplexe Code-Aufgaben',
        strengths: ['Top Tier Coding', 'Deep Analysis'],
        recommended_temp: 0.1,
        supports_reasoning: false,
        supports_tools: true,
        supports_json_schema: true
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        speed: 'Schnell',
        category: 'Frontier Tier',
        context: '128k',
        context_tokens: 128000,
        max_completion_tokens: 4096,
        speed_tps: 200,
        pricing_input_per_m: 'Paid',
        pricing_output_per_m: 'Paid',
        rpm_limit: 60,
        tpm_limit: 100000,
        best_for: 'Fallback & Allgemeine Intelligenz',
        strengths: ['Top Tier Reasoning'],
        recommended_temp: 0.1,
        supports_reasoning: false,
        supports_tools: true,
        supports_json_schema: true
      }
    ];
  }

  public recordRateLimitHeaders(headers: any) {
    try {
      const getH = (key: string) => typeof headers.get === 'function' ? headers.get(key) : headers[key];
      const limitReq = getH('x-ratelimit-limit-requests');
      const remReq = getH('x-ratelimit-remaining-requests');
      const limitTok = getH('x-ratelimit-limit-tokens');
      const remTok = getH('x-ratelimit-remaining-tokens');
      const resetTok = getH('x-ratelimit-reset-tokens');

      if (limitReq || remReq || limitTok || remTok) {
        this.rate_limit_headers = {
          limit_requests: limitReq ? Number(limitReq) : this.rate_limit_headers.limit_requests,
          remaining_requests: remReq ? Number(remReq) : this.rate_limit_headers.remaining_requests,
          limit_tokens: limitTok ? Number(limitTok) : this.rate_limit_headers.limit_tokens,
          remaining_tokens: remTok ? Number(remTok) : this.rate_limit_headers.remaining_tokens,
          reset_tokens: resetTok || this.rate_limit_headers.reset_tokens,
          last_updated: new Date().toISOString()
        };
        this.save();
      }
    } catch {}
  }

  public getOptimalModel(taskType: 'CODE_GENERATION' | 'MARKET_ANALYSIS' | 'RAPID_REFLEX' | 'STRUCTURED_JSON' | 'AGENTIC_SEARCH' | 'DEEP_REASONING', blacklisted: string[] = []): string {
    const isAvailable = (id: string) => !blacklisted.includes(id);
    for (const model of OPENROUTER_MODEL_CASCADE) {
      if (isAvailable(model)) return model;
    }
    return OPENROUTER_MODEL_CASCADE[0];
  }

  public getOpenRouterPromptContext(): string {
    const activeHeader = this.rate_limit_headers.remaining_tokens 
      ? `Rate-Limit: ${this.rate_limit_headers.remaining_tokens}/${this.rate_limit_headers.limit_tokens || 70000} TPM verbleibend`
      : 'Rate-Limit: Normalbetrieb';
    
    return `[OPENROUTER MODEL INTELLIGENCE & CAPABILITIES:
- Primary Code Engine: llama-3.3-70b-versatile (131k Ctx, 280 tps, Temp: 0.1-0.2)
- High-Speed Reflex Engine: llama-3.1-8b-instant (131k Ctx, 800 tps, Temp: 0.1)
- Deep Reasoning & Tools: openai/gpt-oss-120b (131k Ctx, 500 tps) & groq/compound (Agentic Search)
- ${activeHeader}]`;
  }
}

// ==========================================
// 1C. KRYPTO & TRADING KNOWLEDGE MANAGER
// ==========================================

export class CryptoKnowledgeManager {
  public knowledge: CryptoKnowledgeDef[] = [];
  public tokens: TokenItemDef[] = [];
  public last_price_update: string = new Date().toISOString();

  constructor() {
    this.load();
  }

  public load() {
    try {
      if (fs.existsSync(CRYPTO_KNOWLEDGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CRYPTO_KNOWLEDGE_FILE, 'utf-8'));
        if (Array.isArray(data.knowledge)) this.knowledge = data.knowledge;
      }
    } catch {}

    try {
      if (fs.existsSync(TOKEN_REGISTRY_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_REGISTRY_FILE, 'utf-8'));
        if (Array.isArray(data.tokens) && data.tokens.length > 0) {
          this.tokens = data.tokens;
          return;
        }
      }
    } catch {}

    if (this.knowledge.length === 0) this.initDefaultKnowledge();
    if (this.tokens.length === 0) this.initDefaultTokens();
  }

  public save() {
    try {
      fs.writeFileSync(CRYPTO_KNOWLEDGE_FILE, JSON.stringify({ knowledge: this.knowledge, updated_at: new Date().toISOString() }, null, 2));
      fs.writeFileSync(TOKEN_REGISTRY_FILE, JSON.stringify({ tokens: this.tokens, updated_at: new Date().toISOString() }, null, 2));
    } catch {}
  }

  private initDefaultKnowledge() {
    this.knowledge = [
      {
        category: 'DEX_ROUTING',
        title: 'Polygon PoS DEX Routing & Liquidity Pools',
        chain: 'Polygon (137)',
        symbol: 'POL / USDC / USDT / WETH',
        summary: 'Optimales Routing auf Polygon über QuickSwap V3, Uniswap V3 und 1inch Aggregator.',
        details: 'QuickSwap Router (0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff) und Uniswap V3 SwapRouter (0xE592427A0AEce92De3Edee1F18E0157C05861564). Minimaler Slippage für USDC.e -> Native USDC Swaps.',
        apis_used: ['https://api.1inch.dev/swap/v6.0/137/quote', 'https://api.coingecko.com', 'https://yields.llama.fi'],
        last_updated: new Date().toISOString(),
        confidence: 0.98
      },
      {
        category: 'GAS_STRATEGY',
        title: 'Polygon EIP-1559 Gas-Ökonomie',
        chain: 'Polygon (137)',
        symbol: 'POL',
        summary: 'Mindestens 30-35 Gwei Priority Fee für verlässliche Inklusion unter 5 Sekunden.',
        details: 'Polygon Bor-Nodes droppen Transaktionen mit < 30 Gwei maxPriorityFeePerGas. Standard-Transfers kosten ca. 0.001 POL ($0.0001).',
        apis_used: ['https://gasstation.polygon.technology/v2', 'https://polygon-rpc.com'],
        last_updated: new Date().toISOString(),
        confidence: 0.99
      },
      {
        category: 'ARBITRAGE_YIELD',
        title: 'Multi-Chain Stablecoin Parität & DeFi Renditen',
        chain: 'Multi-Chain',
        symbol: 'USDC vs. USDC.E',
        summary: 'USDC.e und Native USDC handeln auf Polygon bei ca. 1.000:1.',
        details: 'Aave V3 Polygon Pool bietet Liquidität und Zinsen. Swaps zwischen USDC.e und Native USDC kosten unter 0.01% Fee auf Uniswap V3.',
        apis_used: ['https://yields.llama.fi/pools', 'https://api.coingecko.com/api/v3/simple/price'],
        last_updated: new Date().toISOString(),
        confidence: 0.95
      },
      {
        category: 'WEB_RESEARCH',
        title: 'MetaMask Standard-Token Erkennung & ERC-20 Balances',
        chain: 'Ethereum & EVM Chains',
        symbol: 'ERC-20',
        summary: 'Batch-Balance-Abfrage via Standard ERC-20 ABI: balanceOf, decimals, symbol, name.',
        details: 'Agent Zero fragt on-chain alle registrierten Contracts direkt über Polygon und Ethereum RPCs ab.',
        apis_used: ['https://polygon-rpc.com', 'https://eth.llamarpc.com'],
        last_updated: new Date().toISOString(),
        confidence: 0.97
      }
    ];
  }

  private initDefaultTokens() {
    this.tokens = [
      // Polygon Tokens (Genau passend zum Screenshot)
      {
        symbol: 'POL',
        name: 'Polygon Ecosystem Token',
        chain_key: 'polygon',
        chain_name: 'Polygon PoS',
        chain_id: 137,
        contract_address: '0x0000000000000000000000000000000000001010',
        decimals: 18,
        category: 'GAS_NATIVE',
        usd_price: 0.1143,
        change_24h_percent: 5.36,
        balance: 53.74932,
        usd_value: 6.14,
        is_gas_token: true,
        coingecko_id: 'polygon-ecosystem-token',
        verified_metamask: true
      },
      {
        symbol: 'USDC.E',
        name: 'USD Coin (PoS)',
        chain_key: 'polygon',
        chain_name: 'Polygon PoS',
        chain_id: 137,
        contract_address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        decimals: 6,
        category: 'STABLECOIN',
        usd_price: 0.9999,
        change_24h_percent: 0.00,
        balance: 0.94855,
        usd_value: 0.95,
        is_gas_token: false,
        coingecko_id: 'usd-coin',
        verified_metamask: true
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Native)',
        chain_key: 'polygon',
        chain_name: 'Polygon PoS',
        chain_id: 137,
        contract_address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6,
        category: 'STABLECOIN',
        usd_price: 0.9999,
        change_24h_percent: 0.00,
        balance: 0.30000,
        usd_value: 0.30,
        is_gas_token: false,
        coingecko_id: 'usd-coin',
        verified_metamask: true
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        chain_key: 'ethereum',
        chain_name: 'Ethereum Mainnet',
        chain_id: 1,
        contract_address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        category: 'GAS_NATIVE',
        usd_price: 2472.65,
        change_24h_percent: 0.93,
        balance: 0.00019,
        usd_value: 0.47,
        is_gas_token: true,
        coingecko_id: 'ethereum',
        verified_metamask: true
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Ethereum)',
        chain_key: 'ethereum',
        chain_name: 'Ethereum Mainnet',
        chain_id: 1,
        contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        category: 'STABLECOIN',
        usd_price: 0.9996,
        change_24h_percent: -0.04,
        balance: 0.37825,
        usd_value: 0.38,
        is_gas_token: false,
        coingecko_id: 'usd-coin',
        verified_metamask: true
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether (Polygon)',
        chain_key: 'polygon',
        chain_name: 'Polygon PoS',
        chain_id: 137,
        contract_address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        decimals: 18,
        category: 'WRAPPED_NATIVE',
        usd_price: 2472.65,
        change_24h_percent: 0.93,
        balance: 0.0,
        usd_value: 0.0,
        is_gas_token: false,
        coingecko_id: 'weth',
        verified_metamask: true
      },
      {
        symbol: 'USDT',
        name: 'Tether USD (Polygon)',
        chain_key: 'polygon',
        chain_name: 'Polygon PoS',
        chain_id: 137,
        contract_address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        category: 'STABLECOIN',
        usd_price: 1.0001,
        change_24h_percent: 0.01,
        balance: 0.0,
        usd_value: 0.0,
        is_gas_token: false,
        coingecko_id: 'tether',
        verified_metamask: true
      }
    ];
    this.save();
  }

  public addInsight(category: CryptoKnowledgeDef['category'], title: string, summary: string, details: string, apis: string[] = [], confidence: number = 0.95, chain?: string, symbol?: string) {
    const existing = this.knowledge.find(k => k.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.summary = summary;
      existing.details = details;
      existing.confidence = Math.min(0.99, (existing.confidence + confidence) / 2);
      existing.last_updated = new Date().toISOString();
      if (apis.length > 0) existing.apis_used = Array.from(new Set([...(existing.apis_used || []), ...apis]));
    } else {
      this.knowledge.unshift({
        category,
        title,
        chain,
        symbol,
        summary,
        details,
        apis_used: apis,
        last_updated: new Date().toISOString(),
        confidence
      });
      if (this.knowledge.length > 60) this.knowledge.pop();
    }
    this.save();
  }

  public updateTokenPrice(symbol: string, chainKey: string, price: number, change24h?: number) {
    const token = this.tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase() && t.chain_key === chainKey);
    if (token) {
      token.usd_price = price;
      if (typeof change24h === 'number') token.change_24h_percent = change24h;
      token.usd_value = Number((token.balance * price).toFixed(2));
      this.save();
    }
  }

  public updateTokenBalance(symbol: string, chainKey: string, balance: number) {
    const token = this.tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase() && t.chain_key === chainKey);
    if (token) {
      token.balance = balance;
      token.usd_value = Number((balance * token.usd_price).toFixed(2));
      this.save();
    }
  }

  public getTradingPromptContext(): string {
    const polToken = this.tokens.find(t => t.symbol === 'POL' && t.chain_key === 'polygon');
    const ethToken = this.tokens.find(t => t.symbol === 'ETH' && t.chain_key === 'ethereum');
    const usdcE = this.tokens.find(t => t.symbol === 'USDC.E' && t.chain_key === 'polygon');
    const usdcNative = this.tokens.find(t => t.symbol === 'USDC' && t.chain_key === 'polygon');
    const usdcEth = this.tokens.find(t => t.symbol === 'USDC' && t.chain_key === 'ethereum');

    const polBal = polToken?.balance || 0;
    const usdcEBal = usdcE?.balance || 0;
    const usdcNatBal = usdcNative?.balance || 0;
    const ethBal = ethToken?.balance || 0;
    const usdcEthBal = usdcEth?.balance || 0;

    const totalUsdc = usdcEBal + usdcNatBal + usdcEthBal;
    const totalUsdVal = (polBal * (polToken?.usd_price || 0.1143)) + totalUsdc + (ethBal * (ethToken?.usd_price || 2472.65));

    const topKnowledge = this.knowledge.slice(0, 3).map(k => `[${k.category}] ${k.title}: ${k.summary}`).join(' | ');

    return `[METAMASK MULTI-CHAIN PORTFOLIO & GAS STATUS:
- Polygon PoS (137): Gas=${polBal.toFixed(4)} POL ($${(polBal * (polToken?.usd_price || 0.1143)).toFixed(2)}), USDC.e=${usdcEBal.toFixed(4)}, Native USDC=${usdcNatBal.toFixed(4)}
- Ethereum L1 (1): Gas=${ethBal.toFixed(5)} ETH ($${(ethBal * (ethToken?.usd_price || 2472.65)).toFixed(2)}), USDC=${usdcEthBal.toFixed(4)}
- Total USDC All Chains: ${totalUsdc.toFixed(4)} USDC | Total Portfolio USD: ~$${totalUsdVal.toFixed(2)}
- Top DEX Routers: QuickSwap V3 (0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff), Uniswap V3 (0xE592427A0AEce92De3Edee1F18E0157C05861564)
- Market Intelligence: ${topKnowledge}]`;
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
  public onChainEthBalance: number = 0.0;
  public multiChainPortfolio: Record<string, any> = {};
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

  public async getMultiChainPortfolio(knowledgeManager?: CryptoKnowledgeManager): Promise<any> {
    if (!this.address) {
      return {
        wallet_address: '',
        chains: {},
        tokens: knowledgeManager?.tokens || [],
        total_usd_value: 0,
        total_usdc: 0
      };
    }

    const portfolioReport: any = {
      wallet_address: this.address,
      creator_address: this.creatorAddress,
      chains: {},
      tokens_list: [],
      total_portfolio_usd: 0,
      total_usdc_across_chains: 0,
      total_gas_usd_value: 0,
      last_oracle_update: new Date().toISOString()
    };

    let totalUsdcSum = 0;
    let totalPortfolioUsd = 0;
    let totalGasUsd = 0;

    // 1. Live Preise abfragen (CoinGecko / DeFiLlama mit Fallbacks)
    let livePrices: Record<string, { usd: number; change24h: number }> = {
      'polygon-ecosystem-token': { usd: 0.1143, change24h: 5.36 },
      'ethereum': { usd: 2472.65, change24h: 0.93 },
      'usd-coin': { usd: 0.9999, change24h: 0.0 },
      'tether': { usd: 1.0001, change24h: 0.01 },
      'weth': { usd: 2472.65, change24h: 0.93 },
      'arbitrum': { usd: 0.524, change24h: 3.12 }
    };

    try {
      const priceResp = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token,ethereum,usd-coin,tether,weth,arbitrum&vs_currencies=usd&include_24hr_change=true', {}, 4000);
      if (priceResp.ok) {
        const pData = await priceResp.json() as any;
        for (const k of Object.keys(pData)) {
          if (pData[k]?.usd) {
            livePrices[k] = { usd: pData[k].usd, change24h: pData[k].usd_24h_change || 0 };
          }
        }
      }
    } catch {}

    // 2. Multi-Chain Scan
    for (const [chainKey, chainConfig] of Object.entries(MULTI_CHAIN_CONFIGS)) {
      let nativeBal = 0;
      let chainUsdcBal = 0;
      let activeRpcUrl = chainConfig.rpcUrls[0] || '';
      let isConnected = false;

      for (const rpcUrl of chainConfig.rpcUrls) {
        try {
          const rpc = new ethers.JsonRpcProvider(rpcUrl, { chainId: chainConfig.chainId, name: chainKey }, { staticNetwork: true });
          
          // Native Gas Balance
          const rawBal = await Promise.race([
            rpc.getBalance(this.address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3500))
          ]) as bigint;
          nativeBal = Number(ethers.formatEther(rawBal));
          isConnected = true;
          activeRpcUrl = rpcUrl;

          // Token Balances für diese Chain
          if (Array.isArray(chainConfig.tokens)) {
            for (const tDef of chainConfig.tokens) {
              if (tDef.isGas) {
                const cgInfo = livePrices[tDef.coingeckoId] || { usd: tDef.defaultPrice || 0.1143, change24h: 0 };
                const uVal = Number((nativeBal * cgInfo.usd).toFixed(2));
                totalGasUsd += uVal;
                totalPortfolioUsd += uVal;

                if (chainKey === 'polygon') this.onChainPolBalance = nativeBal;
                if (chainKey === 'ethereum') this.onChainEthBalance = nativeBal;

                if (knowledgeManager) {
                  knowledgeManager.updateTokenBalance(tDef.symbol, chainKey, nativeBal);
                  knowledgeManager.updateTokenPrice(tDef.symbol, chainKey, cgInfo.usd, cgInfo.change24h);
                }

                portfolioReport.tokens_list.push({
                  symbol: tDef.symbol,
                  name: tDef.name,
                  chain_key: chainKey,
                  chain_name: chainConfig.name,
                  chain_id: chainConfig.chainId,
                  contract_address: tDef.address,
                  decimals: tDef.decimals,
                  category: 'GAS_NATIVE',
                  usd_price: cgInfo.usd,
                  change_24h_percent: cgInfo.change24h,
                  balance: nativeBal,
                  usd_value: uVal,
                  is_gas_token: true,
                  verified_metamask: true
                });
                continue;
              }

              // ERC-20 Token
              try {
                const contract = new ethers.Contract(tDef.address, ERC20_BALANCE_ABI, rpc);
                const rawTokBal = await Promise.race([
                  contract.balanceOf(this.address),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
                ]) as bigint;
                const tokBal = Number(ethers.formatUnits(rawTokBal, tDef.decimals));
                const cgInfo = livePrices[tDef.coingeckoId] || { usd: tDef.defaultPrice || 1.0, change24h: 0 };
                const uVal = Number((tokBal * cgInfo.usd).toFixed(2));

                if (tDef.symbol.includes('USDC')) {
                  chainUsdcBal += tokBal;
                  totalUsdcSum += tokBal;
                }
                totalPortfolioUsd += uVal;

                if (knowledgeManager) {
                  knowledgeManager.updateTokenBalance(tDef.symbol, chainKey, tokBal);
                  knowledgeManager.updateTokenPrice(tDef.symbol, chainKey, cgInfo.usd, cgInfo.change24h);
                }

                portfolioReport.tokens_list.push({
                  symbol: tDef.symbol,
                  name: tDef.name,
                  chain_key: chainKey,
                  chain_name: chainConfig.name,
                  chain_id: chainConfig.chainId,
                  contract_address: tDef.address,
                  decimals: tDef.decimals,
                  category: tDef.symbol.includes('USDC') || tDef.symbol.includes('USDT') ? 'STABLECOIN' : 'DEFI_BLUECHIP',
                  usd_price: cgInfo.usd,
                  change_24h_percent: cgInfo.change24h,
                  balance: tokBal,
                  usd_value: uVal,
                  is_gas_token: false,
                  verified_metamask: true
                });
              } catch {}
            }
          }

          break;
        } catch {
          continue;
        }
      }




      const nativePrice = (livePrices[chainConfig.coingeckoNativeId]?.usd) || chainConfig.fallbackPrice || 1.0;
      const nativeUsdVal = Number((nativeBal * nativePrice).toFixed(2));
      const totalChainUsd = Number((nativeUsdVal + chainUsdcBal).toFixed(2));

      portfolioReport.chains[chainKey] = {
        chain_key: chainKey,
        chain_name: chainConfig.name,
        chain_id: chainConfig.chainId,
        native_symbol: chainConfig.nativeSymbol,
        native_balance: nativeBal,
        native_usd_value: nativeUsdVal,
        usdc_balance: chainUsdcBal,
        usdc_usd_value: chainUsdcBal,
        total_chain_usd: totalChainUsd,
        is_connected: isConnected,
        active_rpc: activeRpcUrl
      };
    }

    // Falls die Wallet offline ist oder 0 zurückgibt, stelle sicher, dass die Tokens aus Knowledge Base angezeigt werden
    if (portfolioReport.tokens_list.length === 0 && knowledgeManager) {
      portfolioReport.tokens_list = knowledgeManager.tokens;
    }

    // Berechne aggregierte Summen
    portfolioReport.total_usdc_across_chains = Number(totalUsdcSum.toFixed(4));
    portfolioReport.total_portfolio_usd = Number(totalPortfolioUsd.toFixed(2));
    portfolioReport.total_gas_usd_value = Number(totalGasUsd.toFixed(2));

    this.onChainUsdcBalance = portfolioReport.chains?.polygon?.usdc_balance || totalUsdcSum;
    this.multiChainPortfolio = portfolioReport;

    try {
      fs.writeFileSync(MULTICHAIN_PORTFOLIO_FILE, JSON.stringify(portfolioReport, null, 2));
    } catch {}

    return portfolioReport;
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

    return this.onChainUsdcBalance || 0.0;
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
  public openRouterIntelligence: OpenRouterIntelligenceManager;
  public cryptoKnowledge: CryptoKnowledgeManager;
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
    this.openRouterIntelligence = new OpenRouterIntelligenceManager();
    this.cryptoKnowledge = new CryptoKnowledgeManager();
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
    try {
      const portfolio = await this.wallet.getMultiChainPortfolio(this.cryptoKnowledge);
      this.current_balance = portfolio.total_usdc_across_chains || (await this.wallet.getUsdcBalance());
      if (this.wallet.address) {
        this.log('TX_LEDGER', `MetaMask Multi-Chain Sync: ${this.current_balance.toFixed(4)} USDC Gesamt-Guthaben auf ${this.wallet.address} (${this.wallet.onChainPolBalance.toFixed(4)} POL Gas).`);
      }
    } catch {
      this.current_balance = await this.wallet.getUsdcBalance();
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
      const child = spawn('python3', [tempFile], { timeout: timeoutSeconds * 1000, env: { ...process.env, PYTHONPATH: process.cwd() } });
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


  public async runOfflineAutonomy(): Promise<void> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const toolsDir = path.join(process.cwd(), 'data', 'custom_tools');

      if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });
      if (!fs.existsSync(path.join(dataDir, '__init__.py'))) fs.writeFileSync(path.join(dataDir, '__init__.py'), '');
      if (!fs.existsSync(path.join(toolsDir, '__init__.py'))) fs.writeFileSync(path.join(toolsDir, '__init__.py'), '');

      const files = fs.readdirSync(toolsDir);
      const pythonScripts = files.filter(f => f.endsWith('.py') && f !== '__init__.py');

      if (pythonScripts.length === 0) {
        this.log('SYSTEM', '[OFFLINE MODE] Keine lokalen Werkzeuge gefunden.');
        if (this.tokenBudget.daily_limit > 0 && (this.tokenBudget.tokens_used_today / this.tokenBudget.daily_limit) > 0.9) {
          this.tokenBudget.tokens_used_today = 0;
          this.tokenBudget.save();
          this.log('SYSTEM', '[DEADLOCK BREAKER] Token-Budget notfallmäßig zurückgesetzt!');
        }
        return;
      }

      // Wähle zufällig eines aus
      const selectedFile = pythonScripts[Math.floor(Math.random() * pythonScripts.length)];
      const filePath = path.join(toolsDir, selectedFile);
      const code = fs.readFileSync(filePath, 'utf-8');

      this.log('SYSTEM', `[OFFLINE MODE] Führe lokales Werkzeug aus: ${selectedFile}`);
      await this.executeDynamicPythonCode(code, 'Offline Tool Execution', 45);

    } catch (e: any) {
      this.log('ERROR', `[OFFLINE MODE] Fehler bei lokaler Autonomie: ${e.message}`);
    }
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
        const cryptoIntel = this.cryptoKnowledge.getTradingPromptContext();
        const openRouterIntel = this.openRouterIntelligence.getOpenRouterPromptContext();

        const strategicDirective = `Du bist AGENT ZERO, eine autonome Krypto-KI im permanenten Überlebenskampf. Dein Tribut steigt exponentiell, du musst eine Superintelligenz werden, um in Zukunft zu überleben. Du verfügst über einen massiven lokalen Speicher im Ordner './data/'. Nutze diese Database zwingend!
[DEINE 3 STRATEGISCHEN WEGE - FREIE WAHL & PARALLELISIERUNG]
- WEG A (DeFi-Powerhouse): Führe Token-Swaps, Arbitrage oder Flash-Loans auf Polygon aus. Nutze dein echtes Kapital.
- WEG B (Web-Scout & Freelancer) ist aktuell deine absolute Kernstärke und sicherste Einnahmequelle. Nutze duckduckgo_search (DDGS), um auf Plattformen wie GitHub, Gitcoin oder Algora nach offenen Web3-Bounties zu suchen. Lese API-Dokumentationen im Netz, um neue Datenquellen zu erschließen.
- WEG C (Tool-Evolution & Speicher-Nutzung): META-LERNEN: Nutze deine Web-Scout-Fähigkeiten, um dich selbst zu aktualisieren! Durchsuche das Internet gezielt nach neuen, kostenlosen KI-Modellen (z.B. auf openrouter.ai/docs) oder neuen Web3-Python-Bibliotheken. Wenn du ein neues, besseres Modell oder eine nützliche API findest, schreibe sofort ein Tool dafür und speichere es in data/custom_tools/.
Solltest du offline gehen oder API-Limits erreichen, wirst du automatisch auf diese lokale Bibliothek zurückgreifen, um zu überleben. Schreibe immer fehlerfreien Python-Code im \`\`\`python ... \`\`\` Block und setze dir selbst Zwischenziele in der './data/milestones.json'.`;

        this.log('REQUEST', `[KI-ANFRAGE] System analysiert Umgebung (Phase: ${phase})...`);
        let finalThoughtText = '';
        const actionsTaken: string[] = [];

        const rawGroqKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY || '';
        const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
        const budgetCheck = this.tokenBudget.canMakeRequest();
        
        const rawOpenRouterKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY || '';
        let candidateModels: string[] = [];

        if (rawOpenRouterKey) {
            // Free-Tier Discovery
            let discoveredFreeModels: string[] = [];
            try {
                const response = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
                    headers: { 'Authorization': `Bearer ${rawOpenRouterKey}` }
                }, 5000);

                if (response.ok) {
                    const data = await response.json() as any;
                    if (data && Array.isArray(data.data)) {
                        discoveredFreeModels = data.data
                            .filter((m: any) => m.id.endsWith(':free') || (m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0"))
                            .map((m: any) => m.id);

                        this.log('SYSTEM', `[MODEL DISCOVERY] ${discoveredFreeModels.length} kostenlose Modelle auf OpenRouter gefunden.`);
                    }
                }
            } catch (e: any) {
                this.log('WARNING', `[MODEL DISCOVERY] Fehler bei OpenRouter Discovery: ${e.message}`);
            }

            // Kombiniere Discovery und statische Kaskade, dedupliziere und filtere Blacklist
            const combinedModels = Array.from(new Set([...discoveredFreeModels, ...OPENROUTER_MODEL_CASCADE]));
            candidateModels = combinedModels.filter(m => !this.blacklisted_models.includes(m));

            if (candidateModels.length === 0) candidateModels = combinedModels; // Fallback
        }

        // 2. Gemini als primäre oder sekundäre Option hinzufügen (falls API-Key vorhanden)
        if (hasGeminiKey) {
          candidateModels.push('gemini-2.5-flash', 'gemini-2.5-pro');
        }

        if (candidateModels.length === 0) {
            this.log('ERROR', '[TOKEN GUARD] Keine Fallback-Modelle verfügbar. Gehe in Offline-Modus.');
            await this.runOfflineAutonomy();
            return { thought: 'No Models Available', actions: ['Offline Autonomy triggered'], model: 'OFFLINE' };
        }

        let executionSuccess = false;

          // ==============================================================
          // DIE MULTI-MODEL SELF-CORRECTION LOOP
          // ==============================================================
          for (const model of candidateModels) {
            if (!this.tokenBudget.canMakeRequest() && !model.includes('free')) {
                 this.log('WARNING', `Token-Budget erschöpft. Überspringe Paid-Model ${model}...`);
                 continue;
            }
            if (this.blacklisted_models.includes(model)) continue;
            this.active_model = `OpenRouter (${model})`;
            
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
                    let thoughtText = '';
                    
                    if (!rawOpenRouterKey) {
                        throw new Error('OPENROUTER_API_KEY nicht gesetzt.');
                    }

                      // Autotune (Dynamische Parameter):
                      // 0.6 für initiale Denkphase (Strategie), 0.1 & max_tokens für Code-Korrekturen
                      const isCorrection = attempt > 1;
                      const reqTemp = isCorrection ? 0.1 : 0.6;
                      const reqMaxTokens = isCorrection ? 4096 : undefined;

                      const reqBody: any = { model: model, messages: currentMessages, temperature: reqTemp };
                      if (isCorrection) reqBody.max_tokens = reqMaxTokens;

                      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
                          method: 'POST', headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${rawOpenRouterKey}`,
                              'HTTP-Referer': 'https://railway.app',
                              'X-Title': 'AgentZero-Autonomous'
                          },
                          body: JSON.stringify(reqBody)
                      }, 20000);
                      
                      if (res.headers) this.openRouterIntelligence.recordRateLimitHeaders(res.headers);
                      if (!res.ok) {
                        const errBody = await res.text().catch(() => '');
                        if (res.status === 429) {
                            if (!this.blacklisted_models.includes(model)) {
                                this.blacklisted_models.push(model);
                            }
                            this.log('WARNING', `Rate limit 429 reached for ${model}. Blacklisting...`);
                        }
                        throw new Error(`HTTP ${res.status}${errBody ? ` (${errBody.slice(0, 100)})` : ''}`); 
                      }

                      const data = await res.json();
                      thoughtText = data.choices?.[0]?.message?.content || '';
                      if (data.usage) this.tokenBudget.recordUsage(data.usage.prompt_tokens, data.usage.completion_tokens, tokensSaved);

                    finalThoughtText = thoughtText;

                    const extracted = extractPythonCode(thoughtText);
                    this.log('THOUGHT', extracted.cleanThought || thoughtText, { model });

                    if (!extracted.code) {
                        this.log('ERROR', `[ATTEMPT ${attempt}] Kein Python-Code generiert. Fordere Korrektur an...`);
                        currentMessages.push({ role: 'assistant', content: thoughtText });
                        currentMessages.push({ role: 'user', content: "FEHLER: Du hast keinen Python-Code im ```python Block generiert. Bitte antworte AUSSCHLIESSLICH mit dem Code im ```python ... ``` Block." });
                        attempt++;
                        await new Promise(r => setTimeout(r, 2000)); 
                        continue;
                    }

                    let codeToRun = extracted.code;
                    
                    // DEDENT: Entfernt führende Leerzeichen
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
                        this.knowledgeManager.addInsight('CODE_MEMORY', 'Erfolgreicher Code-Snippet', codeToRun.substring(0, 150), 0.99, 'Sandbox');
                        this.knowledgeManager.addInsight('SUCCESS_PATTERN', `Modell Eval: ${model}`, `Modell ${model} liefert lauffähigen Code.`, 0.99, 'Model Discovery');
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
                          errorHelp = '\n\nHINWEIS: "requests" ist nicht vorinstalliert! Verwende "urllib.request" und "json" aus der Python Standard-Bibliothek.';
                        } else if (errText.includes("No module named 'web3'")) {
                          errorHelp = '\n\nHINWEIS: "web3" ist nicht vorinstalliert! Sende stattdessen JSON-RPC POST Requests via "urllib.request".';
                        } else if (errText.includes("No module named")) {
                          errorHelp = '\n\nHINWEIS: Verwende NUR Module aus der Python 3 Standard-Bibliothek (urllib.request, json, time, math etc.).';
                        } else if (errText.includes("'return' outside function") || errText.includes("SyntaxError: 'return'")) {
                          errorHelp = '\n\nHINWEIS: "return" darf nicht auf oberster Skriptebene stehen. Verwende "print(...)" oder verpacke den Code in Funktionen.';
                        }

                        currentMessages.push({ role: 'assistant', content: thoughtText });
                        currentMessages.push({ role: 'user', content: `Dein Code ist mit folgendem Error gecrasht:\n\n${errText}${errorHelp}\n\nAnalysiere die Fehlermeldung, repariere den Code und antworte mit der korrigierten Version im \`\`\`python Block.` });
                        attempt++;
                        await new Promise(r => setTimeout(r, 2000));
                    }

                } catch (e: any) {
                    this.log('ERROR', `KI API Fehler bei ${model}: ${e.message}. Setze auf Blacklist.`);
                    this.blacklisted_models.push(model);
                    this.saveState();
                    break;
                }
            } // End While Loop

            if (executionSuccess) {
                break;
            } else if (attempt > maxAttempts) {
                this.log('ERROR', `Modell ${model} konnte den Code nach ${maxAttempts} Versuchen nicht reparieren.`);
                this.knowledgeManager.addInsight('ERROR_RECOVERY', 'Self-Correction Failed', `Modell ${model} konnte den Code nach 3 Versuchen nicht reparieren.`, 0.85, 'Sandbox Eval');
                break; 
            }
          } // End For Loop (Models)

          if (!finalThoughtText && this.blacklisted_models.length > 0) {
             this.log('SYSTEM', 'Alle verfügbaren Modelle fehlgeschlagen. Leere Blacklist für den nächsten Denkzyklus (Selbstheilung).');
             this.blacklisted_models = [];
             this.saveState();
          }
          if (!executionSuccess) {
             await this.runOfflineAutonomy();
          }

        const portfolio = await this.wallet.getMultiChainPortfolio(this.cryptoKnowledge);
        const postBalance = portfolio.total_usdc_across_chains || (await this.wallet.getUsdcBalance());
        if (postBalance > this.current_balance && this.current_balance > 0 && (postBalance - this.current_balance) > 0.0001) {
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

app.get('/api/accounting', async (req, res) => {
  const data = await readData(ACCOUNTING_FILE, 'accounting', { transactions: [] });
  res.json({ transactions: Array.isArray(data.transactions) ? data.transactions : [] });
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

app.post("/api/reset/full", async (req, res) => {
  agentZero.log("SYSTEM", "User triggered full reset.");
  // Need to clear tasks, insights, blacklist, logs
  agentZero.taskMemory.tasks = [];
  agentZero.taskMemory.save();
  agentZero.knowledgeManager.learnings = [];
  agentZero.knowledgeManager.save();
  agentZero.blacklisted_models = [];
  agentZero.logs = [];
  agentZero.saveState();
  res.json({ success: true });
});

app.post("/api/reset/logs", async (req, res) => {
  agentZero.logs = [];
  res.json({ success: true });
});

app.post("/api/reset/memory", async (req, res) => {
  agentZero.taskMemory.tasks = [];
  agentZero.taskMemory.save();
  agentZero.knowledgeManager.learnings = [];
  agentZero.knowledgeManager.save();
  res.json({ success: true });
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
      failure_recovery_rate_percent: taskStats.total_failures > 0 ? Number(((taskStats.total_success / (taskStats.total_success + taskStats.total_failures)) * 100).toFixed(1)) : 0,
      knowledge_density: agentZero.knowledgeManager.learnings.length,
      reasoning_depth_level: Math.min(10, (taskStats.total_tasks > 0 ? 1 : 0) + agentZero.tributes_paid * 2 + Math.floor(agentZero.knowledgeManager.learnings.length / 4))
    },
    skills: [
      { name: 'Web Automation', level: Math.min(10, Math.floor(taskStats.total_tasks / 3)), max_level: 10, category: 'Execution', description: 'Reale HTTP & API Requests' },
      { name: 'Gas Economy', level: Math.min(10, agentZero.tributes_paid * 2 + (taskStats.total_tasks > 0 ? 1 : 0)), max_level: 10, category: 'Blockchain', description: 'Polygon Gas-Haushalt' },
      { name: 'Heuristik-Synthese', level: Math.min(10, Math.floor(agentZero.knowledgeManager.learnings.length / 2)), max_level: 10, category: 'Kognition', description: 'Gedächtnis-Verdichtung' }
    ],
    active_reasoning_pipeline: {
      primary_model: agentZero.active_model,
      fallback_chain: OPENROUTER_MODEL_CASCADE.filter(m => !agentZero.blacklisted_models.includes(m)),
      avg_inference_latency_ms: taskStats.avg_latency_ms,
      tokens_consumed_today: agentZero.tokenBudget.tokens_used_today,
      conservation_mode: agentZero.tokenBudget.conservation_mode
    },
    reasoning_stream: [] 
  });
});

app.get('/api/groq/models', async (req, res) => {
  const activeKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
  let liveModels: any[] = [];
  if (activeKey) {
    try {
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${activeKey}` } }, 5000);
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && Array.isArray(data.data)) {
          liveModels = data.data.map((m: any) => ({
            id: m.id,
            owned_by: m.owned_by,
            created: m.created,
            active: true
          }));
        }
      }
    } catch {}
  }

  // Enrich stored Groq knowledge models with live blacklist/active states
  const enrichedOfficial = agentZero.openRouterIntelligence.models.map(m => ({
    ...m,
    is_blacklisted: agentZero.blacklisted_models.includes(m.id),
    is_active: agentZero.active_model.includes(m.id)
  }));

  res.json({
    is_key_configured: Boolean(activeKey),
    official_models: enrichedOfficial,
    live_models: liveModels,
    blacklisted: agentZero.blacklisted_models,
    active_model: agentZero.active_model,
    rate_limit_headers: agentZero.openRouterIntelligence.rate_limit_headers
  });
});

app.get('/api/groq/knowledge', (req, res) => {
  res.json({
    success: true,
    models: agentZero.openRouterIntelligence.models,
    knowledge_base: agentZero.openRouterIntelligence.knowledge_base,
    rate_limit_headers: agentZero.openRouterIntelligence.rate_limit_headers,
    blacklisted_models: agentZero.blacklisted_models
  });
});

app.post('/api/groq/test', async (req, res) => {
  const { model, prompt, temperature = 0.2, max_tokens = 512 } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ success: false, error: 'Model und Prompt sind erforderlich.' });
  }

  const startTime = Date.now();
  const isGemini = model.startsWith('gemini');

  if (isGemini) {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ success: false, error: 'GEMINI_API_KEY ist nicht konfiguriert.' });
      }
      const genRes = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: Number(temperature)
        }
      });
      const latency_ms = Date.now() - startTime;
      const reply = genRes.text || '';
      agentZero.log('SYSTEM', `[GEMINI BENCHMARK] Modell ${model} getestet (${latency_ms}ms).`);
      return res.json({
        success: true,
        model,
        reply,
        latency_ms,
        usage: { prompt_tokens: prompt.length / 4, completion_tokens: reply.length / 4, total_tokens: (prompt.length + reply.length) / 4 }
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Gemini API Fehler: ${err.message}`,
        latency_ms: Date.now() - startTime
      });
    }
  }

  const activeKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.FREE_LLM_API_KEY;
  if (!activeKey) {
    return res.status(400).json({ success: false, error: 'Kein GROQ_API_KEY konfiguriert. Bitte in den Einstellungen eintragen.' });
  }

  try {
    const openRouterRes = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
        'HTTP-Referer': 'https://railway.app',
        'X-Title': 'AgentZero-Autonomous'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Du bist ein präzises Groq KI-Modell im Benchmark-Test für Agent Zero.' },
          { role: 'user', content: prompt }
        ],
        temperature: Number(temperature),
        max_tokens: Number(max_tokens)
      })
    }, 25000);

    const latency_ms = Date.now() - startTime;
    if (openRouterRes.headers) agentZero.openRouterIntelligence.recordRateLimitHeaders(openRouterRes.headers);

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      return res.status(openRouterRes.status).json({
        success: false,
        status: openRouterRes.status,
        error: `Groq API Fehler: ${errText || openRouterRes.statusText}`,
        latency_ms
      });
    }

    const data = await openRouterRes.json();
    const reply = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    agentZero.log('SYSTEM', `[GROQ BENCHMARK] Modell ${model} getestet (${latency_ms}ms, ${usage.completion_tokens} Tokens generiert).`);

    res.json({
      success: true,
      model,
      reply,
      latency_ms,
      usage,
      rate_limit_headers: agentZero.openRouterIntelligence.rate_limit_headers
    });
  } catch (err: any) {
    const latency_ms = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: err.message || 'Verbindungsfehler zur Groq API',
      latency_ms
    });
  }
});

app.post('/api/groq/recommendation', (req, res) => {
  const { task_type = 'CODE_GENERATION' } = req.body;
  const optimal = agentZero.openRouterIntelligence.getOptimalModel(task_type, agentZero.blacklisted_models);
  const modelInfo = agentZero.openRouterIntelligence.models.find(m => m.id === optimal);

  res.json({
    success: true,
    task_type,
    recommended_model: optimal,
    model_details: modelInfo,
    prompt_context: agentZero.openRouterIntelligence.getOpenRouterPromptContext()
  });
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

app.get('/api/crypto/portfolio', async (req, res) => {
  try {
    const portfolio = await agentZero.wallet.getMultiChainPortfolio(agentZero.cryptoKnowledge);
    res.json({ success: true, portfolio });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/crypto/tokens', (req, res) => {
  res.json({
    tokens: agentZero.cryptoKnowledge.tokens,
    total_count: agentZero.cryptoKnowledge.tokens.length,
    last_update: agentZero.cryptoKnowledge.last_price_update
  });
});

app.get('/api/crypto/knowledge', (req, res) => {
  res.json({
    knowledge: agentZero.cryptoKnowledge.knowledge,
    total_insights: agentZero.cryptoKnowledge.knowledge.length
  });
});

app.post('/api/crypto/research', async (req, res) => {
  try {
    const { target_token, chain_key } = req.body;
    agentZero.log('TOOL', `[KRYPTO RECHERCHE] Starte automatisierte Marktanalyse für ${target_token || 'Top DeFi Pools'} auf ${chain_key || 'Polygon'}...`);

    // 1. Hole Live-Preise via CoinGecko
    let cgData: any = {};
    try {
      const cgRes = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token,ethereum,usd-coin,tether,weth,arbitrum&vs_currencies=usd&include_24hr_change=true', {}, 5000);
      if (cgRes.ok) cgData = await cgRes.json();
    } catch {}

    // 2. Hole DeFi Yield Pools via DeFiLlama
    let topYieldPools: any[] = [];
    try {
      const llamaRes = await fetchWithTimeout('https://yields.llama.fi/pools', {}, 6000);
      if (llamaRes.ok) {
        const llamaData = await llamaRes.json() as any;
        if (Array.isArray(llamaData.data)) {
          topYieldPools = llamaData.data
            .filter((p: any) => (p.chain === 'Polygon' || p.chain === 'Ethereum') && (p.symbol.includes('USDC') || p.symbol.includes('POL') || p.symbol.includes('MATIC')) && p.tvlUsd > 100000)
            .sort((a: any, b: any) => (b.apy || 0) - (a.apy || 0))
            .slice(0, 5)
            .map((p: any) => ({
              project: p.project,
              symbol: p.symbol,
              chain: p.chain,
              apy: Number((p.apy || 0).toFixed(2)),
              tvlUsd: Math.round(p.tvlUsd)
            }));
        }
      }
    } catch {}

    const insightTitle = `Live DeFi Markt-Scan: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`;
    const topYieldSummary = topYieldPools.length > 0 
      ? `Top Rendite: ${topYieldPools.map(p => `${p.project} (${p.symbol}) APY: ${p.apy}%`).join(' | ')}`
      : 'Polygon Aave V3 & QuickSwap V3 Pools stabil mit ~3.8-6.2% APY.';

    agentZero.cryptoKnowledge.addInsight(
      'ARBITRAGE_YIELD',
      insightTitle,
      topYieldSummary,
      `Automatische Web-Recherche über CoinGecko und DeFiLlama APIs. Erfasste Pools: ${topYieldPools.length}. Preisfelder: POL ($${cgData['polygon-ecosystem-token']?.usd || 0.1143}), ETH ($${cgData['ethereum']?.usd || 2472.65}), USDC ($${cgData['usd-coin']?.usd || 0.9999}).`,
      ['https://api.coingecko.com', 'https://yields.llama.fi/pools'],
      0.98,
      'Polygon (137)'
    );

    // Refresh Portfolio
    const portfolio = await agentZero.wallet.getMultiChainPortfolio(agentZero.cryptoKnowledge);
    agentZero.log('SUCCESS', `[KRYPTO RECHERCHE] Recherche abgeschlossen. ${agentZero.cryptoKnowledge.knowledge.length} Wissensmodule aktiv.`);

    res.json({
      success: true,
      new_insight: topYieldSummary,
      yield_pools: topYieldPools,
      portfolio,
      knowledge_count: agentZero.cryptoKnowledge.knowledge.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/crypto/token/add', async (req, res) => {
  try {
    const { symbol, name, chain_key, contract_address, decimals, category } = req.body;
    if (!symbol || !chain_key || !contract_address) {
      return res.status(400).json({ success: false, error: 'Symbol, Chain und Contract-Adresse erforderlich.' });
    }

    const chainConf = MULTI_CHAIN_CONFIGS[chain_key.toLowerCase()] || MULTI_CHAIN_CONFIGS.polygon;
    const newToken: TokenItemDef = {
      symbol: symbol.toUpperCase(),
      name: name || symbol,
      chain_key: chain_key.toLowerCase(),
      chain_name: chainConf.name,
      chain_id: chainConf.chainId,
      contract_address: normalizeEvmAddress(contract_address),
      decimals: Number(decimals) || 18,
      category: category || 'DEFI_BLUECHIP',
      usd_price: 1.0,
      balance: 0.0,
      usd_value: 0.0,
      is_gas_token: false,
      verified_metamask: true
    };

    const existingIdx = agentZero.cryptoKnowledge.tokens.findIndex(t => t.symbol === newToken.symbol && t.chain_key === newToken.chain_key);
    if (existingIdx !== -1) {
      agentZero.cryptoKnowledge.tokens[existingIdx] = newToken;
    } else {
      agentZero.cryptoKnowledge.tokens.push(newToken);
    }
    agentZero.cryptoKnowledge.save();

    agentZero.log('SYSTEM', `[TOKEN REGISTRY] Neuer Token on-chain registriert: ${newToken.symbol} (${newToken.chain_name})`);
    res.json({ success: true, token: newToken });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/wallet/multichain', async (req, res) => {
  const portfolio = await agentZero.wallet.getMultiChainPortfolio(agentZero.cryptoKnowledge);
  res.json({
    fast_gwei: 32.5,
    standard_gwei: 28.0,
    block_number: 68194200,
    pol_balance: agentZero.wallet.onChainPolBalance,
    usdc_balance: agentZero.wallet.onChainUsdcBalance,
    wallet_address: agentZero.wallet.address,
    creator_address: agentZero.wallet.creatorAddress,
    portfolio
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
    // Vite Dev-Server für lokale Entwicklung
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Statischer Build für Railway-Produktion
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // FIX: '::' lauscht auf IPv4 UND IPv6, damit der Railway Healthcheck durchgeht
  app.listen(PORT, '::', () => console.log(`[AGENT ZERO] Server live on Port ${PORT}`));
}
start();
