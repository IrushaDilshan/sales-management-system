import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuImage,
  LuSparkles,
  LuStore,
  LuUpload,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuRotateCcw,
  LuSave,
  LuX,
  LuSearch,
  LuPhone,
  LuMapPin,
  LuExternalLink,
} from 'react-icons/lu';

import defaultHeroBg from '../assets/nldb_hero_premium.png';
import defaultHqImg from '../assets/nldb_organization_hq_v2.png';
import defaultQualityBadge from '../assets/nldb_quality_badge.png';
import defaultOutletsBg from '../assets/nldb_hero_bg.png';

const DEFAULT_SLIDES = [
  {
    name: 'NLDB Fresh UHT Milk',
    category: 'LIVESTOCK DAIRY',
    tagline: '100% pure fresh cow milk, pasteurized and sterilized for longer-lasting nutrition.',
    ghost_text: 'FRESH MILK',
    image_url: '/nldb/UHT.png',
    bg_color: '#1e3a8a',
    accent_glow: 'rgba(59, 130, 246, 0.4)',
    sort_order: 1,
    is_active: true,
  },
  {
    name: 'NLDB Chocolate Ice Cream',
    category: 'PREMIUM DESSERTS',
    tagline: 'Indulgently rich and creamy chocolate ice cream, made with fresh cream and finest cocoa.',
    ghost_text: 'CHOCO DELIGHT',
    image_url: '/nldb/chocklet_ice_cream (1).png',
    bg_color: '#451a03',
    accent_glow: 'rgba(217, 119, 6, 0.4)',
    sort_order: 2,
    is_active: true,
  },
  {
    name: 'NLDB Drinking Yoghurt',
    category: 'PROBIOTIC BEVERAGES',
    tagline: 'Deliciously refreshing dairy beverage, cultured to perfection with active probiotics.',
    ghost_text: 'YOGHURT DRINK',
    image_url: '/nldb/yorget_drink.png',
    bg_color: '#831843',
    accent_glow: 'rgba(236, 72, 153, 0.4)',
    sort_order: 3,
    is_active: true,
  },
  {
    name: 'NLDB Pure Ghee',
    category: 'ARTISANAL FATS',
    tagline: 'Clarified golden butter ghee, bringing rich traditional aroma and health benefits.',
    ghost_text: 'PURE GHEE',
    image_url: '/nldb/gee.png',
    bg_color: '#78350f',
    accent_glow: 'rgba(245, 158, 11, 0.4)',
    sort_order: 4,
    is_active: true,
  },
  {
    name: 'NLDB Strawberry Ice Cream',
    category: 'PREMIUM DESSERTS',
    tagline: 'Creamy real strawberry ice cream, infused with natural strawberry puree and farm fresh milk.',
    ghost_text: 'STRAWBERRY',
    image_url: '/nldb/stobery_ice_cream.png',
    bg_color: '#9f1239',
    accent_glow: 'rgba(244, 63, 94, 0.4)',
    sort_order: 5,
    is_active: true,
  },
  {
    name: 'NLDB Pure Buffalo Curd',
    category: 'TRADITIONAL DAIRY',
    tagline: 'Authentic rich and thick buffalo curd, set in clay pots using traditional cultures.',
    ghost_text: 'BUFFALO CURD',
    image_url: '/nldb/curd.png',
    bg_color: '#1e293b',
    accent_glow: 'rgba(148, 163, 184, 0.4)',
    sort_order: 6,
    is_active: true,
  },
];

