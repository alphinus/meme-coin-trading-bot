import { EventEmitter } from 'events';
export declare class PumpFunMonitor extends EventEmitter {
    private ws;
    private config;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private isConnected;
    constructor();
    start(): Promise<void>;
    private connect;
    private handleMessage;
    private processNewToken;
    private fetchTokenInfo;
    private validateToken;
    private reconnect;
    stop(): void;
    isActive(): boolean;
}
//# sourceMappingURL=pumpfun.d.ts.map