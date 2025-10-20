'use client';

import { useEffect } from 'react';
import { recordProductView } from '@/lib/engagement';

export default function ProductEngagementTracker({ productId }) {
  useEffect(() => {
    if (productId != null) {
      recordProductView(productId);
    }
  }, [productId]);
  return null;
}

