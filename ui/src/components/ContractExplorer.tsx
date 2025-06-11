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
  };
}

export default function ContractExplorer() {
  const [events, setEvents] = useState<ContractEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState('');
  const [transactionTree, setTransactionTree] = useState<TransactionTree | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);

  useEffect(() => {
    if (shouldFetch && contractId) {
      fetchEvents();
      setShouldFetch(false);
    }
  }, [contractId, shouldFetch]);

  const fetchEvents = async () => {
    if (!contractId) {
      setError('Contract ID is required');
      return;
    }

    setLoading(true);
    setError(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShouldFetch(true);
  };

  const handleOffsetClick = (offset: string) => {
    fetchTransactionTree(offset);
  };

  const handleContractIdClick = (contractId: string) => {
    setContractId(contractId);
    setShouldFetch(true);
  };

  return (
    <div className="space-y-6">
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
              onChange={(e) => setContractId(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
            Search
          </button>
        </div>
      </form>

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
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Created Event</h3>
                <EventDetails
                  data={events.created.createdEvent}
                  onOffsetClick={handleOffsetClick}
                  onContractIdClick={handleContractIdClick}
                />
              </div>
            )}

            {events.archived && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Archived Event</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    <strong>Template ID:</strong> {events.archived.archivedEvent.templateId}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Package:</strong> {events.archived.archivedEvent.packageName}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Witness Parties:</strong> {events.archived.archivedEvent.witnessParties.join(', ')}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Offset:</strong>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        events.archived && handleOffsetClick(events.archived.archivedEvent.offset);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {events.archived?.archivedEvent.offset}
                    </button>
                  </p>
                </div>
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
                  <strong>Effective At:</strong> {new Date(transactionTree.transaction.effectiveAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Record Time:</strong> {new Date(transactionTree.transaction.recordTime).toLocaleString()}
                </p>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Events</h4>
                {Object.entries(transactionTree.transaction.eventsById).map(([nodeId, event]) => {
                  return (
                    <div key={nodeId} className="mb-4 p-4 bg-gray-50 rounded">
                      {event.ExercisedTreeEvent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Exercise Event</h5>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500">
                              <strong>Template ID:</strong> {event.ExercisedTreeEvent.value.templateId}
                            </p>
                            <p className="text-sm text-gray-500">
                              <strong>Choice:</strong> {event.ExercisedTreeEvent.value.choice}
                            </p>
                            <p className="text-sm text-gray-500">
                              <strong>Acting Parties:</strong> {event.ExercisedTreeEvent.value.actingParties.join(', ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              <strong>Witness Parties:</strong> {event.ExercisedTreeEvent.value.witnessParties.join(', ')}
                            </p>
                            <div className="mt-2">
                              <strong className="text-sm text-gray-500">Choice Argument:</strong>
                              <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
                                {JSON.stringify(event.ExercisedTreeEvent.value.choiceArgument, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {event.CreatedTreeEvent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Create Event</h5>
                          <EventDetails
                            data={event.CreatedTreeEvent.value}
                            onOffsetClick={handleOffsetClick}
                            onContractIdClick={handleContractIdClick}
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
