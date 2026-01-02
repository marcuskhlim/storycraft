export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}
