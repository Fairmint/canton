'use client';

import { useState, useEffect } from 'react';
import EventDetails from './EventDetails';

interface CreatedEvent {
  createdEvent: {
    contractId: string;
    templateId: string;
    createArgument: any;
    signatories: string[];
    observers: string[];
    createdAt: string;
    packageName: string;
    offset: string;
  };
  synchronizerId: string;
}

interface ArchivedEvent {
  archivedEvent: {
    contractId: string;
    templateId: string;
    witnessParties: string[];
    packageName: string;
    offset: string;
  };
  synchronizerId: string;
}

interface ContractEvents {
  created?: CreatedEvent;
  archived?: ArchivedEvent;
}

interface TransactionTree {
  transaction: {
    updateId: string;
    effectiveAt: string;
    offset: number;
    eventsById: {
      [key: string]: {
        ExercisedTreeEvent?: {
          value: {
            contractId: string;
            templateId: string;
            choice: string;
            choiceArgument: any;
            actingParties: string[];
            witnessParties: string[];
            exerciseResult: string;
            packageName: string;
          };
        };
        CreatedTreeEvent?: {
          value: {
            contractId: string;
            templateId: string;
            createArgument: any;
            witnessParties: string[];
            signatories: string[];
            observers: string[];
            createdAt: string;
            packageName: string;
          };
        };
      };
    };
    synchronizerId: string;
    recordTime: string;
    traceContext?: {
      traceparent: string;
      tracestate: string | null;
    };
  };
}

export default function ContractExplorer() {
  const [events, setEvents] = useState<ContractEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastContractId') || '';
    }
    return '';
  });
  const [transactionInput, setTransactionInput] = useState('');
  const [transactionTree, setTransactionTree] = useState<TransactionTree | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('lastContractId');
    }
    return false;
  });

  useEffect(() => {
    if (shouldFetch && contractId) {
      fetchEvents();
      setShouldFetch(false);
    }
  }, [contractId, shouldFetch]);

  const handleContractIdChange = (value: string) => {
    setContractId(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastContractId', value);
    }
  };

  const fetchEvents = async () => {
    if (!contractId) {
      setError('Contract ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setTransactionTree(null);
    try {
      const params = new URLSearchParams({
        contractId
      });

      const response = await fetch(`/api/events?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      console.log('Received events data:', data);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionTree = async (offset: string) => {
    setLoadingTree(true);
    setError(null);
    try {
      const url = `/api/transaction-tree/${offset}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction tree');
      }
      const data = await response.json();
      console.log('Received data:', data);
      setTransactionTree(data);
    } catch (err) {
      console.error('Error in fetchTransactionTree:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingTree(false);
    }
  };

  const fetchTransactionTreeById = async (updateId: string) => {
    setLoadingTree(true);
    setError(null);
    try {
      const url = `/api/transaction-tree-by-id/${updateId}?eventFormat=verbose`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction tree by ID');
      }
      const data = await response.json();
      console.log('Received transaction tree by ID data:', data);
      setTransactionTree(data);
    } catch (err) {
      console.error('Error in fetchTransactionTreeById:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingTree(false);
    }
  };

  // Helper function to determine if input is an update ID or offset
  const isUpdateId = (input: string): boolean => {
    // Update IDs are long hex strings (typically 64+ characters)
    // Offsets are short numbers
    return input.length > 20 && /^[0-9a-f]+$/i.test(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShouldFetch(true);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionInput) {
      if (isUpdateId(transactionInput)) {
        fetchTransactionTreeById(transactionInput);
      } else {
        fetchTransactionTree(transactionInput);
      }
    }
  };

  const handleOffsetClick = (offset: string) => {
    setTransactionInput(offset);
    fetchTransactionTree(offset);
  };

  const handleContractIdClick = (contractId: string) => {
    handleContractIdChange(contractId);
    setShouldFetch(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract ID Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="contractId" className="block text-sm font-medium text-gray-700">
              Contract ID
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="contractId"
                value={contractId}
                onChange={(e) => handleContractIdChange(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                placeholder="Enter contract ID"
                required
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Search Events
            </button>
          </div>
        </form>

        {/* Transaction Input Form */}
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <div>
            <label htmlFor="transactionInput" className="block text-sm font-medium text-gray-700">
              Transaction Input
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="transactionInput"
                value={transactionInput}
                onChange={(e) => setTransactionInput(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                placeholder="Enter update ID or offset"
                required
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Search Transaction Tree
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Loading events...</div>
      ) : events ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-6 py-4">
            {events.created && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Created Event</h3>
                <EventDetails
                  data={events.created.createdEvent}
                  onOffsetClick={handleOffsetClick}
                  onContractIdClick={handleContractIdClick}
                  currentContractId={contractId}
                />
              </div>
            )}

            {events.archived && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Archived Event</h3>
                <EventDetails
                  data={events.archived.archivedEvent}
                  onOffsetClick={handleOffsetClick}
                  onContractIdClick={handleContractIdClick}
                  currentContractId={contractId}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No events found. Enter a contract ID to search.
        </div>
      )}

      {loadingTree ? (
        <div className="text-center py-4">Loading transaction tree...</div>
      ) : transactionTree && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md mt-6">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Tree</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">
                  <strong>Update ID:</strong> {transactionTree.transaction.updateId}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Offset:</strong> {transactionTree.transaction.offset}
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
                      <strong>Synchronizer ID:</strong> {transactionTree.transaction.synchronizerId}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Effective At:</strong> {new Date(transactionTree.transaction.effectiveAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Record Time:</strong> {new Date(transactionTree.transaction.recordTime).toLocaleString()}
                    </p>
                    {transactionTree.transaction.traceContext && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          <strong>Trace Context:</strong>
                        </p>
                        <div className="ml-4 text-sm text-gray-600">
                          <p><strong>Traceparent:</strong> {transactionTree.transaction.traceContext.traceparent}</p>
                          <p><strong>Tracestate:</strong> {transactionTree.transaction.traceContext.tracestate || 'null'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Events</h4>
                {Object.entries(transactionTree.transaction.eventsById).map(([nodeId, event]) => {
                  return (
                    <div key={nodeId} className="mb-4 p-4 bg-gray-50 rounded">
                      {event.ExercisedTreeEvent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Exercise Event (ID: {nodeId})</h5>
                          <EventDetails
                            data={event.ExercisedTreeEvent.value}
                            onOffsetClick={handleOffsetClick}
                            onContractIdClick={handleContractIdClick}
                            currentContractId={contractId}
                          />
                        </div>
                      )}

                      {event.CreatedTreeEvent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Create Event (ID: {nodeId})</h5>
                          <EventDetails
                            data={event.CreatedTreeEvent.value}
                            onOffsetClick={handleOffsetClick}
                            onContractIdClick={handleContractIdClick}
                            currentContractId={contractId}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
