import "server-only";

import {
  attachTelegramActionTokenContext,
  createTelegramActionToken,
  TELEGRAM_ORDER_ACTIONS,
} from "@/lib/telegram/action-tokens";
import { getTelegramOrderBotConfig } from "@/lib/telegram/auth";
import type { CustomerFraudRiskDetails } from "@/lib/courier/fraud-check";

interface OrderItemDetail {
  name: string;
  variant?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface AddressDetail {
  city: string;
  zone?: string | null;
  area?: string | null;
}

export interface DetailedOrderNotification {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: AddressDetail;
  items: OrderItemDetail[];
  subtotal: number;
  /** Customer-facing delivery charge saved in Order.shippingCost. */
  shippingCost: number;
  /** Internal courier actual charge from Pathao/Steadfast, when known. */
  courierDeliveryCharge?: number | null;
  /** Business subsidy/discount for delivery offers. */
  deliveryDiscountAmount?: number | null;
  deliveryPricingSource?: string | null;
  deliveryOfferType?: string | null;
  deliveryOfferBadgeText?: string | null;
  total: number;
  paymentMethod: string;
  courierVerification?: CustomerFraudRiskDetails | null;
}

interface BasicOrderNotification {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  itemsCount: number;
}

type NewOrderNotification = DetailedOrderNotification | BasicOrderNotification;

type TrustTier = "SAFE" | "CAUTION" | "DANGER";

interface ComputedTrustSummary {
  score: number;
  tier: TrustTier;
  isNewCustomer: boolean;
  totalReports: number;
  bar: string;
  dotsLabel: string;
  dots: string;
  badgeEmoji: string;
  tierLabel: string;
  verdictEmoji: string;
  verdictText: string;
}

const E = {
  bag: "\u{1F6CD}",
  newBadge: "\u{1F195}",
  tag: "\u{1F516}",
  clock: "\u{1F552}",
  cash: "\u{1F4B5}",
  user: "\u{1F464}",
  phone: "\u{1F4DE}",
  pin: "\u{1F4CD}",
  shield: "\u{1F6E1}",
  green: "\u{1F7E2}",
  yellow: "\u{1F7E1}",
  red: "\u{1F534}",
  white: "\u26AA",
  truck: "\u{1F69A}",
  pathao: "\u{1F17F}\uFE0F",
  star: "\u2B50",
  store: "\u{1F3EA}",
  flag: "\u{1F6A9}",
  sparkle: "\u2728",
  check: "\u2705",
  warn: "\u26A0\uFE0F",
  stop: "\u{1F6D1}",
  siren: "\u{1F6A8}",
  box: "\u{1F4E6}",
  bolt: "\u26A1",
  chat: "\u{1F4AC}",
  copy: "\u{1F4CB}",
  phoneOff: "\u{1F4F5}",
  cancel: "\u274C",
  taka: "\u09F3",
  midDot: "\u00B7",
  vPipe: "\u250A",
  corner: "\u2570",
  arrow: "\u2192",
  tri: "\u25B8",
  times: "\u00D7",
  barFull: "\u25B0",
  barEmpty: "\u25B1",
  heavyLine: "\u2501",
  dashLine: "\u2504",
  thinLine: "\u2500",
} as const;

function isDetailedOrder(
  order: NewOrderNotification,
): order is DetailedOrderNotification {
  return "orderId" in order && "items" in order && Array.isArray(order.items);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "0";
}

function formatTaka(value: number) {
  return `${E.taka}${formatAmount(value)}`;
}

function formatBangladeshDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  }).format(date);

  return { dateStr, timeStr };
}

function normalizeBangladeshPhoneDisplay(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "N/A";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `+880${digits}`;
  if (/^\d{8,15}$/.test(digits)) return `+${digits}`;

  return raw;
}

function normalizeLocalBangladeshPhone(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (/^8801\d{9}$/.test(digits)) return digits.slice(2);
  if (/^01\d{9}$/.test(digits)) return digits;
  if (/^1\d{9}$/.test(digits)) return `0${digits}`;
  return null;
}

function buildCustomerWhatsAppUrl(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (/^01\d{9}$/.test(digits)) normalized = `88${digits}`;
  else if (/^1\d{9}$/.test(digits)) normalized = `880${digits}`;
  else if (/^8801\d{9}$/.test(digits)) normalized = digits;

  if (/^8801\d{9}$/.test(normalized)) {
    return `https://wa.me/${normalized}`;
  }
  return null;
}

