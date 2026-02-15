// Configuration Loader
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Config } from '../types';

let config: Config | null = null;

export function loadConfig(configPath?: string): Config {
  if (config) return config;

  const defaultPath = path.join(__dirname, '../../config/config.yaml');
  const filePath = configPath || defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  config = yaml.parse(fileContents) as Config;

  // Validate required fields
  validateConfig(config);

  return config;
}

export function getConfig(): Config {
  if (!config) {
    return loadConfig();
  }
  return config;
}

function validateConfig(config: Config): void {
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

export function reloadConfig(): Config {
  config = null;
  return loadConfig();
}
