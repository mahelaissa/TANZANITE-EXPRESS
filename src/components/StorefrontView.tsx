import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Globe,
  Heart,
  Search,
  SlidersHorizontal,
  Star,
  Truck,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { apiFetch } from '../lib/api';
import { Product } from '../types/marketplace';
import { PWAInstallButton } from './PWAInstallButton';
import { SafeImage } from './SafeImage';

interface StorefrontViewProps {
  genderFilter: 'ALL' | 'MEN' | 'WOMEN';
  setGenderFilter: (g: 'ALL' | 'MEN' | 'WOMEN') => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  genderFilter,
  setGenderFilter,
}) => {
  const {
    isDevelopmentMode,
    settings,
    language,
    t,
    categories,
    suppliers,
    products,
    reviews,
    formatMoney,
    wishlist,
    toggleWishlist,
    setSelectedProduct,
    setActivePage,
    toast,
    loadingStorefront,
  } = useMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');
  const [selectedSize, setSelectedSize] = useState('ALL');
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(300);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [collectionTab, setCollectionTab] = useState<'ALL' | 'NEW' | 'BEST' | 'FEATURED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  const availableCategories = useMemo(() => {
    if (genderFilter === 'MEN') return categories.MEN;
    if (genderFilter === 'WOMEN') return categories.WOMEN;
    return Array.from(new Set([...categories.MEN, ...categories.WOMEN]));
  }, [categories, genderFilter]);

  const allCountries = useMemo(
    () => Array.from(new Set(products.map((p) => p.shippingOriginCountry))),
    [products]
  );

  const allSizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.size)))),
    [products]
  );

  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.color)))),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (genderFilter !== 'ALL' && p.gender !== genderFilter && p.gender !== 'UNISEX') {
        return false;
      }
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedCountry !== 'ALL' && p.shippingOriginCountry !== selectedCountry) return false;
      if (selectedSupplierId !== 'ALL' && p.supplierId !== selectedSupplierId) return false;
      if (p.sellingPriceUsd > maxPriceUsd) return false;
      if (inStockOnly && p.totalStock <= 0) return false;
      if (minRating > 0 && p.ratingAvg < minRating) return false;
      if (collectionTab === 'NEW' && !p.isNewArrival) return false;
      if (collectionTab === 'BEST' && !p.isBestSeller) return false;
      if (collectionTab === 'FEATURED' && !p.featured) return false;
      if (selectedSize !== 'ALL' && !p.variants.some((v) => v.size === selectedSize)) return false;
      if (selectedColor !== 'ALL' && !p.variants.some((v) => v.color === selectedColor)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    products,
    genderFilter,
    selectedCategory,
    selectedCountry,
    selectedSupplierId,
    maxPriceUsd,
    inStockOnly,
    minRating,
    collectionTab,
    selectedSize,
    selectedColor,
    searchQuery,
  ]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmittingNewsletter(true);
    try {
      await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      toast('Subscribed to MIK FASHION HUB editorial dispatches.', 'success');
      setNewsletterEmail('');
    } catch (err: any) {
      toast(err.message || 'Subscription failed', 'error');
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Development Mode Transparency Notice */}
      {isDevelopmentMode && (
        <div className="bg-[#F4F2EE] border-b border-[#E5E2DC] px-4 sm:px-8 py-2 text-xs text-neutral-700">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>{t('devBannerNotice')}</span>
            <button
              type="button"
              onClick={() => setActivePage('supplier')}
              className="font-medium text-[#111111] underline underline-offset-4 cursor-pointer"
            >
              {t('onboardSupplierCta')}
            </button>
          </div>
        </div>
      )}

      {/* 1. Editorial Hero Showcase */}
      <section className="relative bg-[#111111] text-white overflow-hidden">
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-12 items-stretch min-h-[520px] lg:min-h-[600px]">
          <div className="lg:col-span-5 px-6 sm:px-12 py-12 lg:py-20 flex flex-col justify-center z-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[#D4B483] mb-4">
              {t('heroKicker')}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-tight text-balance">
              {(language === 'sw' ? settings?.heroTitleSw : settings?.heroTitle) ||
                'Curated Tailoring & Global Fashion Houses'}
            </h1>
            <p className="mt-5 text-sm sm:text-base text-neutral-300 leading-relaxed max-w-md">
              {(language === 'sw' ? settings?.heroSubtitleSw : settings?.heroSubtitle) ||
                'Connecting independent Tanzanian ateliers and vetted international fashion suppliers directly to your wardrobe.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-2 bg-[#FAF9F6] text-[#111111] px-6 py-3 text-xs font-semibold tracking-wide uppercase hover:bg-[#D4B483] hover:text-[#111111] transition-colors cursor-pointer"
              >
                <span>
                  {(language === 'sw' ? settings?.heroCtaTextSw : settings?.heroCtaText) ||
                    t('exploreCollections')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActivePage('supplier')}
                className="inline-flex items-center gap-2 border border-neutral-600 px-5 py-3 text-xs font-medium text-neutral-200 hover:border-white hover:text-white transition-colors cursor-pointer"
              >
                {t('becomeSupplier')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-full">
            <SafeImage
              src="/src/assets/images/hero_fashion_editorial_1794751434706.jpg"
              alt="MIK FASHION HUB editorial tailoring campaign"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/30 to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/70 via-transparent to-transparent lg:hidden" />
          </div>
        </div>
      </section>

      {/* Dual-Market Editorial Split Strip */}
      <section className="border-b border-[#E5E2DC] bg-white">
        <div className="max-w-[1440px] mx-auto grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E2DC]">
          <button
            type="button"
            onClick={() => {
              setGenderFilter('MEN');
              setSelectedCategory('ALL');
              document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group text-left p-6 sm:p-8 flex items-center gap-6 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <div className="w-24 h-24 shrink-0 overflow-hidden bg-[#F4F2EE]">
              <SafeImage
                src="/src/assets/images/cat_mens_tailoring_1794751435522.jpg"
                alt={t('shopMensCollection')}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{t('mensSub')}</p>
              <h2 className="font-editorial text-2xl font-semibold text-[#111111] mt-1">
                {t('shopMensCollection')}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8B6F47] mt-2">
                {t('browseMenswear')} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setGenderFilter('WOMEN');
              setSelectedCategory('ALL');
              document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group text-left p-6 sm:p-8 flex items-center gap-6 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <div className="w-24 h-24 shrink-0 overflow-hidden bg-[#F4F2EE]">
              <SafeImage
                src="/src/assets/images/cat_womens_atelier_1794751435891.jpg"
                alt={t('shopWomensCollection')}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{t('womensSub')}</p>
              <h2 className="font-editorial text-2xl font-semibold text-[#111111] mt-1">
                {t('shopWomensCollection')}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8B6F47] mt-2">
                {t('browseWomenswear')} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Featured Collection & Multi-Faceted Catalog */}
      <section id="catalog-section" className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E5E2DC]">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-[0.14em]">
              {t('curatedEdit')}
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111111] mt-1">
              {genderFilter === 'ALL'
                ? t('allMarketplace')
                : genderFilter === 'MEN'
                  ? t('mensEditorial')
                  : t('womensEditorial')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F4F2EE] border border-[#E5E2DC]">
              {(['ALL', 'NEW', 'BEST', 'FEATURED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCollectionTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    collectionTab === tab
                      ? 'bg-white text-[#111111] shadow-xs'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }`}
                >
                  {tab === 'ALL'
                    ? t('allItems')
                    : tab === 'NEW'
                      ? t('newArrivals')
                      : tab === 'BEST'
                        ? t('bestSellers')
                        : t('featured')}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-8 pr-3 py-2 text-xs bg-white border border-[#E5E2DC] w-56 sm:w-64 focus:outline-none focus:border-[#111111]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className="inline-flex items-center gap-1.5 border border-[#E5E2DC] bg-white px-3.5 py-2 text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('filters')}
            </button>
          </div>
        </div>

        {/* Category Segmented Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 border-b border-[#E5E2DC]">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white text-neutral-700 border-[#E5E2DC] hover:border-[#111111]'
            }`}
          >
            {t('allCategories')}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-neutral-700 border-[#E5E2DC] hover:border-[#111111]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expandable Multi-Faceted Filter Matrix */}
        {showFilters && (
          <div className="bg-white border border-[#E5E2DC] p-5 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
                Gender
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'ALL' | 'MEN' | 'WOMEN')}
                className="w-full border border-[#E5E2DC] px-2.5 py-2 text-xs bg-[#FAF9F6]"
              >
                <option value="ALL">All Genders</option>
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
                Origin Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full border border-[#E5E2DC] px-2.5 py-2 text-xs bg-[#FAF9F6]"
              >
                <option value="ALL">All Countries</option>
                {allCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
                Supplier House
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full border border-[#E5E2DC] px-2.5 py-2 text-xs bg-[#FAF9F6]"
              >
                <option value="ALL">All Verified Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName} ({s.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
                Size & Color
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="border border-[#E5E2DC] px-2 py-2 text-xs bg-[#FAF9F6]"
                >
                  <option value="ALL">Size</option>
                  {allSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="border border-[#E5E2DC] px-2 py-2 text-xs bg-[#FAF9F6]"
                >
                  <option value="ALL">Color</option>
                  {allColors.map((cl) => (
                    <option key={cl} value={cl}>
                      {cl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
                Max Price ({formatMoney(maxPriceUsd)})
              </label>
              <input
                type="range"
                min={20}
                max={300}
                step={10}
                value={maxPriceUsd}
                onChange={(e) => setMaxPriceUsd(Number(e.target.value))}
                className="w-full accent-[#111111]"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-[#111111]"
                />
                In Stock Only
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="border border-[#E5E2DC] px-2 py-1.5 text-xs bg-[#FAF9F6]"
              >
                <option value={0}>Any Rating</option>
                <option value={4}>4+ Stars</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setGenderFilter('ALL');
                  setSelectedCategory('ALL');
                  setSelectedCountry('ALL');
                  setSelectedSupplierId('ALL');
                  setSelectedSize('ALL');
                  setSelectedColor('ALL');
                  setMaxPriceUsd(300);
                  setInStockOnly(false);
                  setMinRating(0);
                  setSearchQuery('');
                }}
                className="text-left text-xs text-[#8B6F47] underline cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {loadingStorefront ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white border border-[#E5E2DC] p-4 animate-pulse">
                <div className="aspect-[4/3] bg-[#F4F2EE]" />
                <div className="h-4 bg-[#F4F2EE] mt-4 w-2/3" />
                <div className="h-4 bg-[#F4F2EE] mt-2 w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white border border-[#E5E2DC] mt-8">
            <p className="font-editorial text-2xl text-[#111111]">
              {t('noPiecesFound')}
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              {t('resetFilters')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                priceLabel={formatMoney(product.sellingPriceUsd)}
                inStockText={`${product.totalStock} ${t('inStock')}`}
                outOfStockText={t('outOfStock')}
                isSaved={wishlist.includes(product.id)}
                onToggleSave={() => toggleWishlist(product.id)}
                onSelect={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured Suppliers & Dual-Market Logistics Story */}
      <section className="bg-white border-y border-[#E5E2DC] py-14 sm:py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs text-[#8B6F47] uppercase tracking-[0.14em]">
                {t('verifiedNetwork')}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111111] mt-2">
                {t('suppliersTitle')}
              </h2>
              <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
                {settings?.promoBannerSubtitle ||
                  'Every supplier on MIK FASHION HUB undergoes document verification. Multi-supplier baskets automatically split into supplier-specific suborders with individual courier tracking.'}
              </p>

              <div className="mt-6 space-y-4 border-t border-[#E5E2DC] pt-6">
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-[#8B6F47] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#111111]">
                      Tanzania Domestic Dispatch (TZS) · M-Pesa & NMB Bank
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {language === 'sw'
                        ? 'Usafirishaji ndani ya Tanzania siku 1–3 za kazi baada ya Admin kuhakiki malipo.'
                        : 'Local Dar es Salaam & regional courier delivery within 1–3 business days after Admin verifies payment.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-[#8B6F47] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#111111]">
                      International Direct Sourcing (USD / GBP / EUR)
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {language === 'sw'
                        ? 'Bidhaa kutoka Italy, UK, USA & Asia zikiwa na uwazi wa usafirishaji na forodha.'
                        : 'Vetted houses in Italy, UK, USA & Asia with upfront customs & import duty transparency.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="border border-[#E5E2DC] bg-[#FAF9F6] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                      <span>{sup.country}</span>
                      <span>{sup.category}</span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#111111] mt-2">
                      {sup.businessName}
                    </h3>
                    <p className="text-xs text-neutral-600 mt-2 leading-relaxed line-clamp-3">
                      {sup.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E5E2DC] flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      {sup.shippingOrigin}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(sup.id);
                        document
                          .getElementById('catalog-section')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-xs font-medium text-[#111111] underline underline-offset-4 cursor-pointer"
                    >
                      {t('viewStore')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Customer Reviews (Strictly from real DB submissions) */}
          <div className="mt-12 pt-10 border-t border-[#E5E2DC]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-editorial text-2xl font-semibold text-[#111111]">
                {t('verifiedReviews')}
              </h3>
              <span className="text-xs text-neutral-500 tabular-nums">
                {reviews.length}
              </span>
            </div>
            {reviews.length === 0 ? (
              <p className="text-xs text-neutral-600">{t('noReviewsYet')}</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="border border-[#E5E2DC] p-5 bg-[#FAF9F6]">
                    <div className="flex items-center gap-1 text-[#8B6F47]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-800 mt-3 leading-relaxed">
                      “{rev.comment}”
                    </p>
                    <p className="text-xs text-neutral-500 mt-3">
                      {rev.customerName} · {rev.verifiedPurchase ? 'Verified Buyer' : 'Customer'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Newsletter & Complete Footer */}
      <footer className="bg-[#111111] text-[#FAF9F6] pt-14 pb-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10 pb-12 border-b border-neutral-800">
            <div className="lg:col-span-5">
              <p className="font-editorial text-2xl font-semibold">MIK FASHION HUB</p>
              <p className="text-xs text-neutral-400 mt-3 max-w-sm leading-relaxed">
                Curated multi-vendor fashion marketplace bridging Tanzanian designers and verified global suppliers with transparent commission and direct fulfillment.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="mt-5 flex max-w-sm">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4B483]"
                />
                <button
                  type="submit"
                  disabled={submittingNewsletter}
                  className="bg-[#FAF9F6] text-[#111111] px-4 py-2 text-xs font-semibold hover:bg-[#D4B483] transition-colors cursor-pointer"
                >
                  {t('subscribe')}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div>
                <p className="text-neutral-400 uppercase tracking-wider mb-3">Marketplace</p>
                <ul className="space-y-2 text-neutral-300">
                  <li>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('MEN')}
                      className="hover:text-white cursor-pointer"
                    >
                      Men’s Fashion
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('WOMEN')}
                      className="hover:text-white cursor-pointer"
                    >
                      Women’s Fashion
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('supplier')}
                      className="hover:text-white cursor-pointer"
                    >
                      Sell on MIK
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('track')}
                      className="hover:text-white cursor-pointer"
                    >
                      Track Suborders
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-neutral-400 uppercase tracking-wider mb-3">Policies & Help</p>
                <ul className="space-y-2 text-neutral-300">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('support')}
                      className="hover:text-white cursor-pointer"
                    >
                      Return & Refund Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('support')}
                      className="hover:text-white cursor-pointer"
                    >
                      Shipping & Customs Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('support')}
                      className="hover:text-white cursor-pointer"
                    >
                      Privacy Policy & Terms
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePage('support')}
                      className="hover:text-white cursor-pointer"
                    >
                      Contact Support & FAQ
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-neutral-400 uppercase tracking-wider mb-3">Connect & App</p>
                <ul className="space-y-2 text-neutral-300 mb-4">
                  <li>
                    <a
                      href={settings?.socialLinks?.instagram || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white"
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href={settings?.socialLinks?.tiktok || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white"
                    >
                      TikTok
                    </a>
                  </li>
                  <li>
                    <a
                      href={settings?.socialLinks?.whatsapp || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white"
                    >
                      WhatsApp Concierge
                    </a>
                  </li>
                </ul>
                <PWAInstallButton />
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} MIK FASHION HUB. Dar es Salaam & Global.</p>
            <p>Multi-Currency Checkout: TZS · USD · GBP · EUR · KES</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

interface ProductCardProps {
  product: Product;
  priceLabel: string;
  inStockText: string;
  outOfStockText: string;
  isSaved: boolean;
  onToggleSave: () => void;
  onSelect: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  priceLabel,
  inStockText,
  outOfStockText,
  isSaved,
  onToggleSave,
  onSelect,
}) => {
  const hasSecondary = Boolean(product.images && product.images.length > 1);
  return (
    <article className="group bg-white border border-[#E5E2DC] flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="relative aspect-[4/3] bg-[#F4F2EE] overflow-hidden">
        <button
          type="button"
          onClick={onSelect}
          className="w-full h-full block cursor-pointer relative"
          aria-label={`View ${product.title}`}
        >
          <SafeImage
            src={product.images[0]}
            alt={product.title}
            className={`w-full h-full object-cover transition-all duration-300 ${
              hasSecondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
            }`}
          />
          {hasSecondary && (
            <SafeImage
              src={product.images[1]}
              alt={`${product.title} alternate view`}
              className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-3 right-3 p-2 bg-white/90 border border-[#E5E2DC] text-[#111111] hover:bg-white cursor-pointer"
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#8B6F47] text-[#8B6F47]' : ''}`} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.shippingOriginCountry}</span>
            {product.images.length > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{product.images.length} photos</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onSelect}
            className="text-left block mt-1.5 cursor-pointer"
          >
            <h3 className="text-base font-semibold text-[#111111] group-hover:underline underline-offset-4 line-clamp-1">
              {product.title}
            </h3>
          </button>
          <p className="text-xs text-neutral-500 mt-1 truncate">
            {product.supplierName}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E5E2DC] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111111] tabular-nums">
            {priceLabel}
          </span>
          <span className="text-xs text-neutral-500 tabular-nums">
            {product.totalStock > 0 ? inStockText : outOfStockText}
          </span>
        </div>
      </div>
    </article>
  );
};
