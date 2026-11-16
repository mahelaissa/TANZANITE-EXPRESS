import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  HelpCircle,
  LifeBuoy,
  Megaphone,
  Percent,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Users,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { apiFetch } from '../lib/api';
import { SafeImage } from './SafeImage';
import {
  AuditLog,
  CommissionRule,
  Coupon,
  MarketplaceSettings,
  Order,
  PaymentAuditLog,
  PaymentGatewayStatus,
  PaymentSubmission,
  PaymentTransaction,
  Product,
  RefundRequest,
  ShippingZone,
  SupplierIntegrationStatus,
  SupplierPayout,
  SupplierProfile,
  SupplierSuborder,
  SupportTicket,
  UserAccount,
} from '../types/marketplace';

type AdminTab =
  | 'overview'
  | 'verification'
  | 'suppliers'
  | 'products'
  | 'orders'
  | 'finance'
  | 'refunds'
  | 'marketing'
  | 'support'
  | 'users'
  | 'settings'
  | 'audit';

interface AdminPayload {
  kpis: {
    totalCustomers: number;
    approvedSuppliers: number;
    pendingSuppliers: number;
    totalProducts: number;
    pendingProducts: number;
    totalOrders: number;
    awaitingFulfillment: number;
    completedOrders: number;
    cancelledOrders: number;
    refundRequests: number;
    grossSalesUsd: number;
    commissionEarningsUsd: number;
    supplierEarningsUsd: number;
    awaitingPaymentVerification?: number;
    delayedSubordersCount: number;
    lowStockCount: number;
  };
  users: UserAccount[];
  suppliers: SupplierProfile[];
  products: Product[];
  orders: Order[];
  suborders: SupplierSuborder[];
  payments: PaymentTransaction[];
  paymentSubmissions: PaymentSubmission[];
  paymentAuditLogs: PaymentAuditLog[];
  payouts: SupplierPayout[];
  refunds: RefundRequest[];
  tickets: SupportTicket[];
  commissionRules: CommissionRule[];
  coupons: Coupon[];
  shippingZones: ShippingZone[];
  settings: MarketplaceSettings;
  paymentGateways: PaymentGatewayStatus[];
  supplierIntegrations: SupplierIntegrationStatus[];
  delayedSuborders: SupplierSuborder[];
  lowStockProducts: Product[];
  auditLogs: AuditLog[];
}

