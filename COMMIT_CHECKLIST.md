# ✅ Safe Commit Checklist

Follow these steps to safely commit the security fixes.

---

## 📦 What's Changed

### Files Modified:
- ✏️ `src/app/api/auth/jobber/callback/route.ts` - httpOnly cookie fix
- ✏️ `src/app/api/sync/openphone/route.ts` - Environment variable for phone ID
- ✏️ `src/lib/error-handler.ts` - Fixed TypeScript `any` types
- ✏️ `next.config.ts` - Enabled TypeScript/ESLint checks
- ✏️ `.gitignore` - Added `push-env-vars.sh`
- ✏️ `.env.local` - Added `OPENPHONE_PHONE_NUMBER_ID`

### Files Created:
- ✅ `src/app/api/jobber/proxy/route.ts` - Secure API proxy
- ✅ `.eslintignore` - Exclude debug files from linting
- ✅ `push-env-vars.template.sh` - Safe deployment template
- ✅ `SECURITY_ROTATION_GUIDE.md` - Credential rotation instructions
- ✅ `SECURITY_FIXES_SUMMARY.md` - Complete security fixes documentation
- ✅ `COMMIT_CHECKLIST.md` - This file

### Files Deleted:
- ❌ `push-env-vars.sh` - **REMOVED** (contained exposed secrets)

---

## 🔥 CRITICAL: Before You Commit

### Step 1: Rotate Exposed Credentials

**These credentials are in git history and MUST be rotated:**

1. **Jobber OAuth** - https://app.getjobber.com/settings/developer
   ```bash
   # Delete or regenerate OAuth app
   # Update .env.local with NEW values
   ```

2. **OpenPhone API** - https://app.openphone.com/settings/api-keys
   ```bash
   # Revoke key: HCHrJrk0WhvrTskPoLF5hsGOeOpV0VVD
   # Generate new key
   # Update .env.local
   ```

3. **Anthropic API** - https://console.anthropic.com/settings/keys
   ```bash
   # Delete exposed key
   # Generate new key
   # Update .env.local
   ```

### Step 2: Verify Fixes Locally

```bash
# Test linting
npm run lint
# Should pass with no errors

# Test build
npm run build
# Should complete successfully

# Test dev server
npm run dev
# Navigate to http://localhost:3000
# Test Jobber OAuth flow
# Test OpenPhone sync
```

---

## 📝 Safe Commit Commands

### Option A: Single Commit (Recommended)

```bash
# Stage all security fixes
git add .

# Commit with descriptive message
git commit -m "🔒 Security audit fixes

- Fix: Non-httpOnly cookie for Jobber tokens
- Fix: Remove plaintext credentials from push-env-vars.sh
- Fix: Enable TypeScript/ESLint checks in production builds
- Fix: Move OpenPhone phone ID to environment variable
- Add: Server-side Jobber API proxy
- Add: Security rotation guide and documentation

⚠️ BREAKING: Requires credential rotation before deployment
See SECURITY_ROTATION_GUIDE.md for instructions"

# Push to GitHub
git push origin main
```

### Option B: Multiple Commits (Granular)

```bash
# Commit 1: Cookie security
git add src/app/api/auth/jobber/callback/route.ts src/app/api/jobber/proxy/route.ts
git commit -m "🔒 Fix: Enable httpOnly for Jobber OAuth tokens"

# Commit 2: Remove secrets
git add push-env-vars.template.sh .gitignore SECURITY_ROTATION_GUIDE.md
git commit -m "🔒 Fix: Remove plaintext credentials, add template"

# Commit 3: Build checks
git add next.config.ts .eslintignore src/lib/error-handler.ts
git commit -m "🔒 Fix: Enable TypeScript/ESLint checks in builds"

# Commit 4: Environment variables
git add src/app/api/sync/openphone/route.ts .env.local push-env-vars.template.sh
git commit -m "🔒 Fix: Move OpenPhone phone ID to environment variable"

# Commit 5: Documentation
git add SECURITY_FIXES_SUMMARY.md COMMIT_CHECKLIST.md
git commit -m "📚 Add: Security audit documentation"

# Push all commits
git push origin main
```

---

## 🚀 Deployment Steps

### 1. Update Vercel Environment Variables

```bash
# Create your push-env-vars.sh from template
cp push-env-vars.template.sh push-env-vars.sh

# Edit with NEW rotated credentials
nano push-env-vars.sh

# Deploy to Vercel
vercel login
vercel link
bash push-env-vars.sh
```

### 2. Deploy to Production

```bash
vercel --prod
```

### 3. Verify Production

- [ ] Test Jobber OAuth at your-domain.com
- [ ] Test OpenPhone sync
- [ ] Check Vercel deployment logs
- [ ] Verify no errors in Sentry

---

## 🧹 Optional: Clean Git History

If you want to remove exposed secrets from git history:

### Using BFG Repo-Cleaner (Easiest)

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Clone bare repo
cd /tmp
git clone --mirror https://github.com/l3en00725/budds-dashboard.git

# Remove file from entire history
cd budds-dashboard.git
bfg --delete-files push-env-vars.sh

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Rewrites history)
git push --force
```

### Using git filter-repo

```bash
# Install filter-repo
pip3 install git-filter-repo

# In your repo
cd /Users/benjaminhaberman/budds-dashboard
git filter-repo --path push-env-vars.sh --invert-paths

# Force push (WARNING: Rewrites history)
git push origin main --force
```

**⚠️ WARNING**: Force pushing rewrites git history. Only do this if:
- You're the only contributor, OR
- You've coordinated with all team members

**Alternative**: If you've rotated all credentials, the exposed keys are useless. Just ensure `push-env-vars.sh` stays in `.gitignore`.

---

## ✅ Final Verification

After deployment, verify everything works:

- [ ] **Jobber OAuth Flow**
  - Navigate to your-domain.com/api/auth/jobber/login
  - Complete OAuth authorization
  - Verify redirect to dashboard

- [ ] **OpenPhone Sync**
  - Trigger sync: POST to /api/sync/openphone
  - Check Supabase for new call records
  - Verify no errors in logs

- [ ] **Build Quality**
  - Check Vercel build logs
  - No TypeScript errors
  - No ESLint errors

- [ ] **Security Headers**
  - Open DevTools → Application → Cookies
  - Verify `jobber_access_token` has:
    - HttpOnly: ✓
    - Secure: ✓
    - SameSite: Lax

---

## 🎉 You're Done!

All security fixes have been applied. Your app is now:

✅ Protected from XSS token theft (httpOnly cookies)
✅ Free of hardcoded secrets (environment variables)
✅ Enforcing code quality (TypeScript/ESLint checks)
✅ Using rotated credentials (old keys revoked)

For questions or issues, see:
- `SECURITY_FIXES_SUMMARY.md` - Complete fix documentation
- `SECURITY_ROTATION_GUIDE.md` - Credential rotation guide
