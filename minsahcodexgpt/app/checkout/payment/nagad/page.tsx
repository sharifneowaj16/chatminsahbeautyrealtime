"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/utils/currency";
import PaymentRecoveryActions from "@/features/checkout/PaymentRecoveryActions";

type PaymentSummary = {
  success: boolean;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: "BDT";
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  customerPhone: string | null;
  canInitiatePayment: boolean;
  paymentExpiresAt: string | null;
  paymentWindowExpired: boolean;
  latestPaymentStatus: string | null;
  latestPaymentCreatedAt: string | null;
  disabledReason: string | null;
  message?: string;
};

function normalizeBdMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length >= 13)
    return digits.slice(2, 13);
  if (digits.startsWith("01")) return digits.slice(0, 11);
  return digits.slice(0, 11);
}

function isValidBdMobileNumber(value: string) {
  return /^01[3-9]\d{8}$/.test(value);
}

function getFriendlyPaymentError(message: string, gatewayLabel = "Nagad") {
  const lower = message.toLowerCase();
  if (
    lower.includes("missing order reference") ||
    lower.includes("order reference")
  ) {
    return "Order reference is missing. Return to checkout and start payment again.";
  }
  if (lower.includes("expired")) {
    return "The payment window has expired. Return to checkout to start a new payment.";
  }
  if (lower.includes("already paid")) {
    return "Payment for this order is already complete.";
  }
  if (lower.includes("processing")) {
    return "A payment attempt for this order is already processing. Check again shortly.";
  }
  if (lower.includes("phone")) {
    return `Enter a valid 11-digit Bangladesh ${gatewayLabel} number.`;
  }
  return (
    message ||
    `We could not start the ${gatewayLabel} payment. Please try again.`
  );
}

