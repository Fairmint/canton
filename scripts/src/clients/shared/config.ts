import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { ProviderConfigENVFormat } from '.';

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


export class ProviderConfig {
    providers: ProviderConfigENVFormat[];

    constructor() {
        // Parse the PROVIDERS environment variable as JSON
        const providersJson = process.env.CANTON_PROVIDERS || '[]';
        try {
            this.providers = JSON.parse(providersJson);
        } catch (error) {
            console.error('Failed to parse CANTON_PROVIDERS environment variable:', error);
            this.providers = [];
        }
    }

    getProviderByName(name: string): ProviderConfigENVFormat | undefined {
        return this.providers.find(provider => provider.PROVIDER_NAME === name);
    }

    getProviderByIndex(index: number): ProviderConfigENVFormat | undefined {
        return this.providers[index];
    }

    getAllProviders(): ProviderConfigENVFormat[] {
        return this.providers;
    }
}
