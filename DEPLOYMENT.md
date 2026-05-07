# Zenith Deployment Notes

Zenith is configured as a full-stack React, Express, tRPC, Manus OAuth, and database-backed application. Manus provides built-in hosting with custom domain support, and the recommended in-platform path is to create a checkpoint and use the **Publish** button in the project UI.

If you still choose to deploy externally on Render, be aware that Manus OAuth callback handling, platform-provided environment variables, and database credentials must be configured carefully in Render. External hosting may require additional compatibility testing because the application is optimized for the Manus runtime.

## Build and start commands

| Setting | Value |
|---|---|
| Runtime | Node.js 22+ |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Start command | `pnpm start` |

## Required environment variables

The application expects the platform-provided OAuth, database, JWT, and Forge variables used by the Manus template. At minimum, an external deployment needs compatible values for `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, and `OWNER_NAME`. Do not commit secret values to source control.

## Validation checklist

Before any deployment, run `pnpm check`, `pnpm test`, and `pnpm build`. After deployment, verify Manus OAuth sign-in, task creation, project creation, Kanban drag-and-drop, calendar navigation, analytics charts, and the exact keyboard shortcuts: `N` for new task, `K` for Kanban, and `C` for calendar.
