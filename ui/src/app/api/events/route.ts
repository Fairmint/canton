import { NextResponse } from 'next/server';
import { TransferAgentClient } from '@/../../scripts/src/helpers/client';
import { TransferAgentConfig } from '@/../../scripts/src/helpers/config';

const config = new TransferAgentConfig(true);
const client = new TransferAgentClient(config);

export async function GET(request: Request) {
    try {
        // Get contractId and requestingParties from query parameters
        const { searchParams } = new URL(request.url);
        const contractId = searchParams.get('contractId');

        if (!contractId) {
            return NextResponse.json(
                { error: 'Contract ID is required' },
                { status: 400 }
            );
        }

        const events = await client.getEventsByContractId(contractId);
        return NextResponse.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch events' },
            { status: 500 }
        );
    }
}
