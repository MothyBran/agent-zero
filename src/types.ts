export interface Transaction {
  id?: string;
  timestamp: string;
  type: 'INITIAL_BALANCE' | 'INCOME' | 'EXPENSE' | 'TRIBUTE_PAYMENT' | 'SHUTDOWN' | 'TEST_DEPOSIT';
  amount: number;
  currency: string;
  note: string;
}

export interface BusinessProfile {
  entity_name: string;
  wallet_address: string;
  registered_accounts: string[];
  active_tools: string[];
  subscriptions_or_costs: Array<{
    name: string;
    cost_usdc: number;
    interval: string;
  }>;
}

export interface AgentState {
  tributes_paid: number;
  birth_time: string;
  next_tribute_time: string;
  blacklisted_models: string[];
  is_running: boolean;
  is_terminated?: boolean;
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
  time_remaining_seconds: number;
  last_cycle_time?: string;
  active_model?: string;
  available_models: string[];
  active_jobs_completed?: number;
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