function deliverySourceShortLabel(source?: string | null) {
  const normalized = String(source || "").toUpperCase();
  const labels: Record<string, string> = {
    DEFAULT: "Std",
    PATHAO: "Pathao",
    STEADFAST: "Steadfast",
    PRODUCT_OFFER: "Offer",
    MANUAL: "Manual",
    FALLBACK: "Est.",
  };
  return labels[normalized] || "Courier";
}

function paymentMethodDisplay(method?: string | null) {
  const m = String(method || "COD").trim().toUpperCase();
  if (m === "CASH_ON_DELIVERY") return "COD";
  return m;
}

function buildProgressBar(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clamped / 10);
  return E.barFull.repeat(filled) + E.barEmpty.repeat(10 - filled);
}

function formatCourierStatusText(status: string): string {
  switch (status) {
    case "timeout":
      return "Timeout";
    case "circuit_open":
      return "Paused (Quota/Auth)";
    case "unconfigured":
      return "Not configured";
    case "invalid_phone":
      return "Invalid phone";
    default:
      return "Unavailable";
  }
}

function pathaoRatingToScore(rating: string | null | undefined): number | null {
  if (!rating) return null;
  const r = rating.toLowerCase();
  if (r.includes("excellent")) return 90;
  if (r.includes("good")) return 75;
  if (r.includes("moderate") || r.includes("average") || r.includes("new")) return 50;
  if (r.includes("risky") || r.includes("bad") || r.includes("fraud")) return 10;
  return 50;
}

function formatPathaoBadge(label: string | null | undefined, rating: string | null | undefined): string {
  const r = (rating || label || "").toLowerCase();
  const cleanLabel = (label || "Checked").replace(/\s+Customer$/i, "");
  if (r.includes("excellent") || r.includes("good")) return `${E.star} ${escapeHtml(cleanLabel)}`;
  if (r.includes("risky") || r.includes("bad") || r.includes("fraud")) return `${E.red} ${escapeHtml(cleanLabel)}`;
  if (r.includes("moderate") || r.includes("average")) return `${E.yellow} ${escapeHtml(cleanLabel)}`;
  return escapeHtml(cleanLabel);
}

