import { EventEmitter } from 'events';
import { Keypair } from '@solana/web3.js';
export declare class SniperBot extends EventEmitter {
    private config;
    private wallet;
    private pumpFunMonitor;
    private tokenScorer;
    private mlPredictor;
    private sentimentAnalyzer;
    private executionEngine;
    private riskManager;
    private positions;
    private isRunning;
    private priceUpdateInterval;
    constructor(wallet: Keypair, initialCapital?: number);
    /**
     * Setup internal event handlers
     */
    private setupEventHandlers;
    /**
     * Start the sniper bot
     */
    start(): Promise<void>;
    /**
     * Stop the sniper bot
     */
    stop(): Promise<void>;
    /**
     * Process newly discovered token
     */
    private processNewToken;
    /**
     * Execute a trade based on signal
     */
    private executeTrade;
    /**
     * Start price monitoring for open positions
     */
    private startPriceMonitoring;
    /**
     * Check all positions for exit signals
     */
    private checkPositions;
    /**
     * Close a position (partial or full)
     */
    private closePosition;
    /**
     * Get bot status
     */
    getStatus(): {
        isRunning: boolean;
        positions: number;
        portfolio: any;
    };
}
//# sourceMappingURL=sniper.d.ts.map