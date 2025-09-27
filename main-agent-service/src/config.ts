import { config as dotenvConfig } from 'dotenv';
import { ServiceConfig } from './types';

// Load environment variables
dotenvConfig();

export const config: ServiceConfig = {
  mainAgentUrl: process.env.MAIN_AGENT_URL || 'https://pyrex-main-agent.onrender.com/route',
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
};
