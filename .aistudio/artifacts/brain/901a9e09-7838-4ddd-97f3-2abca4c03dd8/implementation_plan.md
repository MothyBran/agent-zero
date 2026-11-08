# Grok Desk — Night Shift #2 / Five Packs Autonomous Crypto Trading Terminal

Dieser Master-Bauplan definiert die produktionsreife Full-Stack-Architektur für **Grok Desk (Night Shift #2)** — ein hochfrequentes, autonomes Krypto-Trading-Terminal im tiefschwarzen Terminal-Dark-Mode (`#09090B`), das fünf spezialisierte Bot-Engines (**GMGN Skills**, **Kaiser.Charon**, **GMGN Trading Bot**, **gmgnAgent**, **PumpGrok**) in einer Echtzeit-Execution-Pipeline mit striktem `-6%` Stop-Loss-Risk-Shield und Dual-Mode-Ledger (Paper-Trading vs. On-Chain Live-Execution) vereint.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Architektur- & Sicherheits-Entscheidungen für den Produktionsbetrieb**
> Bevor wir mit **Meilenstein 1** starten, sind folgende Kernentscheidungen im Bauplan verankert:

- **Dual-Mode Execution Isolation (`PAPER` vs. `LIVE`)**: Im `PAPER`-Modus arbeitet die Engine mit deterministischem Echtzeit-Orderbuch-Pricing und simuliertem Slippage-Abzug ohne Mock-Zufallszahlen. Im `LIVE`-Modus greift die Engine ausschließlich auf verifizierte Wallet-Salden und signierte On-Chain-Transaktionen (EVM/Solana DEX-Routing) über serverseitige Environment-Keys zu.
- **Hardcoded `-6% LIMIT` Risk-Circuit-Breaker**: Jede offene Position wird im Sekundentakt gegen den Entry-Preis sowie den dynamischen Trailing-Peak geprüft. Ein Drawdown von `-6.00%` löst sofort und ohne KI-Latenz einen deterministischen Market-Stop (`STOP`) aus.
- **Realtime Push via Server-Sent Events (SSE) & WebSocket-Taktung**: Statt trägem Polling überträgt ein dedizierter Realtime-Event-Stream alle Pack-Telemetriedaten, Pipeline-Schritte (`token.read` → `wallet.score` → `route.fill`), abgelehnte Scam-Launches und den Live Decision Stream mit `< 50 ms` UI-Latenz.
- **Zero-Key-Exposure Security**: Private Keys, RPC-Endpoints und KI-API-Schlüssel (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`) verbleiben strikt auf dem Backend-Worker und werden niemals an den Client serialisiert.

---

## 1. Overview & Core Concept (Phase 1: System-Architektur & Datenfluss)

### Was das System leistet
**Grok Desk** bündelt den gesamten Lebenszyklus des algorithmischen Memecoin- und DEX-Momentum-Tradings in einer einzigen Mobile-First-Kommandozentrale (mit nahtloser Mehrspalten-Skalierung auf 1440px Desktop-Monitoren):
1. **Scoped Workspace Boot-Sequence**: Beim Start initialisiert und verifiziert der Loader (`MORPH / NIGHT SHIFT #2`) sequenziell alle 5 Bot-Packs (`READY` / `WAIT`), prüft RPC-Latenzen, lädt das persistente Ledger und öffnet erst nach erfolgreichem Health-Check den Trading-Workspace.
2. **Kontinuierliche 5-Pack-Pipeline**: Ein asynchroner Backend-Worker-Loop scannt neue Token-Launches und liquide DEX-Paare, filtert Honeypots/Low-Liquidity-Scams via **Kaiser.Charon** heraus, bewertet Smart-Money-Wallets und Orderflow über **GMGN Skills**, berechnet die optimale Swap-Route und führt Trades über **GMGN Trading Bot**, **gmgnAgent** und **PumpGrok** aus.
3. **Echtzeit-Performance & Attribution**: Das Portfolio-Cockpit berechnet fortlaufend Gesamt-Equity, absoluten/relativen Gewinn (`+$1,793.20` / `15.35x`), aktive Risiko-Limits (`-6% LIMIT`), Trade-Zähler (`SLUG • ENTRIES • CLOSED`), die grüne Performance-Area-Kurve sowie die horizontale Gewinn-Verteilungsleiste nach Token (`$MABEL +2.5x`, `$PIXEL +4.1x`, `$BONGO +3.2x`).

### System-Architektur & Datenfluss-Diagramm

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL WEB3, MARKET & AI INFRASTRUCTURE                          │
│  ┌────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────────┐  │
│  │ DEX & On-Chain RPC │   │ Liquidity & Honeypot │   │ AI Decision Layer (Server-Only)│  │
│  │ (EVM / Solana /    │   │ Feeds (DEX Pools,    │   │ (Gemini 3.8 Flash / OpenRouter │  │
│  │  Jupiter / 1inch)  │   │  Orderbook L2 Depth) │   │  Structured JSON Sentiment)    │  │
│  └─────────┬──────────┘   └──────────┬───────────┘   └───────────────┬────────────────┘  │
└────────────┼─────────────────────────┼───────────────────────────────┼───────────────────┘
             │                         │                               │
             ▼                         ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND WORKER & EXECUTION ENGINE (NODE.JS)                      │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                      NIGHT SHIFT #2 ORCHESTRATOR LOOP (1s - 60s)                   │  │
│  │                                                                                    │  │
│  │  [1. PumpGrok] ──► [2. Kaiser.Charon] ──► [3. GMGN Skills] ──► [4. gmgnAgent]      │  │
│  │   Launch &          Scam/Liquidity         token.read           AI Confluence      │  │
│  │   Momentum          Gatekeeper             wallet.score         & Sizing           │  │
│  │   Detector          (Reject Engine)        route.fill           Decision           │  │
│  │                                                 │                    │             │  │
│  │                                                 ▼                    ▼             │  │
│  │                                      [5. GMGN Trading Bot + Risk Shield]           │  │
│  │                                       Sub-Second DEX Router & -6% Hard Stop        │  │
│  └─────────────────────────────────────────────────┬──────────────────────────────────┘  │
│                                                    │                                     │
│                                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │             PERSISTENT STATE & LEDGER STORE (PostgreSQL / Atomic JSON)             │  │
│  │   • Portfolio Ledger & Equity Curve    • Five Packs Telemetry & Boot State         │  │
│  │   • Token Attribution Multipliers      • Chronological Decision Stream (`BUY/STOP`)│  │
│  └─────────────────────────────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────────────────────────────┼─────────────────────────────────────┘
                                                     │
                        Realtime SSE / WebSocket Push│(& REST Command Actions)
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        GROK DESK FRONTEND (`#09090B` TERMINAL UI)                        │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. BootWorkspaceLoader ("Grok desk" • MORPH / NIGHT SHIFT #2 • 5 PACKS Checklist)  │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 2. PortfolioPerformanceHeader ($1,918.20 • 15.35x • -6% LIMIT • Area Chart • Bars) │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐ ┌────────────────────────────────────────┐  │
│  │ 3A. FivePacksCarousel                   │ │ 3B. TwoColumnAgentDetailGrid           │  │
│  │ (GMGN Bot ms • gmgnAgent • PumpGrok)    │ │ (GMGN Skills Pipeline │ Kaiser.Charon) │  │
│  └─────────────────────────────────────────┘ └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 4. LiveDecisionStream (Timestamp • BUY/STOP/SELL • $TICKER • Dot • +$180.00/-$7.90)│  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Experience, Visual Design & Datenbank-Schema (Phase 2: Datenbank- & State-Schema)

### Visuelle Identität & Terminal-Design-System ("Grok Desk")
- **Aesthetic Direction**: Kompromissloser, hochpräziser Low-Latency-Quant-Desk ("Night Shift #2"). Keine verspielten Marketing-Elemente, keine verschachtelten Karten-in-Karten, klare 1px-Rahmen (`#222228`) und sofort erfassbare numerische Hierarchie.
- **Farbpalette & Kontrast-Tokens**:
  - `--bg-canvas`: `#09090B` (Tiefschwarzer Terminal-Hintergrund, 60% Flächenanteil)
  - `--bg-card`: `#121215` (Strukturelle Modul-Oberflächen mit `1px solid #1F1F24`, 30% Flächenanteil)
  - `--accent-profit`: `#10B981` (Leuchtendes Neon-Smaragdgrün für positive PnL, Area-Chart-Kurve, `READY`-Status und `BUY`/`SELL`-Gewinne)
  - `--accent-danger`: `#EF4444` (Signalrot für `-6% LIMIT` Risk-Badge, `STOP`-Trigger, abgelehnte Scam-Tokens und negative PnL)
  - `--accent-warn`: `#F59E0B` (Amber für `WAIT`-Boot-Status und laufende Filter-Prüfungen)
  - `--text-primary`: `#F4F4F5` (Reinweiß/Zink für Hauptmetriken)
  - `--text-muted`: `#71717A` (Gedämpftes Grau für Labels, Zeitstempel und Sekundär-Telemetrie)
- **Typografie & Tabular-Disziplin**:
  - **Display & UI-Struktur**: `Space Grotesk` / `Outfit` für markante Header (`Grok desk`, Portfolio-Total) und klare Sektions-Titel.
  - **Zahlen, Logs, Ticker & Latenzen**: Strikt `JetBrains Mono` mit `font-variant-numeric: tabular-nums`, damit sich bei schnellen Echtzeit-Updates im Millisekunden-Takt keine Spaltenbreiten verschieben.
- **Responsive Viewport-Geometrie**:
  - **Mobile-First (375px–430px)**: Einspaltiger vertikaler Kommandostapel mit horizontal scrollbarem Engine-Karussell, 2-spaltigem Agenten-Detail-Grid und fixiertem Echtzeit-Decision-Stream im unteren Sichtfeld (unter Einhaltung des 15% Sticky-Caps).
  - **Desktop-Expansion (1440px)**: Breitband-Workspace-Grid (`max-w-[1440px]`), das Portfolio-Performance-Header + Area-Chart links und das Five-Packs-Control-Grid + Live Decision Stream rechts synchron auf einem Screen ohne Viewport-Collapse darstellt.

### Vollständiges TypeScript State- & Datenbank-Schema

Alle Entitäten werden sowohl im Arbeitsspeicher des Backend-Workers gehalten als auch atomar in PostgreSQL (`kv_store` + relationale Ledger-Tabellen) bzw. im persistenten JSON-Fallback gespeichert:

```typescript
export type ExecutionMode = 'PAPER' | 'LIVE';
export type PackId = 'gmgn_skills' | 'kaiser_charon' | 'gmgn_trading_bot' | 'gmgn_agent' | 'pump_grok';
export type PackBootStatus = 'READY' | 'WAIT' | 'ERROR';
export type DecisionAction = 'BUY' | 'SELL' | 'STOP';

// 1. BOOT & WORKSPACE LOADER STATE ("BOOT / 5 PACKS")
export interface BotPackBootItem {
  id: PackId;
  name: string;                  // z.B. "GMGN Skills", "Kaiser.Charon", "GMGN Trading Bot", "gmgnAgent", "PumpGrok"
  status: PackBootStatus;        // "READY" | "WAIT"
  progressPct: number;           // 0 - 100
  latencyMs: number;             // z.B. 18ms
  subStatusText: string;         // z.B. "fomo adapter synced", "honeypot rules loaded"
}

export interface WorkspaceBootState {
  deskTitle: string;             // "Grok desk"
  shiftLabel: string;            // "MORPH / NIGHT SHIFT #2"
  bootHeaderLabel: string;       // "BOOT / 5 PACKS"
  overallProgressPct: number;    // 0 - 100
  isWorkspaceReady: boolean;     // Steuert Übergang oder manuellen Switch Loader <-> Live Desk
  footerStatusText: string;      // "Opening scoped workspace"
  packs: BotPackBootItem[];
}

// 2. PORTFOLIO- & PERFORMANCE-HEADER SCHEMA
export interface TokenAttributionBarItem {
  symbol: string;                // z.B. "$MABEL", "$PIXEL", "$BONGO", "$SOL", "$PEPE"
  name: string;
  multiplier: number;            // z.B. 2.5 (+2.5x), 4.1 (+4.1x)
  realizedPlusUnrealizedUsd: number;
  shareOfProfitPct: number;      // Prozentuale Breite in der horizontalen Verteilungsleiste (Summe = 100%)
  colorHex: string;              //Abgestufte Smaragd-/Mint-Töne (#10B981, #34D399, #059669, #6EE7B7)
}

export interface EquityCurvePoint {
  timestamp: string;             // ISO-8601
  timeLabel: string;             // "04:10", "04:15"
  equityUsd: number;             // z.B. 1918.20
  pnlPct: number;
}

export interface PortfolioPerformanceHeaderState {
  mode: ExecutionMode;
  totalEquityUsd: number;        // z.B. 1918.20 -> "$1,918.20"
  initialCapitalUsd: number;     // z.B. 125.00
  absoluteGainUsd: number;       // z.B. +1793.20 -> "+$1,793.20"
  portfolioMultiplier: number;   // z.B. 15.35 -> "15.35x"
  hardStopLossLimitPct: number;  // -6 -> "-6% LIMIT"
  slugCount: number;             // z.B. 16 ("16 SLUG") - aktive/beobachtete Token-Slugs
  entriesCount: number;          // z.B. 60 ("60 ENTRIES") - ausgeführte Entry-Orders
  closedCount: number;           // z.B. 44 ("44 CLOSED") - abgeschlossene Trades
  equityCurve: EquityCurvePoint[];
  tokenAttributionBars: TokenAttributionBarItem[];
}

// 3. NIGHT SHIFT / FIVE PACKS CONTROL-GRID SCHEMA
export interface PipelineStepMetric {
  stepKey: 'token.read' | 'wallet.score' | 'route.fill';
  status: 'IDLE' | 'ACTIVE' | 'DONE' | 'REJECTED';
  activeTicker: string;          // z.B. "$MABEL"
  valueLabel: string;            // z.B. "142ms • Liq $84k", "Score 88/100", "QuickSwap V3 0.04%"
  updatedAtMs: number;
}

export interface FivePacksControlState {
  // Horizontales Statistik-Karussell
  carouselEngines: {
    gmgnTradingBot: {
      name: 'GMGN Trading Bot';
      latencyMs: number;         // z.B. 24 ms
      successRatePct: number;
      txCount: number;
      status: 'ONLINE' | 'STANDBY';
    };
    gmgnAgent: {
      name: 'gmgnAgent';
      actionsCount: number;      // z.B. 142 Actions
      activeModel: string;       // "gemini-3.8-flash"
      confidenceAvg: number;
    };
    pumpGrok: {
      name: 'PumpGrok';
      entryCount: number;        // z.B. 60 Entries
      miniSparkline: number[];   // 16 Datenpunkte für Mini-Sparkline
      momentumDeltaPct: number;
    };
  };
  // 2-spaltiges Detail-Grid
  moduleA_gmgnSkills: {
    title: 'GMGN Skills';
    subtitle: 'fomo adapter';
    activeSymbol: string;
    steps: [PipelineStepMetric, PipelineStepMetric, PipelineStepMetric]; // token.read, wallet.score, route.fill
  };
  moduleB_kaiserCharon: {
    title: 'Kaiser.Charon';
    subtitle: 'gatekeeper';
    launchesScanned: number;     // z.B. 1880 ("1,880 launches")
    launchesRejected: number;    // z.B. 1838 ("1,838 rejected")
    rejectionRatePct: number;    // z.B. 97.76%
    currentSkipTicker: string;   // z.B. "SKIP $RUGAI (LP unlocked)"
    recentRejectReasons: { ticker: string; reason: string; timestamp: string }[];
  };
}

// 4. LIVE DECISION STREAM (EXECUTION LOG) SCHEMA
export interface DecisionStreamEntry {
  id: string;
  timestamp: string;             // ISO-8601
  timeFormatted: string;         // "05:06:12"
  action: DecisionAction;        // "BUY" | "STOP" | "SELL"
  ticker: string;                // "$MABEL", "$PIXEL", "$BONGO"
  statusIndicator: 'GREEN' | 'RED'; // Grüner Punkt für BUY & profitable SELL, Roter Punkt für STOP / Verlust
  amountUsd: number;             // Exakter Dollar-Betrag (z.B. +180.00 oder -7.90)
  amountFormatted: string;       // "+$180.00" | "-$7.90"
  executionPrice: number;
  packOrigin: PackId;
  rationaleShort: string;        // z.B. "route.fill 1.8x momentum" | "-6.0% Hard Stop Triggered"
  txHash?: string;
}
```

---

## 3. Die "Five Packs" Bot-Logik & Entscheidungen (Phase 3: Die "Five Packs" Bot-Logik)

Jedes der 5 Sub-Module ("Packs") erfüllt im Backend-Worker eine klar abgegrenzte algorithmische Aufgabe mit deterministischen Ein- und Ausgabewerten:

### Pack 1: `PumpGrok` (High-Velocity Launch & Momentum Scanner)
- **Aufgabe**: Überwacht im Sekundentakt neue DEX-Token-Launches, Volumen-Ausbrüche und Orderbuch-Beschleunigungen.
- **Berechnung im Backend**:
  - Berechnet die **Velocity-Rate** $V_t = \frac{\text{Volumen}_{5\text{m}}}{\text{Durchschnittsvolumen}_{60\text{m}}}$ sowie den kurzfristigen Preis-Impuls $\Delta P_{5\text{m}}$.
  - Aktualisiert den `entryCount` und pflegt das rollierende 16-Punkte-Array `miniSparkline` der Einstiegs-Dynamik.
  - Sobald ein Token $V_t \ge 1.8$ und positives Orderbuch-Imbalance aufweist, übergibt `PumpGrok` den Kandidaten an **Kaiser.Charon**.

### Pack 2: `Kaiser.Charon` (Token-Scanner & Anti-Scam Gatekeeper)
- **Aufgabe**: Kompromisslose Filter-Engine, die über 95% aller gescannten Launches ablehnt (`1,880 launches / 1,838 rejected`), bevor Kapital riskiert wird.
- **Harte Ausschluss-Kriterien (8-stufige Gatekeeper-Prüfung)**:
  1. **Liquidity Floor**: Pool-Liquidität $< \$25,000\text{ USD}$ $\rightarrow$ `REJECT (Low LP)`.
  2. **Honeypot & Transfer-Tax Check**: Simulierte Buy/Sell-Calldata-Prüfung; falls Buy- oder Sell-Tax $> 3.0\%$ oder `transfer()` blockiert $\rightarrow$ `REJECT (Honeypot/Tax)`.
  3. **Mint & Freeze Authority**: Offene Mint-Funktion oder ungelockte LP-Tokens $\rightarrow$ `REJECT (Mintable/Unlocked)`.
  4. **Top-10 Holder Concentration**: Top-10 Wallets halten $> 38\%$ des Circulating Supply $\rightarrow$ `REJECT (Whale Cluster)`.
  5. **Spread & Depth Guard**: Bid/Ask-Spread $> 45\text{ bps}$ oder Slippage für Ordergröße $> 1.2\%$ $\rightarrow$ `REJECT (Slippage Trap)`.
- **Telemetrie-Output**: Inkrementiert `launchesScanned` und `launchesRejected` in Echtzeit und setzt `currentSkipTicker` (z.B. `SKIP $FAKEPEPE • LP < $25k`).

### Pack 3: `GMGN Skills` (`fomo adapter` — 3-Stage Trade Pipeline)
- **Aufgabe**: Führt für jeden von **Kaiser.Charon** durchgelassenen Token die dreistufige On-Chain-Tiefenprüfung durch und streamt jeden Schritt live an das Modul A im UI:
  1. **`token.read`**: Extrahiert Echtzeit-Candle-Struktur (RSI-14, EMA-9/21 Cross, ATR-14 Volatilität, 24h High/Low und Pool-Tiefe).
  2. **`wallet.score`**: Berechnet einen gewichteten Smart-Money-Score $S_{\text{wallet}} \in [0, 100]$ aus Unique-Buyer-Wachstum ($35\%$), Buy/Sell-Volumen-Ratio ($35\%$) und Smart-Wallet-Nettozuflüssen ($30\%$). Schwellenwert für Freigabe: $S_{\text{wallet}} \ge 70$.
  3. **`route.fill`**: Prüft über DEX-Quoter (QuickSwap V3 / Uniswap V3 / Jupiter Quote API) den exakten Ausführungspreis inklusive Gas- und LP-Fees und reserviert die Route mit minimalem Price-Impact.

### Pack 4: `gmgnAgent` (KI-Entscheidungs-Layer & Confluence Sizing)
- **Aufgabe**: Kombiniert die quantitativen Metriken aus `GMGN Skills` mit KI-gestützter Sentiment- und Regime-Prüfung (`gemini-3.8-flash` auf dem Server via `@google/genai` mit strukturiertem JSON-Schema und Fallback auf deterministische Quant-Heuristik bei Rate-Limits).
- **Berechnung im Backend**:
  - Bewertet das Chance-Risiko-Verhältnis ($CRV \ge 2.2$) nach Abzug aller Gebühren.
  - Bestimmt die exakte Positionsgröße $A_{\text{USD}}$ basierend auf Konfidenz-Score und verfügbarem Cash-Bestand (max. $8\%–12\%$ des Portfolios pro Slug).
  - Zählt jede autonome Auswertung und Order-Entscheidung im Metrik-Zähler `actionsCount`.

### Pack 5: `GMGN Trading Bot` (Low-Latency Execution & `-6% LIMIT` Risk-Shield)
- **Aufgabe**: Setzt freigegebene Orders in Millisekunden um (gemessen in `latencyMs`) und überwacht alle offenen Positionen (`SLUG`) im 1-Sekunden-Risiko-Loop.
- **Harte Risk-Management-Gleichungen**:
  - **Hard Stop-Loss (`-6% LIMIT`)**: Für jede offene Position mit Einstiegspreis $P_{\text{entry}}$ und aktuellem Kurs $P_{\text{now}}$ gilt:
    $$\text{PnL}_{\%} = \frac{P_{\text{now}} - P_{\text{entry}}}{P_{\text{entry}}} \times 100$$
    Sobald $\text{PnL}_{\%} \le -6.00\%$, feuert der Bot sofort eine `STOP`-Order, schließt die Position, begrenzt den Verlust exakt (z.B. `-$7.90`) und schreibt einen roten Eintrag in den **Live Decision Stream**.
  - **Dynamischer Trailing Profit-Lock**: Erreicht eine Position $+12\%$ Gewinn, zieht der Bot den Stop-Loss automatisch auf Break-Even $+2\%$ nach und sichert bei Ausbruch-Multiplikatoren (`+2.5x`, `+4.1x`) Teil- und Gesamtgewinne (`SELL` mit grünem Punkt, z.B. `+$180.00`).

---

## 4. UI/UX Komponenten-Baum & Realtime-Hooks (Phase 4: UI/UX Komponenten-Baum)

### Komponenten-Hierarchie & Datenbindung

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GrokDeskApp (Root Container)                           │
│   • Verwaltet Realtime-State via `useGrokDeskStream()` (SSE + REST Actions)         │
│   • Steuert Ansicht: Boot-Loader Overlay/View vs. Scoped Trading Workspace          │
└───────────────────┬─────────────────────────────────────────────┬───────────────────┘
                    │                                             │
        (Boot-View / Toggle)                             (Scoped Workspace)
                    ▼                                             ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│ 1. GrokBootLoaderView                 │   │ 2. PortfolioPerformanceHeader           │
│  ├─ ShiftStatusBadge                  │   │  ├─ EquityHeadline ($1,918.20 / 15.35x) │
│  │   ("MORPH / NIGHT SHIFT #2")       │   │  ├─ RiskLimitBadge ("-6% LIMIT")        │
│  ├─ FivePacksBootChecklist            │   │  ├─ TradeStatsRow                       │
│  │   ("BOOT / 5 PACKS" -> 5 Rows:     │   │  │   ("16 SLUG • 60 ENTRIES • 44 CLOSED")│
│  │    READY/WAIT + Progress % Bar)    │   │  ├─ NeonGreenAreaChart (SVG/Canvas)     │
│  └─ ScopedWorkspaceFooter             │   │  └─ TokenProfitDistributionBar          │
│      ("Opening scoped workspace")     │   │      ($MABEL +2.5x │ $PIXEL +4.1x ...)  │
└───────────────────────────────────────┘   └─────────────────────┬───────────────────┘
                                                                  │
                                            ┌─────────────────────┴───────────────────┐
                                            ▼                                         ▼
                          ┌───────────────────────────────────┐     ┌─────────────────────────────────┐
                          │ 3. NightShiftFivePacksGrid        │     │ 4. LiveDecisionStream           │
                          │  ├─ EngineStatsCarousel           │     │  ├─ StreamFilterHeader          │
                          │  │   • GMGN Trading Bot (ms)      │     │  │   (ALL / BUY / SELL / STOP)  │
                          │  │   • gmgnAgent (Actions)        │     │  └─ ChronologicalExecutionList  │
                          │  │   • PumpGrok (Entries + Spark) │     │      • Timestamp (Monospace)    │
                          │  └─ AgentProcessTwoColGrid        │     │      • Action (BUY/STOP/SELL)   │
                          │      ├─ ModuleA: GMGN Skills      │     │      • Ticker ($MABEL, $BONGO)  │
                          │      │   (token.read/wallet.score │     │      • Status Dot (Green/Red)   │
                          │      │    /route.fill)            │     │      • Exact USD (+$180 / -$7.9)│
                          │      └─ ModuleB: Kaiser.Charon    │     └─────────────────────────────────┘
                          │          (1,880 / 1,838 rejected  │
                          │           + Live Skip Ticker)     │
                          └───────────────────────────────────┘
```

### Realtime-Hooks & Interaktive State-Mutationen
1. **`useGrokDeskStream()` (Realtime SSE + Fallback Sync)**:
   - Verbindet sich mit `/api/grok-desk/stream` (Server-Sent Events) für verzögerungsfreie Push-Updates bei jedem Pipeline-Schritt (`pack:update`, `pipeline:step`, `charon:reject`, `decision:new`, `portfolio:tick`).
   - Beinhaltet automatische Reconnect-Logik und idempotente Event-Verarbeitung anhand eindeutiger Event-IDs.
2. **Interaktive Steuerungen (Keine toten Klicks)**:
   - **Boot-Loader Re-Trigger / Inspect**: Nutzer können jederzeit über den Header-Status (`MORPH / NIGHT SHIFT #2`) die 5-Packs-Boot-Sequenz live einsehen oder einen System-Health-Check anstoßen.
   - **Mode-Switch (`PAPER` ⇄ `LIVE`) & Auto-Pilot Toggle**: Umschalten zwischen risikofreiem Paper-Trading und echtem On-Chain-Wallet-Modus sowie Pausieren/Fortsetzen des Night-Shift-Loops.
   - **Token-Attribution-Filter & Chart-Timeframe**: Klick auf ein Token-Segment in der horizontalen Gewinn-Verteilungsleiste (z.B. `$MABEL +2.5x`, `$PIXEL +4.1x`) hebt dessen historische Trades im Decision Stream hervor.
   - **Manueller Quick-Trade & Sofort-Stop (`STOP`)**: Direktes Auslösen eines Scan-Zyklus, manuelles Schließen einzelner offener Slugs oder Notfall-Glattstellung aller Positionen.

---

## 5. Schritt-für-Schritt Implementierungs-Roadmap (Phase 5: Die 5 Coding-Meilensteine)

Um die Anwendung modular, typsicher und ohne Regressionsrisiko umzusetzen, ist die Implementierung in exakt **5 abrufbare Coding-Meilensteine** gegliedert:

### Meilenstein 1: Core Types, Persistentes Ledger-Schema & "Five Packs" Backend-Engine
- Erweiterung der zentralen TypeScript-Definitionen um alle Datenstrukturen für `WorkspaceBootState`, `PortfolioPerformanceHeaderState`, `FivePacksControlState` und `DecisionStreamEntry`.
- Implementierung der Backend-Berechnungslogik für alle 5 Packs (**PumpGrok**, **Kaiser.Charon** mit echten Reject-Zählern, **GMGN Skills** mit `token.read` / `wallet.score` / `route.fill`, **gmgnAgent** und **GMGN Trading Bot** mit `-6% LIMIT` Stop-Loss-Wächter).
- Einrichtung der SSE-Echtzeit-Schnittstelle (`/api/grok-desk/stream`) und der REST-Steuerungsrouten.

### Meilenstein 2: Boot- / Workspace-Loader ("Grok desk" & "BOOT / 5 PACKS")
- Bau des minimalistischen Terminal-Startscreens im `#09090B` Dark-Mode mit Bot-Logo und Schicht-Badge (`MORPH / NIGHT SHIFT #2`).
- Implementierung der Echtzeit-Checkliste für alle 5 Sub-Module (`GMGN Skills`, `Kaiser.Charon`, `GMGN Trading Bot`, `gmgnAgent`, `PumpGrok`) inklusive `READY`/`WAIT`-Indikatoren, animiertem Prozent-Fortschrittsbalken, Latenz-Telemetrie und `"Opening scoped workspace"`-Übergang.

### Meilenstein 3: Portfolio- & Performance-Header mit Neon-Area-Chart & Token-Attribution
- Implementierung der großen Echtzeit-Portfolio-Anzeige (`$1,918.20`), Gewinn-Multiplikator (`+$1,793.20` / `15.35x`), rotem Risiko-Badge (`-6% LIMIT`) und der kompakten Statistik-Zeile (`16 SLUG • 60 ENTRIES • 44 CLOSED`).
- Entwicklung des interaktiven, leuchtend grünen (`#10B981`) Performance-Area-Charts inklusive Tooltip-Inspektion und der darunterliegenden horizontalen Gewinn-Verteilungsleiste nach Token (`$MABEL +2.5x`, `$PIXEL +4.1x`, `$BONGO +3.2x` etc.).

### Meilenstein 4: Night Shift / Five Packs Control-Grid (Karussell & 2-Spalten-Agenten-Matrix)
- Umsetzung des horizontalen Statistik-Karussells für die aktiven Trading-Engines (`GMGN Trading Bot` mit ms-Latenz, `gmgnAgent` mit Action-Counter, `PumpGrok` mit Entry-Count und Live-Mini-Sparkline).
- Bau des 2-spaltigen Detail-Grids mit **Modul A (`GMGN Skills / fomo adapter`)** für die Live-Visualisierung von `token.read`, `wallet.score`, `route.fill` und **Modul B (`Kaiser.Charon`)** für das Launch/Reject-Verhältnis (`1,880 launches / 1,838 rejected`) samt rollierendem Skip-Ticker.

### Meilenstein 5: Live Decision Stream, On-Chain/Paper Execution Controls & End-to-End Verifikation
- Implementierung des chronologischen Echtzeit-Execution-Feeds am unteren Bildschirmrand mit Monospace-Zeitstempel, Aktion (`BUY`, `STOP`, `SELL`), Token-Ticker, grünem/rotem Status-Indikator, exaktem Dollar-Betrag (`+$180.00`, `-$7.90`) und Filter-Tabs.
- Integration der Paper/Live-Wallet-Umschaltung, manueller Trade-/Stop-Trigger sowie vollständiger Build-, TypeScript-Lint- und Live-Browser-Verifikation.
