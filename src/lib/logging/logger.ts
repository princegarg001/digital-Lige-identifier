import pino from "pino";
import { loggingConfig } from "./config";

const isDev = process.env.NODE_ENV === "development";

// Custom serializers to redact sensitive information and format objects
const serializers = {
  // Serialize standard Next.js / Express Request objects
  req: (req: unknown) => {
    const r = req as Record<string, unknown>;
    const headers = (r.headers as Record<string, unknown>) || {};
    return {
      method: r.method,
      url: r.url,
      headers: {
        ...headers,
        authorization: headers.authorization ? "[REDACTED]" : undefined,
      },
      remoteAddress: r.remoteAddress,
    };
  },
  // Serialize standard Response objects
  res: (res: unknown) => ({
    statusCode: (res as Record<string, unknown>).statusCode,
  }),
  // Serialize errors cleanly with stack traces
  err: pino.stdSerializers.err,
  
  // Specific redactor for tool calls involving potential PII or secrets
  toolCall: (call: unknown) => {
    if (!call) return call;
    const c = call as Record<string, unknown>;
    return {
      ...c,
      args: c.name === "search_web" || c.name === "get_user_info" ? "[REDACTED ARGUMENTS]" : c.args,
    };
  }
};

const isBrowser = typeof window !== "undefined";

const transport =
  !isBrowser && isDev
    ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    })
  : undefined;

/**
 * The base logger instance.
 * Use this directly in client components or purely non-request-scoped utility functions.
 */
export const logger = pino(
  {
    level: loggingConfig.server.level,
    serializers: serializers,
    browser: {
      asObject: true,
    },
  },
  transport
);

/**
 * Creates a child logger pre-configured with a specific module context.
 * Best practice for codebase-wide logging (e.g. `const log = createLogger('lipsync-engine')`).
 */
export function createLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}

// Removed getLogger, moved to logger.server.ts
