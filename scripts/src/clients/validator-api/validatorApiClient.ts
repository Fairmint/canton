import { AbstractClient, ProviderConfig, ProviderConfigENVFormat } from '../shared';

export class ValidatorApiClient extends AbstractClient {
    constructor(config: ProviderConfig, providerName?: string) {
        super(config, 'VALIDATOR_API', providerName);
    }
}
