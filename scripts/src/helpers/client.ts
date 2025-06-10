import axios, { AxiosInstance } from 'axios';
import { TransferAgentConfig } from './config';
import { AuthResponse, CommandRequest, CommandResponse, CreateContractResponse } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface PartyCreationResult {
    partyId: string;
    isNewParty: boolean;
}

interface CreateCommandParams {
    templateId: string;
    createArguments: Record<string, any>;
    actAs: string[];
}

interface ExerciseCommandParams {
    templateId: string;
    contractId: string;
    choice: string;
    choiceArgument: Record<string, any>;
    actAs: string[];
}

export class TransferAgentClient {
    private config: TransferAgentConfig;
    private bearerToken: string | null = null;
    private sequenceNumber: number = 1;
    private axiosInstance: AxiosInstance;
    private logDir: string;

    constructor(config: TransferAgentConfig) {
        this.config = config;
        this.axiosInstance = axios.create();
        this.logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getFairmintPartyId(): string {
        return this.config.fairmintPartyId;
    }

    private async logRequestResponse(url: string, request: any, response: any) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(this.logDir, `request-${timestamp}.json`);

        const logData = {
            timestamp,
            url,
            request,
            response
        };

        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    }

    private async makePostRequest<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
        try {
            const response = await this.axiosInstance.post<T>(url, data, { headers });
            await this.logRequestResponse(url, data, response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                await this.logRequestResponse(url, data, {
                    error: error.response?.data || error.message
                });
                throw error;
            }
            throw error;
        }
    }

    private async authenticate(): Promise<string> {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', this.config.clientId);
        formData.append('client_secret', this.config.clientSecret);
        formData.append('audience', this.config.audience);
        formData.append('scope', this.config.scope);

        try {
            const response = await this.makePostRequest<AuthResponse>(
                this.config.authUrl,
                formData.toString(),
                {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            );

            this.bearerToken = response.access_token;
            return this.bearerToken;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Authentication failed: ${error.response?.data || error.message}`);
            }
            throw error;
        }
    }

    private async getHeaders(): Promise<Record<string, string>> {
        if (!this.bearerToken) {
            await this.authenticate();
        }

        return {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
        };
    }

    async createCommand(params: CreateCommandParams): Promise<CreateContractResponse> {
        const command: CommandRequest = {
            commands: [{
                CreateCommand: {
                    templateId: params.templateId,
                    createArguments: params.createArguments,
                },
            }],
            commandId: this.sequenceNumber.toString(),
            actAs: params.actAs,
        };

        this.sequenceNumber++;

        try {
            const headers = await this.getHeaders();
            const response = await this.makePostRequest<CommandResponse>(
                `${this.config.ledgerUrl}/commands/submit-and-wait-for-transaction-tree`,
                command,
                headers
            );

            return {contractId: response.transactionTree.eventsById['0'].CreatedTreeEvent.value.contractId, updateId: response.transactionTree.updateId};
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to create command: ${errorData}`);
            }
            throw error;
        }
    }

    async exerciseCommand(params: ExerciseCommandParams): Promise<CommandResponse> {
        const command: CommandRequest = {
            commands: [{
                ExerciseCommand: {
                    templateId: params.templateId,
                    contractId: params.contractId,
                    choice: params.choice,
                    choiceArgument: params.choiceArgument
                }
            }],
            commandId: this.sequenceNumber.toString(),
            actAs: params.actAs
        };

        this.sequenceNumber++;

        try {
            const headers = await this.getHeaders();
            const response = await this.makePostRequest<CommandResponse>(
                `${this.config.ledgerUrl}/commands/submit-and-wait-for-transaction-tree`,
                command,
                headers
            );
            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to exercise command: ${errorData}`);
            }
            throw error;
        }
    }

    async createParty(partyIdHint: string): Promise<PartyCreationResult> {
        try {
            const headers = await this.getHeaders();
            const response = await this.makePostRequest<{ partyDetails: {party: string }}>(
                `${this.config.ledgerUrl}/parties`,
                {
                    partyIdHint: `FM:${partyIdHint}`,
                    identityProviderId: ""
                },
                headers
            );

            const partyId = response.partyDetails.party;

            // Set user rights for the newly created party
            await this.setUserRights(partyId);

            return {partyId, isNewParty: true};
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;
                // Check if this is a "party already exists" error
                if (errorData?.cause?.includes('Party already exists')) {
                    // Look up the party ID from the ledger
                    const parties = await this.getParties();
                    const existingParty = parties.partyDetails.find(p => p.party.startsWith(`FM:${partyIdHint}`));
                    if (existingParty) {
                        // Set user rights for the newly created party
                        await this.setUserRights(existingParty.party);

                        return { partyId: existingParty.party, isNewParty: false };
                    }
                }
                const errorMessage = errorData ? JSON.stringify(errorData, null, 2) : error.message;
                throw new Error(`Failed to create party: ${errorMessage}`);
            }
            throw error;
        }
    }

    async setUserRights(partyId: string): Promise<void> {
        const headers = await this.getHeaders();
        await this.makePostRequest(
                `${this.config.ledgerUrl}/users/${this.config.fairmintUserId}/rights`,
                {
                    userId: this.config.fairmintUserId,
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: partyId
                                    }
                                }
                            }
                        }
                    ],
                    identityProviderId: ""
                },
                headers
            );
        }


    private async getParties(): Promise<{ partyDetails: Array<{ party: string, isLocal: boolean, localMetadata: { resourceVersion: string, annotations: Record<string, any> }, identityProviderId: string }> }> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get(
                `${this.config.ledgerUrl}/parties`,
                { headers }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get parties: ${errorData}`);
            }
            throw error;
        }
    }
}
