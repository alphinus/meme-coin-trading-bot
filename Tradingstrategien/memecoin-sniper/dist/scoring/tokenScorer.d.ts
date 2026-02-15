import { TokenMetadata, TokenScore, TradeSignal } from '../types';
export declare class TokenScorer {
    private config;
    constructor();
    /**
     * Calculate comprehensive token score
     */
    scoreToken(token: TokenMetadata, mlProbability?: number, sentimentScore?: number): Promise<TokenScore>;
    /**
     * Generate trade signal from scored token
     */
    generateSignal(token: TokenMetadata, score: TokenScore): TradeSignal | null;
    private calculateLiquidityScore;
    private calculateHolderScore;
    private calculateSecurityScore;
    private calculateSocialScore;
    private calculateRiskScore;
    /**
     * Quick filter for must-have criteria
     */
    passesMustHave(token: TokenMetadata): {
        passes: boolean;
        reasons: string[];
    };
}
//# sourceMappingURL=tokenScorer.d.ts.map