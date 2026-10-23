import React from "react";
import { BentoProfileView } from "@/components/loyalty/BentoProfileView";

export const metadata = {
  title: "My Profile & Glow Loyalty | Minsah Beauty",
  description: "View your Minsah VIP status, Glow Points balance, skin profile, and saved payment methods.",
};

export default function AccountProfilePage() {
  return (
    <div className="w-full">
      <BentoProfileView />
    </div>
  );
}
