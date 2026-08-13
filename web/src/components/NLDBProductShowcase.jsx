import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './NLDBProductShowcase.css';

const PRODUCTS = [
  {
    image: '/nldb/UHT.png',
    name: 'NLDB Fresh UHT Milk',
    ghostText: 'FRESH MILK',
    bgColor: '#1e3a8a',
    accentGlow: 'rgba(59, 130, 246, 0.4)',
    category: 'LIVESTOCK DAIRY',
    tagline: '100% pure fresh cow milk, pasteurized and sterilized for longer-lasting nutrition.'
  },
  {
    image: '/nldb/chocklet_ice_cream (1).png',
    name: 'NLDB Chocolate Ice Cream',
    ghostText: 'CHOCO DELIGHT',
    bgColor: '#451a03',
    accentGlow: 'rgba(217, 119, 6, 0.4)',
    category: 'PREMIUM DESSERTS',
    tagline: 'Indulgently rich and creamy chocolate ice cream, made with fresh cream and finest cocoa.'
  },
  {
    image: '/nldb/yorget_drink.png',
    name: 'NLDB Drinking Yoghurt',
    ghostText: 'YOGHURT DRINK',
    bgColor: '#831843',
    accentGlow: 'rgba(236, 72, 153, 0.4)',
    category: 'PROBIOTIC BEVERAGES',
    tagline: 'Deliciously refreshing dairy beverage, cultured to perfection with active probiotics.'
  },
  {
    image: '/nldb/gee.png',
    name: 'NLDB Pure Ghee',
    ghostText: 'PURE GHEE',
    bgColor: '#78350f',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    category: 'ARTISANAL FATS',
    tagline: 'Clarified golden butter ghee, bringing rich traditional aroma and health benefits.'
  },
  {
    image: '/nldb/stobery_ice_cream.png',
    name: 'NLDB Strawberry Ice Cream',
    ghostText: 'STRAWBERRY',
    bgColor: '#9f1239',
    accentGlow: 'rgba(244, 63, 94, 0.4)',
    category: 'PREMIUM DESSERTS',
    tagline: 'Creamy real strawberry ice cream, infused with natural strawberry puree and farm fresh milk.'
  },
  {
    image: '/nldb/curd.png',
    name: 'NLDB Pure Buffalo Curd',
    ghostText: 'BUFFALO CURD',
    bgColor: '#1e293b',
    accentGlow: 'rgba(148, 163, 184, 0.4)',
    category: 'TRADITIONAL DAIRY',
    tagline: 'Authentic rich and thick buffalo curd, set in clay pots using traditional cultures.'
  }
];

const NLDBProductShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProduct = PRODUCTS[activeIndex];

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % PRODUCTS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + PRODUCTS.length) % PRODUCTS.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 2000);

    return () => clearInterval(timer);
  }, [activeIndex]);

  return (
    <section
      id="product-showcase"
      style={{ backgroundColor: activeProduct.bgColor }}
    >
      {/* Background Watermark Ghost Text */}
      <div className="ghost-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct.ghostText}
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 0.1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ghost-text"
          >
            {activeProduct.ghostText}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="showcase-content">
        {/* Massive Hero Product Display */}
        <div className="hero-image-wrapper">
          {/* Ambient Glow Circle */}
          <div
            className="ambient-glow"
            style={{ backgroundColor: activeProduct.accentGlow }}
          />

          <AnimatePresence mode="wait">
            <motion.img
              key={activeIndex}
              src={activeProduct.image}
              alt={activeProduct.name}
              initial={{ opacity: 0, scale: 0.75, y: 40, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -40, rotate: 3 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="hero-product-img"
            />
          </AnimatePresence>
        </div>

        {/* Overlay Details and Navigation (Grouped in bottom-left area) */}
        <div className="details-overlay">
          <div className="details-content">
            {/* Category Badge */}
            <span className="category-badge">
              {activeProduct.category}
            </span>

            {/* Name and Tagline */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="product-name">
                  {activeProduct.name}
                </h2>
                <p className="product-tagline">
                  {activeProduct.tagline}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="nav-controls">
              <button
                onClick={handlePrev}
                className="nav-btn"
                aria-label="Previous Product"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="nav-btn"
                aria-label="Next Product"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Indicators */}
        <div className="side-indicators">
          {PRODUCTS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`indicator-dot ${activeIndex === idx ? 'active' : ''}`}
              aria-label={`Go to product ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NLDBProductShowcase;
