import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Shops from './pages/Shops';
import Items from './pages/Items';
import Stock from './pages/Stock';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="content-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/items" element={<Items />} />
            <Route path="/stock" element={<Stock />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
