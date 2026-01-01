const isDev = process.env.NODE_ENV === "development";

export const clientLogger = {
    debug: (...args: unknown[]) => isDev && console.debug("[DEBUG]", ...args),
    info: (...args: unknown[]) => isDev && console.info("[INFO]", ...args),
    warn: (...args: unknown[]) => console.warn("[WARN]", ...args),
    error: (...args: unknown[]) => console.error("[ERROR]", ...args),
    log: (...args: unknown[]) => isDev && console.log("[LOG]", ...args),
};
