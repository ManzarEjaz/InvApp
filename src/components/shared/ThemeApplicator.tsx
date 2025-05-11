
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
    const themeAccentHex = organizationDetails.themeAccentColor;

    if (themeAccentHex && themeAccentHex.match(/^#[0-9a-fA-F]{6}$/)) {
      const hsl = hexToHSL(themeAccentHex);
      if (hsl) {
        const primaryHslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
        docStyle.setProperty('--primary', primaryHslString);
        docStyle.setProperty('--accent', primaryHslString); // Make general --accent follow --primary

        // For sidebar accents, derive from primaryHslString
        // Background: light, desaturated version of the primary color
        // Foreground: the primary color itself
        const sidebarAccentBgLightness = Math.max(30, Math.min(95, hsl.l + (92 - hsl.l) * 0.85)); // Target L around 92-95% like default, but not pure white
        const sidebarAccentBgSaturation = Math.max(5, hsl.s * 0.25); // Significantly reduce saturation for background
        
        const sidebarAccentBgHslString = `${hsl.h} ${sidebarAccentBgSaturation.toFixed(0)}% ${sidebarAccentBgLightness.toFixed(0)}%`;
        
        docStyle.setProperty('--sidebar-accent', sidebarAccentBgHslString);
        docStyle.setProperty('--sidebar-accent-foreground', primaryHslString);

        // Note: --primary-foreground and --accent-foreground (for general buttons)
        // will use their defaults from globals.css. This is by design, as they are typically
        // white or black text that contrasts with the --primary/--accent background.
        // If --primary becomes very light, its default white foreground might be an issue,
        // but dynamic foreground calculation adds complexity not yet requested.

      } else {
        // Invalid hex, clear properties to fall back to CSS defaults
        docStyle.removeProperty('--primary');
        docStyle.removeProperty('--accent');
        docStyle.removeProperty('--sidebar-accent');
        docStyle.removeProperty('--sidebar-accent-foreground');
      }
    } else {
      // No custom theme accent color set or it's an empty string, clear properties to fall back to CSS defaults
      docStyle.removeProperty('--primary');
      docStyle.removeProperty('--accent');
      docStyle.removeProperty('--sidebar-accent');
      docStyle.removeProperty('--sidebar-accent-foreground');
    }

  }, [organizationDetails]);

  return null; // This component does not render anything
}
