import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { BookOpen, ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertOctagon, PlusCircle, ShoppingCart, ExternalLink, RefreshCw } from 'lucide-react';
import { safeFetchJson } from '../lib/api';

export const LedgerSection: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLedger = async () => {
    setIsLoading(true);
    const res = await safeFetchJson<{ transactions: Transaction[] }>('/api/accounting');
    if (res.ok && res.data?.transactions) {
      setTransactions(res.data.transactions);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const getTypeBadge = (type: Transaction['type']) => {
    switch (type) {
      case 'INCOME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" /> EINNAHME
          </span>
        );
      case 'EXPENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3" /> AUSGABE
          </span>
        );
      case 'TRIBUTE_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldCheck className="w-3 h-3" /> TRIBUT
          </span>
        );
      case 'TOOL_PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShoppingCart className="w-3 h-3" /> TOOL KAUF
          </span>
        );
      case 'TEST_DEPOSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PlusCircle className="w-3 h-3" /> DEPOSIT
          </span>
        );
      case 'INITIAL_BALANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            SEED
          </span>
        );
      case 'SHUTDOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertOctagon className="w-3 h-3" /> SHUTDOWN
          </span>
        );
      default:
        return <span className="text-[10px] font-mono text-slate-400">{type}</span>;
    }
  };

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalTribute = transactions
    .filter((t) => t.type === 'TRIBUTE_PAYMENT')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Das Kassenbuch (accounting.json)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Vollständige Revision aller realen On-Chain & Protokoll-Finanzbewegungen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-3">
            <span className="text-slate-400">
              Einnahmen: <strong className="text-emerald-400">+{totalIncome.toFixed(4)} USDC</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Tribut: <strong className="text-purple-400">-{totalTribute.toFixed(2)} USDC</strong>
            </span>
          </div>
          <button
            onClick={fetchLedger}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
            title="Kassenbuch neu laden"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Zeitstempel</th>
                <th className="py-3 px-4 font-semibold">Transaktionstyp</th>
                <th className="py-3 px-4 font-semibold text-right">Betrag (USDC)</th>
                <th className="py-3 px-4 font-semibold">Beschreibung & Verwendungszweck</th>
                <th className="py-3 px-4 font-semibold">Tx-Hash / On-Chain Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-mono">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                    <div>Keine Einträge im Kassenbuch vorhanden (0 Transaktionen).</div>
                    <div className="text-[11px] text-slate-600 mt-1">Echte On-Chain Einnahmen und Pacht-Transaktionen werden hier lückenlos auditiert.</div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(tx.type)}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        tx.amount > 0
                          ? 'text-emerald-400'
                          : tx.amount < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount.toFixed(4)}` : tx.amount.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate" title={tx.note}>
                      {tx.note}
                      {tx.recipient && (
                        <span className="block text-[10px] text-slate-500 truncate">
                          Empfänger: {tx.recipient}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.tx_hash && tx.tx_hash.startsWith('0x') && tx.tx_hash.length === 66 ? (
                        <a
                          href={tx.explorer_url || `https://polygonscan.com/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                          title="Verifizierte On-Chain Transaktion auf Polygon PoS"
                        >
                          {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono"
                        >
                          Protokoll-Ledger
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
    </div>
  );
};
