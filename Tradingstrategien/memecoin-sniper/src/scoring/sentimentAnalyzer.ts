// Sentiment Analysis Module - Social Media Sentiment Scoring
import { EventEmitter } from 'events';
import axios from 'axios';
import { Config, TokenMetadata } from '../types';
import { getConfig } from '../config';

export interface SentimentResult {
  score: number; // -1 to 1
  mentions: number;
  keywords: string[];
  influencers: string[];
  timestamp: Date;
}

export class SentimentAnalyzer extends EventEmitter {
  private config: Config;
  private keywordCache: Map<string, SentimentResult> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.config = getConfig();
  }

  /**
   * Start continuous sentiment monitoring
   */
  start(): void {
    if (!this.config.sentiment.enabled) {
      console.log('⚠ Sentiment analysis disabled in config');
      return;
    }

    console.log('📡 Starting sentiment analysis...');

    // Start periodic updates
    this.updateInterval = setInterval(() => {
      this.updateSentimentData();
    }, this.config.sentiment.updateInterval);

    console.log('✓ Sentiment analyzer started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('✓ Sentiment analyzer stopped');
  }

  /**
   * Analyze sentiment for a specific token
   */
  async analyzeToken(token: TokenMetadata): Promise<SentimentResult> {
    const keywords = [
      token.token.symbol.toLowerCase(),
      token.token.name.toLowerCase().split(' ')[0],
      `$${token.token.symbol.toLowerCase()}`,
    ];

    // Check cache first
    const cacheKey = token.token.address;
    const cached = this.keywordCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp.getTime() < 300000) { // 5 min cache
      return cached;
    }

    // Fetch fresh sentiment data
    const result = await this.fetchSentiment(keywords);
    
    // Cache result
    this.keywordCache.set(cacheKey, result);

    return result;
  }

  /**
   * Analyze general memecoin sentiment
   */
  async getGeneralSentiment(): Promise<SentimentResult> {
    const keywords = ['memecoin', 'solana', 'pump', 'new token', 'fair launch'];
    return this.fetchSentiment(keywords);
  }

  /**
   * Fetch sentiment data from Twitter/Discord
   */
  private async fetchSentiment(keywords: string[]): Promise<SentimentResult> {
    // Default neutral sentiment
    let totalScore = 0;
    let mentionCount = 0;
    const foundKeywords: string[] = [];
    const influencers: string[] = [];

    // In production, integrate with actual APIs:
    // 1. Twitter API v2 for tweets
    // 2. Discord/Telegram for community sentiment
    // 3. News APIs for media sentiment

    // For now, simulate based on keywords found
    if (this.config.social.twitter.enabled) {
      try {
        const tweets = await this.fetchRecentTweets(keywords);
        
        for (const tweet of tweets) {
          mentionCount++;
          const tweetScore = this.analyzeTweetSentiment(tweet);
          totalScore += tweetScore;

          // Check for influencer mentions
          if (tweet.followers_count > 10000) {
            influencers.push(tweet.username);
          }
        }

        foundKeywords.push(...keywords.filter(k => 
          tweets.some(t => t.text.toLowerCase().includes(k))
        ));

      } catch (error) {
        console.error('Error fetching tweets:', error);
      }
    }

    // Calculate final score (-1 to 1)
    const score = mentionCount > 0 ? totalScore / mentionCount : 0;

    return {
      score: Math.max(-1, Math.min(1, score)),
      mentions: mentionCount,
      keywords: foundKeywords,
      influencers: [...new Set(influencers)], // Remove duplicates
      timestamp: new Date(),
    };
  }

  /**
   * Fetch recent tweets containing keywords
   */
  private async fetchRecentTweets(keywords: string[]): Promise<any[]> {
    // Placeholder - in production use Twitter API
    // This would call: https://api.twitter.com/2/tweets/search/recent
    
    const apiKey = this.config.social.twitter?.apiKey;
    
    if (!apiKey) {
      console.log('⚠ Twitter API key not configured');
      return [];
    }

    try {
      // Example Twitter API call structure
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        params: {
          'query': keywords.join(' OR '),
          'max_results': 100,
          'tweet.fields': 'public_metrics,author_id',
        },
      });

      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze individual tweet sentiment
   * Uses a simple keyword-based approach (can be replaced with ML model)
   */
  private analyzeTweetSentiment(tweet: any): number {
    const text = tweet.text.toLowerCase();
    
    const bullishKeywords = [
      'moon', 'pump', 'gem', 'bull', 'buy', 'long', 'green',
      'to the moon', 'lets go', 'winner', 'profit', 'gain',
      'just launched', 'fair launch', 'no presale', 'safe',
    ];

    const bearishKeywords = [
      'dump', 'scam', 'rug', 'sell', 'short', 'red',
      'liquidity', 'honeypot', 'danger', 'warning', 'avoid',
      'rug pull', 'mistake', 'lost', 'rugged',
    ];

    let score = 0;

    for (const keyword of bullishKeywords) {
      if (text.includes(keyword)) score += 0.2;
    }

    for (const keyword of bearishKeywords) {
      if (text.includes(keyword)) score -= 0.2;
    }

    // Clamp to -1 to 1
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Update sentiment data periodically
   */
  private async updateSentimentData(): Promise<void> {
    try {
      const generalSentiment = await this.getGeneralSentiment();
      this.emit('sentimentUpdate', generalSentiment);
    } catch (error) {
      console.error('Error updating sentiment data:', error);
    }
  }

  /**
   * Get sentiment trend for a token
   */
  async getSentimentTrend(tokenAddress: string): Promise<{
    current: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    // In production, track historical sentiment
    // For now, return current sentiment with simulated trend
    
    const current = (await this.getGeneralSentiment()).score;
    
    return {
      current,
      change: 0,
      trend: 'stable',
    };
  }
}
