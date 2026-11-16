import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { adminDb } from './firebase-admin.ts';
import {
  DEV_SEED_PRODUCTS,
  DEV_SEED_SUPPLIERS,
  INITIAL_COMMISSION_RULES,
  INITIAL_COUPONS,
  INITIAL_SETTINGS,
  INITIAL_SHIPPING_ZONES,
} from './seed-data.ts';
import {
  AuditLog,
  CommissionRule,
  Coupon,
  MarketplaceSettings,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  Order,
  PaymentAuditLog,
  PaymentSubmission,
  PaymentTransaction,
  Product,
  ProductImageMeta,
  RefundRequest,
  Review,
  ShippingZone,
  SupplierPayout,
  SupplierProfile,
  SupplierSuborder,
  SupportTicket,
  UserAccount,
} from '../types/marketplace.ts';

export interface StoreSnapshot {
  users: Record<string, UserAccount>;
  suppliers: Record<string, SupplierProfile>;
  products: Record<string, Product>;
  productImages: Record<string, ProductImageMeta>;
  orders: Record<string, Order>;
  suborders: Record<string, SupplierSuborder>;
  payments: Record<string, PaymentTransaction>;
  paymentSubmissions: Record<string, PaymentSubmission>;
  paymentAuditLogs: Record<string, PaymentAuditLog>;
  commissionRules: Record<string, CommissionRule>;
  payouts: Record<string, SupplierPayout>;
  refunds: Record<string, RefundRequest>;
  reviews: Record<string, Review>;
  coupons: Record<string, Coupon>;
  shippingZones: Record<string, ShippingZone>;
  tickets: Record<string, SupportTicket>;
  notifications: Record<string, NotificationItem>;
  notificationPreferences: Record<string, NotificationPreferences>;
  auditLogs: Record<string, AuditLog>;
  newsletterSubscribers: { email: string; market: string; createdAt: string }[];
  wishlists: Record<string, string[]>;
  settings: MarketplaceSettings;
}

export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(500);

const DATA_DIR = path.resolve(process.cwd(), '.mik-data');
const DATA_FILE = path.join(DATA_DIR, 'marketplace-store.json');

function createInitialStore(): StoreSnapshot {
  const isDev = process.env.NODE_ENV !== 'production';
  const suppliers: Record<string, SupplierProfile> = {};
  const products: Record<string, Product> = {};
  const commissionRules: Record<string, CommissionRule> = {};
  const coupons: Record<string, Coupon> = {};
  const shippingZones: Record<string, ShippingZone> = {};

  for (const r of INITIAL_COMMISSION_RULES) commissionRules[r.id] = r;
  for (const c of INITIAL_COUPONS) coupons[c.id] = c;
  for (const z of INITIAL_SHIPPING_ZONES) shippingZones[z.id] = z;

  if (isDev) {
    for (const s of DEV_SEED_SUPPLIERS) suppliers[s.id] = s;
    for (const p of DEV_SEED_PRODUCTS) products[p.id] = p;
  }

  return {
    users: {},
    suppliers,
    products,
    productImages: {},
    orders: {},
    suborders: {},
    payments: {},
    paymentSubmissions: {},
    paymentAuditLogs: {},
    commissionRules,
    payouts: {},
    refunds: {},
    reviews: {},
    coupons,
    shippingZones,
    tickets: {},
    notifications: {},
    notificationPreferences: {},
    auditLogs: {},
    newsletterSubscribers: [],
    wishlists: {},
    settings: INITIAL_SETTINGS,
  };
}

let memoryStore: StoreSnapshot | null = null;
let firestoreAvailable: boolean | null = null;

