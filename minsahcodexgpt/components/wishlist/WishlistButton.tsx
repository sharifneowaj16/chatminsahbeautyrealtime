"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  initialWishlisted?: boolean;
  presentation?: "icon" | "labeled";
  size?: "sm" | "md";
  className?: string;
}

export default function WishlistButton({
  productId,
  productName,
  initialWishlisted = false,
  presentation = "icon",
  size = "md",
  className = "",
}: WishlistButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const iconSize = size === "sm" ? 16 : 18;

  const handleToggle = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        isWishlisted ? `/api/wishlist/product/${productId}` : "/api/wishlist",
        {
          method: isWishlisted ? "DELETE" : "POST",
          headers: isWishlisted
            ? undefined
            : { "Content-Type": "application/json" },
          body: isWishlisted ? undefined : JSON.stringify({ productId }),
        },
      );

      if (response.status === 401) {
        const redirect = encodeURIComponent(pathname || "/");
        router.push(`/login?redirect=${redirect}`);
        return;
      }

      if (!response.ok) throw new Error("Wishlist update failed");

      const nextState = !isWishlisted;
      setIsWishlisted(nextState);
      setMessage(nextState ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      setMessage("Could not update wishlist. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const label = isWishlisted ? "Saved" : "Save";
  const ariaLabel = `${isWishlisted ? "Remove" : "Add"} ${productName} ${isWishlisted ? "from" : "to"} wishlist`;
  const icon = isBusy ? (
    <Loader2
      size={iconSize}
      className="animate-spin text-minsah-secondary"
      aria-hidden="true"
    />
  ) : (
    <Heart
      size={iconSize}
      className={`transition-all duration-200 motion-reduce:transition-none ${
        isWishlisted
          ? "minsah-heart-pop fill-red-500 text-red-500"
          : "text-minsah-secondary"
      }`}
      aria-hidden="true"
    />
  );

  return (
    <div className="relative">
      {presentation === "labeled" ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleToggle()}
          disabled={isBusy}
          aria-pressed={isWishlisted}
          aria-label={ariaLabel}
          className={`rounded-2xl border-minsah-border-soft text-minsah-primary hover:bg-minsah-light ${className}`}
        >
          {icon}
          <span>{isBusy ? "Updating..." : label}</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => void handleToggle()}
          disabled={isBusy}
          aria-pressed={isWishlisted}
          aria-label={ariaLabel}
          className={`rounded-full border-transparent bg-white shadow-sm ring-1 ring-stone-200/70 hover:bg-red-50 ${className}`}
        >
          {icon}
        </Button>
      )}
      {message && (
        <span className="sr-only" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
