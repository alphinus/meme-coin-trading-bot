export interface Config {
    system: SystemConfig;
    solana: SolanaConfig;
    trading: TradingConfig;
    discovery: DiscoveryConfig;
    social: SocialConfig;
    ml: MLConfig;
    sentiment: SentimentConfig;
    arbitrage: ArbitrageConfig;
    execution: ExecutionConfig;
    backtest: BacktestConfig;
}
export interface SystemConfig {
    name: string;
    mode: 'development' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export interface SolanaConfig {
    network: 'devnet' | 'testnet' | 'mainnet';
    rpc: RPCEndpoint[];
    jito: JitoConfig;
    commitment: 'processed' | 'confirmed' | 'finalized';
}
export interface RPCEndpoint {
    url: string;
    weight: number;
}
export interface JitoConfig {
    url: string;
    tipRange: [number, number];
}
export interface TradingConfig {
    maxPositionSize: number;
    maxPositions: number;
    minLiquidity: number;
    minMarketCap: number;
    stopLoss: number;
    softStopLoss: number;
    takeProfitTiers: TakeProfitTier[];
}
export interface TakeProfitTier {
    threshold: number;
    exitPercent: number;
}
export interface DiscoveryConfig {
    pumpfun: SourceConfig;
    dexScreener: SourceConfig & {
        apiKey?: string;
    };
    birdeye: SourceConfig & {
        apiKey?: string;
    };
}
export interface SourceConfig {
    enabled: boolean;
}
export interface SocialConfig {
    twitter: TwitterConfig;
    telegram: TelegramConfig;
}
export interface TwitterConfig {
    enabled: boolean;
    apiKey?: string;
    apiSecret?: string;
    keywords: string[];
    minFollowers: number;
}
export interface TelegramConfig {
    enabled: boolean;
    botToken?: string;
    channels: string[];
}
export interface MLConfig {
    enabled: boolean;
    modelPath: string;
    probabilityThreshold: number;
    features: string[];
}
export interface SentimentConfig {
    enabled: boolean;
    model: 'vader' | 'textblob';
    updateInterval: number;
}
export interface ArbitrageConfig {
    enabled: boolean;
    minSpread: number;
    dexPairs: [string, string][];
    maxSlippage: number;
    maxPositionUsd: number;
}
export interface ExecutionConfig {
    useJitoBundle: boolean;
    useFlashbots: boolean;
    maxRetries: number;
    retryDelay: number;
    maxSlippage: number;
    dynamicSlippage: boolean;
}
export interface BacktestConfig {
    initialCapital: number;
    startDate: string;
    endDate: string;
    commission: number;
    slippageBase: number;
    slippageVolMultiplier: number;
}
export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    mintAuthority?: string;
    freezeAuthority?: string;
    isMutable: boolean;
    supply: number;
}
export interface TokenMetadata {
    token: Token;
    price: number;
    liquidity: number;
    marketCap: number;
    volume24h: number;
    holders: number;
    top10HolderPercent: number;
    isMintRevoked: boolean;
    isFreezeRevoked: boolean;
    isLiquidityBurned: boolean;
    social?: SocialMetrics;
    createdAt: Date;
}
export interface SocialMetrics {
    twitter?: TwitterMetrics;
    telegram?: TelegramMetrics;
}
export interface TwitterMetrics {
    handle?: string;
    followers?: number;
    tweetVelocity?: number;
    sentiment?: number;
}
export interface TelegramMetrics {
    groupId?: string;
    members?: number;
    growthRate?: number;
}
export interface TradeSignal {
    token: TokenMetadata;
    score: number;
    probability: number;
    reasons: string[];
    timestamp: Date;
}
export interface Position {
    tokenAddress: string;
    entryPrice: number;
    quantity: number;
    valueUsd: number;
    entryTime: Date;
    stopLoss?: number;
    takeProfitLevels: TakeProfitLevel[];
    status: 'open' | 'closed' | 'liquidated';
}
export interface TakeProfitLevel {
    threshold: number;
    exitPercent: number;
    triggered: boolean;
}
export interface Order {
    tokenAddress: string;
    side: 'buy' | 'sell';
    quantity: number;
    type: 'market' | 'limit' | 'stop';
    price?: number;
    slippage?: number;
}
export interface OrderResult {
    success: boolean;
    txHash?: string;
    filledPrice?: number;
    error?: string;
}
export interface TokenScore {
    tokenAddress: string;
    totalScore: number;
    mlProbability: number;
    sentimentScore: number;
    riskScore: number;
    factors: ScoreFactor[];
}
export interface ScoreFactor {
    name: string;
    value: number;
    weight: number;
    description: string;
}
export interface ArbitrageOpportunity {
    tokenAddress: string;
    buyDex: string;
    sellDex: string;
    buyPrice: number;
    sellPrice: number;
    spread: number;
    maxProfit: number;
    timestamp: Date;
}
export interface Portfolio {
    totalValueUsd: number;
    cashUsd: number;
    positions: Position[];
    dailyPnL: number;
    totalPnL: number;
    winRate: number;
}
export interface NewTokenEvent {
    token: TokenMetadata;
    source: 'pumpfun' | 'dex' | 'social';
    timestamp: Date;
}
export interface PriceUpdateEvent {
    tokenAddress: string;
    price: number;
    volume: number;
    timestamp: Date;
}
export interface TradeExecutedEvent {
    order: Order;
    result: OrderResult;
    timestamp: Date;
}
//# sourceMappingURL=index.d.ts.map