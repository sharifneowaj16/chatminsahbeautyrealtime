"use client";

import { useState } from "react";
import { Order } from "./types";
import { formatPrice } from "@/utils/currency";
import { Printer, Copy, Check, Download, X } from "lucide-react";

interface ThermalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toSafeMoney = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function ThermalReceiptModal({
  order,
  isOpen,
  onClose,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [copiedMemo, setCopiedMemo] = useState(false);

  if (!isOpen || !order) return null;

  const orderNum = order.id.slice(-8).toUpperCase();
  const subtotal = order.subtotal ?? order.total;
  const delivery = toSafeMoney(order.shippingCost);
  const discount = order.discountAmount ? toSafeMoney(order.discountAmount) : 0;
  const grandTotal = order.total;
  const isBkash =
    order.paymentMethod === "bkash" ||
    order.payments?.some((p) => p.method === "bkash");
  const trxId =
    order.paymentTransactionId ||
    order.payments?.find((p) => p.transactionId)?.transactionId ||
    `TRX-9BK${orderNum}`;
  const trackingCode =
    order.steadfastTrackingCode ||
    order.pathaoTrackingCode ||
    order.tracking ||
    `ST-${orderNum}`;
  const courierPartner =
    order.shippingMethod === "pathao"
      ? "PATHAO LOGISTICS"
      : "STEADFAST COURIER LOGISTICS";

  const formatTextMemo = () => {
    return [
      "==========================================",
      "             MINSAH BEAUTY               ",
      "     Authentic Premium Cosmetics         ",
      "  Shop #204, Genetic Plaza, Dhanmondi 27  ",
      "      Hotline: +880 9612-888999          ",
      "------------------------------------------",
      "       RETAIL INVOICE / CASH MEMO        ",
      `Order ID:    #ORD-${orderNum}`,
      `Date:        ${formatDate(order.createdAt)}`,
      `Cashier:     POS-01 (Admin)`,
      `Customer:    ${order.customer.name}`,
      `Phone:       ${order.customer.phone || "—"}`,
      `Courier:     ${courierPartner} (${order.shipping?.city || "Dhaka"})`,
      "------------------------------------------",
      "ITEM / DESCRIPTION                  TOTAL",
      "------------------------------------------",
      ...order.items.map(
        (it) =>
          `${it.name.slice(0, 20).padEnd(22)} ${it.quantity}x৳${it.price} = ৳${it.total}`,
      ),
      "------------------------------------------",
      `Subtotal:                    ৳${subtotal}`,
      `Delivery Charge:             ৳${delivery}`,
      discount > 0 ? `Discount (Promo):           -৳${discount}` : "",
      `TOTAL PAYABLE:               ৳${grandTotal}`,
      "------------------------------------------",
      `Payment Method:  ${isBkash ? "bKash Merchant Gateway" : "Cash on Delivery (COD)"}`,
      `Transaction ID:  ${trxId}`,
      `Status:          ${order.paymentStatus === "paid" ? "PAID / SETTLED" : "COD / PENDING COLLECTION"}`,
      "------------------------------------------",
      `Tracking Code:   ${trackingCode}`,
      "Consignment:     ★ VERIFIED DISPATCH ★",
      "==========================================",
      " Thank you for shopping with Minsah Beauty!",
      " Exchange accepted within 7 days with memo",
      "==========================================",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(formatTextMemo());
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = formatTextMemo();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-ORD-${orderNum}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print-specific style tag for ESC/POS thermal printers */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-receipt-printable, #pos-receipt-printable * {
            visibility: visible !important;
          }
          #pos-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === "80mm" ? "78mm" : "56mm"} !important;
            max-width: ${paperWidth === "80mm" ? "78mm" : "56mm"} !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: ${paperWidth === "80mm" ? "80mm" : "58mm"} auto;
            margin: 0mm;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        id="pos-receipt-modal"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative bg-[#071628] border border-[#1f2f45] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden z-10 animate-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-[#0d1c2d] border-b border-[#1f2f45] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 flex items-center justify-center text-[#8C98FB]">
                <Printer className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>POS Thermal Receipt Preview</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#5E6AD2]/20 text-indigo-300 border border-[#5E6AD2]/30">
                    {paperWidth} ESC/POS
                  </span>
                </h3>
                <p className="text-[10px] text-[#908fa0] font-mono mt-0.5">
                  Driver: EPSON TM-T88VI (USB001) • 203 DPI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-[#051424] border border-[#1f2f45] rounded-md p-0.5 text-[10px] font-medium">
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    paperWidth === "80mm"
                      ? "bg-[#5E6AD2] text-white font-semibold"
                      : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    paperWidth === "58mm"
                      ? "bg-[#5E6AD2] text-white font-semibold"
                      : "text-[#908fa0] hover:text-white"
                  }`}
                >
                  58mm Narrow
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white transition-colors"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Receipt Body Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#051424]/90 flex justify-center items-start">
            <div
              id="pos-receipt-printable"
              className={`w-full ${
                paperWidth === "80mm" ? "max-w-[350px]" : "max-w-[280px]"
              } bg-[#ffffff] text-neutral-900 rounded-sm shadow-2xl p-5 font-mono text-[11px] leading-relaxed border-t-4 border-dashed border-neutral-300 relative select-text`}
            >
              {/* Brand Header */}
              <div className="text-center space-y-0.5 pb-2.5">
                <div className="text-base font-extrabold tracking-wider text-black">
                  MINSAH BEAUTY
                </div>
                <div className="text-[10px] font-semibold uppercase text-neutral-700">
                  Premium Skincare & Cosmetics
                </div>
                <div className="text-[9px] text-neutral-600 leading-tight pt-0.5">
                  Shop #204, Genetic Plaza, Dhanmondi 27, Dhaka
                  <br />
                  Hotline: +880 9612-888999 • minsahbeauty.com
                </div>
                <div className="pt-1 font-bold tracking-widest text-[10px] text-black border-y border-dashed border-neutral-400 my-1 py-0.5">
                  RETAIL INVOICE / CASH MEMO
                </div>
              </div>

              {/* Order Metadata */}
              <div className="space-y-0.5 text-[10px] text-neutral-800 pb-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-black">Order ID:</span>
                  <span className="font-bold text-black">#ORD-{orderNum}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier/POS:</span>
                  <span>POS-01 (Admin)</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{order.customer.phone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Courier:</span>
                  <span>
                    {order.shippingMethod === "pathao" ? "Pathao" : "Steadfast"}{" "}
                    ({order.shipping?.city || "Dhaka"})
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border-t border-b border-dashed border-neutral-800 py-1 my-1.5">
                <div className="flex justify-between font-bold text-[10px] text-black pb-0.5">
                  <span>ITEM / DESCRIPTION</span>
                  <span>TOTAL</span>
                </div>
                <div className="space-y-1.5 pt-1 text-[10px]">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx}>
                      <div className="font-semibold text-black leading-tight">
                        {item.name}
                      </div>
                      <div className="flex justify-between text-neutral-600 pl-2">
                        <span>
                          {item.quantity} x {formatPrice(item.price)}
                        </span>
                        <span className="font-semibold text-black">
                          {formatPrice(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-0.5 text-[10px] pt-1 pb-1.5 text-neutral-800">
                <div className="flex justify-between">
                  <span>Subtotal ({order.items.length} items):</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Delivery Charge ({order.shipping?.city || "Dhaka"}):
                  </span>
                  <span className="font-semibold">{formatPrice(delivery)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT / Govt Tax (0%):</span>
                  <span>৳0.00</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Discount {order.couponCode ? `(${order.couponCode})` : ""}:
                    </span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline text-xs font-bold text-black border-t border-neutral-800 pt-1 mt-1">
                  <span>TOTAL PAYABLE:</span>
                  <span className="text-sm font-extrabold">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-neutral-400 pt-1.5 space-y-0.5 text-[9.5px] text-neutral-700">
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="font-bold text-black">
                    {isBkash
                      ? "bKash Merchant Gateway"
                      : "Cash on Delivery (COD)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TrxID:</span>
                  <span className="font-mono font-bold text-black">{trxId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold text-black">
                    {order.paymentStatus === "paid"
                      ? "PAID / SETTLED"
                      : "AWAITING COLLECTION"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tendered:</span>
                  <span>{formatPrice(grandTotal)} | Change: ৳0.00</span>
                </div>
              </div>

              {/* Barcode & Courier Dispatch Section */}
              <div className="pt-3 text-center space-y-1">
                <div className="flex justify-center items-center gap-2">
                  <div className="w-12 h-12 bg-neutral-100 border border-neutral-400 p-1 flex items-center justify-center shrink-0">
                    <svg
                      className="w-10 h-10 text-neutral-900"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 4h2v16H3V4zm4 0h1v16H7V4zm3 0h3v16h-3V4zm5 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />
                    </svg>
                  </div>
                  <div className="text-left font-mono text-[9px] text-neutral-700">
                    <div className="font-bold text-black">{trackingCode}</div>
                    <div>{courierPartner}</div>
                    <div className="text-emerald-700 font-bold">
                      ★ VERIFIED DISPATCH ★
                    </div>
                  </div>
                </div>

                <div className="text-[9px] text-neutral-600 pt-1 leading-tight border-t border-dashed border-neutral-300">
                  Customer Copy • Goods once sold are returnable within 7 days
                  with original memo and packaging intact.
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="px-4 py-3 bg-[#0d1c2d] border-t border-[#1f2f45] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMemo}
                className="px-2.5 py-1.5 rounded-md bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] text-xs font-medium transition-all inline-flex items-center gap-1.5"
              >
                {copiedMemo ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#908fa0]" />
                    <span>Copy Text Memo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-2.5 py-1.5 rounded-md bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#1f2f45] text-xs font-medium transition-all inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#908fa0]" />
                <span>Save .TXT</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-md bg-[#5E6AD2] hover:bg-[#4F5BC0] text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all inline-flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Slip</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-md bg-[#122131] hover:bg-[#1c2b3c] text-[#908fa0] hover:text-white border border-[#1f2f45] text-xs font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