function computeTrustSummary(details?: CustomerFraudRiskDetails | null): ComputedTrustSummary {
  if (!details) {
    return {
      score: 50,
      tier: "CAUTION",
      isNewCustomer: true,
      totalReports: 0,
      bar: buildProgressBar(50),
      dotsLabel: "Safety",
      dots: E.green.repeat(3) + E.white.repeat(2),
      badgeEmoji: E.yellow,
      tierLabel: "UNVERIFIED",
      verdictEmoji: E.warn,
      verdictText: "Call kore address nishchit korun",
    };
  }

  const sf = details.steadfast;
  const p = details.pathao;
  const s = details.storeHistory;
  const sp = details.smartposbd;

  // 1. Steadfast (60%)
  let sfScore = 50;
  let hasSfSignal = false;
  if (sf.status === "ok") {
    if (sf.deliveryRatio !== null) {
      sfScore = sf.deliveryRatio;
      hasSfSignal = true;
    } else if (sf.totalParcels !== null && sf.totalParcels > 0 && sf.deliveredCount !== null) {
      sfScore = Math.round((sf.deliveredCount / sf.totalParcels) * 100);
      hasSfSignal = true;
    }
  }

  // 2. Pathao (25%)
  let pathaoScore = 50;
  let hasPathaoSignal = false;
  if (p.status === "ok") {
    if (p.successRate !== null && (p.totalParcels ?? 0) > 0) {
      pathaoScore = p.successRate;
      hasPathaoSignal = true;
    } else {
      const mapped = pathaoRatingToScore(p.customerRating);
      if (mapped !== null) {
        pathaoScore = mapped;
        hasPathaoSignal = !String(p.customerRating || "").toLowerCase().includes("new");
      }
    }
  }

  // 3. Minsah history (15%) - cancel/return excluded ratio; new customer = 50
  let minsahScore = 50;
  const hasMinsahSignal = s.totalOrders > 0;
  if (s.totalOrders > 0) {
    const cleanOrders = Math.max(0, s.totalOrders - s.cancelledCount - s.returnedCount);
    minsahScore = Math.round((cleanOrders / s.totalOrders) * 100);
  }

  // 4. Fraud reports penalty (-5 each, plus safety caps for multi-reported accounts)
  const totalReports =
    (sf.status === "ok" ? sf.totalReports : 0) +
    (sp?.status === "ok" ? sp.unresolvedReports : 0);

  let rawScore = Math.round(sfScore * 0.6 + pathaoScore * 0.25 + minsahScore * 0.15 - 5 * totalReports);
  if (totalReports >= 2) rawScore = Math.min(rawScore, 45);
  else if (totalReports === 1) rawScore = Math.min(rawScore, 75);

  const score = Math.max(0, Math.min(100, rawScore));
  const isNewCustomer = !hasSfSignal && !hasPathaoSignal && !hasMinsahSignal && totalReports === 0;

  if (score >= 80) {
    const greenDots = Math.max(1, Math.min(5, Math.round(score / 20)));
    return {
      score,
      tier: "SAFE",
      isNewCustomer: false,
      totalReports,
      bar: buildProgressBar(score),
      dotsLabel: "Safety",
      dots: E.green.repeat(greenDots) + E.white.repeat(5 - greenDots),
      badgeEmoji: E.green,
      tierLabel: "VERY SAFE",
      verdictEmoji: E.check,
      verdictText: "Confirm korte nirapod",
    };
  }

  if (score >= 50) {
    const greenDots = Math.max(1, Math.min(5, Math.round(score / 20)));
    return {
      score,
      tier: "CAUTION",
      isNewCustomer,
      totalReports,
      bar: buildProgressBar(score),
      dotsLabel: "Safety",
      dots: E.green.repeat(greenDots) + E.white.repeat(5 - greenDots),
      badgeEmoji: E.yellow,
      tierLabel: isNewCustomer ? "NEW CUSTOMER" : "CAUTION",
      verdictEmoji: E.warn,
      verdictText: isNewCustomer
        ? "Notun customer - call kore address nishchit korun"
        : "Call kore address nishchit korun",
    };
  }

  const riskDots = Math.max(1, Math.min(5, Math.round((100 - score) / 20)));
  return {
    score,
    tier: "DANGER",
    isNewCustomer: false,
    totalReports,
    bar: buildProgressBar(score),
    dotsLabel: "Risk",
    dots: E.red.repeat(riskDots) + E.white.repeat(5 - riskDots),
    badgeEmoji: E.red,
    tierLabel: "DANGER",
    verdictEmoji: E.stop,
    verdictText: "Advance chaile bhalo, na hole hold korun",
  };
}

