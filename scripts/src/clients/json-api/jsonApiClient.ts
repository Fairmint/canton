import axios, { AxiosInstance } from 'axios';
import { CommandRequest, CommandResponse, CreateContractResponse, UpdateByIdRequest, UpdateByIdResponse, TransactionTree } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { ProviderConfig, ProviderConfigENVFormat } from '../shared';
import { AbstractClient } from '../shared/abstractClient';

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

export class JsonApiClient extends AbstractClient {
    private sequenceNumber: number = 1;

    constructor(config: ProviderConfig, providerName?: string) {
        super(config, 'JSON_API', providerName);
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
            const response = await this.makePostRequest<CommandResponse>(
                `${this.provider.JSON_API.API_URL}/commands/submit-and-wait-for-transaction-tree`,
                command,
                {contentType: 'application/json', includeBearerToken: true}
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
            const response = await this.makePostRequest<CommandResponse>(
                `${this.provider.JSON_API.API_URL}/commands/submit-and-wait-for-transaction-tree`,
                command,
                {contentType: 'application/json', includeBearerToken: true}
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
            const response = await this.makePostRequest<{ partyDetails: {party: string }}>(
                `${this.provider.JSON_API.API_URL}/parties`,
                {
                    partyIdHint: `FM:${partyIdHint}`,
                    identityProviderId: ""
                },
                {contentType: 'application/json', includeBearerToken: true}
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
        await this.makePostRequest(
                `${this.provider.JSON_API.API_URL}/users/${this.provider.JSON_API.USER_ID}/rights`,
                {
                    userId: this.provider.JSON_API.USER_ID,
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
                {contentType: 'application/json', includeBearerToken: true}
            );
        }


    private async getParties(): Promise<{ partyDetails: Array<{ party: string, isLocal: boolean, localMetadata: { resourceVersion: string, annotations: Record<string, any> }, identityProviderId: string }> }> {
        try {
            return await this.makeGetRequest(
                `${this.provider.JSON_API.API_URL}/parties`,
                {contentType: 'application/json', includeBearerToken: true}
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
            const response = await this.makePostRequest(
                `${this.provider.JSON_API.API_URL}/events/events-by-contract-id`,
                {
                    contractId,
                    requestingParties: [this.provider.JSON_API.PARTY_ID]
                },
                {contentType: 'application/json', includeBearerToken: true}
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
            return await this.makeGetRequest(
                `${this.provider.JSON_API.API_URL}/updates/transaction-tree-by-offset/${offset}?parties=${this.provider.JSON_API.PARTY_ID}`,
                {contentType: 'application/json', includeBearerToken: true}
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
            const response = await this.makePostRequest<UpdateByIdResponse>(
                `${this.provider.JSON_API.API_URL}/updates/update-by-id`,
                {
                    updateId,
                    requestingParties: [this.provider.JSON_API.PARTY_ID],
                    updateFormat: {
                        includeTransactions: {
                            eventFormat: {
                                verbose: true
                            },
                            transactionShape: "TRANSACTION_SHAPE_UNSPECIFIED"
                        },
                    }
                },
                {contentType: 'application/json', includeBearerToken: true}
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
            // Build query parameters
            const queryParams = new URLSearchParams({
                parties: this.provider.JSON_API.PARTY_ID
            });

            // Add optional formatting parameters if provided
            if (options?.eventFormat) {
                queryParams.append('eventFormat', options.eventFormat);
            }
            if (options?.includeCreatedEventBlob !== undefined) {
                queryParams.append('includeCreatedEventBlob', options.includeCreatedEventBlob.toString());
            }

            const response = await this.makeGetRequest<TransactionTree>(
                `${this.provider.JSON_API.API_URL}/updates/transaction-tree-by-id/${updateId}?${queryParams.toString()}`,
                {contentType: 'application/json', includeBearerToken: true}
            );
            
            await this.logRequestResponse(
                `${this.provider.JSON_API.API_URL}/updates/transaction-tree-by-id/${updateId}`,
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
            // Read the file as a buffer
            const fileBuffer = fs.readFileSync(filename);
            
            const response = await this.makePostRequest<CommandResponse>(
                `${this.provider.JSON_API.API_URL}/packages`,
                fileBuffer,
                {contentType: 'application/octet-stream', includeBearerToken: true}
            );
            return response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Failed to upload package: ${errorData}`);
            }
            throw error;
        }
    }
}
