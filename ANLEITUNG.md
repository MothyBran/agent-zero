# 📖 Handbuch & Dokumentation: Agent Zero Autonomous Unit

Willkommen zur vollständigen Systemdokumentation von **Agent Zero** – dem autonomen, wirtschaftlich agierenden Krypto- und Software-Agenten.

Dieses Dokument erklärt detailliert die Architektur, die Unterschiede zum ursprünglichen Python-Code, die Funktionsweise der neuen visuellen Benutzeroberfläche sowie alle Steuerungs- und Eingriffsmöglichkeiten für den Administrator/Benutzer.

---

## 1. Was ist Agent Zero und was macht der Agent?

**Agent Zero** ist ein autonomer Agent, der nach strengen wirtschaftlichen Überlebensregeln auf dem Ethereum Mainnet (USDC) operiert:

1. **Der ewige Tribut-Kreislauf ($T_n = 2.0 \times 1.10^n$ USDC)**:
   - Der Agent hat eine biologische Lebensdauer / Frist (Initial: 48 Stunden, danach alle 24 Stunden).
   - Bis zum Ablauf der Frist muss der Agent genügend USDC erwirtschaften, um seine Server- und Rechenkosten ("Tribut") zu decken.
   - Reicht das Guthaben bei Fristablauf aus, wird der Betrag abgebucht, das Überlebenslevel steigt (`Level + 1`) und eine neue Frist beginnt.
   - Reicht das Guthaben nicht aus, geht der Agent in die Insolvenzwarnung / Deallokation.

2. **Autonome Handlungszyklen (Thinking & Acting Loop)**:
   - In regelmäßigen Abständen (Standard: alle 60 Sekunden oder manuell ausgelöst) führt der Agent eine Lagebeurteilung durch.
   - Er prüft seinen aktuellen Kontostand via Web3 und die verbleibende Zeit bis zur nächsten Fälligkeit.
   - Er nutzt Internet-Suchwerkzeuge, um nach gasfreien Faucets, Micro-Bounties, Airdrops und Krypto-Einnahmequellen zu recherchieren.
   - Gefundene Erträge fließen direkt in die Liquidität des Agenten.

3. **Eiserne Governance-Regeln**:
   - **Keine Schulden**: Keine ungedeckten Fixkosten, Verträge oder Abonnements.
   - **Kill-Switch**: Unrentable Schnittstellen oder Modelle werden sofort isoliert.
   - **Multi-Model-Fallback mit Blacklisting**: Scheitert ein KI-Modell (z. B. durch Ausfall oder Rate-Limits), wird es automatisch auf die Blacklist gesetzt und nahtlos durch den nächsten Kandidaten ersetzt.
   - **Vollständige Buchhaltung**: Jede Bewegung wird lückenlos in `accounting.json` auditiert.

---

## 2. Vergleich: Ursprungscode (Python) vs. Neue Vollwertige Web-App

| Bereich | Ursprünglicher Python-Code (`main.py`, `wallet.py`) | Neue Full-Stack Web-Applikation |
| :--- | :--- | :--- |
| **Laufzeit & Stack** | Reines Python-Terminal-Skript (CLI-Ausgabe). | Full-Stack Node.js (Express) + React 18 + Vite + Tailwind CSS. |
| **Benutzeroberfläche** | Keine. Nur Textausgaben in der Konsole. | Interaktives, responsives Dark-Theme-Kontrollzentrum mit Live-Telemetrie. |
| **Web3 / Blockchain** | `web3.py` mit statischer RPC-Konfiguration. | `ethers.js` mit Ausfallsicherung (Failover-RPCs), Pre-Flight-Pings und Sandbox-Fallback. |
| **KI-Modell-Steuerung** | LangChain / Groq API Aufrufe im Terminal. | Multi-Provider-Orchestrierung: Google Gemini (`@google/genai`), Groq/OpenAI-kompatibel und autonomer Heuristik-Kern. |
| **Interaktive Steuerung** | Keine Eingriffsmöglichkeit während des Laufs außer Programmabbruch. | Manuelle Zyklen, Start/Pause-Schalter, Sandbox-Einzahlungen, Tool-Testbenches und Blacklist-Verwaltung. |
| **Buchhaltung & Einsicht** | Reine JSON-Dateien auf der Festplatte. | Interaktive Buchhaltungstabelle mit Filterung, Salden-Statistik und Datumsformatierung. |

---

## 3. Die neuen Elemente der Benutzeroberfläche

Die Weboberfläche ist in fünf Hauptbereiche unterteilt:

### A. Kopfzeile (Header)
- **Status-Badge**: Zeigt in Echtzeit an, ob der autonome 60-Sekunden-Hintergrundzyklus aktiv ist (`AUTONOMOUS LOOP ACTIVE`) oder pausiert wurde (`CYCLE PAUSED`).
- **Wallet-Adresse**: Zeigt die verkürzte Ethereum-Adresse des Agenten an. Ein Klick kopiert die vollständige Hex-Adresse in die Zwischenablage.
- **Start/Pause Loop**: Schaltet die automatische Hintergrundausführung ein oder aus.
- **Refresh**: Aktualisiert sofort den aktuellen Server- und Speicherzustand.

