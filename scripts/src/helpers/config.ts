import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class TransferAgentConfig {
    readonly authUrl: string = 'https://auth.transfer-agent.xyz/application/o/token/';
    readonly ledgerUrl: string = 'http://ledger-api.validator.devnet.transfer-agent.xyz/v2';
    readonly clientId: string = 'validator-devnet-m2m';
    readonly clientSecret: string = process.env.TRANSFER_AGENT_CLIENT_SECRET || '';
    readonly fairmintPartyId: string = process.env.FAIRMINT_PARTY_ID || '';
    readonly fairmintUserId: string = process.env.FAIRMINT_USER_ID || '';
    readonly audience: string = 'validator-devnet-m2m';
    readonly scope: string = 'daml_ledger_apia';

    constructor() {
        if (!this.clientSecret) {
            throw new Error('TRANSFER_AGENT_CLIENT_SECRET environment variable is not set');
        }
        if (!this.fairmintPartyId) {
            throw new Error('FAIRMINT_PARTY_ID environment variable is not set');
        }
        if (!this.fairmintUserId) {
            throw new Error('FAIRMINT_USER_ID environment variable is not set');
        }
    }
}
