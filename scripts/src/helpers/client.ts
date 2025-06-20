import axios, { AxiosInstance } from 'axios';
import { TransferAgentConfig, ProviderConfig } from './config';
import { AuthResponse, CommandRequest, CommandResponse, CreateContractResponse, UpdateByIdRequest, UpdateByIdResponse, TransactionTree } from './types';
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
    public provider: ProviderConfig; // The selected provider configuration
    public bearerToken: string | null = null;
    private sequenceNumber: number = 1;
    private axiosInstance: AxiosInstance;
    private logDir: string;

    constructor(config: TransferAgentConfig, providerName?: string) {
        this.config = config;
        
        // Select the provider by name or default to index 0
        if (providerName) {
            const provider = config.getProviderByName(providerName);
            if (!provider) {
                throw new Error(`Provider '${providerName}' not found. Available providers: ${config.getAllProviders().map(p => p.PROVIDER_NAME).join(', ')}`);
            }
            this.provider = provider;
        } else {
            // Default to first provider (index 0)
            const provider = config.getProviderByIndex(0);
            if (!provider) {
                throw new Error('No providers available in configuration');
            }
            this.provider = provider;
        }
        
        this.axiosInstance = axios.create();
        this.logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
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

        try {
            // Use a replacer function to handle non-serializable values
            const safeStringify = (obj: any) => {
                return JSON.stringify(obj, (key, value) => {
                    if (value === undefined) {
                        return '[undefined]';
                    }
                    if (typeof value === 'function') {
                        return '[function]';
                    }
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack
                        };
                    }
                    return value;
                }, 2);
            };

            fs.writeFileSync(logFile, safeStringify(logData));
        } catch (error) {
            // If serialization fails, log a simplified version
            const fallbackLogData = {
                timestamp,
                url,
                request: request ? '[request data]' : null,
                response: response ? '[response data]' : null,
                serializationError: error instanceof Error ? error.message : String(error)
            };
            
            try {
                fs.writeFileSync(logFile, JSON.stringify(fallbackLogData, null, 2));
            } catch (fallbackError) {
                // If even the fallback fails, write a minimal log
                fs.writeFileSync(logFile, JSON.stringify({
                    timestamp,
                    url,
                    error: 'Failed to serialize log data'
                }, null, 2));
            }
        }
    }

    private async makePostRequest<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
        try {
            const response = await this.axiosInstance.post<T>(url, data, { headers });
            await this.logRequestResponse(url, data, response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;

                // Check for security-sensitive error
                if (errorData?.cause === "A security-sensitive error has been received") {
                    // Clear the bearer token to force re-authentication
                    this.bearerToken = null;

                    // Get new headers with fresh authentication
                    const newHeaders = await this.getHeaders();

                    // Retry the request once with new authentication
                    try {
                        const retryResponse = await this.axiosInstance.post<T>(url, data, { headers: newHeaders });
                        await this.logRequestResponse(url, data, retryResponse.data);
                        return retryResponse.data;
                    } catch (retryError: unknown) {
                        // If retry fails, log and throw the original error
                        await this.logRequestResponse(url, data, {
                            error: axios.isAxiosError(retryError) ? retryError.response?.data || retryError.message : retryError
                        });
                        throw error;
                    }
                }

                await this.logRequestResponse(url, data, {
                    error: errorData || error.message
                });
                throw error;
            }
            throw error;
        }
    }

    private async makeGetRequest<T>(url: string, headers?: Record<string, string>): Promise<T> {
        try {
            const response = await this.axiosInstance.get<T>(url, { headers });
            await this.logRequestResponse(url, null, response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;

                // Check for security-sensitive error
                if (errorData?.cause === "A security-sensitive error has been received") {
                    // Clear the bearer token to force re-authentication
                    this.bearerToken = null;

                    // Get new headers with fresh authentication
                    const newHeaders = await this.getHeaders();

                    // Retry the request once with new authentication
                    try {
                        const retryResponse = await this.axiosInstance.get<T>(url, { headers: newHeaders });
                        await this.logRequestResponse(url, null, retryResponse.data);
                        return retryResponse.data;
                    } catch (retryError: unknown) {
                        // If retry fails, log and throw the original error
                        await this.logRequestResponse(url, null, {
                            error: axios.isAxiosError(retryError) ? retryError.response?.data || retryError.message : retryError
                        });
                        throw error;
                    }
                }

                await this.logRequestResponse(url, null, {
                    error: errorData || error.message
                });
                throw error;
            }
            throw error;
        }
    }

    public async authenticate(): Promise<string> {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', this.provider.CLIENT_ID);
        formData.append('client_secret', this.provider.CLIENT_SECRET);
        if(this.provider.AUDIENCE) {
            formData.append('audience', this.provider.AUDIENCE);
        }
        formData.append('scope', 'daml_ledger_api');

        try {
            const response = await this.makePostRequest<AuthResponse>(
                this.provider.AUTH_URL,
                formData.toString(),
                {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            );

            this.bearerToken = response.access_token;
            return this.bearerToken;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Authentication failed: ${errorData}`);
            }
            throw error;
        }
    }

    public async getBearerToken(): Promise<string> {
        if (!this.bearerToken) {
            await this.authenticate();
        }
        return this.bearerToken || '';
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
                `${this.provider.LEDGER_API_URL}/commands/submit-and-wait-for-transaction-tree`,
                command,
                headers
            );

            const event = response.transactionTree.eventsById['0'];
            if (!('CreatedTreeEvent' in event)) {
                throw new Error(`Expected CreatedTreeEvent but got ${Object.keys(event)[0]}`);
            }

            return {contractId: event.CreatedTreeEvent.value.contractId, updateId: response.transactionTree.updateId};
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
                `${this.provider.LEDGER_API_URL}/commands/submit-and-wait-for-transaction-tree`,
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
                `${this.provider.LEDGER_API_URL}/parties`,
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
                `${this.provider.LEDGER_API_URL}/users/${this.provider.FAIRMINT_USER_ID}/rights`,
                {
                    userId: this.provider.FAIRMINT_USER_ID,
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
            return await this.makeGetRequest(
                `${this.provider.LEDGER_API_URL}/parties`,
                headers
            );
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get parties: ${errorData}`);
            }
            throw error;
        }
    }

    async getEventsByContractId(contractId: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await this.makePostRequest(
                `${this.provider.LEDGER_API_URL}/events/events-by-contract-id`,
                {
                    contractId,
                    requestingParties: [this.provider.FAIRMINT_PARTY_ID]
                },
                headers
            );
            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get events by contract ID: ${errorData}`);
            }
            throw error;
        }
    }

    async getTransactionTreeByOffset(offset: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            return await this.makeGetRequest(
                `${this.provider.LEDGER_API_URL}/updates/transaction-tree-by-offset/${offset}?parties=${this.provider.FAIRMINT_PARTY_ID}`,
                headers
            );
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get transaction tree by offset: ${errorData}`);
            }
            throw error;
        }
    }

    async getUpdateById(updateId: string): Promise<UpdateByIdResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.makePostRequest<UpdateByIdResponse>(
                `${this.provider.LEDGER_API_URL}/updates/update-by-id`,
                {
                    updateId,
                    requestingParties: [this.provider.FAIRMINT_PARTY_ID],
                    updateFormat: {
                        includeTransactions: {
                            eventFormat: {
                                verbose: true
                            },
                            transactionShape: "TRANSACTION_SHAPE_UNSPECIFIED"
                        },
                    }
                },
                headers
            );
            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get update by ID: ${errorData}`);
            }
            throw error;
        }
    }

    async getTransactionTreeById(updateId: string, options?: {
        eventFormat?: 'verbose' | 'minimal';
        includeCreatedEventBlob?: boolean;
    }): Promise<TransactionTree> {
        try {
            const headers = await this.getHeaders();
            
            // Build query parameters
            const queryParams = new URLSearchParams({
                parties: this.provider.FAIRMINT_PARTY_ID
            });

            // Add optional formatting parameters if provided
            if (options?.eventFormat) {
                queryParams.append('eventFormat', options.eventFormat);
            }
            if (options?.includeCreatedEventBlob !== undefined) {
                queryParams.append('includeCreatedEventBlob', options.includeCreatedEventBlob.toString());
            }

            const response = await this.makeGetRequest<TransactionTree>(
                `${this.provider.LEDGER_API_URL}/updates/transaction-tree-by-id/${updateId}?${queryParams.toString()}`,
                headers
            );
            
            await this.logRequestResponse(
                `${this.provider.LEDGER_API_URL}/updates/transaction-tree-by-id/${updateId}`,
                { updateId, options },
                response
            );
            
            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to get transaction tree by ID: ${errorData}`);
            }
            throw error;
        }
    }

    async uploadPackage(filename: string): Promise<any> {
        try {
            // Check if file exists
            if (!fs.existsSync(filename)) {
                throw new Error(`File not found: ${filename}`);
            }

            const headers = await this.getHeaders();
            
            // Remove Content-Type header to let axios set it automatically for file upload
            delete headers['Content-Type'];
            
            // Read the file as a buffer
            const fileBuffer = fs.readFileSync(filename);
            
            const response = await this.axiosInstance.post(
                `${this.provider.LEDGER_API_URL}/packages`,
                fileBuffer,
                { 
                    headers: {
                        ...headers,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );
            
            await this.logRequestResponse(
                `${this.provider.LEDGER_API_URL}/packages`,
                { filename, fileSize: fileBuffer.length },
                response.data
            );
            
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to upload package: ${errorData}`);
            }
            throw error;
        }
    }
}
