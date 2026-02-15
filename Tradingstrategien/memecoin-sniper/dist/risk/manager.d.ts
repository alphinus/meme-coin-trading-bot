import { Position, Portfolio } from '../types';
export declare class RiskManager {
    private config;
    private portfolio;
    constructor(initialCapital: number);
    /**
     * Calculate position size using Kelly Criterion
     */
    calculatePositionSize(winRate: number, odds: number, volatility: number): number;
    /**
     * Calculate USD position size
     */
    calculateUsdPositionSize(winRate: number, odds: number, volatility: number): number;
    /**
     * Get dynamic stop loss based on volatility
     */
    getDynamicStopLoss(entryPrice: number, volatility: number): number;
    /**
     * Check if position should be closed due to stop loss
     */
    checkStopLoss(position: Position, currentPrice: number): {
        shouldClose: boolean;
        reason: string;
        exitPercent: number;
    };
    /**
     * Check take profit levels
     */
    checkTakeProfit(position: Position, currentPrice: number): {
        shouldSell: boolean;
        reason: string;
        exitPercent: number;
    }[];
    /**
     * Calculate portfolio risk metrics
     */
    calculatePortfolioRisk(): {
        totalExposure: number;
        maxExposure: number;
        diversification: number;
        correlationRisk: number;
    };
    /**
     * Check if we can open new position
     */
    canOpenPosition(): {
        allowed: boolean;
        reason: string;
    };
    /**
     * Update portfolio after trade
     */
    updatePortfolioPnL(pnl: number, isWin: boolean): void;
    /**
     * Get current portfolio state
     */
    getPortfolio(): Portfolio;
    /**
     * Calculate volatility from price history
     */
    calculateVolatility(prices: number[]): number;
    /**
     * Emergency circuit breaker
     */
    checkCircuitBreaker(): {
        triggered: boolean;
        reason: string;
    };
}
//# sourceMappingURL=manager.d.ts.map