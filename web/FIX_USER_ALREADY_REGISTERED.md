# How to Fix "User Already Registered" Error

## Problem
When you delete a user from the web admin, the **database record** is deleted but the **authentication account** might still exist in Supabase Auth. When you try to create a new user with the same email, you get "User already registered".

## Quick Fix - Delete Auth User Manually

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com
2. Login to your account
3. Select your project

### Step 2: Navigate to Authentication
1. Click **"Authentication"** in the left sidebar
2. Click **"Users"** tab

### Step 3: Find and Delete the User
1. Search for the user by email
2. Click on the user row
3. Click the **"Delete User"** button
4. Confirm the deletion

### Step 4: Try Creating User Again
Now you can create a new user with that email address in your web admin!

---

## Prevention (Automatic)

The system now tries to automatically delete auth users when you delete from the web admin. However, this may fail in some cases due to permissions.

If you see this message after deleting:
```
"⚠️ Note: The authentication account could not be deleted.
This means the email cannot be reused immediately."
```

Follow the manual steps above to complete the deletion.

---

## Alternative Solution

Instead of reusing the same email, you can:
1. Use a different email address for the new user
2. Or add a number to the email (e.g., john@example.com → john2@example.com)

---

## Technical Details

**Why this happens:**
- Your app has two layers: Database (users table) + Authentication (Supabase Auth)
- Deleting from database doesn't automatically delete from auth
- Auth deletion from client-side may be restricted for security

**Proper solution:**
- Use Supabase Edge Functions or backend API to delete auth users
- Or manually delete from Supabase Dashboard (quickest for now)