export function formatCourierHistoryForTelegram(
  details?: CustomerFraudRiskDetails | null,
): string {
  const trust = computeTrustSummary(details);
  const sep = E.dashLine.repeat(18);

  if (!details) {
    return (
      `<blockquote expandable>${E.shield} <b>TRUST SCORE</b> ${E.midDot} ${E.yellow} <b>Unverified</b>\n` +
      `${E.warn} <b>Verdict:</b> Call kore address nishchit korun\n` +
      `${sep}\n` +
      `${E.truck} <b>Steadfast</b>  Unavailable\n` +
      `${E.pathao} <b>Pathao</b>  Unavailable</blockquote>`
    );
  }

  const reportPill =
    trust.totalReports > 0
      ? `  ${E.flag}${E.red}<b>${trust.totalReports}</b>`
      : "";

  const lines: string[] = [
    `${E.shield} <b>TRUST SCORE</b> ${E.midDot} ${trust.badgeEmoji} <b>${trust.score}</b>/100 ${E.midDot} <b>${trust.tierLabel}</b>${details.cached ? " <i>(cached)</i>" : ""}`,
    `<code>${trust.bar}</code>  ${trust.dots}${reportPill}`,
    `${trust.verdictEmoji} <b>Verdict:</b> ${trust.verdictText}`,
    sep,
  ];

  // Steadfast line
  const sf = details.steadfast;
  if (sf.status === "ok") {
    if (sf.deliveryRatio !== null) {
      lines.push(
        `${E.truck} <b>Steadfast</b>  <code>${buildProgressBar(sf.deliveryRatio)}</code>  <b>${sf.deliveryRatio}%</b>`,
      );
    } else {
      lines.push(`${E.truck} <b>Steadfast</b>  No parcel history`);
    }
    const sfSub: string[] = [];
    if (sf.cancellationRatio !== null) sfSub.push(`${sf.cancellationRatio}% cancel`);
    if (sf.totalParcels !== null && sf.deliveredCount !== null && sf.cancelledCount !== null) {
      sfSub.push(`${sf.deliveredCount} ok / ${sf.cancelledCount} cancel (${sf.totalParcels})`);
    } else if (sf.volumeRange) {
      sfSub.push(`${escapeHtml(sf.volumeRange)} orders`);
    }
    if (sfSub.length > 0) {
      lines.push(`${E.corner} ${sfSub.join(` ${E.midDot} `)}`);
    }
  } else {
    lines.push(`${E.truck} <b>Steadfast</b>  ${escapeHtml(formatCourierStatusText(sf.status))}`);
  }

  // Pathao line (exact count when available via Direct or SmartPOSBD, rating always shown)
  const p = details.pathao;
  if (p.status === "ok") {
    const ratingBadge = formatPathaoBadge(p.customerRatingLabel, p.customerRating);
    if (p.totalParcels !== null && p.deliveredCount !== null && p.successRate !== null) {
      lines.push(
        `${E.pathao} <b>Pathao</b>  <code>${buildProgressBar(p.successRate)}</code>  <b>${p.successRate}%</b>`,
      );
      lines.push(
        `${E.corner} ${p.deliveredCount} ok / ${p.cancelledCount ?? 0} cancel (${p.totalParcels}) ${E.midDot} ${ratingBadge}`,
      );
    } else {
      lines.push(`${E.pathao} <b>Pathao</b>  ${ratingBadge}`);
    }
  } else {
    lines.push(`${E.pathao} <b>Pathao</b>  ${escapeHtml(formatCourierStatusText(p.status))}`);
  }

  // Extra couriers from SmartPOSBD (only shown if API key is configured and customer has parcels there)
  const sp = details.smartposbd;
  if (sp?.status === "ok") {
    const extras: string[] = [];
    if (sp.couriers.redx && sp.couriers.redx.total > 0) {
      extras.push(`RedX ${sp.couriers.redx.success}/${sp.couriers.redx.total}`);
    }
    if (sp.couriers.carrybee && sp.couriers.carrybee.total > 0) {
      extras.push(`CarryBee ${sp.couriers.carrybee.success}/${sp.couriers.carrybee.total}`);
    }
    if (sp.couriers.paperfly && sp.couriers.paperfly.total > 0) {
      extras.push(`Paperfly ${sp.couriers.paperfly.success}/${sp.couriers.paperfly.total}`);
    }
    if (extras.length > 0) {
      lines.push(`${E.box} <b>Other</b>  ${escapeHtml(extras.join(` ${E.midDot} `))}`);
    }
    if (sp.totalParcels > 0) {
      const totalRate = Math.round((sp.successParcels / sp.totalParcels) * 100);
      lines.push(
        `${E.corner} All 5 Couriers: <b>${sp.successParcels}/${sp.totalParcels}</b> (${totalRate}%)`,
      );
    }
  }

  // Minsah previous orders
  const s = details.storeHistory;
  if (s.totalOrders === 0) {
    lines.push(`${E.store} <b>Minsah</b>  Notun customer`);
  } else {
    const mParts = [`${s.totalOrders} orders`];
    if (s.deliveredCount > 0) mParts.push(`${s.deliveredCount} ok`);
    if (s.cancelledCount > 0) mParts.push(`${s.cancelledCount} cancel`);
    if (s.returnedCount > 0) mParts.push(`${s.returnedCount} return`);
    if (s.pendingCount > 0 && s.deliveredCount === 0 && s.cancelledCount === 0 && s.returnedCount === 0) {
      mParts.push(`${s.pendingCount} active`);
    }
    lines.push(`${E.store} <b>Minsah</b>  ${mParts.join(` ${E.midDot} `)}`);
  }

  // Reports line
  const flagTags =
    sf.status === "ok" && sf.fraudCategories.length > 0
      ? ` ${E.midDot} ` + sf.fraudCategories.map((c) => `<code>${escapeHtml(c)}</code>`).join(" ")
      : "";
  if (trust.totalReports > 0) {
    lines.push(`${E.flag} <b>Reports</b>  ${E.red} <b>${trust.totalReports}</b>${flagTags}`);
  } else {
    lines.push(`${E.flag} <b>Reports</b>  <b>0</b> ${E.sparkle}`);
  }

  // Keep DANGER open by default so red flags are never missed; SAFE/CAUTION start minimized
  const openTag = trust.tier === "DANGER" ? "<blockquote>" : "<blockquote expandable>";
  return `${openTag}${lines.join("\n")}</blockquote>`;
}

