# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

**Frontend (.env.production.local):**
```bash
cp .env.production .env.production.local
# Edit .env.production.local with your production values
```

Update the following variables:
- `VITE_API_URL` - Your production API URL
- `VITE_SOCKET_URL` - Your production Socket.io URL
- Analytics IDs (if using)

**Backend (server/.env):**
```bash
cd server
cp .env.example .env
# Edit .env with your production values
```

Update the following variables:
- `PORT` - Production port (default: 3001)
- `MONGODB_URI` - Production MongoDB connection string
- `JWT_SECRET` - Strong random secret for JWT tokens
- `REDIS_URL` - Production Redis URL (optional)
- `EMAIL_*` - Email service configuration
- `TWILIO_*` - SMS service configuration (optional)

### 2. Remove Mock Data

All mock data has been removed from the following components:
- ✅ NotificationBell.jsx
- ✅ NotificationCenter.jsx
- ✅ NotificationPreferences.jsx

Development features disabled in production:
- ✅ Mock OTP logging (authStore.js)
- ✅ Test code '000000' for TOTP (authStore.js)
- ✅ skipOTP function (authStore.js)

### 3. Build for Production

**Frontend:**
```bash
npm run build:production
```

This will create an optimized production build in the `dist` directory.

**Backend:**
```bash
cd server
npm install --production
```

### 4. Database Setup

1. Set up MongoDB production instance
2. Run database migrations (if any)
3. Create indexes (optional - see server/routes/indexes.js)
4. Set up Redis for caching (optional)

### 5. Security Checklist

- [ ] Change all default passwords
- [ ] Update JWT_SECRET to a strong random string
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly for production domain
- [ ] Enable rate limiting (already configured)
- [ ] Set up firewall rules
- [ ] Configure backup strategy
- [ ] Enable audit logging

### 6. Deploy

**Frontend (Static Hosting):**
- Upload `dist` folder to your hosting provider
- Options: Vercel, Netlify, AWS S3 + CloudFront, etc.

**Backend (Node.js Hosting):**
```bash
cd server
npm start
```

Or use PM2 for process management:
```bash
pm2 start index.js --name "pos-api"
pm2 save
pm2 startup
```

### 7. Post-Deployment Verification

- [ ] Test user registration
- [ ] Test user login with 2FA
- [ ] Test offline mode functionality
- [ ] Test real-time updates (Socket.io)
- [ ] Verify API endpoints are working
- [ ] Check database connections
- [ ] Monitor error logs
- [ ] Test notification system

### 8. Monitoring

Set up monitoring for:
- Server uptime
- API response times
- Database performance
- Error rates
- User activity

Recommended tools:
- Application monitoring: PM2, New Relic, or Datadog
- Error tracking: Sentry
- Analytics: Google Analytics
- Uptime monitoring: UptimeRobot, Pingdom

## Environment Variables Reference

### Frontend (Vite)

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API URL | Yes |
| VITE_SOCKET_URL | Socket.io server URL | Yes |
| VITE_APP_NAME | Application name | No |
| VITE_APP_VERSION | Application version | No |
| VITE_ENABLE_PWA | Enable PWA features | No |
| VITE_ENABLE_OFFLINE_MODE | Enable offline mode | No |

### Backend (Node.js)

See `server/.env.example` for complete list.

## Rollback Procedure

If issues occur in production:

1. Keep previous build version
2. Revert to previous version:
   ```bash
   # Frontend
   npm run build:production

   # Backend
   pm2 restart pos-api
   ```
3. Check error logs
4. Fix issues in development
5. Re-deploy after testing

## Support

For issues or questions, please contact your development team.
