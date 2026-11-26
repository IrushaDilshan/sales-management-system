import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    LuX,
    LuMapPin,
    LuPackage,
    LuSnowflake,
    LuCircleCheck,
    LuArrowRight,
    LuTag
} from 'react-icons/lu';
import { supabase } from '../shared/supabaseClient';
import { HOME_TRANSLATIONS, translateCategoryName } from '../shared/homeTranslations';
import NLDBProductShowcase from '../components/NLDBProductShowcase';
import './Home.css';

// Premium Visual Assets
import premiumHeroBg from '../assets/nldb_hero_premium.png';
import qualityBadge from '../assets/nldb_quality_badge.png';
import organizationHq from '../assets/nldb_organization_hq_v2.png';
import nldbCorporateBanner from '../assets/nldb-corporate-banner.png';
import naturalHeroBg from '../assets/nldb_hero_bg.png';

// Product Assets (Restored)
import imgFreshMilk from '../assets/nldb_products/fresh_milk.jpg';
import imgCurd from '../assets/nldb_products/curd.jpg';
import imgYogurt from '../assets/nldb_products/set_yogurt.jpg';
import imgGhee from '../assets/nldb_products/ghee.jpg';
import imgDrinkingYogurt from '../assets/nldb_products/drinking_yogurt.jpg';
import imgEggs from '../assets/nldb_products/eggs.jpg';
import imgChicken from '../assets/nldb_products/boiler_chicken.jpg';
import imgCoconutOil from '../assets/nldb_products/coconut_oil.jpg';

