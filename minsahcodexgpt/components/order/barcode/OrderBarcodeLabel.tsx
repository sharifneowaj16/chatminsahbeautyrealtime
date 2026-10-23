"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface OrderBarcodeLabelProps {
  orderId?: string;
  orderNumber?: string;
  theme?: "metallic" | "thermal" | "minimal";
  size?: "standard" | "compact" | "marklife-p15"; // standard: 50x30mm, compact: 40x25mm, marklife-p15: 40x15mm slim tape
  onPrint?: () => void;
}

export function OrderBarcodeLabel({
  orderId = "00003908",
  orderNumber = "MB-00003908",
  theme = "thermal",
  size = "marklife-p15",
}: OrderBarcodeLabelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const targetUrl = `https://www.minsahbeauty.cloud/order/${orderId}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [targetUrl]);

  // Marklife P15 Special Slim Strip Layout (15mm Height Tape)
  if (size === "marklife-p15") {
    return (
      <div
        className={`order-label-sticker marklife-p15 relative select-none overflow-hidden transition-all duration-300 font-sans w-[220px] h-[74px] p-1.5 rounded-lg flex items-center justify-between gap-2 ${
          theme === "metallic"
            ? "bg-gradient-to-br from-[#E2E6E9] via-[#F4F6F8] to-[#CBD1D6] text-black border border-[#B0B7BE] shadow-md"
            : theme === "thermal"
            ? "bg-white text-black border-2 border-black shadow-xs"
            : "bg-white text-black border border-gray-300 shadow-xs"
        }`}
        style={{
          boxShadow:
            theme === "metallic"
              ? "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)"
              : undefined,
        }}
      >
        {/* Scannable 2D QR Code Box (12mm x 12mm equivalent) */}
        <div className="relative p-0.5 bg-white rounded-sm border border-black/30 shrink-0 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for Order ${orderId}`}
              className="w-[58px] h-[58px] object-contain"
            />
          ) : (
            <div className="w-[58px] h-[58px] bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">
              QR...
            </div>
          )}
        </div>

        {/* Order Details Column (Slim fit for 15mm width) */}
        <div className="flex flex-col justify-center flex-1 min-w-0 pr-1 leading-tight">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-wider text-black">
              MINSAH BEAUTY
            </span>
            <span className="text-[7px] font-bold px-1 rounded bg-black/10 text-black">
              P15
            </span>
          </div>

          <span className="text-xs font-black font-mono tracking-tight text-black truncate mt-1">
            #{orderNumber}
          </span>

          <div className="mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span className="text-[7.5px] font-bold uppercase tracking-wider text-black/75">
              Scan to Track
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Standard & Compact Layouts (50x30mm & 40x25mm)
  return (
    <div
      className={`order-label-sticker relative select-none overflow-hidden transition-all duration-300 font-sans ${
        size === "compact"
          ? "w-[240px] h-[135px] p-2.5 rounded-xl"
          : "w-[280px] h-[155px] p-3 rounded-2xl"
      } ${
        theme === "metallic"
          ? "bg-gradient-to-br from-[#E2E6E9] via-[#F4F6F8] to-[#CBD1D6] text-[#111827] shadow-lg border border-[#B0B7BE]/80"
          : theme === "thermal"
          ? "bg-white text-black border-2 border-black shadow-sm"
          : "bg-white text-[#062402] border border-[#E2DED8] shadow-sm"
      }`}
      style={{
        boxShadow:
          theme === "metallic"
            ? "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 4px 14px rgba(0, 0, 0, 0.08)"
            : undefined,
      }}
    >
      {/* Metallic Shine Overlay */}
      {theme === "metallic" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-60 -skew-x-12"
        />
      )}

      {/* Header Bar */}
      <div className="relative flex items-center justify-between pb-1.5 border-b border-black/15">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1C3A13]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-black">
            MINSAH BEAUTY
          </span>
        </div>
        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/10 text-black tracking-wider">
          2D SCAN
        </span>
      </div>

      {/* Body Grid: 2D QR Code + Order Metadata */}
      <div className="relative flex items-center justify-between gap-2.5 pt-2">
        {/* Scannable 2D QR Code Box */}
        <div className="relative p-1 bg-white rounded-lg border border-black/20 shadow-xs shrink-0 flex items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for Order ${orderId}`}
              className={size === "compact" ? "w-[76px] h-[76px]" : "w-[88px] h-[88px]"}
            />
          ) : (
            <div
              className={`bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 ${
                size === "compact" ? "w-[76px] h-[76px]" : "w-[88px] h-[88px]"
              }`}
            >
              Loading QR...
            </div>
          )}
        </div>

        {/* Order Details & Mobile Scanner Hint */}
        <div className="flex flex-col justify-center flex-1 min-w-0 pr-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-black/60">
            Order Identity
          </span>
          <span className="text-sm font-black font-mono tracking-tight text-black truncate leading-tight mt-0.5">
            #{orderNumber}
          </span>

          <div className="mt-2 pt-1.5 border-t border-black/10 flex flex-col gap-0.5">
            <span className="text-[8px] font-semibold text-black/75 uppercase tracking-wide flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Verified Authentic
            </span>
            <span className="text-[7.5px] font-medium text-black/55 leading-tight">
              Scan with phone camera or 2D scanner to view live status
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default OrderBarcodeLabel;
