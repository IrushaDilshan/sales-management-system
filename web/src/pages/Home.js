import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

// Premium Visual Assets
import premiumHeroBg from '../assets/nldb_hero_premium.png';
import labResearch from '../assets/nldb_lab.png';
import logisticsImg from '../assets/nldb_logistics.png';
import qualityBadge from '../assets/nldb_quality_badge.png';
import organizationHq from '../assets/nldb_organization_hq_v2.png';
import nldbCorporateBanner from '../assets/nldb-corporate-banner.png';

const Home = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeCategory, setActiveCategory] = useState('dairy');
    const [searchQuery, setSearchQuery] = useState('');

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
            { name: 'Vanilla Ice Cream', img: 'https://www.nldb.gov.lk/images/products/vanila%20ice%20creem%20new.jpg', desc: 'Premium vanilla flavored dairy ice cream.', tag: 'Dessert' },
            { name: 'Chocolate Ice Cream', img: 'https://www.nldb.gov.lk/images/products/chocolate%20ice%20creem%20new.jpg', desc: 'Rich chocolate flavored dairy ice cream.', tag: 'Dessert' },
            { name: 'Strawberry Ice Cream', img: 'https://www.nldb.gov.lk/images/products/strawberry%20ice%20creem%20new.jpg', desc: 'Fresh strawberry flavored dairy ice cream.', tag: 'Dessert' },
            { name: 'Fruit & Nut Ice Cream', img: 'https://www.nldb.gov.lk/images/products/fruit%20and%20nut%20ice%20creem%20new.jpg', desc: 'Delicious fruit and nut loaded dairy ice cream.', tag: 'Special' },
            { name: 'Milk Toffee', img: '/nldb_products/milk_toffee.jpg', desc: 'A popular treat made with farm-fresh NLDB milk.', tag: 'Kids Choice' },
            { name: 'Goat Milk', img: '/nldb_products/goat_milk.jpg', desc: 'Nutritional alternative to cow milk with health benefits.', tag: 'Healthy' },
            { name: 'Goat Milk Yogurt', img: 'https://www.nldb.gov.lk/images/products/goat%20milk%20yoghurt%20new.jpg', desc: 'Nutritional goat milk yogurt with probiotic benefits.', tag: 'Healthy' }
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
            { name: 'Fresh Coconuts', img: '/nldb_products/coconuts.jpg', desc: 'High grade fresh coconuts from NLDB plantations.', tag: 'Fresh' },
            { name: 'Roasted Cashew', img: '/nldb_products/cashew.jpg', desc: 'Premium roasted and raw cashew nuts (Seasonal).', tag: 'Premium' },
            { name: 'Coffee', img: '/nldb_products/coffee.jpg', desc: 'Unique Sri Lankan coffee varieties from NLDB estates.', tag: 'Export' },
            { name: 'Drinking Water', img: '/nldb_products/water_bottle.jpg', desc: 'Purified and refreshing bottled drinking water.', tag: 'Pure' },
            { name: 'Silage', img: '/nldb_products/silage.jpg', desc: 'High quality silage for dairy farmer livestock feed.', tag: 'Farming' },
            { name: 'Compost', img: '/nldb_products/compost.jpg', desc: 'Organic compost manufactured at NLDB farms.', tag: 'Organic' }
        ]
    };

    const nldbOutlets = [
        { name: 'Melsiripura Sale Center', loc: 'Melsiripura', tel: '0377 294 792', type: 'Major Center' },
        { name: 'Mahaberithenna Sale Center', loc: 'Digana', tel: '0817 294 638', type: 'Farm Outlet' },
        { name: 'Rosita Sale Center', loc: 'Kotagala', tel: '0515 675 404', type: 'Upcountry' },
        { name: 'Koulwewa Sale Center', loc: 'Peragaswela, Kuliyapitiya', tel: '0377 294 112', type: 'Regional' },
        { name: 'Narangalle Sale Center', loc: 'Kithalawa', tel: '0373 157 400', type: 'North Western' },
        { name: 'Nikawaratiya Sale Center', loc: 'Nikawaratiya', tel: '0372 260 288', type: 'Regional' },
        { name: 'Siringapatha Sale Center', loc: 'Badalgama', tel: '0312 269 204', type: 'Western' },
        { name: 'Martin Sale Center', loc: 'Bangadeniya', tel: '0327 294 584', type: 'Regional' },
        { name: 'Weerawila Sale Center', loc: 'Thissamaharamaya', tel: '0473 499 997', type: 'Southern' },
        { name: 'Welisara Sale Center', loc: 'Alpitiwala, Ragama', tel: '0114 294 489', type: 'Major' },
        { name: 'Beligama Sale Center', loc: 'Beligamuwa', tel: '0773 782 136', type: 'Regional' },
        { name: 'Haragama Sale Center', loc: 'Haragama, Gurudeniya', tel: '0817 294 061', type: 'Regional' },
        { name: 'Karandagolla Sale Center', loc: 'Kundasale', tel: '081 729 42 98', type: 'Regional' },
        { name: 'Apeksha Hospital Center', loc: 'Maharagama', tel: '0114 294 489', type: 'Special' },
        { name: 'Maawaththa Farm Center', loc: 'Maawaththa', tel: '031 225 5232', type: 'Farm Outlet' }
    ];

    const filteredOutlets = nldbOutlets.filter(outlet =>
        outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        outlet.loc.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleViewMap = (outlet) => {
        const query = encodeURIComponent(`NLDB ${outlet.name} ${outlet.loc} Sri Lanka`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="home-white-modern">
            {/* Immersive Navigation */}
            <header className={`header-modern ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container-fluid nav-flex">
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
                            <li><a href="#about">About Us</a></li>
                            <li><a href="#ops">Operations</a></li>
                            <li><a href="#products">Products</a></li>
                            <li><a href="#outlets">Our Shops</a></li>
                            <li><a href="#contact">Contact Us</a></li>
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
            <section id="products" className="section-padding-fluid">
                <div className="container-fluid">
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
                                    <div className="p-card-overlay-modern">
                                        <button className="btn-quick-view">Quick View</button>
                                    </div>
                                </div>
                                <div className="p-card-info">
                                    <div className="p-card-header-flex">
                                        <span className="p-category">{activeCategory}</span>
                                        <span className="p-tag">{p.tag}</span>
                                    </div>
                                    <h3>{p.name}</h3>
                                    <p>{p.desc}</p>
                                    <div className="p-card-footer-modern">
                                        <button
                                            className="btn-outlet-modern"
                                            onClick={() => document.getElementById('outlets').scrollIntoView({ behavior: 'smooth' })}
                                        >
                                            <span>Locate Outlet</span>
                                            <i className="arrow-icon">→</i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Outlet Locator Section */}
            <section id="outlets" className="section-padding-fluid">
                <div className="container-fluid">
                    <div className="section-title-box">
                        <h2 className="headline-h2">Global <span className="text-green">Outlets</span></h2>
                        <p className="subtitle-p">Experience farm-to-table freshness at any of our official sales centers nationwide.</p>
                    </div>

                    <div className="outlet-search-box">
                        <div className="search-pill">
                            <input
                                type="text"
                                placeholder="Search your nearest city (e.g. Narahenpita, Digana...)"
                                className="outlet-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="btn-search-outlet">Find Nearest</button>
                        </div>
                    </div>

                    <div className="outlet-grid-premium">
                        {filteredOutlets.length > 0 ? (
                            filteredOutlets.map((outlet, idx) => (
                                <div key={idx} className="outlet-card-clean animate-fade">
                                    <div className="outlet-type-tag">{outlet.type}</div>
                                    <div className="outlet-icon-box">
                                        <div className="location-pin-circle">
                                            <span className="dot-pulse"></span>
                                            📍
                                        </div>
                                    </div>
                                    <div className="outlet-info-center">
                                        <h4>{outlet.name}</h4>
                                        <p className="loc-detail">{outlet.loc}</p>
                                    </div>
                                    <div className="outlet-footer-actions">
                                        <a href={`tel:${outlet.tel}`} className="btn-contact-mini">
                                            <span>📞 {outlet.tel}</span>
                                        </a>
                                        <button
                                            className="btn-directions-modern"
                                            onClick={() => handleViewMap(outlet)}
                                        >
                                            Get Directions
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <p>No outlets found matching "{searchQuery}". Please check the spelling or try a different city.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Corporate Showcase Banner */}
            <section className="corporate-banner-section">
                <div className="container-fluid">
                    <div className="banner-wrapper animate-fade">
                        <img src={nldbCorporateBanner} alt="NLDB Corporate Journey" className="full-width-banner" />
                    </div>
                </div>
            </section>

            {/* Massive Call to Action */}
            <section id="contact" className="container section-padding">
                <div className="contact-grid-modern">
                    <div className="contact-info-panel">
                        <div className="section-tag">National Headquarters</div>
                        <h2 className="headline-h2">Get in <span className="text-green">Touch.</span></h2>
                        <p className="p-large">Our team is available for corporate inquiries, farm visit requests, and official tenders.</p>

                        <div className="contact-nodes">
                            <div className="c-node">
                                <span className="c-icon">🏢</span>
                                <div>
                                    <strong>Narahenpita HQ</strong>
                                    <p>No. 40, Narahenpita Road, Colombo 05</p>
                                </div>
                            </div>
                            <div className="c-node">
                                <span className="c-icon">📞</span>
                                <div>
                                    <strong>Hotline</strong>
                                    <p>+94 11 250 1701</p>
                                </div>
                            </div>
                            <div className="c-node">
                                <span className="c-icon">✉️</span>
                                <div>
                                    <strong>Email</strong>
                                    <p>info@nldb.gov.lk</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="contact-action-panel">
                        <div className="map-embed-container animate-fade">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk"
                                width="100%"
                                height="100%"
                                style={{ border: 0, borderRadius: '32px' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="NLDB HQ Map"
                            ></iframe>
                        </div>
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
