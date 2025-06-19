import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class TransferAgentConfig {
    readonly authUrl: string;
    readonly ledgerUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly fairmintPartyId: string;
    readonly fairmintUserId: string;
    readonly audience: string;
    readonly scope: string;

    constructor(isMainnet: boolean = false) {
        this.authUrl = process.env.AUTH_URL || '';
        if (!this.authUrl) {
            throw new Error('AUTH_URL environment variable is not set');
        }
        this.ledgerUrl = process.env.LEDGER_API_URL || '';
        if (!this.ledgerUrl) {
            throw new Error('LEDGER_API_URL environment variable is not set');
        }
        this.scope = process.env.SCOPE || ''; // Optional field
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
