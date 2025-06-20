import React, { useState } from 'react';
import EventDetails, { EventData } from './EventDetails';

export interface TraceContext {
  traceparent: string;
  tracestate: string | null;
}

export interface TransactionEvent {
  ExercisedTreeEvent?: { value: EventData };
  CreatedTreeEvent?: { value: EventData };
}

export interface Transaction {
  updateId: string;
  effectiveAt: string;
  offset: number;
  eventsById: Record<string, TransactionEvent>;
  synchronizerId: string;
  recordTime: string;
  traceContext?: TraceContext;
}

interface TransactionTreeProps {
  transaction: Transaction;
  onOffsetClick?: (offset: string) => void;
  onContractIdClick?: (contractId: string) => void;
  currentContractId?: string;
}

export default function TransactionTree({
  transaction,
  onOffsetClick,
  onContractIdClick,
  currentContractId,
}: TransactionTreeProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Tree</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">
              <strong>Update ID:</strong> {transaction.updateId}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Offset:</strong> {transaction.offset}
            </p>
            
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showDetails ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Hide Details
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Show Details
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                <p className="text-sm text-gray-500">
                  <strong>Synchronizer ID:</strong> {transaction.synchronizerId}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Effective At:</strong> {new Date(transaction.effectiveAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Record Time:</strong> {new Date(transaction.recordTime).toLocaleString()}
                </p>
                {transaction.traceContext && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      <strong>Trace Context:</strong>
                    </p>
                    <div className="ml-4 text-sm text-gray-600">
                      <p><strong>Traceparent:</strong> {transaction.traceContext.traceparent}</p>
                      <p><strong>Tracestate:</strong> {transaction.traceContext.tracestate || 'null'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Events</h4>
            {Object.entries(transaction.eventsById).map(([nodeId, event]) => (
              <div key={nodeId} className="mb-4 p-4 bg-gray-50 rounded">
                {event.ExercisedTreeEvent && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Exercise Event (ID: {nodeId})</h5>
                    <EventDetails
                      data={event.ExercisedTreeEvent.value}
                      onOffsetClick={onOffsetClick}
                      onContractIdClick={onContractIdClick}
                      currentContractId={currentContractId}
                    />
                  </div>
                )}

                {event.CreatedTreeEvent && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Create Event (ID: {nodeId})</h5>
                    <EventDetails
                      data={event.CreatedTreeEvent.value}
                      onOffsetClick={onOffsetClick}
                      onContractIdClick={onContractIdClick}
                      currentContractId={currentContractId}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 