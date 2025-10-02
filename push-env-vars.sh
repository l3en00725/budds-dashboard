#!/bin/bash

# Vercel Environment Variables Push Script
# Run this after: vercel login && vercel link

echo "🚀 Pushing environment variables to Vercel..."

# Jobber Configuration
vercel env add JOBBER_CLIENT_ID production <<< "6b6a9fbc-2296-4b49-88e8-2025857c94e1"
vercel env add JOBBER_CLIENT_SECRET production <<< "ce10b5d795de19c38cc1f50ae4f4d8baee15f2455dfc7c159d786165316ad17d"
vercel env add JOBBER_API_BASE_URL production <<< "https://api.getjobber.com/api/graphql"

# Supabase Configuration
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://gthftbdmschwpjjqhyhm.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTA2ODcsImV4cCI6MjA3NDY2NjY4N30.ZaaDLq-IsvUXmEn4yY_FXeQ9z8wUmrR3kgRv858wnoc"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA5MDY4NywiZXhwIjoyMDc0NjY2Njg3fQ.v3QwdqfYOOs0eL_G3ykL3b_xBsgjO2Zh5ccqSrTpl-0"

# OpenPhone Configuration
vercel env add OPENPHONE_API_KEY production <<< "HCHrJrk0WhvrTskPoLF5hsGOeOpV0VVD"
vercel env add OPENPHONE_API_BASE_URL production <<< "https://api.openphone.com/v1"

# Additional APIs
vercel env add ANTHROPIC_API_KEY production <<< "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"

# App Configuration (you'll need to update these URLs)
vercel env add NEXTAUTH_SECRET production <<< "your_nextauth_secret"

echo "✅ Environment variables pushed successfully!"
echo "⚠️  Don't forget to:"
echo "   1. Update JOBBER_REDIRECT_URI with your Vercel URL"
echo "   2. Update NEXT_PUBLIC_APP_URL with your Vercel URL"
echo "   3. Update NEXTAUTH_URL with your Vercel URL"
echo "   4. Redeploy your project"