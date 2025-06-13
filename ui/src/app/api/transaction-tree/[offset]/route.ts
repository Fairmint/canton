import { NextResponse } from 'next/server';
import { TransferAgentClient } from '@/../../scripts/src/helpers/client';
import { TransferAgentConfig } from '@/../../scripts/src/helpers/config';

const config = new TransferAgentConfig(false);
const client = new TransferAgentClient(config);

export async function GET(
  request: Request,
  { params }: { params: { offset: string } }
) {
  try {
    const result = await client.getTransactionTreeByOffset(params.offset);
    // Only return the data property of the response
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching transaction tree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction tree' },
      { status: 500 }
    );
  }
}
