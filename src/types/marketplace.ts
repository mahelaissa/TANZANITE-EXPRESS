export type LanguageCode = 'en' | 'sw';

export type UserRole =
  | 'super_admin'
  | 'staff'
  | 'supplier'
  | 'customer'
  | 'delivery_partner';

export type CurrencyCode = 'TZS' | 'USD' | 'GBP' | 'EUR' | 'KES';

export type SupplierStatus =
  | 'REGISTERED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'ARCHIVED';

export type OrderStatus =
  | 'Pending Payment'
  | 'Awaiting Payment Verification'
  | 'Payment Confirmed'
  | 'Awaiting Supplier Confirmation'
  | 'Supplier Confirmed'
  | 'Processing'
  | 'Ready for Shipping'
  | 'Shipped'
  | 'In Transit'
  | 'Delivered'
  | 'Completed'
  | 'Cancellation Requested'
  | 'Cancelled'
  | 'Refund Requested'
  | 'Partially Refunded'
  | 'Refunded';

export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_VERIFICATION'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type PaymentProviderId =
  | 'manual_mobile'
  | 'manual_nmb'
  | 'pesapal'
  | 'selcom'
  | 'azampay'
  | 'stripe'
  | 'manual_bank';

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postalCode?: string;
  isDefault?: boolean;
}

export type PaymentSubmissionStatus =
  | 'PENDING_VERIFICATION'
  | 'INFO_REQUESTED'
  | 'VERIFIED'
  | 'REJECTED';

export type PaymentMethodId = 'manual_mobile' | 'manual_nmb';

export type NotificationType =
  | 'order'
  | 'payment'
  | 'fulfillment'
  | 'return'
  | 'supplier'
  | 'product'
  | 'security'
  | 'system';

