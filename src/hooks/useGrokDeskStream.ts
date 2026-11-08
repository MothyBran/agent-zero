import { useState, useEffect, useCallback, useRef } from 'react';
import { GrokDeskSystemState, ExecutionMode } from '../types/grokDesk';
import { safeFetchJson, safePostJson } from '../lib/api';

export function useGrokDeskStream() {
  const [state, setState] = useState<GrokDeskSystemState | null>(null);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; tone: 'profit' | 'danger' | 'neutral' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, tone: 'profit' | 'danger' | 'neutral' = 'neutral') => {
    setToastMessage({ text, tone });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    const res = await safeFetchJson<GrokDeskSystemState>('/api/grok-desk/state');
    if (res.ok && res.data) {
      setState(res.data);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();

    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connectSse = () => {
      try {
        es = new EventSource('/api/grok-desk/stream');
        es.onopen = () => {
          setStreamConnected(true);
        };
        es.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && parsed.state) {
              setState(parsed.state);
              setStreamConnected(true);
            }
          } catch {}
        };
        es.onerror = () => {
          setStreamConnected(false);
          if (es) {
            es.close();
            es = null;
          }
          reconnectTimer = window.setTimeout(connectSse, 3000);
        };
      } catch {
        setStreamConnected(false);
      }
    };

    connectSse();
    const fallbackPoll = window.setInterval(fetchSnapshot, 4000);

    return () => {
      if (es) es.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(fallbackPoll);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [fetchSnapshot]);

  const triggerBootSequence = useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await safePostJson<{ success: boolean; state: GrokDeskSystemState }>('/api/grok-desk/boot');
      if (res.ok && res.data?.state) {
        setState(res.data.state);
        showToast('BOOT / 5 PACKS Diagnostic Sequence gestartet', 'neutral');
      }
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  const switchExecutionMode = useCallback(async (mode: ExecutionMode) => {
    setIsBusy(true);
    try {
      const res = await safePostJson<{ success: boolean; state: GrokDeskSystemState }>('/api/grok-desk/mode', { mode });
      if (res.ok && res.data?.state) {
        setState(res.data.state);
        showToast(
          mode === 'LIVE' ? 'LIVE On-Chain Wallet Modus aktiviert' : 'PAPER Simulation Modus aktiviert',
          mode === 'LIVE' ? 'profit' : 'neutral'
        );
      }
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  const toggleAutoPilot = useCallback(async () => {
    if (!state) return;
    const nextEnabled = !state.autoPilotEnabled;
    const res = await safePostJson<{ success: boolean; state: GrokDeskSystemState }>('/api/grok-desk/autopilot', {
      enabled: nextEnabled
    });
    if (res.ok && res.data?.state) {
      setState(res.data.state);
      showToast(
        nextEnabled ? 'Night Shift #2 Auto-Execution AKTIV' : 'Night Shift #2 Auto-Execution PAUSIERT',
        nextEnabled ? 'profit' : 'danger'
      );
    }
  }, [state, showToast]);

  const triggerManualTick = useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await safePostJson<{ success: boolean; state: GrokDeskSystemState }>('/api/grok-desk/tick');
      if (res.ok && res.data?.state) {
        setState(res.data.state);
        showToast('Five Packs Scan- & Route-Tick ausgeführt', 'profit');
      }
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  const executeTradeAction = useCallback(async (ticker: string, action: 'BUY' | 'SELL' | 'STOP', amountUsd = 150) => {
    setIsBusy(true);
    try {
      const res = await safePostJson<{ success: boolean; message: string; state: GrokDeskSystemState }>(
        '/api/grok-desk/trade',
        { ticker, action, amountUsd }
      );
      if (res.ok && res.data) {
        if (res.data.state) setState(res.data.state);
        showToast(
          res.data.message,
          res.data.success ? (action === 'STOP' ? 'danger' : 'profit') : 'danger'
        );
        return res.data;
      }
      showToast(res.error || 'Trade-Aktion fehlgeschlagen', 'danger');
      return { success: false, message: res.error || 'Fehler' };
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  const resetPaperLedger = useCallback(async () => {
    setIsBusy(true);
    try {
      const res = await safePostJson<{ success: boolean; state: GrokDeskSystemState }>('/api/grok-desk/reset-paper');
      if (res.ok && res.data?.state) {
        setState(res.data.state);
        showToast('Paper-Trading Ledger auf Night Shift #2 Baseline ($1,918.20) zurückgesetzt', 'neutral');
      }
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  return {
    state,
    streamConnected,
    isBusy,
    toastMessage,
    triggerBootSequence,
    switchExecutionMode,
    toggleAutoPilot,
    triggerManualTick,
    executeTradeAction,
    resetPaperLedger
  };
}
