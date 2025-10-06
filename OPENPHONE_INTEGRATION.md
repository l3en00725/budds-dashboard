# OpenPhone Integration Documentation

## Overview

The OpenPhone integration in the Budds Dashboard provides call analytics and customer communication insights. Unlike many third-party integrations that use OAuth 2.0, OpenPhone uses API key authentication for secure access to their REST API.

## Authentication Method

**Important**: OpenPhone uses **API Key authentication**, not OAuth 2.0. The original implementation incorrectly assumed OAuth 2.0 support, which has been corrected.

### API Key Authentication Flow

1. **Setup Initiation**: `/api/auth/openphone` redirects to a setup page
2. **Key Configuration**: User enters their OpenPhone API key via secure form
3. **Validation**: System validates the API key against OpenPhone's API
4. **Storage**: Valid API keys are stored in the oauth_tokens table as "api_key" type
5. **Usage**: Stored keys are used for all subsequent API calls

## Required Environment Variables

```bash
# OpenPhone Configuration (API Key Authentication)
OPENPHONE_API_KEY=your_api_key                    # Primary API key for server-side operations
OPENPHONE_API_BASE_URL=https://api.openphone.com/v1  # OpenPhone API base URL
OPENPHONE_PHONE_NUMBER_ID=your_phone_number_id    # Main phone number for call filtering

# App Configuration (for authentication flow)
NEXT_PUBLIC_APP_URL=http://localhost:3000         # Your app's base URL
```

## API Key Acquisition

1. **Access OpenPhone Dashboard**:
   - Log into your OpenPhone account
   - Navigate to "Settings" → "API" tab

2. **Generate API Key**:
   - Click "Generate API key"
   - Provide a descriptive label (e.g., "Budds Dashboard Integration")
   - Copy the generated key securely

3. **Key Permissions**:
   - OpenPhone API keys provide full API access
   - No additional scope configuration needed

## Integration Architecture

### Database Storage

API keys are stored in the `oauth_tokens` table with the following structure:

```sql
-- OpenPhone API key storage
INSERT INTO oauth_tokens (
  provider,      -- 'openphone'
  access_token,  -- The actual API key
  token_type,    -- 'api_key' (not 'Bearer')
  expires_in,    -- Set to 1 year (API keys don't expire)
  scope         -- 'api_access'
);
```

### Authentication Routes

1. **Initiation Route**: `/api/auth/openphone`
   - Checks if API key already configured
   - Generates CSRF state for security
   - Redirects to setup page or dashboard

2. **Callback Route**: `/api/auth/openphone/callback`
   - **POST**: Handles API key submission and validation
   - **GET**: Fallback redirect to setup page

### Token Management

The `oauth-tokens.ts` library handles OpenPhone API keys with special logic:

```typescript
// Special handling for OpenPhone API keys
if (provider === 'openphone' && tokenRecord.token_type === 'api_key') {
  // API keys don't expire traditionally
  return tokenRecord.access_token;
}
```

## API Usage Patterns

### Calling OpenPhone API

```typescript
// Get stored API key
const apiKey = await getOAuthToken('openphone');

// Make API call
const response = await fetch('https://api.openphone.com/v1/calls', {
  headers: {
    'Authorization': apiKey,  // Direct key, not Bearer token
    'Content-Type': 'application/json'
  }
});
```

### Available Endpoints

- **Phone Numbers**: `/v1/phone-numbers` - List workspace phone numbers
- **Calls**: `/v1/calls` - Call history and analytics
- **Messages**: `/v1/messages` - SMS/MMS message data
- **Contacts**: `/v1/contacts` - Contact management

## Security Considerations

1. **API Key Storage**:
   - Keys stored encrypted in Supabase database
   - No client-side exposure of keys
   - RLS policies protect token access

2. **CSRF Protection**:
   - State parameter used during setup flow
   - Database-based state validation
   - 10-minute state expiration

3. **Key Validation**:
   - Real-time validation against OpenPhone API
   - Immediate feedback on invalid keys
   - Graceful error handling

## Error Handling

### Common Issues

1. **Invalid API Key**:
   - Error: "Invalid OpenPhone API key"
   - Solution: Verify key from OpenPhone dashboard

2. **Insufficient Permissions**:
   - Error: "403 Forbidden"
   - Solution: Ensure workspace admin/owner role

3. **Rate Limiting**:
   - Error: "429 Too Many Requests"
   - Solution: Implement request throttling

### Debug Endpoints

- `/api/test-openphone` - Basic API key validation
- `/api/health` - Overall system health including OpenPhone

## Migration from OAuth Implementation

The original OAuth 2.0 implementation has been replaced with correct API key authentication:

### Changes Made

1. **Route Updates**:
   - `/api/auth/openphone/route.ts` - Now handles setup flow
   - `/api/auth/openphone/callback/route.ts` - Now handles key validation

2. **Token Management**:
   - Modified `oauth-tokens.ts` to handle API keys
   - Updated refresh logic for non-expiring keys

3. **Environment Variables**:
   - Removed: `OPENPHONE_CLIENT_ID`, `OPENPHONE_CLIENT_SECRET`
   - Added: `OPENPHONE_API_KEY`, `OPENPHONE_API_BASE_URL`

### Backwards Compatibility

- Existing sync endpoints continue to work
- Database structure remains unchanged
- Only authentication method updated

## Best Practices

1. **Key Rotation**:
   - Regularly rotate API keys (quarterly recommended)
   - Update both environment and database storage

2. **Error Monitoring**:
   - Monitor for 401/403 responses
   - Alert on sustained API failures

3. **Rate Limiting**:
   - Implement client-side request throttling
   - Respect OpenPhone's rate limits

4. **Data Synchronization**:
   - Use pagination for large data sets
   - Implement incremental sync where possible

## Testing

### Validation Steps

1. **API Key Test**:
   ```bash
   curl -H "Authorization: YOUR_API_KEY" \
        https://api.openphone.com/v1/phone-numbers
   ```

2. **Integration Test**:
   - Visit `/api/auth/openphone`
   - Complete setup flow
   - Verify dashboard data sync

3. **Error Testing**:
   - Test with invalid API key
   - Verify error handling and user feedback

## Support

### OpenPhone Resources

- **API Documentation**: [OpenPhone Developer Docs](https://www.openphone.com/docs)
- **Support**: contact@openphone.com
- **Rate Limits**: Check current API documentation

### Dashboard Integration Support

- Check logs in `/api/health` and `/api/test-openphone`
- Verify environment variables are set correctly
- Ensure Supabase connection for token storage

## Changelog

### v2.0 - API Key Authentication (Current)
- Replaced OAuth 2.0 with correct API key authentication
- Updated token management for non-expiring keys
- Added comprehensive error handling and validation

### v1.0 - OAuth Implementation (Deprecated)
- Incorrect OAuth 2.0 implementation
- PKCE flow that doesn't match OpenPhone API
- Replaced due to API incompatibility