import React from "react";
import ShippingPolicyView from "@/components/policies/shipping/ShippingPolicyView";

export const metadata = {
  title: "Shipping & Delivery Policy | Minsah Beauty",
  description: "Shipping & Delivery Policy - 24h Express in Dhaka, Nationwide 48-72h via Steadfast & Pathao, Free delivery tracker & Inspected packaging.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="w-full">
      <ShippingPolicyView />
    </div>
  );
}
