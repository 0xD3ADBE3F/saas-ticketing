import { prisma } from "@/server/lib/prisma";
import { v4 as uuidv4 } from "uuid";

/**
 * Cached response from idempotency store
 */
export interface CachedResponse {
  statusCode: number;
  response: unknown;
}

/**
 * TTL for idempotency keys (24 hours)
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Idempotency repository for database operations
 */
export const idempotencyRepo = {
  /**
   * Find cached response by key and organization
   */
  async findByKey(
    key: string,
    organizationId: string,
    endpoint: string
  ): Promise<CachedResponse | null> {
    const record = await prisma.idempotencyKey.findUnique({
      where: {
        key_organizationId: {
          key,
          organizationId,
        },
      },
    });

    // Not found
    if (!record) {
      return null;
    }

    // Check if expired
    if (record.expiresAt < new Date()) {
      // Clean up expired key
      await this.delete(key, organizationId);
      return null;
    }

    // Check endpoint matches
    if (record.endpoint !== endpoint) {
      // Same key used for different endpoint - this is an error
      throw new Error(
        `Idempotency key "${key}" was already used for endpoint "${record.endpoint}"`
      );
    }

    return {
      statusCode: record.statusCode,
      response: record.response,
    };
  },

  /**
   * Store response with idempotency key
   */
  async store(
    key: string,
    organizationId: string,
    endpoint: string,
    statusCode: number,
    response: unknown
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

    await prisma.idempotencyKey.upsert({
      where: {
        key_organizationId: {
          key,
          organizationId,
        },
      },
      update: {
        statusCode,
        response: response as object,
        expiresAt,
      },
      create: {
        key,
        organizationId,
        endpoint,
        statusCode,
        response: response as object,
        expiresAt,
      },
    });
  },

  /**
   * Delete an idempotency key
   */
  async delete(key: string, organizationId: string): Promise<void> {
    await prisma.idempotencyKey.deleteMany({
      where: {
        key,
        organizationId,
      },
    });
  },

  /**
   * Clean up expired keys (for background job)
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  },
};

/**
 * Idempotency service for API routes
 */
export const idempotencyService = {
  /**
   * Generate a new idempotency key
   */
  generateKey(): string {
    return uuidv4();
  },

  /**
   * Validate idempotency key format
   */
  isValidKey(key: string): boolean {
    // UUID v4 format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  },

  /**
   * Check for cached response
   */
  async getCached(
    key: string,
    organizationId: string,
    endpoint: string
  ): Promise<CachedResponse | null> {
    return idempotencyRepo.findByKey(key, organizationId, endpoint);
  },

  /**
   * Cache a response
   */
  async cacheResponse(
    key: string,
    organizationId: string,
    endpoint: string,
    statusCode: number,
    response: unknown
  ): Promise<void> {
    await idempotencyRepo.store(key, organizationId, endpoint, statusCode, response);
  },

  /**
   * Execute with idempotency
   * If key exists, return cached response
   * Otherwise, execute action and cache result
   */
  async executeWithIdempotency<T>(
    key: string,
    organizationId: string,
    endpoint: string,
    action: () => Promise<{ statusCode: number; response: T }>
  ): Promise<{ statusCode: number; response: T; cached: boolean }> {
    // Check cache
    const cached = await this.getCached(key, organizationId, endpoint);
    if (cached) {
      return {
        statusCode: cached.statusCode,
        response: cached.response as T,
        cached: true,
      };
    }

    // Execute action
    const result = await action();

    // Cache result (only cache successful or deterministic failures)
    if (result.statusCode < 500) {
      await this.cacheResponse(
        key,
        organizationId,
        endpoint,
        result.statusCode,
        result.response
      );
    }

    return {
      ...result,
      cached: false,
    };
  },
};
