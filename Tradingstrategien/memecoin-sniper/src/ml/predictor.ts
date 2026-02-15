// ML Prediction Module - Token Success Probability
import { TokenMetadata, Config } from '../types';
import { getConfig } from '../config';

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
  factors: { name: string; impact: number }[];
}

export class MLPredictor {
  private config: Config;
  private modelLoaded = false;
  private featureWeights: Record<string, number>;

  constructor() {
    this.config = getConfig();
    
    // Default feature weights (can be replaced with trained model)
    this.featureWeights = {
      liquidity_ratio: 0.20,
      holder_concentration: 0.15,
      buy_sell_ratio_1min: 0.15,
      volume_acceleration: 0.15,
      tweet_velocity: 0.10,
      sentiment_score: 0.10,
      influencer_mentions: 0.05,
      community_growth: 0.05,
      mint_revoked: 0.03,
      liquidity_burned: 0.02,
    };
  }

  /**
   * Initialize ML model (placeholder for actual model loading)
   */
  async initialize(): Promise<void> {
    if (!this.config.ml.enabled) {
      console.log('⚠ ML prediction disabled in config');
      return;
    }

    console.log('🤖 Initializing ML Predictor...');
    
    // In production, load actual model here:
    // this.model = await loadModel(this.config.ml.modelPath);
    
    this.modelLoaded = true;
    console.log('✓ ML Predictor initialized');
  }

  /**
   * Predict success probability for a token
   */
  async predict(token: TokenMetadata, liveFeatures?: Partial<PredictionFeatures>): Promise<PredictionResult> {
    if (!this.modelLoaded) {
      // Return default prediction if model not loaded
      return this.getDefaultPrediction();
    }

    // Extract features from token
    const features = this.extractFeatures(token, liveFeatures);

    // Calculate weighted prediction
    let probability = 0;
    const factors: { name: string; impact: number }[] = [];

    for (const [featureName, weight] of Object.entries(this.featureWeights)) {
      const featureValue = features[featureName as keyof PredictionFeatures] || 0;
      const impact = featureValue * weight;
      probability += impact;

      factors.push({
        name: featureName,
        impact: impact * 100, // Convert to percentage
      });
    }

    // Normalize to 0-1 range
    probability = Math.max(0, Math.min(1, probability));

    // Calculate confidence based on feature completeness
    const confidence = this.calculateConfidence(features);

    return {
      probability,
      confidence,
      factors: factors.sort((a, b) => b.impact - a.impact),
    };
  }

  /**
   * Extract features from token metadata
   */
  private extractFeatures(
    token: TokenMetadata,
    liveFeatures?: Partial<PredictionFeatures>
  ): PredictionFeatures {
    // Liquidity ratio (liquidity / market cap)
    const liquidity_ratio = token.marketCap > 0 
      ? token.liquidity / token.marketCap 
      : 0;

    // Holder concentration (inverse - lower is better)
    const holder_concentration = Math.min(100, token.top10HolderPercent);

    // Use live features if available, otherwise defaults
    const buy_sell_ratio_1min = liveFeatures?.buy_sell_ratio_1min ?? 1.0;
    const volume_acceleration = liveFeatures?.volume_acceleration ?? 0;
    const tweet_velocity = liveFeatures?.tweet_velocity ?? 0;
    const sentiment_score = liveFeatures?.sentiment_score ?? 0;
    const influencer_mentions = liveFeatures?.influencer_mentions ?? 0;
    const community_growth = liveFeatures?.community_growth ?? 0;

    // Security features
    const mint_revoked = token.isMintRevoked ? 1 : 0;
    const liquidity_burned = token.isLiquidityBurned ? 1 : 0;

    return {
      liquidity_ratio: Math.min(1, liquidity_ratio * 10), // Scale up
      holder_concentration: 100 - holder_concentration, // Invert - lower is better
      buy_sell_ratio_1min: Math.min(2, buy_sell_ratio_1min),
      volume_acceleration: Math.min(1, volume_acceleration / 10),
      tweet_velocity: Math.min(1, tweet_velocity / 20),
      sentiment_score: (sentiment_score + 1) / 2, // Normalize -1 to 1 -> 0 to 1
      influencer_mentions: Math.min(1, influencer_mentions / 10),
      community_growth: Math.min(1, community_growth / 100),
      mint_revoked,
      liquidity_burned,
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(features: PredictionFeatures): number {
    // Confidence based on data completeness
    let dataPoints = 0;
    let totalPoints = 10;

    if (features.liquidity_ratio > 0) dataPoints++;
    if (features.holder_concentration > 0) dataPoints++;
    if (features.buy_sell_ratio_1min !== 1.0) dataPoints++;
    if (features.volume_acceleration > 0) dataPoints++;
    if (features.tweet_velocity > 0) dataPoints++;
    if (features.sentiment_score !== 0.5) dataPoints++;
    if (features.influencer_mentions > 0) dataPoints++;
    if (features.community_growth > 0) dataPoints++;
    if (features.mint_revoked > 0) dataPoints++;
    if (features.liquidity_burned > 0) dataPoints++;

    return dataPoints / totalPoints;
  }

  /**
   * Default prediction when model not available
   */
  private getDefaultPrediction(): PredictionResult {
    // Use rule-based default
    return {
      probability: 0.5,
      confidence: 0.3,
      factors: [
        { name: 'default', impact: 50 },
      ],
    };
  }

  /**
   * Check if prediction meets threshold
   */
  meetsThreshold(probability: number): boolean {
    return probability >= this.config.ml.probabilityThreshold;
  }

  /**
   * Train/update model with new data (placeholder)
   */
  async train(historicalData: any[]): Promise<void> {
    console.log(`📊 Training ML model with ${historicalData.length} samples...`);
    
    // In production:
    // 1. Prepare training data
    // 2. Train XGBoost/RandomForest model
    // 3. Validate on holdout set
    // 4. Save model to disk
    
    console.log('✓ Model training complete');
  }
}
