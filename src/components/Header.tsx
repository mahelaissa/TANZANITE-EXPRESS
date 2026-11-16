import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { CurrencyCode } from '../types/marketplace';

interface HeaderProps {
  onSelectGender: (gender: 'ALL' | 'MEN' | 'WOMEN') => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectGender }) => {
  const {
    settings,
    language,
    setLanguage,
    t,
    currency,
    setCurrency,
    cart,
    setIsCartOpen,
    firebaseUser,
    userAccount,
    signInWithGoogle,
    logout,
    activePage,
    setActivePage,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    navigateFromNotification,
  } = useMarketplace();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [bellMenuOpen, setBellMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isAdminOrStaff =
    userAccount?.role === 'super_admin' || userAccount?.role === 'staff';

  const navigateStorefront = (gender: 'ALL' | 'MEN' | 'WOMEN') => {
    setActivePage('storefront');
    onSelectGender(gender);
    setMobileMenuOpen(false);
    setTimeout(() => {
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const announcement =
    language === 'sw'
      ? settings?.announcementTextSw || settings?.announcementText
      : settings?.announcementText;

  return (
    <div className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E2DC]">
      {!bannerDismissed && announcement && (
        <div className="bg-[#111111] text-[#FAF9F6] px-4 h-8 flex items-center justify-between text-xs">
          <span className="truncate mx-auto">{announcement}</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="text-neutral-400 hover:text-white ml-3 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setActivePage('storefront');
            onSelectGender('ALL');
          }}
          className="font-editorial text-lg sm:text-2xl font-semibold tracking-tight text-[#111111] whitespace-nowrap shrink-0 cursor-pointer"
        >
          MIK FASHION HUB
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-700">
          <button
            type="button"
            onClick={() => navigateStorefront('MEN')}
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('shopMen')}
          </button>
          <button
            type="button"
            onClick={() => navigateStorefront('WOMEN')}
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t('shopWomen')}
          </button>
          <button
            type="button"
            onClick={() => setActivePage('supplier')}
            className={`hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'supplier' ? 'text-[#111111] underline' : ''
            }`}
          >
            {t('sellOnMik')}
          </button>
          <button
            type="button"
            onClick={() => setActivePage('track')}
            className={`hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'track' ? 'text-[#111111] underline' : ''
            }`}
          >
            {t('trackOrder')}
          </button>
          <button
            type="button"
            onClick={() => setActivePage('support')}
            className={`hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'support' ? 'text-[#111111] underline' : ''
            }`}
          >
            {t('support')}
          </button>
        </nav>

        {/* Zone 3: Language Switcher, Currency, Bag, Notifications & Account */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex border border-[#E5E2DC] bg-white text-[11px] font-semibold shrink-0"
          >
            <button
              type="button"
              onClick={() => setLanguage('sw')}
              className={`px-2 py-1.5 cursor-pointer transition-colors ${
                language === 'sw' ? 'bg-[#111111] text-white' : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              SW
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1.5 cursor-pointer transition-colors ${
                language === 'en' ? 'bg-[#111111] text-white' : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              EN
            </button>
          </div>

          <label className="sr-only" htmlFor="currency-switcher">
            Select currency
          </label>
          <select
            id="currency-switcher"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="hidden sm:block border border-[#E5E2DC] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
          >
            <option value="TZS">TZS (Tanzania)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="KES">KES</option>
          </select>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open shopping bag"
            className="inline-flex items-center gap-1.5 border border-[#E5E2DC] bg-white px-2.5 sm:px-3 py-2 text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {t('bag')} ({bagCount})
            </span>
          </button>

          {firebaseUser && (
            <div className="relative">
              <button
                type="button"
                aria-label="Open notifications"
                onClick={() => {
                  setBellMenuOpen((o) => !o);
                  setAccountMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 border border-[#E5E2DC] bg-white px-2.5 py-2 text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotificationCount > 0 && (
                  <span className="font-mono-tabular font-semibold text-[#8B6F47]">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {bellMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E2DC] shadow-lg z-50">
                  <div className="px-4 py-2.5 border-b border-[#E5E2DC] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111111]">
                      {t('notifications')} ({unreadNotificationCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead()}
                      className="text-[11px] text-[#8B6F47] underline cursor-pointer"
                    >
                      {t('markAllRead')}
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E2DC]">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-neutral-500 text-center">
                        {t('noNotificationsYet')}
                      </p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setBellMenuOpen(false);
                            navigateFromNotification(n);
                          }}
                          className={`w-full text-left px-4 py-3 text-xs hover:bg-[#F4F2EE] transition-colors cursor-pointer ${
                            n.read ? 'bg-white' : 'bg-[#FAF9F6]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                            <span className="uppercase font-semibold text-[#8B6F47]">
                              {n.type}
                            </span>
                            <span className="font-mono-tabular">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-semibold text-[#111111] mt-0.5 line-clamp-1">
                            {n.title}
                          </p>
                          <p className="text-neutral-600 mt-0.5 line-clamp-2">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBellMenuOpen(false);
                      setActivePage('notifications');
                    }}
                    className="w-full border-t border-[#E5E2DC] bg-[#FAF9F6] hover:bg-[#F4F2EE] px-4 py-2.5 text-xs font-semibold text-[#111111] text-center cursor-pointer"
                  >
                    {t('viewAllNotifications')}
                  </button>
                </div>
              )}
            </div>
          )}

          {firebaseUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((o) => !o);
                  setBellMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 bg-[#111111] text-white px-3 py-2 text-xs font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline max-w-[96px] truncate">
                  {userAccount?.displayName || t('account')}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E2DC] shadow-lg py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-[#E5E2DC]">
                    <p className="text-xs font-medium text-[#111111] truncate">
                      {userAccount?.email}
                    </p>
                    <p className="text-[11px] text-neutral-500 capitalize">
                      {userAccount?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('customer');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-neutral-800 hover:bg-[#F4F2EE] flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    {t('customerDashboard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('supplier');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-neutral-800 hover:bg-[#F4F2EE] flex items-center gap-2 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    {t('supplierPortal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('notifications');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-neutral-800 hover:bg-[#F4F2EE] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" />
                      {t('notifications')}
                    </span>
                    {unreadNotificationCount > 0 && (
                      <span className="font-mono-tabular text-[11px] font-semibold text-[#8B6F47]">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>
                  {isAdminOrStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePage('admin');
                        setAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#8B6F47] hover:bg-[#F4F2EE] flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t('superAdminConsole')}
                    </button>
                  )}
                  <div className="border-t border-[#E5E2DC] mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      {t('signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="bg-[#111111] text-white px-3.5 py-2 text-xs font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t('signIn')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle mobile menu"
            className="lg:hidden p-2 border border-[#E5E2DC] bg-white text-[#111111]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5E2DC] bg-white px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">{t('marketCurrency')}</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="border border-[#E5E2DC] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="TZS">TZS (Tanzania)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="KES">KES</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => navigateStorefront('MEN')}
              className="text-left px-3 py-2.5 border border-[#E5E2DC]"
            >
              {t('shopMen')}
            </button>
            <button
              type="button"
              onClick={() => navigateStorefront('WOMEN')}
              className="text-left px-3 py-2.5 border border-[#E5E2DC]"
            >
              {t('shopWomen')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('supplier');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2.5 border border-[#E5E2DC]"
            >
              {t('supplierPortal')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('track');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2.5 border border-[#E5E2DC]"
            >
              {t('trackOrder')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePage('support');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2.5 border border-[#E5E2DC]"
            >
              {t('support')}
            </button>
            {firebaseUser && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('customer');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2.5 border border-[#E5E2DC]"
                >
                  {t('customerDashboard')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePage('notifications');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2.5 border border-[#E5E2DC]"
                >
                  {t('notifications')} ({unreadNotificationCount})
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
