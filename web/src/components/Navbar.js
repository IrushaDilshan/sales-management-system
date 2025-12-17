import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">Sales System</div>
            <div className="navbar-links">
                <Link to="/" className={isActive('/')}>Dashboard</Link>
                <Link to="/users" className={isActive('/users')}>Users</Link>
                <Link to="/shops" className={isActive('/shops')}>Shops</Link>
                <Link to="/items" className={isActive('/items')}>Items</Link>
                <Link to="/stock" className={isActive('/stock')}>Stock</Link>
            </div>
        </nav>
    );
};

export default Navbar;
