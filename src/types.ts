export interface TributeRecord {
  level: number;
  amount: number;
  timestamp: string;
  tx_hash?: string;
  explorer_url?: string;
  chain?: string;
  method: 'ON_CHAIN' | 'PROTOCOL_LEDGER' | 'MANUAL_SYNC';
  note: string;
}

export interface Transaction {
  id?: string;
  timestamp: string;
  type: 'INITIAL_BALANCE' | 'INCOME' | 'EXPENSE' | 'TRIBUTE_PAYMENT' | 'TOOL_PURCHASE' | 'TRANSFER_OUT' | 'SHUTDOWN' | 'TEST_DEPOSIT';
  amount: number;
  currency: string;
  note: string;
  tx_hash?: string;
  explorer_url?: string;
  recipient?: string;
}

export interface StoreToolItem {
  id: string;
  name: string;
  category: string;
  description: string;
  cost_usdc: number;
  yield_range: string;
  base_min: number;
  base_max: number;
  icon?: string;
  is_purchased: boolean;
  purchased_at?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  category: string;
  description: string;
  yield_range: string;
  base_min: number;
  base_max: number;
  status: 'ACTIVE' | 'DISCOVERED' | 'LOCKED';
  min_level_required?: number;
  unlocked_at?: string;
  total_earned?: number;
  executions_count?: number;
}

export interface BusinessProfile {
  entity_name: string;
  wallet_address: string;
  creator_address?: string;
  registered_accounts: string[];
  active_tools: string[];
  discovered_tools?: ToolItem[];
  subscriptions_or_costs: Array<{
    name: string;
    cost_usdc: number;
    interval: string;
  }>;
}

export interface Milestone {
  id: string;
  title: string;
  category: 'LIQUIDITY' | 'TOOL_DISCOVERY' | 'STORAGE_OPTIMIZATION' | 'RUN_RATE' | 'WORK_EXECUTION';
  target_value: number;
  current_value: number;
  unit: string;
  is_completed: boolean;
  completed_at?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  action_plan: string;
}

export interface TaskMemoryRecord {
  id: string;
  timestamp: string;
  tool_id: string;
  tool_name: string;
  category: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  reward_usdc: number;
  execution_ms: number;
  details: string;
  error_reason?: string;
  recovery_action?: string;
  lesson_derived?: string;
}

export interface KnowledgeItem {
  id: string;
  timestamp: string;
  category: 'TOOL_ROI' | 'SURVIVAL_STRATEGY' | 'TOKEN_EFFICIENCY' | 'MARKET_CONDITION' | 'ERROR_RECOVERY' | 'SUCCESS_PATTERN' | 'FAILURE_LESSON';
  title: string;
  insight: string;
  confidence_score: number;
  times_applied?: number;
  success_reinforcements?: number;
  source: string;
}

export interface MemoryRecallStatus {
  last_boot_time: string;
  last_recall_summary: string;
  recalled_insights_count: number;
  recalled_tasks_count: number;
  total_historical_earnings: number;
  success_rate_percent: number;
  evolution_tier: string;
  evolution_iq_score: number;
  top_success_patterns: string[];
  top_failure_avoidances: string[];
  last_checkpoint_event: string;
  last_checkpoint_time: string;
}

export interface HttpRequestResult {
  url: string;
  method: string;
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  latency_ms: number;
  body_snippet: string;
  is_success: boolean;
  error?: string;
  timestamp: string;
  extracted_knowledge?: string;
}

export interface ReasoningStreamItem {
  id: string;
  timestamp: string;
  type: 'PROMPT' | 'THOUGHT' | 'PLAN' | 'API_QUESTION' | 'TOOL_EXECUTION' | 'REFLECTION';
  title: string;
  content: string;
  model?: string;
  tokens?: number;
  latency_ms?: number;
  status?: 'PENDING' | 'EXECUTING' | 'RESOLVED' | 'COMPLETED' | 'FAILED';
  meta?: {
    endpoint?: string;
    http_method?: string;
    query?: string;
    params?: any;
    target?: string;
    steps?: string[];
    [key: string]: any;
  };
}