function loadLocalStore(): StoreSnapshot {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreSnapshot;
      parsed.productImages = parsed.productImages || {};
      parsed.paymentSubmissions = parsed.paymentSubmissions || {};
      parsed.paymentAuditLogs = parsed.paymentAuditLogs || {};
      parsed.notificationPreferences = parsed.notificationPreferences || {};
      parsed.notifications = parsed.notifications || {};

      // Normalize legacy notifications missing `type`
      for (const n of Object.values(parsed.notifications)) {
        if (!n.type) n.type = 'system';
      }

      const normalizeRecipient = (val: string | undefined, fallback: string): string => {
        const trimmed = (val || '').trim();
        if (!trimmed || trimmed === 'MIK FASHION HUB') return fallback;
        return trimmed;
      };
      const resolvedOfficialRecipient = normalizeRecipient(
        parsed.settings?.officialRecipientName ??
          parsed.settings?.mpesaAccountHolder ??
          parsed.settings?.manualPaymentAccountName,
        INITIAL_SETTINGS.officialRecipientName
      );

      parsed.settings = {
        ...INITIAL_SETTINGS,
        ...(parsed.settings || {}),
        manualPaymentPhone:
          parsed.settings?.mpesaPhone ??
          parsed.settings?.manualPaymentPhone ??
          INITIAL_SETTINGS.manualPaymentPhone,
        manualPaymentBankName:
          parsed.settings?.manualPaymentBankName || INITIAL_SETTINGS.manualPaymentBankName,
        manualPaymentBankAccount:
          parsed.settings?.nmbAccountNumber ??
          parsed.settings?.manualPaymentBankAccount ??
          INITIAL_SETTINGS.manualPaymentBankAccount,
        officialRecipientName: resolvedOfficialRecipient,
        manualPaymentAccountName: resolvedOfficialRecipient,
        mpesaEnabled: parsed.settings?.mpesaEnabled ?? INITIAL_SETTINGS.mpesaEnabled,
        mpesaPhone:
          parsed.settings?.mpesaPhone ??
          parsed.settings?.manualPaymentPhone ??
          INITIAL_SETTINGS.mpesaPhone,
        mpesaAccountHolder: normalizeRecipient(
          parsed.settings?.mpesaAccountHolder ?? parsed.settings?.manualPaymentAccountName,
          resolvedOfficialRecipient
        ),
        mpesaInstructions:
          parsed.settings?.mpesaInstructions || INITIAL_SETTINGS.mpesaInstructions,
        nmbEnabled: parsed.settings?.nmbEnabled ?? INITIAL_SETTINGS.nmbEnabled,
        nmbAccountName: normalizeRecipient(
          parsed.settings?.nmbAccountName ?? parsed.settings?.manualPaymentAccountName,
          resolvedOfficialRecipient
        ),
        nmbAccountNumber:
          parsed.settings?.nmbAccountNumber ??
          parsed.settings?.manualPaymentBankAccount ??
          INITIAL_SETTINGS.nmbAccountNumber,
        nmbBranch: parsed.settings?.nmbBranch || INITIAL_SETTINGS.nmbBranch,
        nmbInstructions: parsed.settings?.nmbInstructions || INITIAL_SETTINGS.nmbInstructions,
        autoReleaseSubordersOnPaymentConfirm:
          parsed.settings?.autoReleaseSubordersOnPaymentConfirm ??
          INITIAL_SETTINGS.autoReleaseSubordersOnPaymentConfirm,
        announcementTextSw: parsed.settings?.announcementTextSw || INITIAL_SETTINGS.announcementTextSw,
        heroTitleSw: parsed.settings?.heroTitleSw || INITIAL_SETTINGS.heroTitleSw,
        heroSubtitleSw: parsed.settings?.heroSubtitleSw || INITIAL_SETTINGS.heroSubtitleSw,
        heroCtaTextSw: parsed.settings?.heroCtaTextSw || INITIAL_SETTINGS.heroCtaTextSw,
        currencyRates: {
          ...INITIAL_SETTINGS.currencyRates,
          ...(parsed.settings?.currencyRates || {}),
        },
        socialLinks: {
          ...INITIAL_SETTINGS.socialLinks,
          ...(parsed.settings?.socialLinks || {}),
        },
      };
      memoryStore = parsed;
      return memoryStore;
    }
  } catch {
    // Fall back to fresh snapshot
  }
  memoryStore = createInitialStore();
  persistLocalStore(memoryStore);
  return memoryStore;
}

function persistLocalStore(store: StoreSnapshot) {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local persistence write skipped:', err);
  }
}

async function syncCollectionToFirestore<T extends object>(
  collectionName: string,
  recordId: string,
  data: T
) {
  if (firestoreAvailable === false) return;
  try {
    await adminDb
      .collection(collectionName)
      .doc(recordId)
      .set(data as Record<string, unknown>, { merge: true });
    firestoreAvailable = true;
  } catch {
    // In headless/local environments without GCP ADC credentials, run reliably on local store
    if (firestoreAvailable === null) {
      firestoreAvailable = false;
    }
  }
}

export async function getStore(): Promise<StoreSnapshot> {
  return loadLocalStore();
}

export async function saveStore(store: StoreSnapshot): Promise<void> {
  persistLocalStore(store);
}

