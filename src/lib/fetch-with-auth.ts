// In-memory token storage for performance
let currentAccessToken: string | null = null;

/**
 * Smart fetch wrapper that handles OAuth authentication with auto-retry
 * Supports both Jobber and OpenPhone APIs with automatic token refresh
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  provider: 'jobber' | 'openphone' = 'jobber'
): Promise<Response> {
  // Get current access token from multiple sources
  const getAccessToken = async (): Promise<string | null> => {
    // 1. Check in-memory cache first (fastest)
    if (currentAccessToken) {
      return currentAccessToken;
    }

    // 2. Try to get fresh token from database via API
    try {
      const tokenResponse = await fetch(`/api/auth/refresh?provider=${provider}`);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          currentAccessToken = tokenData.access_token; // Cache it
          return tokenData.access_token;
        }
      }
    } catch (error) {
      console.warn('Failed to get token from database, falling back to cookies:', error);
    }

    // 3. Fallback to cookies (client-side only)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith(`${provider}_access_token=`));
      const token = tokenCookie ? tokenCookie.split('=')[1] : null;
      if (token) {
        currentAccessToken = token; // Cache it
      }
      return token;
    }

    return null;
  };

  const makeRequest = async (accessToken: string | null): Promise<Response> => {
    const headers = new Headers(options.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // First attempt with current token
  let accessToken = await getAccessToken();
  let response = await makeRequest(accessToken);

  // If 401, try to refresh and retry
  if (response.status === 401) {
    console.log(`401 received, attempting to refresh ${provider} token`);

    // Clear cached token since it's invalid
    currentAccessToken = null;

    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();

        if (refreshData.access_token) {
          // Store new token in memory
          currentAccessToken = refreshData.access_token;
          // Retry the original request with new token
          response = await makeRequest(refreshData.access_token);
          console.log(`Successfully refreshed ${provider} token and retried request`);
        } else {
          throw new Error('No access token in refresh response');
        }
      } else {
        const errorText = await refreshResponse.text();
        throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`${provider} token refresh failed:`, error);
      throw new Error(`Authentication failed for ${provider}. Please re-authenticate.`);
    }
  }

  return response;
}