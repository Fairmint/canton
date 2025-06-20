import { TransferAgentConfig } from './helpers/config';
import { FairmintClient } from './helpers/fairmintClient';

async function main() {
    try {
        const config = new TransferAgentConfig();
        const client = new FairmintClient(config);

        // Pre-req: Create FairmintAdminService [One time]
        const {contractId} = await client.createFairmintAdminService();

        // Pre-req: Create new party for issuer [Once per issuer]
        const {partyId: issuerPartyId} = await client.createParty('Test0001003');

        // 1.1: Authorize issuer [Once per issuer]
        const authorizationContractId = await client.authorizeIssuer(contractId, issuerPartyId);

        // 1.2: Issuer accepts authorization [Once per issuer]
        const issuerContractId = await client.acceptIssuerAuthorization(
            authorizationContractId,
            'Acme Inc',
            15_000_000,
            issuerPartyId,
            // {
            //     amount: 1.42,
            //     inputs: [],
            //     context: {
            //         amuletRules: '',
            //     },
            //     walletProvider: '5N DevNet'
            // }
        );

        // Pre-req: Create parties for Bob and Alice
        const {partyId: alicePartyId} = await client.createParty('Alice0001003');
        const {partyId: bobPartyId} = await client.createParty('Bob0001003');

        // 2.1: Issuer creates stockclass "Common" with 10M authorized shares
        const {stockClassContractId} = await client.createStockClass(
            issuerContractId,
            'Common',
            10_000_000,
            issuerPartyId
        );

        // 4.1: Issuer proposes 10M common shares to Bob
        const {proposalContractId} = await client.proposeIssueStock(
            stockClassContractId,
            bobPartyId,
            10_000_000,
            issuerPartyId
        );

        // 4.2: Bob accepts the proposal and receives shares
        const bobStockPositionContractId = await client.acceptIssueStockProposal(proposalContractId, bobPartyId);

        // 5.1: Bob proposes 2M common share transfer to Alice
        const {transferProposalContractId} = await client.proposeTransfer(
            bobStockPositionContractId,
            alicePartyId,
            2_000_000,
            bobPartyId
        );

        // 5.2: Alice accepts the transfer proposal and receives shares
        const aliceStockPositionContractId = await client.acceptTransfer(transferProposalContractId, alicePartyId);

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
