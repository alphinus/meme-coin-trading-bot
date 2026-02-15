"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SniperBot = void 0;
// Sniper Bot - Main Orchestrator
const events_1 = require("events");
const config_1 = require("./config");
const pumpfun_1 = require("./discovery/pumpfun");
const tokenScorer_1 = require("./scoring/tokenScorer");
const predictor_1 = require("./ml/predictor");
const sentimentAnalyzer_1 = require("./scoring/sentimentAnalyzer");
const executor_1 = require("./execution/executor");
const manager_1 = require("./risk/manager");
class SniperBot extends events_1.EventEmitter {
    constructor(wallet, initialCapital = 10000) {
        super();
        // State
        this.positions = new Map();
        this.isRunning = false;
        this.priceUpdateInterval = null;
        this.wallet = wallet;
        this.config = (0, config_1.loadConfig)();
        // Initialize components
        this.pumpFunMonitor = new pumpfun_1.PumpFunMonitor();
        this.tokenScorer = new tokenScorer_1.TokenScorer();
        this.mlPredictor = new predictor_1.MLPredictor();
        this.sentimentAnalyzer = new sentimentAnalyzer_1.SentimentAnalyzer();
        this.executionEngine = new executor_1.ExecutionEngine(wallet);
        this.riskManager = new manager_1.RiskManager(initialCapital);
        this.setupEventHandlers();
    }
    /**
     * Setup internal event handlers
     */
    setupEventHandlers() {
        // Handle new token discovery
        this.pumpFunMonitor.on('newToken', async (event) => {
            await this.processNewToken(event);
        });
        // Handle sentiment updates
        this.sentimentAnalyzer.on('sentimentUpdate', (sentiment) => {
            this.emit('sentimentUpdate', sentiment);
        });
    }
    /**
     * Start the sniper bot
     */
    async start() {
        console.log('🎯 Starting Memecoin Sniper Bot...');
        console.log(`   Wallet: ${this.wallet.publicKey.toString().slice(0, 8)}...`);
        // Check wallet balance
        const balance = await this.executionEngine.getSolBalance();
        console.log(`   SOL Balance: ${balance.toFixed(4)} SOL`);
        // Initialize ML
        await this.mlPredictor.initialize();
        // Start monitoring
        this.pumpFunMonitor.start();
        this.sentimentAnalyzer.start();
        // Start price monitoring loop
        this.startPriceMonitoring();
        this.isRunning = true;
        console.log('✓ Sniper Bot started successfully');
        this.emit('started');
    }
    /**
     * Stop the sniper bot
     */
    async stop() {
        console.log('🛑 Stopping Sniper Bot...');
        this.pumpFunMonitor.stop();
        this.sentimentAnalyzer.stop();
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }
        this.isRunning = false;
        console.log('✓ Sniper Bot stopped');
        this.emit('stopped');
    }
    /**
     * Process newly discovered token
     */
    async processNewToken(event) {
        const token = event.token;
        console.log(`\n🔍 Processing: ${token.token.name} (${token.token.symbol})`);
        // Check must-have criteria
        const mustHave = this.tokenScorer.passesMustHave(token);
        if (!mustHave.passes) {
            console.log(`   ❌ Failed must-have: ${mustHave.reasons.join(', ')}`);
            return;
        }
        // Get ML prediction
        const mlPrediction = await this.mlPredictor.predict(token);
        console.log(`   🤖 ML Probability: ${(mlPrediction.probability * 100).toFixed(1)}%`);
        if (!this.mlPredictor.meetsThreshold(mlPrediction.probability)) {
            console.log(`   ❌ Below ML threshold (${this.config.ml.probabilityThreshold})`);
            return;
        }
        // Get sentiment
        const sentiment = await this.sentimentAnalyzer.analyzeToken(token);
        console.log(`   📊 Sentiment: ${(sentiment.score * 100).toFixed(1)}%`);
        // Score token
        const score = await this.tokenScorer.scoreToken(token, mlPrediction.probability, sentiment.score);
        console.log(`   📈 Total Score: ${score.totalScore.toFixed(1)}/100`);
        console.log(`   ⚠️  Risk Score: ${score.riskScore.toFixed(1)}/100`);
        // Generate trade signal
        const signal = this.tokenScorer.generateSignal(token, score);
        if (!signal) {
            console.log(`   ❌ No trade signal generated`);
            return;
        }
        console.log(`   ✅ Trade Signal Generated!`);
        console.log(`      Reasons: ${signal.reasons.join(', ')}`);
        // Check risk manager
        const canTrade = this.riskManager.canOpenPosition();
        if (!canTrade.allowed) {
            console.log(`   ❌ Risk manager blocked: ${canTrade.reason}`);
            return;
        }
        // Execute trade
        await this.executeTrade(signal);
    }
    /**
     * Execute a trade based on signal
     */
    async executeTrade(signal) {
        const token = signal.token;
        // Calculate position size
        const portfolio = this.riskManager.getPortfolio();
        const positionSizeUsd = portfolio.cashUsd * this.config.trading.maxPositionSize;
        const positionSizeSol = positionSizeUsd / token.price;
        console.log(`\n💰 Opening position:`);
        console.log(`   Amount: ${positionSizeSol.toFixed(4)} SOL ($${positionSizeUsd.toFixed(2)})`);
        try {
            // Execute buy
            const result = await this.executionEngine.executeBuy(token, positionSizeSol, this.config.execution.maxSlippage);
            if (result.success) {
                // Create position
                const position = {
                    tokenAddress: token.token.address,
                    entryPrice: token.price,
                    quantity: positionSizeSol,
                    valueUsd: positionSizeUsd,
                    entryTime: new Date(),
                    takeProfitLevels: this.config.trading.takeProfitTiers.map(tier => ({
                        threshold: tier.threshold,
                        exitPercent: tier.exitPercent,
                        triggered: false,
                    })),
                    status: 'open',
                };
                this.positions.set(token.token.address, position);
                console.log(`   ✅ Position opened!`);
                console.log(`      Tx: ${result.txHash}`);
                this.emit('positionOpened', position);
            }
            else {
                console.log(`   ❌ Trade failed: ${result.error}`);
                this.emit('tradeFailed', { signal, error: result.error });
            }
        }
        catch (error) {
            console.error(`   ❌ Error executing trade:`, error.message);
            this.emit('tradeError', { signal, error: error.message });
        }
    }
    /**
     * Start price monitoring for open positions
     */
    startPriceMonitoring() {
        this.priceUpdateInterval = setInterval(async () => {
            await this.checkPositions();
        }, 5000); // Check every 5 seconds
    }
    /**
     * Check all positions for exit signals
     */
    async checkPositions() {
        for (const [address, position] of this.positions) {
            if (position.status !== 'open')
                continue;
            try {
                // Get current price (simplified - in production fetch real price)
                // const currentPrice = await this.getCurrentPrice(address);
                const currentPrice = position.entryPrice; // Placeholder
                // Check stop loss
                const stopCheck = this.riskManager.checkStopLoss(position, currentPrice);
                if (stopCheck.shouldClose) {
                    console.log(`\n🛑 Stop loss triggered for ${address}`);
                    await this.closePosition(address, stopCheck.exitPercent, stopCheck.reason);
                    continue;
                }
                // Check take profit
                const tpChecks = this.riskManager.checkTakeProfit(position, currentPrice);
                for (const tpCheck of tpChecks) {
                    if (tpCheck.shouldSell) {
                        console.log(`\n🎯 Take profit triggered: ${tpCheck.reason}`);
                        await this.closePosition(address, tpCheck.exitPercent, tpCheck.reason);
                    }
                }
            }
            catch (error) {
                console.error(`Error checking position ${address}:`, error);
            }
        }
    }
    /**
     * Close a position (partial or full)
     */
    async closePosition(tokenAddress, percentage, reason) {
        const position = this.positions.get(tokenAddress);
        if (!position)
            return;
        // For now, log the close (actual implementation would call execution engine)
        console.log(`\n📉 Closing position:`);
        console.log(`   Token: ${tokenAddress}`);
        console.log(`   Percentage: ${percentage * 100}%`);
        console.log(`   Reason: ${reason}`);
        // Update position
        if (percentage >= 1.0) {
            position.status = 'closed';
            this.positions.delete(tokenAddress);
        }
        else {
            position.valueUsd *= (1 - percentage);
        }
        this.emit('positionClosed', { position, reason });
    }
    /**
     * Get bot status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            positions: this.positions.size,
            portfolio: this.riskManager.getPortfolio(),
        };
    }
}
exports.SniperBot = SniperBot;
//# sourceMappingURL=sniper.js.map