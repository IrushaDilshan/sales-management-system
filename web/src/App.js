import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import StoreKeeperSidebar from './components/StoreKeeperSidebar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Shops from './pages/Shops';
import Items from './pages/Items';
import Stock from './pages/Stock';
import Storekeeper from './pages/Storekeeper';
import DailyIncome from './pages/DailyIncome';
import RoutesPage from './pages/Routes';
import StoreKeeperDashboard from './pages/StoreKeeperDashboard';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Login Route (No Navbar) */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Manager Dashboard Routes (With Sidebar) */}
          <Route path="/dashboard" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <Dashboard />
              </div>
            </div>
          } />

          <Route path="/users" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <Users />
              </div>
            </div>
          } />

          <Route path="/shops" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <Shops />
              </div>
            </div>
          } />

          <Route path="/routes" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <RoutesPage />
              </div>
            </div>
          } />

          <Route path="/daily-income" element={
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <DailyIncome />
              </div>
            </div>
          } />

          {/* Storekeeper Routes (With Storekeeper Sidebar) */}
          <Route path="/storekeeper/dashboard" element={<StoreKeeperDashboard />} />

          <Route path="/storekeeper/items" element={
            <div className="storekeeper-layout">
              <StoreKeeperSidebar />
              <div className="storekeeper-content">
                <Items />
              </div>
            </div>
          } />

          <Route path="/storekeeper/stock" element={
            <div className="storekeeper-layout">
              <StoreKeeperSidebar />
              <div className="storekeeper-content">
                <Stock />
              </div>
            </div>
          } />

          <Route path="/storekeeper/inventory" element={
            <div className="storekeeper-layout">
              <StoreKeeperSidebar />
              <div className="storekeeper-content">
                <Storekeeper />
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
