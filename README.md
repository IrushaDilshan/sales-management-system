<div align="center">
  <h1>📊 NLDB Sales Management System</h1>
  <p><strong>A comprehensive Dual-Platform (Web & Mobile) solution built with React, React Native, and Supabase.</strong></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Web-React.js-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Mobile-Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

<br />

## 🌟 Project Overview

The **NLDB Sales Management System** is a robust, full-stack application designed to manage multi-location inventory, track field sales, handle daily income, and provide comprehensive analytics. 

It is divided into two main client applications that interact with a unified Serverless Backend.

---

## 🏗️ Architecture & Tech Stack

This project utilizes a modern **Two-Tier Architecture** (Client ↔ BaaS), meaning both the Web and Mobile apps communicate directly with the database via secured API calls enforcing Row-Level Security (RLS).

### 1. 💻 Web Admin Dashboard (`/web`)
The command center for administrators and managers to oversee operations.
- **Framework**: React.js
- **Routing**: React Router DOM
- **Analytics**: Recharts
- **Role**: High-level data visualization, user management, and stock adjustments.

### 2. 📱 Mobile Field App (`/mobile`)
The on-the-go tool for Sales Representatives and Storekeepers.
- **Framework**: React Native (via Expo)
- **Routing**: Expo Router (File-based)
- **Role**: Processing daily sales, submitting stock requests, and tracking field inventory.

### 3. ☁️ Backend & Database (`/database_migrations`)
- **Infrastructure**: Supabase (Backend-as-a-Service)
- **Database**: PostgreSQL
- **Security**: Supabase Auth (JWT) & PostgreSQL Row-Level Security (RLS)
- **Role**: Secure data storage, user authentication, and automated database triggers.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) Account

### 1. Backend Setup
1. Create a new project in Supabase.
2. Navigate to the SQL Editor in your Supabase Dashboard.
3. Execute the `.sql` scripts located in the `database_migrations/` folder sequentially (from `01_` to `23_`). This will build your entire database schema and security policies.

### 2. Environment Configuration
You must link your client applications to your Supabase project.

**For Web:**
Create a `.env` file inside the `web/` directory:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**For Mobile:**
Create a `.env` file inside the `mobile/` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Running the Web Application
```bash
cd web
npm install
npm start
```
The app will launch at `http://localhost:3000`.

### 4. Running the Mobile Application
```bash
cd mobile
npm install
npx expo start
```
Press `a` to open on an Android Emulator, `i` for iOS Simulator, or scan the QR code with the Expo Go app on a physical device.

---

## 🔒 Security
Data security is handled primarily at the database level. Direct client-to-database connections are protected using **Row-Level Security (RLS)** in PostgreSQL. This ensures that a logged-in user can only read, update, or insert data that their specific role (Admin, Salesman, Storekeeper) has permission to access.

<br />

<div align="center">
  <i>Built with ❤️ for scalable sales operations.</i>
</div>