function buildReceiptLine(label: string, value: string, width = 26): string {
  const pad = Math.max(1, width - label.length - value.length);
  return label + " ".repeat(pad) + value;
}

function buildBasicMessage(order: BasicOrderNotification) {
  return (
    `${E.bag} <b>MINSAH BEAUTY</b>\n` +
    `Order: <code>#${escapeHtml(order.orderNumber)}</code>\n` +
    `Total: <b>${formatTaka(order.total)}</b> (${escapeHtml(paymentMethodDisplay(order.paymentMethod))})\n` +
    `Items: ${order.itemsCount}`
  );
}

function compactVariant(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/Size\/Volume:\s*/gi, "")
    .replace(/Color\/Shade:\s*/gi, "")
    .replace(/\s*\/\s*/g, ` ${E.midDot} `)
    .trim();
  return cleaned || null;
}

function buildDetailedMessage(order: DetailedOrderNotification) {
  const { dateStr, timeStr } = formatBangladeshDateTime(new Date());
  const trust = computeTrustSummary(order.courierVerification);
  const payLabel = paymentMethodDisplay(order.paymentMethod);
  const displayPhone = normalizeBangladeshPhoneDisplay(order.customerPhone);

  // Header
  const headerTop =
    trust.tier === "DANGER"
      ? `${E.siren} <b>HIGH RISK</b> ${E.vPipe} ${E.newBadge} <b>Pending Call</b>\n` +
        `${E.tag} <code>#${escapeHtml(order.orderNumber)}</code> ${E.midDot} ${dateStr} ${E.midDot} ${timeStr}`
      : `${E.bag} <b>MINSAH BEAUTY</b>\n` +
        `${E.heavyLine.repeat(20)}\n` +
        `${E.newBadge} <b>Pending Call</b> ${E.vPipe} ${E.tag} <code>#${escapeHtml(order.orderNumber)}</code>\n` +
        `${E.clock} ${dateStr} ${E.midDot} ${timeStr}`;

  // Payment Hero Box
  const paymentHero = `<blockquote>${E.cash} <b>${escapeHtml(payLabel)} ${E.midDot} ${formatTaka(order.total)}</b></blockquote>`;

  // Customer Box
  const locationParts = [order.address.zone, order.address.city]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  const locationLine = locationParts.length > 0 ? escapeHtml(locationParts.join(", ")) : "N/A";
  const streetLine = order.address.area?.trim()
    ? `\n${E.corner} ${escapeHtml(order.address.area.trim())}`
    : "";

  const customerBox =
    `<blockquote>${E.user} <b>${escapeHtml(order.customerName)}</b>\n` +
    `${E.phone} <code>${escapeHtml(displayPhone)}</code>\n` +
    `${E.pin} ${locationLine}${streetLine}</blockquote>`;

  // Trust Score Box
  const trustBox =
    order.courierVerification !== undefined
      ? `\n${formatCourierHistoryForTelegram(order.courierVerification)}`
      : "";

  // Items Box (auto-expandable when 2+ items, with safe Telegram 4096-char guard)
  const formatItemsBlock = (maxVisible: number) => {
    const visibleItems = order.items.slice(0, maxVisible);
    const hiddenCount = order.items.length - visibleItems.length;
    const itemLines = visibleItems.map((item, idx) => {
      const variant = compactVariant(item.variant);
      const variantPart = variant ? `<code>${escapeHtml(variant)}</code> ` : "";
      return (
        `<b>${idx + 1}</b> ${E.tri} ${escapeHtml(item.name)}\n` +
        `${E.corner} ${variantPart}${E.times} ${item.quantity} = <b>${formatTaka(item.total)}</b>`
      );
    });
    if (hiddenCount > 0) {
      itemLines.push(
        `<i>... +${hiddenCount} more item${hiddenCount > 1 ? "s" : ""} (see Admin Panel)</i>`,
      );
    }
    const itemsTag = order.items.length >= 2 ? "<blockquote expandable>" : "<blockquote>";
    return (
      `${itemsTag}${E.box} <b>ITEMS (${order.items.length})</b>\n` +
      `${itemLines.join("\n") || "N/A"}</blockquote>`
    );
  };

  // Monospace Receipt Billing
  const deliveryLabel = `Delivery (${deliverySourceShortLabel(order.deliveryPricingSource)})`;
  const deliveryVal = order.shippingCost <= 0 ? "FREE" : formatTaka(order.shippingCost);
  const receiptRows: string[] = [
    buildReceiptLine("Subtotal", formatTaka(order.subtotal)),
    buildReceiptLine(deliveryLabel, deliveryVal),
  ];

  if (
    typeof order.courierDeliveryCharge === "number" &&
    Math.round(order.courierDeliveryCharge) !== Math.round(order.shippingCost)
  ) {
    receiptRows.push(
      buildReceiptLine("Courier Actual", formatTaka(order.courierDeliveryCharge)),
    );
  }
  if ((order.deliveryDiscountAmount || 0) > 0) {
    receiptRows.push(
      buildReceiptLine("Subsidy", `-${formatTaka(order.deliveryDiscountAmount || 0)}`),
    );
  }

  receiptRows.push(E.thinLine.repeat(26));
  receiptRows.push(buildReceiptLine(`PAYABLE (${payLabel})`, formatTaka(order.total)));

  const receiptBlock = `<pre>${escapeHtml(receiptRows.join("\n"))}</pre>`;

  const offerNote = order.deliveryOfferBadgeText
    ? `\n<i>Offer: ${escapeHtml(order.deliveryOfferBadgeText)}</i>`
    : "";

  const footer =
    trust.tier === "DANGER"
      ? `${E.bolt} <i>Advance na dile confirm korben na</i>`
      : `${E.bolt} <i>Call korun ${E.arrow} Phone Confirmed chapun</i>`;

  const compose = (itemsBlock: string) =>
    `${headerTop}\n` +
    `${paymentHero}\n` +
    `${customerBox}` +
    `${trustBox}\n` +
    `${itemsBlock}\n` +
    `${receiptBlock}${offerNote}\n` +
    `${footer}`;

  let message = compose(formatItemsBlock(15));
  if (message.length > 3950) {
    message = compose(formatItemsBlock(5));
  }
  if (message.length > 3950) {
    message = compose(formatItemsBlock(2));
  }
  return message;
}

