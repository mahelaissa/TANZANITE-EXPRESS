import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { apiFetch } from '../lib/api';
import { formatPrice } from '../lib/currency';
import { auth, googleAuthProvider, testFirestoreConnection } from '../lib/firebase';
import { TRANSLATIONS } from '../lib/i18n';
import {
  CartItem,
  CurrencyCode,
  LanguageCode,
  MarketplaceSettings,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  PaymentGatewayStatus,
  Product,
  Review,
  ShippingZone,
  SupplierProfile,
  UserAccount,
} from '../types/marketplace';

export type ActivePage =
  | 'storefront'
  | 'customer'
  | 'supplier'
  | 'admin'
  | 'track'
  | 'support'
  | 'notifications';

export interface PendingNavTarget {
  page: ActivePage;
  tab?: string;
  targetId?: string;
  ts: number;
}

export interface PublicSupplierSummary {
  id: string;
  businessName: string;
  country: string;
  category: string;
  description: string;
  shippingOrigin: string;
  subscriptionPlan: string;
  isDevelopmentSeed?: boolean;
}

interface BootstrapResponse {
  isDevelopmentMode: boolean;
  settings: MarketplaceSettings;
  categories: { MEN: string[]; WOMEN: string[] };
  suppliers: PublicSupplierSummary[];
  products: Product[];
  reviews: Review[];
  shippingZones: ShippingZone[];
  paymentGateways: PaymentGatewayStatus[];
}

interface MeResponse {
  user: UserAccount;
  supplier: SupplierProfile | null;
  wishlist: string[];
  notifications: NotificationItem[];
}

interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error';
  text: string;
}

