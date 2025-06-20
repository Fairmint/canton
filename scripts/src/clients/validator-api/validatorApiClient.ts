import {
  AbstractClient,
  ProviderConfig,
  ProviderConfigENVFormat,
} from '../shared';

// Define interface for error response
interface ErrorResponse {
  data?: any;
}

interface WalletBalanceResponse {
  round: number;
  effective_unlocked_qty: string;
  effective_locked_qty: string; 
  total_holding_fees: string;
}

export class ValidatorApiClient extends AbstractClient {
  constructor(config: ProviderConfig, providerName?: string) {
    super(config, 'VALIDATOR_API', providerName);
  }


  async getWalletBalance(): Promise<WalletBalanceResponse> {
    try {
      const response = await this.makeGetRequest(
        `${this.provider.VALIDATOR_API.API_URL}/api/validator/v0/wallet/balance`,
        { contentType: 'application/json', includeBearerToken: true }
      );

      await this.logRequestResponse(
        `${this.provider.VALIDATOR_API.API_URL}/api/validator/v0/wallet/balance`,
        {},
        response
      );

      return response as WalletBalanceResponse;
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error && (error.response as ErrorResponse)?.data) {
        const errorData = JSON.stringify((error.response as ErrorResponse).data, null, 2);
        throw new Error(`Failed to get wallet balance: ${errorData}`);
      }
      throw error;
    }
  }
}
