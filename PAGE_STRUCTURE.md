# 📐 NLDB System - Complete Page Structure

## 🌳 Visual System Architecture

```
NLDB SALES MANAGEMENT SYSTEM
│
├── 🌐 WEB APPLICATION (Admin Portal)
│   │
│   ├── 🔐 AUTHENTICATION
│   │   └── Login Page ✅ (existing)
│   │
│   ├── 📊 MAIN DASHBOARD
│   │   ├── Overview Widget (total revenue, sales, stock value)
│   │   ├── 8-Category Revenue Chart 🔴 NEW
│   │   ├── Top Products Widget
│   │   ├── Low Stock Alerts 🔴 NEW
│   │   ├── Expiry Alerts (perishables) 🔴 NEW
│   │   ├── Outlet Performance Table 🔴 NEW
│   │   └── Recent Transactions Feed
│   │
│   ├── 📦 PRODUCTS & INVENTORY
│   │   │
│   │   ├── Product Categories Page 🔴 NEW
│   │   │   ├── List: Breeding, Milk, Eggs, Meat, Coconut, etc.
│   │   │   ├── Add/Edit/Archive category
│   │   │   └── Category-wise commission settings
│   │   │
│   │   ├── Products/Items Page ✅🔧 (enhance existing)
│   │   │   ├── Product list with category filter
│   │   │   ├── Add Product Form:
│   │   │   │   ├── Basic info (name, description)
│   │   │   │   ├── Category selection
│   │   │   │   ├── SKU & Barcode
│   │   │   │   ├── Pricing (wholesale/retail)
│   │   │   │   ├── Unit of measure
│   │   │   │   ├── Perishability flag
│   │   │   │   ├── Shelf life (days)
│   │   │   │   ├── Tax rate
│   │   │   │   ├── Supplier
│   │   │   │   └── Images
│   │   │   ├── Edit Product
│   │   │   ├── Product Details View
│   │   │   └── Bulk Import/Export
│   │   │
│   │   ├── Stock Management 🔧 (major enhancement)
│   │   │   ├── Multi-Location View (dropdown: All/Outlet A/B/C)
│   │   │   ├── Category Filter Tab
│   │   │   ├── Stock List:
│   │   │   │   ├── Product name
│   │   │   │   ├── Category
│   │   │   │   ├── Total quantity
│   │   │   │   ├── Per-outlet breakdown
│   │   │   │   ├── Batch info (if applicable)
│   │   │   │   ├── Expiry status
│   │   │   │   └── Actions (adjust, transfer)
│   │   │   ├── Stock Adjustment Modal
│   │   │   ├── Low Stock Alerts
│   │   │   └── Expiry Alerts
│   │   │
│   │   ├── Batch Management 🔴 NEW
│   │   │   ├── Batch List per Product
│   │   │   ├── Add Batch:
│   │   │   │   ├── Batch number
│   │   │   │   ├── Manufacture date
│   │   │   │   ├── Expiry date
│   │   │   │   ├── Quantity
│   │   │   │   └── Outlet
│   │   │   └── Batch History
│   │   │
│   │   ├── Stock Transfers 🔴 NEW
│   │   │   ├── Create Transfer:
│   │   │   │   ├── From Outlet
│   │   │   │   ├── To Outlet
│   │   │   │   ├── Products & quantities
│   │   │   │   ├── Transfer date
│   │   │   │   └── Notes
│   │   │   ├── Pending Transfers
│   │   │   ├── Transfer History
│   │   │   └── Approve/Receive Transfer
│   │   │
│   │   └── Wastage Tracking 🔴 NEW
│   │       ├── Record Wastage:
│   │       │   ├── Product
│   │       │   ├── Batch
│   │       │   ├── Quantity
│   │       │   ├── Reason (expired, damaged, spoiled)
│   │       │   ├── Outlet
│   │       │   └── Photos (optional)
│   │       └── Wastage Reports
│   │
│   ├── 🏪 OUTLETS & DISTRIBUTION
│   │   │
│   │   ├── Outlets/Shops ✅🔧 (enhance existing)
│   │   │   ├── Outlet List
│   │   │   ├── Add Outlet:
│   │   │   │   ├── Basic info (name, code)
│   │   │   │   ├── Type (Farm/Sales Center/Distribution)
│   │   │   │   ├── Address
│   │   │   │   ├── GPS coordinates
│   │   │   │   ├── Contact details
│   │   │   │   ├── Opening hours
│   │   │   │   ├── Manager assignment
│   │   │   │   └── Staff assignment
│   │   │   ├── Outlet Details:
│   │   │   │   ├── Overview
│   │   │   │   ├── Stock levels
│   │   │   │   ├── Sales performance
│   │   │   │   ├── Assigned staff
│   │   │   │   └── Photo gallery
│   │   │   └── Outlet Performance Dashboard
│   │   │
│   │   └── Routes Management ✅ (keep existing)
│   │       ├── Route List
│   │       ├── Add/Edit Route
│   │       ├── Shop assignment to route
│   │       ├── Rep assignment
│   │       └── Route optimization
│   │
│   ├── 💰 SALES & ORDERS
│   │   │
│   │   ├── Sales Entry (POS) 🔴 NEW
│   │   │   ├── Quick Sale Form:
│   │   │   │   ├── Outlet selection
│   │   │   │   ├── Date/time
│   │   │   │   ├── Customer (optional)
│   │   │   │   ├── Product selection with search
│   │   │   │   ├── Quantity input (with stock check)
│   │   │   │   ├── Price (auto-fill, editable)
│   │   │   │   ├── Discount
│   │   │   │   ├── Cart view
│   │   │   │   ├── Total calculation
│   │   │   │   ├── Payment method (Cash/Card/Credit)
│   │   │   │   └── Print invoice
│   │   │   ├── Recent Sales
│   │   │   └── Today's Summary
│   │   │
│   │   ├── Orders Management 🔴 NEW
│   │   │   ├── Order List (All/Pending/Completed)
│   │   │   ├── Create Order:
│   │   │   │   ├── Customer
│   │   │   │   ├── Outlet
│   │   │   │   ├── Products & quantities
│   │   │   │   ├── Delivery date
│   │   │   │   ├── Special instructions
│   │   │   │   └── Order total
│   │   │   ├── Order Details View
│   │   │   ├── Order Fulfillment
│   │   │   └── Delivery Scheduling
│   │   │
│   │   └── Sales History 🔴 NEW
│   │       ├── Date range filter
│   │       ├── Outlet filter
│   │       ├── Category filter
│   │       ├── Product filter
│   │       ├── Payment status filter
│   │       ├── Sales list with details
│   │       ├── Invoice view/print
│   │       └── Export to Excel
│   │
│   ├── 👥 CUSTOMERS & SUPPLIERS
│   │   │
│   │   ├── Customers 🔴 NEW
│   │   │   ├── Customer List
│   │   │   ├── Add Customer:
│   │   │   │   ├── Basic info (name, contact)
│   │   │   │   ├── Type (Individual/Retailer/Government)
│   │   │   │   ├── Address
│   │   │   │   ├── Credit limit
│   │   │   │   ├── Payment terms
│   │   │   │   └── Tax info
│   │   │   ├── Customer Details:
│   │   │   │   ├── Purchase history
│   │   │   │   ├── Outstanding balance
│   │   │   │   ├── Payment history
│   │   │   │   └── Notes
│   │   │   └── Customer Groups/Categories
│   │   │
│   │   └── Suppliers 🔴 NEW
│   │       ├── Supplier List
│   │       ├── Add Supplier:
│   │       │   ├── Company info
│   │       │   ├── Contact person
│   │       │   ├── Products supplied
│   │       │   ├── Payment terms
│   │       │   └── Bank details
│   │       ├── Supplier Details:
│   │       │   ├── Purchase history
│   │       │   ├── Pending payments
│   │       │   └── Performance rating
│   │       └── Purchase Orders:
│   │           ├── Create PO
│   │           ├── PO List
│   │           ├── Goods Receipt
│   │           └── Payment tracking
│   │
│   ├── 💵 FINANCIAL MANAGEMENT
│   │   │
│   │   ├── Daily Income ✅🔧 (enhance existing)
│   │   │   ├── Income Entry (if manual)
│   │   │   ├── Auto-calculated from sales 🔴
│   │   │   ├── Category-wise breakdown 🔴
│   │   │   ├── Outlet-wise breakdown 🔴
│   │   │   ├── Payment method summary 🔴
│   │   │   ├── Date range view
│   │   │   └── Export reports
│   │   │
│   │   ├── Collections 🔴 NEW
│   │   │   ├── Outstanding Payments List
│   │   │   ├── Customer-wise aging
│   │   │   ├── Record Payment:
│   │   │   │   ├── Customer
│   │   │   │   ├── Amount
│   │   │   │   ├── Payment method
│   │   │   │   ├── Reference number
│   │   │   │   └── Receipt generation
│   │   │   ├── Collection History
│   │   │   └── Reminder notifications
│   │   │
│   │   ├── Expenses 🔴 NEW
│   │   │   ├── Expense Entry:
│   │   │   │   ├── Type (Salary/Transport/Utilities/etc)
│   │   │   │   ├── Outlet
│   │   │   │   ├── Amount
│   │   │   │   ├── Date
│   │   │   │   ├── Description
│   │   │   │   ├── Receipt upload
│   │   │   │   └── Approval workflow
│   │   │   ├── Expense List
│   │   │   └── Category-wise summary
│   │   │
│   │   └── Financial Reports 🔴 NEW
│   │       ├── Profit & Loss Statement
│   │       ├── Income Statement
│   │       ├── Cash Flow Report
│   │       ├── Outstanding Collections Report
│   │       ├── Expense Analysis
│   │       ├── Category-wise Profitability
│   │       ├── Outlet-wise P&L
│   │       └── Monthly/Quarterly/Annual Reports
│   │
│   ├── 👤 USER & STAFF MANAGEMENT
│   │   │
│   │   ├── Users ✅🔧 (enhance existing)
│   │   │   ├── User List
│   │   │   ├── Add User with roles:
│   │   │   │   ├── Admin (full access)
│   │   │   │   ├── Manager (outlet management)
│   │   │   │   ├── Sales Rep (mobile app) 🔴
│   │   │   │   ├── Storekeeper (mobile app) ✅
│   │   │   │   ├── Accountant (financial access) 🔴
│   │   │   │   └── Delivery Staff (new role) 🔴
│   │   │   ├── User Details:
│   │   │   │   ├── Profile
│   │   │   │   ├── Outlet assignment
│   │   │   │   ├── Performance metrics 🔴
│   │   │   │   └── Activity log
│   │   │   └── Role & Permission Management
│   │   │
│   │   ├── Rep Dashboard ✅ (monitoring)
│   │   │   ├── All reps overview
│   │   │   ├── Rep performance
│   │   │   ├── Today's activity
│   │   │   └── Sales targets
│   │   │
│   │   └── Storekeeper Dashboard ✅ (monitoring)
│   │       ├── All storekeepers overview
│   │       ├── Pending tasks
│   │       └── Stock accuracy
│   │
│   ├── 📈 REPORTS & ANALYTICS
│   │   │
│   │   └── Reports Center 🔴 NEW (consolidated)
│   │       ├── Sales Reports:
│   │       │   ├── Daily Sales Summary
│   │       │   ├── Product-wise Sales
│   │       │   ├── Category-wise Revenue
│   │       │   ├── Outlet Comparison
│   │       │   ├── Rep Performance
│   │       │   └── Sales Trends
│   │       │
│   │       ├── Inventory Reports:
│   │       │   ├── Current Stock Levels
│   │       │   ├── Stock Movement
│   │       │   ├── Wastage Report
│   │       │   ├── Expiry Report
│   │       │   ├── Stock Valuation
│   │       │   └── Dead Stock Analysis
│   │       │
│   │       ├── Financial Reports:
│   │       │   ├── P&L Statement
│   │       │   ├── Cash Flow
│   │       │   ├── Outstanding Collections
│   │       │   ├── Expense Analysis
│   │       │   └── Revenue Analysis
│   │       │
│   │       └── Government Reports: 🔴 NEW
│   │           ├── Monthly Returns
│   │           ├── Annual Financial Statement
│   │           ├── Audit Trail
│   │           └── Tax Reports
│   │
│   ├── ⚙️ SETTINGS & CONFIGURATION
│   │   │
│   │   └── Settings ✅🔧 (enhance)
│   │       ├── System Settings
│   │       ├── Category Configuration 🔴
│   │       ├── Tax Rules 🔴
│   │       ├── Pricing Rules 🔴
│   │       ├── Outlet Configuration
│   │       ├── User Permissions
│   │       ├── Notification Settings 🔴
│   │       ├── Backup & Restore
│   │       └── Multi-language Settings 🔴
│   │
│   └── 📋 GOVERNMENT COMPLIANCE 🔴 NEW
│       ├── Audit Log Viewer
│       ├── Compliance Dashboard
│       ├── Monthly Reports to Ministry
│       └── Document Repository
│
│
├── 📱 MOBILE APPLICATION (Field Staff)
│   │
│   ├── 🔐 LOGIN
│   │   └── Mobile Login ✅
│   │
│   ├── 👨‍💼 SALES REPRESENTATIVE APP
│   │   │
│   │   ├── Home Dashboard ✅🔧
│   │   │   ├── Today's Summary
│   │   │   ├── Pending Requests ✅
│   │   │   ├── Sales Targets 🔴
│   │   │   ├── Collection Reminders 🔴
│   │   │   └── Today's Route
│   │   │
│   │   ├── My Shops ✅🔧
│   │   │   ├── Shop List (assigned)
│   │   │   ├── Shop Details:
│   │   │   │   ├── Contact info ✅
│   │   │   │   ├── Location (GPS map) 🔴
│   │   │   │   ├── Visit history 🔴
│   │   │   │   ├── Order history 🔴
│   │   │   │   └── Outstanding payments 🔴
│   │   │   └── Navigate to shop 🔴
│   │   │
│   │   ├── My Stock ✅🔧
│   │   │   ├── Stock in van/vehicle 🔴
│   │   │   ├── Category tabs 🔴
│   │   │   ├── Product list with quantities
│   │   │   ├── Van stock vs warehouse stock 🔴
│   │   │   └── Stock request to warehouse ✅
│   │   │
│   │   ├── Sales & Orders 🔴 NEW
│   │   │   ├── Quick Sale Entry:
│   │   │   │   ├── Shop selection
│   │   │   │   ├── Product scanner/search
│   │   │   │   ├── Quantity input
│   │   │   │   ├── Price (auto/manual)
│   │   │   │   ├── Payment method
│   │   │   │   ├── Generate invoice
│   │   │   │   └── Signature capture
│   │   │   ├── Today's Sales
│   │   │   └── Sales History
│   │   │
│   │   ├── Collections 🔴 NEW
│   │   │   ├── Outstanding List by Shop
│   │   │   ├── Collect Payment:
│   │   │   │   ├── Customer/Shop
│   │   │   │   ├── Amount
│   │   │   │   ├── Payment method
│   │   │   │   ├── Reference number
│   │   │   │   ├── Photo of check/receipt
│   │   │   │   └── Generate receipt
│   │   │   └── Collection History
│   │   │
│   │   ├── Requests ✅ (keep as is)
│   │   │   ├── Create Request
│   │   │   ├── Pending Requests
│   │   │   └── Request History
│   │   │
│   │   ├── Reports 🔴 NEW
│   │   │   ├── Daily Sales Summary
│   │   │   ├── Collection Summary
│   │   │   ├── Visits Made
│   │   │   └── Distance Traveled (GPS)
│   │   │
│   │   └── Profile/Settings ✅
│   │       └── Rep profile, logout
│   │
│   └── 📦 STOREKEEPER APP
│       │
│       ├── Home Dashboard ✅🔧
│       │   ├── Stock Summary
│       │   ├── Expiry Alerts 🔴
│       │   ├── Pending Inbound 🔴
│       │   ├── Pending Outbound 🔴
│       │   └── Low Stock Alerts
│       │
│       ├── Inventory ✅🔧
│       │   ├── Stock List (category tabs) 🔴
│       │   ├── Product Details
│       │   ├── Batch View 🔴
│       │   ├── Stock Adjustment
│       │   └── Physical Count 🔴
│       │
│       ├── Inbound/Receiving 🔴 NEW
│       │   ├── Receive from Farm/Supplier
│       │   ├── Create Batch
│       │   ├── Barcode/QR Scanning 🔴
│       │   ├── Quality Check
│       │   └── Receipt History
│       │
│       ├── Outbound/Issuing 🔴 NEW
│       │   ├── Issue to Sales Reps
│       │   ├── Process Transfers
│       │   ├── Batch selection (FIFO)
│       │   └── Delivery Note Generation
│       │
│       ├── Wastage Recording 🔴 NEW
│       │   ├── Record Wastage
│       │   ├── Photo documentation
│       │   ├── Reason selection
│       │   └── Wastage History
│       │
│       ├── Stock Transfers 🔴 NEW
│       │   ├── Create Transfer
│       │   ├── Receive Transfer
│       │   └── Transfer History
│       │
│       ├── Reports 🔴 NEW
│       │   ├── Daily Stock Movement
│       │   ├── Stock Count Variance
│       │   └── Wastage Report
│       │
│       └── Profile/Settings ✅
│           └── Storekeeper profile, logout
│
└── 🗄️ DATABASE & BACKEND
    │
    ├── Existing Tables ✅
    │   ├── users
    │   ├── shops
    │   ├── items
    │   ├── stock
    │   ├── routes
    │   └── requests
    │
    └── New Tables 🔴
        ├── product_categories
        ├── stock_batches
        ├── customers
        ├── sales
        ├── sale_items
        ├── stock_movements
        ├── wastage
        ├── suppliers
        ├── purchase_orders
        ├── collections
        └── expenses
```

---

## 📊 Page Count Summary

### Web Application:
| Status | Count | Pages |
|--------|-------|-------|
| ✅ Existing (keep) | 6 | Login, Dashboard, Routes, Rep Dashboard, Storekeeper Dashboard, Settings |
| 🔧 Enhance (upgrade) | 5 | Items, Shops, Stock, Daily Income, Users |
| 🔴 Build New | 9 | Categories, Sales Entry, Orders, Customers, Suppliers, Collections, Expenses, Reports, Compliance |
| **TOTAL** | **20** | **Complete web system** |

### Mobile Application:
| App | Screens | Status |
|-----|---------|--------|
| Sales Rep | 7-8 | ✅ 4 existing, 🔴 3-4 new |
| Storekeeper | 6-7 | ✅ 3 existing, 🔴 3-4 new |
| **TOTAL** | **13-15** | **Complete mobile system** |

---

## 🎯 Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Already exists and works |
| 🔧 | Exists but needs enhancement |
| 🔴 | New - needs to be built |

---

**Total System Pages:** ~33-35 pages/screens for complete NLDB solution

**Your Progress:** ~40% complete (foundation is solid!)

---

**Created:** December 30, 2025  
**Project:** NLDB Sales Management System Architecture
