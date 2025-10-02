# Vercel Environment Variables Setup

Copy and paste these environment variables into your Vercel project settings:

## Go to: Project Settings → Environment Variables

Add each of these one by one:

### Jobber Configuration
```
JOBBER_CLIENT_ID=6b6a9fbc-2296-4b49-88e8-2025857c94e1
JOBBER_CLIENT_SECRET=ce10b5d795de19c38cc1f50ae4f4d8baee15f2455dfc7c159d786165316ad17d
JOBBER_REDIRECT_URI=https://YOUR_VERCEL_URL.vercel.app/api/auth/jobber/callback
JOBBER_API_BASE_URL=https://api.getjobber.com/api/graphql
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://gthftbdmschwpjjqhyhm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTA2ODcsImV4cCI6MjA3NDY2NjY4N30.ZaaDLq-IsvUXmEn4yY_FXeQ9z8wUmrR3kgRv858wnoc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA5MDY4NywiZXhwIjoyMDc0NjY2Njg3fQ.v3QwdqfYOOs0eL_G3ykL3b_xBsgjO2Zh5ccqSrTpl-0
```

### OpenPhone Configuration
```
OPENPHONE_API_KEY=HCHrJrk0WhvrTskPoLF5hsGOeOpV0VVD
OPENPHONE_API_BASE_URL=https://api.openphone.com/v1
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://YOUR_VERCEL_URL.vercel.app
NEXTAUTH_URL=https://YOUR_VERCEL_URL.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret
```

### Additional APIs
```
ANTHROPIC_API_KEY=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
```

## Important Notes:
1. Replace `YOUR_VERCEL_URL` with your actual Vercel deployment URL
2. Set each environment variable for: Production, Preview, and Development
3. After adding all variables, redeploy your project

## After Setup:
1. Update your Jobber app redirect URI to match your Vercel URL
2. Test the deployment at your Vercel URL