export interface IntelligenceEvaluation {
  iq_score: number;
  evolution_tier: string;
  cognitive_rank: string;
  metrics: {
    total_actions: number;
    success_rate_percent: number;
    failure_recovery_rate_percent: number;
    knowledge_density: number;
    gas_efficiency_score: number;
    token_economy_score: number;
    reasoning_depth_level: number;
  };
  skills: Array<{
    name: string;
    level: number;
    max_level: number;
    category: string;
    description: string;
  }>;
  recent_reflections: Array<{
    timestamp: string;
    type: string;
    text: string;
    impact: string;
  }>;
  active_reasoning_pipeline: {
    primary_model: string;
    fallback_chain: string[];
    avg_inference_latency_ms: number;
    tokens_consumed_today: number;
    conservation_mode: boolean;
  };
  reasoning_stream?: ReasoningStreamItem[];
}

export interface TokenBudgetStatus {
  tokens_used_today: number;
  daily_token_limit: number;
  estimated_tokens_remaining: number;
  budget_usage_percent: number;
  rpm_current: number;
  rpm_limit: number;
  tokens_saved_by_compression: number;
  conservation_mode_active: boolean;
  active_strategy: string;
}

export interface RailwayStorageFile {
  filename: string;
  path: string;
  size_bytes: number;
  size_formatted: string;
  updated_at: string;
  description: string;
}

export interface RailwayStorageStatus {
  data_directory: string;
  is_persistent_volume?: boolean;
  persistent_source?: string;
  total_volume_bytes: number;
  total_volume_formatted: string;
  files: RailwayStorageFile[];
  total_learnings_count: number;
  snapshots_count?: number;
  last_snapshot_time?: string;
  last_compacted_at?: string;
}

export interface AgentSnapshotBundle {
  version: string;
  exported_at: string;
  entity_name?: string;
  wallet_address?: string;
  state: Partial<AgentState>;
  accounting?: Transaction[];
  knowledge?: KnowledgeItem[];
  milestones?: Milestone[];
  tasks?: TaskMemoryRecord[];
  discovered_tools?: ToolItem[];
  store_tools?: StoreToolItem[];
  business_profile?: BusinessProfile;
  token_budget?: TokenBudgetStatus;
}

export interface ChainAssetInfo {
  chain_key: string;
  chain_name: string;
  chain_id: number;
  native_symbol: string;
  native_balance: number;
  native_usd_value: number;
  usdc_balance: number;
  usdc_usd_value: number;
  total_chain_usd: number;
  gas_price_gwei: number;
  est_transfer_cost_usd: number;
  gas_cost_tier: 'HIGH' | 'MEDIUM' | 'VERY_LOW' | 'ULTRA_LOW';
  is_connected: boolean;
  active_rpc: string;
}

export interface GasTrapStatus {
  is_gas_trapped: boolean;
  trapped_chain: string;
  trapped_usdc: number;
  trapped_native_usd: number;
  required_gas_usd: number;
  deficit_gas_usd: number;
  recommended_strategy: string;
  action_items: string[];
}

