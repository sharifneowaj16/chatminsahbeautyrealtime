'use client';

import React from 'react';
import ProductHeroVisualController from '@/components/admin/ProductHeroVisualController';
import ProductTimelineVisualManager from '@/components/admin/ProductTimelineVisualManager';

export interface ProductVisualManagersWrapperProps {
  productName: string;
  descriptionSectionsJson: string;
  productSpecsJson: string;
  relatedProducts: string;
  ingredients: string;
  skinType: string[];
  shelfLife: string;
  originCountry: string;
  deliveryOfferEnabled: boolean;
  onDescriptionSectionsChange: (jsonStr: string) => void;
  onProductSpecsChange: (jsonStr: string) => void;
  onRelatedProductsChange: (val: string) => void;
  onDeliveryOfferToggle: (enabled: boolean) => void;
  onSkinTypeChange: (types: string[]) => void;
}

export function ProductVisualManagersWrapper({
  productName,
  descriptionSectionsJson,
  productSpecsJson,
  relatedProducts,
  ingredients,
  skinType,
  shelfLife,
  originCountry,
  deliveryOfferEnabled,
  onDescriptionSectionsChange,
  onProductSpecsChange,
  onRelatedProductsChange,
  onDeliveryOfferToggle,
  onSkinTypeChange,
}: ProductVisualManagersWrapperProps) {
  return (
    <div className="space-y-4 pt-2">
      {/* 1-Click Product Hero Visual Controller */}
      <ProductHeroVisualController
        descriptionSectionsJson={descriptionSectionsJson}
        productSpecsJson={productSpecsJson}
        relatedProducts={relatedProducts}
        ingredients={ingredients}
        skinType={skinType}
        shelfLife={shelfLife}
        originCountry={originCountry}
        deliveryOfferEnabled={deliveryOfferEnabled}
        onDescriptionSectionsChange={onDescriptionSectionsChange}
        onProductSpecsChange={onProductSpecsChange}
        onRelatedProductsChange={onRelatedProductsChange}
        onDeliveryOfferToggle={onDeliveryOfferToggle}
        onSkinTypeChange={onSkinTypeChange}
      />

      {/* 1-Click Product Routine & Benefits Timeline Manager */}
      <ProductTimelineVisualManager
        productName={productName || 'This Product'}
        descriptionSectionsJson={descriptionSectionsJson}
        onTimelineChange={(_stages, jsonStr) => onDescriptionSectionsChange(jsonStr)}
      />
    </div>
  );
}
