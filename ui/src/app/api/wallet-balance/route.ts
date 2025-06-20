import { NextResponse } from 'next/server';
import { ValidatorApiClient, ProviderConfig } from '@/../../scripts/src/clients';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const config = new ProviderConfig();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    // Create client with specified provider
    const client = new ValidatorApiClient(config, provider);

    const balance = await client.getWalletBalance();
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch wallet balance',
      },
      { status: 500 }
    );
  }
} 