import React, { useState, useEffect } from 'react';
import { Building2, Wallet, Server, Wrench, ExternalLink, Copy, Check, RefreshCw, AlertTriangle, ArrowRightLeft, CheckCircle2, Shield } from 'lucide-react';
import { safeFetchJson, safePostJson } from '../lib/api';
import { ethers } from 'ethers';

interface BusinessProfileData {
  entity_name: string;
  wallet_address: string;
  creator_address: string;
  registered_nodes: string[];
  active_tools: string[];
  discovered_tools: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    status: string;
  }>;
}

const POLYGON_CHAIN_ID_HEX = '0x89'; // 137
const POLYGON_CHAIN_ID_DEC = 137;
const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

export const BusinessProfileSection: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newWalletInput, setNewWalletInput] = useState('');
  const [newCreatorInput, setNewCreatorInput] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // MetaMask Web3 States
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [mmAddress, setMmAddress] = useState<string | null>(null);
  const [mmChainId, setMmChainId] = useState<number | null>(null);
  const [mmUsdcBalance, setMmUsdcBalance] = useState<number | null>(null);
  const [mmPolBalance, setMmPolBalance] = useState<number | null>(null);
  const [isConnectingMM, setIsConnectingMM] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    const res = await safeFetchJson<BusinessProfileData>('/api/business-profile');
    if (res.ok && res.data) {
      setProfile(res.data);
      if (!newWalletInput) setNewWalletInput(res.data.wallet_address || '');
      if (!newCreatorInput) setNewCreatorInput(res.data.creator_address || '');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      setHasMetaMask(true);
      // Listen for accounts change
      if (ethereum.on) {
        ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setMmAddress(accounts[0]);
            refreshMmBalances(accounts[0]);
          } else {
            setMmAddress(null);
            setMmUsdcBalance(null);
            setMmPolBalance(null);
          }
        });
        ethereum.on('chainChanged', (chainIdHex: string) => {
          const cid = parseInt(chainIdHex, 16);
          setMmChainId(cid);
          if (mmAddress) refreshMmBalances(mmAddress);
        });
      }
    }
  }, []);

  const refreshMmBalances = async (account: string) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum || !account) return;
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      setMmChainId(Number(network.chainId));

      // Native POL balance
      const polBal = await provider.getBalance(account);
      setMmPolBalance(Number(ethers.formatEther(polBal)));

      // If on Polygon, query USDC
      if (Number(network.chainId) === POLYGON_CHAIN_ID_DEC) {
        let totalUsdc = 0;
        try {
          const c1 = new ethers.Contract(USDC_NATIVE, ERC20_ABI, provider);
          const b1 = await c1.balanceOf(account);
          totalUsdc += Number(ethers.formatUnits(b1, 6));
        } catch {}
        try {
          const c2 = new ethers.Contract(USDC_BRIDGED, ERC20_ABI, provider);
          const b2 = await c2.balanceOf(account);
          totalUsdc += Number(ethers.formatUnits(b2, 6));
        } catch {}
        setMmUsdcBalance(totalUsdc);
      }
    } catch (e) {
      console.error('Fehler beim Abrufen der MetaMask-Salden:', e);
    }
  };

  const handleConnectMetaMask = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setStatusMessage('MetaMask ist im Browser nicht installiert. Bitte MetaMask Erweiterung installieren.');
      return;
    }
    setIsConnectingMM(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setMmAddress(accounts[0]);
        await refreshMmBalances(accounts[0]);
        setStatusMessage(`MetaMask verbunden: ${accounts[0]}`);
      }
    } catch (err: any) {
      setStatusMessage(`MetaMask Verbindung abgebrochen: ${err.message || err}`);
    } finally {
      setIsConnectingMM(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleSwitchToPolygon = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
      });
      if (mmAddress) refreshMmBalances(mmAddress);
    } catch (switchError: any) {
      // 4902 error code means network is not added to metamask
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: POLYGON_CHAIN_ID_HEX,
                chainName: 'Polygon PoS Mainnet',
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com', 'https://polygon.llamarpc.com'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              },
            ],
          });
          if (mmAddress) refreshMmBalances(mmAddress);
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  const handleSetMmAsAgent = async () => {
    if (!mmAddress) return;
    setIsUpdatingAddress(true);
    const res = await safePostJson<{ success: boolean }>('/api/wallet/address', { address: mmAddress });
    setIsUpdatingAddress(false);
    if (res.ok) {
      setStatusMessage(`MetaMask-Adresse erfolgreich als Agent Zero Wallet hinterlegt.`);
      fetchProfile();
    } else {
      setStatusMessage(`Fehler beim Setzen der Agent-Wallet: ${res.error}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSetMmAsCreator = async () => {
    if (!mmAddress) return;
    setIsUpdatingAddress(true);
    const res = await safePostJson<{ success: boolean }>('/api/wallet/creator-address', { address: mmAddress });
    setIsUpdatingAddress(false);
    if (res.ok) {
      setStatusMessage(`MetaMask-Adresse erfolgreich als Creator Wallet (Tribut-Empfänger) hinterlegt.`);
      fetchProfile();
    } else {
      setStatusMessage(`Fehler beim Setzen der Creator-Wallet: ${res.error}`);
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUpdateAgentAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletInput.trim()) return;
    setIsUpdatingAddress(true);
    const res = await safePostJson<{ success: boolean }>('/api/wallet/address', { address: newWalletInput.trim() });
    setIsUpdatingAddress(false);
    if (res.ok) {
      setStatusMessage('Agent Zero Wallet-Adresse erfolgreich aktualisiert.');
      fetchProfile();
    } else {
      setStatusMessage('Fehler: ' + (res.error || 'Ungültige EVM Adresse.'));
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleUpdateCreatorAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreatorInput.trim()) return;
    setIsUpdatingAddress(true);
    const res = await safePostJson<{ success: boolean }>('/api/wallet/creator-address', { address: newCreatorInput.trim() });
    setIsUpdatingAddress(false);
    if (res.ok) {
      setStatusMessage('Creator Wallet-Adresse erfolgreich aktualisiert.');
      fetchProfile();
    } else {
      setStatusMessage('Fehler: ' + (res.error || 'Ungültige EVM Adresse.'));
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const agentWallet = profile?.wallet_address || '';
  const creatorWallet = profile?.creator_address || '';
  const nodes = profile?.registered_nodes || [];
  const activeTools = profile?.active_tools || [];
  const discoveredTools = profile?.discovered_tools || [];

  const isPolygon = mmChainId === POLYGON_CHAIN_ID_DEC;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Entitäts-Profil & MetaMask Web3 Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Identität, Polygon PoS Wallets, MetaMask Live-Synchronisation & RPC-Nodes
          </p>
        </div>
        <button
          onClick={fetchProfile}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer self-start sm:self-auto"
          title="Profil neu laden"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* METAMASK LIVE WEB3 CONNECTOR CARD */}
      <div className="bg-gradient-to-r from-orange-950/20 via-slate-900 to-purple-950/20 border border-orange-500/30 rounded-xl p-5 space-y-4 shadow-lg shadow-black/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-lg">
              🦊
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>MetaMask Web3 Verbindung</span>
                {mmAddress ? (
                  <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERBUNDEN
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    NICHT VERBUNDEN
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Liest dein echtes Polygon-Guthaben direkt aus dem MetaMask-Provider
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!mmAddress ? (
              <button
                onClick={handleConnectMetaMask}
                disabled={isConnectingMM}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold shadow-md shadow-orange-950 transition-all cursor-pointer"
              >
                <span>🦊</span>
                <span>{isConnectingMM ? 'Verbinde...' : 'MetaMask verbinden'}</span>
              </button>
            ) : (
              <button
                onClick={() => refreshMmBalances(mmAddress)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer"
                title="Salden aktualisieren"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>
            )}
          </div>
        </div>

        {mmAddress ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MM Address */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Verknüpfte MetaMask Wallet</div>
                <div className="text-xs text-orange-300 font-bold break-all">{mmAddress}</div>
              </div>

              {/* MM Network */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Aktives Netzwerk</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200">
                    {isPolygon ? 'Polygon Mainnet (137)' : `Chain ID: ${mmChainId || 'Unbekannt'}`}
                  </div>
                  {!isPolygon && (
                    <button
                      onClick={handleSwitchToPolygon}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] cursor-pointer"
                    >
                      Auf Polygon wechseln
                    </button>
                  )}
                </div>
              </div>

              {/* MM Balances */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1 font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">MetaMask Salden (Live)</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">
                    {mmUsdcBalance !== null ? `${mmUsdcBalance.toFixed(4)} USDC` : 'Lade...'}
                  </span>
                  <span className="text-purple-400 font-bold">
                    {mmPolBalance !== null ? `${mmPolBalance.toFixed(4)} POL` : 'Lade...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="text-slate-400 text-[11px]">Schnell-Aktionen:</span>
              <button
                onClick={handleSetMmAsAgent}
                disabled={isUpdatingAddress}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 font-medium transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Als Agent Zero Wallet setzen</span>
              </button>

              <button
                onClick={handleSetMmAsCreator}
                disabled={isUpdatingAddress}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 font-medium transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Als Creator Wallet (Tribut) setzen</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono">
            {hasMetaMask
              ? 'Klicke oben auf "MetaMask verbinden", um deine echte Polygon-Wallet direkt anzuschließen und deine USDC-Salden zu synchronisieren.'
              : 'Keine MetaMask-Erweiterung gefunden. Du kannst Wallets unten auch manuell als Text eintragen.'}
          </div>
        )}
      </div>

      {/* Grid: Wallets & Entity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Entitäts-Identität & Wallets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Polygon Blockchain Wallets</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Chain ID: 137 (Polygon)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Entitäts-Bezeichnung</div>
              <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                {profile?.entity_name || 'Agent Zero (Autonome Einheit)'}
              </div>
            </div>

            {/* Agent Wallet */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Agent Zero Wallet (USDC & Gas)</span>
                {agentWallet && (
                  <button
                    onClick={() => handleCopy(agentWallet, 'agent')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {copiedField === 'agent' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'agent' ? 'Kopiert' : 'Kopieren'}</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-emerald-400 break-all">
                {agentWallet ? agentWallet : 'Keine Wallet-Adresse hinterlegt'}
              </div>
              {agentWallet && (
                <div className="pt-1">
                  <a
                    href={`https://polygonscan.com/address/${agentWallet}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300"
                  >
                    <span>Auf Polygonscan einsehen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Creator Wallet */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Creator Wallet (Tribut-Empfänger)</span>
                {creatorWallet && (
                  <button
                    onClick={() => handleCopy(creatorWallet, 'creator')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {copiedField === 'creator' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'creator' ? 'Kopiert' : 'Kopieren'}</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-purple-300 break-all">
                {creatorWallet ? creatorWallet : 'Keine Creator-Adresse hinterlegt'}
              </div>
              {creatorWallet && (
                <div className="pt-1">
                  <a
                    href={`https://polygonscan.com/address/${creatorWallet}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 hover:text-purple-300"
                  >
                    <span>Auf Polygonscan einsehen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Manual Update Forms */}
            <div className="pt-2 border-t border-slate-800 space-y-3 font-mono">
              <form onSubmit={handleUpdateAgentAddress} className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block">
                  Agent Zero Wallet manuell verknüpfen:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWalletInput}
                    onChange={(e) => setNewWalletInput(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingAddress}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all cursor-pointer"
                  >
                    Speichern
                  </button>
                </div>
              </form>

              <form onSubmit={handleUpdateCreatorAddress} className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block">
                  Creator Wallet manuell verknüpfen:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCreatorInput}
                    onChange={(e) => setNewCreatorInput(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingAddress}
                    className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all cursor-pointer"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Card 2: Nodes & Tool Registry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          {/* Section A: Registered Blockchain Nodes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Registrierte Polygon Blockchain Nodes</span>
            </div>
            <div className="space-y-2">
              {nodes.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono">Polygon PoS RPC Pool aktiv</div>
              ) : (
                nodes.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-slate-200 font-semibold">{node}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      ONLINE
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B: Active & Discovered Tools */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Aktive & Erforschte Werkzeuge</span>
            </div>

            <div className="space-y-2">
              {activeTools.length === 0 && discoveredTools.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono">Keine Werkzeuge registriert.</div>
              ) : (
                <>
                  {activeTools.map((tool, idx) => (
                    <div
                      key={`act_${idx}`}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-200">{tool}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AKTIV
                      </span>
                    </div>
                  ))}
                  {discoveredTools.map((tool, idx) => (
                    <div
                      key={`disc_${idx}`}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="text-slate-200 font-semibold">{tool.name}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{tool.description}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {tool.status}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
