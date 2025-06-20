import { JsonApiClient, ProviderConfig } from './clients';

async function testUpdateById() {
  try {
    const config = new ProviderConfig();
    const client = new JsonApiClient(config);

    // Example update ID - you would need to replace this with a real update ID from your ledger
    const updateId =
      '1220df70c63d95b67b3b19d8a6d931f3a50185d7ac95964414f875f18a7f15071ebc';

    console.log(`Fetching update with ID: ${updateId}`);
    const result = await client.getUpdateById(updateId);

    console.log('Update retrieved successfully:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing update by ID:', error);
  }
}

// Run the test
testUpdateById();