interface MarketplaceContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  userAccount: UserAccount | null;
  mySupplier: SupplierProfile | null;
  wishlist: string[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  notificationPreferences: NotificationPreferences | null;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateNotificationPreferences: (
    updates: Partial<Pick<NotificationPreferences, 'inAppEnabled' | 'emailEnabled' | 'mutedTypes'>>
  ) => Promise<void>;
  pendingTarget: PendingNavTarget | null;
  clearPendingTarget: () => void;
  navigateFromNotification: (n: NotificationItem) => Promise<void>;
  isDevelopmentMode: boolean;
  settings: MarketplaceSettings | null;
  categories: { MEN: string[]; WOMEN: string[] };
  suppliers: PublicSupplierSummary[];
  products: Product[];
  reviews: Review[];
  shippingZones: ShippingZone[];
  paymentGateways: PaymentGatewayStatus[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatMoney: (amountUsd: number) => string;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartQty: (sku: string, delta: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  refreshMe: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  toast: (text: string, type?: 'info' | 'success' | 'error') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  loadingStorefront: boolean;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

const CART_STORAGE_KEY = 'mik_fashion_hub_cart_v1';
const CURRENCY_STORAGE_KEY = 'mik_fashion_hub_currency_v1';
const LANGUAGE_STORAGE_KEY = 'mik_fashion_hub_lang_v1';

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [mySupplier, setMySupplier] = useState<SupplierProfile | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences | null>(null);
  const [pendingTarget, setPendingTarget] = useState<PendingNavTarget | null>(null);

  const [isDevelopmentMode, setIsDevelopmentMode] = useState(true);
  const [settings, setSettings] = useState<MarketplaceSettings | null>(null);
  const [categories, setCategories] = useState<{ MEN: string[]; WOMEN: string[] }>({
    MEN: [],
    WOMEN: [],
  });
  const [suppliers, setSuppliers] = useState<PublicSupplierSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayStatus[]>([]);
  const [loadingStorefront, setLoadingStorefront] = useState(true);

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
      if (saved === 'en' || saved === 'sw') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'en';
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
      if (saved && ['TZS', 'USD', 'GBP', 'EUR', 'KES'].includes(saved)) return saved;
    } catch {
      // Ignore storage failures
    }
    return 'TZS';
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as CartItem[];
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('storefront');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [language]
  );

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<BootstrapResponse>('/api/storefront/bootstrap');
      setIsDevelopmentMode(data.isDevelopmentMode);
      setSettings(data.settings);
      setCategories(data.categories);
      setSuppliers(data.suppliers);
      setProducts(data.products);
      setReviews(data.reviews);
      setShippingZones(data.shippingZones);
      setPaymentGateways(data.paymentGateways);
    } catch (err: any) {
      toast(err.message || 'Unable to load storefront catalog', 'error');
    } finally {
      setLoadingStorefront(false);
    }
  }, [toast]);

  const refreshMe = useCallback(async () => {
    if (!auth.currentUser) {
      setUserAccount(null);
      setMySupplier(null);
      setWishlist([]);
      setNotifications([]);
      setNotificationPreferences(null);
      return;
    }
    try {
      const [meData, prefData] = await Promise.all([
        apiFetch<MeResponse>('/api/me'),
        apiFetch<{ preferences: NotificationPreferences }>('/api/notification-preferences').catch(
          () => null
        ),
      ]);
      setUserAccount(meData.user);
      setMySupplier(meData.supplier);
      setWishlist(meData.wishlist);
      setNotifications(meData.notifications);
      if (prefData?.preferences) {
        setNotificationPreferences(prefData.preferences);
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
    }
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    refreshBootstrap();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setAuthReady(true);
      if (u) {
        await refreshMe();
      } else {
        setUserAccount(null);
        setMySupplier(null);
        setWishlist([]);
        setNotifications([]);
        setNotificationPreferences(null);
      }
    });
    return () => unsub();
  }, [refreshBootstrap, refreshMe]);

  // Real-time Server-Sent Events stream for internal notifications
  useEffect(() => {
    if (!firebaseUser) return;
    let closed = false;
    let source: EventSource | null = null;

    firebaseUser
      .getIdToken()
      .then((token) => {
        if (closed) return;
        source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
        source.addEventListener('notification', (evt) => {
          try {
            const incoming = JSON.parse((evt as MessageEvent).data) as NotificationItem;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
            toast(`${incoming.title} — ${incoming.message}`, incoming.type === 'security' ? 'error' : 'info');
          } catch {
            // Ignore malformed SSE payload
          }
        });
      })
      .catch(() => {
        // Ignore stream initialization failures; manual refresh still works
      });

    return () => {
      closed = true;
      source?.close();
    };
  }, [firebaseUser, toast]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    } catch {
      // Best-effort sync
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
    } catch (err: any) {
      toast(err.message || 'Unable to mark notifications read', 'error');
    }
  }, [toast]);

  const updateNotificationPreferences = useCallback(
    async (
      updates: Partial<{
        inAppEnabled: boolean;
        emailEnabled: boolean;
        mutedTypes: NotificationType[];
      }>
    ) => {
      try {
        const res = await apiFetch<{ preferences: NotificationPreferences }>(
          '/api/notification-preferences',
          {
            method: 'PATCH',
            body: JSON.stringify(updates),
          }
        );
        setNotificationPreferences(res.preferences);
        toast('Notification preferences saved.', 'success');
      } catch (err: any) {
        toast(err.message || 'Failed to update preferences', 'error');
      }
    },
    [toast]
  );

  const clearPendingTarget = useCallback(() => {
    setPendingTarget(null);
  }, []);

  const navigateFromNotification = useCallback(
    async (n: NotificationItem) => {
      if (!n.read) {
        await markNotificationRead(n.id);
      }
      const role = userAccount?.role || 'customer';
      let page: ActivePage = 'customer';
      let tab = 'orders';

      if (role === 'super_admin' || role === 'staff') {
        page = 'admin';
        if (n.targetType === 'payment_submission' || n.type === 'payment' || n.type === 'security') {
          tab = 'verification';
        } else if (n.targetType === 'supplier' || n.type === 'supplier') {
          tab = 'suppliers';
        } else if (n.targetType === 'product' || n.type === 'product') {
          tab = 'products';
        } else if (n.targetType === 'refund' || n.type === 'return') {
          tab = 'refunds';
        } else if (n.targetType === 'ticket') {
          tab = 'support';
        } else {
          tab = 'orders';
        }
      } else if (role === 'supplier' && mySupplier) {
        page = 'supplier';
        if (n.targetType === 'product' || n.type === 'product') {
          tab = 'products';
        } else if (n.targetType === 'refund' || n.type === 'return') {
          tab = 'refunds';
        } else if (n.type === 'payment') {
          tab = 'earnings';
        } else if (n.targetType === 'supplier') {
          tab = 'profile';
        } else {
          tab = 'orders';
        }
      } else {
        page = 'customer';
        if (n.targetType === 'refund' || n.type === 'return') {
          tab = 'returns';
        } else if (n.targetType === 'ticket') {
          tab = 'tickets';
        } else {
          tab = 'orders';
        }
      }

      setPendingTarget({ page, tab, targetId: n.targetId, ts: Date.now() });
      setActivePage(page);
    },
    [markNotificationRead, mySupplier, userAccount?.role]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshMe();
      toast('Signed in successfully.', 'success');
    } catch (err: any) {
      toast(err.message || 'Sign-in cancelled or failed', 'error');
    }
  }, [refreshMe, toast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setActivePage('storefront');
    toast('Signed out.', 'info');
  }, [toast]);

  const formatMoney = useCallback(
    (amountUsd: number) => {
      return formatPrice(amountUsd, currency, settings?.currencyRates);
    },
    [currency, settings?.currencyRates]
  );

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.sku === item.sku);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
          return next;
        }
        return [...prev, item];
      });
      toast(`Added ${item.title} to your bag`, 'success');
      setIsCartOpen(true);
    },
    [toast]
  );

  const updateCartQty = useCallback((sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.sku === sku ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((sku: string) => {
    setCart((prev) => prev.filter((item) => item.sku !== sku));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!auth.currentUser) {
        toast('Sign in to save items to your wishlist.', 'info');
        return;
      }
      try {
        const res = await apiFetch<{ wishlist: string[] }>('/api/me/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
        setWishlist(res.wishlist);
        toast(
          res.wishlist.includes(productId) ? 'Saved to wishlist' : 'Removed from wishlist',
          'info'
        );
      } catch (err: any) {
        toast(err.message || 'Failed to update wishlist', 'error');
      }
    },
    [toast]
  );

  return (
    <MarketplaceContext.Provider
      value={{
        firebaseUser,
        authReady,
        userAccount,
        mySupplier,
        wishlist,
        notifications,
        unreadNotificationCount,
        notificationPreferences,
        markNotificationRead,
        markAllNotificationsRead,
        updateNotificationPreferences,
        pendingTarget,
        clearPendingTarget,
        navigateFromNotification,
        isDevelopmentMode,
        settings,
        categories,
        suppliers,
        products,
        reviews,
        shippingZones,
        paymentGateways,
        language,
        setLanguage,
        t,
        currency,
        setCurrency,
        formatMoney,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        selectedProduct,
        setSelectedProduct,
        activePage,
        setActivePage,
        signInWithGoogle,
        logout,
        refreshBootstrap,
        refreshMe,
        toggleWishlist,
        toast,
        toasts,
        dismissToast,
        loadingStorefront,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return ctx;
}
