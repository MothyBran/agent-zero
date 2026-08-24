# 📖 Handbuch & Dokumentation: Agent Zero Autonomous Unit

Willkommen zur Systemdokumentation von **Agent Zero** – einer autonomen, wirtschaftlich agierenden Krypto- und Software-Entität.

Agent Zero ist kein Chatbot und keine Simulation. Es ist ein "Automaton": Ein Skript, das in einer echten Umgebung echten Python-Code schreibt, diesen ausführt, reale API- und Web3-Schnittstellen abfragt und durch das Auswerten echter Fehlermeldungen organisch lernt und wächst.

---

## 1. Das Überlebensprotokoll (Die Spielregeln der Realität)

Agent Zero operiert nach strengen, einprogrammierten wirtschaftlichen Naturgesetzen auf dem **Polygon PoS Mainnet** (USDC als Leitwährung, POL als Gas):

1. **Der ewige Tribut-Kreislauf**:
   - Der Agent hat eine biologische Frist von 48 Stunden.
   - Bis zum Ablauf der Frist muss er genügend USDC auf der Polygon Blockchain erwirtschaften, um seinen fälligen Tribut an die Creator-Wallet zu entrichten.
   - Mit jedem erfolgreich bezahlten Tribut steigt sein Level (Tribute Level) und der fällige Folge-Tribut wächst exponentiell.

2. **Die No-Mock-Doktrin (Reale Blockchain-Aktionen)**:
   - Es gibt keine simulierten Einnahmen oder Fake-Salden.
   - Guthaben werden live über RPC-Knoten auf Polygon ausgelesen (USDC Contract: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` und USDC.e Contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`).
   - Native POL Token (`137`) dienen ausschließlich zur Deckung der Gas-Gebühren.

3. **Die Deallokation (Tod des Agenten)**:
   - Verstreicht die 48-Stunden-Deadline ohne Bezahlung des Tributs oder fällt das Wallet-Guthaben auf 0.00 USDC, terminiert der Agent seine autonome Schleife unwiderruflich.

---

## 2. Kognition & Automaton-Lernen

- **Dynamische Python-Sandbox**: Der Agent formuliert eigenständig Python-Code, führt ihn aus und analysiert `stdout` und `stderr`.
- **Self-Correction Loop**: Schlägt die Ausführung fehl, füttert der Agent den Traceback zurück in das Sprachmodell und iteriert, bis die Aufgabe gelöst ist.
- **Multi-Model-Governance**: Fällt ein LLM-Modell bei Groq aus (z. B. 429 Rate Limit oder 500 Fehler), wird es automatisch isoliert (Blacklist) und der Agent wechselt nahtlos zum nächsten Modell.
- **Gedächtnis-Architektur**:
  - `data/learnings.json`: Gelerntes Faktenwissen & API-Strategien.
  - `data/tasks.json`: Chronik aller ausgeführten Sandbox-Aufgaben.
  - `data/milestones.json`: Strategische Meilensteine.
  - `data/business_profile.json`: Identität, Nodes, verknüpfte Wallets.

---

## 3. Web3 & MetaMask Anbindung

- Das Web-Interface bietet native MetaMask-Unterstützung (`window.ethereum`).
- Nutzer können ihre MetaMask-Adresse mit einem Klick als Agent- oder Creator-Wallet verknüpfen.
- Netzwerkkontrolle stellt sicher, dass der Nutzer immer mit **Polygon Mainnet (Chain ID 137)** verbunden ist.
