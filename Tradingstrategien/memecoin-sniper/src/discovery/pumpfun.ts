// Pump.fun Discovery Module
import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
import { TokenMetadata, NewTokenEvent, Config } from '../types';
import { getConfig } from '../config';

export class PumpFunMonitor extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Config;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;

  constructor() {
    super();
    this.config = getConfig();
  }

  async start(): Promise<void> {
    if (!this.config.discovery.pumpfun.enabled) {
      console.log('⚠ Pump.fun monitoring disabled in config');
      return;
    }

    console.log('🔌 Connecting to Pump.fun WebSocket...');
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const wsEndpoint = 'wss://pumpportal.fun/api/data';

      this.ws = new WebSocket(wsEndpoint);

      this.ws.on('open', () => {
        console.log('✓ Connected to Pump.fun WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Subscribe to new token events
        this.ws?.send(JSON.stringify({
          method: 'subscribeNewToken',
        }));
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing Pump.fun message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('✗ Pump.fun WebSocket disconnected');
        this.isConnected = false;
        this.reconnect();
      });

      this.ws.on('error', (error: any) => {
        console.error('Pump.fun WebSocket error:', error.message);
      });

    } catch (error) {
      console.error('Failed to connect to Pump.fun:', error);
      this.reconnect();
    }
  }

  private handleMessage(message: any): void {
    if (message.method === 'newToken') {
      this.processNewToken(message.data);
    }
  }

  private async processNewToken(data: any): Promise<void> {
    try {
      const tokenInfo = await this.fetchTokenInfo(data.tokenAddress);

      if (!tokenInfo) {
        console.log(`⚠ Could not fetch info for token: ${data.tokenAddress}`);
        return;
      }

      if (!this.validateToken(tokenInfo)) {
        console.log(`❌ Token validation failed`);
        return;
      }

      console.log(`🎯 NEW TOKEN DETECTED: ${tokenInfo.token.name} (${tokenInfo.token.symbol})`);
      console.log(`   Liquidity: $${tokenInfo.liquidity.toLocaleString()}`);
      console.log(`   Market Cap: $${tokenInfo.marketCap.toLocaleString()}`);

      const event: NewTokenEvent = {
        token: tokenInfo,
        source: 'pumpfun',
        timestamp: new Date(),
      };

      this.emit('newToken', event);

    } catch (error) {
      console.error('Error processing new token:', error);
    }
  }

  private async fetchTokenInfo(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      const birdeyeUrl = 'https://public-api.birdeye.so/public/token_meta';
      const response = await axios.get(birdeyeUrl, {
        params: { address: tokenAddress },
        headers: {
          'x-api-key': this.config.discovery.birdeye?.apiKey || '',
        },
        timeout: 5000,
      });

      const data = response.data.data;

      return {
        token: {
          address: tokenAddress,
          symbol: data.symbol || 'UNKNOWN',
          name: data.name || 'Unknown Token',
          decimals: data.decimals || 9,
          mintAuthority: data.mint_authority,
          freezeAuthority: data.freeze_authority,
          isMutable: data.is_mutable || true,
          supply: data.supply || 0,
        },
        price: data.price || 0,
        liquidity: data.liquidity?.usd || 0,
        marketCap: data.mc || 0,
        volume24h: data.v24h || 0,
        holders: data.holder || 0,
        top10HolderPercent: 0,
        isMintRevoked: !data.mint_authority,
        isFreezeRevoked: !data.freeze_authority,
        isLiquidityBurned: false,
        createdAt: new Date(),
      };

    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);
      return null;
    }
  }

  private validateToken(token: TokenMetadata): boolean {
    if (token.liquidity < this.config.trading.minLiquidity) {
      return false;
    }
    if (token.marketCap < this.config.trading.minMarketCap) {
      return false;
    }
    if (!token.isMintRevoked) {
      console.log(`⚠ Token has mutable mint authority`);
    }
    return true;
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  stop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('✓ Pump.fun monitor stopped');
  }

  isActive(): boolean {
    return this.isConnected;
  }
}