export async function upsertUser(user: UserAccount): Promise<UserAccount> {
  const store = await getStore();
  store.users[user.uid] = user;
  await saveStore(store);
  await syncCollectionToFirestore('users', user.uid, {
    uid: user.uid,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    preferredCurrency: user.preferredCurrency,
    preferredCountry: user.preferredCountry,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
  return user;
}

export async function upsertSupplier(supplier: SupplierProfile): Promise<SupplierProfile> {
  const store = await getStore();
  store.suppliers[supplier.id] = supplier;
  await saveStore(store);
  await syncCollectionToFirestore('suppliers', supplier.id, supplier);
  return supplier;
}

export async function upsertProduct(product: Product): Promise<Product> {
  const store = await getStore();
  store.products[product.id] = product;
  await saveStore(store);
  await syncCollectionToFirestore('products', product.id, product);
  return product;
}

export async function deleteProductRecord(productId: string): Promise<void> {
  const store = await getStore();
  delete store.products[productId];
  await saveStore(store);
  if (firestoreAvailable !== false) {
    try {
      await adminDb.collection('products').doc(productId).delete();
    } catch {
      // Ignore in offline/headless mode
    }
  }
}

export async function upsertProductImage(meta: ProductImageMeta): Promise<ProductImageMeta> {
  const store = await getStore();
  store.productImages[meta.id] = meta;
  await saveStore(store);
  await syncCollectionToFirestore('product_images', meta.id, meta);
  return meta;
}

export async function deleteProductImageRecord(imageId: string): Promise<void> {
  const store = await getStore();
  delete store.productImages[imageId];
  await saveStore(store);
  if (firestoreAvailable !== false) {
    try {
      await adminDb.collection('product_images').doc(imageId).delete();
    } catch {
      // Ignore in offline/headless mode
    }
  }
}

export async function upsertOrder(order: Order): Promise<Order> {
  const store = await getStore();
  store.orders[order.id] = order;
  await saveStore(store);
  await syncCollectionToFirestore('orders', order.id, order);
  return order;
}

export async function upsertSuborder(suborder: SupplierSuborder): Promise<SupplierSuborder> {
  const store = await getStore();
  store.suborders[suborder.id] = suborder;
  await saveStore(store);
  await syncCollectionToFirestore('suborders', suborder.id, suborder);
  return suborder;
}

export async function upsertPayment(payment: PaymentTransaction): Promise<PaymentTransaction> {
  const store = await getStore();
  store.payments[payment.id] = payment;
  await saveStore(store);
  await syncCollectionToFirestore('payments', payment.id, payment);
  return payment;
}

export async function upsertPaymentSubmission(
  submission: PaymentSubmission
): Promise<PaymentSubmission> {
  const store = await getStore();
  store.paymentSubmissions[submission.id] = submission;
  await saveStore(store);
  // Store metadata in Firestore without dumping large raw receipt image blobs in collection queries
  const { receiptImageDataUrl: _omit, ...metadata } = submission;
  await syncCollectionToFirestore('payment_submissions', submission.id, metadata);
  return submission;
}

export async function appendPaymentAuditLog(params: {
  paymentId: string;
  submissionId?: string;
  orderId: string;
  action: PaymentAuditLog['action'];
  previousStatus: string;
  newStatus: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<PaymentAuditLog> {
  const store = await getStore();
  const id = `pal_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const entry: PaymentAuditLog = {
    id,
    ...params,
    createdAt: new Date().toISOString(),
  };
  store.paymentAuditLogs[id] = entry;
  await saveStore(store);
  await syncCollectionToFirestore('payment_audit_logs', id, entry);
  return entry;
}

export async function appendAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}): Promise<AuditLog> {
  const store = await getStore();
  const id = `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const entry: AuditLog = {
    id,
    ...params,
    createdAt: new Date().toISOString(),
  };
  store.auditLogs[id] = entry;
  await saveStore(store);
  await syncCollectionToFirestore('audit_logs', id, entry);
  return entry;
}

export function getUserNotificationPreferences(
  store: StoreSnapshot,
  uid: string
): NotificationPreferences {
  return (
    store.notificationPreferences[uid] || {
      uid,
      inAppEnabled: true,
      emailEnabled: true,
      mutedTypes: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function upsertNotificationPreferences(
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const store = await getStore();
  store.notificationPreferences[prefs.uid] = prefs;
  await saveStore(store);
  await syncCollectionToFirestore('notification_preferences', prefs.uid, prefs);
  return prefs;
}

export async function createNotification(params: {
  recipientUid: string;
  type?: NotificationType;
  title: string;
  message: string;
  channel?: 'in_app' | 'email' | 'whatsapp';
  targetType?: NotificationItem['targetType'];
  targetId?: string;
  link?: string;
}): Promise<NotificationItem | null> {
  const store = await getStore();
  const type: NotificationType = params.type || 'system';
  const prefs = getUserNotificationPreferences(store, params.recipientUid);

  // Critical security and payment alerts are always delivered in-app; user mutes apply cleanly to non-security alerts
  if (!prefs.inAppEnabled && type !== 'security') {
    return null;
  }
  if (prefs.mutedTypes.includes(type) && type !== 'security') {
    return null;
  }

  const id = `ntf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item: NotificationItem = {
    id,
    recipientUid: params.recipientUid,
    type,
    title: params.title,
    message: params.message,
    channel: params.channel || 'in_app',
    read: false,
    targetType: params.targetType,
    targetId: params.targetId,
    link: params.link,
    createdAt: new Date().toISOString(),
  };
  store.notifications[id] = item;
  await saveStore(store);
  await syncCollectionToFirestore('notifications', id, item);

  // Emit real-time event for active SSE subscribers
  notificationEvents.emit(`user:${params.recipientUid}`, item);
  return item;
}

export async function markNotificationAsRead(
  uid: string,
  notificationId: string
): Promise<NotificationItem | null> {
  const store = await getStore();
  const item = store.notifications[notificationId];
  if (!item || item.recipientUid !== uid) return null;
  if (!item.read) {
    item.read = true;
    await saveStore(store);
    await syncCollectionToFirestore('notifications', item.id, { read: true });
  }
  return item;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}
