import { NextResponse } from 'next/server';
import { TransferAgentClient } from '@/../../scripts/src/helpers/client';
import { TransferAgentConfig } from '@/../../scripts/src/helpers/config';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const config = new TransferAgentConfig();
const client = new TransferAgentClient(config);

export async function GET(
    request: Request
) {
    try {
        const { searchParams } = new URL(request.url);

        // Handle case where searchParams might be undefined during static generation
        if (!searchParams) {
            return NextResponse.json(
                { error: 'Invalid request parameters' },
                { status: 400 }
            );
        }

        // Get contractId from searchParams parameter
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
