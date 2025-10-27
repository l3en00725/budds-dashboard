# 🔐 Security Fix: Credential Rotation Guide

## ⚠️ CRITICAL: Exposed Credentials

The file `push-env-vars.sh` was committed to git with plaintext API credentials in **commit 7418120**.

All credentials in that file are now considered **publicly exposed** and must be rotated immediately.

---

## 📋 Required Actions (Do These NOW)

### 1. Rotate Jobber OAuth Credentials
- Log into https://app.getjobber.com
- Navigate to Settings → Developer → OAuth Applications
- **Delete or regenerate** your OAuth application credentials
- Update `.env.local` with new values:
  ```bash
  JOBBER_CLIENT_ID="new-client-id"
  JOBBER_CLIENT_SECRET="new-client-secret"
  ```

### 2. Rotate OpenPhone API Key
- Log into https://app.openphone.com
- Navigate to Settings → API Keys
- **Revoke** the exposed key: `HCHrJrk0WhvrTskPoLF5hsGOeOpV0VVD`
- Generate a new API key
- Update `.env.local`:
  ```bash
  OPENPHONE_API_KEY="new-api-key"
  ```

### 3. Rotate Anthropic API Key
- Log into https://console.anthropic.com
- Navigate to API Keys
- **Delete** the exposed key: `sk-ant-api03-BQ3YOXLu4NkZjsaBrNJ...`
- Generate a new API key
- Update `.env.local`:
  ```bash
  ANTHROPIC_API_KEY="new-api-key"
  ```

### 4. Rotate Supabase Service Role Key (Optional but Recommended)
- Log into https://supabase.com/dashboard
- Navigate to your project → Settings → API
- Click "Generate new service_role key"
- Update `.env.local`:
  ```bash
  SUPABASE_SERVICE_ROLE_KEY="new-service-role-key"
  ```

### 5. Update Vercel Environment Variables
After rotating all keys:
```bash
# Copy template and fill in NEW values
cp push-env-vars.template.sh push-env-vars.sh

# Edit push-env-vars.sh with your NEW credentials
nano push-env-vars.sh

# Push to Vercel
vercel login
vercel link
bash push-env-vars.sh

# Redeploy
vercel --prod
```

---

## 🛡️ Prevention: Git History Cleanup

The old credentials are permanently in git history. Options:

### Option A: Force Push (If Private Repo with No Collaborators)
```bash
# Remove file from history using git filter-repo
pip3 install git-filter-repo
git filter-repo --path push-env-vars.sh --invert-paths

# Force push to GitHub
git push origin main --force
```

### Option B: BFG Repo-Cleaner (Recommended)
```bash
# Download BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh bare copy
git clone --mirror https://github.com/l3en00725/budds-dashboard.git

# Remove the file
bfg --delete-files push-env-vars.sh budds-dashboard.git

# Clean up
cd budds-dashboard.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push
git push
```

### Option C: Accept History (Rotate All Keys Instead)
If you've already rotated all credentials, the exposed keys are now useless.
Just ensure `push-env-vars.sh` is never committed again (.gitignore updated).

---

## ✅ Going Forward

1. **NEVER commit** `push-env-vars.sh` (now in `.gitignore`)
2. **Always use** `push-env-vars.template.sh` as the committed reference
3. **Store secrets** only in:
   - `.env.local` (gitignored)
   - Vercel environment variables (via CLI or dashboard)
   - Secure password managers

---

## 📞 Support

If you need help rotating credentials:
- Jobber: https://developer.getjobber.com/docs/
- OpenPhone: https://docs.openphone.com/
- Anthropic: https://docs.anthropic.com/
- Supabase: https://supabase.com/docs/