async function sendTelegramMessage(body: Record<string, unknown>) {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) {
    throw new Error("Telegram order bot not configured.");
  }

  const res = await fetch(`${config.relayBase}${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${text}`);
  }

  return res.json().catch(() => null);
}

async function buildOrderActionButtons(orderId: string, customerPhone?: string | null) {
  const whatsAppUrl = buildCustomerWhatsAppUrl(customerPhone);
  const localPhone = normalizeLocalBangladeshPhone(customerPhone);

  const [phoneConfirm, phoneOff, cancel] = await Promise.all([
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.PHONE_CONFIRM,
      orderId,
    }),
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.PHONE_OFF,
      orderId,
    }),
    createTelegramActionToken({
      action: TELEGRAM_ORDER_ACTIONS.CANCEL,
      orderId,
    }),
  ]);

  const row2Styled: Array<Record<string, unknown>> = [];
  if (whatsAppUrl) {
    row2Styled.push({
      text: `${E.chat} WhatsApp`,
      url: whatsAppUrl,
      style: "primary",
    });
  }
  if (localPhone) {
    row2Styled.push({
      text: `${E.copy} Copy Phone`,
      copy_text: { text: localPhone },
    });
  }

  const styledMarkup = {
    inline_keyboard: [
      [
        {
          text: `${E.check} Phone Confirmed`,
          callback_data: phoneConfirm.callbackData,
          style: "success",
        },
      ],
      ...(row2Styled.length > 0 ? [row2Styled] : []),
      [
        {
          text: `${E.phoneOff} Phone Off`,
          callback_data: phoneOff.callbackData,
        },
        {
          text: `${E.cancel} Cancel`,
          callback_data: cancel.callbackData,
          style: "danger",
        },
      ],
    ],
  };

  const standardMarkup = {
    inline_keyboard: [
      [
        {
          text: `${E.check} Phone Confirmed`,
          callback_data: phoneConfirm.callbackData,
        },
      ],
      ...(whatsAppUrl
        ? [
            [
              {
                text: `${E.chat} WhatsApp`,
                url: whatsAppUrl,
              },
            ],
          ]
        : []),
      [
        {
          text: `${E.phoneOff} Phone Off`,
          callback_data: phoneOff.callbackData,
        },
        {
          text: `${E.cancel} Cancel`,
          callback_data: cancel.callbackData,
        },
      ],
    ],
  };

  return {
    tokenIds: [phoneConfirm.tokenId, phoneOff.tokenId, cancel.tokenId],
    styledMarkup,
    standardMarkup,
  };
}

