import { NextResponse } from 'next/server';
import { JsonAPIClient } from '@/../../scripts/src/helpers/client';
import { ProviderConfig } from '@/../../scripts/src/helpers/config';

const config = new ProviderConfig();

// Safe JSON serialization function to handle non-serializable data
function safeStringify(obj: any) {
    return JSON.stringify(obj, (key, value) => {
        if (value === undefined) {
            return '[undefined]';
        }
        if (typeof value === 'function') {
            return '[function]';
        }
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack
            };
        }
        return value;
    }, 2);
}

export async function GET(
  request: Request,
  { params }: { params: { offset: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Create client with specified provider or default
    const client = new JsonAPIClient(config, provider || undefined);
    
    const result = await client.getTransactionTreeByOffset(params.offset);
    
    // Try to serialize the result safely
    try {
      const jsonString = safeStringify(result);
      return new NextResponse(jsonString, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (serializationError) {
      console.error('Error serializing response:', serializationError);
      return NextResponse.json(
        { error: 'Failed to serialize response data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching transaction tree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction tree' },
      { status: 500 }
    );
  }
}
