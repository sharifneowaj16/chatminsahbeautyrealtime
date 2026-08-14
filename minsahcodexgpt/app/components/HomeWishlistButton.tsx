"use client";

import WishlistButton from "@/components/wishlist/WishlistButton";

interface HomeWishlistButtonProps {
  productId: string;
  productName: string;
  initialWishlisted?: boolean;
  size?: "sm" | "md";
}

export default function HomeWishlistButton(props: HomeWishlistButtonProps) {
  return <WishlistButton {...props} presentation="icon" />;
}
