import React from 'react';
import {
  truncatePartyId,
  TruncatedText,
  formatNumberWithCommas,
} from '../utils/textUtils';

interface Provider {
  name: string;
  displayName: string;
  partyId: string;
  userId: string;
}

interface WalletBalance {
  effective_unlocked_qty: string;
  effective_locked_qty: string;
  total_holding_fees: string;
  round: string;
}

interface AccountInfoProps {
  selectedProviderDetails: Provider | undefined;
  walletBalance: WalletBalance | null;
  loadingBalance: boolean;
}

export default function AccountInfo({
  selectedProviderDetails,
  walletBalance,
  loadingBalance,
}: AccountInfoProps) {
  return (
    <div className='mt-2 text-xs text-gray-600 space-y-1'>
      <div>
        Party ID:{' '}
        <span className='font-mono'>
          {selectedProviderDetails?.partyId ? (
            <TruncatedText
              displayText={truncatePartyId(selectedProviderDetails.partyId)}
              fullText={selectedProviderDetails.partyId}
            />
          ) : (
            'N/A'
          )}
        </span>
      </div>
      <div>
        User ID:{' '}
        <span className='font-mono'>{selectedProviderDetails?.userId}</span>
      </div>
      <div>
        Balance:{' '}
        <span className='font-mono'>
          {loadingBalance
            ? 'Loading...'
            : walletBalance
              ? `${formatNumberWithCommas(walletBalance.effective_unlocked_qty)} CC`
              : 'N/A'}
        </span>
      </div>
      <div>
        Locked balance:{' '}
        <span className='font-mono'>
          {loadingBalance
            ? 'Loading...'
            : walletBalance
              ? `${formatNumberWithCommas(walletBalance.effective_locked_qty)} CC`
              : 'N/A'}
        </span>
      </div>
      <div>
        Holding fees:{' '}
        <span className='font-mono'>
          {loadingBalance
            ? 'Loading...'
            : walletBalance
              ? `${formatNumberWithCommas(walletBalance.total_holding_fees)} CC`
              : 'N/A'}
        </span>
      </div>
      <div>
        Round:{' '}
        <span className='font-mono'>
          {loadingBalance
            ? 'Loading...'
            : walletBalance
              ? `${formatNumberWithCommas(walletBalance.round)}`
              : 'N/A'}
        </span>
      </div>
    </div>
  );
}
