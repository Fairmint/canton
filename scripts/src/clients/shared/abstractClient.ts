import axios, { AxiosInstance } from "axios";
import { ProviderConfig } from "./config";
import { ApiConfig, AuthResponse, ProviderConfigENVFormat } from "./types";
import path from "path";
import * as fs from 'fs';

type GetHeadersConfig = {
    contentType?: string;
    includeBearerToken?: boolean;
};

export class AbstractClient {
    private config: ProviderConfig;
    private apiType: 'JSON_API' | 'VALIDATOR_API';
    public bearerToken: string | null = null;
    public provider: ProviderConfigENVFormat; // The selected provider configuration
    private axiosInstance: AxiosInstance;
    private logDir: string;

    constructor(config: ProviderConfig, apiType: 'JSON_API' | 'VALIDATOR_API', providerName?: string) {
        this.config = config;
        this.apiType = apiType;
        // Select the provider by name or default to index 0
        if (providerName) {
            const provider = config.getProviderByName(providerName);
            if (!provider) {
                throw new Error(`Provider '${providerName}' not found. Available providers: ${config.getAllProviders().map(p => p.PROVIDER_NAME).join(', ')}`);
            }
            this.provider = provider;
        } else {
            // Default to first provider (index 0)
            const provider = config.getProviderByIndex(0);
            if (!provider) {
                throw new Error('No providers available in configuration');
            }
            this.provider = provider;
        }
        
        this.axiosInstance = axios.create();
        this.logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    public async authenticate(): Promise<string> {
        const formData = new URLSearchParams();
        formData.append('grant_type', this.provider[this.apiType].GRANT_TYPE);
        formData.append('client_id', this.provider[this.apiType].CLIENT_ID);
        const clientSecret = this.provider[this.apiType]?.CLIENT_SECRET;
        if(clientSecret) {
          formData.append('client_secret', clientSecret);
        }
        const audience = this.provider[this.apiType]?.AUDIENCE;
        if(audience) {
            formData.append('audience', audience);
        }
        const scope = this.provider[this.apiType]?.SCOPE;
        if(scope) {
            formData.append('scope', scope);
        }

        try {
            const response = await this.makePostRequest<AuthResponse>(
                this.provider.AUTH_URL,
                formData.toString(),
               {contentType: 'application/x-www-form-urlencoded', includeBearerToken: false}
            );

            this.bearerToken = response.access_token;
            return this.bearerToken;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
                throw new Error(`Authentication failed: ${errorData}`);
            }
            throw error;
        }
    }

    public async getBearerToken(): Promise<string> {
        if (!this.bearerToken) {
            await this.authenticate();
        }
        return this.bearerToken || '';
    }

    protected async getHeaders(config: GetHeadersConfig): Promise<Record<string, string>> {
        if (!this.bearerToken && config.includeBearerToken) {
            await this.authenticate();
        }

        return {
            ...(config.includeBearerToken && { 'Authorization': `Bearer ${this.bearerToken}` }),
            ...(config.contentType && { 'Content-Type': config.contentType }),
        };
    }

    protected async logRequestResponse(url: string, request: any, response: any) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(this.logDir, `request-${timestamp}.json`);

        const logData = {
            timestamp,
            url,
            request,
            response
        };

        try {
            // Use a replacer function to handle non-serializable values
            const safeStringify = (obj: any) => {
                return JSON.stringify(obj, (key, value) => {
                    if (value === undefined) {
                        return '[undefined]';
                    }
                    if (typeof value === 'function') {
                        return '[function]';
                    }
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack
                        };
                    }
                    return value;
                }, 2);
            };

            fs.writeFileSync(logFile, safeStringify(logData));
        } catch (error) {
            // If serialization fails, log a simplified version
            const fallbackLogData = {
                timestamp,
                url,
                request: request ? '[request data]' : null,
                response: response ? '[response data]' : null,
                serializationError: error instanceof Error ? error.message : String(error)
            };
            
            try {
                fs.writeFileSync(logFile, JSON.stringify(fallbackLogData, null, 2));
            } catch (fallbackError) {
                // If even the fallback fails, write a minimal log
                fs.writeFileSync(logFile, JSON.stringify({
                    timestamp,
                    url,
                    error: 'Failed to serialize log data'
                }, null, 2));
            }
        }
    }

    protected async makePostRequest<T>(url: string, data: any, getHeadersConfig: GetHeadersConfig): Promise<T> {
        try {
            const headers = await this.getHeaders(getHeadersConfig);
            const response = await this.axiosInstance.post<T>(url, data, { headers });
            await this.logRequestResponse(url, data, response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;

                // Check for security-sensitive error
                if (errorData?.cause === "A security-sensitive error has been received") {
                    // Clear the bearer token to force re-authentication
                    this.bearerToken = null;

                    // Get new headers with fresh authentication
                    const newHeaders = await this.getHeaders(getHeadersConfig);

                    // Retry the request once with new authentication
                    try {
                        const retryResponse = await this.axiosInstance.post<T>(url, data, { headers: newHeaders });
                        await this.logRequestResponse(url, data, retryResponse.data);
                        return retryResponse.data;
                    } catch (retryError: unknown) {
                        // If retry fails, log and throw the original error
                        await this.logRequestResponse(url, data, {
                            error: axios.isAxiosError(retryError) ? retryError.response?.data || retryError.message : retryError
                        });
                        throw error;
                    }
                }

                await this.logRequestResponse(url, data, {
                    error: errorData || error.message
                });
                throw error;
            }
            throw error;
        }
    }

    protected async makeGetRequest<T>(url: string, getHeadersConfig: GetHeadersConfig): Promise<T> {
        try {
            const headers = await this.getHeaders(getHeadersConfig);
            const response = await this.axiosInstance.get<T>(url, { headers });
            await this.logRequestResponse(url, null, response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data;

                // Check for security-sensitive error
                if (errorData?.cause === "A security-sensitive error has been received") {
                    // Clear the bearer token to force re-authentication
                    this.bearerToken = null;

                    // Get new headers with fresh authentication
                    const newHeaders = await this.getHeaders(getHeadersConfig);

                    // Retry the request once with new authentication
                    try {
                        const retryResponse = await this.axiosInstance.get<T>(url, { headers: newHeaders });
                        await this.logRequestResponse(url, null, retryResponse.data);
                        return retryResponse.data;
                    } catch (retryError: unknown) {
                        // If retry fails, log and throw the original error
                        await this.logRequestResponse(url, null, {
                            error: axios.isAxiosError(retryError) ? retryError.response?.data || retryError.message : retryError
                        });
                        throw error;
                    }
                }

                await this.logRequestResponse(url, null, {
                    error: errorData || error.message
                });
                throw error;
            }
            throw error;
        }
    }
  }