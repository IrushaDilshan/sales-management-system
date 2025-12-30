# NLDB Sales Management System - Requirements & Pages

## 📋 Executive Summary

This document outlines the complete requirements for developing a comprehensive Sales Management System for the **National Livestock Development Board (NLDB)** - a Sri Lankan government organization that manages livestock farms and sells various agricultural products through multiple outlets.

---

## 🏢 About NLDB

**Organization Type:** Government-owned livestock management institute  
**Primary Business:** Breeding stock, livestock products, agricultural products  
**Distribution:** Multiple farms and sales centers across Sri Lanka  
**Recent Expansion:** 4 new outlets opened in November 2025

### Product Categories:
1. **Breeding Materials** (45% revenue) - Chicks, calves, kids, piglets
2. **Milk Products** (17% revenue)
3. **Eggs** (13% revenue)
4. **Meat Products** (10% revenue)
5. **Coconut Products** (9% revenue)
6. **Other Agricultural Products** (3% revenue)
7. **Services** (2% revenue)
8. **Other** (1% revenue)

---

## 🎯 System Architecture

### Platform Structure:
- **Web Application** - Admin & Management Portal (React)
- **Mobile Application** - Field Sales & Store Staff (React Native)
- **Backend** - Supabase (PostgreSQL + Auth + Realtime)

---

## 📱 Required Pages/Modules

### **WEB APPLICATION (Admin Portal)**

#### 1. **Authentication & Access**
- [ ] Login Page (existing ✅)
- [ ] Multi-level user authentication (Admin, Manager, Accountant)
- [ ] Password reset & recovery

#### 2. **Dashboard Pages**

##### 2.1 Main Dashboard (Home)
**Current:** Basic dashboard with sales overview  
**Needed for NLDB:**
- Revenue breakdown by product category (8 categories)
- Daily/Weekly/Monthly sales comparison
- Top-selling products chart
- Low stock alerts by category
- Top-performing outlets
- Recent transactions feed
- Target vs Achievement metrics

##### 2.2 Products Management
**New Module Required:**
- **Product Categories Page**
  - Manage 8 main categories (Breeding, Milk, Eggs, Meat, Coconut, etc.)
  - Sub-category management
  - Category-specific pricing rules
  
- **Products/Items Page** (existing ✅ - needs expansion)
  - Add/Edit/Delete products
  - SKU management
  - Product images
  - Category assignment
  - Pricing (wholesale/retail)
  - Unit of measure (kg, liter, piece, etc.)
  - Perishability settings (for dairy, eggs, meat)
  - Batch/Lot tracking
  - Expiry date management

##### 2.3 Outlets/Shops Management
**Current:** Shops.js (existing ✅)  
**Enhancements Needed:**
- Outlet types (Farm, Sales Center, Distribution Point)
- Outlet location mapping
- Outlet-specific inventory levels
- Outlet performance analytics
- Opening hours & contact details
- Assigned staff per outlet

##### 2.4 Inventory Management
**Current:** Stock.js (existing ✅)  
**Major Enhancements Needed:**
- **Multi-location inventory** (track stock across all outlets)
- **Category-wise stock levels**
- **Perishable goods tracking** (dairy, eggs, meat with expiry dates)
- **Batch/Lot management**
- **Stock transfer between outlets**
- **Wastage & spoilage tracking**
- **Minimum stock alerts** per category
- **Stock adjustment logs**
- **Inventory valuation reports**

##### 2.5 Sales & Orders
**New Module Required:**
- **Daily Sales Entry**
  - Quick sale entry per outlet
  - Product selection with real-time stock check
  - Multiple payment methods (cash, card, credit)
  - Invoice generation
  
- **Orders Management**
  - Advance orders from customers
  - Bulk order processing
  - Order fulfillment tracking
  - Delivery scheduling

- **Sales History**
  - Date-wise sales reports
  - Product-wise sales analysis
  - Outlet-wise performance
  - Sales representative performance
  - Payment collection tracking

##### 2.6 Customers Management
**New Module Required:**
- Customer database (farmers, retailers, institutions)
- Customer categories (individual, bulk, government)
- Credit limit management
- Purchase history
- Outstanding payments
- Customer loyalty tracking

##### 2.7 Suppliers & Procurement
**New Module Required:**
- Supplier database (for coconut, feed, packaging, etc.)
- Purchase orders
- Goods received notes
- Supplier payment tracking
- Procurement analytics

##### 2.8 Financial Management

- **Daily Income** (existing ✅ - needs expansion)
  - Income by category
  - Income by outlet
  - Payment method breakdown
  - Credit sales tracking
  
- **Expenses Tracking** (New)
  - Operational expenses
  - Transportation costs
  - Staff salaries
  - Utility bills
  - Farm maintenance
  
