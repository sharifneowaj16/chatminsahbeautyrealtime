import React from "react";
import AddNewAddressMobileView from "@/components/account/address/AddNewAddressMobileView";

export const metadata = {
  title: "Add Delivery Address | Minsah Beauty",
  description: "Set your dispatch address, GPS pinpoint, and delivery preferences for Steadfast & Pathao Express Delivery.",
};

export default function NewAddressPage() {
  return (
    <div className="w-full">
      <AddNewAddressMobileView />
    </div>
  );
}
