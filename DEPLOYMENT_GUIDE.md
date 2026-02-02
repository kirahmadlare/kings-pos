# POS System - Free Deployment Guide

## 🌐 Deploy Your POS System Online for Free

This guide will help you deploy your POS system using free hosting services.

---

## 📋 Prerequisites

- GitHub account
- MongoDB Atlas account (free)
- Vercel account (free)
- Render account (free)

---

## 🗄️ Step 1: Setup MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"**
3. Sign up with Google/GitHub or email
4. Choose **FREE (M0)** tier - 512MB storage

### 1.2 Create Database Cluster

1. Click **"Build a Database"**
2. Choose **"Shared"** (Free tier)
3. Select **Cloud Provider**: AWS
4. Select **Region**: Closest to your users
5. Click **"Create Cluster"** (takes 1-3 minutes)

### 1.3 Create Database User

1. Click **"Database Access"** in left menu
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `posuser`
5. Password: Generate strong password (save it!)
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.4 Whitelist IP Addresses

1. Click **"Network Access"** in left menu
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

⚠️ **Important**: For production, restrict this to specific IPs

### 1.5 Get Connection String

1. Click **"Database"** in left menu
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string:
   ```
   mongodb+srv://posuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. **Save this connection string** - you'll need it later

---

## 🔧 Step 2: Prepare Your Code for Deployment

### 2.1 Create Production Environment File

Create `server/.env.production`:

```env
# Production Environment Variables
NODE_ENV=production
PORT=3001

# MongoDB Connection (replace with your Atlas connection string)
MONGODB_URI=mongodb+srv://posuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kings-pos?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
JWT_EXPIRES_IN=7d

# CORS Origins (will update after getting Vercel URL)
CORS_ORIGINS=https://your-frontend-url.vercel.app

# Optional: Redis (can skip for now)
# REDIS_URL=redis://...

# Optional: Email (can skip for now)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
```

### 2.2 Update Frontend API URL

Create `src/.env.production`:

```env
# Production API URL (will update after deploying backend)
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### 2.3 Create .gitignore

Ensure `.gitignore` includes:

```
# Environment files
.env
.env.local
.env.production
.env.development

# Dependencies
node_modules/

# Build outputs
dist/
build/

# Logs
*.log

# OS files
.DS_Store
Thumbs.db
```

---

## 📤 Step 3: Push to GitHub

### 3.1 Create GitHub Repository

1. Go to https://github.com
2. Click **"New repository"**
3. Repository name: `kings-pos`
4. Choose **Public** or **Private**
5. Don't initialize with README (we already have code)
6. Click **"Create repository"**

### 3.2 Push Your Code

```bash
cd C:\Users\kingm\Downloads\POS

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/kings-pos.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🚀 Step 4: Deploy Backend to Render

### 4.1 Create Render Account

1. Go to https://render.com
2. Sign up with **GitHub**
3. Authorize Render to access your repositories

### 4.2 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect to your `kings-pos` repository
3. Configure service:
   - **Name**: `kings-pos-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

### 4.3 Add Environment Variables

In Render dashboard, go to **"Environment"** tab and add:

```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://posuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kings-pos?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

⚠️ **Important**: Replace with your actual values!

### 4.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Your backend URL will be: `https://kings-pos-api.onrender.com`

### 4.5 Test Backend

Visit: `https://kings-pos-api.onrender.com/health`

Should return: `{"status":"ok","timestamp":"..."}`

---

## 🎨 Step 5: Deploy Frontend to Vercel

### 5.1 Create Vercel Account

1. Go to https://vercel.com
2. Sign up with **GitHub**
3. Authorize Vercel

### 5.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your `kings-pos` repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 5.3 Add Environment Variables

Add environment variable:
- **Key**: `VITE_API_URL`
- **Value**: `https://kings-pos-api.onrender.com/api`

### 5.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-5 minutes)
3. Your frontend URL will be: `https://kings-pos-xxx.vercel.app`

---

