import React from "react";
import ReturnPolicyView from "@/components/policies/refund/ReturnPolicyView";

export const metadata = {
  title: "Return & Refund Policy | Minsah Beauty",
  description: "Return & Refund Policy - 7-day hassle free return, free Dhaka pickup, instant bKash and transparent refund timeline.",
};

export default function ReturnPolicyPage() {
  return (
    <div className="w-full">
      <ReturnPolicyView />
    </div>
  );
}