export const AdminDashboard: React.FC = () => {
  const {
    userAccount,
    formatMoney,
    refreshBootstrap,
    pendingTarget,
    clearPendingTarget,
    t,
    toast,
  } = useMarketplace();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(false);

  // Payment verification filter & review state
  const [verifQuery, setVerifQuery] = useState('');
  const [verifStatus, setVerifStatus] = useState('ALL');
  const [verifMethod, setVerifMethod] = useState('ALL');
  const [verifDateFrom, setVerifDateFrom] = useState('');
  const [verifDateTo, setVerifDateTo] = useState('');
  const [filteredSubmissions, setFilteredSubmissions] = useState<PaymentSubmission[] | null>(null);
  const [filteredPaymentLogs, setFilteredPaymentLogs] = useState<PaymentAuditLog[] | null>(null);
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifReasons, setVerifReasons] = useState<Record<string, string>>({});
  const [verifNotes, setVerifNotes] = useState<Record<string, string>>({});
  const [receiptPreview, setReceiptPreview] = useState<{
    submissionId: string;
    fileName?: string;
    dataUrl: string;
  } | null>(null);
  const [exceptionModalSub, setExceptionModalSub] = useState<SupplierSuborder | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');

  // Product moderation & pricing state
  const [productStatusFilter, setProductStatusFilter] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [inspectImageIdx, setInspectImageIdx] = useState(0);
  const [moderationReasonInput, setModerationReasonInput] = useState('');
  const [inspectZoomUrl, setInspectZoomUrl] = useState<string | null>(null);

  // Forms & interactive controls
  const [commissionOverrideInputs, setCommissionOverrideInputs] = useState<Record<string, string>>(
    {}
  );
  const [retailPriceInputs, setRetailPriceInputs] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [settlementRefs, setSettlementRefs] = useState<Record<string, string>>({});
  const [newRule, setNewRule] = useState({
    scope: 'category' as 'global' | 'category' | 'supplier' | 'promotional',
    targetId: '',
    label: '',
    percentage: 12,
  });
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 10,
    minOrderUsd: 30,
  });
  const [announcement, setAnnouncement] = useState({
    audience: 'all' as 'all' | 'suppliers' | 'customers',
    title: '',
    message: '',
  });
  const [settingsDraft, setSettingsDraft] = useState<MarketplaceSettings | null>(null);
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});

  // Confirmation dialog state for destructive / financial actions
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const canVerifyPayments =
    userAccount?.role === 'super_admin' || userAccount?.permissions?.canVerifyPayments === true;

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminPayload>('/api/admin/dashboard');
      setData(res);
      setSettingsDraft(res.settings);
      setFilteredSubmissions(null);
      setFilteredPaymentLogs(null);
    } catch (err: any) {
      toast(err.message || 'Unable to load admin console', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredSubmissions = async (opts?: {
    q?: string;
    status?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    if (!canVerifyPayments) return;
    setVerifLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', opts?.status ?? verifStatus);
      params.set('method', opts?.method ?? verifMethod);
      const qVal = (opts?.q ?? verifQuery).trim();
      const df = (opts?.dateFrom ?? verifDateFrom).trim();
      const dt = (opts?.dateTo ?? verifDateTo).trim();
      if (qVal) params.set('q', qVal);
      if (df) params.set('dateFrom', df);
      if (dt) params.set('dateTo', dt);
      const res = await apiFetch<{
        submissions: PaymentSubmission[];
        paymentAuditLogs: PaymentAuditLog[];
      }>(`/api/admin/payment-submissions?${params.toString()}`);
      setFilteredSubmissions(res.submissions);
      setFilteredPaymentLogs(res.paymentAuditLogs);
    } catch (err: any) {
      toast(err.message || 'Unable to filter payment submissions', 'error');
    } finally {
      setVerifLoading(false);
    }
  };

  const openReceiptPreview = async (submissionId: string) => {
    try {
      const res = await apiFetch<{
        submissionId: string;
        receiptFileName?: string;
        receiptImageDataUrl: string;
      }>(`/api/payment-submissions/${submissionId}/receipt`);
      setReceiptPreview({
        submissionId: res.submissionId,
        fileName: res.receiptFileName,
        dataUrl: res.receiptImageDataUrl,
      });
    } catch (err: any) {
      toast(err.message || 'Unable to load payment receipt', 'error');
    }
  };

  useEffect(() => {
    if (userAccount?.role === 'super_admin' || userAccount?.role === 'staff') {
      loadAdmin();
    }
  }, [userAccount?.role]);

  useEffect(() => {
    if (pendingTarget?.page === 'admin' && pendingTarget.tab) {
      const targetTab = pendingTarget.tab as AdminTab;
      if (targetTab === 'verification' && !canVerifyPayments) {
        setTab('orders');
      } else {
        setTab(targetTab);
      }
      clearPendingTarget();
    }
  }, [pendingTarget, canVerifyPayments, clearPendingTarget]);

  if (userAccount?.role !== 'super_admin' && userAccount?.role !== 'staff') {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white border border-[#E5E2DC] p-8 text-center">
        <ShieldAlert className="w-8 h-8 text-red-700 mx-auto mb-3" />
        <h2 className="font-editorial text-3xl font-semibold">Restricted Admin Console</h2>
        <p className="text-xs text-neutral-600 mt-2">
          Super Admin or authorized Staff credentials are required to access marketplace controls.
        </p>
      </div>
    );
  }

  const downloadCsv = async (type: string) => {
    try {
      const csv = await apiFetch<string>(`/api/admin/export/${type}`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mik-fashion-hub-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${type} CSV report.`, 'success');
    } catch (err: any) {
      toast(err.message || 'CSV export failed', 'error');
    }
  };

  const nav: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: t('overviewTab'), icon: <Activity className="w-4 h-4" /> },
    ...(canVerifyPayments
      ? [
          {
            id: 'verification' as AdminTab,
            label: t('paymentVerificationTab'),
            icon: <CreditCard className="w-4 h-4" />,
            badge: data?.kpis.awaitingPaymentVerification || 0,
          },
        ]
      : []),
    { id: 'suppliers', label: t('suppliersTab'), icon: <Store className="w-4 h-4" /> },
    { id: 'products', label: t('productsTab'), icon: <Boxes className="w-4 h-4" /> },
    { id: 'orders', label: t('adminOrdersTab'), icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'finance', label: t('financeTab'), icon: <DollarSign className="w-4 h-4" /> },
    { id: 'refunds', label: t('refundsTab'), icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'marketing', label: t('marketingTab'), icon: <Tag className="w-4 h-4" /> },
    { id: 'support', label: t('supportTab'), icon: <LifeBuoy className="w-4 h-4" /> },
    { id: 'users', label: t('usersTab'), icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: t('settingsTab'), icon: <Settings className="w-4 h-4" /> },
    { id: 'audit', label: t('auditTab'), icon: <FileText className="w-4 h-4" /> },
  ];

  const displayedSubmissions = filteredSubmissions ?? data?.paymentSubmissions ?? [];
  const displayedPaymentLogs = filteredPaymentLogs ?? data?.paymentAuditLogs ?? [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 grid lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 bg-white border border-[#E5E2DC] p-4 h-fit">
        <div className="pb-4 mb-3 border-b border-[#E5E2DC]">
          <p className="text-xs text-[#8B6F47] uppercase tracking-wider">{t('adminControlCenter')}</p>
          <p className="text-sm font-semibold text-[#111111] mt-0.5 truncate">
            {userAccount.email}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5 uppercase">
            {userAccount.role === 'super_admin'
              ? 'Super Admin'
              : canVerifyPayments
              ? 'Staff · Payment Verifier'
              : 'Staff'}
          </p>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setTab(n.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium text-left cursor-pointer ${
                tab === n.id
                  ? 'bg-[#111111] text-white'
                  : 'text-neutral-700 hover:bg-[#F4F2EE]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {n.icon}
                <span>{n.label}</span>
              </span>
              {typeof n.badge === 'number' && n.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono-tabular font-semibold ${
                    tab === n.id ? 'bg-white text-[#111111]' : 'bg-[#8B6F47] text-white'
                  }`}
                >
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <section className="lg:col-span-9 space-y-6">
        <div className="bg-white border border-[#E5E2DC] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-500">
            Admin Console / <span className="text-[#111111] font-medium capitalize">{tab}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['payments', 'orders', 'suborders', 'suppliers', 'products'] as const).map((exp) => (
              <button
                key={exp}
                type="button"
                onClick={() => downloadCsv(exp)}
                className="inline-flex items-center gap-1 border border-[#E5E2DC] px-2.5 py-1.5 text-[11px] font-medium hover:border-[#111111] cursor-pointer"
              >
                <Download className="w-3 h-3" /> {exp}.csv
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="bg-white border border-[#E5E2DC] p-8 text-xs text-neutral-500">
            Loading marketplace intelligence...
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Gross Sales', val: formatMoney(data.kpis.grossSalesUsd) },
                    { label: t('adminProfitLabel'), val: formatMoney(data.kpis.commissionEarningsUsd) },
                    { label: 'Supplier Earnings', val: formatMoney(data.kpis.supplierEarningsUsd) },
                    {
                      label: t('awaitingTxVerificationKpi'),
                      val: data.kpis.awaitingPaymentVerification ?? 0,
                    },
                    { label: 'Total Orders', val: data.kpis.totalOrders },
                    { label: 'Awaiting Fulfillment', val: data.kpis.awaitingFulfillment },
                    { label: 'Approved Suppliers', val: data.kpis.approvedSuppliers },
                    { label: 'Pending Suppliers', val: data.kpis.pendingSuppliers },
                    { label: 'Total Products', val: data.kpis.totalProducts },
                    { label: 'Pending Products', val: data.kpis.pendingProducts },
                    { label: 'Open Refunds', val: data.kpis.refundRequests },
                    { label: 'Customers', val: data.kpis.totalCustomers },
                  ].map((m) => (
                    <div key={m.label} className="bg-white border border-[#E5E2DC] p-4">
                      <p className="text-[11px] uppercase text-neutral-500">{m.label}</p>
                      <p className="text-xl font-semibold tabular-nums mt-1 text-[#111111]">
                        {m.val}
                      </p>
                    </div>
                  ))}
                </div>

                {(data.delayedSuborders.length > 0 || data.lowStockProducts.length > 0) && (
                  <div className="bg-amber-50 border border-amber-200 p-5 text-xs space-y-2">
                    <p className="font-semibold text-amber-950">Operational Alerts</p>
                    {data.delayedSuborders.length > 0 && (
                      <p className="text-amber-900">
                        {data.delayedSuborders.length} suborder(s) exceeded supplier confirmation SLA deadline.
                      </p>
                    )}
                    {data.lowStockProducts.length > 0 && (
                      <p className="text-amber-900">
                        {data.lowStockProducts.length} product(s) have low stock (≤ 5 units total):{' '}
                        {data.lowStockProducts.map((p) => p.title).join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-white border border-[#E5E2DC] p-5 space-y-3">
                  <h3 className="font-editorial text-xl font-semibold">
                    Active Manual Payment Channels
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    {data.paymentGateways.map((gw) => (
                      <div key={gw.id} className="border border-[#E5E2DC] p-3 bg-[#FAF9F6] space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>{gw.name}</span>
                          <span>{gw.enabledForCheckout ? 'ACTIVE' : 'DISABLED'}</span>
                        </div>
                        <p className="text-[#8B6F47]">{gw.statusLabel}</p>
                        {gw.accountDetails?.accountName && (
                          <p className="font-medium text-[#111111]">
                            {gw.id === 'manual_mobile' ? 'Recipient Name' : 'Account Holder'}:{' '}
                            {gw.accountDetails.accountName}
                          </p>
                        )}
                        {gw.accountDetails?.phone && (
                          <p className="font-mono-tabular text-neutral-700">
                            Phone: {gw.accountDetails.phone}
                          </p>
                        )}
                        {gw.accountDetails?.bankAccount && (
                          <p className="font-mono-tabular text-neutral-700">
                            {gw.accountDetails.bankName || 'NMB Bank'}: {gw.accountDetails.bankAccount}
                            {gw.accountDetails.bankBranch ? ` (${gw.accountDetails.bankBranch})` : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'verification' && canVerifyPayments && (
              <div className="space-y-6">
                {/* Summary KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Pending Verification',
                      val: data.paymentSubmissions.filter((s) => s.status === 'PENDING_VERIFICATION')
                        .length,
                    },
                    {
                      label: 'Info Requested',
                      val: data.paymentSubmissions.filter((s) => s.status === 'INFO_REQUESTED').length,
                    },
                    {
                      label: 'Flagged Warnings',
                      val: data.paymentSubmissions.filter(
                        (s) => s.isDuplicateSuspected || s.amountMismatchFlag
                      ).length,
                    },
                    {
                      label: 'Verified Payments',
                      val: data.paymentSubmissions.filter((s) => s.status === 'VERIFIED').length,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-[#E5E2DC] p-4">
                      <p className="text-[11px] uppercase text-neutral-500">{stat.label}</p>
                      <p className="text-xl font-semibold tabular-nums mt-1 text-[#111111]">
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white border border-[#E5E2DC] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-editorial text-2xl font-semibold">
                        {t('paymentVerificationTab')}
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Cross-check customer M-Pesa SMS and NMB Bank statements before approving or releasing supplier fulfillment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadCsv('payments')}
                      className="inline-flex items-center gap-1.5 border border-[#111111] px-3 py-2 text-xs font-medium hover:bg-[#111111] hover:text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> {t('exportPaymentsCsv')}
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      fetchFilteredSubmissions();
                    }}
                    className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs"
                  >
                    <div className="lg:col-span-2 relative">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                      <input
                        placeholder="Order ID, email, sender, or Transaction ID..."
                        value={verifQuery}
                        onChange={(e) => setVerifQuery(e.target.value)}
                        className="w-full border border-[#E5E2DC] pl-8 pr-3 py-2 bg-[#FAF9F6]"
                      />
                    </div>
                    <select
                      value={verifStatus}
                      onChange={(e) => {
                        setVerifStatus(e.target.value);
                        fetchFilteredSubmissions({ status: e.target.value });
                      }}
                      className="border border-[#E5E2DC] px-2.5 py-2 bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                      <option value="INFO_REQUESTED">Info Requested</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <select
                      value={verifMethod}
                      onChange={(e) => {
                        setVerifMethod(e.target.value);
                        fetchFilteredSubmissions({ method: e.target.value });
                      }}
                      className="border border-[#E5E2DC] px-2.5 py-2 bg-white"
                    >
                      <option value="ALL">All Methods</option>
                      <option value="manual_mobile">M-Pesa (Tanzania)</option>
                      <option value="manual_nmb">NMB Bank Transfer</option>
                    </select>
                    <input
                      type="date"
                      value={verifDateFrom}
                      onChange={(e) => setVerifDateFrom(e.target.value)}
                      aria-label="Date from"
                      className="border border-[#E5E2DC] px-2.5 py-2 bg-white"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={verifDateTo}
                        onChange={(e) => setVerifDateTo(e.target.value)}
                        aria-label="Date to"
                        className="w-full border border-[#E5E2DC] px-2.5 py-2 bg-white"
                      />
                      <button
                        type="submit"
                        className="bg-[#111111] text-white px-3 py-2 font-medium cursor-pointer shrink-0"
                      >
                        Filter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifQuery('');
                          setVerifStatus('ALL');
                          setVerifMethod('ALL');
                          setVerifDateFrom('');
                          setVerifDateTo('');
                          setFilteredSubmissions(null);
                          setFilteredPaymentLogs(null);
                        }}
                        className="border border-[#E5E2DC] px-2.5 py-2 cursor-pointer shrink-0"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {/* Submissions list */}
                  {verifLoading ? (
                    <p className="text-xs text-neutral-500 py-4">Searching payment submissions...</p>
                  ) : displayedSubmissions.length === 0 ? (
                    <div className="border border-[#E5E2DC] bg-[#FAF9F6] p-6 text-center text-xs text-neutral-500">
                      No payment submissions match the selected filters.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayedSubmissions.map((sub) => {
                        const isFinalVerified = sub.status === 'VERIFIED';
                        const statusStyle =
                          sub.status === 'VERIFIED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : sub.status === 'REJECTED'
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : sub.status === 'INFO_REQUESTED'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-[#F4F2EE] border-[#E5E2DC] text-[#111111]';

                        return (
                          <div
                            key={sub.id}
                            className="border border-[#E5E2DC] bg-[#FAF9F6] p-4 text-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono-tabular font-semibold text-sm text-[#111111]">
                                    {sub.transactionId}
                                  </span>
                                  <span className={`px-2 py-0.5 border text-[11px] font-semibold ${statusStyle}`}>
                                    {sub.status}
                                  </span>
                                  <span className="px-2 py-0.5 border border-[#E5E2DC] bg-white text-[11px] font-medium">
                                    {sub.paymentMethod === 'manual_mobile'
                                      ? t('mobilePayLabel')
                                      : t('bankPayLabel')}
                                  </span>
                                </div>
                                <p className="text-neutral-600">
                                  Order <span className="font-mono-tabular font-semibold text-[#111111]">{sub.orderId}</span> · Submission{' '}
                                  <span className="font-mono-tabular">{sub.id}</span> · {sub.customerName} ({sub.customerEmail})
                                </p>
                              </div>

                              <div className="text-right tabular-nums">
                                <p className="text-neutral-500">
                                  Expected:{' '}
                                  <strong className="text-[#111111]">
                                    {sub.currency} {sub.amountExpectedDisplay.toLocaleString()}
                                  </strong>
                                </p>
                                <p className="text-neutral-700">
                                  Sent:{' '}
                                  <strong className={sub.amountMismatchFlag ? 'text-red-700' : 'text-emerald-800'}>
                                    {sub.currency} {sub.amountSentDisplay.toLocaleString()}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-3 bg-white border border-[#E5E2DC] p-3">
                              <div>
                                <p className="text-[11px] text-neutral-500">Sender Name & Phone</p>
                                <p className="font-medium text-[#111111]">
                                  {sub.senderName}
                                  {sub.senderPhone ? ` · ${sub.senderPhone}` : ''}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-neutral-500">Transaction Date & Submitted At</p>
                                <p className="font-mono-tabular text-[#111111]">
                                  {sub.transactionDate} · {new Date(sub.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2">
                                {sub.hasReceiptImage ? (
                                  <button
                                    type="button"
                                    onClick={() => openReceiptPreview(sub.id)}
                                    className="inline-flex items-center gap-1.5 border border-[#111111] bg-white px-3 py-1.5 font-medium hover:bg-[#111111] hover:text-white cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> {t('viewReceipt')}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-neutral-400">No receipt image attached</span>
                                )}
                              </div>
                            </div>

                            {/* Security / Mismatch Alerts */}
                            {(sub.isDuplicateSuspected || sub.amountMismatchFlag) && (
                              <div className="bg-amber-50 border border-amber-300 p-3 text-amber-950 space-y-1">
                                {sub.isDuplicateSuspected && (
                                  <p className="font-semibold">
                                    {t('duplicateWarning')}: {sub.duplicateFlagNote || `Duplicate reference ${sub.transactionId} flagged across orders.`}
                                  </p>
                                )}
                                {sub.amountMismatchFlag && (
                                  <p className="font-semibold">
                                    {t('amountMismatchWarning')}: {sub.amountMismatchNote}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Decision History on this submission */}
                            {(sub.reviewedByEmail || sub.rejectionReason || sub.infoRequestMessage) && (
                              <div className="bg-white border border-[#E5E2DC] p-3 text-[11px] space-y-1">
                                {sub.reviewedByEmail && (
                                  <p className="text-neutral-600">
                                    Reviewed by <strong>{sub.reviewedByEmail}</strong> on{' '}
                                    {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleString() : '—'}
                                  </p>
                                )}
                                {sub.rejectionReason && (
                                  <p className="text-red-700 font-medium">
                                    Rejection Reason: {sub.rejectionReason}
                                  </p>
                                )}
                                {sub.infoRequestMessage && (
                                  <p className="text-amber-800 font-medium">
                                    Requested Info: {sub.infoRequestMessage}
                                  </p>
                                )}
                                {sub.adminNotes && (
                                  <p className="text-neutral-600">Admin Note: {sub.adminNotes}</p>
                                )}
                              </div>
                            )}

                            {/* Review Actions */}
                            {!isFinalVerified && (
                              <div className="pt-2 border-t border-[#E5E2DC] space-y-2">
                                <div className="grid sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder={t('mandatoryReasonHint')}
                                    value={verifReasons[sub.id] || ''}
                                    onChange={(e) =>
                                      setVerifReasons({ ...verifReasons, [sub.id]: e.target.value })
                                    }
                                    className="border border-[#E5E2DC] px-3 py-1.5 bg-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Optional internal verification note (e.g., Matched M-Pesa SMS)"
                                    value={verifNotes[sub.id] || ''}
                                    onChange={(e) =>
                                      setVerifNotes({ ...verifNotes, [sub.id]: e.target.value })
                                    }
                                    className="border border-[#E5E2DC] px-3 py-1.5 bg-white"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: `Approve Payment ${sub.transactionId}?`,
                                        message: `Confirm you verified ${sub.currency} ${sub.amountSentDisplay.toLocaleString()} received via ${
                                          sub.paymentMethod === 'manual_mobile' ? 'M-Pesa' : 'NMB Bank'
                                        } for order ${sub.orderId}?`,
                                        onConfirm: async () => {
                                          await apiFetch(`/api/admin/payment-submissions/${sub.id}/verify`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({
                                              action: 'APPROVE',
                                              adminNotes: verifNotes[sub.id]?.trim() || undefined,
                                            }),
                                          });
                                          await loadAdmin();
                                          if (filteredSubmissions) await fetchFilteredSubmissions();
                                          toast('Payment verified & approved.', 'success');
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-3.5 py-1.5 font-medium cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('approvePaymentBtn')}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const reason = (verifReasons[sub.id] || '').trim();
                                      if (reason.length < 5) {
                                        toast('Enter a clear rejection reason (minimum 5 characters).', 'error');
                                        return;
                                      }
                                      await apiFetch(`/api/admin/payment-submissions/${sub.id}/verify`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          action: 'REJECT',
                                          reason,
                                          adminNotes: verifNotes[sub.id]?.trim() || undefined,
                                        }),
                                      });
                                      await loadAdmin();
                                      if (filteredSubmissions) await fetchFilteredSubmissions();
                                      toast('Payment rejected and customer notified.', 'info');
                                    }}
                                    className="inline-flex items-center gap-1.5 border border-red-300 bg-white text-red-700 px-3.5 py-1.5 font-medium cursor-pointer hover:bg-red-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> {t('rejectPaymentBtn')}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const msg = (verifReasons[sub.id] || '').trim();
                                      if (msg.length < 5) {
                                        toast('Enter specific information requested from customer (min 5 chars).', 'error');
                                        return;
                                      }
                                      await apiFetch(`/api/admin/payment-submissions/${sub.id}/verify`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          action: 'REQUEST_INFO',
                                          reason: msg,
                                          adminNotes: verifNotes[sub.id]?.trim() || undefined,
                                        }),
                                      });
                                      await loadAdmin();
                                      if (filteredSubmissions) await fetchFilteredSubmissions();
                                      toast('Clarification request sent to customer.', 'info');
                                    }}
                                    className="inline-flex items-center gap-1.5 border border-[#E5E2DC] bg-white text-[#111111] px-3.5 py-1.5 font-medium cursor-pointer hover:border-[#111111]"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" /> {t('requestInfoBtn')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment Audit Trail */}
                <div className="bg-white border border-[#E5E2DC] p-5 space-y-3">
                  <h4 className="font-editorial text-xl font-semibold">
                    Payment Verification Audit Trail ({displayedPaymentLogs.length})
                  </h4>
                  {displayedPaymentLogs.length === 0 ? (
                    <p className="text-xs text-neutral-500">No payment verification audit events recorded yet.</p>
                  ) : (
                    <div className="space-y-2 text-xs max-h-96 overflow-y-auto">
                      {displayedPaymentLogs.map((log) => (
                        <div key={log.id} className="border border-[#E5E2DC] bg-[#FAF9F6] p-3">
                          <div className="flex flex-wrap justify-between gap-2 font-medium">
                            <span>
                              {log.action} · Order <span className="font-mono-tabular">{log.orderId}</span> ({log.previousStatus} → {log.newStatus})
                            </span>
                            <span className="font-mono-tabular text-neutral-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-neutral-600 mt-1">
                            Actor: {log.actorEmail} ({log.actorRole})
                            {log.reason ? ` · Reason: ${log.reason}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'suppliers' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                <h3 className="font-editorial text-2xl font-semibold">
                  Supplier Applications & Accounts ({data.suppliers.length})
                </h3>
                <div className="space-y-3">
                  {data.suppliers.map((s) => (
                    <div key={s.id} className="border border-[#E5E2DC] p-4 bg-[#FAF9F6] text-xs space-y-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-[#111111]">
                            {s.businessName} ({s.country})
                          </p>
                          <p className="text-neutral-500">
                            Owner: {s.ownerFullName} · {s.email} · {s.phone}
                          </p>
                          <p className="text-neutral-500">
                            Reg/TIN: {s.registrationNumber || 'Not provided'} · Doc:{' '}
                            {s.verificationDocRef || 'None'} · Verified:{' '}
                            {s.documentsVerified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <span className="font-semibold text-[#8B6F47]">{s.status}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E2DC]">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/suppliers/${s.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'APPROVED', documentsVerified: true }),
                            });
                            loadAdmin();
                            refreshBootstrap();
                          }}
                          className="bg-emerald-700 text-white px-3 py-1.5 cursor-pointer"
                        >
                          Approve & Verify
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              title: `Suspend ${s.businessName}?`,
                              message:
                                'Suspended suppliers cannot publish new items or receive new orders. Financial audit history is preserved.',
                              onConfirm: async () => {
                                await apiFetch(`/api/admin/suppliers/${s.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: 'SUSPENDED' }),
                                });
                                loadAdmin();
                                refreshBootstrap();
                              },
                            })
                          }
                          className="border border-red-300 text-red-700 px-3 py-1.5 cursor-pointer"
                        >
                          Suspend
                        </button>
                        <div className="flex items-center gap-1 ml-auto">
                          <Percent className="w-3.5 h-3.5 text-neutral-400" />
                          <input
                            type="number"
                            placeholder={String(s.commissionRatePct ?? data.settings.globalCommissionPct)}
                            value={commissionOverrideInputs[s.id] || ''}
                            onChange={(e) =>
                              setCommissionOverrideInputs({
                                ...commissionOverrideInputs,
                                [s.id]: e.target.value,
                              })
                            }
                            className="w-16 border border-[#E5E2DC] px-2 py-1 bg-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const pct = Number(commissionOverrideInputs[s.id]);
                              if (Number.isNaN(pct)) return;
                              await apiFetch(`/api/admin/suppliers/${s.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ commissionRatePct: pct }),
                              });
                              loadAdmin();
                              toast('Supplier commission updated.', 'success');
                            }}
                            className="border border-[#111111] px-2.5 py-1 bg-white cursor-pointer"
                          >
                            Set Rate %
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'products' && (() => {
              const filteredAdminProducts = data.products.filter((p) => {
                const isLive = p.status === 'PUBLISHED' || (p.status === 'APPROVED' && p.isPublished !== false);
                const eff = isLive ? 'PUBLISHED' : p.status;
                if (productStatusFilter !== 'ALL' && eff !== productStatusFilter) return false;
                if (productSearch.trim()) {
                  const q = productSearch.toLowerCase();
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.supplierName.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    p.brand.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              return (
                <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-editorial text-2xl font-semibold">
                      {t('adminMarkupTitle')} ({filteredAdminProducts.length} / {data.products.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search title, supplier, category..."
                        className="border border-[#E5E2DC] px-3 py-1.5 bg-[#FAF9F6] w-56"
                      />
                      <select
                        value={productStatusFilter}
                        onChange={(e) => setProductStatusFilter(e.target.value)}
                        className="border border-[#E5E2DC] px-2.5 py-1.5 bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="CHANGES_REQUESTED">Changes Requested</option>
                        <option value="APPROVED">Approved (Unpublished)</option>
                        <option value="PUBLISHED">Published Live</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-[#E5E2DC] text-neutral-500">
                        <tr>
                          <th className="py-2 pr-4">Product & Photos</th>
                          <th className="py-2 pr-4">Supplier</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4 text-right">{t('supplierCostLabel')}</th>
                          <th className="py-2 pr-4 text-right">{t('retailPriceLabel')}</th>
                          <th className="py-2 pr-4 text-right">{t('adminProfitLabel')}</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E2DC]">
                        {filteredAdminProducts.map((p) => {
                          const rawDraft = retailPriceInputs[p.id];
                          const draftSelling =
                            rawDraft !== undefined && rawDraft !== '' && !Number.isNaN(Number(rawDraft))
                              ? Number(rawDraft)
                              : p.sellingPriceUsd;
                          const profitUsd = draftSelling - p.wholesalePriceUsd;
                          const isLive =
                            p.status === 'PUBLISHED' ||
                            (p.status === 'APPROVED' && p.isPublished !== false);
                          const displayStatus = isLive
                            ? 'PUBLISHED'
                            : p.status === 'APPROVED'
                              ? 'APPROVED (Held)'
                              : p.status;

                          return (
                            <tr key={p.id}>
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-10 bg-[#F4F2EE] border border-[#E5E2DC] shrink-0 overflow-hidden">
                                    <SafeImage
                                      src={p.images[0]}
                                      alt={p.title}
                                      requiresAuth
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#111111] truncate max-w-[200px]">
                                      {p.title}
                                    </p>
                                    <p className="text-[11px] text-neutral-500">
                                      {p.gender} · {p.category} · {p.images.length} photo(s)
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4">{p.supplierName}</td>
                              <td className="py-2.5 pr-4">
                                <span
                                  className={
                                    p.status === 'PENDING_APPROVAL'
                                      ? 'font-semibold text-amber-800'
                                      : isLive
                                        ? 'font-semibold text-emerald-800'
                                        : p.status === 'REJECTED'
                                          ? 'font-semibold text-red-700'
                                          : 'text-neutral-700'
                                  }
                                >
                                  {displayStatus}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums">
                                ${p.wholesalePriceUsd.toFixed(2)}
                                <div className="text-[10px] text-neutral-400">
                                  {formatMoney(p.wholesalePriceUsd)}
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0.5}
                                  value={rawDraft ?? String(p.sellingPriceUsd)}
                                  onChange={(e) =>
                                    setRetailPriceInputs({
                                      ...retailPriceInputs,
                                      [p.id]: e.target.value,
                                    })
                                  }
                                  className="w-24 border border-[#E5E2DC] px-2 py-1 text-right font-mono-tabular bg-white"
                                />
                                <div className="text-[10px] text-neutral-500 mt-0.5 tabular-nums">
                                  {formatMoney(draftSelling)}
                                </div>
                              </td>
                              <td
                                className={`py-2.5 pr-4 text-right tabular-nums font-semibold ${
                                  profitUsd < 0 ? 'text-red-700' : 'text-emerald-700'
                                }`}
                              >
                                {profitUsd >= 0 ? `+$${profitUsd.toFixed(2)}` : `-$${Math.abs(profitUsd).toFixed(2)}`}
                                <div className="text-[10px] font-normal">
                                  {formatMoney(Math.max(0, profitUsd))}
                                </div>
                              </td>
                              <td className="py-2.5 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectedProduct(p);
                                    setInspectImageIdx(0);
                                    setModerationReasonInput(
                                      p.adminChangeRequestMessage || p.adminRejectionReason || ''
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 border border-[#111111] bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-[#111111] hover:text-white cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" /> {t('inspectProductBtn')}
                                </button>
                                {!isLive && p.status !== 'DRAFT' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!Number.isFinite(draftSelling) || draftSelling < p.wholesalePriceUsd) {
                                        toast(
                                          `Selling price must be >= supplier price ($${p.wholesalePriceUsd}).`,
                                          'error'
                                        );
                                        return;
                                      }
                                      await apiFetch(`/api/admin/products/${p.id}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          sellingPriceUsd: draftSelling,
                                          status: 'PUBLISHED',
                                          isPublished: true,
                                        }),
                                      });
                                      await loadAdmin();
                                      await refreshBootstrap();
                                      toast('Selling price saved & product published live.', 'success');
                                    }}
                                    className="bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                                  >
                                    {t('publishLiveBtn')}
                                  </button>
                                )}
                                {isLive && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await apiFetch(`/api/admin/products/${p.id}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          status: 'APPROVED',
                                          isPublished: false,
                                        }),
                                      });
                                      await loadAdmin();
                                      await refreshBootstrap();
                                      toast('Product unpublished (held as Approved).', 'info');
                                    }}
                                    className="border border-amber-400 text-amber-900 px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                                  >
                                    {t('unpublishBtn')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {tab === 'orders' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                <h3 className="font-editorial text-2xl font-semibold">
                  {t('verifyTxTitle')} & {t('adminOrdersTab')} ({data.orders.length})
                </h3>
                {data.orders.length === 0 ? (
                  <p className="text-xs text-neutral-500">No orders placed yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.orders.map((ord) => {
                      const subs = data.suborders.filter((s) => s.orderId === ord.id);
                      const needsReview =
                        ord.paymentStatus === 'PENDING' ||
                        ord.paymentStatus === 'AWAITING_VERIFICATION';
                      return (
                        <div key={ord.id} className="border border-[#E5E2DC] p-4 bg-[#FAF9F6] text-xs space-y-3">
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <span className="font-mono-tabular font-semibold">{ord.id}</span>
                              <span className="ml-2 text-neutral-600">{ord.customerEmail}</span>
                              <span className="ml-2 text-neutral-500">
                                ({ord.paymentProvider.toUpperCase()})
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="tabular-nums font-semibold">
                                {formatMoney(ord.totalUsd)} ({ord.currency}{' '}
                                {ord.totalDisplay.toLocaleString()})
                              </span>
                              <span>
                                <strong>{ord.paymentStatus}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="bg-white border border-[#E5E2DC] p-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] text-neutral-500">{t('submittedTxIdLabel')}</p>
                              <p className="font-mono-tabular font-semibold text-sm text-[#111111]">
                                {ord.submittedTransactionId || 'Not submitted yet'}
                              </p>
                              {(ord.submittedPayerPhone || ord.submittedPayerName) && (
                                <p className="text-[11px] text-neutral-600">
                                  Sender: {ord.submittedPayerPhone} {ord.submittedPayerName}
                                </p>
                              )}
                            </div>

                            {needsReview && (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Rejection reason (if invalid ID)"
                                  value={rejectionReasons[ord.id] || ''}
                                  onChange={(e) =>
                                    setRejectionReasons({
                                      ...rejectionReasons,
                                      [ord.id]: e.target.value,
                                    })
                                  }
                                  className="border border-[#E5E2DC] px-2.5 py-1.5 w-52 bg-[#FAF9F6]"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({
                                      title: `Verify Payment for ${ord.id}?`,
                                      message: `Confirm Transaction ID "${ord.submittedTransactionId || ord.paymentReference}" matched incoming funds on ${ord.paymentProvider}?`,
                                      onConfirm: async () => {
                                        await apiFetch(`/api/admin/orders/${ord.id}/payment-confirm`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ outcome: 'CONFIRMED' }),
                                        });
                                        await loadAdmin();
                                        toast('Payment confirmed. You can now transfer cost to supplier.', 'success');
                                      },
                                    })
                                  }
                                  className="bg-emerald-700 text-white px-3 py-1.5 font-medium cursor-pointer"
                                >
                                  {t('approvePaymentBtn')}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await apiFetch(`/api/admin/orders/${ord.id}/payment-confirm`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({
                                        outcome: 'REJECTED',
                                        reason: rejectionReasons[ord.id] || undefined,
                                      }),
                                    });
                                    await loadAdmin();
                                    toast('Transaction ID rejected and customer notified.', 'info');
                                  }}
                                  className="border border-red-300 text-red-700 px-3 py-1.5 font-medium cursor-pointer"
                                >
                                  {t('rejectPaymentBtn')}
                                </button>
                              </div>
                            )}
                          </div>

                          {subs.map((sub) => {
                            const adminProfit =
                              sub.adminMarkupUsd ?? sub.marketplaceCommissionUsd ?? 0;
                            const isSettled = sub.supplierSettlementStatus === 'SENT_TO_SUPPLIER';
                            return (
                              <div key={sub.id} className="bg-white border border-[#E5E2DC] p-3 space-y-2">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                  <div>
                                    <span className="font-semibold">{sub.supplierName}</span> ·{' '}
                                    <span className="font-mono-tabular">{sub.id}</span> ·{' '}
                                    <span className="text-[#8B6F47]">{sub.status}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 tabular-nums">
                                    <span>Customer Paid: {formatMoney(sub.supplierSubtotalUsd + sub.shippingFeeUsd)}</span>
                                    <span className="text-emerald-700 font-semibold">
                                      {t('adminProfitLabel')}: {formatMoney(adminProfit)}
                                    </span>
                                    <span className="font-semibold text-[#111111]">
                                      Pay Supplier: {formatMoney(sub.supplierNetEarningsUsd)}
                                    </span>
                                  </div>
                                </div>

                                {sub.adminExceptionReleased && (
                                  <div className="bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-950">
                                    <strong>Documented Exception Release Active:</strong>{' '}
                                    {sub.adminExceptionReason}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E2DC]">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {ord.paymentStatus === 'CONFIRMED' && !isSettled ? (
                                      <>
                                        <input
                                          type="text"
                                          placeholder={t('transferRefPlaceholder')}
                                          value={settlementRefs[sub.id] || ''}
                                          onChange={(e) =>
                                            setSettlementRefs({
                                              ...settlementRefs,
                                              [sub.id]: e.target.value,
                                            })
                                          }
                                          className="border border-[#E5E2DC] px-2.5 py-1 w-64 font-mono-tabular"
                                        />
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const ref = (settlementRefs[sub.id] || '').trim();
                                            if (!ref) {
                                              toast('Enter the payout reference you sent to the supplier.', 'error');
                                              return;
                                            }
                                            await apiFetch(`/api/admin/suborders/${sub.id}/settle-supplier`, {
                                              method: 'PATCH',
                                              body: JSON.stringify({ settlementRef: ref }),
                                            });
                                            await loadAdmin();
                                            toast('Supplier settled & order released for shipping.', 'success');
                                          }}
                                          className="bg-[#111111] text-white px-3 py-1 font-medium cursor-pointer"
                                        >
                                          {t('settleSupplierBtn')}
                                        </button>
                                      </>
                                    ) : isSettled ? (
                                      <span className="text-emerald-800 font-medium">
                                        {t('adminSettlementPaid')}:{' '}
                                        <strong className="font-mono-tabular">
                                          {sub.supplierSettlementRef}
                                        </strong>
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-neutral-500">
                                          Verify customer payment first to release to supplier.
                                        </span>
                                        {userAccount.role === 'super_admin' && !sub.fulfillmentReleased && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setExceptionReason('');
                                              setExceptionModalSub(sub);
                                            }}
                                            className="border border-amber-400 bg-amber-50 text-amber-950 px-2.5 py-1 text-[11px] font-medium cursor-pointer hover:bg-amber-100"
                                          >
                                            Release by Documented Exception
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <select
                                    value={sub.status}
                                    onChange={async (e) => {
                                      await apiFetch(`/api/admin/suborders/${sub.id}/intervene`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          status: e.target.value,
                                          note: 'Admin status intervention',
                                        }),
                                      });
                                      loadAdmin();
                                    }}
                                    className="border border-[#E5E2DC] px-2 py-1 text-xs"
                                  >
                                    {[
                                      'Pending Payment',
                                      'Awaiting Payment Verification',
                                      'Payment Confirmed',
                                      'Awaiting Supplier Confirmation',
                                      'Supplier Confirmed',
                                      'Processing',
                                      'Ready for Shipping',
                                      'Shipped',
                                      'In Transit',
                                      'Delivered',
                                      'Completed',
                                      'Cancelled',
                                    ].map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                  <h3 className="font-editorial text-2xl font-semibold">Commission Rules Engine</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await apiFetch('/api/admin/commission-rules', {
                        method: 'POST',
                        body: JSON.stringify(newRule),
                      });
                      setNewRule({ scope: 'category', targetId: '', label: '', percentage: 12 });
                      loadAdmin();
                      toast('Commission rule saved.', 'success');
                    }}
                    className="grid sm:grid-cols-4 gap-3 text-xs"
                  >
                    <select
                      value={newRule.scope}
                      onChange={(e) => setNewRule({ ...newRule, scope: e.target.value as any })}
                      className="border border-[#E5E2DC] px-2.5 py-2 bg-white"
                    >
                      <option value="global">Global</option>
                      <option value="category">Category</option>
                      <option value="promotional">Promotional</option>
                    </select>
                    <input
                      placeholder="Target (e.g., Dresses)"
                      value={newRule.targetId}
                      onChange={(e) => setNewRule({ ...newRule, targetId: e.target.value })}
                      className="border border-[#E5E2DC] px-2.5 py-2"
                    />
                    <input
                      required
                      placeholder="Rule Label"
                      value={newRule.label}
                      onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                      className="border border-[#E5E2DC] px-2.5 py-2"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min={0}
                        max={60}
                        value={newRule.percentage}
                        onChange={(e) => setNewRule({ ...newRule, percentage: Number(e.target.value) })}
                        className="w-20 border border-[#E5E2DC] px-2.5 py-2"
                      />
                      <button type="submit" className="flex-1 bg-[#111111] text-white px-3 py-2 cursor-pointer">
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 text-xs">
                    {data.commissionRules.map((r) => (
                      <div key={r.id} className="flex justify-between border border-[#E5E2DC] p-3">
                        <span>
                          <strong>{r.label}</strong> ({r.scope}
                          {r.targetId ? `: ${r.targetId}` : ''})
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono-tabular font-semibold">{r.percentage}%</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/commission-rules/${r.id}`, {
                                method: 'DELETE',
                              });
                              loadAdmin();
                            }}
                            className="text-red-700 underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                  <h3 className="font-editorial text-2xl font-semibold">
                    Supplier Payout Requests ({data.payouts.length})
                  </h3>
                  {data.payouts.length === 0 ? (
                    <p className="text-xs text-neutral-500">No supplier payout requests.</p>
                  ) : (
                    data.payouts.map((p) => (
                      <div key={p.id} className="border border-[#E5E2DC] p-4 text-xs flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <p className="font-semibold">
                            {p.supplierName} — ${p.amountUsd} USD
                          </p>
                          <p className="text-neutral-500">
                            {p.payoutMethod} ({p.accountSummary}) · Status: {p.status}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/payouts/${p.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  status: 'PAID',
                                  reference: `PAYOUT-${Date.now()}`,
                                }),
                              });
                              loadAdmin();
                            }}
                            className="bg-emerald-700 text-white px-3 py-1.5 cursor-pointer"
                          >
                            Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/payouts/${p.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'REJECTED' }),
                              });
                              loadAdmin();
                            }}
                            className="border border-red-300 text-red-700 px-3 py-1.5 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'refunds' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                <h3 className="font-editorial text-2xl font-semibold">
                  Refund Requests & Dispute Resolution
                </h3>
                {data.refunds.length === 0 ? (
                  <p className="text-xs text-neutral-500">No refund requests.</p>
                ) : (
                  data.refunds.map((r) => (
                    <div key={r.id} className="border border-[#E5E2DC] p-4 text-xs space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {r.id} · {r.customerEmail} (${r.requestedAmountUsd})
                        </span>
                        <span className="text-[#8B6F47]">{r.status}</span>
                      </div>
                      <p className="text-neutral-600">Reason: {r.reason}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/refunds/${r.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: 'REFUNDED',
                                adminNotes: 'Approved & settled by Admin.',
                              }),
                            });
                            loadAdmin();
                          }}
                          className="bg-emerald-700 text-white px-3 py-1.5 cursor-pointer"
                        >
                          Approve & Refund
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/refunds/${r.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: 'REJECTED',
                                adminNotes: 'Rejected after review.',
                              }),
                            });
                            loadAdmin();
                          }}
                          className="border border-red-300 text-red-700 px-3 py-1.5 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'marketing' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                  <h3 className="font-editorial text-2xl font-semibold">Discount Coupons</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await apiFetch('/api/admin/coupons', {
                        method: 'POST',
                        body: JSON.stringify(newCoupon),
                      });
                      setNewCoupon({ code: '', type: 'percentage', value: 10, minOrderUsd: 30 });
                      loadAdmin();
                    }}
                    className="grid sm:grid-cols-4 gap-3 text-xs"
                  >
                    <input
                      required
                      placeholder="Code (e.g., SAVE15)"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                      className="border border-[#E5E2DC] px-3 py-2 uppercase"
                    />
                    <select
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                      className="border border-[#E5E2DC] px-3 py-2 bg-white"
                    >
                      <option value="percentage">Percentage %</option>
                      <option value="fixed">Fixed USD</option>
                    </select>
                    <input
                      type="number"
                      required
                      value={newCoupon.value}
                      onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                      placeholder="Value"
                      className="border border-[#E5E2DC] px-3 py-2"
                    />
                    <button type="submit" className="bg-[#111111] text-white px-4 py-2 cursor-pointer">
                      Create Coupon
                    </button>
                  </form>
                  <div className="space-y-2 text-xs">
                    {data.coupons.map((c) => (
                      <div key={c.id} className="flex justify-between border border-[#E5E2DC] p-3">
                        <span className="font-mono-tabular font-semibold">
                          {c.code} ({c.type === 'percentage' ? `${c.value}%` : `$${c.value}`})
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/coupons/${c.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ active: !c.active }),
                            });
                            loadAdmin();
                          }}
                          className="underline cursor-pointer"
                        >
                          {c.active ? 'Active (Disable)' : 'Disabled (Enable)'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#8B6F47]" />
                    <h3 className="font-editorial text-2xl font-semibold">Broadcast Announcements</h3>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await apiFetch<{ sentCount: number }>('/api/admin/announcements', {
                        method: 'POST',
                        body: JSON.stringify(announcement),
                      });
                      setAnnouncement({ audience: 'all', title: '', message: '' });
                      toast(`Announcement sent to ${res.sentCount} user(s).`, 'success');
                    }}
                    className="space-y-3 text-xs"
                  >
                    <select
                      value={announcement.audience}
                      onChange={(e) =>
                        setAnnouncement({ ...announcement, audience: e.target.value as any })
                      }
                      className="border border-[#E5E2DC] px-3 py-2 bg-white"
                    >
                      <option value="all">All Users</option>
                      <option value="suppliers">Suppliers Only</option>
                      <option value="customers">Customers Only</option>
                    </select>
                    <input
                      required
                      placeholder="Announcement Title"
                      value={announcement.title}
                      onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                    <textarea
                      required
                      rows={3}
                      placeholder="Announcement Message..."
                      value={announcement.message}
                      onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                      className="w-full border border-[#E5E2DC] p-3"
                    />
                    <button type="submit" className="bg-[#111111] text-white px-5 py-2.5 cursor-pointer">
                      Send Announcement
                    </button>
                  </form>
                </div>
              </div>
            )}

            {tab === 'support' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                <h3 className="font-editorial text-2xl font-semibold">
                  Support Ticket Queue ({data.tickets.length})
                </h3>
                {data.tickets.length === 0 ? (
                  <p className="text-xs text-neutral-500">No support tickets logged.</p>
                ) : (
                  data.tickets.map((t) => (
                    <div key={t.id} className="border border-[#E5E2DC] p-4 text-xs space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {t.subject} ({t.userEmail})
                        </span>
                        <span>
                          {t.priority.toUpperCase()} · {t.status}
                        </span>
                      </div>
                      <p className="text-neutral-600">{t.message}</p>
                      <div className="flex gap-2">
                        <input
                          placeholder="Staff reply..."
                          value={ticketReply[t.id] || ''}
                          onChange={(e) => setTicketReply({ ...ticketReply, [t.id]: e.target.value })}
                          className="flex-1 border border-[#E5E2DC] px-2.5 py-1.5"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/tickets/${t.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: 'RESOLVED',
                                replyMessage: ticketReply[t.id] || 'Resolved by marketplace support.',
                              }),
                            });
                            loadAdmin();
                          }}
                          className="bg-[#111111] text-white px-3 py-1.5 cursor-pointer"
                        >
                          Reply & Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'users' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-4">
                <h3 className="font-editorial text-2xl font-semibold">
                  Accounts & Staff Role Management ({data.users.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-[#E5E2DC] text-neutral-500">
                      <tr>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Permissions</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E2DC]">
                      {data.users.map((u) => (
                        <tr key={u.uid}>
                          <td className="py-2.5 pr-4">{u.email}</td>
                          <td className="py-2.5 pr-4">
                            <select
                              value={u.role}
                              disabled={userAccount.role !== 'super_admin'}
                              onChange={async (e) => {
                                await apiFetch(`/api/admin/users/${u.uid}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ role: e.target.value }),
                                });
                                loadAdmin();
                              }}
                              className="border border-[#E5E2DC] px-2 py-1 bg-white"
                            >
                              <option value="customer">customer</option>
                              <option value="supplier">supplier</option>
                              <option value="staff">staff</option>
                              <option value="delivery_partner">delivery_partner</option>
                              <option value="super_admin">super_admin</option>
                            </select>
                          </td>
                          <td className="py-2.5 pr-4">
                            {u.role === 'super_admin' ? (
                              <span className="text-neutral-500">Full Access</span>
                            ) : u.role === 'staff' ? (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={userAccount.role !== 'super_admin'}
                                  checked={Boolean(u.permissions?.canVerifyPayments)}
                                  onChange={async (e) => {
                                    await apiFetch(`/api/admin/users/${u.uid}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({
                                        permissions: {
                                          ...u.permissions,
                                          canVerifyPayments: e.target.checked,
                                        },
                                      }),
                                    });
                                    loadAdmin();
                                    toast('Staff payment verification permission updated.', 'success');
                                  }}
                                />
                                <span>Can Verify Payments</span>
                              </label>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4">{u.status}</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  title: `${u.status === 'active' ? 'Suspend' : 'Reactivate'} ${u.email}?`,
                                  message: 'Account access will be updated immediately.',
                                  onConfirm: async () => {
                                    await apiFetch(`/api/admin/users/${u.uid}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({
                                        status: u.status === 'active' ? 'suspended' : 'active',
                                      }),
                                    });
                                    loadAdmin();
                                  },
                                })
                              }
                              className="underline cursor-pointer"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'settings' && settingsDraft && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/settings', {
                    method: 'PATCH',
                    body: JSON.stringify(settingsDraft),
                  });
                  await loadAdmin();
                  await refreshBootstrap();
                  toast('Marketplace settings updated live.', 'success');
                }}
                className="bg-white border border-[#E5E2DC] p-6 space-y-6 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] pb-3">
                  <h3 className="font-editorial text-2xl font-semibold">
                    {t('manualPaymentSettingsTitle')}
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Managed strictly by Super Admin — dynamically shown at checkout
                  </span>
                </div>

                {/* Official Recipient Name (shared default across M-Pesa & NMB) */}
                <div className="border border-[#111111] bg-[#FAF9F6] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">
                        {t('officialRecipientTitle')}
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        Default recipient / account holder displayed for both M-Pesa and NMB Bank Transfer. Super Admin may update when needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          officialRecipientName: 'MAHELA ISSA KISENA',
                          manualPaymentAccountName: 'MAHELA ISSA KISENA',
                          mpesaAccountHolder: 'MAHELA ISSA KISENA',
                          nmbAccountName: 'MAHELA ISSA KISENA',
                        })
                      }
                      className="border border-[#E5E2DC] bg-white px-3 py-1.5 text-[11px] font-medium hover:border-[#111111] cursor-pointer"
                    >
                      Reset to Default (MAHELA ISSA KISENA)
                    </button>
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">
                      Official Recipient / Account Holder Name
                    </label>
                    <input
                      value={
                        settingsDraft.officialRecipientName ??
                        settingsDraft.manualPaymentAccountName ??
                        ''
                      }
                      onChange={(e) => {
                        const nextName = e.target.value;
                        const prevOfficial =
                          settingsDraft.officialRecipientName ||
                          settingsDraft.manualPaymentAccountName ||
                          '';
                        setSettingsDraft({
                          ...settingsDraft,
                          officialRecipientName: nextName,
                          manualPaymentAccountName: nextName,
                          mpesaAccountHolder:
                            !settingsDraft.mpesaAccountHolder ||
                            settingsDraft.mpesaAccountHolder === prevOfficial
                              ? nextName
                              : settingsDraft.mpesaAccountHolder,
                          nmbAccountName:
                            !settingsDraft.nmbAccountName ||
                            settingsDraft.nmbAccountName === prevOfficial
                              ? nextName
                              : settingsDraft.nmbAccountName,
                        });
                      }}
                      placeholder="MAHELA ISSA KISENA"
                      className="w-full border border-[#E5E2DC] px-3 py-2 bg-white font-semibold"
                    />
                  </div>
                </div>

                {/* M-Pesa Configuration */}
                <div className="border border-[#E5E2DC] bg-[#FAF9F6] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111111]">M-Pesa</p>
                    <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsDraft.mpesaEnabled ?? true}
                        onChange={(e) =>
                          setSettingsDraft({ ...settingsDraft, mpesaEnabled: e.target.checked })
                        }
                      />
                      Enable M-Pesa at Checkout
                    </label>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-500 mb-1">
                        M-Pesa Receiving Phone Number
                      </label>
                      <input
                        value={settingsDraft.mpesaPhone ?? settingsDraft.manualPaymentPhone ?? ''}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            mpesaPhone: e.target.value,
                            manualPaymentPhone: e.target.value,
                          })
                        }
                        placeholder="Enter M-Pesa receiving number"
                        className="w-full border border-[#E5E2DC] px-3 py-2 font-mono-tabular bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">M-Pesa Recipient Name</label>
                      <input
                        value={
                          settingsDraft.mpesaAccountHolder ??
                          settingsDraft.officialRecipientName ??
                          settingsDraft.manualPaymentAccountName ??
                          ''
                        }
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            mpesaAccountHolder: e.target.value,
                          })
                        }
                        className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">M-Pesa Payment Instructions</label>
                    <textarea
                      rows={2}
                      value={settingsDraft.mpesaInstructions || ''}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, mpesaInstructions: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                    />
                  </div>
                </div>

                {/* NMB Bank Transfer Configuration */}
                <div className="border border-[#E5E2DC] bg-[#FAF9F6] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111111]">NMB Bank Transfer</p>
                    <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsDraft.nmbEnabled ?? true}
                        onChange={(e) =>
                          setSettingsDraft({ ...settingsDraft, nmbEnabled: e.target.checked })
                        }
                      />
                      Enable NMB Bank Transfer at Checkout
                    </label>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-neutral-500 mb-1">NMB Account Name</label>
                      <input
                        value={
                          settingsDraft.nmbAccountName ??
                          settingsDraft.officialRecipientName ??
                          settingsDraft.manualPaymentAccountName ??
                          ''
                        }
                        onChange={(e) =>
                          setSettingsDraft({ ...settingsDraft, nmbAccountName: e.target.value })
                        }
                        className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">NMB Account Number</label>
                      <input
                        value={
                          settingsDraft.nmbAccountNumber ??
                          settingsDraft.manualPaymentBankAccount ??
                          ''
                        }
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            nmbAccountNumber: e.target.value,
                            manualPaymentBankAccount: e.target.value,
                          })
                        }
                        placeholder="Enter NMB account number"
                        className="w-full border border-[#E5E2DC] px-3 py-2 font-mono-tabular bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">Bank Name</label>
                      <input
                        value={settingsDraft.manualPaymentBankName ?? 'NMB Bank'}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            manualPaymentBankName: e.target.value,
                          })
                        }
                        className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">NMB Bank Branch / Details</label>
                      <input
                        value={settingsDraft.nmbBranch || ''}
                        onChange={(e) =>
                          setSettingsDraft({ ...settingsDraft, nmbBranch: e.target.value })
                        }
                        className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">
                      NMB Bank Payment Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={settingsDraft.nmbInstructions || ''}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, nmbInstructions: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2 bg-white"
                    />
                  </div>
                </div>

                {/* Storefront & Operations */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-500 mb-1">Announcement Bar Text (EN)</label>
                    <input
                      value={settingsDraft.announcementText}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, announcementText: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">Announcement Bar Text (SW)</label>
                    <input
                      value={settingsDraft.announcementTextSw || ''}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, announcementTextSw: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">Hero Title (EN)</label>
                    <input
                      value={settingsDraft.heroTitle}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, heroTitle: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">Hero Title (SW)</label>
                    <input
                      value={settingsDraft.heroTitleSw || ''}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, heroTitleSw: e.target.value })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">Global Commission (%)</label>
                    <input
                      type="number"
                      value={settingsDraft.globalCommissionPct}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          globalCommissionPct: Number(e.target.value),
                        })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">
                      TZS per 1 USD Exchange Rate
                    </label>
                    <input
                      type="number"
                      value={settingsDraft.currencyRates.TZS}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          currencyRates: {
                            ...settingsDraft.currencyRates,
                            TZS: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full border border-[#E5E2DC] px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsDraft.autoReleaseSubordersOnPaymentConfirm ?? true}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          autoReleaseSubordersOnPaymentConfirm: e.target.checked,
                        })
                      }
                    />
                    Auto-release supplier suborders immediately when Admin approves payment
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsDraft.requireProductApproval}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          requireProductApproval: e.target.checked,
                        })
                      }
                    />
                    Require Product Approval
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsDraft.allowGuestCheckout}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          allowGuestCheckout: e.target.checked,
                        })
                      }
                    />
                    Allow Guest Checkout
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={userAccount.role !== 'super_admin'}
                  className="bg-[#111111] text-white px-6 py-2.5 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save Marketplace Configuration
                </button>
              </form>
            )}

            {tab === 'audit' && (
              <div className="bg-white border border-[#E5E2DC] p-6 space-y-3">
                <h3 className="font-editorial text-2xl font-semibold">
                  Administrative Audit Log
                </h3>
                {data.auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-500">No administrative actions logged yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {data.auditLogs.map((l) => (
                      <div key={l.id} className="border border-[#E5E2DC] p-3 bg-[#FAF9F6]">
                        <div className="flex justify-between font-medium">
                          <span>
                            {l.action} · {l.targetType} ({l.targetId})
                          </span>
                          <span className="font-mono-tabular text-neutral-500">
                            {new Date(l.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-neutral-600 mt-1">
                          {l.actorEmail} ({l.actorRole}): {l.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Private Receipt Preview Modal */}
      {receiptPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2DC] p-5 w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2">
              <div>
                <h3 className="font-editorial text-xl font-semibold">Payment Receipt Screenshot</h3>
                <p className="text-[11px] font-mono-tabular text-neutral-500">
                  {receiptPreview.submissionId}
                  {receiptPreview.fileName ? ` · ${receiptPreview.fileName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                className="p-1.5 border border-[#E5E2DC] cursor-pointer hover:border-[#111111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#FAF9F6] border border-[#E5E2DC] p-2 max-h-[70vh] overflow-auto flex justify-center">
              <img
                src={receiptPreview.dataUrl}
                alt="Customer payment receipt"
                className="max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Documented Exception Suborder Release Modal */}
      {exceptionModalSub && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (exceptionReason.trim().length < 8) {
                toast('Documented reason must be at least 8 characters.', 'error');
                return;
              }
              await apiFetch(`/api/admin/suborders/${exceptionModalSub.id}/release-exception`, {
                method: 'PATCH',
                body: JSON.stringify({ reason: exceptionReason.trim() }),
              });
              setExceptionModalSub(null);
              setExceptionReason('');
              await loadAdmin();
              toast('Suborder released to supplier under documented exception.', 'success');
            }}
            className="bg-white border border-[#E5E2DC] p-6 w-full max-w-md space-y-4"
          >
            <h3 className="font-editorial text-2xl font-semibold text-[#111111]">
              Documented Exception Release
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Release suborder <strong className="font-mono-tabular">{exceptionModalSub.id}</strong> to{' '}
              <strong>{exceptionModalSub.supplierName}</strong> before customer payment is verified.
              This creates a permanent audit entry and notifies the supplier.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">
                Mandatory Documented Reason (min 8 chars)
              </label>
              <textarea
                required
                minLength={8}
                rows={3}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g., VIP partner invoice settlement confirmed by Finance Director"
                className="w-full border border-[#E5E2DC] p-2.5 text-xs bg-[#FAF9F6]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExceptionModalSub(null)}
                className="border border-[#E5E2DC] px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-700 text-white px-5 py-2 text-xs font-medium cursor-pointer"
              >
                Confirm Exception Release
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Product Inspection, Image Review & Markup Modal */}
      {inspectedProduct && (() => {
        const currentPriceRaw = retailPriceInputs[inspectedProduct.id];
        const sellingPrice =
          currentPriceRaw !== undefined && currentPriceRaw !== '' && !Number.isNaN(Number(currentPriceRaw))
            ? Number(currentPriceRaw)
            : inspectedProduct.sellingPriceUsd;
        const profitUsd = sellingPrice - inspectedProduct.wholesalePriceUsd;
        const marginPct =
          inspectedProduct.wholesalePriceUsd > 0
            ? Math.round((profitUsd / inspectedProduct.wholesalePriceUsd) * 100)
            : 0;
        const activeImg =
          inspectedProduct.images[inspectImageIdx] || inspectedProduct.images[0];

        const moderateProduct = async (
          targetStatus: Product['status'],
          publishFlag: boolean,
          requireReasonType?: 'reject' | 'changes'
        ) => {
          const reason = moderationReasonInput.trim();
          if (requireReasonType && reason.length < 5) {
            toast(
              requireReasonType === 'reject'
                ? 'Please provide a clear rejection reason (minimum 5 characters).'
                : 'Please describe the requested changes (minimum 5 characters).',
              'error'
            );
            return;
          }
          if ((targetStatus === 'APPROVED' || targetStatus === 'PUBLISHED') && sellingPrice < inspectedProduct.wholesalePriceUsd) {
            toast(
              `Selling price ($${sellingPrice}) cannot be lower than supplier price ($${inspectedProduct.wholesalePriceUsd}).`,
              'error'
            );
            return;
          }
          try {
            await apiFetch(`/api/admin/products/${inspectedProduct.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                status: targetStatus,
                isPublished: publishFlag,
                sellingPriceUsd: sellingPrice,
                ...(requireReasonType === 'reject' ? { adminRejectionReason: reason } : {}),
                ...(requireReasonType === 'changes' ? { adminChangeRequestMessage: reason } : {}),
              }),
            });
            setInspectedProduct(null);
            await loadAdmin();
            await refreshBootstrap();
            toast(`Product updated to ${targetStatus}.`, 'success');
          } catch (err: any) {
            toast(err.message || 'Moderation update failed', 'error');
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/55 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
            <div className="bg-[#FAF9F6] border border-[#E5E2DC] w-full max-w-4xl my-4">
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E2DC]">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#8B6F47]">
                    {inspectedProduct.supplierName} · {inspectedProduct.status}
                  </p>
                  <h3 className="font-editorial text-2xl font-semibold text-[#111111]">
                    {inspectedProduct.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedProduct(null)}
                  className="p-1.5 border border-[#E5E2DC] cursor-pointer hover:border-[#111111]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid md:grid-cols-12 gap-6 text-xs">
                {/* Multi-Image Inspection Gallery */}
                <div className="md:col-span-5 space-y-3">
                  <div className="relative aspect-[4/3] bg-white border border-[#E5E2DC] overflow-hidden">
                    <SafeImage
                      src={activeImg}
                      alt={inspectedProduct.title}
                      requiresAuth
                      className="w-full h-full object-cover"
                    />
                    {activeImg && (
                      <button
                        type="button"
                        onClick={() => setInspectZoomUrl(activeImg)}
                        className="absolute bottom-2 right-2 bg-white/95 border border-[#E5E2DC] px-2 py-1 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer hover:border-[#111111]"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> Zoom
                      </button>
                    )}
                  </div>
                  {inspectedProduct.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {inspectedProduct.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInspectImageIdx(i)}
                          className={`aspect-[4/3] border overflow-hidden cursor-pointer ${
                            inspectImageIdx === i ? 'border-[#111111]' : 'border-[#E5E2DC]'
                          }`}
                        >
                          <SafeImage
                            src={img}
                            alt={`Preview ${i + 1}`}
                            requiresAuth
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details, Markup Pricing & Moderation Controls */}
                <div className="md:col-span-7 space-y-4">
                  <div className="bg-white border border-[#E5E2DC] p-4 space-y-1.5">
                    <p>
                      <strong>Category & Gender:</strong> {inspectedProduct.gender} ·{' '}
                      {inspectedProduct.category} · Brand: {inspectedProduct.brand}
                    </p>
                    {inspectedProduct.material && (
                      <p>
                        <strong>Material:</strong> {inspectedProduct.material}
                      </p>
                    )}
                    {inspectedProduct.weightKg !== undefined && (
                      <p>
                        <strong>Weight:</strong> {inspectedProduct.weightKg} kg
                      </p>
                    )}
                    <p>
                      <strong>Shipping:</strong> From {inspectedProduct.shippingOriginCountry} · Fee $
                      {inspectedProduct.shippingFeeUsd} ({inspectedProduct.estimatedDaysMin}–
                      {inspectedProduct.estimatedDaysMax} days)
                    </p>
                    <p className="text-neutral-700 pt-1">{inspectedProduct.description}</p>
                    <p className="text-[11px] text-neutral-500 pt-1">
                      Variants:{' '}
                      {inspectedProduct.variants
                        .map((v) => `${v.size}/${v.color} (${v.stock})`)
                        .join(' · ')}
                    </p>
                  </div>

                  {/* Admin Markup Calculator */}
                  <div className="bg-white border border-[#E5E2DC] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111]">
                        Pricing & Markup Controls
                      </span>
                      <div className="flex gap-1.5">
                        {[15, 25, 40].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const calc = Math.round(inspectedProduct.wholesalePriceUsd * (1 + pct / 100) * 100) / 100;
                              setRetailPriceInputs((prev) => ({
                                ...prev,
                                [inspectedProduct.id]: String(calc),
                              }));
                            }}
                            className="border border-[#E5E2DC] px-2 py-0.5 text-[11px] hover:border-[#111111] cursor-pointer"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] text-neutral-500">{t('supplierCostLabel')}</p>
                        <p className="font-mono-tabular font-semibold text-sm">
                          ${inspectedProduct.wholesalePriceUsd.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-500 mb-0.5">
                          {t('retailPriceLabel')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0.5}
                          value={currentPriceRaw ?? String(inspectedProduct.sellingPriceUsd)}
                          onChange={(e) =>
                            setRetailPriceInputs((prev) => ({
                              ...prev,
                              [inspectedProduct.id]: e.target.value,
                            }))
                          }
                          className="w-full border border-[#E5E2DC] px-2 py-1 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500">{t('adminProfitLabel')}</p>
                        <p
                          className={`font-mono-tabular font-semibold text-sm ${
                            profitUsd < 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {profitUsd >= 0 ? `+$${profitUsd.toFixed(2)}` : `-$${Math.abs(profitUsd).toFixed(2)}`}{' '}
                          ({marginPct}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Moderation Feedback & Decision Buttons */}
                  <div className="bg-white border border-[#E5E2DC] p-4 space-y-3">
                    <label className="block text-[11px] font-medium text-neutral-700">
                      Rejection Reason or Requested Changes Message (mandatory if rejecting / requesting changes)
                    </label>
                    <textarea
                      rows={2}
                      value={moderationReasonInput}
                      onChange={(e) => setModerationReasonInput(e.target.value)}
                      placeholder="e.g., Please upload clearer front/back garment photos or clarify fabric composition."
                      className="w-full border border-[#E5E2DC] p-2 bg-[#FAF9F6]"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moderateProduct('PUBLISHED', true)}
                        className="bg-emerald-700 text-white px-4 py-2 font-semibold cursor-pointer hover:bg-emerald-800"
                      >
                        {t('approveAndPublish')}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderateProduct('APPROVED', false)}
                        className="border border-[#111111] bg-white text-[#111111] px-3.5 py-2 font-medium cursor-pointer hover:bg-[#F4F2EE]"
                      >
                        {t('approveOnlyBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderateProduct('CHANGES_REQUESTED', false, 'changes')}
                        className="border border-amber-400 bg-amber-50 text-amber-950 px-3.5 py-2 font-medium cursor-pointer hover:bg-amber-100"
                      >
                        {t('requestChangesBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderateProduct('REJECTED', false, 'reject')}
                        className="border border-red-300 bg-white text-red-700 px-3.5 py-2 font-medium cursor-pointer hover:bg-red-50"
                      >
                        {t('rejectProductBtn')}
                      </button>
                      {userAccount.role === 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            const target = inspectedProduct;
                            setConfirmAction({
                              title: `Delete "${target.title}" Permanently?`,
                              message: 'Deletes the listing and cleans up unreferenced uploaded images.',
                              onConfirm: async () => {
                                await apiFetch(`/api/admin/products/${target.id}`, {
                                  method: 'DELETE',
                                });
                                setInspectedProduct(null);
                                await loadAdmin();
                                await refreshBootstrap();
                                toast('Product deleted.', 'success');
                              },
                            });
                          }}
                          className="ml-auto inline-flex items-center gap-1 border border-red-300 text-red-700 px-3 py-2 font-medium cursor-pointer hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Image Zoom Modal */}
      {inspectZoomUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setInspectZoomUrl(null)}
        >
          <button
            type="button"
            onClick={() => setInspectZoomUrl(null)}
            className="absolute top-4 right-4 bg-white p-2 text-[#111111] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <SafeImage
              src={inspectZoomUrl}
              alt="Zoomed product inspection"
              requiresAuth
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Destructive / Financial Operations */}
      {confirmAction && (
        <div className="fixed inset-0 z-[65] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E2DC] p-6 w-full max-w-md space-y-4">
            <h3 className="font-editorial text-2xl font-semibold text-[#111111]">
              {confirmAction.title}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="border border-[#E5E2DC] px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="bg-[#111111] text-white px-5 py-2 text-xs font-medium cursor-pointer"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
