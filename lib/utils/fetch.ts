/**
 * Safe fetch wrapper that handles JSON parsing errors gracefully
 *
 * IMPORTANT: Always check response.ok BEFORE parsing JSON to avoid
 * "Unexpected end of JSON input" errors when response has no body
 */

export interface SafeFetchOptions extends RequestInit {
  /** If true, throw error on non-OK responses. If false, return error in result */
  throwOnError?: boolean;
}

export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Safely fetch and parse JSON, handling errors gracefully
 *
 * @example
 * ```ts
 * const result = await safeFetch<MyData>('/api/endpoint');
 * if (result.ok) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const { throwOnError = false, ...fetchOptions } = options;

  try {
    // Add credentials by default for authenticated requests
    const response = await fetch(url, {
      credentials: 'include',
      ...fetchOptions,
    });

    // Check status BEFORE parsing JSON
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      // Try to get error message from response
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use statusText
        errorMessage = response.statusText || errorMessage;
      }

      if (throwOnError) {
        throw new Error(errorMessage);
      }

      return {
        ok: false,
        status: response.status,
        error: errorMessage,
      };
    }

    // Safe to parse JSON for successful responses
    let data: T;
    try {
      data = await response.json();
    } catch (e) {
      const errorMessage = 'Invalid JSON response from server';

      if (throwOnError) {
        throw new Error(errorMessage);
      }

      return {
        ok: false,
        status: response.status,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network request failed';

    if (throwOnError) {
      throw error;
    }

    return {
      ok: false,
      status: 0,
      error: errorMessage,
    };
  }
}

/**
 * Safe fetch that throws on error (for use with try/catch)
 *
 * @example
 * ```ts
 * try {
 *   const result = await safeFetchOrThrow<MyData>('/api/endpoint');
 *   console.log(result.data);
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export async function safeFetchOrThrow<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, { ...options, throwOnError: true });
}