export interface StaffPermissions {
  canVerifyPayments?: boolean;
  canManageSettings?: boolean;
  canModerateCatalog?: boolean;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  preferredCurrency: CurrencyCode;
  preferredCountry: string;
  addresses: Address[];
  staffPermissions?: string[];
  permissions?: StaffPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProfile {
  id: string;
  ownerUid: string;
  businessName: string;
  ownerFullName: string;
  email: string;
  phone: string;
  country: string;
  businessAddress: string;
  category: string;
  description: string;
  registrationNumber?: string;
  preferredPayoutMethod: string;
  payoutAccountMasked?: string;
  verificationDocRef?: string;
  documentsVerified: boolean;
  status: SupplierStatus;
  commissionRatePct?: number;
  subscriptionPlan: 'free_standard' | 'commission_standard' | 'growth_featured' | 'enterprise';
  shippingOrigin: string;
  isDevelopmentSeed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  sku: string;
  size: string;
  color: string;
  stock: number;
  priceDeltaUsd?: number;
}

export interface ProductImageMeta {
  id: string;
  productId?: string;
  supplierId: string;
  supplierOwnerUid: string;
  url: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  width?: number;
  height?: number;
  isPrimary?: boolean;
  sortOrder?: number;
  storageProvider: 'local_media' | 'external_url';
  createdAt: string;
}

export interface Product {
  id: string;
  supplierId: string;
  supplierOwnerUid: string;
  supplierName: string;
  supplierCountry: string;
  title: string;
  slug: string;
  brand: string;
  material?: string;
  weightKg?: number;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  category: string;
  description: string;
  images: string[];
  imageMetadata?: ProductImageMeta[];
  videoUrl?: string;
  wholesalePriceUsd: number; // Supplier base price
  sellingPriceUsd: number; // Admin-approved customer retail price
  compareAtPriceUsd?: number;
  variants: ProductVariant[];
  totalStock: number;
  shippingOriginCountry: string;
  shippingDestinations: string[];
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  shippingFeeUsd: number;
  shippingNotes?: string;
  returnPolicySummary: string;
  status: ProductStatus;
  isPublished?: boolean;
  adminRejectionReason?: string;
  adminChangeRequestMessage?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  publishedAt?: string;
  featured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  ratingAvg: number;
  ratingCount: number;
  isDevelopmentSeed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  supplierId: string;
  supplierName: string;
  title: string;
  image: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceUsd: number;
  wholesalePriceUsd: number;
  shippingFeeUsd: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  shippingOriginCountry: string;
}

export interface SuborderItem {
  productId: string;
  title: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitSellingPriceUsd: number;
  unitWholesalePriceUsd: number;
  lineTotalUsd: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface SupplierSuborder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierOwnerUid: string;
  supplierName: string;
  supplierCountry: string;
  customerId: string;
  customerShippingName: string;
  customerShippingCity: string;
  customerShippingCountry: string;
  customerShippingStreet: string;
  customerShippingPhone: string;
  items: SuborderItem[];
  supplierSubtotalUsd: number;
  supplierBaseCostUsd: number;
  adminMarkupUsd: number;
  shippingFeeUsd: number;
  marketplaceCommissionRatePct: number;
  marketplaceCommissionUsd: number;
  supplierNetEarningsUsd: number;
  supplierSettlementStatus?: 'PENDING_ADMIN_TRANSFER' | 'SENT_TO_SUPPLIER';
  supplierSettlementRef?: string;
  supplierPaidAt?: string;
  fulfillmentReleased?: boolean;
  adminExceptionReleased?: boolean;
  adminExceptionReason?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  responseDeadlineAt: string;
  delayedAlertTriggered?: boolean;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  isGuestCheckout: boolean;
  currency: CurrencyCode;
  fxRate: number;
  subtotalUsd: number;
  shippingUsd: number;
  discountUsd: number;
  taxUsd: number;
  totalUsd: number;
  totalDisplay: number;
  couponCode?: string;
  shippingAddress: Address;
  isInternational: boolean;
  customsDisclaimerAccepted: boolean;
  paymentProvider: PaymentProviderId;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  submittedTransactionId?: string;
  submittedPayerPhone?: string;
  submittedPayerName?: string;
  transactionSubmittedAt?: string;
  latestSubmissionId?: string;
  adminVerifiedBy?: string;
  adminVerifiedAt?: string;
  paymentRejectionReason?: string;
  paymentInfoRequestMessage?: string;
  suborderIds: string[];
  overallStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: PaymentProviderId;
  mode: 'test' | 'live' | 'manual';
  reference: string;
  submittedTransactionId?: string;
  idempotencyKey: string;
  amountUsd: number;
  currency: CurrencyCode;
  amountDisplay: number;
  status: PaymentStatus;
  webhookVerified: boolean;
  webhookEvent?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSubmission {
  id: string;
  orderId: string;
  paymentId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  paymentMethod: PaymentMethodId;
  transactionId: string;
  normalizedTransactionId: string;
  amountExpectedDisplay: number;
  amountSentDisplay: number;
  currency: CurrencyCode;
  senderName: string;
  senderPhone?: string;
  transactionDate: string;
  hasReceiptImage: boolean;
  receiptImageDataUrl?: string;
  receiptFileName?: string;
  status: PaymentSubmissionStatus;
  isDuplicateSuspected: boolean;
  duplicateOfSubmissionId?: string;
  duplicateFlagNote?: string;
  amountMismatchFlag: boolean;
  amountMismatchNote?: string;
  adminNotes?: string;
  rejectionReason?: string;
  infoRequestMessage?: string;
  reviewedByUid?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAuditLog {
  id: string;
  paymentId: string;
  submissionId?: string;
  orderId: string;
  action:
    | 'PAYMENT_SUBMITTED'
    | 'PAYMENT_RESUBMITTED'
    | 'DUPLICATE_REFERENCE_FLAGGED'
    | 'PAYMENT_VERIFIED'
    | 'PAYMENT_REJECTED'
    | 'PAYMENT_INFO_REQUESTED'
    | 'SUBORDER_EXCEPTION_RELEASED';
  previousStatus: string;
  newStatus: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  scope: 'global' | 'category' | 'supplier' | 'promotional';
  targetId?: string;
  label: string;
  percentage: number;
  fixedFeeUsd: number;
  active: boolean;
  updatedAt: string;
}

export interface SupplierPayout {
  id: string;
  supplierId: string;
  supplierName: string;
  amountUsd: number;
  currency: CurrencyCode;
  payoutMethod: string;
  accountSummary: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  reference?: string;
  reviewedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  suborderId: string;
  customerId: string;
  customerEmail: string;
  supplierId: string;
  reason: string;
  evidenceImages: string[];
  requestedAmountUsd: number;
  status:
    | 'SUBMITTED'
    | 'EVIDENCE_REQUESTED'
    | 'SUPPLIER_RESPONDED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REFUNDED';
  supplierResponse?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderUsd: number;
  active: boolean;
  usageCount: number;
  expiresAt?: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  isTanzaniaLocal: boolean;
  baseFeeUsd: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  customsNote?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  orderId?: string;
  supplierId?: string;
  category: 'order' | 'supplier' | 'payment' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedStaffEmail?: string;
  responses: { author: string; role: string; message: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: 'in_app' | 'email' | 'whatsapp';
  read: boolean;
  targetType?: 'order' | 'payment_submission' | 'suborder' | 'product' | 'supplier' | 'refund' | 'ticket';
  targetId?: string;
  link?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  uid: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  mutedTypes: NotificationType[];
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface PaymentGatewayStatus {
  id: PaymentProviderId;
  name: string;
  market: 'Tanzania' | 'International';
  methods: string[];
  credentialsConfigured: boolean;
  merchantApproved: boolean;
  mode: 'test' | 'live' | 'manual';
  sandboxAvailableInDev: boolean;
  enabledForCheckout: boolean;
  statusLabel: string;
  instructions?: string;
  accountDetails?: {
    phone?: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    accountName?: string;
  };
  requiredEnvVars: string[];
}

export interface SupplierIntegrationStatus {
  id: 'cjdropshipping' | 'dsers_aliexpress' | 'local_manual';
  name: string;
  type: 'api' | 'manual_portal';
  credentialsConfigured: boolean;
  connectionStatus: 'CONNECTED' | 'AWAITING_CREDENTIALS' | 'MANUAL_ACTIVE';
  requiredEnvVars: string[];
  capabilities: string[];
  syncWarnings: string[];
  documentationNote: string;
}

export interface MarketplaceSettings {
  brandName: string;
  announcementText: string;
  announcementTextSw?: string;
  heroTitle: string;
  heroTitleSw?: string;
  heroSubtitle: string;
  heroSubtitleSw?: string;
  heroCtaText: string;
  heroCtaTextSw?: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  manualPaymentPhone: string;
  manualPaymentBankName: string;
  manualPaymentBankAccount: string;
  manualPaymentAccountName: string;
  officialRecipientName: string;
  mpesaEnabled: boolean;
  mpesaPhone: string;
  mpesaAccountHolder: string;
  mpesaInstructions: string;
  nmbEnabled: boolean;
  nmbAccountName: string;
  nmbAccountNumber: string;
  nmbBranch: string;
  nmbInstructions: string;
  autoReleaseSubordersOnPaymentConfirm: boolean;
  globalCommissionPct: number;
  supplierResponseDeadlineHours: number;
  taxRateTzPct: number;
  taxRateIntlPct: number;
  requireProductApproval: boolean;
  requireSupplierApproval: boolean;
  allowGuestCheckout: boolean;
  currencyRates: Record<CurrencyCode, number>;
  socialLinks: {
    instagram: string;
    tiktok: string;
    whatsapp: string;
  };
  seoTitle: string;
  seoDescription: string;
  announcementEmailEnabled: boolean;
  whatsappApiConfigured: boolean;
  updatedAt: string;
}
