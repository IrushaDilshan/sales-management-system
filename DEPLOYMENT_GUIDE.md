# 🚀 Deployment Guide - Sales Management System

This guide will help you deliver the mobile app and web application to your client.

---

## 📱 MOBILE APP DEPLOYMENT (Expo/React Native)

### Option 1: Quick Distribution (Recommended for Testing)

#### **Using Expo Go (Easiest - For Testing)**
1. Share your project via Expo:
   ```bash
   cd mobile
   npx expo start
   ```
2. Create an Expo account at https://expo.dev
3. Publish your app:
   ```bash
   npx expo publish
   ```
4. Share the QR code with your client
5. Client downloads "Expo Go" app from Play Store/App Store
6. Client scans QR code to use the app

**Pros:** ✅ Instant sharing, ✅ Easy updates  
**Cons:** ❌ Requires Expo Go app, ❌ Not professional

---

### Option 2: Build APK/IPA (Recommended for Production)

#### **A. Building Android APK (for Android phones)**

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS Build:**
   ```bash
   cd mobile
   eas build:configure
   ```

4. **Build APK:**
   ```bash
   eas build -p android --profile preview
   ```
   - This creates an APK file you can install on any Android phone
   - Takes 10-20 minutes
   - Download link will be provided when done

5. **Share with Client:**
   - Download the APK from the provided link
   - Send APK file to client via email/WhatsApp/Google Drive
   - Client enables "Install from Unknown Sources" in Android settings
   - Client installs the APK

#### **B. Building for Google Play Store (Professional)**

1. **Create Google Play Developer Account:**
   - Go to https://play.google.com/console
   - Pay $25 one-time fee
   - Create a new app

2. **Build AAB (Android App Bundle):**
   ```bash
   eas build -p android --profile production
   ```

3. **Upload to Play Store:**
   - Download the .aab file
   - Upload to Google Play Console
   - Fill in app details, screenshots, description
   - Submit for review (takes 1-3 days)

4. **Client Downloads:**
   - Client searches for your app in Google Play Store
   - Installs like any other app

#### **C. Building for iOS (Apple App Store)**

1. **Requirements:**
   - Apple Developer Account ($99/year)
   - Mac computer (optional with EAS)

2. **Build IPA:**
   ```bash
   eas build -p ios --profile production
   ```

3. **Upload to App Store:**
   - Use Xcode or Transporter app
   - Submit to App Store Connect
   - Wait for review (1-7 days)

---

## 🌐 WEB APP DEPLOYMENT

### Option 1: Vercel (Recommended - FREE)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd web
   npm run build
   vercel --prod
   ```

4. **Get URL:**
   - Vercel provides a URL like: `https://your-app.vercel.app`
   - Share this URL with your client
   - Can add custom domain later

**Pros:** ✅ Free, ✅ Auto SSL, ✅ Fast, ✅ Auto updates  
**Cons:** Limited builds on free plan

---

### Option 2: Netlify (Alternative - FREE)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   cd web
   npm run build
   netlify deploy --prod
   ```

4. **Result:**
   - URL like: `https://your-app.netlify.app`
   - Can add custom domain

---

### Option 3: Traditional Hosting (cPanel/Shared Hosting)

1. **Build Production:**
   ```bash
   cd web
   npm run build
   ```

2. **Upload Files:**
   - Files will be in `web/build` folder
   - Upload all files to your hosting via FTP/cPanel File Manager
   - Upload to `public_html` or `www` folder

3. **Configure:**
   - Ensure `.htaccess` file exists for React routing
   - Point domain to hosting

---

## 🗄️ DATABASE (Supabase)

Your database is already hosted on Supabase, so:

1. ✅ Database is live and accessible
2. ✅ No additional deployment needed
3. ⚠️ Make sure your Supabase credentials are secure
4. ⚠️ Keep your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` files

---

## 📋 RECOMMENDED DEPLOYMENT STRATEGY

### **For Client Delivery:**

#### **Phase 1: Testing (This Week)**
1. **Mobile:** Build APK and share with client
   ```bash
   cd mobile
   eas build -p android --profile preview
   ```
2. **Web:** Deploy to Vercel
   ```bash
   cd web
   vercel --prod
   ```

#### **Phase 2: Production (Next Week)**
1. **Mobile:** Submit to Google Play Store
2. **Web:** Add custom domain to Vercel/Netlify
3. **Documentation:** Provide user manuals

---

## 🎯 QUICK START COMMANDS

### **Build Mobile APK (Android):**
```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

### **Deploy Web App (Vercel):**
```bash
cd web
npm install -g vercel
vercel login
npm run build
vercel --prod
```

---

## 📧 WHAT TO SEND CLIENT

### **Mobile App:**
- ✉️ APK file (or Play Store link)
- 📄 Installation instructions
- 👤 Test account credentials

### **Web App:**
- 🔗 Website URL
- 👤 Admin/test account credentials
- 📱 Instructions on how to use

---

## 🔐 SECURITY CHECKLIST

Before deploying:

- [ ] Change all default passwords
- [ ] Remove console.log statements
- [ ] Set up proper environment variables
- [ ] Enable RLS (Row Level Security) in Supabase
- [ ] Test all user roles (Admin, Rep, Shop Owner, etc.)
- [ ] Add analytics (Google Analytics, etc.)
- [ ] Set up error tracking (Sentry, etc.)

---

## 💰 COST BREAKDOWN

| Service | Cost | Purpose |
|---------|------|---------|
| Supabase | FREE (or $25/month Pro) | Database + Auth |
| Vercel/Netlify | FREE | Web Hosting |
| Expo EAS | FREE (5 builds/month) | Mobile App Building |
| Google Play | $25 one-time | Android App Store |
| Apple Developer | $99/year | iOS App Store |

**Minimum Cost:** $25 (Google Play) for Android  
**Total for iOS + Android:** $124/year

---

## 🚦 NEXT STEPS

1. **Test Locally:** Make sure everything works
2. **Build APK:** Follow "Build Mobile APK" instructions above
3. **Deploy Web:** Use Vercel (easiest)
4. **Test Deployment:** Download APK and visit web URL
5. **Share with Client:** Send links and credentials
6. **Gather Feedback:** Make final adjustments
7. **Go Live:** Submit to app stores if needed

---

## 📞 SUPPORT

If you need help:
- Expo Docs: https://docs.expo.dev
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

---

**Created:** December 25, 2025  
**Version:** 1.0  
**Status:** Ready for Deployment ✅
