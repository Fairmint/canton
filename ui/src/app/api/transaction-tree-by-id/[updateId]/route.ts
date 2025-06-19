import { NextResponse } from 'next/server';
import { TransferAgentClient } from '@/../../scripts/src/helpers/client';
import { TransferAgentConfig } from '@/../../scripts/src/helpers/config';

const config = new TransferAgentConfig();
const client = new TransferAgentClient(config);

export async function GET(
  request: Request,
  { params }: { params: { updateId: string } }
) {
  try {
    // Get optional query parameters
    const { searchParams } = new URL(request.url);
    const eventFormat = searchParams.get('eventFormat') as 'verbose' | 'minimal' | null;
    const includeCreatedEventBlob = searchParams.get('includeCreatedEventBlob');
    
    const options: {
      eventFormat?: 'verbose' | 'minimal';
      includeCreatedEventBlob?: boolean;
    } = {};
    
    if (eventFormat) {
      options.eventFormat = eventFormat;
    }
    
    if (includeCreatedEventBlob !== null) {
      options.includeCreatedEventBlob = includeCreatedEventBlob === 'true';
    }

    const result = await client.getTransactionTreeById(params.updateId, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching transaction tree by ID:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction tree by ID' },
      { status: 500 }
    );
  }
} 