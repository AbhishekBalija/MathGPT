# NeoMath Deployment Guide

> **Outdated backend section.** The backend no longer uses Motia (replaced by
> Express in October 2026). The Motia Cloud steps below no longer apply.
> This guide will be rewritten for Vercel + Neon in Phase 3 of the migration.

## Overview

| Component | Platform      | URL                        |
| --------- | ------------- | -------------------------- |
| Frontend  | Vercel        | `math-gpt-beta.vercel.app` |
| Backend   | Motia Cloud   | `your-app.motia.cloud`     |
| Database  | MongoDB Atlas | Managed                    |

---

## Frontend Deployment (Vercel)

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New > Project**
3. Import your GitHub repository
4. Select `frontend` as root directory

### 2. Configure Build Settings

- **Framework Preset**: Vite
- **Build Command**: `bun run build` or `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `bun install` or `npm install`

### 3. Environment Variables

Add in Vercel dashboard under **Settings > Environment Variables**:

| Variable                | Value                              |
| ----------------------- | ---------------------------------- |
| `VITE_API_URL`          | `https://your-backend.motia.cloud` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google Client ID              |

### 4. Deploy

Click **Deploy**. Vercel auto-deploys on each push to main.

---

## Backend Deployment (Motia Cloud)

### 1. Install Motia CLI

```bash
npm install -g motia
```

### 2. Login

```bash
motia login
```

### 3. Set Environment Variables

```bash
motia env set MONGODB_URI="your_mongodb_atlas_uri"
motia env set JWT_SECRET="your_production_secret"
motia env set JWT_REFRESH_SECRET="your_refresh_secret"
motia env set GEMINI_MATH_AI_API="your_gemini_key"
motia env set GOOGLE_CLIENT_ID="your_google_client_id"
motia env set VITE_GOOGLE_CLIENT_ID="your_google_client_id"
motia env set RESEND_API_KEY="your_resend_key"
motia env set ADMIN_PASSCODE="your_admin_passcode"
```

### 4. Deploy

```bash
cd backend
motia deploy
```

### 5. Get Deployment URL

After deployment, Motia provides a URL like:

```
https://your-app-name.motia.cloud
```

Update frontend's `VITE_API_URL` with this URL.

---

## CORS Configuration

Update `motia.config.ts` with your production frontend URL:

```typescript
const allowedOrigins = [
  "http://localhost:5173", // Local dev
  "https://math-gpt-beta.vercel.app", // Production
];
```

---

## MongoDB Atlas Setup

### 1. Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free M0 cluster

### 2. Configure Network Access

Add IP addresses:

- `0.0.0.0/0` (allow all - for Motia Cloud)
- Or specific Motia Cloud IPs if available

### 3. Create Database User

1. Go to **Database Access**
2. Add new user with read/write permissions

### 4. Get Connection String

1. Click **Connect > Drivers**
2. Copy connection string
3. Replace `<password>` with your password

---

## Google OAuth for Production

### 1. Add Production URLs

In Google Cloud Console > OAuth 2.0 Client:

**Authorized JavaScript origins:**

```
https://math-gpt-beta.vercel.app
```

**Authorized redirect URIs:**

```
https://math-gpt-beta.vercel.app
```

---

## Admin Configuration

### 1. Setting Up Admin Users

After users register, set `isAdmin: true` in MongoDB:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } });
```

### 2. Admin Passcode (Optional)

Set `ADMIN_PASSCODE` environment variable for additional security:

```bash
motia env set ADMIN_PASSCODE="secure_passcode_here"
```

Admins must verify this passcode when accessing certain admin features.

---

## Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Backend env variables set in Motia Cloud
- [ ] Backend deployed to Motia Cloud
- [ ] Frontend env variables set in Vercel
- [ ] Frontend deployed to Vercel
- [ ] CORS origins updated for production
- [ ] Google OAuth URIs updated
- [ ] Admin user configured (if needed)
- [ ] Admin passcode set (optional)
- [ ] Test login/register flow
- [ ] Test solve functionality
- [ ] Verify history loads correctly
- [ ] Test admin dashboard (if configured)

---

## Monitoring

### Logs

```bash
# View Motia logs
motia logs
```

### Health Check

```bash
curl https://your-app.motia.cloud/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T00:00:00.000Z"
}
```

---

## Rollback

### Vercel

Use Vercel dashboard to redeploy previous version.

### Motia

```bash
motia rollback
```

---

_Last updated: December 22, 2025_
