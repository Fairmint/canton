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
    const result = await client.getUpdateById(params.updateId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching update by ID:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch update by ID' },
      { status: 500 }
    );
  }
} 