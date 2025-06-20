import { ValidatorApiClient, ProviderConfig } from '../clients';

async function testGetWalletBalance() {
  try {
    const config = new ProviderConfig();
    const client = new ValidatorApiClient(config);

    console.log('Fetching wallet balance from validator API...');

    const result = await client.getWalletBalance();
    console.log('Wallet balance retrieved successfully:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing get wallet balance:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGetWalletBalance();
} 