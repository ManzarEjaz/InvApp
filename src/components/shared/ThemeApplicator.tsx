"use client";

import { useEffect } from 'react';
import { useAppState } from '@/contexts/AppStateContext';

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export default function ThemeApplicator() {
  const { organizationDetails } = useAppState();

  useEffect(() => {
    if (typeof window === 'undefined' || !organizationDetails) {
      return;
    }

    const docStyle = document.documentElement.style;

    // Apply Theme Accent Color to --primary for main UI elements like buttons
    if (organizationDetails.themeAccentColor) {
      const hsl = hexToHSL(organizationDetails.themeAccentColor);
      if (hsl) {
        docStyle.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        // Potentially derive --primary-foreground if needed, or assume white/black is fine
        // For simplicity, we'll let --primary-foreground be as defined in globals.css
      } else {
        // Invalid hex, remove property to fall back to CSS default
        docStyle.removeProperty('--primary');
      }
    } else {
      // No custom theme accent color set, remove property to fall back to CSS default
      docStyle.removeProperty('--primary');
    }

    // The --accent variable can remain as defined in globals.css or be controlled by another setting if desired in the future.
    // For now, it's not dynamically changed here unless specified.
    // If invoiceHeaderColor was meant for UI, it would be applied here too.
    // Currently, invoiceHeaderColor is used directly in InvoicePreview.

  }, [organizationDetails]);

  return null; // This component does not render anything
}
