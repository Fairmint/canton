import { TransferAgentConfig } from './helpers/config';
import { FairmintClient } from './helpers/fairmintClient';

async function main() {
    try {
        const config = new TransferAgentConfig();
        const client = new FairmintClient(config);

        // Pre-req: Create FairmintAdminService [One time]
        const {contractId} = await client.createFairmintAdminService();
        console.log(`Created FairmintAdminService with contract ID: ${contractId}`);

        // Pre-req: Create new party for issuer [Once per issuer]
        const {partyId: issuerPartyId, isNewParty} = await client.createParty('Test001');
        console.log(`${isNewParty ? 'Created' : 'Reused'} party for issuer with ID: ${issuerPartyId}`);

        // 1.1: Authorize issuer [Once per issuer]
        const authorizationContractId = await client.authorizeIssuer(contractId, issuerPartyId);
        console.log(`Successfully authorized issuer with contract ID: ${authorizationContractId}`);

        // 1.2: Issuer accepts authorization [Once per issuer]
        const issuerContractId = await client.acceptIssuerAuthorization(
            authorizationContractId,
            'Acme Inc',
            15_000_000,
            issuerPartyId
        );
        console.log(`Successfully created issuer with contract ID: ${issuerContractId}`);

        // Pre-req: Create parties for Bob and Alice
        const {partyId: alicePartyId, isNewParty: isAliceNewParty} = await client.createParty('Alice');
        console.log(`${isAliceNewParty ? 'Created' : 'Reused'} party for Alice with ID: ${alicePartyId}`);
        const {partyId: bobPartyId, isNewParty: isBobNewParty} = await client.createParty('Bob');
        console.log(`${isBobNewParty ? 'Created' : 'Reused'} party for Bob with ID: ${bobPartyId}`);

        // 2.1: Issuer creates stockclass "Common" with 10M authorized shares
        const {stockClassContractId} = await client.createStockClass(
            issuerContractId,
            'Common',
            10_000_000,
            issuerPartyId
        );
        console.log(`Created stock class with contract ID: ${stockClassContractId}`);

        // 4.1: Issuer proposes 10M common shares to Bob
        const {proposalContractId} = await client.proposeIssueStock(
            stockClassContractId,
            bobPartyId,
            10_000_000,
            issuerPartyId
        );
        console.log(`Proposed stock issuance to Bob with proposal ID: ${proposalContractId}`);

        // 4.2: Bob accepts the proposal and receives shares
        const bobStockPositionContractId = await client.acceptIssueStockProposal(proposalContractId, bobPartyId);
        console.log(`Bob accepted stock issuance and received position with ID: ${bobStockPositionContractId}`);

        // 5.1: Bob proposes 2M common share transfer to Alice
        const {transferProposalContractId} = await client.proposeTransfer(
            bobStockPositionContractId,
            alicePartyId,
            2_000_000,
            bobPartyId
        );
        console.log(`Bob proposed transfer to Alice with proposal ID: ${transferProposalContractId}`);

        // 5.2: Alice accepts the transfer proposal and receives shares
        const aliceStockPositionContractId = await client.acceptTransfer(transferProposalContractId, alicePartyId);
        console.log(`Alice accepted transfer and received position with ID: ${aliceStockPositionContractId}`);

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