## 🔄 Step 6: Update CORS Settings

### 6.1 Update Backend CORS

1. Go to Render dashboard
2. Click on your `kings-pos-api` service
3. Go to **"Environment"** tab
4. Update `CORS_ORIGINS` to your Vercel URL:
   ```
   CORS_ORIGINS=https://kings-pos-xxx.vercel.app
   ```
5. Click **"Save Changes"**
6. Wait for automatic redeploy

---

## ✅ Step 7: Test Your Deployed App

### 7.1 Test Checklist

Visit your Vercel URL: `https://kings-pos-xxx.vercel.app`

- [ ] App loads successfully
- [ ] Can register new account
- [ ] Can login
- [ ] Can add products
- [ ] Can make sales
- [ ] Inventory syncs to server
- [ ] Data persists after page refresh

### 7.2 Check Browser Console

1. Press F12
2. Look for any errors
3. Check Network tab for API calls

---

## 🎯 Your Deployed URLs

After completing all steps:

- **Frontend**: `https://kings-pos-xxx.vercel.app`
- **Backend**: `https://kings-pos-api.onrender.com`
- **Database**: MongoDB Atlas (free tier)

---

## 💡 Important Notes

### Free Tier Limitations

**Render (Backend):**
- ⚠️ Sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- 750 hours/month (enough for 24/7)

**Vercel (Frontend):**
- ✅ Always fast, no sleep
- 100GB bandwidth/month
- Perfect for production

**MongoDB Atlas:**
- ✅ 512MB storage
- ✅ Shared cluster
- Enough for small to medium business

### Wake-Up Solution for Render

Render free tier sleeps. To keep it awake, use a cron service:

1. Go to https://cron-job.org (free)
2. Create account
3. Add cron job:
   - URL: `https://kings-pos-api.onrender.com/health`
   - Schedule: Every 10 minutes
   - This keeps your backend awake during business hours

---

## 🔒 Security Best Practices

### 1. Secure Environment Variables

- ✅ Never commit `.env` files
- ✅ Use strong JWT secrets (min 32 characters)
- ✅ Use strong database passwords

### 2. Update CORS Properly

Only allow your frontend domain:
```env
CORS_ORIGINS=https://kings-pos-xxx.vercel.app
```

### 3. Enable HTTPS Only

Both Vercel and Render provide HTTPS automatically ✅

### 4. Restrict MongoDB Access

In MongoDB Atlas:
- Go to Network Access
- Remove "Allow Access from Anywhere"
- Add specific IPs or use Render's IPs

---

## 🆘 Troubleshooting

### Issue: Backend not responding

**Solution:**
- Check Render logs: Dashboard → Logs
- Verify environment variables
- Test `/health` endpoint

### Issue: CORS errors

**Solution:**
- Verify `CORS_ORIGINS` matches your Vercel URL exactly
- Include `https://` protocol
- No trailing slash

### Issue: Database connection failed

**Solution:**
- Check MongoDB Atlas connection string
- Verify password is correct (no special chars that need encoding)
- Check Network Access whitelist

### Issue: Frontend can't reach backend

**Solution:**
- Verify `VITE_API_URL` in Vercel environment
- Check browser console for actual URL being called
- Test backend URL directly in browser

---

## 🔄 Automatic Deployments

### Setup Auto-Deploy

Both Vercel and Render automatically deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel and Render will automatically deploy! 🚀
```

---

## 💰 Cost Summary

| Service | Free Tier | Cost |
|---------|-----------|------|
| MongoDB Atlas | 512MB | $0/month |
| Render Backend | 750hrs | $0/month |
| Vercel Frontend | 100GB bandwidth | $0/month |
| **Total** | | **$0/month** ✅ |

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

---

## 🎉 You're Done!

Your POS system is now deployed online for free! Share your URL with others and start using it from anywhere.

**Questions?** Check the troubleshooting section or review the logs in each service dashboard.

---

**Deployed by:** King M
**Date:** February 2, 2026
**Status:** ✅ Production Ready
