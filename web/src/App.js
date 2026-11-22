import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainShell from './components/MainShell';
import StoreKeeperSidebar from './components/StoreKeeperSidebar';
import { ToastProvider } from './shared/ToastContext';

// Pages
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Shops from './pages/Shops';
import Items from './pages/Items';
import Stock from './pages/Stock';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import SalesHistory from './pages/SalesHistory';
import Storekeeper from './pages/Storekeeper';
import DailyIncome from './pages/DailyIncome';
import RoutesPage from './pages/Routes';
import StoreKeeperDashboard from './pages/StoreKeeperDashboard';
import Login from './pages/Login';
import Home from './pages/Home';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 1. Unauthenticated / Public Auth Routes (NO Sidebar, NO Topbar) */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

            {/* 2. Authenticated Admin Routes (Wrapped in Global MainShell) */}
            <Route
              path="/dashboard"
              element={
                <MainShell>
                  <Dashboard />
                </MainShell>
              }
            />
            <Route
              path="/categories"
              element={
                <MainShell>
                  <Categories />
                </MainShell>
              }
            />
            <Route
              path="/items"
              element={
                <MainShell>
                  <Items />
                </MainShell>
              }
            />
            <Route
              path="/users"
              element={
                <MainShell>
                  <Users />
                </MainShell>
              }
            />
            <Route
              path="/shops"
              element={
                <MainShell>
                  <Shops />
                </MainShell>
              }
            />
            <Route
              path="/routes"
              element={
                <MainShell>
                  <RoutesPage />
                </MainShell>
              }
            />
            <Route
              path="/daily-income"
              element={
                <MainShell>
                  <DailyIncome />
                </MainShell>
              }
            />
            <Route
              path="/settings"
              element={
                <MainShell>
                  <Settings />
                </MainShell>
              }
            />
            <Route
              path="/stock"
              element={
                <MainShell>
                  <Stock />
                </MainShell>
              }
            />
            <Route
              path="/customers"
              element={
                <MainShell>
                  <Customers />
                </MainShell>
              }
            />
            <Route
              path="/sales"
              element={
                <MainShell>
                  <Sales />
                </MainShell>
              }
            />
            <Route
              path="/sales-history"
              element={
                <MainShell>
                  <SalesHistory />
                </MainShell>
              }
            />

            {/* 3. Dedicated Storekeeper Layout Routes */}
            <Route
              path="/storekeeper/dashboard"
              element={
                <div className="storekeeper-layout">
                  <StoreKeeperSidebar />
                  <div className="storekeeper-content">
                    <StoreKeeperDashboard />
                  </div>
                </div>
              }
            />
            <Route
              path="/storekeeper/stock"
              element={
                <div className="storekeeper-layout">
                  <StoreKeeperSidebar />
                  <div className="storekeeper-content">
                    <Stock />
                  </div>
                </div>
              }
            />
            <Route
              path="/storekeeper/inventory"
              element={
                <div className="storekeeper-layout">
                  <StoreKeeperSidebar />
                  <div className="storekeeper-content">
                    <Storekeeper />
                  </div>
                </div>
              }
            />
            <Route
              path="/storekeeper/settings"
              element={
                <div className="storekeeper-layout">
                  <StoreKeeperSidebar />
                  <div className="storekeeper-content">
                    <Settings />
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