- **Profit & Loss Reports** (New)
  - Category-wise profitability
  - Outlet-wise P&L
  - Monthly/Quarterly/Annual reports
  
- **Outstanding Collections** (New)
  - Credit sales tracking
  - Payment reminders
  - Collection reports

##### 2.9 Staff Management
**Current:** Users.js (existing ✅)  
**Enhancements Needed:**
- User roles:
  - Admin (full access)
  - Manager (outlet management)
  - Sales Rep (mobile app user)
  - Storekeeper (mobile app user)
  - Accountant (financial access only)
  - Delivery Staff (new role)
- Staff assignments to outlets
- Attendance tracking
- Performance metrics
- Commission calculation (if applicable)

##### 2.10 Routes Management
**Current:** Routes.js (existing ✅)  
**For NLDB:**
- Delivery routes for distribution
- Route optimization
- Vehicle assignment
- Delivery schedule management
- Route performance tracking

##### 2.11 Reports & Analytics
**New Module Required:**
- **Sales Reports:**
  - Daily sales summary
  - Product-wise sales
  - Category-wise revenue
  - Outlet comparison
  - Sales trends & forecasting
  
- **Inventory Reports:**
  - Current stock levels
  - Stock movement
  - Wastage reports
  - Valuation reports
  
- **Financial Reports:**
  - Income statement
  - Cash flow
  - Outstanding collections
  - Expense analysis
  
