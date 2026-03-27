import axios, { AxiosInstance } from 'axios';

export class TestClient {
    private client: AxiosInstance;
    private baseURL: string;

    constructor(baseURL: string = 'http://127.0.0.1:8080') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async post(endpoint: string, data: any) {
        try {
            const response = await this.client.post(endpoint, data);
            return response.data;
        } catch (error: any) {
            if (error.response) {
                const wrappedError = Object.assign(
                    new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`),
                    { cause: error }
                );
                throw wrappedError;
            }
            throw error;
        }
    }

    async get(endpoint: string) {
        try {
            const response = await this.client.get(endpoint);
            return response.data;
        } catch (error: any) {
            if (error.response) {
                const wrappedError = Object.assign(
                    new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`),
                    { cause: error }
                );
                throw wrappedError;
            }
            throw error;
        }
    }
} 