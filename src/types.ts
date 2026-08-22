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
  status: 'ACTIVE' | 'PAUSED' | 'SURVIVAL_CRITICAL' | 'SHUTDOWN';
  current_balance: number;
  wallet_address: string;
  network: string;
  current_tribute_due: number;
  time_remaining_seconds: number;
  last_cycle_time?: string;
  active_model?: string;
  available_models: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'SYSTEM' | 'AGENT' | 'FINANCE' | 'TOOL' | 'ERROR' | 'SUCCESS';
  message: string;
  metadata?: any;
}

export interface ToolExecutionResult {
  tool: string;
  query?: string;
  result: string;
  timestamp: string;
  success: boolean;
}
