#!/bin/bash

# Vercel Environment Variables Push Script
# Run this after: vercel login && vercel link
#
# SECURITY NOTE: This is a TEMPLATE file.
# Copy to push-env-vars.sh and fill in your actual values.
# push-env-vars.sh is gitignored and should NEVER be committed.

echo "🚀 Pushing environment variables to Vercel..."

# Jobber Configuration
vercel env add JOBBER_CLIENT_ID production <<< "your-jobber-client-id"
vercel env add JOBBER_CLIENT_SECRET production <<< "your-jobber-client-secret"
vercel env add JOBBER_API_BASE_URL production <<< "https://api.getjobber.com/api/graphql"
vercel env add JOBBER_REDIRECT_URI production <<< "https://your-app.vercel.app/api/auth/jobber/callback"

# Supabase Configuration
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://your-project.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "your-supabase-anon-key"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "your-supabase-service-role-key"

# OpenPhone Configuration
vercel env add OPENPHONE_API_KEY production <<< "your-openphone-api-key"
vercel env add OPENPHONE_API_BASE_URL production <<< "https://api.openphone.com/v1"
vercel env add OPENPHONE_PHONE_NUMBER_ID production <<< "your-openphone-phone-number-id"

# Anthropic API
vercel env add ANTHROPIC_API_KEY production <<< "your-anthropic-api-key"

# App Configuration
vercel env add NEXTAUTH_SECRET production <<< "your-nextauth-secret"
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://your-app.vercel.app"
vercel env add NEXTAUTH_URL production <<< "https://your-app.vercel.app"

echo "✅ Environment variables pushed successfully!"
echo "⚠️  Remember to redeploy your project"
