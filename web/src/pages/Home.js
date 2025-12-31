import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

// Premium Visual Assets
import premiumHeroBg from '../assets/nldb_hero_premium.png';
import labResearch from '../assets/nldb_lab.png';
import logisticsImg from '../assets/nldb_logistics.png';
import qualityBadge from '../assets/nldb_quality_badge.png';
import organizationHq from '../assets/nldb_organization_hq_v2.png';

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

    const productRegistry = {
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
            {/* Immersive Navigation */}
            <header className={`header-modern ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container nav-flex">
                    <div className="branding">
                        <div className="logo-main">
                            <span className="n-accent">N</span>LDB
                        </div>
                        <div className="trilingual-titles">
                            <span className="sinhala">ජාතික පශු සම්පත් සංවර්ධන මණ්ඩලය</span>
                            <span className="english">National Livestock Development Board</span>
                            <span className="tamil">தேசிய பண்ணை விலங்கு அபிவிருத்தி சபை</span>
                        </div>
                    </div>

                    <nav className="main-nav">
                        <ul>
                            <li><a href="#about">The Authority</a></li>
                            <li><a href="#ops">Operations</a></li>
                            <li><a href="#products">Product Registry</a></li>
                            <li><Link to="/login" className="btn-portal">Command Center</Link></li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* High-Impact Hero */}
            <section className="hero-premium" style={{ backgroundImage: `url(${premiumHeroBg})` }}>
                <div className="container">
                    <div className="hero-content animate-fade">
                        <div className="hero-badge-v2">
                            <span className="dot"></span> Pioneering Sustainable Agriculture
                        </div>
                        <h1>Reshaping the National <br /><span className="text-green">Livestock Frontier.</span></h1>
                        <p>
                            Leading Sri Lanka through advanced genetic research,
                            precision engineering, and a state-of-the-art biological
                            infrastructure ensuring national food sovereignty.
                        </p>
                        <div className="hero-btns">
                            <a href="#products" className="btn-gradient">Explore Products</a>
                            <a href="#about" className="btn-glass">Corporate Overview</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust & Quality Bar */}
            <section className="qa-banner">
                <div className="container qa-grid">
                    <div className="qa-item">
                        <div className="icon">🛡️</div>
                        <div>
                            <strong>ISO Certified</strong>
                            <p>Global standards in safety</p>
                        </div>
                    </div>
                    <div className="qa-item">
                        <div className="icon">🔬</div>
                        <div>
                            <strong>Genetic Excellence</strong>
                            <p>Premium breeding protocols</p>
                        </div>
                    </div>
                    <div className="qa-item">
                        <div className="icon">♻️</div>
                        <div>
                            <strong>Eco-Focused</strong>
                            <p>Sustainable farm management</p>
                        </div>
                    </div>
                    <div className="qa-item">
                        <div className="icon">🇱🇰</div>
                        <div>
                            <strong>Nation Building</strong>
                            <p>Supporting local dairy farmers</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Authority - Corporate Mission */}
            <section id="about" className="section-padding">
                <div className="container">
                    <div className="mission-v2">
                        <div className="mission-text-side">
                            <div className="section-tag">Governing Body since 1973</div>
                            <h2 className="headline-h2">A Legacy of <span className="text-green">Integrity & Precision.</span></h2>
                            <p className="p-large">
                                As the national authority, NLDB bridges the gap between traditional
                                Sri Lankan farming and high-tech digital precision. We operate 40+
                                specialized farms focused on genetic optimization and production excellence.
                            </p>
                            <div className="stats-horizontal">
                                <div className="stat-node">
                                    <span className="sc-val">40+</span>
                                    <span className="sc-lbl">Regional Farms</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">100+</span>
                                    <span className="sc-lbl">Output Centers</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">5K+</span>
                                    <span className="sc-lbl">Technical Staff</span>
                                </div>
                            </div>
                        </div>
                        <div className="mission-visual-side">
                            <img src={organizationHq} alt="NLDB HQ" />
                            <img src={qualityBadge} alt="Quality Seal" className="badge-float" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Strategic Operations - The Future of Farming */}
            <section id="ops" className="section-padding bg-light-surface">
                <div className="container">
                    <div className="section-title-box">
                        <h2 className="headline-h2">Strategic <span className="text-green">Operations</span></h2>
                        <p className="subtitle-p">Our biological and logistical infrastructure powers the nation's supply chain.</p>
                    </div>

                    <div className="ops-grid">
                        <div className="ops-card">
                            <img src={labResearch} alt="Genetic Research" />
                            <div className="ops-overlay">
                                <h3>Bio-Genetic Research</h3>
                                <p>Optimizing high-yield breeds through advanced laboratory protocols and selective breeding.</p>
                            </div>
                        </div>
                        <div className="ops-card">
                            <img src={logisticsImg} alt="Logistics" />
                            <div className="ops-overlay">
                                <h3>Digital Logistics</h3>
                                <p>Cold-chain precision ensuring farm-to-door freshness within 24 hours nationwide.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Registry - The High-Performance Grid */}
            <section id="products" className="section-padding">
                <div className="container">
                    <div className="section-title-box">
                        <h2 className="headline-h2">The Product <span className="text-green">Registry</span></h2>
                        <p className="subtitle-p">A definitive collection of NLDB's premium output, refined for excellence.</p>
                    </div>

                    <div className="text-center">
                        <div className="category-tabs">
                            {[
                                { id: 'dairy', label: 'Milk & Dairy', icon: '🥛' },
                                { id: 'meat', label: 'Poultry & Meat', icon: '🥩' },
                                { id: 'agro', label: 'Agro Products', icon: '🥥' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                                >
                                    <span style={{ marginRight: '8px' }}>{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="product-showcase-grid">
                        {productRegistry[activeCategory].map((p, i) => (
                            <div key={i} className="product-card-premium animate-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="p-card-img">
                                    <img src={p.img} alt={p.name} />
                                    <div className="p-card-availability">
                                        <span className="dot-live"></span> Available in Outlets
                                    </div>
                                </div>
                                <div className="p-card-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="p-category">{activeCategory}</span>
                                        <span className="p-tag">{p.tag}</span>
                                    </div>
                                    <h3>{p.name}</h3>
                                    <p>{p.desc}</p>
                                    <div className="p-card-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}>
                                        <button className="btn-outlet">View Outlets</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Massive Call to Action */}
            <section className="container">
                <div className="cta-banner animate-fade">
                    <h2>Join the <span className="text-green">Movement.</span></h2>
                    <p>Securing the nutritional future of Sri Lanka through innovation, quality, and commitment.</p>
                    <div className="hero-btns" style={{ justifyContent: 'center' }}>
                        <Link to="/login" className="btn-gradient">Staff Access</Link>
                        <a href="#about" className="btn-glass">Contact HQ</a>
                    </div>
                </div>
            </section>

            {/* Official Footer v2 */}
            <footer className="footer-modern-v2">
                <div className="container">
                    <div className="footer-top-grid">
                        <div className="footer-brand">
                            <h2>NLDB</h2>
                            <p>The National Livestock Development Board of Sri Lanka. Empowering the nation since 1973.</p>
                        </div>
                        <div className="footer-links">
                            <h4>The Registry</h4>
                            <a href="#products">Dairy Catalog</a>
                            <a href="#products">Meat Catalog</a>
                            <a href="#ops">Agro Exports</a>
                        </div>
                        <div className="footer-links">
                            <h4>Corporate</h4>
                            <a href="#about">Our Mission</a>
                            <a href="#ops">Operations</a>
                            <a href="#">Official Tenders</a>
                            <a href="#">Annual Reports</a>
                        </div>
                        <div className="footer-links">
                            <h4>Portal</h4>
                            <Link to="/login">Employee Login</Link>
                            <Link to="/login">Manager Access</Link>
                            <Link to="/login">Storekeeping</Link>
                        </div>
                    </div>
                    <div className="footer-bottom-clean flex-sb" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span>© 2025 National Livestock Development Board. All Rights Reserved.</span>
                        <div className="social-links-minimal">
                            <span>FACEBOOK</span> • <span>INSTAGRAM</span> • <span>LINKEDIN</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
