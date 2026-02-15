import { EventEmitter } from 'events';
import { TokenMetadata } from '../types';
export interface SentimentResult {
    score: number;
    mentions: number;
    keywords: string[];
    influencers: string[];
    timestamp: Date;
}
export declare class SentimentAnalyzer extends EventEmitter {
    private config;
    private keywordCache;
    private updateInterval;
    constructor();
    /**
     * Start continuous sentiment monitoring
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Analyze sentiment for a specific token
     */
    analyzeToken(token: TokenMetadata): Promise<SentimentResult>;
    /**
     * Analyze general memecoin sentiment
     */
    getGeneralSentiment(): Promise<SentimentResult>;
    /**
     * Fetch sentiment data from Twitter/Discord
     */
    private fetchSentiment;
    /**
     * Fetch recent tweets containing keywords
     */
    private fetchRecentTweets;
    /**
     * Analyze individual tweet sentiment
     * Uses a simple keyword-based approach (can be replaced with ML model)
     */
    private analyzeTweetSentiment;
    /**
     * Update sentiment data periodically
     */
    private updateSentimentData;
    /**
     * Get sentiment trend for a token
     */
    getSentimentTrend(tokenAddress: string): Promise<{
        current: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
    }>;
}
//# sourceMappingURL=sentimentAnalyzer.d.ts.map