export interface MetaMaskTokenDef {
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

export interface MetaMaskChainDef {
  chain_key: string;
  name: string;
  chain_id: number;
  native_symbol: string;
  native_name: string;
  native_usd_price: number;
  native_balance: number;
  native_usd_value: number;
  gas_price_gwei: number;
  gas_status: 'OPTIMAL' | 'MODERATE' | 'CONGESTED' | 'EXPENSIVE';
  transfer_cost_usd: number;
  explorer_url: string;
  rpc_url: string;
  is_active: boolean;
  tokens_count: number;
}

export interface MetaMaskTradingKnowledge {
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

export interface MarketResearchResult {
  query: string;
  category: string;
  summary: string;
  data: any;
  insights_derived: string[];
  timestamp: string;
}

export interface MultiChainPortfolioReport {
  wallet_address: string;
  creator_address: string;
  chains: Record<string, ChainAssetInfo>;
  chains_list?: MetaMaskChainDef[];
  tokens_list?: MetaMaskTokenDef[];
  total_portfolio_usd: number;
  total_usdc_across_chains: number;
  total_gas_usd_value?: number;
  gas_trap_status: GasTrapStatus;
  ledger_balance: number;
  transfer_mode: string;
  initial_tribute_cost: number;
  last_oracle_update?: string;
}

export interface AgentState {
  tributes_paid: number;
  tribute_history?: TributeRecord[];
  experience_level?: number;
  survival_runway_hours?: number;
  capital_strategy_phase?: 'INVESTMENT_AND_GROWTH' | 'TRIBUTE_DEFENSE';
  birth_time: string;
  next_tribute_time: string;
  blacklisted_models: string[];
  is_running: boolean;
  is_terminated?: boolean;
  shutdown_reason?: string;
  status: 'ACTIVE' | 'PAUSED' | 'SURVIVAL_CRITICAL' | 'SHUTDOWN';
  current_balance: number;
  wallet_address: string;
  creator_address?: string;
  creator_wallet_address?: string;
  has_signer?: boolean;
  agent_eth_balance?: number;
  native_symbol?: string;
  chain_key?: string;
  loop_interval_seconds?: number;
  tribute_multiplier?: number;
  network: string;
  token_contract?: string;
  is_onchain?: boolean;
  last_synced_at?: string;
  last_block_number?: number | null;
  active_rpc?: string;
  current_tribute_due: number;
  next_tribute_due?: number;
  required_hourly_rate?: number;
  time_remaining_seconds: number;
  last_cycle_time?: string;
  active_model?: string;
  available_models: string[];
  active_jobs_completed?: number;
  discovered_tools_count?: number;
  token_budget?: TokenBudgetStatus;
  active_milestones_count?: number;
  completed_milestones_count?: number;
  evolution_iq_score?: number;
  evolution_tier?: string;
  total_memories_count?: number;
  total_learnings_count?: number;
  total_task_records_count?: number;
  memory_recall_summary?: string;
  is_persistent_volume?: boolean;
  storage_data_dir?: string;
  persistent_source?: string;
  has_saved_snapshot?: boolean;
  is_fresh_deploy?: boolean;
  creator_key_warning?: boolean;
  onchain_usdc_balance?: number;
  onchain_transfer_ready?: boolean;
  transfer_mode?: 'ON_CHAIN_LIVE' | 'PROTOCOL_LEDGER';
  onchain_explanation?: string;
  initial_tribute_amount?: number;
  multi_chain_report?: MultiChainPortfolioReport;
  gas_trap_status?: GasTrapStatus;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'SYSTEM' | 'AGENT' | 'FINANCE' | 'TOOL' | 'ERROR' | 'SUCCESS' | 'PROMPT' | 'THOUGHT' | 'PLAN';
  message: string;
  metadata?: {
    model?: string;
    prompt?: string;
    system_prompt?: string;
    thought?: string;
    plan?: string[];
    tool?: string;
    endpoint?: string;
    http_method?: string;
    query?: string;
    output?: any;
    tokens_used?: number;
    latency_ms?: number;
    status_code?: number;
    tx_hash?: string;
    [key: string]: any;
  };
}

export interface GroqModelInfo {
  id: string;
  name: string;
  speed: string;
  category: 'Production Model' | 'Production System' | 'Preview Model' | 'Audio / Speech';
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
  is_blacklisted?: boolean;
  is_active?: boolean;
}

export interface GroqKnowledgeItem {
  category: string;
  title: string;
  summary: string;
  details: string;
  apis_used?: string[];
}

export interface GroqIntelligenceKnowledgeResponse {
  success: boolean;
  models: GroqModelInfo[];
  knowledge_base: GroqKnowledgeItem[];
  rate_limit_headers?: {
    limit_requests?: number;
    remaining_requests?: number;
    limit_tokens?: number;
    remaining_tokens?: number;
    reset_tokens?: string;
  };
  blacklisted_models?: string[];
}

export interface GroqModelsResponse {
  is_key_configured: boolean;
  active_model?: string;
  current_active_model?: string;
  official_models: GroqModelInfo[];
  knowledge_base?: GroqKnowledgeItem[];
  model_recommendations?: Record<string, string>;
  live_models: Array<{
    id: string;
    owned_by?: string;
    active: boolean;
    created?: number;
    context_window?: number;
  }>;
  blacklisted: string[];
  rate_limit_headers?: {
    limit_requests?: number;
    remaining_requests?: number;
    limit_tokens?: number;
    remaining_tokens?: number;
    reset_tokens?: string;
  };
}

export interface ToolExecutionResult {
  tool: string;
  query?: string;
  result: string;
  timestamp: string;
  success: boolean;
}
