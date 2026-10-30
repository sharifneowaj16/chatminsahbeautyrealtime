import React from "react";
import TermsAndConditionsView from "@/components/policies/terms/TermsAndConditionsView";

export const metadata = {
  title: "Terms & Conditions | Minsah Beauty",
  description: "Terms of Service & Customer Agreement - Authenticity, Shipping, Returns, and Consumer Protection standards under Bangladesh Law.",
};

export default function TermsPage() {
  return (
    <div className="w-full">
      <TermsAndConditionsView />
    </div>
  );
}
