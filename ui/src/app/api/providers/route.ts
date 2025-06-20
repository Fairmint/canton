import { NextResponse } from 'next/server';
import { JsonApiClient, ProviderConfig } from '@/../../scripts/src/clients';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const config = new ProviderConfig();

export async function GET() {
  try {
    const providers = config.getAllProviders();

    // Return provider names and IDs for security (don't expose full config)
    const providerNames = providers.map(provider => ({
      name: provider.PROVIDER_NAME,
      displayName: provider.PROVIDER_NAME, // You could add a display name field to the config if needed
      partyId: provider.VALIDATOR_API?.PARTY_ID,
      userId: provider.VALIDATOR_API?.USER_ID,
    }));

    return NextResponse.json(providerNames);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch providers',
      },
      { status: 500 }
    );
  }
}
