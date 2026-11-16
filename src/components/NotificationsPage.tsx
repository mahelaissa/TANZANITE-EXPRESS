import React, { useMemo, useState } from 'react';
import { ArrowRight, Bell, Check, CheckCheck, SlidersHorizontal } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { NotificationType } from '../types/marketplace';

const NOTIFICATION_TYPES: { id: 'all' | NotificationType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'payment', label: 'Payments' },
  { id: 'order', label: 'Orders' },
  { id: 'fulfillment', label: 'Fulfillment' },
  { id: 'return', label: 'Returns' },
  { id: 'supplier', label: 'Suppliers' },
  { id: 'product', label: 'Products' },
  { id: 'security', label: 'Security' },
  { id: 'system', label: 'System' },
];

export const NotificationsPage: React.FC = () => {
  const {
    firebaseUser,
    signInWithGoogle,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    navigateFromNotification,
    notificationPreferences,
    updateNotificationPreferences,
    t,
  } = useMarketplace();

  const [typeFilter, setTypeFilter] = useState<'all' | NotificationType>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (unreadOnly && n.read) return false;
      return true;
    });
  }, [notifications, typeFilter, unreadOnly]);

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white border border-[#E5E2DC] p-8 text-center">
        <Bell className="w-8 h-8 text-[#8B6F47] mx-auto mb-3" />
        <h2 className="font-editorial text-3xl font-semibold text-[#111111]">
          {t('notifications')}
        </h2>
        <p className="text-sm text-neutral-600 mt-3">
          Sign in to view real-time order, payment verification, and fulfillment notifications.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-6 bg-[#111111] text-white px-6 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer"
        >
          {t('signInGoogle')}
        </button>
      </div>
    );
  }

  const muted = notificationPreferences?.mutedTypes || [];

  const toggleMutedType = async (typeId: NotificationType) => {
    const nextMuted = muted.includes(typeId)
      ? muted.filter((tItem) => tItem !== typeId)
      : [...muted, typeId];
    await updateNotificationPreferences({ mutedTypes: nextMuted });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-6">
      <div className="bg-white border border-[#E5E2DC] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#8B6F47]">
            Real-Time Activity Center
          </p>
          <h1 className="font-editorial text-3xl font-semibold text-[#111111] mt-1">
            {t('notifications')} ({unreadNotificationCount} unread)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className="inline-flex items-center gap-1.5 border border-[#E5E2DC] bg-white hover:border-[#111111] px-3.5 py-2 text-xs font-medium cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t('notificationPreferences')}
          </button>
          <button
            type="button"
            onClick={markAllNotificationsRead}
            disabled={unreadNotificationCount === 0}
            className="inline-flex items-center gap-1.5 bg-[#111111] text-white px-4 py-2 text-xs font-medium disabled:opacity-40 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('markAllRead')}
          </button>
        </div>
      </div>

      {showPrefs && notificationPreferences && (
        <div className="bg-white border border-[#E5E2DC] p-6 space-y-4 text-xs">
          <h2 className="font-editorial text-xl font-semibold text-[#111111]">
            {t('notificationPreferences')}
          </h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPreferences.inAppEnabled}
                onChange={(e) =>
                  updateNotificationPreferences({ inAppEnabled: e.target.checked })
                }
                className="accent-[#111111]"
              />
              Enable In-App Real-Time Notifications
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPreferences.emailEnabled}
                onChange={(e) =>
                  updateNotificationPreferences({ emailEnabled: e.target.checked })
                }
                className="accent-[#111111]"
              />
              Enable Email Digests (when configured)
            </label>
          </div>
          <div className="border-t border-[#E5E2DC] pt-4">
            <p className="text-neutral-600 mb-2 font-medium">
              Muted Categories (unchecked categories stay active):
            </p>
            <div className="flex flex-wrap gap-4">
              {NOTIFICATION_TYPES.filter((x) => x.id !== 'all').map((cat) => (
                <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={muted.includes(cat.id as NotificationType)}
                    onChange={() => toggleMutedType(cat.id as NotificationType)}
                    className="accent-[#111111]"
                  />
                  <span>Mute {cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Filter Bar */}
      <div className="bg-white border border-[#E5E2DC] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {NOTIFICATION_TYPES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTypeFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                typeFilter === cat.id
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-[#FAF9F6] text-neutral-700 border-[#E5E2DC] hover:border-[#111111]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="accent-[#111111]"
          />
          <span>{t('unreadOnly')}</span>
        </label>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E5E2DC] p-10 text-center text-xs text-neutral-500">
            {t('noNotificationsYet')}
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`border p-5 flex flex-wrap items-start justify-between gap-4 transition-colors ${
                n.read
                  ? 'bg-white border-[#E5E2DC]'
                  : 'bg-[#FAF9F6] border-[#8B6F47]'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-[240px]">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                  <span className="font-semibold uppercase tracking-wide text-[#8B6F47]">
                    {n.type}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  {!n.read && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#111111]">Unread</span>
                    </>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-[#111111]">{n.title}</h3>
                <p className="text-xs text-neutral-700 leading-relaxed">{n.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex items-center gap-1 border border-[#E5E2DC] bg-white hover:border-[#111111] px-3 py-1.5 text-xs font-medium cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('markRead')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateFromNotification(n)}
                  className="inline-flex items-center gap-1 bg-[#111111] text-white hover:bg-neutral-800 px-3.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  Open
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
