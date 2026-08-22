export interface Transaction {
  id?: string;
  timestamp: string;
  type: 'INITIAL_BALANCE' | 'INCOME' | 'EXPENSE' | 'TRIBUTE_PAYMENT' | 'SHUTDOWN' | 'TEST_DEPOSIT';
  amount: number;
  currency: string;
  note: string;
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

export interface KnowledgeItem {
  id: string;
  timestamp: string;
  category: 'TOOL_ROI' | 'SURVIVAL_STRATEGY' | 'TOKEN_EFFICIENCY' | 'MARKET_CONDITION' | 'ERROR_RECOVERY';
  title: string;
  insight: string;
  confidence_score: number;
  source: string;
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
  total_volume_bytes: number;
  total_volume_formatted: string;
  files: RailwayStorageFile[];
  total_learnings_count: number;
  last_compacted_at?: string;
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
