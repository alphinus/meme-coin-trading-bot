interface BacktestResult {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    trades: BacktestTrade[];
}
interface BacktestTrade {
    token: string;
    entryTime: Date;
    exitTime: Date;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    reason: string;
}
interface BacktestConfig {
    initialCapital: number;
    commission: number;
    slippageBase: number;
    slippageVolMultiplier: number;
}
export declare class Backtester {
    private config;
    private backtestConfig;
    private tokenScorer;
    private mlPredictor;
    private riskManager;
    constructor(backtestConfig?: Partial<BacktestConfig>);
    /**
     * Run backtest on historical data
     */
    runBacktest(tokenData: any[]): Promise<BacktestResult>;
    /**
     * Simulate a single trade
     */
    private simulateTrade;
    /**
     * Get simulated slippage
     */
    private getSlippage;
    /**
     * Print backtest results
     */
    private printResults;
    /**
     * Run Monte Carlo simulation
     */
    runMonteCarlo(baseTrades: BacktestTrade[], simulations?: number): void;
}
export declare function runBacktestFromCLI(): Promise<void>;
export {};
//# sourceMappingURL=backtest.d.ts.map