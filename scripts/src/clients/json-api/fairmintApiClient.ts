import { JsonApiClient } from './jsonApiClient';
import { CreateContractResponse } from './types';
import { Ledger } from '@daml/ledger';
import { ContractId, Optional } from '@daml/types';
// import { FairmintAdminService } from '../../../libs/daml.js/OpenCapTable-v01-0.0.1/lib';
// import { AmuletRules, TransferPreapproval, TransferPreapproval_SendResult } from '../../../libs/daml.js/splice-amulet-0.1.9/lib/Splice/AmuletRules';
// import { OpenMiningRound } from '../../../libs/daml.js/splice-amulet-0.1.9/lib/Splice/Round';
// import { FeaturedAppRight } from '../../../libs/daml.js/splice-amulet-0.1.9/lib/Splice/Amulet/module';
import { ProviderConfig } from '../shared';


// Application specific constants
const TEMPLATES = {
    FAIRMINT_ADMIN_SERVICE: '#OpenCapTable-v01:FairmintAdminService:FairmintAdminService'
} as const;

export class FairmintClient {
    private client: JsonApiClient;
    private ledger: Ledger | null = null;

    constructor(config: ProviderConfig, providerName?: string) {
        this.client = new JsonApiClient(config, providerName);
    }

    async createFairmintAdminService(): Promise<CreateContractResponse> {
        const response = await this.client.createCommand({
            templateId: TEMPLATES.FAIRMINT_ADMIN_SERVICE,
            createArguments: {
                fairmint: this.client.provider.JSON_API.PARTY_ID,
            },
            actAs: [this.client.provider.JSON_API.PARTY_ID],
        });
        console.debug(`Created FairmintAdminService with contract ID: ${response.contractId}`);
        return response;
    }

    async authorizeIssuer(contractId: string, issuerPartyId: string): Promise<string> {
        this.ledger = new Ledger(
            {
                token: await this.client.getBearerToken(),
                httpBaseUrl: this.client.provider.JSON_API.API_URL.substring(0, this.client.provider.JSON_API.API_URL.length - 2),
                reconnectThreshold: 10,
                multiplexQueryStreams: true,
            }
        );

         const response = await this.client.exerciseCommand({
            templateId: TEMPLATES.FAIRMINT_ADMIN_SERVICE,
            contractId,
            choice: 'AuthorizeIssuer',
            choiceArgument: {
                issuer: issuerPartyId
            },
            actAs: [this.client.provider.JSON_API.PARTY_ID]
        }) as any;

        // Extract the IssuerAuthorization contract ID from the response
        const authorizationContractId = response.transactionTree.eventsById['0'].ExercisedTreeEvent.value.exerciseResult;
        console.debug(`Successfully authorized issuer with contract ID: ${authorizationContractId}`);
        return authorizationContractId;

        // TODO: Migrate to ledger API
        // const response = await this.ledger.exercise(FairmintAdminService.FairmintAdminService.AuthorizeIssuer, contractId as ContractId<FairmintAdminService.FairmintAdminService>, {
        //         issuer: issuerPartyId,
        //     } as FairmintAdminService.AuthorizeIssuer);

        // return response[0];
    }

    async createParty(partyIdHint: string) {
        const response = await this.client.createParty(partyIdHint);
        console.debug(`${response.isNewParty ? 'Created' : 'Reused'} party for ${partyIdHint} with ID: ${response.partyId}`);
        return response;
    }

