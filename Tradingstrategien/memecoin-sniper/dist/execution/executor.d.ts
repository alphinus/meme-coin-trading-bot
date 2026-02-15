import { Keypair } from '@solana/web3.js';
import { OrderResult, TokenMetadata } from '../types';
export declare class ExecutionEngine {
    private config;
    private connection;
    private wallet;
    private rpcIndex;
    constructor(wallet: Keypair);
    /**
     * Create connection with fallback RPCs
     */
    private createConnection;
    /**
     * Switch to next available RPC
     */
    private rotateRPC;
    /**
     * Execute a buy order
     */
    executeBuy(token: TokenMetadata, amountSol: number, slippage?: number): Promise<OrderResult>;
    /**
     * Execute a sell order
     */
    executeSell(token: TokenMetadata, percentage: number, slippage?: number): Promise<OrderResult>;
    /**
     * Get quote from Jupiter Aggregator
     */
    private getJupiterQuote;
    /**
     * Execute with Jito bundle for MEV protection
     */
    private executeWithJito;
    /**
     * Execute simple transaction (without Jito)
     */
    private executeSimple;
    /**
     * Get random Jito tip within configured range
     */
    private getRandomTip;
    /**
     * Get token balance for wallet
     */
    getTokenBalance(tokenAddress: string): Promise<number>;
    /**
     * Get SOL balance
     */
    getSolBalance(): Promise<number>;
    /**
     * Wait for transaction confirmation
     */
    waitForConfirmation(txHash: string, timeout?: number): Promise<boolean>;
}
//# sourceMappingURL=executor.d.ts.map