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

export class TransferAgentConfig {
    readonly authUrl: string;
    readonly ledgerUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly fairmintPartyId: string;
    readonly fairmintUserId: string;
    readonly audience: string;

    constructor(isMainnet: boolean = false) {
        this.authUrl = process.env.AUTH_URL || '';
        if (!this.authUrl) {
            throw new Error('AUTH_URL environment variable is not set');
        }
        this.ledgerUrl = process.env.LEDGER_API_URL || '';
        if (!this.ledgerUrl) {
            throw new Error('LEDGER_API_URL environment variable is not set');
        }
        this.audience = process.env.AUDIENCE || ''; // Optional field
        this.clientId = process.env.CLIENT_ID || '';
        if (!this.clientId) {
            throw new Error('CLIENT_ID environment variable is not set');
        }
        this.clientSecret = process.env.CLIENT_SECRET || '';
        if (!this.clientSecret) {
            throw new Error('CLIENT_SECRET environment variable is not set');
        }

        this.fairmintPartyId = process.env.FAIRMINT_PARTY_ID || ''; // Optional field
        this.fairmintUserId = process.env.FAIRMINT_USER_ID || ''; // Optional field
    }
}