const DEFAULT_OUTLETS = [
  { name: 'Melsiripura Sale Center', loc: 'Melsiripura', tel: '0377 294 792', type: 'Farm Shop', sort_order: 1, is_active: true },
  { name: 'Mahaberithenna Sale Center', loc: 'Digana', tel: '0817 294 638', type: 'Farm Shop', sort_order: 2, is_active: true },
  { name: 'Rosita Sale Center', loc: 'Kotagala', tel: '0515 675 404', type: 'Farm Shop', sort_order: 3, is_active: true },
  { name: 'Koulwewa Sale Center', loc: 'Peragaswela, Kuliyapitiya', tel: '0377 294 112', type: 'Farm Shop', sort_order: 4, is_active: true },
  { name: 'Narangalle Sale Center', loc: 'Kithalawa', tel: '0373 157 400', type: 'Farm Shop', sort_order: 5, is_active: true },
  { name: 'Nikawaratiya Sale Center', loc: 'Nikawaratiya', tel: '0372 260 288', type: 'Farm Shop', sort_order: 6, is_active: true },
  { name: 'Siringapatha Sale Center', loc: 'Badalgama', tel: '0312 269 204', type: 'Farm Shop', sort_order: 7, is_active: true },
  { name: 'Martin Sale Center', loc: 'Bangadeniya', tel: '0327 294 584', type: 'Farm Shop', sort_order: 8, is_active: true },
  { name: 'Weerawila Sale Center', loc: 'Thissamaharamaya', tel: '0473 499 997', type: 'Farm Shop', sort_order: 9, is_active: true },
  { name: 'Welisara Sale Center', loc: 'Alpitiwala, Ragama', tel: '0114 294 489', type: 'Farm Shop', sort_order: 10, is_active: true },
  { name: 'Beligama Sale Center', loc: 'Beligamuwa', tel: '0773 782 136', type: 'Farm Shop', sort_order: 11, is_active: true },
  { name: 'Haragama Sale Center', loc: 'Haragama, Gurudeniya', tel: '0817 294 061', type: 'Farm Shop', sort_order: 12, is_active: true },
  { name: 'Karandagolla Sale Center', loc: 'Kundasale', tel: '081 729 42 98', type: 'Farm Shop', sort_order: 13, is_active: true },
  { name: 'Apeksha Hospital Center', loc: 'Maharagama', tel: '0114 294 489', type: 'Milk Shop', sort_order: 14, is_active: true },
  { name: 'Maawaththa Farm Center', loc: 'Maawaththa', tel: '031 225 5232', type: 'Farm Shop', sort_order: 15, is_active: true },
];

