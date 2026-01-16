import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../shared/supabaseClient';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Get user role from users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', data.user.id);

            if (userError) {
                console.error('User fetch error:', userError);
                throw new Error('Failed to fetch user data. Please contact administrator.');
            }

            if (!userData || userData.length === 0) {
                console.error('MISMATCH DEBUG:');
                console.error('Auth User ID (from login):', data.user.id);
                console.error('Email used:', email);
                throw new Error(`User not found in database. Auth ID: ${data.user.id}`);
            }

            const user = userData[0]; // Get first user

            // Route based on role
            switch (user.role) {
                case 'admin':
                    navigate('/dashboard');
                    break;
                case 'storekeeper':
                    navigate('/storekeeper/dashboard');
                    break;
                case 'ma':
                    navigate('/sales-dashboard');
                    break;
                case 'rep':
                case 'salesman':
                    // Web dashboard is for admin and storekeeper only
                    setError('Web dashboard access is restricted to administrators and storekeepers. Please use the mobile app.');
                    await supabase.auth.signOut();
                    break;
                default:
                    setError('Unknown user role. Please contact administrator.');
                    await supabase.auth.signOut();
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Side - Branding */}
            <div className="login-brand">
                <div className="brand-content">
                    <div className="logo-circle">
                        <span className="logo-icon">🐄</span>
                    </div>
                    <h1 className="brand-title">National LiveStock Development Board</h1>
                    <p className="brand-subtitle">Sales & Inventory Management System</p>
                    <div className="brand-features">
                        <div className="feature-item">
                            <span className="feature-icon">✓</span>
                            <span>Inventory Management</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">✓</span>
                            <span>Sales Tracking</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">✓</span>
                            <span>Route Management</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">✓</span>
                            <span>Real-time Reports</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="login-form-side">
                <div className="login-form-container">
                    <div className="login-header">
                        <h2>Welcome Back</h2>
                        <p>Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div className="error-alert">
                            <span className="error-icon">⚠</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="your.email@nldb.gov"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p className="help-text">
                            Need help? Contact your system administrator
                        </p>
                        <p className="copyright">
                            © 2025 National LiveStock Development Board
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
