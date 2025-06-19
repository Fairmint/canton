'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<ContractEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [transactionTree, setTransactionTree] = useState<TransactionTree | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side initialization and URL params
  useEffect(() => {
    setIsClient(true);
    
    // Get search term from URL params
    const urlSearchTerm = searchParams.get('q');
    if (urlSearchTerm) {
      setSearchInput(urlSearchTerm);
      setShouldFetch(true);
    } else {
      // Fallback to localStorage if no URL param
      const savedInput = localStorage.getItem('lastSearchInput');
      if (savedInput) {
        setSearchInput(savedInput);
        setShouldFetch(true);
      }
    }

    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentSearchTerm = new URLSearchParams(window.location.search).get('q');
      if (currentSearchTerm !== searchInput) {
        setSearchInput(currentSearchTerm || '');
        setShouldFetch(true);
        // Clear previous results when navigating
        setEvents(null);
        setTransactionTree(null);
        setError(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [searchParams]);

  useEffect(() => {
    if (shouldFetch && searchInput && isClient) {
      performSearch();
      setShouldFetch(false);
    }
  }, [searchInput, shouldFetch, isClient]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSearchInput', value);
    }
    // Don't update URL here - only update when actually searching
  };

  // Helper function to determine search type based on input length and format
  const getSearchType = (input: string): 'contract' | 'updateId' | 'offset' | null => {
    const inputStr = String(input).trim();
    if (!inputStr) return null;
    
    // Contract IDs are very long hex strings (typically 130+ characters)
    if (inputStr.length > 100 && /^[0-9a-f]+$/i.test(inputStr)) {
      return 'contract';
    }
    
    // Update IDs are long hex strings (typically 60+ characters)
    if (inputStr.length > 50 && /^[0-9a-f]+$/i.test(inputStr)) {
      return 'updateId';
    }
    
    // Offsets are short numbers
    if (inputStr.length < 20 && /^\d+$/.test(inputStr)) {
      return 'offset';
    }
    
    return null;
  };

  const performSearch = async () => {
    if (!searchInput) {
      setError('Search input is required');
      return;
    }

    const searchType = getSearchType(searchInput);
    if (!searchType) {
      setError('Invalid input format. Please enter a valid contract ID, update ID, or offset.');
      return;
    }

    // Clear previous results
    setEvents(null);
    setTransactionTree(null);
    setError(null);

    if (searchType === 'contract') {
      await fetchEvents();
    } else {
      await fetchTransactionTree(searchType === 'updateId' ? 'byId' : 'byOffset');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        contractId: searchInput
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

  const fetchTransactionTree = async (type: 'byId' | 'byOffset') => {
    setLoadingTree(true);
    try {
      let url: string;
      if (type === 'byId') {
        url = `/api/transaction-tree-by-id/${searchInput}?eventFormat=verbose`;
      } else {
        url = `/api/transaction-tree/${searchInput}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction tree');
      }
      const data = await response.json();
      console.log('Received transaction tree data:', data);
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
    
    // Update URL and create history entry for the search
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (searchInput) {
        url.searchParams.set('q', searchInput);
      } else {
        url.searchParams.delete('q');
      }
      
      // Use pushState to create a new history entry for the search
      window.history.pushState({}, '', url.toString());
    }
    
    setShouldFetch(true);
  };

  const handleOffsetClick = (offset: string) => {
    setSearchInput(offset);
    
    // Update URL and create history entry
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('q', offset);
      window.history.pushState({}, '', url.toString());
    }
    
    setShouldFetch(true);
  };

  const handleContractIdClick = (contractId: string) => {
    handleSearchInputChange(contractId);
    
    // Update URL and create history entry
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('q', contractId);
      window.history.pushState({}, '', url.toString());
    }
    
    setShouldFetch(true);
  };

  const searchType = getSearchType(searchInput);
  const getPlaceholderText = () => {
    if (searchType === 'contract') return 'Contract ID detected';
    if (searchType === 'updateId') return 'Update ID detected';
    if (searchType === 'offset') return 'Offset detected';
    return 'Enter contract ID, update ID, or offset';
  };

  return (
    <div className="space-y-6">
      {/* Unified Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="searchInput" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="searchInput"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
              placeholder={getPlaceholderText()}
              required
            />
          </div>
          {searchType && (
            <p className="mt-1 text-sm text-gray-500">
              Search by: {searchType === 'contract' ? 'Contract ID' : searchType === 'updateId' ? 'Update ID' : 'Offset'}
            </p>
          )}
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

      {/* Contract Events Results */}
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
                  currentContractId={searchInput}
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
                  currentContractId={searchInput}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Transaction Tree Results */}
      {loadingTree ? (
        <div className="text-center py-4">Loading transaction tree...</div>
      ) : transactionTree && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                            currentContractId={searchInput}
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
                            currentContractId={searchInput}
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

      {/* No results message */}
      {!loading && !loadingTree && !events && !transactionTree && searchInput && !error && (
        <div className="text-center py-4 text-gray-500">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
}
