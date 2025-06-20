import React from 'react';

export const truncatePartyId = (partyId: string): string => {
  const parts = partyId.split('::');
  if (parts.length !== 2) return partyId;

  const [prefix, suffix] = parts;
  
  // Truncate prefix if longer than 16 characters
  const truncatedPrefix = prefix.length > 16 
    ? `${prefix.slice(0, 6)}..${prefix.slice(-6)}`
    : prefix;
  
  // Truncate suffix if longer than 12 characters
  const truncatedSuffix = suffix.length > 12 
    ? `${suffix.slice(0, 6)}..${suffix.slice(-6)}`
    : suffix;

  return `${truncatedPrefix}::${truncatedSuffix}`;
};

export const truncateContractId = (contractId: string): string => {
  if (contractId.length <= 12) return contractId;
  return `${contractId.slice(0, 6)}..${contractId.slice(-6)}`;
};

export const truncateTemplateId = (
  templateId: string
): { truncatedId: string; boldPart: string } => {
  const parts = templateId.split(':');
  if (parts.length < 2) return { truncatedId: templateId, boldPart: '' };

  const hash = parts[0];
  const boldPart = parts[parts.length - 1];
  const truncatedHash =
    hash.length <= 12 ? hash : `${hash.slice(0, 6)}..${hash.slice(-6)}`;
  const middleParts = parts.slice(1, -1);
  const truncatedId = [truncatedHash, ...middleParts].join(':');

  return { truncatedId, boldPart };
};

export const formatNumberWithCommas = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 10
  });
};

export const TruncatedText: React.FC<{
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