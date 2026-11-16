# MIK FASHION HUB — Operations, Architecture & Launch Documentation

## 1. Architecture Overview
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite (`vite-plugin-pwa` for installability & offline shell).
- **Bilingual Support (`EN | SW`)**: Full website language switcher between **English (`en`)** and **Kiswahili (`sw`)** in `src/lib/i18n.ts` and the header bar, persisted in `localStorage`.
- **Backend**: Express (`server.ts`) running on port `3000`, serving both `/api/*` endpoints and the React application.
- **Database & Authentication**: Cloud Firestore (`firebase-blueprint.json` + `firestore.rules`) & Firebase Authentication (Google Sign-In + Bearer ID token verification via `firebase-admin`), with atomic local JSON persistence fallback during development.
- **Markets & Currencies**: Dual-market support for **Tanzania (TZS)** and **International (USD, GBP, EUR, KES)**.

## 2. Manual Payment, Transaction ID Verification & Admin-First Order Settlement
Until automated online gateway credentials (AzamPay, Selcom, Pesapal, Stripe) are funded and activated, checkout clearly informs customers that direct automated payments are still being finalized and guides them through the verified manual settlement workflow:
1. **Checkout**: Customer selects **Mobile Money (`0795023200`)** or **NMB Bank (`21210095837` — Account Name: `MIK FASHION HUB`)** and places their order.
2. **Transaction ID Submission**: Customer pays the exact total and submits the SMS/bank **Transaction ID** via `POST /api/orders/:orderId/submit-transaction` (in Checkout Step 3 or **Customer Dashboard → Orders & Tracking**). The order enters `Awaiting Payment Verification`.
3. **Admin Payment Verification**: Super Admin (`mahelaissa1@gmail.com`) checks incoming transactions on `0795023200` / NMB `21210095837` against `submittedTransactionId` inside **Admin Console → Orders & Suborders** and clicks **Verify & Approve Payment** (or **Reject Invalid ID** with a note for the customer to re-submit).
4. **Admin Keeps Markup Profit & Settles Supplier**: Suppliers do **not** receive suborders for dispatch until Admin approves the payment, keeps the retail markup (`adminMarkupUsd`), sends the supplier's cost (`supplierNetEarningsUsd`), and enters the payout reference under **Mark Supplier Paid & Release Order** (`PATCH /api/admin/suborders/:suborderId/settle-supplier`).
5. **Supplier Fulfillment**: Once released (`SENT_TO_SUPPLIER`), the suborder appears in the supplier's portal with the paid customer's delivery address for direct shipping and tracking number entry.

## 3. Free Supplier Registration & Admin Retail Price Markup
1. **Free Onboarding**: Suppliers register at **zero fee (`free_standard`, TZS 0 / $0)** via **Sell on MIK**.
2. **Product Approval & Markup Pricing**: Suppliers submit only their **Supplier Base Price** (`wholesalePriceUsd`). Every new product or supplier price edit automatically enters `PENDING_APPROVAL`.
3. **Admin Retail Pricing**: In **Admin Console → Product Moderation**, Admin reviews the supplier base price, edits **Customer Selling Price (USD)** (`sellingPriceUsd`) to include Admin's profit markup (`sellingPriceUsd - wholesalePriceUsd`), and clicks **Save Price & Approve** before the product appears on the public storefront.

## 4. Database Schema Summary (`firebase-blueprint.json` & `src/types/marketplace.ts`)
- `users/{uid}` & `users/{uid}/private/info`: RBAC roles (`super_admin`, `staff`, `supplier`, `customer`, `delivery_partner`) and isolated PII (addresses, phone, email).
- `suppliers/{supplierId}`: Free onboarding (`REGISTERED → PENDING_REVIEW → APPROVED | REJECTED | SUSPENDED`), verification metadata, and payout preferences.
- `products/{productId}`: Multi-variant SKUs (size, color, stock), `wholesalePriceUsd` (supplier cost) vs Admin-controlled `sellingPriceUsd` (customer price), shipping origin, destinations, delivery window, and moderation status.
- `orders/{orderId}` & `suborders/{suborderId}`: Customer `submittedTransactionId`, `submittedPayerPhone`, Admin payment confirmation metadata, per-suborder `supplierBaseCostUsd`, `adminMarkupUsd`, `supplierNetEarningsUsd`, `supplierSettlementStatus` (`PENDING_ADMIN_TRANSFER | SENT_TO_SUPPLIER`), and `supplierSettlementRef`.
- `payments/{paymentId}`, `commission_rules`, `supplier_payouts`, `refund_requests`, `support_tickets`, `coupons`, `shipping_zones`, `reviews`, `notifications`, `audit_logs`, `marketplace_settings`.

## 5. Core API Endpoints
- **Storefront**: `GET /api/storefront/bootstrap`, `GET /api/products/:idOrSlug`, `GET /api/orders/track/:orderId?email=...`, `POST /api/coupons/validate`, `POST /api/newsletter/subscribe`, `POST /api/support/tickets`
- **Checkout & Manual Verification**: `POST /api/checkout/create-order`, `POST /api/orders/:orderId/submit-transaction`, `POST /api/payments/webhook/:provider`, `POST /api/payments/sandbox-verify` (Development Mode only)
- **Customer**: `GET /api/me`, `PATCH /api/me`, `POST /api/me/wishlist`, `GET /api/me/orders`, `POST /api/reviews`, `POST /api/refunds`, `GET /api/me/tickets`
- **Supplier (Isolated)**: `POST /api/suppliers/register`, `GET /api/supplier/workspace`, `POST /api/supplier/products`, `PUT /api/supplier/products/:id`, `POST /api/supplier/products/csv-import`, `PATCH /api/supplier/suborders/:id/status`, `POST /api/supplier/payouts`, `POST /api/supplier/refunds/:id/respond`
- **Super Admin / Staff**: `GET /api/admin/dashboard`, `PATCH /api/admin/suppliers/:id`, `PATCH /api/admin/products/:id`, `PATCH /api/admin/orders/:id/payment-confirm`, `PATCH /api/admin/suborders/:id/settle-supplier`, `PATCH /api/admin/suborders/:id/intervene`, `PATCH /api/admin/refunds/:id`, `PATCH /api/admin/payouts/:id`, `POST /api/admin/commission-rules`, `POST /api/admin/coupons`, `PATCH /api/admin/settings`, `POST /api/admin/announcements`, `PATCH /api/admin/users/:uid`, `PATCH /api/admin/tickets/:id`, `GET /api/admin/export/:type`

## 6. External Credentials (Future Automated Gateways)
- **Tanzania Mobile Money & Cards**:
  - **AzamPay**: `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`, `AZAMPAY_CLIENT_SECRET`, `AZAMPAY_WEBHOOK_SECRET`
  - **Selcom**: `SELCOM_VENDOR_ID`, `SELCOM_API_KEY`, `SELCOM_API_SECRET`
  - **Pesapal v3**: `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_IPN_ID`, `PESAPAL_WEBHOOK_SECRET`
- **International Cards (Stripe)**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **External Dropshipping APIs**: `CJ_DROPSHIPPING_EMAIL`, `CJ_DROPSHIPPING_API_KEY`, `DSERS_APP_KEY`, `DSERS_APP_SECRET`
- **Notifications**: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

## 7. Deployment Instructions
1. Populate production environment variables from `.env.example` (set `NODE_ENV=production`).
2. Run `npm install` and `npm run build` to bundle the frontend into `dist/`.
3. Deploy Firestore rules (`firebase deploy --only firestore:rules` or via AI Studio).
4. Start the server on port `3000` with `npm start`.