    async acceptIssuerAuthorization(
        authorizationContractId: string, 
        name: string, 
        authorizedShares: number, 
        issuerPartyId: string,
        paymentDetails?: {
            amount: number;
            inputs: any[];
            context: any;
            walletProvider: string;
        }
    ): Promise<string> {
        const choice = paymentDetails ? 'PayFeeAndCreateIssuer' : 'CreateIssuer';
        const choiceArgument = paymentDetails 
            ? {
                name,
                authorizedShares,
                feeAmount: paymentDetails.amount,
                inputs: paymentDetails.inputs,
                context: paymentDetails.context,
                walletProvider: paymentDetails.walletProvider
            }
            : {
                name,
                authorizedShares
            };

        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:IssuerAuthorization:IssuerAuthorization',
            contractId: authorizationContractId,
            choice,
            choiceArgument,
            actAs: [issuerPartyId]
        }) as any;

        // Extract the Issuer contract ID from the response
        const issuerContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        console.debug(`Successfully created issuer with contract ID: ${issuerContractId}`);
        return issuerContractId;
    }

    async createStockClass(issuerContractId: string, stockClassType: string, shares: number, issuerPartyId: string): Promise<{stockClassContractId: string, updatedIssuerContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:Issuer:Issuer',
            contractId: issuerContractId,
            choice: 'CreateStockClass',
            choiceArgument: {
                stockClassType,
                shares
            },
            actAs: [issuerPartyId]
        }) as any;

        // Extract both the StockClass and updated Issuer contract IDs from the response
        const stockClassContractId = response.transactionTree.eventsById['2'].CreatedTreeEvent.value.contractId;
        const updatedIssuerContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        console.debug(`Created stock class with contract ID: ${stockClassContractId}`);
        return { stockClassContractId, updatedIssuerContractId };
    }

    async proposeIssueStock(stockClassContractId: string, recipientPartyId: string, quantity: number, issuerPartyId: string): Promise<{proposalContractId: string, updatedStockClassContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:StockClass:StockClass',
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
        console.debug(`Proposed stock issuance to ${recipientPartyId} with proposal ID: ${proposalContractId}`);
        return { proposalContractId, updatedStockClassContractId };
    }

    async acceptIssueStockProposal(proposalContractId: string, recipientPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:StockClass:IssueStockClassProposal',
            contractId: proposalContractId,
            choice: 'AcceptIssueStockProposal',
            choiceArgument: {},
            actAs: [recipientPartyId]
        }) as any;

        // Extract the StockPosition contract ID from the response
        const stockPositionContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        console.debug(`${recipientPartyId} accepted stock issuance and received position with ID: ${stockPositionContractId}`);
        return stockPositionContractId;
    }

    async proposeTransfer(stockPositionContractId: string, recipientPartyId: string, quantity: number, ownerPartyId: string): Promise<{transferProposalContractId: string, updatedStockPositionContractId: string}> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:StockPosition:StockPosition',
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
        console.debug(`${ownerPartyId} proposed transfer to ${recipientPartyId} with proposal ID: ${transferProposalContractId}`);
        return { transferProposalContractId, updatedStockPositionContractId };
    }

    async acceptTransfer(transferProposalContractId: string, recipientPartyId: string): Promise<string> {
        const response = await this.client.exerciseCommand({
            templateId: '#OpenCapTable-v01:StockPosition:StockTransferProposal',
            contractId: transferProposalContractId,
            choice: 'AcceptTransfer',
            choiceArgument: {},
            actAs: [recipientPartyId]
        }) as any;

        // Extract the new StockPosition contract ID from the response
        const stockPositionContractId = response.transactionTree.eventsById['1'].CreatedTreeEvent.value.contractId;
        console.debug(`${recipientPartyId} accepted transfer and received position with ID: ${stockPositionContractId}`);
        return stockPositionContractId;
    }

    // TODO: Integrate with Amulet
    // async transferPreapprovalSend(
    //     contractId: string,
    //     choiceArgument: {
    //         context: {
    //             amuletRules: ContractId<AmuletRules>;
    //             context: {
    //                 openMiningRound: ContractId<OpenMiningRound>;
    //                 issuingMiningRounds: any;
    //                 validatorRights: any;
    //                 featuredAppRight: Optional<ContractId<FeaturedAppRight>>;
    //             };
    //         };
    //         inputs: any[];
    //         amount: string;
    //         sender: string;
    //         description: Optional<string>;
    //     }
    // ): Promise<TransferPreapproval_SendResult> {
    //     this.ledger = new Ledger(
    //         {
    //             token: await this.client.getBearerToken(),
    //             httpBaseUrl: this.client.provider.JSON_API.API_URL.substring(0, this.client.provider.JSON_API.API_URL.length - 2),
    //             reconnectThreshold: 10,
    //             multiplexQueryStreams: true,
    //         }
    //     );
    //     const response = await this.ledger.exercise(
    //         TransferPreapproval.TransferPreapproval_Send,
    //         contractId as ContractId<TransferPreapproval>,
    //         choiceArgument
    //     );
    //     return response[0];
    // }
}