- **Compliance Reports:**
  - Government reporting (as it's a govt organization)
  - Audit trails
  - Tax reports

##### 2.12 Settings & Configuration
**Current:** Settings.js (existing ✅)  
**Enhancements:**
- System-wide settings
- Product category configuration
- Tax & pricing rules
- Outlet configuration
- User permissions
- Data backup & restore
- System notifications

##### 2.13 Government Compliance (New)
**Special for Government Organization:**
- Monthly returns to parent ministry
- Financial year reports
- Subsidy tracking (if applicable)
- Project expenditure tracking
- Audit log maintenance

---

### **MOBILE APPLICATION (Field Staff)**

#### Current Roles:
- Sales Representative ✅
- Storekeeper ✅

#### 3. **Sales Representative App**

##### 3.1 Home Dashboard (existing ✅)
**Current Features:**
- Pending requests
- Assigned shops
- Stock levels

**Enhancements for NLDB:**
- Daily sales targets
- Today's deliveries
- Collection reminders
- Quick sale entry

##### 3.2 Shops/Outlets (existing ✅)
**Enhancements:**
- Shop visit history
- Shop location with GPS
- Shop order history
- Shop outstanding payments

##### 3.3 Stock Management (existing ✅)
**Enhancements:**
- Category-wise stock view
- Real-time stock sync
- Stock in vehicle/van
- Stock return process

##### 3.4 Sales & Orders (Enhancement Needed)
- Quick sale entry
- Invoice generation on mobile
- Payment collection
- Credit sale approval
- Photo documentation (delivery proof)

##### 3.5 Collections
**New Feature:**
- Outstanding payment list
- Payment collection
- Receipt generation
- Cash handover to accounts

##### 3.6 Requests (existing ✅)
**Current:** Request stock from warehouse
**Keep as is** - works well

##### 3.7 Reports (New)
- Daily sales summary
- Collection summary
- Distance traveled
- Shop visit summary

#### 4. **Storekeeper App**

##### 4.1 Dashboard (existing ✅)
**Enhancements:**
- Category-wise inventory summary
- Expiry alerts (for perishables)
- Pending inbound/outbound

##### 4.2 Stock Management
**Current:** Basic inventory (existing ✅)  
**Major Enhancements:**
- Barcode/QR scanning
- Batch entry
- Expiry date tracking
- Wastage recording
- Stock adjustment
- Physical stock count

##### 4.3 Inbound/Outbound
**New Features:**
- Receive stock from farms
- Issue stock to sales reps
- Stock transfers between outlets
- Delivery receipts

##### 4.4 Reports
- Daily stock movement
- Stock count variance
- Wastage reports

---

## 📊 Database Schema Requirements

### New Tables Needed:

1. **product_categories**
   - id, name, description, commission_rate, is_active

2. **products** (expand existing items table)
   - Add: category_id, sku, barcode, unit_of_measure, is_perishable, shelf_life_days, wholesale_price, retail_price, tax_rate, supplier_id

3. **stock_batches**
   - id, product_id, batch_number, manufacture_date, expiry_date, quantity, outlet_id

4. **outlets** (expand existing shops table)
   - Add: outlet_type, opening_hours, manager_id, address, gps_coordinates

5. **sales**
   - id, outlet_id, sale_date, customer_id, total_amount, payment_method, payment_status, invoice_number, rep_id

6. **sale_items**
   - id, sale_id, product_id, batch_id, quantity, unit_price, discount, total

7. **customers**
   - id, name, type, contact, address, credit_limit, outstanding_balance

8. **stock_movements**
   - id, product_id, batch_id, from_outlet_id, to_outlet_id, quantity, movement_type, movement_date, reference_number

9. **wastage**
   - id, product_id, batch_id, outlet_id, quantity, reason, recorded_by, date

10. **suppliers**
    - id, name, contact, address, product_categories, payment_terms

11. **purchase_orders**
    - id, supplier_id, order_date, expected_date, status, total_amount

12. **expenses**
    - id, outlet_id, expense_type, amount, description, date, approved_by

13. **collections**
    - id, customer_id, rep_id, amount, payment_method, collection_date, reference_number

---

## 🎨 UI/UX Requirements

### Design Principles for Government System:
1. **Professional & Clean** - Government-appropriate aesthetics
2. **Easy to Use** - Staff may have varying tech skills
3. **Multi-language** - Support Sinhala, Tamil, English (as seen on NLDB website)
4. **Accessible** - Large fonts, clear labels
5. **Responsive** - Work on different screen sizes
6. **Offline Capable** - Mobile app should work with intermittent connectivity

---

## 🔒 Security & Compliance

### Government Requirements:
1. **Audit Trails** - Log all transactions and changes
2. **Role-based Access** - Strict user permissions
3. **Data Backup** - Regular automated backups
4. **Data Privacy** - GDPR-like compliance for customer data
5. **Financial Security** - Secure payment processing
6. **Session Management** - Auto-logout for security

---

## 📈 Implementation Priority

### Phase 1 (Foundation) - 3-4 weeks
- [ ] Expand product categories system
- [ ] Multi-location inventory
- [ ] Basic sales entry module
- [ ] Customer database
- [ ] Enhanced dashboard

### Phase 2 (Core Operations) - 4-5 weeks
- [ ] Complete sales & order management
- [ ] Collections module
- [ ] Stock transfer system
- [ ] Wastage tracking
- [ ] Mobile app enhancements

### Phase 3 (Financial) - 3-4 weeks
- [ ] Complete financial reports
- [ ] P&L reports
- [ ] Expense tracking
- [ ] Supplier management
- [ ] Purchase orders

### Phase 4 (Analytics & Compliance) - 2-3 weeks
- [ ] Advanced analytics
- [ ] Government reports
- [ ] Audit trails
- [ ] Multi-language support
- [ ] Final testing & training

**Total Estimated Timeline:** 12-16 weeks

---

## 💰 Resource Requirements

### Development Team:
- 1 Backend Developer (Supabase/PostgreSQL)
- 1 Frontend Developer (React)
- 1 Mobile Developer (React Native)
- 1 UI/UX Designer
- 1 QA Tester
- 1 Project Manager

### Infrastructure:
- Supabase Pro Plan (for production)
- Cloud storage for images/documents
- Backup solutions
- Domain & SSL certificates

---

## 🎓 Training Requirements

### Staff Training Sessions:
1. **Admin Users** - 2 days
2. **Outlet Managers** - 2 days
3. **Sales Representatives** - 1 day (mobile app)
4. **Storekeepers** - 1 day (mobile app)
5. **Accountants** - 1 day (financial modules)

---

## 📝 Summary

### Total Pages Required:

**Web Application:** ~18-20 main pages/modules
- Dashboard (1)
- Products & Categories (2)
- Outlets/Shops (1)
- Inventory (1)
- Sales & Orders (3)
- Customers (1)
- Suppliers (1)
- Financial (3)
- Staff (1)
- Routes (1)
- Reports (1)
- Settings (1)
- Compliance (1)

**Mobile Application:** ~8-10 screens per role
- Rep App: 7-8 main screens
- Storekeeper App: 6-7 main screens

### What Makes This Different from Generic Sales System:

1. **Multi-Category Product Management** - 8 distinct product categories
2. **Perishable Goods Tracking** - Critical for dairy, eggs, meat
3. **Multi-Location Inventory** - Farms + Sales Centers
4. **Government Compliance** - Audit trails, reporting
5. **Batch/Lot Tracking** - For breeding materials and food safety
6. **Wastage Management** - Track spoilage and losses
7. **Credit Sales & Collections** - Government/institutional sales
8. **Multi-language Support** - Sinhala, Tamil, English

---

## ✅ Next Steps

1. **Review this document** with NLDB stakeholders
2. **Prioritize features** based on immediate needs
3. **Finalize database schema**
4. **Create UI/UX mockups** for approval
5. **Set up development environment**
6. **Start Phase 1 development**

---

**Document Created:** December 30, 2025  
**Project:** NLDB Sales Management System  
**Status:** Requirements Analysis Complete
