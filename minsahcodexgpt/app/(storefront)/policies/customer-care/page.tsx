import React from "react";
import CustomerCarePolicyView from "@/components/policies/care/CustomerCarePolicyView";

export const metadata = {
  title: "Customer Care & Policy Standards | Minsah Beauty",
  description: "Verified Merchant Standards, 100% Authenticity, 14-Day Return, Shipping Timelines and Data Privacy Policy.",
};

export default function CustomerCarePolicyPage() {
  return (
    <div className="w-full">
      <CustomerCarePolicyView />
    </div>
  );
}
