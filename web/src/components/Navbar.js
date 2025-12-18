import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">NLDB Manager Dashboard</div>
            <div className="navbar-links">
                <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
                <Link to="/users" className={isActive('/users')}>Users</Link>
                <Link to="/shops" className={isActive('/shops')}>Shops</Link>
                <Link to="/routes" className={isActive('/routes')}>Routes</Link>
                <Link to="/daily-income" className={isActive('/daily-income')}>Daily Income</Link>
            </div>
        </nav>
    );
};

export default Navbar;
