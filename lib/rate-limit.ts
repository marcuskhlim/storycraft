import { LRUCache } from "lru-cache";

type Options = {
    maxItems?: number;
    interval?: number;
};

export const rateLimit = (options?: Options) => {
    const cache = new LRUCache<string, number>({
        max: options?.maxItems || 500,
        ttl: options?.interval || 60000,
    });

    return {
        check: (limit: number, identifier: string) =>
            new Promise<void>((resolve, reject) => {
                const currentUsage = cache.get(identifier) || 0;
                const isRateLimited = currentUsage >= limit;

                if (isRateLimited) {
                    return reject(new Error("Rate limit exceeded"));
                }

                cache.set(identifier, currentUsage + 1);
                return resolve();
            }),
    };
};

// Default rate limiter: 50 requests per minute
export const limiter = rateLimit({
    interval: 60000, // 60 seconds
    maxItems: 500, // Max 500 unique identifiers in memory
});
