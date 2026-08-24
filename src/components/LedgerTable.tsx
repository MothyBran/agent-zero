import React from 'react';
import { Transaction } from '../types';
import { BookOpen, ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertOctagon, PlusCircle, ShoppingCart, ExternalLink } from 'lucide-react';

interface LedgerTableProps {
  transactions: Transaction[];
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions }) => {
  const getTypeBadge = (type: Transaction['type']) => {
    switch (type) {
      case 'INCOME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" /> INCOME
          </span>
        );
      case 'EXPENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3" /> EXPENSE
          </span>
        );
      case 'TRIBUTE_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldCheck className="w-3 h-3" /> TRIBUTE
          </span>
        );
      case 'TOOL_PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShoppingCart className="w-3 h-3" /> TOOL KAUF
          </span>
        );
      case 'TEST_DEPOSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PlusCircle className="w-3 h-3" /> DEPOSIT
          </span>
        );
      case 'INITIAL_BALANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            SEED
          </span>
        );
      case 'SHUTDOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertOctagon className="w-3 h-3" /> SHUTDOWN
          </span>
        );
      default:
        return <span className="text-xs font-mono text-slate-400">{type}</span>;
    }
  };

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalTribute = transactions
    .filter((t) => t.type === 'TRIBUTE_PAYMENT')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <div id="ledger-table-card" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Economic Accounting Ledger (accounting.json)
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">
            Total Inflow: <strong className="text-emerald-400">+{totalIncome.toFixed(4)} USDC</strong>
          </span>
          <span className="text-slate-400">
            Tribute Paid: <strong className="text-purple-400">-{totalTribute.toFixed(2)} USDC</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2.5 px-4 font-medium">Timestamp</th>
              <th className="py-2.5 px-4 font-medium">Type</th>
              <th className="py-2.5 px-4 font-medium text-right">Amount (USDC)</th>
              <th className="py-2.5 px-4 font-medium">Description / Business Note</th>
              <th className="py-2.5 px-4 font-medium">Tx Hash / On-Chain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                  No transactions recorded yet in ledger.
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">{getTypeBadge(tx.type)}</td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold whitespace-nowrap ${
                      tx.amount > 0
                        ? 'text-emerald-400'
                        : tx.amount < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount.toFixed(4)}` : tx.amount.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 max-w-md truncate" title={tx.note}>
                    {tx.note}
                    {tx.recipient && (
                      <span className="block text-[10px] text-slate-500 truncate">
                        Empfänger: {tx.recipient}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {tx.tx_hash && tx.tx_hash.startsWith('0x') && tx.tx_hash.length === 66 ? (
                      <a
                        href={tx.explorer_url || `https://polygonscan.com/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                        title="Verifizierte On-Chain Transaktion auf Polygon PoS"
                      >
                        {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700 font-mono"
                        title="Autonomes Kassenbuch (Off-Chain). Keine Gas-Gebühren verbraucht."
                      >
                        Kassenbuch (Intern)
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
