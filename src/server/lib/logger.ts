import pino from "pino";
import { env } from "./env";

/**
 * Centralized logger using Pino
 *
 * Usage:
 *   logger.info({ userId: '123' }, 'User logged in');
 *   logger.error({ err }, 'Payment failed');
 *   logger.debug('Debug message');
 *
 * Log levels: trace, debug, info, warn, error, fatal
 *
 * Environment variables:
 *   LOG_LEVEL: trace|debug|info|warn|error|fatal (default: info)
 *   NODE_ENV: development will use pretty printing
 */

const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

export const logger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "HH:MM:ss.l",
          singleLine: false,
        },
      }
    : undefined,
  // Production format (JSON)
  formatters: isDevelopment
    ? undefined
    : {
        level: (label) => {
          return { level: label };
        },
      },
});

/**
 * Create a child logger with context
 *
 * @example
 * const paymentLogger = createLogger('payment', { organizationId: '123' });
 * paymentLogger.info('Payment created');
 */
export function createLogger(
  name: string,
  context?: Record<string, unknown>
) {
  return logger.child({ service: name, ...context });
}

/**
 * Logger for webhook requests
 */
export const webhookLogger = createLogger("webhook");

/**
 * Logger for payment operations
 */
export const paymentLogger = createLogger("payment");

/**
 * Logger for Mollie API operations
 */
export const mollieLogger = createLogger("mollie");
