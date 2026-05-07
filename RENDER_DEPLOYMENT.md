# Zenith Deployment to Render

## Quick Start

1. **Connect your GitHub repository to Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account and select the `ayaanbekur/zenith` repository
   - Select the `main` branch

2. **Configure the deployment:**
   - **Name:** `zenith`
   - **Environment:** `Node`
   - **Build Command:** `pnpm install && pnpm build`
   - **Start Command:** `pnpm start`
   - **Instance Type:** Standard (or higher for production)

3. **Set environment variables in Render:**
   Add the following secrets in the Render dashboard under "Environment":
   
   | Secret | Value | Notes |
   |--------|-------|-------|
   | `DATABASE_URL` | Your TimescaleDB connection string | `postgres://tsdbadmin@eo235g5toq.l93na3f960.tsdb.cloud.timescale.com:36713/tsdb?sslmode=require` |
   | `JWT_SECRET` | Generate a random 32+ character string | Used for session signing |
   | `VITE_APP_ID` | From Manus OAuth settings | OAuth application ID |
   | `OAUTH_SERVER_URL` | `https://api.manus.im` | Manus OAuth backend |
   | `VITE_OAUTH_PORTAL_URL` | From Manus OAuth settings | Manus login portal |
   | `OWNER_OPEN_ID` | Your Manus user ID | Owner identification |
   | `OWNER_NAME` | Your name | Owner display name |
   | `BUILT_IN_FORGE_API_URL` | `https://api.manus.im` | Manus API endpoint |
   | `BUILT_IN_FORGE_API_KEY` | From Manus settings | Server-side API key |
   | `VITE_FRONTEND_FORGE_API_URL` | `https://api.manus.im` | Frontend API endpoint |
   | `VITE_FRONTEND_FORGE_API_KEY` | From Manus settings | Frontend API key |
   | `VITE_ANALYTICS_ENDPOINT` | Optional | Analytics tracking endpoint |
   | `VITE_ANALYTICS_WEBSITE_ID` | Optional | Analytics website ID |
   | `VITE_APP_TITLE` | `Zenith` | App display title |
   | `VITE_APP_LOGO` | Optional | App logo URL |

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy from your GitHub repository
   - Your app will be available at `https://zenith-{random}.onrender.com`

## Database Setup

Before deploying, ensure your TimescaleDB instance is ready:

1. Your TimescaleDB connection string is already configured
2. Zenith will automatically apply migrations on first startup
3. Starter data (sample project and tasks) will be created for new users

## Monitoring & Logs

- View deployment logs in the Render dashboard
- Monitor application health and performance
- Redeploy by pushing to the `main` branch on GitHub

## Troubleshooting

- **Build fails:** Ensure all dependencies are listed in `package.json`
- **Database connection fails:** Verify `DATABASE_URL` is correct and TimescaleDB is accessible
- **OAuth fails:** Confirm `VITE_APP_ID` and `OAUTH_SERVER_URL` are correct
- **Port issues:** Zenith uses the `PORT` environment variable (default 3000); Render sets this automatically

## Alternative: Deploy via Manus

Zenith is also available for deployment via Manus's built-in hosting. Click the "Publish" button in the Manus Management UI to deploy without external configuration.
