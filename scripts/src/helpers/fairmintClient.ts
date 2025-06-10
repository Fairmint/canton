import { TransferAgentClient } from './client';
import { TransferAgentConfig } from './config';
import { CreateContractResponse } from './types';

// Application specific constants
const TEMPLATES = {
    FAIRMINT_ADMIN_SERVICE: '#OpenCapTable-v00:FairmintAdminService:FairmintAdminService'
} as const;

export class FairmintClient {
    private client: TransferAgentClient;

    constructor(config: TransferAgentConfig) {
        this.client = new TransferAgentClient(config);
    }

    async createFairmintAdminService(): Promise<CreateContractResponse> {
        return this.client.createCommand({
            templateId: TEMPLATES.FAIRMINT_ADMIN_SERVICE,
            createArguments: {
                fairmint: this.client.getFairmintPartyId(),
            },
            actAs: [this.client.getFairmintPartyId()],
        });
    }

    async authorizeIssuer(contractId: string, issuerPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: TEMPLATES.FAIRMINT_ADMIN_SERVICE,
            contractId,
            choice: 'AuthorizeIssuer',
            choiceArgument: {
                issuer: issuerPartyId
            },
            actAs: [this.client.getFairmintPartyId()]
        }) as any;

        // Extract the IssuerAuthorization contract ID from the response
        const authorizationContractId = response.transactionTree.eventsById['0'].ExercisedTreeEvent.value.exerciseResult;
        return authorizationContractId;
    }

    async createParty(partyIdHint: string) {
        return this.client.createParty(partyIdHint);
    }

    async acceptIssuerAuthorization(authorizationContractId: string, name: string, authorizedShares: number, issuerPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:IssuerAuthorization:IssuerAuthorization',
            contractId: authorizationContractId,
            choice: 'CreateIssuer',
            choiceArgument: {
                name,
                authorizedShares
            },
            actAs: [issuerPartyId]
        }) as any;

        // Extract the Issuer contract ID from the response
        const issuerContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        return issuerContractId;
    }

    async createStockClass(issuerContractId: string, stockClassType: string, shares: number, issuerPartyId: string): Promise<{stockClassContractId: string, updatedIssuerContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:Issuer:Issuer',
            contractId: issuerContractId,
            choice: 'CreateStockClass',
            choiceArgument: {
                stockClassType,
                shares
            },
            actAs: [issuerPartyId]
        }) as any;

        // Extract both the StockClass and updated Issuer contract IDs from the response
        const stockClassContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        const updatedIssuerContractId = response.transactionTree.eventsById['2'].CreatedTreeEvent.value.contractId;
        return { stockClassContractId, updatedIssuerContractId };
    }

    async proposeIssueStock(stockClassContractId: string, recipientPartyId: string, quantity: number, issuerPartyId: string): Promise<{proposalContractId: string, updatedStockClassContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:StockClass:StockClass',
            contractId: stockClassContractId,
            choice: 'ProposeIssueStock',
            choiceArgument: {
                recipient: recipientPartyId,
                quantity
            },
            actAs: [issuerPartyId]
        }) as any;

        // Extract both the IssueStockClassProposal and updated StockClass contract IDs from the response
        const proposalContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        const updatedStockClassContractId = response.transactionTree.eventsById['2'].CreatedTreeEvent.value.contractId;
        return { proposalContractId, updatedStockClassContractId };
    }

    async acceptIssueStockProposal(proposalContractId: string, recipientPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:StockClass:IssueStockClassProposal',
            contractId: proposalContractId,
            choice: 'AcceptIssueStockProposal',
            choiceArgument: {},
            actAs: [recipientPartyId]
        }) as any;

        // Extract the StockPosition contract ID from the response
        const stockPositionContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        return stockPositionContractId;
    }

    async proposeTransfer(stockPositionContractId: string, recipientPartyId: string, quantity: number, ownerPartyId: string): Promise<{transferProposalContractId: string, updatedStockPositionContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:StockPosition:StockPosition',
            contractId: stockPositionContractId,
            choice: 'ProposeTransfer',
            choiceArgument: {
                recipient: recipientPartyId,
                quantityToTransfer: quantity
            },
            actAs: [ownerPartyId]
        }) as any;

        // Extract both the TransferProposal and updated StockPosition contract IDs from the response
        const transferProposalContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        const updatedStockPositionContractId = response.transactionTree.eventsById['2'].CreatedTreeEvent.value.contractId;
        return { transferProposalContractId, updatedStockPositionContractId };
    }

    async acceptTransfer(transferProposalContractId: string, recipientPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v00:StockPosition:TransferProposal',
            contractId: transferProposalContractId,
            choice: 'AcceptTransfer',
            choiceArgument: {},
            actAs: [recipientPartyId]
        }) as any;

        // Extract the new StockPosition contract ID from the response
        const stockPositionContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        return stockPositionContractId;
    }
}
