import { JsonApiClient, ProviderConfig } from './clients';

async function testTransactionTreeById() {
  try {
    const config = new ProviderConfig();
    const client = new JsonApiClient(config);

    // Example update ID - you would need to replace this with a real update ID from your ledger
    const updateId =
      '1220df70c63d95b67b3b19d8a6d931f3a50185d7ac95964414f875f18a7f15071ebc';

    console.log(`Fetching transaction tree with ID: ${updateId}`);

    // Test with default options
    const result = await client.getTransactionTreeById(updateId);
    console.log('Transaction tree retrieved successfully (default options):');
    console.log(JSON.stringify(result, null, 2));

    // Test with verbose event format
    const verboseResult = await client.getTransactionTreeById(updateId, {
      eventFormat: 'verbose',
      includeCreatedEventBlob: true,
    });
    console.log('\nTransaction tree retrieved successfully (verbose format):');
    console.log(JSON.stringify(verboseResult, null, 2));

    // Test with minimal event format
    const minimalResult = await client.getTransactionTreeById(updateId, {
      eventFormat: 'minimal',
    });
    console.log('\nTransaction tree retrieved successfully (minimal format):');
    console.log(JSON.stringify(minimalResult, null, 2));
  } catch (error) {
    console.error('Error testing transaction tree by ID:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTransactionTreeById();
}
