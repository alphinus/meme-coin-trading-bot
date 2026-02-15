"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
exports.reloadConfig = reloadConfig;
// Configuration Loader
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
let config = null;
function loadConfig(configPath) {
    if (config)
        return config;
    const defaultPath = path.join(__dirname, '../../config/config.yaml');
    const filePath = configPath || defaultPath;
    if (!fs.existsSync(filePath)) {
        throw new Error(`Config file not found: ${filePath}`);
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    config = yaml.parse(fileContents);
    // Validate required fields
    validateConfig(config);
    return config;
}
function getConfig() {
    if (!config) {
        return loadConfig();
    }
    return config;
}
function validateConfig(config) {
    // Validate Solana config
    if (!config.solana?.rpc?.length) {
        throw new Error('At least one RPC endpoint is required');
    }
    // Validate trading parameters
    if (config.trading.maxPositionSize > 0.5) {
        throw new Error('maxPositionSize cannot exceed 50%');
    }
    if (config.trading.stopLoss > 0.5) {
        throw new Error('stopLoss cannot exceed 50%');
    }
    // Validate ML config
    if (config.ml.enabled && !config.ml.modelPath) {
        throw new Error('ML model path is required when ML is enabled');
    }
    console.log('✓ Configuration validated');
}
function reloadConfig() {
    config = null;
    return loadConfig();
}
//# sourceMappingURL=index.js.map