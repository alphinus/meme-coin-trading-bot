// Token Scoring Module - Risk Assessment & Trade Signal Generation
import { TokenMetadata, TokenScore, ScoreFactor, TradeSignal, Config } from '../types';
import { getConfig } from '../config';

export class TokenScorer {
  private config: Config;

  constructor() {
    this.config = getConfig();
  }

  /**
   * Calculate comprehensive token score
   */
  async scoreToken(
    token: TokenMetadata,
    mlProbability?: number,
    sentimentScore?: number
  ): Promise<TokenScore> {
    const factors: ScoreFactor[] = [];

    // 1. Liquidity Score (0-100)
    const liquidityScore = this.calculateLiquidityScore(token);
    factors.push({
      name: 'liquidity',
      value: liquidityScore,
      weight: 0.25,
      description: `Liquidity score based on USD value`,
    });

    // 2. Holder Distribution Score (0-100)
    const holderScore = this.calculateHolderScore(token);
    factors.push({
      name: 'holder_distribution',
      value: holderScore,
      weight: 0.20,
      description: 'Score based on holder concentration',
    });

    // 3. Security Score (0-100)
    const securityScore = this.calculateSecurityScore(token);
    factors.push({
      name: 'security',
      value: securityScore,
      weight: 0.20,
      description: 'Security factors (mint revoked, etc.)',
    });

    // 4. Social Score (0-100)
    const socialScore = await this.calculateSocialScore(token);
    factors.push({
      name: 'social',
      value: socialScore,
      weight: 0.15,
      description: 'Social media presence and engagement',
    });

    // 5. ML Probability Score (0-100)
    const mlScore = (mlProbability || 0.5) * 100;
    factors.push({
      name: 'ml_prediction',
      value: mlScore,
      weight: 0.10,
      description: 'Machine learning success probability',
    });

    // 6. Sentiment Score (-100 to 100 -> 0-100)
    const sentimentNormalized = ((sentimentScore || 0) + 1) * 50;
    factors.push({
      name: 'sentiment',
      value: sentimentNormalized,
      weight: 0.10,
      description: 'Social sentiment score',
    });

    // Calculate total weighted score
    const totalScore = factors.reduce(
      (sum, factor) => sum + factor.value * factor.weight,
      0
    );

    // Calculate risk score (inverse of quality)
    const riskScore = this.calculateRiskScore(token, factors);

    return {
      tokenAddress: token.token.address,
      totalScore,
      mlProbability: mlProbability || 0,
      sentimentScore: sentimentScore || 0,
      riskScore,
      factors,
    };
  }

  /**
   * Generate trade signal from scored token
   */
  generateSignal(
    token: TokenMetadata,
    score: TokenScore
  ): TradeSignal | null {
    const reasons: string[] = [];

    // Check each factor for positive indicators
    score.factors.forEach((factor) => {
      if (factor.value >= 70 && factor.name === 'liquidity') {
        reasons.push(`High liquidity: $${token.liquidity.toLocaleString()}`);
      }
      if (factor.value >= 70 && factor.name === 'holder_distribution') {
        reasons.push('Well distributed holders');
      }
      if (factor.value >= 70 && factor.name === 'security') {
        reasons.push('Strong security (mint revoked, etc.)');
      }
      if (factor.value >= 50 && factor.name === 'social') {
        reasons.push('Strong social presence');
      }
    });

    // Only generate signal if score is above threshold
    const threshold = 50;
    if (score.totalScore < threshold) {
      return null;
    }

    return {
      token,
      score: score.totalScore,
      probability: score.mlProbability,
      reasons,
      timestamp: new Date(),
    };
  }

  private calculateLiquidityScore(token: TokenMetadata): number {
    const minLiquidity = this.config.trading.minLiquidity;
    const goodLiquidity = minLiquidity * 10; // $50k is good

    if (token.liquidity >= goodLiquidity) return 100;
    if (token.liquidity >= minLiquidity) {
      return ((token.liquidity - minLiquidity) / (goodLiquidity - minLiquidity)) * 100;
    }
    return 0;
  }

  private calculateHolderScore(token: TokenMetadata): number {
    const top10Percent = token.top10HolderPercent;

    // Ideally top 10 holders should be less than 50%
    if (top10Percent <= 30) return 100;
    if (top10Percent <= 50) return 80;
    if (top10Percent <= 70) return 50;
    if (top10Percent <= 90) return 20;
    return 0;
  }

  private calculateSecurityScore(token: TokenMetadata): number {
    let score = 50; // Base score

    // Mint authority revoked
    if (token.isMintRevoked) score += 25;

    // Freeze authority revoked
    if (token.isFreezeRevoked) score += 15;

    // Liquidity burned
    if (token.isLiquidityBurned) score += 10;

    return Math.min(score, 100);
  }

  private async calculateSocialScore(token: TokenMetadata): Promise<number> {
    let score = 50; // Base score

    if (token.social?.twitter) {
      if (token.social.twitter.followers && token.social.twitter.followers > 1000) {
        score += 25;
      }
      if (token.social.twitter.tweetVelocity && token.social.twitter.tweetVelocity > 5) {
        score += 15;
      }
    }

    if (token.social?.telegram) {
      if (token.social.telegram.members && token.social.telegram.members > 500) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  private calculateRiskScore(token: TokenMetadata, factors: ScoreFactor[]): number {
    // Inverse of positive factors
    let risk = 50;

    // High holder concentration
    if (token.top10HolderPercent > 80) risk += 30;

    // Mutable mint authority
    if (!token.isMintRevoked) risk += 20;

    // Low liquidity
    const liquidityFactor = factors.find((f) => f.name === 'liquidity');
    if (liquidityFactor && liquidityFactor.value < 30) risk += 15;

    // No social presence
    const socialFactor = factors.find((f) => f.name === 'social');
    if (socialFactor && socialFactor.value < 30) risk += 10;

    return Math.min(risk, 100);
  }

  /**
   * Quick filter for must-have criteria
   */
  passesMustHave(token: TokenMetadata): { passes: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (token.liquidity < this.config.trading.minLiquidity) {
      reasons.push(`Insufficient liquidity: $${token.liquidity} < $${this.config.trading.minLiquidity}`);
    }

    if (token.marketCap < this.config.trading.minMarketCap) {
      reasons.push(`Insufficient market cap: $${token.marketCap} < $${this.config.trading.minMarketCap}`);
    }

    return {
      passes: reasons.length === 0,
      reasons,
    };
  }
}
