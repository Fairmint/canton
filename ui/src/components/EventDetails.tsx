import React, { useState } from 'react';

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
  onOffsetClick?: (offset: string) => void;
  onContractIdClick?: (contractId: string) => void;
  currentContractId?: string;
}

const truncateContractId = (contractId: string): string => {
  if (contractId.length <= 12) return contractId;
  return `${contractId.slice(0, 6)}..${contractId.slice(-6)}`;
};

const truncateTemplateId = (templateId: string): { truncatedId: string; boldPart: string } => {
  const parts = templateId.split(':');
  if (parts.length < 2) return { truncatedId: templateId, boldPart: '' };

  const hash = parts[0];
  const boldPart = parts[parts.length - 1];
  const truncatedHash = hash.length <= 12 ? hash : `${hash.slice(0, 6)}..${hash.slice(-6)}`;
  const middleParts = parts.slice(1, -1);
  const truncatedId = [truncatedHash, ...middleParts].join(':');

  return { truncatedId, boldPart };
};

const truncatePartyId = (partyId: string): string => {
  const parts = partyId.split('::');
  if (parts.length !== 2) return partyId;

  const [prefix, suffix] = parts;
  if (suffix.length <= 12) return partyId;

  return `${prefix}::${suffix.slice(0, 6)}..${suffix.slice(-6)}`;
};

const TruncatedText: React.FC<{
  displayText: string;
  fullText: string;
  className?: string;
}> = ({ displayText, fullText, className = '' }) => (
  <span
    className={`group relative inline-block cursor-pointer ${className}`}
    title={fullText}
  >
    {displayText}
    <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
      {fullText}
    </span>
  </span>
);

const ContractIdDisplay: React.FC<{
  contractId: string;
  isClickable: boolean;
  onClick?: () => void;
}> = ({ contractId, isClickable, onClick }) => {
  const truncatedId = truncateContractId(contractId);

  const content = (
    <TruncatedText
      displayText={truncatedId}
      fullText={contractId}
    />
  );

  if (isClickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-blue-600 hover:text-blue-800 underline"
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
  <p className="text-sm text-gray-500">
    <strong>{label}:</strong>{' '}
    {parties.map((party, index) => (
      <React.Fragment key={party}>
        <TruncatedText
          displayText={truncatePartyId(party)}
          fullText={party}
        />
        {index < parties.length - 1 ? ', ' : ''}
      </React.Fragment>
    ))}
  </p>
);

const EventDetails: React.FC<EventDetailsProps> = ({
  data,
  onOffsetClick,
  onContractIdClick,
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
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        <strong>Template ID:</strong>{' '}
        {(() => {
          const { truncatedId, boldPart } = truncateTemplateId(templateId);
          return (
            <>
              <TruncatedText
                displayText={truncatedId}
                fullText={templateId}
              />
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
        <p className="text-sm text-gray-500">
          <strong>Contract ID:</strong>{' '}
          <ContractIdDisplay
            contractId={contractId}
            isClickable={!!onContractIdClick && contractId !== currentContractId}
            onClick={onContractIdClick ? () => onContractIdClick(contractId) : undefined}
          />
        </p>
      )}
      {createArgument && (
        <div className="mt-2">
          <strong className="text-sm text-gray-500">Create Argument:</strong>
          <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
            {JSON.stringify(createArgument, null, 2)}
          </pre>
        </div>
      )}
      {choice && (
        <div className="text-sm text-gray-500">
          <strong>Choice:</strong>
          {choiceArgument ? (
            <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
              {choice}({JSON.stringify(choiceArgument, null, 2)})
            </pre>
          ) : (
            <span className="ml-1">{choice}</span>
          )}
        </div>
      )}
      {consuming !== undefined && (
        <p className="text-sm text-gray-500">
          <strong>Consuming:</strong> {consuming ? 'Yes' : 'No'}
        </p>
      )}
      {exerciseResult && (
        <p className="text-sm text-gray-500">
          <strong>Exercise Result:</strong>{' '}
          <ContractIdDisplay
            contractId={String(exerciseResult)}
            isClickable={!!onContractIdClick && String(exerciseResult) !== currentContractId}
            onClick={onContractIdClick ? () => onContractIdClick(String(exerciseResult)) : undefined}
          />
        </p>
      )}
      {offset && onOffsetClick && (
        <p className="text-sm text-gray-500">
          <strong>Offset:</strong>{' '}
          <button
            type="button"
            onClick={() => onOffsetClick(offset)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {offset}
          </button>
        </p>
      )}
      <div className="mt-4">
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
            {packageName && (
              <p className="text-sm text-gray-500">
                <strong>Package:</strong> {packageName}
              </p>
            )}
            {createdAt && (
              <p className="text-sm text-gray-500">
                <strong>Created At:</strong> {new Date(createdAt).toLocaleString()}
              </p>
            )}
            {actingParties && actingParties.length > 0 && (
              <PartyList parties={actingParties} label="Acting Parties" />
            )}
            {signatories && signatories.length > 0 && (
              <PartyList parties={signatories} label="Signatories" />
            )}
            {observers && observers.length > 0 && (
              <PartyList parties={observers} label="Observers" />
            )}
            {witnessParties && witnessParties.length > 0 && (
              <PartyList parties={witnessParties} label="Witness Parties" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
