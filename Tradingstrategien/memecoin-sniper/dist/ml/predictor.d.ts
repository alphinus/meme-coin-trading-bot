import { TokenMetadata } from '../types';
export interface PredictionFeatures {
    liquidity_ratio: number;
    holder_concentration: number;
    buy_sell_ratio_1min: number;
    volume_acceleration: number;
    tweet_velocity: number;
    sentiment_score: number;
    influencer_mentions: number;
    community_growth: number;
    mint_revoked: number;
    liquidity_burned: number;
}
export interface PredictionResult {
    probability: number;
    confidence: number;
    factors: {
        name: string;
        impact: number;
    }[];
}
export declare class MLPredictor {
    private config;
    private modelLoaded;
    private featureWeights;
    constructor();
    /**
     * Initialize ML model (placeholder for actual model loading)
     */
    initialize(): Promise<void>;
    /**
     * Predict success probability for a token
     */
    predict(token: TokenMetadata, liveFeatures?: Partial<PredictionFeatures>): Promise<PredictionResult>;
    /**
     * Extract features from token metadata
     */
    private extractFeatures;
    /**
     * Calculate prediction confidence
     */
    private calculateConfidence;
    /**
     * Default prediction when model not available
     */
    private getDefaultPrediction;
    /**
     * Check if prediction meets threshold
     */
    meetsThreshold(probability: number): boolean;
    /**
     * Train/update model with new data (placeholder)
     */
    train(historicalData: any[]): Promise<void>;
}
//# sourceMappingURL=predictor.d.ts.map