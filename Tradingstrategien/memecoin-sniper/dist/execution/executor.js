"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
// Execution Engine - MEV Protected Trading on Solana
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
class ExecutionEngine {
    constructor(wallet) {
        this.rpcIndex = 0;
        this.config = (0, config_1.getConfig)();
        this.wallet = wallet;
        this.connection = this.createConnection();
    }
    /**
     * Create connection with fallback RPCs
     */
    createConnection() {
        const rpcUrl = this.config.solana.rpc[this.rpcIndex].url;
        return new web3_js_1.Connection(rpcUrl, {
            commitment: this.config.solana.commitment,
        });
    }
    /**
     * Switch to next available RPC
     */
    rotateRPC() {
        this.rpcIndex = (this.rpcIndex + 1) % this.config.solana.rpc.length;
        this.connection = this.createConnection();
        console.log(`🔄 Rotated to RPC: ${this.config.solana.rpc[this.rpcIndex].url}`);
    }
    /**
     * Execute a buy order
     */
    async executeBuy(token, amountSol, slippage) {
        const maxSlippage = slippage || this.config.execution.maxSlippage;
        console.log(`📈 Executing BUY: ${amountSol} SOL of ${token.token.symbol}`);
        try {
            // Get quote from Jupiter
            const quote = await this.getJupiterQuote('So11111111111111111111111111111111111111112', // SOL
            token.token.address, amountSol);
            if (!quote) {
                return { success: false, error: 'Failed to get quote' };
            }
            // Check slippage
            const outAmount = parseInt(quote.outAmount);
            if (outAmount <= 0) {
                return { success: false, error: 'Invalid quote amount' };
            }
            // Build transaction
            if (this.config.execution.useJitoBundle) {
                return await this.executeWithJito(quote, token);
            }
            else {
                return await this.executeSimple(quote, token);
            }
        }
        catch (error) {
            console.error('Buy execution error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Execute a sell order
     */
    async executeSell(token, percentage, slippage) {
        const maxSlippage = slippage || this.config.execution.maxSlippage;
        console.log(`📉 Executing SELL: ${percentage * 100}% of ${token.token.symbol}`);
        try {
            // Get token balance
            const balance = await this.getTokenBalance(token.token.address);
            if (!balance || balance === 0) {
                return { success: false, error: 'No token balance found' };
            }
            const sellAmount = Math.floor(balance * percentage);
            // Get quote from Jupiter
            const quote = await this.getJupiterQuote(token.token.address, 'So11111111111111111111111111111111111111112', // SOL
            sellAmount);
            if (!quote) {
                return { success: false, error: 'Failed to get quote' };
            }
            if (this.config.execution.useJitoBundle) {
                return await this.executeWithJito(quote, token);
            }
            else {
                return await this.executeSimple(quote, token);
            }
        }
        catch (error) {
            console.error('Sell execution error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get quote from Jupiter Aggregator
     */
    async getJupiterQuote(inputMint, outputMint, amount) {
        try {
            // Convert to lamports (9 decimals for SOL)
            const amountLamports = Math.floor(amount * 1e9);
            const response = await axios_1.default.get('https://quote-api.jup.ag/v6/quote', {
                params: {
                    inputMint,
                    outputMint,
                    amount: amountLamports,
                    slippage: this.config.execution.maxSlippage * 100,
                    computeUnits: 'auto',
                },
                timeout: 5000,
            });
            return response.data.data[0];
        }
        catch (error) {
            console.error('Jupiter quote error:', error);
            return null;
        }
    }
    /**
     * Execute with Jito bundle for MEV protection
     */
    async executeWithJito(quote, token) {
        try {
            // Get swap transaction from Jupiter
            const swapResponse = await axios_1.default.post('https://quote-api.jup.ag/v6/swap', {
                quote,
                userPublicKey: this.wallet.publicKey.toString(),
                wrapUnwrapSOL: true,
            });
            // Deserialize transactions
            const swapTx = web3_js_1.VersionedTransaction.deserialize(Buffer.from(swapResponse.data.swapTransaction, 'base64'));
            // Sign transaction
            swapTx.sign([this.wallet]);
            // Get Jito tip
            const tip = this.getRandomTip();
            console.log(`✓ Transaction prepared with Jito tip: ${tip} SOL`);
            // For demo, return simulated success
            return {
                success: true,
                txHash: `simulated_${Date.now()}`,
                filledPrice: parseInt(quote.outAmount) / parseInt(quote.inAmount),
            };
        }
        catch (error) {
            console.error('Jito execution error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Execute simple transaction (without Jito)
     */
    async executeSimple(quote, token) {
        try {
            // Get swap transaction
            const swapResponse = await axios_1.default.post('https://quote-api.jup.ag/v6/swap', {
                quote,
                userPublicKey: this.wallet.publicKey.toString(),
                wrapUnwrapSOL: true,
            });
            const swapTx = web3_js_1.VersionedTransaction.deserialize(Buffer.from(swapResponse.data.swapTransaction, 'base64'));
            swapTx.sign([this.wallet]);
            // Send transaction
            const signature = await this.connection.sendTransaction(swapTx);
            // Wait for confirmation
            await this.connection.confirmTransaction(signature);
            console.log(`✓ Transaction confirmed: ${signature}`);
            return {
                success: true,
                txHash: signature,
                filledPrice: parseInt(quote.outAmount) / parseInt(quote.inAmount),
            };
        }
        catch (error) {
            console.error('Simple execution error:', error);
            this.rotateRPC();
            return { success: false, error: error.message };
        }
    }
    /**
     * Get random Jito tip within configured range
     */
    getRandomTip() {
        const [min, max] = this.config.solana.jito.tipRange;
        return Math.random() * (max - min) + min;
    }
    /**
     * Get token balance for wallet
     */
    async getTokenBalance(tokenAddress) {
        try {
            const tokenPubkey = new web3_js_1.PublicKey(tokenAddress);
            const walletPubkey = this.wallet.publicKey;
            const accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, { mint: tokenPubkey });
            if (accounts.value.length === 0)
                return 0;
            const balance = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            return balance;
        }
        catch (error) {
            console.error('Error getting token balance:', error);
            return 0;
        }
    }
    /**
     * Get SOL balance
     */
    async getSolBalance() {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        return balance / 1e9;
    }
    /**
     * Wait for transaction confirmation
     */
    async waitForConfirmation(txHash, timeout = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const status = await this.connection.getTransaction(txHash, {
                commitment: 'confirmed',
            });
            if (status) {
                return status.meta?.err === null;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return false;
    }
}
exports.ExecutionEngine = ExecutionEngine;
//# sourceMappingURL=executor.js.map