import React, { useState } from 'react';
import { truncatePartyId, truncateContractId, truncateTemplateId, TruncatedText } from '../utils/textUtils';

export interface EventData {
  templateId: string;
  packageName?: string;
  createdAt?: string;
  signatories?: string[];
  observers?: string[];
  witnessParties?: string[];
  createArgument?: any;
  choiceArgument?: any;
  choice?: string;
  actingParties?: string[];
  offset?: string;
  contractId?: string;
  consuming?: boolean;
  exerciseResult?: any;
}

interface EventDetailsProps {
  data: EventData;
  onSearchClick?: (value: string) => void;
  currentContractId?: string;
}

const ContractIdDisplay: React.FC<{
  contractId: string;
  isClickable: boolean;
  onClick?: () => void;
}> = ({ contractId, isClickable, onClick }) => {
  const truncatedId = truncateContractId(contractId);

  const content = (
    <TruncatedText displayText={truncatedId} fullText={contractId} />
  );

  if (isClickable && onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className='text-blue-600 hover:text-blue-800 underline'
      >
        {content}
      </button>
    );
  }

  return content;
};

const PartyList: React.FC<{
  parties: string[];
  label: string;
}> = ({ parties, label }) => (
  <p className='text-sm text-gray-500'>
    <strong>{label}:</strong>{' '}
    {parties.map((party, index) => (
      <React.Fragment key={party}>
        <TruncatedText displayText={truncatePartyId(party)} fullText={party} />
        {index < parties.length - 1 ? ', ' : ''}
      </React.Fragment>
    ))}
  </p>
);

const EventDetails: React.FC<EventDetailsProps> = ({
  data,
  onSearchClick,
  currentContractId,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const {
    templateId,
    packageName,
    createdAt,
    signatories,
    observers,
    createArgument,
    choiceArgument,
    choice,
    actingParties,
    offset,
    contractId,
    witnessParties,
    consuming,
    exerciseResult,
  } = data;

  return (
    <div className='space-y-2'>
      <p className='text-sm text-gray-500'>
        <strong>Template ID:</strong>{' '}
        {(() => {
          const { truncatedId, boldPart } = truncateTemplateId(templateId);
          return (
            <>
              <TruncatedText displayText={truncatedId} fullText={templateId} />
              {boldPart && (
                <>
                  :<strong>{boldPart}</strong>
                </>
              )}
            </>
          );
        })()}
      </p>
      {contractId && (
        <p className='text-sm text-gray-500'>
          <strong>Contract ID:</strong>{' '}
          <ContractIdDisplay
            contractId={contractId}
            isClickable={!!onSearchClick && contractId !== currentContractId}
            onClick={
              onSearchClick ? () => onSearchClick(contractId) : undefined
            }
          />
        </p>
      )}
      {createArgument && (
        <div className='mt-2'>
          <strong className='text-sm text-gray-500'>Create Argument:</strong>
          <pre className='mt-1 text-sm text-gray-900 bg-white p-2 rounded'>
            {JSON.stringify(createArgument, null, 2)}
          </pre>
        </div>
      )}
      {choice && (
        <div className='text-sm text-gray-500'>
          <strong>Choice:</strong>
          {choiceArgument ? (
            <pre className='mt-1 text-sm text-gray-900 bg-white p-2 rounded'>
              {choice}({JSON.stringify(choiceArgument, null, 2)})
            </pre>
          ) : (
            <span className='ml-1'>{choice}</span>
          )}
        </div>
      )}
      {consuming !== undefined && (
        <p className='text-sm text-gray-500'>
          <strong>Consuming:</strong> {consuming ? 'Yes' : 'No'}
        </p>
      )}
      {exerciseResult && (
        <div className='text-sm text-gray-500'>
          <strong>Exercise Result:</strong>{' '}
          <pre className='mt-1 text-sm text-gray-900 bg-white p-2 rounded'>
            {JSON.stringify(exerciseResult, null, 2)}
          </pre>
        </div>
      )}
      {offset && onSearchClick && (
        <p className='text-sm text-gray-500'>
          <strong>Offset:</strong>{' '}
          <button
            type='button'
            onClick={() => onSearchClick(offset)}
            className='text-blue-600 hover:text-blue-800 underline'
          >
            {offset}
          </button>
        </p>
      )}
      <div className='mt-4'>
        <button
          type='button'
          onClick={() => setShowDetails(!showDetails)}
          className='text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1'
        >
          {showDetails ? (
            <>
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
              Hide Details
            </>
          ) : (
            <>
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
              Show Details
            </>
          )}
        </button>
        {showDetails && (
          <div className='mt-2 space-y-2 pl-4 border-l-2 border-gray-200'>
            {packageName && (
              <p className='text-sm text-gray-500'>
                <strong>Package:</strong> {packageName}
              </p>
            )}
            {createdAt && (
              <p className='text-sm text-gray-500'>
                <strong>Created At:</strong>{' '}
                {new Date(createdAt).toLocaleString()}
              </p>
            )}
            {actingParties && actingParties.length > 0 && (
              <PartyList parties={actingParties} label='Acting Parties' />
            )}
            {signatories && signatories.length > 0 && (
              <PartyList parties={signatories} label='Signatories' />
            )}
            {observers && observers.length > 0 && (
              <PartyList parties={observers} label='Observers' />
            )}
            {witnessParties && witnessParties.length > 0 && (
              <PartyList parties={witnessParties} label='Witness Parties' />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
