import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

// Tech and Corporate assets
import techFarming from '../assets/modern_tech_farming.png';
import organizationHq from '../assets/nldb_organization_hq.png';

const Home = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeCategory, setActiveCategory] = useState('dairy');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const categories = {
        dairy: [
            { name: 'Fresh Milk', img: '/nldb_products/fresh_milk.jpg', desc: 'High-quality fresh milk processed under strict hygiene.', tag: 'Pure' },
            { name: 'Buffalo Curd', img: '/nldb_products/curd.jpg', desc: 'Rich, creamy texture traditional Buffalo curd.', tag: 'Organic' },
            { name: 'Set Yogurt', img: '/nldb_products/set_yogurt.jpg', desc: 'Premium quality yogurt with high nutritional value.', tag: 'Daily' },
            { name: 'Pure Ghee', img: '/nldb_products/ghee.jpg', desc: 'Traditionally prepared ghee with a rich aroma.', tag: 'Premium' },
            { name: 'Drinking Yogurt', img: '/nldb_products/drinking_yogurt.jpg', desc: 'Healthy and refreshing flavored yogurt drinks.', tag: 'Popular' },
            { name: 'Table Butter', img: '/nldb_products/butter.jpg', desc: 'High-quality dairy butter made from fresh cream.', tag: 'Essential' },
            { name: 'Ice Cream', img: '/nldb_products/ice_cream.jpg', desc: 'Delicious range of flavors including Vanilla & Chocolate.', tag: 'Sweet' },
            { name: 'Milk Toffee', img: '/nldb_products/milk_toffee.jpg', desc: 'A popular treat made with farm-fresh NLDB milk.', tag: 'Kids Choice' },
            { name: 'Goat Milk', img: '/nldb_products/goat_milk.jpg', desc: 'Nutritional alternative to cow milk with health benefits.', tag: 'Healthy' }
        ],
        meat: [
            { name: 'Boiler Chicken', img: '/nldb_products/boiler_chicken.jpg', desc: 'Fresh chicken processed under high quality standards.', tag: 'High Protein' },
            { name: 'Chicken Family Pack', img: '/nldb_products/chicken_family_pack.jpg', desc: 'Economical family pack of fresh chicken.', tag: 'Family Choice' },
            { name: 'Curry Pork', img: '/nldb_products/curry_pork.jpg', desc: 'Quality pork cuts suitable for traditional curry.', tag: 'Tasty' },
            { name: 'Pork Chops', img: '/nldb_products/pork_chops.jpg', desc: 'Premium pork chops sourced from well-managed farms.', tag: 'Premium' },
            { name: 'Pork Loin', img: '/nldb_products/pork_loin.jpg', desc: 'High-quality pork loin processed with hygiene.', tag: 'Lean' },
            { name: 'Leg Pork', img: '/nldb_products/leg_pork.jpg', desc: 'Fresh leg pork cuts for standard preparations.', tag: 'Standard' },
            { name: 'Farm Eggs', img: '/nldb_products/eggs.jpg', desc: 'Fresh farm eggs produced at NLDB poultry centers.', tag: 'Fresh Pick' },
            { name: 'Mutton', img: '/nldb_products/mutton.jpg', desc: 'Fresh mutton products available from NLDB centers.', tag: 'Gourmet' }
        ],
        agro: [
            { name: 'Coconut Oil', img: '/nldb_products/coconut_oil.jpg', desc: 'Pure edible oil made from high-quality coconuts.', tag: 'Health' },
            { name: 'Water Bottle', img: '/nldb_products/water_bottle.jpg', desc: 'Purified and refreshing bottled drinking water.', tag: 'Pure' }
        ]
    };

    return (
        <div className="home-white-modern">
            {/* Premium Header */}
            <header className={`header-modern ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container nav-flex">
                    <div className="branding">
                        <div className="logo-main">
                            <span className="n-accent">N</span>LDB
                        </div>
                        <div className="trilingual-titles">
                            <span>ජාතික පශු සම්පත් මණ්ඩලය</span>
                            <span>National Livestock Development Board</span>
                        </div>
                    </div>

                    <nav className="main-nav">
                        <ul>
                            <li><a href="#about">Organization</a></li>
                            <li><a href="#solutions">Solutions</a></li>
                            <li><a href="#products">Products</a></li>
                            <li><Link to="/login" className="btn-portal">Staff Portal</Link></li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* Immersive Hero - Light Version */}
            <section className="hero-light">
                <div className="container hero-grid">
                    <div className="hero-text-side">
                        <div className="hero-badge">Digital Agriculture Excellence</div>
                        <h1>The New Era of <span className="text-green">Livestock Technology.</span></h1>
                        <p>
                            Empowering Sri Lanka through advanced genetic research,
                            real-time data analytics, and a state-of-the-art national dairy supply chain.
                        </p>
                        <div className="hero-action-buttons">
                            <a href="#about" className="btn-primary">Explore NLDB</a>
                            <Link to="/login" className="btn-secondary">Management Login</Link>
                        </div>
                    </div>
                    <div className="hero-visual-side">
                        <div className="visual-wrapper">
                            <img src={techFarming} alt="Future Farming" className="hero-img-main" />
                            <div className="floating-card c1">
                                <span className="icon">📊</span>
                                <div>
                                    <strong>40+</strong>
                                    <p>Smart Farms</p>
                                </div>
                            </div>
                            <div className="floating-card c2">
                                <span className="icon">🐄</span>
                                <div>
                                    <strong>Live</strong>
                                    <p>IoT Tracking</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Organization / Mission - Clean White */}
            <section id="about" className="section-padding bg-white">
                <div className="container">
                    <div className="about-modern-grid">
                        <div className="about-img-box">
                            <img src={organizationHq} alt="NLDB HQ" />
                        </div>
                        <div className="about-info-box">
                            <div className="section-tag">Established 1973</div>
                            <h2 className="headline-h2">Leading through <span className="text-green">Innovation & Integrity.</span></h2>
                            <p className="p-large">
                                As the national authority in livestock development, we bridge the gap between
                                traditional farming and digital precision to ensure national food security.
                            </p>
                            <div className="stats-horizontal">
                                <div className="stat-node">
                                    <span className="sc-val">50+</span>
                                    <span className="sc-lbl">Years of Excellence</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">100+</span>
                                    <span className="sc-lbl">Retail Outlets</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">5k+</span>
                                    <span className="sc-lbl">Industry Staff</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Section with Tabs */}
            <section id="products" className="section-padding bg-light-surface">
                <div className="container">
                    <div className="text-center mb-50">
                        <h2 className="headline-h2">Our <span className="text-green">Premium Registry</span></h2>
                        <p className="subtitle-p">Direct from our farms to your doorstep, powered by technology.</p>

                        {/* Category Tabs */}
                        <div className="category-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                            {['dairy', 'meat', 'agro'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        borderRadius: '30px',
                                        border: 'none',
                                        background: activeCategory === cat ? '#2ecc71' : 'white',
                                        color: activeCategory === cat ? 'white' : '#7f8c8d',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                        transition: '0.3s',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    {cat === 'dairy' ? '🥛 Dairy' : cat === 'meat' ? '🥩 Meat' : '🥥 Agro'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Product Grid */}
                    <div className="product-showcase-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '2rem'
                    }}>
                        {categories[activeCategory].map((p, i) => (
                            <div key={i} className="product-card-premium" style={{
                                animation: 'fadeIn 0.5s ease-out forwards',
                                animationDelay: `${i * 0.1}s`
                            }}>
                                <div className="p-card-img" style={{ height: '240px', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div className="p-card-info" style={{ padding: '1.5rem' }}>
                                    <span className="p-category" style={{ fontSize: '0.7rem', fontWeight: '800', color: '#2ecc71', textTransform: 'uppercase' }}>{activeCategory}</span>
                                    <h3 style={{ margin: '0.5rem 0', fontSize: '1.25rem' }}>{p.name}</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#636e72', lineHeight: '1.5', minHeight: '3rem' }}>{p.desc}</p>
                                    <div className="p-card-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="p-tag" style={{ background: '#e8f8f0', color: '#27ae60', padding: '4px 12px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: '700' }}>{p.tag}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer - Minimalist Modern */}
            <footer className="footer-clean">
                <div className="container footer-top">
                    <div className="footer-brand-side">
                        <div className="logo-main small">NLDB</div>
                        <p>National Livestock Development Board</p>
                        <p className="address">No.40 , Nawala road , Narahenpita , Colombo 05</p>
                    </div>
                    <div className="footer-nav-side">
                        <div className="f-nav-col">
                            <h4>Explore</h4>
                            <a href="#about">About Us</a>
                            <a href="#solutions">Technology</a>
                            <a href="#products">Products</a>
                        </div>
                        <div className="f-nav-col">
                            <h4>Support</h4>
                            <a href="#products">Tenders</a>
                            <a href="#products">Vacancies</a>
                            <Link to="/login">Employee Access</Link>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom-clean">
                    <div className="container flex-sb">
                        <span>© 2025 NLDB Sri Lanka. Progress through technology.</span>
                        <div className="social-links-minimal">
                            <span>FB</span> • <span>IN</span> • <span>YT</span>
                        </div>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tab-btn:hover {
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
                    transform: translateY(-2px);
                }
                .product-card-premium {
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    transition: 0.3s;
                }
                .product-card-premium:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
};

export default Home;