function formatPaymentExpiry(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function NagadPaymentContent() {
  const searchParams = useSearchParams();
  const orderId = useMemo(
    () => searchParams.get("orderId")?.trim() || "",
    [searchParams],
  );
  const orderNumberFromUrl = searchParams.get("orderNumber") || "";
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(Boolean(orderId));
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setSummaryLoading(false);
      setSummary(null);
      setError(
        getFriendlyPaymentError(
          "Missing order reference. Please go back to checkout and place the order again.",
        ),
      );
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const loadPaymentSummary = async () => {
      setSummaryLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}/payment-summary?gateway=nagad`,
          {
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          },
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || data.error || "Could not load payment summary.",
          );
        }

        if (!isCancelled) {
          setSummary(data as PaymentSummary);
          if (data.customerPhone) {
            setPhoneNumber(
              (current) =>
                current || normalizeBdMobileNumber(String(data.customerPhone)),
            );
          }
          if (!data.canInitiatePayment) {
            setError(
              getFriendlyPaymentError(
                data.message || "This order is not ready for Nagad payment.",
              ),
            );
          }
        }
      } catch (err) {
        if (!isCancelled && !controller.signal.aborted) {
          setSummary(null);
          setError(
            getFriendlyPaymentError(
              err instanceof Error
                ? err.message
                : "Could not load payment summary.",
            ),
          );
        }
      } finally {
        if (!isCancelled) setSummaryLoading(false);
      }
    };

    void loadPaymentSummary();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [orderId]);

  const displayAmount = summary ? formatPrice(summary.amount) : "Order total";
  const displayOrderNumber = summary?.orderNumber || orderNumberFromUrl;
  const paymentExpiresAtLabel = formatPaymentExpiry(
    summary?.paymentExpiresAt ?? null,
  );
  const phoneValidationMessage =
    phoneNumber && !isValidBdMobileNumber(phoneNumber)
      ? "Enter a valid 11-digit Bangladesh Nagad number."
      : "";
  const paymentBlockReason = summaryLoading
    ? "Loading order details..."
    : !summary
      ? "The order summary could not be loaded. Return to checkout and try again."
      : !summary.canInitiatePayment
        ? getFriendlyPaymentError(
            summary.message || `This order is not ready for Nagad payment.`,
          )
        : phoneValidationMessage || "";
  const canSubmit = Boolean(
    summary?.canInitiatePayment &&
    orderId &&
    isValidBdMobileNumber(phoneNumber) &&
    !summaryLoading,
  );

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!orderId || !summary) {
      setError(
        getFriendlyPaymentError(
          "Missing order reference. Please go back to checkout and place the order again.",
        ),
      );
      return;
    }

    if (!summary.canInitiatePayment) {
      setError(
        getFriendlyPaymentError(
          summary.message || "This order is not ready for Nagad payment.",
        ),
      );
      return;
    }

    if (!isValidBdMobileNumber(phoneNumber)) {
      setError("Enter a valid 11-digit Bangladesh Nagad number.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/payments/nagad/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.nagadURL) {
          window.location.href = data.nagadURL;
        } else {
          window.location.href = `/api/payments/nagad/callback?orderId=${encodeURIComponent(orderId)}&paymentReferenceId=${encodeURIComponent(data.paymentID)}`;
        }
      } else {
        setError(
          getFriendlyPaymentError(
            data.message ||
              "We could not start the Nagad payment. Please try again.",
          ),
        );
      }
    } catch (err) {
      console.error("Nagad payment error:", err);
      setError(
        "Network problem. Check your internet connection and try the Nagad payment again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-minsah-light">
      <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link
            href="/checkout"
            className="p-2 hover:bg-orange-700 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-semibold">Nagad Payment</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">নগদ</span>
          </div>
          <h2 className="text-2xl font-bold text-minsah-dark mb-2">
            Pay with Nagad
          </h2>
          <p className="text-minsah-secondary">Digital payment made easy</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 shadow-sm mb-6 border-2 border-orange-200">
          <p className="text-sm text-orange-700 mb-1">Amount to Pay</p>
          {displayOrderNumber && (
            <p className="text-xs text-orange-700 mb-2">
              Order #{displayOrderNumber}
            </p>
          )}
          <p className="text-4xl font-bold text-orange-600">
            {summaryLoading ? "Loading..." : displayAmount}
          </p>
          <p className="mt-2 text-xs text-orange-700">
            Amount is loaded from the server order, not from cart data.
          </p>
        </div>

        {summary && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-orange-100">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-minsah-secondary">Order status</span>
              <span className="font-semibold text-minsah-dark">
                {summary.orderStatus}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-minsah-secondary">Payment status</span>
              <span className="font-semibold text-minsah-dark">
                {summary.paymentStatus}
              </span>
            </div>
            {paymentExpiresAtLabel && (
              <p className="mt-3 text-xs text-orange-700">
                Payment window expires: {paymentExpiresAtLabel}
              </p>
            )}
            {summary.latestPaymentStatus && (
              <p className="mt-2 text-xs text-minsah-secondary">
                Latest payment attempt: {summary.latestPaymentStatus}
              </p>
            )}
            {!summary.canInitiatePayment && (
              <p className="mt-3 text-xs font-semibold text-red-600">
                {summary.message ||
                  "This order is not available for Nagad payment."}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handlePayment}>
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-minsah-dark mb-4">
              Enter Nagad Number
            </h3>

            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) =>
                setPhoneNumber(normalizeBdMobileNumber(e.target.value))
              }
              placeholder="01XXXXXXXXX"
              maxLength={11}
              required
              disabled={summaryLoading || !summary?.canInitiatePayment}
              label="Nagad Account Number"
              labelClassName="text-sm font-semibold text-minsah-dark"
              leading={<span className="text-minsah-secondary">+88</span>}
              error={phoneValidationMessage || undefined}
              description={!phoneValidationMessage ? "Enter your 11-digit Nagad mobile number" : undefined}
              className="rounded-xl border-2 border-minsah-accent py-4 text-lg font-semibold focus:border-transparent focus:ring-2 focus:ring-orange-500"
            />

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-minsah-dark mb-3">Payment Steps:</h3>
            <ol className="space-y-3 text-sm text-minsah-secondary">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span>Checkout already created a valid order first</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>Enter your Nagad mobile number above</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>Click "Proceed to Pay" button</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <span>Confirm payment to complete your order</span>
              </li>
            </ol>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isProcessing || !canSubmit}
            className={
              isProcessing || !canSubmit
                ? "bg-gray-300 py-4 text-lg text-gray-500 shadow-lg"
                : "bg-gradient-to-r from-orange-600 to-red-600 py-4 text-lg shadow-lg hover:from-orange-700 hover:to-red-700"
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                <span>Redirecting to Nagad...</span>
              </>
            ) : summaryLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                <span>Loading order...</span>
              </>
            ) : (
              <>
                <span>Proceed to Pay</span>
                <span>{displayAmount}</span>
              </>
            )}
          </Button>
          {paymentBlockReason && !isProcessing && (
            <p className="mt-3 text-center text-xs text-minsah-secondary">
              {paymentBlockReason}
            </p>
          )}
        </form>

        <PaymentRecoveryActions orderNumber={displayOrderNumber} />

        <div className="mt-6 text-center">
          <p className="text-xs text-minsah-secondary">
            🔒 Secure payment powered by Nagad
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NagadPaymentPage() {
  return (
    <Suspense fallback={null}>
      <NagadPaymentContent />
    </Suspense>
  );
}
