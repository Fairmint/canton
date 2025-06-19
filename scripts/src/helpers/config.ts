import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables with fallback to parent directory
const currentEnvPath = '.env';
const parentEnvPath = path.join('..', '.env');

// Try to load from current directory first
let result = dotenv.config({ path: currentEnvPath });

// If no .env file found in current directory, try parent directory
if (result.error && fs.existsSync(parentEnvPath)) {
    console.log('No .env file found in current directory, loading from parent directory');
    result = dotenv.config({ path: parentEnvPath });
    
    if (result.error) {
        console.warn('Failed to load .env file from parent directory:', result.error.message);
    }
}

export interface ProviderConfig {
    PROVIDER_NAME: string;
    AUTH_URL: string;
    LEDGER_API_URL: string;
    CLIENT_ID: string;
    AUDIENCE: string;
    CLIENT_SECRET: string;
    FAIRMINT_PARTY_ID: string;
    FAIRMINT_USER_ID: string;
}

export class TransferAgentConfig {
    providers: ProviderConfig[];

    constructor() {
        // Parse the PROVIDERS environment variable as JSON
        const providersJson = process.env.PROVIDERS || '[]';
        try {
            this.providers = JSON.parse(providersJson);
        } catch (error) {
            console.error('Failed to parse PROVIDERS environment variable:', error);
            this.providers = [];
        }
    }

    getProviderByName(name: string): ProviderConfig | undefined {
        return this.providers.find(provider => provider.PROVIDER_NAME === name);
    }

    getProviderByIndex(index: number): ProviderConfig | undefined {
        return this.providers[index];
    }

    getAllProviders(): ProviderConfig[] {
        return this.providers;
    }
}
