import React from 'react';
import { buildDynamicProductJsonLd } from './buildProductJsonLd';

export interface ProductJsonLdProps {
  product: {
    id: string;
    price: number | { toNumber(): number } | string;
    [key: string]: any;
  };
  rating?: { average: number | null; total: number } | null;
  productUrl: string;
}

export function ProductJsonLd({ product, rating, productUrl }: ProductJsonLdProps) {
  const schema = buildDynamicProductJsonLd({ product, rating, productUrl });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default ProductJsonLd;