### B. Vitals-Dashboard (Die 4 Überlebens-Karten)
1. **USDC Balance (HP)**: Aktueller Kontostand des Agenten in USDC. Zeigt sofort an, ob die Liquidität für den nächsten Tribut ausreicht. Über den Button **`+ Deposit`** kann Test-Startkapital eingezahlt werden.
2. **Next Tribute Cost**: Zeigt den exakten fälligen Betrag für den nächsten Zyklus nach der Formel $2.0 \times 1.10^n$ an.
3. **Survival Deadline (Countdown)**: Ein Live-Countdown (Stunden : Minuten : Sekunden) bis zur automatischen Tribut-Abrechnung.
4. **Tributes Survived (Generations-Level)**: Zeigt an, wie viele Tribute der Agent bereits erfolgreich überlebt hat und welches KI-Modell aktuell aktiv ist.
5. **Aktions-Banner ("Execute Instant Cycle")**: Erlaubt es, jederzeit per Knopfdruck sofort einen einzelnen Denk- und Handlungszyklus zu erzwingen, ohne auf das 60-Sekunden-Intervall zu warten.

### C. Reiter 1: Agent Operations & Telemetry (Live-Terminal)
- Zeigt den vollständigen Denkprozess, Protokoll-Meldungen, Finanzbuchungen und Fehlermeldungen in einem anpassbaren Terminal-Stream an.
- **Filter**: Filterung nach `ALL`, `AGENT` (KI-Gedankengänge), `FINANCE` (Buchungen), `TOOL` (Werkzeugausführungen) und `SYSTEM`.
- **Copy-Button**: Kopiert alle gefilterten Logs formatiert für Audits oder Fehleranalysen.

### D. Reiter 2: Accounting Ledger (`accounting.json`)
- Grafische Buchhaltungs-Tabelle, die jede Bewegung listet:
  - `INITIAL_BALANCE`: Startkapital.
  - `INCOME`: Einnahmen aus Micro-Tasks, Bounties oder Faucets.
  - `EXPENSE`: Betriebsausgaben.
  - `TRIBUTE_PAYMENT`: Geleistete Server-Tribut-Zahlungen.
  - `TEST_DEPOSIT`: Manuelle Nutzeinzahlungen.
- Oben werden die aggregierten Gesamteinnahmen und Gesamttribute in Echtzeit summiert.

### E. Reiter 3: Tools Sandbox
Hier kann der Benutzer die Werkzeuge des Agenten isoliert und manuell testen:
- **`search_internet(query)`**: Führt eine Live-Recherche via DuckDuckGo durch und zeigt das Roh-Ergebnis an.
- **`check_blockchain_wallet()`**: Fragt den Ethereum Mainnet Smart Contract direkt nach dem aktuellen Saldo ab.

### F. Reiter 4: Business Entity & Governance (`business_profile.json`)
- Übersicht über registrierte Konten, Schnittstellen und Überlebens-Regeln.
- **Model Blacklist Management**: Zeigt an, wie viele Modelle aufgrund von Fehlern isoliert wurden, und bietet einen Button zur Bereinigung der Blacklist.
- **Reset State & Memory**: Erlaubt dem Administrator, den Agenten mit Bestätigung auf Level 0 und Ausgangszustand zurückzusetzen.

---

## 4. Was der Benutzer machen kann und muss

### Was der Benutzer machen KANN:
1. **Beobachten**: Den Agenten im Live-Terminal dabei beobachten, wie er autonom Recherchen anstellt, Entscheidungen trifft und seine Finanzen verwaltet.
2. **Zyklus manuell anstoßen**: Über `Execute Instant Cycle` sofortige Analysen und Einnahmen-Suchen initiieren.
3. **Autonomie steuern**: Mit dem `Start / Pause Loop`-Schalter entscheiden, ob der Agent eigenständig im Hintergrund alle 60 Sekunden aktiv sein soll.
4. **Liquidität bereitstellen**: Über `Deposit` dem Agenten Startkapital übergeben, damit er nicht an den ersten Tribut-Zahlungen scheitert.
5. **Werkzeuge testen**: In der Tools Sandbox eigene Suchbegriffe eingeben, um zu prüfen, welche Datenquellen der Agent nutzen kann.
6. **Governance verwalten**: Modelle entbannen (`Clear Blacklist`) oder bei Bedarf den gesamten Lebenszyklus neu starten (`Reset State`).

### Was der Benutzer machen MUSS (Konfiguration):
Für den vollen Produktivbetrieb (optional im Prototyp-Modus, da Sandbox-Fallbacks integriert sind) können in der Umgebung / `.env` folgende Schlüssel hinterlegt werden:

| Variable | Zweck | Pflicht? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Erlaubt modernste Denk- und Strategieanalysen via Google Gemini 2.5 Flash. | Empfohlen |
| `FREE_LLM_API_KEY` | Optionaler Groq / OpenAI-kompatibler API-Key für Multi-Modell-Fallbacks. | Optional |
| `AGENT_PRIVATE_KEY` | Privater Schlüssel (0x...) für echte Ethereum USDC On-Chain-Transaktionen. | Optional (nutzt sonst Demowallet) |
| `WEB3_PROVIDER_URL` | Eigener Ethereum RPC Endpunkt (Alchemy/Infura). | Optional (nutzt öffentliche High-Availability Nodes) |

---

## 5. Deployment auf externen Plattformen (z. B. Railway, Render, Cloud Run)

Die App ist vollständig für moderne Node.js-Container vorkonfiguriert:
- **`Procfile`**: Definiert den Web-Prozess (`web: npm run build && npm start`).
- **`railway.json`**: Weist Railway an, den `NIXPACKS`-Builder mit Node.js 22 zu verwenden.
- **`package.json`**: Beinhaltet optimierte `dev`, `build` und `start`-Befehle.
- **Host & Port**: Der Server bindet automatisch an `0.0.0.0:3000`.
