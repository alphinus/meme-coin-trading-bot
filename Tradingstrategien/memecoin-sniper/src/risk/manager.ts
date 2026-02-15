// Risk Management Module - Position Sizing & Stop Losses
import { Config, Position, TokenMetadata, Portfolio } from '../types';
import { getConfig } from '../config';
import Decimal from 'decimal.js';

export class RiskManager {
  private config: Config;
  private portfolio: Portfolio;

  constructor(initialCapital: number) {
    this.config = getConfig();
    this.portfolio = {
      totalValueUsd: initialCapital,
      cashUsd: initialCapital,
      positions: [],
      dailyPnL: 0,
      totalPnL: 0,
      winRate: 0,
    };
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculatePositionSize(
    winRate: number,
    odds: number,
    volatility: number
  ): number {
    const kellyFraction = 0.25; // Use fraction of full Kelly
    
    // Kelly formula: f* = (bp - q) / b
    // where b = odds - 1, p = win rate, q = 1 - p
    const b = odds - 1;
    const p = winRate;
    const q = 1 - p;
    
    let kelly = (b * p - q) / b;
    
    // Adjust for volatility
    const volMultiplier = 1 / (volatility / 0.5);
    kelly = kelly * kellyFraction * volMultiplier;
    
    // Clamp to max position size
    const maxSize = this.config.trading.maxPositionSize;
    const clampedKelly = Math.max(0, Math.min(kelly, maxSize));
    
    return clampedKelly;
  }

  /**
   * Calculate USD position size
   */
  calculateUsdPositionSize(
    winRate: number,
    odds: number,
    volatility: number
  ): number {
    const percentage = this.calculatePositionSize(winRate, odds, volatility);
    return this.portfolio.cashUsd * percentage;
  }

  /**
   * Get dynamic stop loss based on volatility
   */
  getDynamicStopLoss(entryPrice: number, volatility: number): number {
    const baseStop = this.config.trading.stopLoss;
    const volAdjusted = baseStop * (volatility / 0.5);
    
    // Cap at 25% max stop loss
    return entryPrice * (1 - Math.min(volAdjusted, 0.25));
  }

  /**
   * Check if position should be closed due to stop loss
   */
  checkStopLoss(position: Position, currentPrice: number): {
    shouldClose: boolean;
    reason: string;
    exitPercent: number;
  } {
    // Hard stop loss
    const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice;
    
    if (pnlPercent <= -this.config.trading.stopLoss) {
      return {
        shouldClose: true,
        reason: 'Hard stop loss triggered',
        exitPercent: 1.0,
      };
    }

    // Soft stop loss
    if (pnlPercent <= -this.config.trading.softStopLoss) {
      return {
        shouldClose: true,
        reason: 'Soft stop loss triggered',
        exitPercent: 0.5,
      };
    }

    return {
      shouldClose: false,
      reason: '',
      exitPercent: 0,
    };
  }

  /**
   * Check take profit levels
   */
  checkTakeProfit(position: Position, currentPrice: number): {
    shouldSell: boolean;
    reason: string;
    exitPercent: number;
  }[] {
    const results: { shouldSell: boolean; reason: string; exitPercent: number }[] = [];
    const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice;

    for (const tier of this.config.trading.takeProfitTiers) {
      const level = position.takeProfitLevels.find(l => l.threshold === tier.threshold);
      
      if (level && !level.triggered && pnlPercent >= tier.threshold) {
        results.push({
          shouldSell: true,
          reason: `Take profit at ${tier.threshold * 100}%`,
          exitPercent: tier.exitPercent,
        });
        level.triggered = true;
      }
    }

    return results;
  }

  /**
   * Calculate portfolio risk metrics
   */
  calculatePortfolioRisk(): {
    totalExposure: number;
    maxExposure: number;
    diversification: number;
    correlationRisk: number;
  } {
    const totalExposure = this.portfolio.positions.reduce(
      (sum, pos) => sum + pos.valueUsd,
      0
    );

    const maxExposure = this.config.trading.maxPositions * 
      (this.portfolio.totalValueUsd * this.config.trading.maxPositionSize);

    // Diversification based on number of positions
    const diversification = this.portfolio.positions.length / this.config.trading.maxPositions;

    // Simplified correlation risk (in production, calculate actual correlations)
    const correlationRisk = this.portfolio.positions.length > 1 ? 0.5 : 0;

    return {
      totalExposure,
      maxExposure,
      diversification,
      correlationRisk,
    };
  }

  /**
   * Check if we can open new position
   */
  canOpenPosition(): { allowed: boolean; reason: string } {
    // Check max positions
    if (this.portfolio.positions.length >= this.config.trading.maxPositions) {
      return {
        allowed: false,
        reason: 'Max positions reached',
      };
    }

    // Check cash available
    const minPositionValue = this.portfolio.cashUsd * this.config.trading.maxPositionSize;
    if (minPositionValue < 10) { // Min $10 position
      return {
        allowed: false,
        reason: 'Insufficient cash for minimum position',
      };
    }

    // Check portfolio risk
    const risk = this.calculatePortfolioRisk();
    if (risk.totalExposure / risk.maxExposure > 0.8) {
      return {
        allowed: false,
        reason: 'Portfolio risk too high',
      };
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Update portfolio after trade
   */
  updatePortfolioPnL(pnl: number, isWin: boolean): void {
    this.portfolio.dailyPnL += pnl;
    this.portfolio.totalPnL += pnl;

    // Update win rate
    const totalTrades = this.portfolio.positions.length;
    if (totalTrades > 0) {
      const wins = this.portfolio.positions.filter(p => 
        (p.valueUsd - p.entryTime.getTime()) > 0
      ).length;
      this.portfolio.winRate = wins / totalTrades;
    }
  }

  /**
   * Get current portfolio state
   */
  getPortfolio(): Portfolio {
    this.portfolio.totalValueUsd = this.portfolio.cashUsd + 
      this.portfolio.positions.reduce((sum, p) => sum + p.valueUsd, 0);
    
    return this.portfolio;
  }

  /**
   * Calculate volatility from price history
   */
  calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.5; // Default high volatility

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Emergency circuit breaker
   */
  checkCircuitBreaker(): { triggered: boolean; reason: string } {
    const maxDailyLoss = this.portfolio.totalValueUsd * 0.10; // 10% max daily loss
    
    if (this.portfolio.dailyPnL <= -maxDailyLoss) {
      return {
        triggered: true,
        reason: 'Daily loss limit reached (10%)',
      };
    }

    return { triggered: false, reason: '' };
  }
}
