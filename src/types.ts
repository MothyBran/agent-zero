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

export interface MultiChainPortfolioReport {
  wallet_address: string;
  creator_address: string;
  chains: Record<string, ChainAssetInfo>;
  total_portfolio_usd: number;
  total_usdc_across_chains: number;
  gas_trap_status: GasTrapStatus;
  ledger_balance: number;
  transfer_mode: string;
  initial_tribute_cost: number;
}

export interface AgentState {
  tributes_paid: number;
  birth_time: string;
  next_tribute_time: string;
  blacklisted_models: string[];
  is_running: boolean;
  is_terminated?: boolean;
  shutdown_reason?: string;
  status: 'ACTIVE' | 'PAUSED' | 'SURVIVAL_CRITICAL' | 'SHUTDOWN';
  current_balance: number;
  wallet_address: string;
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
  level: 'SYSTEM' | 'AGENT' | 'FINANCE' | 'TOOL' | 'ERROR' | 'SUCCESS';
  message: string;
  metadata?: any;
}

export interface GroqModelInfo {
  id: string;
  name: string;
  speed: string;
  category: string;
  context: string;
  is_blacklisted?: boolean;
  is_active?: boolean;
}

export interface GroqModelsResponse {
  is_key_configured: boolean;
  current_active_model?: string;
  official_models: GroqModelInfo[];
  live_models: Array<{
    id: string;
    owned_by: string;
    active: boolean;
    context_window?: number;
  }>;
  blacklisted: string[];
}

export interface ToolExecutionResult {
  tool: string;
  query?: string;
  result: string;
  timestamp: string;
  success: boolean;
}
