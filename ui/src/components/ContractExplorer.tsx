'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EventDetails from './EventDetails';

interface Provider {
  name: string;
  displayName: string;
}

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

type SearchType = 'contract' | 'updateId' | 'offset' | null;

export default function ContractExplorer() {
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
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loadingProviders, setLoadingProviders] = useState(false);

  // URL management helper
  const updateURL = (searchTerm?: string, provider?: string) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    if (searchTerm) {
      url.searchParams.set('q', searchTerm);
    } else {
      url.searchParams.delete('q');
    }
    
    if (provider) {
      url.searchParams.set('p', provider);
    } else {
      url.searchParams.delete('p');
    }
    
    window.history.pushState({}, '', url.toString());
  };

  // Clear results helper
  const clearResults = () => {
    setEvents(null);
    setTransactionTree(null);
    setError(null);
  };

  // Handle client-side initialization and URL params
  useEffect(() => {
    setIsClient(true);
    
    const urlSearchTerm = searchParams.get('q');
    const urlProvider = searchParams.get('p');
    
    if (urlSearchTerm) {
      setSearchInput(urlSearchTerm);
      setShouldFetch(true);
    } else {
      const savedInput = localStorage.getItem('lastSearchInput');
      if (savedInput) {
        setSearchInput(savedInput);
        setShouldFetch(true);
      }
    }

    if (urlProvider) {
      setSelectedProvider(urlProvider);
    }

    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentSearchTerm = new URLSearchParams(window.location.search).get('q');
      const currentProvider = new URLSearchParams(window.location.search).get('p');
      
      if (currentSearchTerm !== searchInput) {
        setSearchInput(currentSearchTerm || '');
        setShouldFetch(true);
        clearResults();
      }
      
      if (currentProvider !== selectedProvider) {
        setSelectedProvider(currentProvider || '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchParams]);

  // Load available providers
  useEffect(() => {
    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const response = await fetch('/api/providers');
        if (response.ok) {
          const data = await response.json();
          setProviders(data);
          if (!selectedProvider && data.length > 0) {
            setSelectedProvider(data[0].name);
          }
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (isClient) {
      loadProviders();
    }
  }, [isClient, selectedProvider]);

  useEffect(() => {
    if (shouldFetch && searchInput && isClient) {
      performSearch();
      setShouldFetch(false);
    }
  }, [searchInput, shouldFetch, isClient, selectedProvider]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSearchInput', value);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    updateURL(searchInput, provider);
    clearResults();
    
    if (searchInput) {
      setShouldFetch(true);
    }
  };

  // Simplified search type detection
  const getSearchType = (input: string): SearchType => {
    const inputStr = String(input).trim();
    if (!inputStr) return null;
    
    if (inputStr.length > 100 && /^[0-9a-f]+$/i.test(inputStr)) return 'contract';
    if (inputStr.length > 50 && /^[0-9a-f]+$/i.test(inputStr)) return 'updateId';
    if (inputStr.length < 20 && /^\d+$/.test(inputStr)) return 'offset';
    
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

    clearResults();

    if (searchType === 'contract') {
      await fetchEvents();
    } else {
      await fetchTransactionTree(searchType === 'updateId' ? 'byId' : 'byOffset');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contractId: searchInput });
      if (selectedProvider) {
        params.append('provider', selectedProvider);
      }

      const response = await fetch(`/api/events?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
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
      let url = type === 'byId' 
        ? `/api/transaction-tree-by-id/${searchInput}?eventFormat=verbose`
        : `/api/transaction-tree/${searchInput}`;
      
      if (selectedProvider) {
        url += `${type === 'byId' ? '&' : '?'}provider=${encodeURIComponent(selectedProvider)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction tree: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTransactionTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingTree(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(searchInput, selectedProvider);
    setShouldFetch(true);
  };

  // Unified click handler for both offset and contract ID clicks
  const handleItemClick = (value: string) => {
    setSearchInput(value);
    updateURL(value, selectedProvider);
    setShouldFetch(true);
  };

  const searchType = getSearchType(searchInput);
  const placeholderText = searchType 
    ? `${searchType === 'contract' ? 'Contract ID' : searchType === 'updateId' ? 'Update ID' : 'Offset'} detected`
    : 'Enter contract ID, update ID, or offset';

  return (
    <div className="space-y-6">
      {/* Unified Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="searchInput" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <div className="mt-1 flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                id="searchInput"
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                placeholder={placeholderText}
                required
              />
            </div>
            <div className="w-48">
              <select
                id="providerSelect"
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black"
                disabled={loadingProviders}
              >
                {loadingProviders ? (
                  <option>Loading...</option>
                ) : providers.length === 0 ? (
                  <option>No providers</option>
                ) : (
                  providers.map((provider) => (
                    <option key={provider.name} value={provider.name}>
                      {provider.displayName}
                    </option>
                  ))
                )}
              </select>
            </div>
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
                  onOffsetClick={handleItemClick}
                  onContractIdClick={handleItemClick}
                  currentContractId={searchInput}
                />
              </div>
            )}

            {events.archived && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Archived Event</h3>
                <EventDetails
                  data={events.archived.archivedEvent}
                  onOffsetClick={handleItemClick}
                  onContractIdClick={handleItemClick}
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
                            onOffsetClick={handleItemClick}
                            onContractIdClick={handleItemClick}
                            currentContractId={searchInput}
                          />
                        </div>
                      )}

                      {event.CreatedTreeEvent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Create Event (ID: {nodeId})</h5>
                          <EventDetails
                            data={event.CreatedTreeEvent.value}
                            onOffsetClick={handleItemClick}
                            onContractIdClick={handleItemClick}
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
