# 🎯 Memecoin Sniper - Premium Trading System

Ein hochentwickeltes, automatisiertes Trading-System für Memecoins auf Solana mit ML-basierter Vorhersage, Sentiment-Analyse und MEV-geschütztem Trading.

![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Solana](https://img.shields.io/badge/Solana-000000?style=flat&logo=solana)
![License](https://img.shields.io/badge/License-MIT-green)

## ⚡ Features

### 🔍 Discovery Layer
- **Pump.fun Integration** - Echtzeit-Überwachung neuer Token-Launches
- **DEX Scanner** - Raydium, Orca, Jupiter Aggregator
- **Social Monitoring** - Twitter/Discord Signal-Erkennung

### 🤖 ML Prediction
- **XGBoost-basiertes Modell** für Erfolgs-Wahrscheinlichkeit
- **Feature Engineering**: Liquidity Ratio, Holder Distribution, Volume Acceleration
- **Echtzeit-Inferenz** auf neuen Token-Daten

### 📊 Sentiment Analysis
- **Twitter/Discord Integration** für Social Signals
- **NLP-basierte Stimmungsanalyse**
- **Influencer-Erkennung**

### 💎 Execution Engine
- **Jito Bundle Execution** für MEV-Schutz
- **Flashbots Protect** Integration
- **Dynamisches Slippage-Management**
- **Auto-Retry mit RPC-Rotation**

### 🛡️ Risk Management
- **Kelly Criterion** für Position Sizing
- **Adaptive Stop-Loss** basierend auf Volatilität
- **Take-Profit Tiers** (50%, 100%, 200%)
- **Circuit Breaker** bei extremen Verlusten

### 📈 Backtesting
- **Event-Driven Backtester** mit echtem Slippage-Modell
- **Walk-Forward Analysis**
- **Monte Carlo Simulation**
- **Performance Metrics**: Sharpe Ratio, Max Drawdown, Win Rate

## 🚀 Quick Start

### Voraussetzungen
- Node.js 18+
- npm oder yarn
- Solana Wallet (Keypair)

### Installation

```bash
# Repository klonen
git clone <repo-url>
cd memecoin-sniper

# Dependencies installieren
npm install

# Config erstellen
cp .env.example .env
# Editiere .env mit deinen API Keys

# Bauen
npm run build
```

### Konfiguration

Bearbeite `config/config.yaml`:

```yaml
trading:
  maxPositionSize: 0.02    # Max 2% pro Trade
  stopLoss: 0.15           # 15% Stop-Loss
  takeProfitTiers:
    - threshold: 0.50       # 50% Profit
      exitPercent: 0.25     # 25% verkaufen
    - threshold: 1.00       # 100% Profit  
      exitPercent: 0.50     # 50% verkaufen

ml:
  enabled: true
  probabilityThreshold: 0.65  # Nur >65% Wahrscheinlichkeit
```

### Starten

```bash
# Production
npm start

# Development (mit Hot-Reload)
npm run dev

# Backtest
npm run backtest
```

## 📁 Projekt-Struktur

```
memecoin-sniper/
├── config/
│   └── config.yaml          # Hauptkonfiguration
├── src/
│   ├── index.ts             # Entry Point
│   ├── sniper.ts            # Main Orchestrator
│   ├── types/
│   │   └── index.ts         # TypeScript Typen
│   ├── config/
│   │   └── index.ts         # Config Loader
│   ├── discovery/
│   │   └── pumpfun.ts       # Pump.fun Monitor
│   ├── scoring/
│   │   ├── tokenScorer.ts   # Risk Scoring
│   │   └── sentimentAnalyzer.ts  # Sentiment Analysis
│   ├── ml/
│   │   └── predictor.ts     # ML Prediction Model
│   ├── execution/
│   │   └── executor.ts      # MEV Protected Trading
│   ├── risk/
│   │   └── manager.ts       # Risk Management
│   └── backtest.ts          # Backtesting Engine
├── models/
│   └── (ML Model Files)
├── data/
│   └── (Historical Data)
└── tests/
    └── (Unit Tests)
```

## 🔧 API Keys Setup

1. **Solana RPC**: 
   - [Alchemy](https://www.alchemy.com/) (empfohlen)
   - [Helius](https://helius.xyz/)
   - [QuickNode](https://quicknode.com/)

2. **Birdeye** (Token Data):
   - [Birdeye API](https://birdeye.so/)

3. **Twitter** (Sentiment):
   - [Twitter Developer Portal](https://developer.twitter.com/)

4. **Jito** (MEV Protection):
   - [Jito Block Engine](https://www.jito.wtf/)

## 📊 Trading Strategie

### Entry Signals (MUST HAVE)
- [ ] Token auf Pump.fun gelistet
- [ ] Mint Authority revoked
- [ ] Top 10 Holder < 60%
- [ ] Liquidity > $10,000

### Entry Signals (NICE TO HAVE)
- [ +2] Twitter Account (>1000 Follower)
- [ +2] Telegram Community (>500 Mitglieder)
- [ +1] Dev ist doxxed
- [ +1] Fair Launch

### Exit Strategie
```
PnL ≥ 200% → Sell 75%
PnL ≥ 100% → Sell 50%  
PnL ≥ 50%  → Sell 25%
PnL ≤ -15%  → Full Stop-Loss
```

## ⚠️ Risiko-Warnung

**Dieses Projekt ist für Bildungszwecke. Trading birgt erhebliche Risiken:**

- ❌ Keine Garantie für Gewinne
- ❌ Memecoins sind hochspekulativ
- ❌ Volatilität kann zu Totalverlust führen
- ❌ Smart Contract Risiken
- ❌ MEV/Front-Running Risiken

**Nur investieren, was du bereit bist zu verlieren.**

## 🛠️ Entwicklung

```bash
# Tests ausführen
npm test

# TypeScript kompilieren
npm run build

# Code formatieren
npm run format
```

## 📈 Performance Erwartungen

| Metrik | Konservativ | Optimistisch |
|--------|-------------|--------------|
| Win Rate | 35% | 55% |
| Avg PnL/Win | 3x | 5x |
| Avg Loss | -15% | -10% |
| Sharpe Ratio | 1.2 | 2.5 |
| Max Drawdown | -40% | -25% |

## 📝 Lizenz

MIT License - Siehe LICENSE Datei.

## 🙏 Danksagungen

- [Solana](https://solana.com/) - Blockchain
- [Jupiter Aggregator](https://jup.ag/) - DEX Aggregator
- [Pump.fun](https://pump.fun/) - Token Launchpad
- [Birdeye](https://birdeye.so/) - Market Data

---

**Entwickelt mit ❤️ für die Solana Community**