const WebsiteContent = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('images'); // 'images' | 'showcase' | 'outlets'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  // Tab 1: Landing Settings
  const [settings, setSettings] = useState({
    hero_bg_url: '',
    hq_image_url: '',
    quality_badge_url: '',
    outlets_bg_url: '',
    hero_badge: 'Pioneering Sustainable Agriculture',
    hero_subtitle:
      'Leading Sri Lanka through advanced genetic research, precision engineering, and a state-of-the-art biological infrastructure ensuring national food sovereignty.',
    about_description:
      'As the national authority, NLDB bridges the gap between traditional Sri Lankan farming and high-tech digital precision. We operate 40+ specialized farms focused on genetic optimization and production excellence.',
    contact_subtitle:
      'Our team is available for corporate inquiries, farm visit requests, and official tenders.',
    hq_title: 'Narahenpita HQ',
    hq_address: 'No. 40, Narahenpita Road, Colombo 05',
    hotline: '+94 11 250 1701',
    email: 'info@nldb.gov.lk',
    map_embed_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk',
  });

  // Tab 2: Showcase Slides
  const [slides, setSlides] = useState([]);
  const [slideModal, setSlideModal] = useState({ open: false, item: null });
  const [slideForm, setSlideForm] = useState({
    name: '',
    category: 'LIVESTOCK DAIRY',
    tagline: '',
    ghost_text: '',
    image_url: '',
    bg_color: '#1e3a8a',
    accent_glow: 'rgba(59, 130, 246, 0.4)',
    sort_order: 1,
    is_active: true,
  });

  // Tab 3: Public Outlets
  const [outlets, setOutlets] = useState([]);
  const [outletSearch, setOutletSearch] = useState('');
  const [outletModal, setOutletModal] = useState({ open: false, item: null });
  const [outletForm, setOutletForm] = useState({
    name: '',
    loc: '',
    tel: '',
    type: 'Farm Shop',
    sort_order: 1,
    is_active: true,
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setSchemaMissing(false);
      const [settingsRes, slidesRes, outletsRes] = await Promise.all([
        supabase.from('landing_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('showcase_slides').select('*').order('sort_order', { ascending: true }),
        supabase.from('public_outlets').select('*').order('sort_order', { ascending: true }),
      ]);

      if (slidesRes.error || outletsRes.error) {
        setSchemaMissing(true);
      }

      if (settingsRes.data) {
        setSettings({
          hero_bg_url: settingsRes.data.hero_bg_url || '',
          hq_image_url: settingsRes.data.hq_image_url || '',
          quality_badge_url: settingsRes.data.quality_badge_url || '',
          outlets_bg_url: settingsRes.data.outlets_bg_url || '',
          hero_badge: settingsRes.data.hero_badge || 'Pioneering Sustainable Agriculture',
          hero_subtitle: settingsRes.data.hero_subtitle || '',
          about_description: settingsRes.data.about_description || '',
          contact_subtitle:
            settingsRes.data.contact_subtitle ||
            'Our team is available for corporate inquiries, farm visit requests, and official tenders.',
          hq_title: settingsRes.data.hq_title || 'Narahenpita HQ',
          hq_address: settingsRes.data.hq_address || 'No. 40, Narahenpita Road, Colombo 05',
          hotline: settingsRes.data.hotline || '+94 11 250 1701',
          email: settingsRes.data.email || 'info@nldb.gov.lk',
          map_embed_url:
            settingsRes.data.map_embed_url ||
            'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9960470593082!2d79.878808!3d6.891075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a30109230c7%3A0xfe80b3970bc8ed86!2sNational%20Livestock%20Development%20Board%20Head%20Office!5e0!3m2!1sen!2slk!4v1767198104940!5m2!1sen!2slk',
        });
      }

      // Auto-seed existing showcase slides if table exists and is empty
      if (!slidesRes.error && (!slidesRes.data || slidesRes.data.length === 0)) {
        const { data: seededSlides } = await supabase
          .from('showcase_slides')
          .insert(DEFAULT_SLIDES)
          .select();
        setSlides(seededSlides || DEFAULT_SLIDES.map((s, idx) => ({ ...s, id: `local-s-${idx}`, isLocal: true })));
      } else if (slidesRes.data && slidesRes.data.length > 0) {
        setSlides(slidesRes.data);
      } else {
        setSlides(DEFAULT_SLIDES.map((s, idx) => ({ ...s, id: `local-s-${idx}`, isLocal: true })));
      }

      // Auto-seed existing public outlets if table exists and is empty
      if (!outletsRes.error && (!outletsRes.data || outletsRes.data.length === 0)) {
        const { data: seededOutlets } = await supabase
          .from('public_outlets')
          .insert(DEFAULT_OUTLETS)
          .select();
        setOutlets(seededOutlets || DEFAULT_OUTLETS.map((o, idx) => ({ ...o, id: `local-o-${idx}`, isLocal: true })));
      } else if (outletsRes.data && outletsRes.data.length > 0) {
        setOutlets(outletsRes.data);
      } else {
        setOutlets(DEFAULT_OUTLETS.map((o, idx) => ({ ...o, id: `local-o-${idx}`, isLocal: true })));
      }
    } catch (err) {
      console.error('Error loading website content:', err);
      setSchemaMissing(true);
      setSlides(DEFAULT_SLIDES.map((s, idx) => ({ ...s, id: `local-s-${idx}`, isLocal: true })));
      setOutlets(DEFAULT_OUTLETS.map((o, idx) => ({ ...o, id: `local-o-${idx}`, isLocal: true })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Upload helper to Supabase Storage ('site-assets')
  const uploadAsset = async (file, folder, key) => {
    if (!file) return null;
    try {
      setUploadingKey(key);
      const ext = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
      showToast('Image uploaded successfully.', 'success');
      return data.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      showToast(`Upload failed: ${err.message}. You can paste an image URL instead.`, 'error');
      return null;
    } finally {
      setUploadingKey(null);
    }
  };

  // Save Page Images & Copy
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        id: 1,
        hero_bg_url: settings.hero_bg_url || null,
        hq_image_url: settings.hq_image_url || null,
        quality_badge_url: settings.quality_badge_url || null,
        outlets_bg_url: settings.outlets_bg_url || null,
        hero_badge: settings.hero_badge,
        hero_subtitle: settings.hero_subtitle,
        about_description: settings.about_description,
        contact_subtitle: settings.contact_subtitle,
        hq_title: settings.hq_title,
        hq_address: settings.hq_address,
        hotline: settings.hotline,
        email: settings.email,
        map_embed_url: settings.map_embed_url,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('landing_settings').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showToast('Home page images & copy saved!', 'success');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Showcase Slide CRUD
  const openSlideModal = (item = null) => {
    if (item) {
      setSlideForm({
        name: item.name || '',
        category: item.category || 'LIVESTOCK DAIRY',
        tagline: item.tagline || '',
        ghost_text: item.ghost_text || '',
        image_url: item.image_url || '',
        bg_color: item.bg_color || '#1e3a8a',
        accent_glow: item.accent_glow || 'rgba(59, 130, 246, 0.4)',
        sort_order: item.sort_order ?? 1,
        is_active: item.is_active !== false,
      });
    } else {
      setSlideForm({
        name: '',
        category: 'LIVESTOCK DAIRY',
        tagline: '',
        ghost_text: '',
        image_url: '',
        bg_color: '#1e3a8a',
        accent_glow: 'rgba(59, 130, 246, 0.4)',
        sort_order: slides.length + 1,
        is_active: true,
      });
    }
    setSlideModal({ open: true, item });
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...slideForm,
        sort_order: parseInt(slideForm.sort_order, 10) || 0,
      };
      if (slideModal.item && !slideModal.item.isLocal && !String(slideModal.item.id).startsWith('local-')) {
        const { error } = await supabase
          .from('showcase_slides')
          .update(payload)
          .eq('id', slideModal.item.id);
        if (error) throw error;
        showToast('Showcase slide updated.', 'success');
      } else {
        const { error } = await supabase.from('showcase_slides').insert([payload]);
        if (error) throw error;
        showToast('Showcase slide saved.', 'success');
      }
      setSlideModal({ open: false, item: null });
      fetchAll();
    } catch (err) {
      console.error('Save slide error:', err);
      showToast(err.message || 'Failed to save slide.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (slide) => {
    const res = await Swal.fire({
      title: `Delete "${slide.name}"?`,
      text: 'This slide will be removed from the Home page carousel.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!res.isConfirmed) return;
    try {
      if (!slide.isLocal && !String(slide.id).startsWith('local-')) {
        const { error } = await supabase.from('showcase_slides').delete().eq('id', slide.id);
        if (error) throw error;
        fetchAll();
      } else {
        setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      }
      showToast('Slide deleted.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete slide.', 'error');
    }
  };

  // Public Outlet CRUD
  const openOutletModal = (item = null) => {
    if (item) {
      setOutletForm({
        name: item.name || '',
        loc: item.loc || '',
        tel: item.tel || '',
        type: item.type === 'Milk Shop' ? 'Milk Shop' : 'Farm Shop',
        sort_order: item.sort_order ?? 1,
        is_active: item.is_active !== false,
      });
    } else {
      setOutletForm({
        name: '',
        loc: '',
        tel: '',
        type: 'Farm Shop',
        sort_order: outlets.length + 1,
        is_active: true,
      });
    }
    setOutletModal({ open: true, item });
  };

  const handleSaveOutlet = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...outletForm,
        sort_order: parseInt(outletForm.sort_order, 10) || 0,
      };
      if (outletModal.item && !outletModal.item.isLocal && !String(outletModal.item.id).startsWith('local-')) {
        const { error } = await supabase
          .from('public_outlets')
          .update(payload)
          .eq('id', outletModal.item.id);
        if (error) throw error;
        showToast('Outlet updated.', 'success');
      } else {
        const { error } = await supabase.from('public_outlets').insert([payload]);
        if (error) throw error;
        showToast('Outlet saved.', 'success');
      }
      setOutletModal({ open: false, item: null });
      fetchAll();
    } catch (err) {
      console.error('Save outlet error:', err);
      showToast(err.message || 'Failed to save outlet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOutlet = async (outlet) => {
    const res = await Swal.fire({
      title: `Remove "${outlet.name}"?`,
      text: 'This outlet will no longer appear on the public Home page.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: '#ef4444',
    });
    if (!res.isConfirmed) return;
    try {
      if (!outlet.isLocal && !String(outlet.id).startsWith('local-')) {
        const { error } = await supabase.from('public_outlets').delete().eq('id', outlet.id);
        if (error) throw error;
        fetchAll();
      } else {
        setOutlets((prev) => prev.filter((o) => o.id !== outlet.id));
      }
      showToast('Outlet removed.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove outlet.', 'error');
    }
  };

  const filteredOutlets = outlets.filter(
    (o) =>
      !outletSearch ||
      o.name?.toLowerCase().includes(outletSearch.toLowerCase()) ||
      o.loc?.toLowerCase().includes(outletSearch.toLowerCase())
  );

  const imageSlots = [
    {
      key: 'hero_bg_url',
      label: 'Hero Background (Image 1)',
      hint: 'Full-width banner behind "Reshaping the National Livestock Frontier."',
      fallback: defaultHeroBg,
    },
    {
      key: 'hq_image_url',
      label: 'About / HQ Building (Image 2)',
      hint: 'Main photo in "A Legacy of Integrity & Precision." section',
      fallback: defaultHqImg,
    },
    {
      key: 'quality_badge_url',
      label: 'Quality / Anniversary Seal (Image 2)',
      hint: 'Floating circular badge overlaid on the HQ photo',
      fallback: defaultQualityBadge,
    },
    {
      key: 'outlets_bg_url',
      label: 'Outlets Section Background (Image 4)',
      hint: 'Backdrop behind the Global Outlets glass cards',
      fallback: defaultOutletsBg,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Public Website CMS · Live Sync</span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Website Content Manager
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customize landing page images, rotating product showcase slides, and public outlets.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-card transition-colors self-start md:self-auto"
        >
          <LuExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          <span>Preview Home Page</span>
        </a>
      </div>

      {/* Tabs */}
      {schemaMissing && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 font-medium">
          Showing existing default content. To save edits, additions, or deletions to the database, run{' '}
          <code className="font-mono font-bold">database_migrations/31_landing_cms.sql</code> in your Supabase SQL Editor and refresh.
        </div>
      )}

      <div className="inline-flex flex-wrap items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 gap-1">
        <button
          onClick={() => setActiveTab('images')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'images'
              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <LuImage className="w-3.5 h-3.5" />
          <span>Page Images & Copy</span>
        </button>
        <button
          onClick={() => setActiveTab('showcase')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'showcase'
              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <LuSparkles className="w-3.5 h-3.5" />
          <span>Showcase Carousel ({slides.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outlets')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'outlets'
              ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <LuStore className="w-3.5 h-3.5" />
          <span>Public Outlets ({outlets.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center text-sm text-zinc-400">
          Loading website configuration...
        </div>
      ) : (
        <>
          {/* TAB 1: PAGE IMAGES & COPY */}
          {activeTab === 'images' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {imageSlots.map((slot) => {
                  const previewSrc = settings[slot.key] || slot.fallback;
                  const isCustom = Boolean(settings[slot.key]);
                  return (
                    <div
                      key={slot.key}
                      className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-card flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                            {slot.label}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {slot.hint}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isCustom
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          {isCustom ? 'Custom' : 'Default'}
                        </span>
                      </div>

                      <div className="h-44 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                        <img
                          src={previewSrc}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <input
                          type="url"
                          placeholder="Paste image URL or upload below..."
                          value={settings[slot.key]}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, [slot.key]: e.target.value }))
                          }
                          className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                        />

                        <div className="flex items-center gap-2">
                          <label className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer transition-colors">
                            <LuUpload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingKey === slot.key ? 'Uploading...' : 'Upload Image'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingKey === slot.key}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = await uploadAsset(file, 'landing', slot.key);
                                if (url) {
                                  setSettings((prev) => ({ ...prev, [slot.key]: url }));
                                }
                              }}
                            />
                          </label>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                setSettings((prev) => ({ ...prev, [slot.key]: '' }))
                              }
                              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                              title="Reset to default"
                            >
                              <LuRotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hero & About Text */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Hero & Corporate Overview Text
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Hero Badge Text
                    </label>
                    <input
                      type="text"
                      value={settings.hero_badge}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, hero_badge: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={settings.hero_subtitle}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, hero_subtitle: e.target.value }))
                    }
                    className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    About Section Description
                  </label>
                  <textarea
                    rows={2}
                    value={settings.about_description}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, about_description: e.target.value }))
                    }
                    className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Contact & Headquarters Map */}
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 shadow-card space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                    Contact & National Headquarters Map
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Manage the &ldquo;Get in Touch.&rdquo; contact details and Google Maps embed on the Home page.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Contact Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.contact_subtitle}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, contact_subtitle: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      HQ Title
                    </label>
                    <input
                      type="text"
                      value={settings.hq_title}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, hq_title: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      HQ Address
                    </label>
                    <input
                      type="text"
                      value={settings.hq_address}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, hq_address: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Hotline
                    </label>
                    <input
                      type="text"
                      value={settings.hotline}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, hotline: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Google Maps Embed URL
                  </label>
                  <input
                    type="url"
                    value={settings.map_embed_url}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, map_embed_url: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
                  >
                    <LuSave className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Page Settings'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SHOWCASE CAROUSEL */}
          {activeTab === 'showcase' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Manage the rotating product showcase slides (Image 3) displayed on the Home page.
                </p>
                <button
                  onClick={() => openSlideModal()}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <LuPlus className="w-3.5 h-3.5" />
                  <span>Add Slide</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-card flex flex-col"
                  >
                    <div
                      className="h-44 relative flex items-center justify-center p-4"
                      style={{ backgroundColor: slide.bg_color || '#1e3a8a' }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-white/10 font-black text-3xl tracking-wider uppercase select-none pointer-events-none text-center px-2">
                        {slide.ghost_text}
                      </span>
                      <img
                        src={slide.image_url}
                        alt={slide.name}
                        className="relative z-10 max-h-36 object-contain drop-shadow-lg"
                      />
                      <span className="absolute top-3 left-3 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white">
                        #{slide.sort_order}
                      </span>
                      {!slide.is_active && (
                        <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                          Hidden
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {slide.category}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">
                          {slide.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {slide.tagline}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                        <button
                          onClick={() => openSlideModal(slide)}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <LuPencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSlide(slide)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Delete slide"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PUBLIC OUTLETS */}
          {activeTab === 'outlets' && (
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
              <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    placeholder="Search outlet name or city..."
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <button
                  onClick={() => openOutletModal()}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
                >
                  <LuPlus className="w-3.5 h-3.5" />
                  <span>Add Public Outlet</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Center Name
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Location
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Telephone
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Type
                      </th>
                      <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
                    {filteredOutlets.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {o.name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1.5">
                            <LuMapPin className="w-3.5 h-3.5 text-zinc-400" />
                            {o.loc}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1.5">
                            <LuPhone className="w-3.5 h-3.5 text-zinc-400" />
                            {o.tel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            {o.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openOutletModal(o)}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                              <LuPencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteOutlet(o)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete outlet"
                            >
                              <LuTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* SLIDE MODAL */}
      {slideModal.open && (
        <div
          className="fixed inset-0 !mt-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSlideModal({ open: false, item: null })}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                {slideModal.item ? 'Edit Showcase Slide' : 'Add Showcase Slide'}
              </h2>
              <button
                onClick={() => setSlideModal({ open: false, item: null })}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={slideForm.name}
                    onChange={(e) => setSlideForm({ ...slideForm, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Category Badge
                  </label>
                  <input
                    type="text"
                    required
                    value={slideForm.category}
                    onChange={(e) => setSlideForm({ ...slideForm, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Background Watermark Text
                  </label>
                  <input
                    type="text"
                    value={slideForm.ghost_text}
                    onChange={(e) => setSlideForm({ ...slideForm, ghost_text: e.target.value })}
                    placeholder="e.g. YOGHURT DRINK"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={slideForm.bg_color}
                      onChange={(e) => setSlideForm({ ...slideForm, bg_color: e.target.value })}
                      className="h-10 w-14 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={slideForm.bg_color}
                      onChange={(e) => setSlideForm({ ...slideForm, bg_color: e.target.value })}
                      className="flex-1 h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tagline / Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={slideForm.tagline}
                  onChange={(e) => setSlideForm({ ...slideForm, tagline: e.target.value })}
                  className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Product Image URL or Upload
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={slideForm.image_url}
                    onChange={(e) => setSlideForm({ ...slideForm, image_url: e.target.value })}
                    placeholder="/nldb/UHT.png or https://..."
                    className="flex-1 h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-950 dark:text-white"
                  />
                  <label className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold cursor-pointer">
                    <LuUpload className="w-3.5 h-3.5" />
                    <span>{uploadingKey === 'slide' ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadAsset(file, 'showcase', 'slide');
                        if (url) setSlideForm((prev) => ({ ...prev, image_url: url }));
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={slideForm.sort_order}
                    onChange={(e) => setSlideForm({ ...slideForm, sort_order: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slideForm.is_active}
                    onChange={(e) => setSlideForm({ ...slideForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Active on Home Page</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSlideModal({ open: false, item: null })}
                  className="h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTLET MODAL */}
      {outletModal.open && (
        <div
          className="fixed inset-0 !mt-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOutletModal({ open: false, item: null })}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                {outletModal.item ? 'Edit Public Outlet' : 'Add Public Outlet'}
              </h2>
              <button
                onClick={() => setOutletModal({ open: false, item: null })}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOutlet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Sale Center Name
                </label>
                <input
                  type="text"
                  required
                  value={outletForm.name}
                  onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                  placeholder="e.g. Melsiripura Sale Center"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Location / City
                </label>
                <input
                  type="text"
                  required
                  value={outletForm.loc}
                  onChange={(e) => setOutletForm({ ...outletForm, loc: e.target.value })}
                  placeholder="e.g. Digana"
                  className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Telephone
                  </label>
                  <input
                    type="text"
                    required
                    value={outletForm.tel}
                    onChange={(e) => setOutletForm({ ...outletForm, tel: e.target.value })}
                    placeholder="0377 294 792"
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Outlet Type
                  </label>
                  <select
                    value={outletForm.type}
                    onChange={(e) => setOutletForm({ ...outletForm, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white"
                  >
                    <option value="Farm Shop">Farm Shop</option>
                    <option value="Milk Shop">Milk Shop</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOutletModal({ open: false, item: null })}
                  className="h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteContent;
