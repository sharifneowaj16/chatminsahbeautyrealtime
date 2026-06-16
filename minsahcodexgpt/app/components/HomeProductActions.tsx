'use client';

import dynamic from 'next/dynamic';

const CartStepper = dynamic(() => import('@/components/cart/CartStepper'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-8 w-8 rounded-full bg-[#FACC15]/60 shadow-[0_4px_14px_rgba(250,204,21,0.20)]"
      aria-hidden="true"
    />
  ),
});

const CardBuyNowButton = dynamic(() => import('@/components/cart/CardBuyNowButton'), {
  ssr: false,
  loading: () => (
    <span
      className="block h-10 w-full rounded-2xl bg-[#3D1F0E]/15"
      aria-hidden="true"
    />
  ),
});

interface HomeProductActionProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  stock: number;
  hasVariants: boolean;
}

export function HomeOverlayCartAction({
  productId,
  productName,
  productImage,
  price,
  stock,
  hasVariants,
}: HomeProductActionProps) {
  if (stock === 0) return null;

  return (
    <div
      className="absolute bottom-2.5 right-2.5 z-10"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <CartStepper
        productId={productId}
        productName={productName}
        productImage={productImage}
        price={price}
        maxStock={stock}
        hasRequiredVariants={hasVariants}
        disabled={stock === 0}
        circleAdd
      />
    </div>
  );
}

export function HomeBuyNowAction({
  productId,
  productName,
  productImage,
  price,
  stock,
  className,
}: HomeProductActionProps & { className: string }) {
  return (
    <CardBuyNowButton
      productId={productId}
      productName={productName}
      productImage={productImage}
      price={price}
      disabled={stock === 0}
      className={className}
    />
  );
}
