# Zenith Secrets Setup Guide

This guide shows which secrets are already configured and which ones you need to obtain from Manus.

## Pre-filled Secrets (Ready to Use)

| Secret | Value | Notes |
|--------|-------|-------|
| `DATABASE_URL` | `postgres://tsdbadmin:Limeayaan321%21@eo235g5toq.l93na3f960.tsdb.cloud.timescale.com:36713/tsdb?sslmode=require` | Your TimescaleDB connection (password URL-encoded) |
| `OAUTH_SERVER_URL` | `https://api.manus.im` | Manus OAuth backend endpoint |
| `BUILT_IN_FORGE_API_URL` | `https://api.manus.im` | Manus API endpoint |
| `VITE_FRONTEND_FORGE_API_URL` | `https://api.manus.im` | Frontend API endpoint |
| `VITE_APP_TITLE` | `Zenith` | App display title |

## Secrets You Need to Generate/Obtain

### 1. `JWT_SECRET` (Generate a random string)
**Purpose:** Used for signing session cookies

**How to generate:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use this random string:
```
Generate a random 32+ character string. Example:
```
aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcd
```

**Action:** Generate a random string and add it to Manus secrets.

---

### 2. `VITE_APP_ID` (From Manus OAuth)
**Purpose:** Your OAuth application ID for Manus login

**How to get it:**
1. Log in to your Manus account at https://manus.im
2. Go to **Account Settings > OAuth Applications** (or similar)
3. Create a new application or view your existing one
4. Copy the **Application ID** (looks like `app_xxxxx`)

**Action:** Copy from Manus and add to secrets.

---

### 3. `VITE_OAUTH_PORTAL_URL` (From Manus OAuth)
**Purpose:** The Manus login portal URL for OAuth redirects

**How to get it:**
1. In Manus account settings, look for **OAuth Portal URL** or **Login URL**
2. It's typically something like `https://oauth.manus.im` or similar
3. Check your OAuth application settings for the exact URL

**Action:** Copy from Manus and add to secrets.

---

### 4. `OWNER_OPEN_ID` (Your Manus User ID)
**Purpose:** Identifies you as the app owner

**How to get it:**
1. Log in to Manus
2. Go to **Account Settings > Profile**
3. Look for **User ID**, **OpenID**, or **Account ID**
4. It looks like `user_xxxxx` or similar

**Action:** Copy your user ID and add to secrets.

---

### 5. `OWNER_NAME` (Your Name)
**Purpose:** Display name for the app owner

**How to get it:**
1. Log in to Manus
2. Go to **Account Settings > Profile**
3. Copy your display name

**Action:** Enter your name and add to secrets.

---

### 6. `BUILT_IN_FORGE_API_KEY` (From Manus API Settings)
**Purpose:** Server-side API key for Manus services

**How to get it:**
1. Log in to Manus
2. Go to **Settings > API Keys** or **Developer > API**
3. Look for **Server API Key** or **Backend API Key**
4. Generate a new one if needed
5. Copy the key (looks like `key_server_xxxxx`)

**Action:** Copy from Manus and add to secrets.

---

### 7. `VITE_FRONTEND_FORGE_API_KEY` (From Manus API Settings)
**Purpose:** Client-side API key for browser-based Manus API calls

**How to get it:**
1. Log in to Manus
2. Go to **Settings > API Keys** or **Developer > API**
3. Look for **Frontend API Key**, **Public API Key**, or **Browser API Key**
4. Generate a new one if needed
5. Copy the key (looks like `key_frontend_xxxxx`)

**Action:** Copy from Manus and add to secrets.

---

## Optional Secrets (Can Skip)

| Secret | Value | Notes |
|--------|-------|-------|
| `VITE_ANALYTICS_ENDPOINT` | Leave blank or add analytics URL | Optional analytics tracking |
| `VITE_ANALYTICS_WEBSITE_ID` | Leave blank or add analytics ID | Optional analytics tracking |
| `VITE_APP_LOGO` | Leave blank or add logo URL | Optional app logo |

---

## Summary Checklist

- [ ] `DATABASE_URL` - Already filled in above
- [ ] `JWT_SECRET` - Generate a random 32+ character string
- [ ] `VITE_APP_ID` - Get from Manus OAuth settings
- [ ] `OAUTH_SERVER_URL` - Already filled in (`https://api.manus.im`)
- [ ] `VITE_OAUTH_PORTAL_URL` - Get from Manus OAuth settings
- [ ] `OWNER_OPEN_ID` - Get your Manus user ID
- [ ] `OWNER_NAME` - Enter your name
- [ ] `BUILT_IN_FORGE_API_URL` - Already filled in (`https://api.manus.im`)
- [ ] `BUILT_IN_FORGE_API_KEY` - Get from Manus API settings
- [ ] `VITE_FRONTEND_FORGE_API_URL` - Already filled in (`https://api.manus.im`)
- [ ] `VITE_FRONTEND_FORGE_API_KEY` - Get from Manus API settings
- [ ] `VITE_APP_TITLE` - Already filled in (`Zenith`)

---

## How to Add Secrets to Manus

1. Open your Zenith project in Manus
2. Click the **Settings** icon in the Management UI
3. Go to **Secrets** tab
4. For each secret, click **Add** or **Edit**
5. Enter the key name and value
6. Click **Save**
7. The dev server will automatically reload with the new secrets

---

## Troubleshooting

**"Cannot find OAuth settings in Manus"**
- Try going to your account profile and looking for "Connected Apps" or "OAuth"
- If you don't see OAuth settings, you may need to create an application first

**"API key not found"**
- Go to Developer/API settings in Manus
- Generate a new API key if one doesn't exist
- Make sure you're copying the correct key (server vs. frontend)

**"Still getting OAuth callback error"**
- Make sure all 7 required secrets are filled in
- Double-check that `VITE_APP_ID` matches your actual Manus OAuth app ID
- Verify `OWNER_OPEN_ID` is your actual Manus user ID

---

## Next Steps

1. Gather all the secrets from Manus
2. Add them to your Zenith project in Manus Settings > Secrets
3. Try logging in again - it should work!
4. Once working, you can deploy to Render using the RENDER_DEPLOYMENT.md guide
