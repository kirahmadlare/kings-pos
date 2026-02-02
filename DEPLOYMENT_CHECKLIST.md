# 🚀 Quick Deployment Checklist

## Before You Start
- [ ] GitHub account created
- [ ] Code committed to local git repository
- [ ] All features tested locally

---

## 1️⃣ MongoDB Atlas (5 minutes)
- [ ] Sign up at https://www.mongodb.com/cloud/atlas
- [ ] Create FREE cluster (M0)
- [ ] Create database user
- [ ] Whitelist all IPs (0.0.0.0/0)
- [ ] Copy connection string
- [ ] Save connection string safely

---

## 2️⃣ GitHub (2 minutes)
- [ ] Create new repository at https://github.com
- [ ] Push code to GitHub:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/kings-pos.git
  git push -u origin main
  ```

---

## 3️⃣ Render - Backend (10 minutes)
- [ ] Sign up at https://render.com with GitHub
- [ ] Create new Web Service
- [ ] Connect to your repository
- [ ] Configure:
  - Root Directory: `server`
  - Build: `npm install`
  - Start: `npm start`
- [ ] Add environment variables:
  - `NODE_ENV=production`
  - `MONGODB_URI=your-connection-string`
  - `JWT_SECRET=long-random-string`
  - `CORS_ORIGINS=*` (will update later)
- [ ] Deploy and wait
- [ ] Test: `https://your-app.onrender.com/health`

---

## 4️⃣ Vercel - Frontend (5 minutes)
- [ ] Sign up at https://vercel.com with GitHub
- [ ] Import your repository
- [ ] Configure:
  - Framework: Vite
  - Root: `./`
  - Build: `npm run build`
  - Output: `dist`
- [ ] Add environment variable:
  - `VITE_API_URL=https://your-backend.onrender.com/api`
- [ ] Deploy and wait
- [ ] Get your frontend URL

---

## 5️⃣ Update CORS (2 minutes)
- [ ] Go back to Render
- [ ] Update `CORS_ORIGINS` to your Vercel URL
- [ ] Save and redeploy

---

## 6️⃣ Test Everything (5 minutes)
- [ ] Visit your Vercel URL
- [ ] Register new account
- [ ] Login
- [ ] Add product
- [ ] Make sale
- [ ] Check inventory syncs
- [ ] Refresh page - data persists ✅

---

## 🎉 Done!

Your POS system is live at:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.onrender.com

---

## ⏱️ Total Time: ~30 minutes

## 💰 Total Cost: $0/month

---

## 📝 Save These URLs
```
Frontend: ___________________________
Backend:  ___________________________
Database: ___________________________
```

---

## 🔄 Future Updates

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

Both Vercel and Render will automatically redeploy! 🚀