const Home = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null); // Will set to first fetched category
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [dbProducts, setDbProducts] = useState([]);
    const [categories, setCategories] = useState([]); // Dynamic Categories
    const [loading, setLoading] = useState(true);
    const [landingSettings, setLandingSettings] = useState(null);
    const [publicOutlets, setPublicOutlets] = useState([]);
    const [lang, setLang] = useState(() => localStorage.getItem('nldb_lang') || 'en');

    const [searchQuery, setSearchQuery] = useState('');
    const [outletTypeFilter, setOutletTypeFilter] = useState('ALL');

    const handleChangeLang = (nextLang) => {
        setLang(nextLang);
        localStorage.setItem('nldb_lang', nextLang);
    };

    const t = HOME_TRANSLATIONS[lang] || HOME_TRANSLATIONS.en;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        fetchProducts();
        fetchLandingContent();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchLandingContent = async () => {
        try {
            const [settingsRes, outletsRes, shopsRes] = await Promise.all([
                supabase.from('landing_settings').select('*').eq('id', 1).maybeSingle(),
                supabase.from('public_outlets').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
                supabase.from('shops').select('id, name, outlet_type, location, phone, routes(name)').order('name')
            ]);
            if (settingsRes.data) setLandingSettings(settingsRes.data);

            const baseOutlets = outletsRes.data && outletsRes.data.length > 0 ? outletsRes.data : nldbOutlets;
            const registeredShops = (shopsRes.data || []).map((s) => ({
                name: s.name,
                loc: s.location || s.routes?.name || 'Sri Lanka',
                tel: s.phone || '+94 11 250 1701',
                type: s.outlet_type || 'Farm Shop',
            }));

            // Merge registered shops (Retail Outlets) first, then public_outlets without duplicates
            const seen = new Set(registeredShops.map((r) => r.name.trim().toLowerCase()));
            const merged = [
                ...registeredShops,
                ...baseOutlets.filter((o) => !seen.has((o.name || '').trim().toLowerCase())),
            ];
            setPublicOutlets(merged);
        } catch (err) {
            // Silently fallback to bundled defaults
        }
    };

    const fetchProducts = async () => {
        try {
            // 1. Fetch Categories first
            const { data: catData, error: catError } = await supabase
                .from('product_categories')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (catError) throw catError;

            setCategories(catData || []);
            if (catData && catData.length > 0) {
                // Default to the first category if not already set
                setActiveCategory(prev => prev || catData[0].id);
            }

            // 2. Fetch Items
            const { data, error } = await supabase
                .from('items')
                .select(`
                    *,
                    product_categories (
                        id,
                        name
                    )
                `)
                .order('name');

            if (error) throw error;
            setDbProducts(data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get products for the CURRENT active category
    const getActiveCategoryProducts = () => {
        // 1. Identify which Category is active
        const effectiveCategoryList = categories.length > 0 ? categories : DEMO_CATEGORIES;
        const currentCategoryObj = effectiveCategoryList.find(c => c.id == activeCategory)
            || effectiveCategoryList[0];

        if (!currentCategoryObj) return [];

        // 2. Define a matcher function that works for both DB and Demo items
        const filterItems = (items, isDemo) => {
            return items.filter(p => {
                // A. Direct ID Match (Standard)
                if (p.category_id == currentCategoryObj.id) return true;

                // B. Keyword/Demo Match
                if (isDemo) {
                    const cName = currentCategoryObj.name.toLowerCase();
                    if (cName.includes('milk') || cName.includes('dairy')) return p.category_id === 101;
                    if (cName.includes('meat') || cName.includes('poultry')) return p.category_id === 102;
                    if (cName.includes('agro') || cName.includes('coconut')) return p.category_id === 103;
                }
                return false;
            }).map(p => ({
                name: p.name,
                img: p.image_url || 'https://via.placeholder.com/300?text=No+Image',
                desc: p.description || 'Premium NLDB Farm Product',
                tag: p.is_perishable ? 'Fresh' : 'Standard',
                isPerishable: Boolean(p.is_perishable),
                price: p.retail_price,
                retailPrice: p.retail_price != null ? Number(p.retail_price) : null,
                wholesalePrice: p.wholesale_price != null ? Number(p.wholesale_price) : null,
                unit: p.unit_of_measure || 'unit',
                sku: p.sku || '',
                stockQty: p.quantity ?? null,
                categoryName: currentCategoryObj.name
            }));
        };

        // 3. Try obtaining results from Real DB first
        let results = [];
        if (dbProducts.length > 0) {
            results = filterItems(dbProducts, false);
        }

        // 4. Fallback: If DB yields NO items for this category, show Demo items
        // This ensures tabs are never empty, effectively "filling in the gaps"
        if (results.length === 0) {
            results = filterItems(DEMO_PRODUCTS, true);
        }

        return results;
    };

    // Fallback Demo Data (Visual Protection)
    const DEMO_CATEGORIES = [
        { id: 101, name: 'Milk & Dairy' },
        { id: 102, name: 'Poultry & Meat' },
        { id: 103, name: 'Agro Products' }
    ];

    const DEMO_PRODUCTS = [
        { id: 1, name: 'Fresh Milk', description: 'High-quality fresh milk processed under strict hygiene.', category_id: 101, retail_price: 280.00, wholesale_price: 245.00, unit_of_measure: 'bottle', is_perishable: true, image_url: imgFreshMilk },
        { id: 2, name: 'Buffalo Curd', description: 'Rich, creamy texture traditional Buffalo curd.', category_id: 101, retail_price: 450.00, wholesale_price: 390.00, unit_of_measure: 'pot', is_perishable: true, image_url: imgCurd },
        { id: 3, name: 'Set Yogurt', description: 'Premium quality yogurt with high nutritional value.', category_id: 101, retail_price: 80.00, wholesale_price: 68.00, unit_of_measure: 'cup', is_perishable: true, image_url: imgYogurt },
        { id: 4, name: 'Pure Ghee', description: 'Traditionally prepared ghee with a rich aroma.', category_id: 101, retail_price: 1500.00, wholesale_price: 1320.00, unit_of_measure: 'bottle', is_perishable: false, image_url: imgGhee },
        { id: 5, name: 'Drinking Yogurt', description: 'Healthy and refreshing flavored yogurt drinks.', category_id: 101, retail_price: 120.00, wholesale_price: 102.00, unit_of_measure: 'bottle', is_perishable: true, image_url: imgDrinkingYogurt },
        { id: 6, name: 'Farm Fresh Eggs', description: 'Nutrient-rich brown eggs from NLDB farms.', category_id: 102, retail_price: 45.00, wholesale_price: 39.00, unit_of_measure: 'piece', is_perishable: true, image_url: imgEggs },
        { id: 7, name: 'Broiler Chicken', description: 'Hygienically processed, hormone-free chicken.', category_id: 102, retail_price: 1250.00, wholesale_price: 1100.00, unit_of_measure: 'kg', is_perishable: true, image_url: imgChicken },
        { id: 8, name: 'Coconut Oil', description: '100% pure white coconut oil.', category_id: 103, retail_price: 650.00, wholesale_price: 575.00, unit_of_measure: 'bottle', is_perishable: false, image_url: imgCoconutOil },
    ];

    const nldbOutlets = [
        { name: 'Melsiripura Sale Center', loc: 'Melsiripura', tel: '0377 294 792', type: 'Farm Shop' },
        { name: 'Mahaberithenna Sale Center', loc: 'Digana', tel: '0817 294 638', type: 'Farm Shop' },
        { name: 'Rosita Sale Center', loc: 'Kotagala', tel: '0515 675 404', type: 'Farm Shop' },
        { name: 'Koulwewa Sale Center', loc: 'Peragaswela, Kuliyapitiya', tel: '0377 294 112', type: 'Farm Shop' },
        { name: 'Narangalle Sale Center', loc: 'Kithalawa', tel: '0373 157 400', type: 'Farm Shop' },
        { name: 'Nikawaratiya Sale Center', loc: 'Nikawaratiya', tel: '0372 260 288', type: 'Farm Shop' },
        { name: 'Siringapatha Sale Center', loc: 'Badalgama', tel: '0312 269 204', type: 'Farm Shop' },
        { name: 'Martin Sale Center', loc: 'Bangadeniya', tel: '0327 294 584', type: 'Farm Shop' },
        { name: 'Weerawila Sale Center', loc: 'Thissamaharamaya', tel: '0473 499 997', type: 'Farm Shop' },
        { name: 'Welisara Sale Center', loc: 'Alpitiwala, Ragama', tel: '0114 294 489', type: 'Farm Shop' },
        { name: 'Beligama Sale Center', loc: 'Beligamuwa', tel: '0773 782 136', type: 'Farm Shop' },
        { name: 'Haragama Sale Center', loc: 'Haragama, Gurudeniya', tel: '0817 294 061', type: 'Farm Shop' },
        { name: 'Karandagolla Sale Center', loc: 'Kundasale', tel: '081 729 42 98', type: 'Farm Shop' },
        { name: 'Apeksha Hospital Center', loc: 'Maharagama', tel: '0114 294 489', type: 'Milk Shop' },
        { name: 'Maawaththa Farm Center', loc: 'Maawaththa', tel: '031 225 5232', type: 'Farm Shop' }
    ];

    const activeOutlets = publicOutlets.length > 0 ? publicOutlets : nldbOutlets;

    const filteredOutlets = activeOutlets.filter(outlet => {
        const matchesSearch =
            outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (outlet.loc || '').toLowerCase().includes(searchQuery.toLowerCase());
        const tLower = (outlet.type || '').toLowerCase();
        const matchesType =
            outletTypeFilter === 'ALL' ||
            (outletTypeFilter === 'Milk Shop' && tLower.includes('milk')) ||
            (outletTypeFilter === 'Farm Shop' && !tLower.includes('milk'));
        return matchesSearch && matchesType;
    });

    const handleViewMap = (outlet) => {
        const query = encodeURIComponent(`NLDB ${outlet.name} ${outlet.loc} Sri Lanka`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="home-white-modern">
            {/* Modern Product Quick View Modal */}
            {selectedProduct && (
                <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
                    <div className="modal-content modal-content-modern" onClick={e => e.stopPropagation()}>
                        <button
                            className="modal-close modal-close-modern"
                            onClick={() => setSelectedProduct(null)}
                            aria-label="Close modal"
                        >
                            <LuX size={18} />
                        </button>
                        <div className="modal-grid">
                            <div className="modal-img-col modal-img-col-modern">
                                <div className="modal-img-badges">
                                    <span className={`modal-status-pill ${selectedProduct.isPerishable ? 'fresh' : 'standard'}`}>
                                        {selectedProduct.isPerishable ? <LuSnowflake size={12} /> : <LuCircleCheck size={12} />}
                                        {selectedProduct.isPerishable ? t.products.coldChainFresh : t.products.standardStock}
                                    </span>
                                </div>
                                <div className="modal-img-frame">
                                    <img src={selectedProduct.img} alt={selectedProduct.name} />
                                </div>
                            </div>
                            <div className="modal-info-col modal-info-col-modern">
                                <div className="modal-header-modern">
                                    <span className="modal-cat-pill">{translateCategoryName(selectedProduct.categoryName, lang)}</span>
                                    {selectedProduct.sku && (
                                        <span className="modal-sku-pill">
                                            <LuTag size={11} /> {selectedProduct.sku}
                                        </span>
                                    )}
                                </div>

                                <h2 className="modal-title-modern">{selectedProduct.name}</h2>
                                <p className="modal-desc-modern">{selectedProduct.desc}</p>

                                {/* Retail & Wholesale Pricing Cards */}
                                <div className="modal-pricing-grid">
                                    <div className="price-tier-card retail">
                                        <div className="tier-header">
                                            <span className="tier-label">{t.products.retailPrice}</span>
                                            <span className="tier-badge">{t.products.direct}</span>
                                        </div>
                                        <div className="tier-value">
                                            Rs. {selectedProduct.retailPrice != null ? selectedProduct.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                                        </div>
                                        <div className="tier-unit">{t.products.per} {selectedProduct.unit}</div>
                                    </div>

                                    <div className="price-tier-card wholesale">
                                        <div className="tier-header">
                                            <span className="tier-label">{t.products.wholesalePrice}</span>
                                            <span className="tier-badge">{t.products.bulk}</span>
                                        </div>
                                        <div className="tier-value">
                                            Rs. {selectedProduct.wholesalePrice != null ? selectedProduct.wholesalePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                                        </div>
                                        <div className="tier-unit">{t.products.per} {selectedProduct.unit}</div>
                                    </div>
                                </div>

                                <div className="modal-meta-row">
                                    <div className="meta-chip">
                                        <LuMapPin size={14} />
                                        <span>{t.products.origin}: <strong>{t.products.nldbFarms}</strong></span>
                                    </div>
                                    <div className="meta-chip">
                                        <LuPackage size={14} />
                                        <span>{t.products.unit}: <strong style={{ textTransform: 'capitalize' }}>{selectedProduct.unit}</strong></span>
                                    </div>
                                </div>

                                <div className="modal-actions-modern">
                                    <button
                                        className="btn-locate-modern"
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            document.getElementById('outlets').scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        <LuMapPin size={16} />
                                        <span>{t.products.locateInStore}</span>
                                        <LuArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Immersive Navigation */}
            <header className={`header-modern ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container-fluid nav-flex">
                    <div className="branding">
                        <div className="logo-main">
                            <span className="n-accent">NLDB</span>Sales
                        </div>
                        <div className="trilingual-titles">
                            <span className="sinhala">ජාතික පශු සම්පත් සංවර්ධන මණ්ඩලය</span>
                            <span className="english">National Livestock Development Board</span>
                            <span className="tamil">தேசிய பண்ணை விலங்கு அபிவிருத்தி සபை</span>
                        </div>
                    </div>

                    <button 
                        className={`mobile-nav-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle navigation menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <nav className={`main-nav ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
                        <ul>
                            <li><a href="#about" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.about}</a></li>
                            <li><a href="#products" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.products}</a></li>
                            <li><a href="#outlets" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.shops}</a></li>
                            <li><a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.contact}</a></li>
                            <li>
                                <div className="lang-switcher-pill" role="group" aria-label="Language switcher">
                                    {[
                                        { code: 'en', label: 'EN' },
                                        { code: 'si', label: 'සිං' },
                                        { code: 'ta', label: 'தமி' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.code}
                                            type="button"
                                            onClick={() => handleChangeLang(opt.code)}
                                            className={`lang-btn ${lang === opt.code ? 'active' : ''}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* High-Impact Hero */}
            <section className="hero-premium" style={{ backgroundImage: `url(${landingSettings?.hero_bg_url || premiumHeroBg})` }}>
                <div className="container">
                    <div className="hero-content animate-fade">
                        <div className="hero-badge-v2">
                            <span className="dot"></span> {lang === 'en' ? (landingSettings?.hero_badge || t.hero.badge) : t.hero.badge}
                        </div>
                        <h1>{t.hero.title1} <br /><span className="text-green">{t.hero.title2}</span></h1>
                        <p>
                            {lang === 'en' ? (landingSettings?.hero_subtitle || t.hero.subtitle) : t.hero.subtitle}
                        </p>
                        <div className="hero-btns">
                            <a href="#products" className="btn-gradient">{t.hero.exploreBtn}</a>
                            <a href="#about" className="btn-glass">{t.hero.overviewBtn}</a>
                        </div>
                    </div>
                </div>
            </section>



            {/* The Authority - Corporate Mission */}
            <section id="about" className="section-padding">
                <div className="container">
                    <div className="mission-v2">
                        <div className="mission-text-side">
                            <div className="section-tag">{t.about.tag}</div>
                            <h2 className="headline-h2">{t.about.title1} <span className="text-green">{t.about.title2}</span></h2>
                            <p className="p-large">
                                {lang === 'en' ? (landingSettings?.about_description || t.about.desc) : t.about.desc}
                            </p>
                            <div className="stats-horizontal">
                                <div className="stat-node">
                                    <span className="sc-val">40+</span>
                                    <span className="sc-lbl">{t.about.statFarms}</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">100+</span>
                                    <span className="sc-lbl">{t.about.statCenters}</span>
                                </div>
                                <div className="stat-node">
                                    <span className="sc-val">5K+</span>
                                    <span className="sc-lbl">{t.about.statStaff}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mission-visual-side">
                            <img src={landingSettings?.hq_image_url || organizationHq} alt="NLDB HQ" />
                            <img src={landingSettings?.quality_badge_url || qualityBadge} alt="Quality Seal" className="badge-float" />
                        </div>
                    </div>
                </div>
            </section>



            {/* Premium Product Showcase Component */}
            <NLDBProductShowcase />

            {/* Product Registry - The High-Performance Grid */}
            <section id="products" className="section-padding-fluid">
                <div className="container-fluid">
                    <div className="section-title-box">
                        <h2 className="headline-h2">{t.products.title1} <span className="text-green">{t.products.title2}</span></h2>
                        <p className="subtitle-p">{t.products.subtitle}</p>
                    </div>

                    <div className="text-center">
                        <div className="category-tabs">
                            {(categories.length > 0 ? categories : DEMO_CATEGORIES).map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`tab-btn ${activeCategory === cat.id || (!activeCategory && cat.id === (categories.length > 0 ? categories[0].id : DEMO_CATEGORIES[0].id)) ? 'active' : ''}`}
                                >
                                    {/* Simple Icon Mapping based on name keywords, or default star */}
                                    <span style={{ marginRight: '8px' }}>
                                        {cat.name.toLowerCase().includes('milk') || cat.name.toLowerCase().includes('dairy') ? '🥛' :
                                            cat.name.toLowerCase().includes('meat') || cat.name.toLowerCase().includes('poultry') ? '🥩' :
                                                cat.name.toLowerCase().includes('agro') || cat.name.toLowerCase().includes('coconut') ? '🥥' :
                                                    '📦'}
                                    </span>
                                    {translateCategoryName(cat.name, lang)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="product-showcase-grid">
                        {getActiveCategoryProducts().length > 0 ? (
                            getActiveCategoryProducts().map((p, i) => (
                                <div key={i} className="product-card-premium animate-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="p-card-img">
                                        <img src={p.img} alt={p.name} />
                                        <div className="p-card-availability">
                                            <span className="dot-live"></span> {t.products.available}
                                        </div>
                                        <div className="p-card-overlay-modern">
                                            <button className="btn-quick-view" onClick={() => setSelectedProduct(p)}>{t.products.quickView}</button>
                                        </div>
                                    </div>
                                    <div className="p-card-info">
                                        <div className="p-card-header-flex">
                                            <span className="p-category">{translateCategoryName(p.categoryName, lang)}</span>
                                            <span className="p-tag">{p.isPerishable ? t.products.fresh : t.products.standard}</span>
                                        </div>
                                        <h3>{p.name}</h3>
                                        <p>{p.desc}</p>

                                        <div className="p-card-pricing-strip">
                                            <div className="p-price-col">
                                                <span className="p-price-label">{t.products.retail}</span>
                                                <span className="p-price-amount retail">
                                                    Rs. {p.retailPrice != null ? p.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                </span>
                                            </div>
                                            <div className="p-price-divider" />
                                            <div className="p-price-col">
                                                <span className="p-price-label">{t.products.wholesale}</span>
                                                <span className="p-price-amount wholesale">
                                                    Rs. {p.wholesalePrice != null ? p.wholesalePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-card-footer-modern">
                                            <button
                                                className="btn-outlet-modern"
                                                onClick={() => setSelectedProduct(p)}
                                            >
                                                <span>{t.products.viewDetails}</span>
                                                <i className="arrow-icon">→</i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                <p>{t.products.noProducts}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Outlet Locator Section */}
            <section id="outlets" className="section-padding-fluid outlets-immersive-bg" style={{ backgroundImage: `url(${landingSettings?.outlets_bg_url || naturalHeroBg})` }}>
                <div className="bg-overlay-dark"></div>
                <div className="container-fluid relative-z">
                    <div className="section-title-box dark-text-fix">
                        <h2 className="headline-h2 text-white">{t.outlets.title1} <span className="text-green-bright">{t.outlets.title2}</span></h2>
                        <p className="subtitle-p text-white-op">{t.outlets.subtitle}</p>
                    </div>

                    <div className="outlet-search-box">
                        <div className="search-pill glass-search">
                            <input
                                type="text"
                                placeholder={t.outlets.searchPlaceholder}
                                className="outlet-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="btn-search-outlet">{t.outlets.findNearest}</button>
                        </div>

                        <div className="outlet-type-tabs" role="tablist" aria-label="Filter outlets by type">
                            {[
                                { value: 'ALL', label: t.outlets.allTypes },
                                { value: 'Farm Shop', label: t.outlets.farmShop },
                                { value: 'Milk Shop', label: t.outlets.milkShop },
                            ].map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setOutletTypeFilter(tab.value)}
                                    className={`outlet-type-pill ${outletTypeFilter === tab.value ? 'active' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="outlet-grid-premium">
                        {filteredOutlets.length > 0 ? (
                            filteredOutlets.map((outlet, idx) => (
                                <div key={idx} className="outlet-card-glass animate-fade">
                                    <div className="outlet-type-tag">
                                        {outlet.type === 'Milk Shop' ? 'Milk Shop' : 'Farm Shop'}
                                    </div>
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
                                            {t.outlets.getDirections}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <p className="text-white">
                                    {searchQuery
                                        ? `${t.outlets.noResults} "${searchQuery}".`
                                        : t.outlets.noResultsCategory || 'No outlets found in this category yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Massive Call to Action */}
            <section id="contact" className="container section-padding">
                <div className="contact-grid-modern">
                    <div className="contact-info-panel">
                        <div className="section-tag">{t.contact.tag}</div>
                        <h2 className="headline-h2">{t.contact.title1} <span className="text-green">{t.contact.title2}</span></h2>
                        <p className="p-large">{lang === 'en' ? (landingSettings?.contact_subtitle || t.contact.subtitle) : t.contact.subtitle}</p>

                        <div className="contact-nodes">
                            <div className="c-node">
                                <span className="c-icon">🏢</span>
                                <div>
                                    <strong>{lang === 'en' ? (landingSettings?.hq_title || t.contact.hqTitle) : t.contact.hqTitle}</strong>
                                    <p>{lang === 'en' ? (landingSettings?.hq_address || t.contact.hqAddress) : t.contact.hqAddress}</p>
                                </div>
                            </div>
                            <div className="c-node">
                                <span className="c-icon">📞</span>
                                <div>
                                    <strong>{t.contact.hotlineLabel}</strong>
                                    <p>{landingSettings?.hotline || '+94 11 250 1701'}</p>
                                </div>
                            </div>
                            <div className="c-node">
                                <span className="c-icon">✉️</span>
                                <div>
                                    <strong>{t.contact.emailLabel}</strong>
                                    <p>{landingSettings?.email || 'info@nldb.gov.lk'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="contact-action-panel">
                        <div className="map-embed-container animate-fade">
                            <iframe
                                src={landingSettings?.map_embed_url || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk'}
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

            {/* Official Footer - Modernized */}
            <footer className="footer-modern-v2">
                <div className="container">
                    <div className="footer-main-grid">
                        <div className="footer-brand-module">
                            <div className="f-logo-trilingual">
                                <span className="si">ජාතික පශු සම්පත් සංවර්ධන මණ්ඩලය</span>
                                <span className="ta">தேசிய கால்நடை அபிவிருத்திச் சபை</span>
                                <span className="en">National Livestock Development Board</span>
                            </div>
                            <p className="f-description">
                                {t.footer.desc}
                            </p>
                            <div className="f-social-integrated">
                                <a href="#" className="s-link">Facebook</a>
                                <a href="#" className="s-link">Instagram</a>
                                <a href="#" className="s-link">LinkedIn</a>
                            </div>
                        </div>

                        <div className="footer-nav-hub">
                            <div className="f-nav-group">
                                <h5>{t.footer.registryTitle}</h5>
                                <ul>
                                    <li><a href="#products">{t.footer.dairyCatalog}</a></li>
                                    <li><a href="#products">{t.footer.meatCatalog}</a></li>
                                    <li><a href="#products">{t.footer.agroExports}</a></li>
                                </ul>
                            </div>
                            <div className="f-nav-group">
                                <h5>{t.footer.corporateTitle}</h5>
                                <ul>
                                    <li><a href="#about">{t.footer.ourMission}</a></li>
                                    <li><a href="#">{t.footer.officialTenders}</a></li>
                                    <li><a href="#">{t.footer.annualReports}</a></li>
                                </ul>
                            </div>
                            <div className="f-nav-group">
                                <h5>{t.footer.portalTitle}</h5>
                                <ul>
                                    <li><Link to="/login">{t.footer.employeeLogin}</Link></li>
                                    <li><Link to="/login">{t.footer.managerAccess}</Link></li>
                                    <li><Link to="/login">{t.footer.storekeeping}</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="footer-legal-bar">
                        <div className="legal-flex">
                            <p>{t.footer.rights}</p>
                            <div className="legal-links">
                                <a href="#">{t.footer.privacy}</a>
                                <a href="#">{t.footer.terms}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default Home;
