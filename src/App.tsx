/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { CustomerDashboard } from './components/CustomerDashboard';
import { Header } from './components/Header';
import { SupportAndLegalPage, TrackOrderPage } from './components/LegalSupportPages';
import { NotificationsPage } from './components/NotificationsPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OfflineBanner } from './components/PWAInstallButton';
import { StorefrontView } from './components/StorefrontView';
import { SupplierDashboard } from './components/SupplierDashboard';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';

const MarketplaceShell: React.FC = () => {
  const { activePage, toasts, dismissToast } = useMarketplace();
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MEN' | 'WOMEN'>('ALL');

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111111]">
      <Header onSelectGender={setGenderFilter} />

      {activePage === 'storefront' && (
        <StorefrontView genderFilter={genderFilter} setGenderFilter={setGenderFilter} />
      )}
      {activePage === 'customer' && <CustomerDashboard />}
      {activePage === 'supplier' && <SupplierDashboard />}
      {activePage === 'admin' && <AdminDashboard />}
      {activePage === 'track' && <TrackOrderPage />}
      {activePage === 'support' && <SupportAndLegalPage />}
      {activePage === 'notifications' && <NotificationsPage />}

      <ProductDetailModal />
      <CartCheckoutDrawer />
      <OfflineBanner />

      {/* Toast Queue */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 text-xs border shadow-md flex items-center justify-between gap-3 ${
              t.type === 'error'
                ? 'bg-red-950 text-white border-red-800'
                : t.type === 'success'
                  ? 'bg-[#111111] text-white border-[#8B6F47]'
                  : 'bg-white text-[#111111] border-[#E5E2DC]'
            }`}
          >
            <span>{t.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <MarketplaceShell />
    </MarketplaceProvider>
  );
}
