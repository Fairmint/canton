import React from 'react';

interface EventData {
  templateId: string;
  packageName?: string;
  createdAt?: string;
  signatories: string[];
  observers: string[];
  createArgument?: any;
  offset?: string;
  contractId?: string;
}

interface EventDetailsProps {
  data: EventData;
  onOffsetClick?: (offset: string) => void;
  onContractIdClick?: (contractId: string) => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({
  data,
  onOffsetClick,
  onContractIdClick,
}) => {
  const {
    templateId,
    packageName,
    createdAt,
    signatories,
    observers,
    createArgument,
    offset,
    contractId,
  } = data;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        <strong>Template ID:</strong> {templateId}
      </p>
      {packageName && (
        <p className="text-sm text-gray-500">
          <strong>Package:</strong> {packageName}
        </p>
      )}
      {contractId && onContractIdClick && (
        <p className="text-sm text-gray-500">
          <strong>Contract ID:</strong>{' '}
          <button
            type="button"
            onClick={() => onContractIdClick(contractId)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {contractId}
          </button>
        </p>
      )}
      {createdAt && (
        <p className="text-sm text-gray-500">
          <strong>Created At:</strong> {new Date(createdAt).toLocaleString()}
        </p>
      )}
      <p className="text-sm text-gray-500">
        <strong>Signatories:</strong> {signatories.join(', ')}
      </p>
      <p className="text-sm text-gray-500">
        <strong>Observers:</strong> {observers.join(', ') || 'None'}
      </p>
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
      {createArgument && (
        <div className="mt-2">
          <strong className="text-sm text-gray-500">Create Argument:</strong>
          <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
            {JSON.stringify(createArgument, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
