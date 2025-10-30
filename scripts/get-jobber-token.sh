#!/bin/bash
# Get Jobber access token from Supabase

# Load environment variables
source .env.local 2>/dev/null || source .env 2>/dev/null

# Query Supabase for the token
TOKEN=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobber_tokens?id=eq.1&select=access_token" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['access_token'] if data else '')")

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Could not retrieve Jobber token from Supabase"
  exit 1
fi

echo "✅ Retrieved Jobber token from Supabase"
echo ""
echo "Run this command to export it:"
echo "export JOBBER_ACCESS_TOKEN=\"$TOKEN\""
