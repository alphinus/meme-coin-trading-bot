"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backtester = void 0;
exports.runBacktestFromCLI = runBacktestFromCLI;
const config_1 = require("./config");
const tokenScorer_1 = require("./scoring/tokenScorer");
const predictor_1 = require("./ml/predictor");
const manager_1 = require("./risk/manager");
class Backtester {
    constructor(backtestConfig) {
        this.config = (0, config_1.loadConfig)();
        this.backtestConfig = {
            initialCapital: this.config.backtest.initialCapital,
            commission: this.config.backtest.commission,
            slippageBase: this.config.backtest.slippageBase,
            slippageVolMultiplier: this.config.backtest.slippageVolMultiplier,
            ...backtestConfig,
        };
        this.tokenScorer = new tokenScorer_1.TokenScorer();
        this.mlPredictor = new predictor_1.MLPredictor();
        this.riskManager = new manager_1.RiskManager(this.backtestConfig.initialCapital);
    }
    /**
     * Run backtest on historical data
     */
    async runBacktest(tokenData) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    BACKTEST STARTED                           ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`   Initial Capital: $${this.backtestConfig.initialCapital}`);
        console.log(`   Trading Period: ${tokenData.length} tokens`);
        console.log(`   Commission: ${this.backtestConfig.commission * 100}%`);
        console.log(`   Slippage: ${this.backtestConfig.slippageBase * 100}%\n`);
        const trades = [];
        let currentCapital = this.backtestConfig.initialCapital;
        let peakCapital = currentCapital;
        let maxDrawdown = 0;
        for (let i = 0; i < tokenData.length; i++) {
            const token = tokenData[i];
            // Simulate trade
            const trade = this.simulateTrade(token, currentCapital);
            if (trade) {
                trades.push(trade);
                currentCapital += trade.pnl;
                // Track drawdown
                if (currentCapital > peakCapital) {
                    peakCapital = currentCapital;
                }
                const drawdown = (peakCapital - currentCapital) / peakCapital;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
                console.log(`   Trade ${i + 1}: ${trade.pnlPercent > 0 ? '✅' : '❌'} ${trade.pnlPercent.toFixed(2)}% | Capital: $${currentCapital.toFixed(2)}`);
            }
        }
        // Calculate metrics
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl < 0);
        const totalReturn = currentCapital - this.backtestConfig.initialCapital;
        const totalReturnPercent = (totalReturn / this.backtestConfig.initialCapital) * 100;
        const avgWin = winningTrades.length > 0
            ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length
            : 0;
        const avgLoss = losingTrades.length > 0
            ? losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length
            : 0;
        const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
        // Calculate Sharpe Ratio (simplified)
        const returns = trades.map(t => t.pnlPercent / 100);
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
        const result = {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
            totalReturn,
            totalReturnPercent,
            maxDrawdown: maxDrawdown * 100,
            sharpeRatio,
            avgWin,
            avgLoss,
            profitFactor,
            trades,
        };
        this.printResults(result);
        return result;
    }
    /**
     * Simulate a single trade
     */
    simulateTrade(token, currentCapital) {
        // Calculate position size
        const positionSize = currentCapital * this.config.trading.maxPositionSize;
        if (positionSize < 10)
            return null; // Minimum position size
        // Simulate entry
        const entryPrice = token.price * (1 + this.getSlippage(true));
        const entryTime = new Date(token.timestamp);
        // Simulate exit based on historical data
        const exitPrice = token.exitPrice || token.price * (1 + (Math.random() - 0.4) * 2); // Slight positive bias
        const exitTime = new Date(token.timestamp + 3600000 * Math.random() * 24); // Exit within 24h
        // Calculate PnL
        const commission = positionSize * this.backtestConfig.commission;
        const pnl = (exitPrice - entryPrice) * (positionSize / entryPrice) - commission * 2;
        const pnlPercent = (pnl / positionSize) * 100;
        // Determine exit reason
        let reason = 'take profit';
        if (pnlPercent < -this.config.trading.stopLoss * 100) {
            reason = 'stop loss';
        }
        else if (pnlPercent < 0 && Math.random() > 0.5) {
            reason = 'manual exit';
        }
        return {
            token: token.symbol || 'UNKNOWN',
            entryTime,
            exitTime,
            entryPrice,
            exitPrice,
            pnl,
            pnlPercent,
            reason,
        };
    }
    /**
     * Get simulated slippage
     */
    getSlippage(isBuy) {
        const volatility = Math.random() * 0.5 + 0.5; // Random volatility
        const slippage = this.backtestConfig.slippageBase *
            (1 + volatility * this.backtestConfig.slippageVolMultiplier);
        return isBuy ? slippage : -slippage;
    }
    /**
     * Print backtest results
     */
    printResults(result) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                    BACKTEST RESULTS                           ');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`   📊 Total Trades:     ${result.totalTrades}`);
        console.log(`   ✅ Winning Trades:   ${result.winningTrades}`);
        console.log(`   ❌ Losing Trades:   ${result.losingTrades}`);
        console.log(`   🎯 Win Rate:         ${(result.winRate * 100).toFixed(2)}%\n`);
        console.log(`   💰 Total Return:     $${result.totalReturn.toFixed(2)}`);
        console.log(`   📈 Return %:         ${result.totalReturnPercent.toFixed(2)}%\n`);
        console.log(`   📉 Max Drawdown:     ${result.maxDrawdown.toFixed(2)}%`);
        console.log(`   📊 Sharpe Ratio:     ${result.sharpeRatio.toFixed(2)}\n`);
        console.log(`   💵 Avg Win:          ${result.avgWin.toFixed(2)}%`);
        console.log(`   💸 Avg Loss:         ${result.avgLoss.toFixed(2)}%`);
        console.log(`   ⚖️  Profit Factor:    ${result.profitFactor.toFixed(2)}\n`);
        // Performance rating
        let rating = 'POOR';
        if (result.sharpeRatio > 2 && result.maxDrawdown < 20)
            rating = 'EXCELLENT';
        else if (result.sharpeRatio > 1.5 && result.maxDrawdown < 30)
            rating = 'GOOD';
        else if (result.sharpeRatio > 1 && result.maxDrawdown < 40)
            rating = 'FAIR';
        console.log(`   ⭐ Rating:           ${rating}`);
        console.log('\n═══════════════════════════════════════════════════════════════\n');
    }
    /**
     * Run Monte Carlo simulation
     */
    runMonteCarlo(baseTrades, simulations = 1000) {
        console.log(`\n🎲 Running ${simulations} Monte Carlo simulations...`);
        const results = [];
        for (let i = 0; i < simulations; i++) {
            // Resample trades with replacement
            const sampledTrades = [];
            for (let j = 0; j < baseTrades.length; j++) {
                const randomTrade = baseTrades[Math.floor(Math.random() * baseTrades.length)];
                sampledTrades.push(randomTrade);
            }
            // Calculate return
            const finalCapital = sampledTrades.reduce((capital, trade) => capital + trade.pnl, this.backtestConfig.initialCapital);
            results.push(finalCapital);
        }
        // Sort results
        results.sort((a, b) => a - b);
        console.log('\n   Monte Carlo Results:');
        console.log(`   - Worst Case (5%):   $${results[Math.floor(simulations * 0.05)].toFixed(2)}`);
        console.log(`   - Median:            $${results[Math.floor(simulations * 0.5)].toFixed(2)}`);
        console.log(`   - Best Case (95%):   $${results[Math.floor(simulations * 0.95)].toFixed(2)}`);
        console.log(`   - Probability of Loss: ${((results.filter(r => r < this.backtestConfig.initialCapital).length / simulations) * 100).toFixed(2)}%\n`);
    }
}
exports.Backtester = Backtester;
// Export for CLI usage
async function runBacktestFromCLI() {
    // Load sample data (in production, load from files)
    const sampleData = [
        { symbol: 'PEPE', price: 0.001, exitPrice: 0.0015, timestamp: Date.now() },
        { symbol: 'DOGWIF', price: 2.5, exitPrice: 3.2, timestamp: Date.now() + 10000 },
        { symbol: 'BONK', price: 0.00001, exitPrice: 0.000008, timestamp: Date.now() + 20000 },
    ];
    const backtester = new Backtester();
    const result = await backtester.runBacktest(sampleData);
    if (result.trades.length > 0) {
        backtester.runMonteCarlo(result.trades);
    }
}
// Run if called directly
if (require.main === module) {
    runBacktestFromCLI().catch(console.error);
}
//# sourceMappingURL=backtest.js.map