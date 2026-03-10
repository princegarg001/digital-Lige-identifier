import { headers } from "next/headers";
import { logger, createLogger } from "./logger";

/**
 * Extracts the correlation ID from the Next.js `headers()`.
 * Use `await getLogger()` inside Server Actions and App Router API routes to automatically bind requests to a correlation ID.
 */
export async function getLogger(moduleName?: string) {
  try {
    const headerData = await headers();
    const correlationId = headerData.get("x-correlation-id") || "unknown";
    
    let childLog = logger.child({ correlationId });
    if (moduleName) {
      childLog = childLog.child({ module: moduleName });
    }
    return childLog;
  } catch {
    // Fallback if headers() fails in a non-request context
    if (moduleName) {
      return createLogger(moduleName);
    }
    return logger;
  }
}
