import { createServiceRoleClient } from './supabase';
import type { Database } from './supabase';

type OAuthToken = Database['public']['Tables']['oauth_tokens']['Row'];
type OAuthTokenInsert = Database['public']['Tables']['oauth_tokens']['Insert'];
type OAuthTokenUpdate = Database['public']['Tables']['oauth_tokens']['Update'];

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export class OAuthTokenManager {
  private supabase = createServiceRoleClient();

  async storeToken(provider: string, tokenData: TokenData): Promise<void> {
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const tokenRecord: OAuthTokenInsert = {
      provider,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: expiresAt,
      scope: tokenData.scope || null,
    };

    const { error } = await this.supabase
      .from('oauth_tokens')
      .upsert(tokenRecord, {
        onConflict: 'provider',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Failed to store ${provider} token:`, error);
      throw new Error(`Failed to store ${provider} token: ${error.message}`);
    }

    console.log(`Successfully stored ${provider} token in database`);
  }

  async getToken(provider: string): Promise<OAuthToken | null> {
    const { data, error } = await this.supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', provider)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No token found
        return null;
      }
      console.error(`Failed to retrieve ${provider} token:`, error);
      throw new Error(`Failed to retrieve ${provider} token: ${error.message}`);
    }

    return data;
  }

  async getValidToken(provider: string): Promise<string | null> {
    const tokenRecord = await this.getToken(provider);

    if (!tokenRecord) {
      return null;
    }

    // Check if token is expired
    if (tokenRecord.expires_at) {
      const expiresAt = new Date(tokenRecord.expires_at);
      const now = new Date();

      // Consider token expired if it expires in the next 5 minutes
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (expiresAt.getTime() - now.getTime() < bufferTime) {
        console.log(`${provider} token expired or expiring soon, attempting refresh`);

        // Try to refresh the token
        const refreshedToken = await this.refreshToken(provider);
        return refreshedToken;
      }
    }

    return tokenRecord.access_token;
  }

  async refreshToken(provider: string): Promise<string | null> {
    const tokenRecord = await this.getToken(provider);

    if (!tokenRecord?.refresh_token) {
      console.error(`No refresh token available for ${provider}`);
      return null;
    }

    try {
      if (provider === 'jobber') {
        return await this.refreshJobberToken(tokenRecord.refresh_token);
      } else if (provider === 'openphone') {
        return await this.refreshOpenPhoneToken(tokenRecord.refresh_token);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Failed to refresh ${provider} token:`, error);
      return null;
    }
  }

  private async refreshJobberToken(refreshToken: string): Promise<string | null> {
    const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID;
    const JOBBER_CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET;

    if (!JOBBER_CLIENT_ID || !JOBBER_CLIENT_SECRET) {
      throw new Error('Missing Jobber client credentials');
    }

    const response = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: JOBBER_CLIENT_ID,
        client_secret: JOBBER_CLIENT_SECRET,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jobber token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();

    // Store the new token
    await this.storeToken('jobber', tokenData);

    return tokenData.access_token;
  }

  private async refreshOpenPhoneToken(refreshToken: string): Promise<string | null> {
    const OPENPHONE_CLIENT_ID = process.env.OPENPHONE_CLIENT_ID;
    const OPENPHONE_CLIENT_SECRET = process.env.OPENPHONE_CLIENT_SECRET;

    if (!OPENPHONE_CLIENT_ID || !OPENPHONE_CLIENT_SECRET) {
      throw new Error('Missing OpenPhone client credentials');
    }

    const response = await fetch('https://api.openphone.com/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: OPENPHONE_CLIENT_ID,
        client_secret: OPENPHONE_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenPhone token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();

    // Store the new token
    await this.storeToken('openphone', tokenData);

    return tokenData.access_token;
  }

  async deleteToken(provider: string): Promise<void> {
    const { error } = await this.supabase
      .from('oauth_tokens')
      .delete()
      .eq('provider', provider);

    if (error) {
      console.error(`Failed to delete ${provider} token:`, error);
      throw new Error(`Failed to delete ${provider} token: ${error.message}`);
    }

    console.log(`Successfully deleted ${provider} token from database`);
  }

  async isTokenValid(provider: string): Promise<boolean> {
    const token = await this.getValidToken(provider);
    return token !== null;
  }
}

// Singleton instance
export const oauthTokenManager = new OAuthTokenManager();

// Convenience functions
export const storeOAuthToken = (provider: string, tokenData: TokenData) =>
  oauthTokenManager.storeToken(provider, tokenData);

export const getOAuthToken = (provider: string) =>
  oauthTokenManager.getValidToken(provider);

export const refreshOAuthToken = (provider: string) =>
  oauthTokenManager.refreshToken(provider);

export const deleteOAuthToken = (provider: string) =>
  oauthTokenManager.deleteToken(provider);

export const isOAuthTokenValid = (provider: string) =>
  oauthTokenManager.isTokenValid(provider);