export interface ApiConfig {
  API_URL: string;
  GRANT_TYPE: string;
  CLIENT_ID: string;
  AUDIENCE?: string;
  CLIENT_SECRET?: string;
  USERNAME?: string;
  PASSWORD?: string;
  SCOPE?: string;
}

export interface ProviderConfigENVFormat {
  PROVIDER_NAME: string;
  AUTH_URL: string;
  JSON_API: ApiConfig & {
    PARTY_ID: string;
    USER_ID: string;
  };
  VALIDATOR_API: ApiConfig & {
    PARTY_ID: string;
    USER_ID: string;
  };
}

export interface AuthResponse {
  access_token: string;
}