function extractTelegramSentMessageContext(response: unknown) {
  if (!response || typeof response !== "object") return null;
  const data = response as {
    ok?: boolean;
    result?: { message_id?: number | string; chat?: { id?: number | string } };
  };
  const messageId = data.result?.message_id;
  const chatId = data.result?.chat?.id;
  if (messageId == null || chatId == null) return null;
  return { messageId, chatId };
}

let webhookRegistrationPromise: Promise<{ ok: boolean; webhookInfo?: unknown; error?: string }> | null = null;

export async function ensureTelegramWebhookRegistered(force = false): Promise<{
  ok: boolean;
  webhookInfo?: unknown;
  error?: string;
}> {
  if (webhookRegistrationPromise && !force) {
    return webhookRegistrationPromise;
  }

  const runRegistration = async () => {
    const config = getTelegramOrderBotConfig();
    if (!config.relayBase || !config.botToken) {
      return { ok: false, error: 'TELEGRAM_BOT_NOT_CONFIGURED' };
    }

    const webhookUrl =
      process.env.TELEGRAM_WEBHOOK_URL ||
      'https://minsahbeauty.cloud/api/telegram/order-callback';

    try {
      const currentInfo = await getTelegramWebhookInfo();
      if (currentInfo.ok && currentInfo.result?.url === webhookUrl) {
        return { ok: true, webhookInfo: currentInfo.result };
      }

      const res = await fetch(`${config.relayBase}${config.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          ...(config.webhookSecret ? { secret_token: config.webhookSecret } : {}),
          allowed_updates: ['callback_query', 'message'],
          drop_pending_updates: false,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const err = data?.description || `HTTP ${res.status}`;
        console.error('[TelegramWebhook] setWebhook failed:', err);
        return { ok: false, error: err };
      }

      console.log('[TelegramWebhook] Successfully registered webhook:', webhookUrl);
      return { ok: true, webhookInfo: data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[TelegramWebhook] Error registering webhook:', errorMsg);
      return { ok: false, error: errorMsg };
    }
  };

  webhookRegistrationPromise = runRegistration();
  return webhookRegistrationPromise;
}

export async function getTelegramWebhookInfo(): Promise<{
  ok: boolean;
  result?: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    ip_address?: string;
  };
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken) {
    return { ok: false, error: 'TELEGRAM_BOT_NOT_CONFIGURED' };
  }

  try {
    const res = await fetch(`${config.relayBase}${config.botToken}/getWebhookInfo`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: data.result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function notifyNewOrder(order: NewOrderNotification): Promise<{
  ok: boolean;
  messageId?: string | number;
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.warn("[TelegramNotify] Telegram order bot not configured - skipping notification.");
    return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  }

  ensureTelegramWebhookRegistered().catch((err) => {
    console.warn("[TelegramNotify] Auto-webhook registration error:", err);
  });

  const baseText = isDetailedOrder(order)
    ? buildDetailedMessage(order)
    : buildBasicMessage(order);

  let actionTokenIds: string[] = [];
  let styledMarkup: Record<string, unknown> | undefined = undefined;
  let standardMarkup: Record<string, unknown> | undefined = undefined;

  if (isDetailedOrder(order)) {
    try {
      const buttons = await buildOrderActionButtons(order.orderId, order.customerPhone);
      styledMarkup = buttons.styledMarkup;
      standardMarkup = buttons.standardMarkup;
      actionTokenIds = buttons.tokenIds;
    } catch (btnErr) {
      console.error("[TelegramNotify] Failed to build action buttons:", btnErr);
    }
  }

  const attachTokensIfSent = async (response: unknown) => {
    const sentContext = extractTelegramSentMessageContext(response);
    if (sentContext && actionTokenIds.length) {
      await attachTelegramActionTokenContext({
        tokenIds: actionTokenIds,
        telegramChatId: sentContext.chatId,
        messageId: sentContext.messageId,
      }).catch((err) => console.error("[TelegramNotify] attach context failed:", err));
    }
    return sentContext?.messageId;
  };

  const stripExpandable = (html: string) =>
    html.replace(/<blockquote expandable>/g, "<blockquote>");

  // Tier 1: Styled colored buttons + copy_text + expandable quotes
  try {
    const response = await sendTelegramMessage({
      chat_id: config.chatId,
      text: baseText,
      parse_mode: "HTML",
      ...(styledMarkup ? { reply_markup: styledMarkup } : {}),
    });
    const messageId = await attachTokensIfSent(response);
    return { ok: true, messageId };
  } catch (err) {
    console.warn("[TelegramNotify] Styled button send failed, retrying with standard buttons:", err);
  }

  // Tier 2: Standard inline buttons + expandable quotes
  if (standardMarkup) {
    try {
      const response = await sendTelegramMessage({
        chat_id: config.chatId,
        text: baseText,
        parse_mode: "HTML",
        reply_markup: standardMarkup,
      });
      const messageId = await attachTokensIfSent(response);
      return { ok: true, messageId };
    } catch (stdErr) {
      console.warn("[TelegramNotify] Standard buttons failed, checking expandable fallback:", stdErr);
    }
  }

  // Tier 3: Standard inline buttons + plain <blockquote> (if relay rejects expandable attr)
  const compatText = stripExpandable(baseText);
  if (standardMarkup && compatText !== baseText) {
    try {
      const response = await sendTelegramMessage({
        chat_id: config.chatId,
        text: compatText,
        parse_mode: "HTML",
        reply_markup: standardMarkup,
      });
      const messageId = await attachTokensIfSent(response);
      return { ok: true, messageId };
    } catch (compatErr) {
      console.error("[TelegramNotify] Compat buttons failed, retrying plain HTML:", compatErr);
    }
  }

  // Tier 4: Plain HTML without buttons
  try {
    const response = await sendTelegramMessage({
      chat_id: config.chatId,
      text: compatText,
      parse_mode: "HTML",
    });
    const sentContext = extractTelegramSentMessageContext(response);
    return { ok: true, messageId: sentContext?.messageId };
  } catch (fallbackErr) {
    const errorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    console.error("[TelegramNotify] Plain HTML fallback also failed:", errorMsg);
    return { ok: false, error: errorMsg };
  }
}

export async function sendTelegramHtmlMessage(message: string): Promise<{
  ok: boolean;
  messageId?: string | number;
  error?: string;
}> {
  const config = getTelegramOrderBotConfig();
  if (!config.relayBase || !config.botToken || !config.chatId) {
    console.warn("[TelegramNotify] Telegram order bot not configured - skipping HTML message.");
    return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  }

  try {
    const response = await sendTelegramMessage({
      chat_id: config.chatId,
      text: message,
      parse_mode: "HTML",
    });
    const sentContext = extractTelegramSentMessageContext(response);
    return { ok: true, messageId: sentContext?.messageId };
  } catch (err) {
    if (message.includes("<blockquote expandable>")) {
      try {
        const response = await sendTelegramMessage({
          chat_id: config.chatId,
          text: message.replace(/<blockquote expandable>/g, "<blockquote>"),
          parse_mode: "HTML",
        });
        const sentContext = extractTelegramSentMessageContext(response);
        return { ok: true, messageId: sentContext?.messageId };
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error("[TelegramNotify] sendTelegramHtmlMessage compat retry failed:", retryMsg);
        return { ok: false, error: retryMsg };
      }
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[TelegramNotify] sendTelegramHtmlMessage failed:", errorMsg);
    return { ok: false, error: errorMsg };
  }
}
