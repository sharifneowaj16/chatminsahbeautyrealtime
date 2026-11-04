'use client';

import React, { useEffect, useState } from 'react';
import { SearchBarStyleId } from '@/types/navigation-config';
import LinearDarkSearchWrapper from './variants/LinearDarkSearchWrapper';
import RoyalForestSearchWrapper from './variants/RoyalForestSearchWrapper';
import DualSegmentedSearchWrapper from './variants/DualSegmentedSearchWrapper';

interface DynamicSearchWrapperProps {
  styleId?: SearchBarStyleId;
  children: React.ReactNode;
  className?: string;
}

export const DynamicSearchWrapper: React.FC<DynamicSearchWrapperProps> = ({
  styleId: controlledStyleId,
  children,
  className = '',
}) => {
  const [styleId, setStyleId] = useState<SearchBarStyleId>(controlledStyleId || 'style-01');

  useEffect(() => {
    if (controlledStyleId) {
      setStyleId(controlledStyleId);
      return;
    }

    // Read active search bar style from public navigation config
    fetch('/api/navigation-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config?.searchBarStyle) {
          setStyleId(data.config.searchBarStyle);
        }
      })
      .catch(() => {});

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ searchBarStyle?: SearchBarStyleId }>;
      if (customEvent.detail?.searchBarStyle) {
        setStyleId(customEvent.detail.searchBarStyle);
      }
    };

    window.addEventListener('minsah:navigation-config-updated', handleUpdate);
    return () => {
      window.removeEventListener('minsah:navigation-config-updated', handleUpdate);
    };
  }, [controlledStyleId]);

  switch (styleId) {
    case 'style-03':
      return (
        <RoyalForestSearchWrapper className={className}>
          {children}
        </RoyalForestSearchWrapper>
      );
    case 'style-07':
      return (
        <DualSegmentedSearchWrapper className={className}>
          {children}
        </DualSegmentedSearchWrapper>
      );
    case 'style-01':
    default:
      return (
        <LinearDarkSearchWrapper className={className}>
          {children}
        </LinearDarkSearchWrapper>
      );
  }
};

export default DynamicSearchWrapper;

