'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import EventDetails, { EventData } from './EventDetails';
import TransactionTree, { Transaction } from './TransactionTree';

interface Provider {
  name: string;
  displayName: string;
}

interface ContractEvents {
  created?: { createdEvent: EventData; synchronizerId: string };
  archived?: { archivedEvent: EventData; synchronizerId: string };
}

type SearchType = 'contract' | 'updateId' | 'offset' | null;

const SEARCH_TYPE_LABELS: Record<NonNullable<SearchType>, string> = {
  contract: 'Contract ID',
  updateId: 'Update ID',
  offset: 'Offset',
};

export default function ContractExplorer() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<ContractEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [transactionTree, setTransactionTree] = useState<Transaction | null>(
    null
  );
  const [loadingTree, setLoadingTree] = useState(false);
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

  // Generic fetch helper
  const fetchData = async (
    url: string,
    setLoadingState: (loading: boolean) => void
  ) => {
    setLoadingState(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoadingState(false);
    }
  };

  // Simplified search type detection
  const getSearchType = (input: string): SearchType => {
    const inputStr = String(input).trim();
    if (!inputStr) return null;

    if (inputStr.length > 100 && /^[0-9a-f]+$/i.test(inputStr))
      return 'contract';
    if (inputStr.length > 50 && /^[0-9a-f]+$/i.test(inputStr))
      return 'updateId';
    if (inputStr.length < 20 && /^\d+$/.test(inputStr)) return 'offset';

    return null;
  };

  const performSearch = useCallback(async () => {
    if (!searchInput) {
      setError('Search input is required');
      return;
    }

    const searchType = getSearchType(searchInput);
    if (!searchType) {
      setError(
        'Invalid input format. Please enter a valid contract ID, update ID, or offset.'
      );
      return;
    }

    clearResults();

    if (searchType === 'contract') {
      const params = new URLSearchParams({ contractId: searchInput });
      if (selectedProvider) params.append('provider', selectedProvider);
      const data = await fetchData(`/api/events?${params}`, setLoading);
      if (data) setEvents(data);
    } else {
      const isById = searchType === 'updateId';
      let url = isById
        ? `/api/transaction-tree-by-id/${searchInput}?eventFormat=verbose`
        : `/api/transaction-tree/${searchInput}`;

      if (selectedProvider) {
        url += `${isById ? '&' : '?'}provider=${encodeURIComponent(selectedProvider)}`;
      }

      const data = await fetchData(url, setLoadingTree);
      if (data) {
        console.log(data);
        setTransactionTree(data.transaction);
      }
    }
  }, [searchInput, selectedProvider]);

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
      const currentSearchTerm = new URLSearchParams(window.location.search).get(
        'q'
      );
      const currentProvider = new URLSearchParams(window.location.search).get(
        'p'
      );

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
  }, [searchParams, searchInput, selectedProvider]);

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
  }, [searchInput, shouldFetch, isClient, selectedProvider, performSearch]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(searchInput, selectedProvider);
    setShouldFetch(true);
  };

  // Unified click handler for both offset and contract ID clicks
  const handleSearchClick = (value: string) => {
    setSearchInput(value);
    updateURL(value, selectedProvider);
    setShouldFetch(true);
  };

  const searchType = getSearchType(searchInput);
  const searchTypeLabel = searchType ? SEARCH_TYPE_LABELS[searchType] : null;
  const placeholderText = searchTypeLabel
    ? `${searchTypeLabel} detected`
    : 'Enter contract ID, update ID, or offset';

  // Loading component
  const LoadingSpinner = ({ message }: { message: string }) => (
    <div className='text-center py-4'>{message}</div>
  );

  // Event card component
  const EventCard = ({ title, data }: { title: string; data: any }) => (
    <div className='mb-4 p-4 bg-gray-50 rounded'>
      <h3 className='text-lg font-medium text-gray-900 mb-4'>{title}</h3>
      <EventDetails
        data={data}
        onSearchClick={handleSearchClick}
        currentContractId={searchInput}
      />
    </div>
  );

  return (
    <div className='space-y-6'>
      {/* Unified Search Form */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label
            htmlFor='searchInput'
            className='block text-sm font-medium text-gray-700'
          >
            Search
          </label>
          <div className='mt-1 flex gap-2'>
            <div className='flex-1'>
              <input
                type='text'
                id='searchInput'
                value={searchInput}
                onChange={e => handleSearchInputChange(e.target.value)}
                className='shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black'
                placeholder={placeholderText}
                required
              />
            </div>
            <div className='w-48'>
              <select
                id='providerSelect'
                value={selectedProvider}
                onChange={e => handleProviderChange(e.target.value)}
                className='shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-black'
                disabled={loadingProviders}
              >
                {loadingProviders ? (
                  <option>Loading...</option>
                ) : providers.length === 0 ? (
                  <option>No providers</option>
                ) : (
                  providers.map(provider => (
                    <option key={provider.name} value={provider.name}>
                      {provider.displayName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          {searchTypeLabel && (
            <p className='mt-1 text-sm text-gray-500'>
              Search by: {searchTypeLabel}
            </p>
          )}
        </div>
        <div>
          <button
            type='submit'
            className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          >
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
          {error}
        </div>
      )}

      {/* Contract Events Results */}
      {loading ? (
        <LoadingSpinner message='Loading events...' />
      ) : events ? (
        <div className='bg-white shadow overflow-hidden sm:rounded-md'>
          <div className='px-6 py-4'>
            {events.created && (
              <EventCard
                title='Created Event'
                data={events.created.createdEvent}
              />
            )}
            {events.archived && (
              <EventCard
                title='Archived Event'
                data={events.archived.archivedEvent}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Transaction Tree Results */}
      {loadingTree ? (
        <LoadingSpinner message='Loading transaction tree...' />
      ) : (
        transactionTree && (
          <TransactionTree
            transaction={transactionTree}
            onSearchClick={handleSearchClick}
            currentContractId={searchInput}
          />
        )
      )}

      {/* No results message */}
      {!loading &&
        !loadingTree &&
        !events &&
        !transactionTree &&
        searchInput &&
        !error && (
          <div className='text-center py-4 text-gray-500'>
            No results found. Try a different search term.
          </div>
        )}
    </div>
  );
}
