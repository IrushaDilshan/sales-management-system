# How to Add Salesmen and Shops - Quick Guide

## 🎯 Overview
Your web admin system already has everything you need! Here's how to use it:

---

## 👤 Adding a New Salesman

### Step 1: Navigate to Users Page
- Open your web admin dashboard
- Click on **"Users"** in the sidebar

### Step 2: Click "+ Add User"
- You'll see the "Add New User" button at the top right

### Step 3: Fill in the User Form
```
Name:     Enter salesman's full name (e.g., "John Doe")
Email:    Enter email address (e.g., "john@example.com")  
Password: Enter password (minimum 6 characters) - User will use this to login
Role:     Select "Salesman" from dropdown
Shop:     ⭐ REQUIRED - Select a shop from the dropdown
```

### Step 4: Click "Create User"
- User is created in the system
- User can now login to the mobile app with their email and password
- User will only see data from their assigned shop

### Important Notes:
✅ Shop assignment is REQUIRED for salesmen
✅ Save the password shown on success - give it to the user
✅ User cannot change their email after creation
✅ Use "Reset Password" button to send password reset email

---

## 🏪 Adding a New Shop

### Step 1: Navigate to Shops Page
- Click on **"Shops"** in the sidebar

### Step 2: Click "+ Add Shop"
- You'll see this button at the top right

### Step 3: Fill in the Shop Form
```
Shop Name:         Enter shop name (e.g., "Super Mart Downtown")
Route:             (Optional) Assign to a route for territory organization
Salesman:          ⭐ Select the salesman who will manage this shop
Representative:    (Optional) Assign a rep for delivery/stock management
```

### Step 4: Click "Create Shop"
- Shop is created in the system
- If you assigned a salesman, they can now see this shop in the mobile app

### Important Notes:
✅ Salesman assignment links the shop to a user
✅ Route helps organize shops by territory
✅ Representative handles stock/delivery for this shop
✅ You can edit assignments anytime by clicking "Edit"

---

## 🔄 Typical Workflow

### Scenario 1: New Salesman + New Shop
```
1. First, add the SHOP (without salesman for now)
2. Then, add the SALESMAN and assign the shop
3. OR: Add salesman first, then add shop and assign that salesman
```

### Scenario 2: Existing Salesman Needs New Shop
```
1. Add the new shop
2. In the shop form, select the existing salesman
3. OR: Edit the salesman and change their assigned shop
```

### Scenario 3: New Salesman for Existing Shop  
```
1. Add the new salesman
2. Assign the existing shop to them
3. IMPORTANT: If another salesman was assigned to that shop, update or remove them
```

---

## 🔍 Filtering and Searching

### Users Page Filters:
- **Search:** By name, email, or shop name
- **Role Filter:** Show only salesmen, reps, storekeepers, or admins
- **Shop Status:** Show users with/without shop assignments

### Shops Page Filters:
- **Search:** By shop, route, salesman, or rep name
- **Route Filter:** Show only shops in a specific route

---

## ⚠️ Important Rules

### For Salesmen:
✅ MUST have a shop assigned
✅ Login with email + password you set
✅ Can only see data from their assigned shop
✅ Can submit sales requests and daily income

### For Shops:
✅ Can have ONE salesman assigned
✅ Can have ONE route assigned
✅ Can have ONE representative assigned
✅ Salesman assignment is what links the shop to the user

---

## 📱 What Happens After Creation?

### When you create a Salesman:
1. User account is created in authentication system
2. User record is added to database with role and shop
3. User can login to mobile app immediately
4. User sees ONLY their assigned shop's data

### When you create a Shop:
1. Shop is added to database
2. If salesman assigned, they can now see it in mobile app
3. If route assigned, shop appears in route management
4. If rep assigned, rep sees shop in their list

---

## 🆘 Common Questions

**Q: Can a salesman have multiple shops?**
A: No, currently one salesman = one shop. You can change which shop they're assigned to by editing the user.

**Q: Can a shop have multiple salesmen?**
A: No, currently one shop = one salesman.

**Q: What if I don't have shops yet?**
A: Create shops first, then add salesmen and assign them.

**Q: Can I change assignments later?**
A: Yes! Click "Edit" on any user or shop to change assignments.

**Q: What if salesman forgets password?**
A: Click the "Reset" button next to their password in the user list. They'll get a password reset email.

---

## 🎓 Quick Examples

### Example 1: Adding First Salesman
```
1. Go to Shops → Add Shop
   Name: "Main Street Market"
   (Leave salesman empty for now)

2. Go to Users → Add User
   Name: "Jane Smith"
   Email: "jane@company.com"
   Password: "Welcome123"
   Role: "Salesman"
   Shop: "Main Street Market" ✅

3. Done! Jane can now login and see Main Street Market data.
```

### Example 2: Adding Shop for Existing Salesman
```
1. Go to Shops → Add Shop
   Name: "Downtown Grocers"
   Salesman: Select "Jane Smith" ✅

2. OR: Go to Users → Edit Jane Smith
   Change Shop: "Downtown Grocers"

3. Done! Jane now manages Downtown Grocers instead.
```

---

## 📞 Need Help?
- Check the Users page to see all salesmen and their shop assignments
- Check the Shops page to see all shops and their salesmen
- Use filters to find specific users or shops quickly
