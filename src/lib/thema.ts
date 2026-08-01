"use client";

// ── Subtle SVG patterns (data URIs) ──

/** Diagonal leaf-like diamonds */
const PATTERN_DIAMOND_LIGHT = "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 8l12 12-12 12-12-12z' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E";
const PATTERN_DIAMOND_DARK = "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 8l12 12-12 12-12-12z' fill='rgba(255,255,255,0.04)'/%3E%3C/svg%3E";

/** Fine grid dots */
const PATTERN_DOTS_LIGHT = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.5' fill='rgba(0,0,0,0.04)'/%3E%3C/svg%3E";
const PATTERN_DOTS_DARK = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1.5' fill='rgba(255,255,255,0.05)'/%3E%3C/svg%3E";

/** Scattered tiny circles like clouds */
const PATTERN_CLOUD_LIGHT = "data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='2' fill='rgba(0,0,0,0.03)'/%3E%3Ccircle cx='36' cy='24' r='3' fill='rgba(0,0,0,0.02)'/%3E%3Ccircle cx='20' cy='36' r='1.5' fill='rgba(0,0,0,0.03)'/%3E%3C/svg%3E";
const PATTERN_CLOUD_DARK = "data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='2' fill='rgba(255,255,255,0.04)'/%3E%3Ccircle cx='36' cy='24' r='3' fill='rgba(255,255,255,0.03)'/%3E%3Ccircle cx='20' cy='36' r='1.5' fill='rgba(255,255,255,0.04)'/%3E%3C/svg%3E";

/** Wavy lines */
const PATTERN_WAVE_LIGHT = "data:image/svg+xml,%3Csvg width='48' height='24' viewBox='0 0 48 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12 Q12 0 24 12 Q36 24 48 12' fill='none' stroke='rgba(0,0,0,0.03)' stroke-width='1.5'/%3E%3C/svg%3E";
const PATTERN_WAVE_DARK = "data:image/svg+xml,%3Csvg width='48' height='24' viewBox='0 0 48 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12 Q12 0 24 12 Q36 24 48 12' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1.5'/%3E%3C/svg%3E";

export interface Thema {
  id: string;
  label: string;
  bgLight: string;
  bgDark: string;
  patternLight: string;
  patternDark: string;
  bubbleOwn: string;
  bubbleOwnDark: string;
  bubbleOther: string;
  bubbleOtherDark: string;
}

export const THEMAS: Thema[] = [
  {
    id: "default",
    label: "Default",
    bgLight: "",
    bgDark: "",
    patternLight: "",
    patternDark: "",
    bubbleOwn: "",
    bubbleOwnDark: "",
    bubbleOther: "",
    bubbleOtherDark: "",
  },
  {
    id: "green-nature",
    label: "Green Nature",
    bgLight: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)",
    bgDark: "linear-gradient(135deg, #0d1b0d 0%, #1b3a1b 50%, #2d5a2d 100%)",
    patternLight: PATTERN_DIAMOND_LIGHT,
    patternDark: PATTERN_DIAMOND_DARK,
    bubbleOwn: "#a5d6a7",
    bubbleOwnDark: "#2d5a2d",
    bubbleOther: "#c8e6c9",
    bubbleOtherDark: "#1b3a1b",
  },
  {
    id: "hi-tech",
    label: "Hi-Tech",
    bgLight: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)",
    bgDark: "linear-gradient(135deg, #0a1628 0%, #152240 50%, #1a3a6a 100%)",
    patternLight: PATTERN_DOTS_LIGHT,
    patternDark: PATTERN_DOTS_DARK,
    bubbleOwn: "#64b5f6",
    bubbleOwnDark: "#1a3a6a",
    bubbleOther: "#90caf9",
    bubbleOtherDark: "#152240",
  },
  {
    id: "blue-sky",
    label: "Blue Sky",
    bgLight: "linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 50%, #81d4fa 100%)",
    bgDark: "linear-gradient(135deg, #081a2a 0%, #0f2840 50%, #1a4060 100%)",
    patternLight: PATTERN_CLOUD_LIGHT,
    patternDark: PATTERN_CLOUD_DARK,
    bubbleOwn: "#4fc3f7",
    bubbleOwnDark: "#1a4060",
    bubbleOther: "#81d4fa",
    bubbleOtherDark: "#0f2840",
  },
  {
    id: "blue-ocean",
    label: "Blue Ocean",
    bgLight: "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 50%, #80deea 100%)",
    bgDark: "linear-gradient(135deg, #041c24 0%, #0a2e3a 50%, #0e4a5a 100%)",
    patternLight: PATTERN_WAVE_LIGHT,
    patternDark: PATTERN_WAVE_DARK,
    bubbleOwn: "#4dd0e1",
    bubbleOwnDark: "#0e4a5a",
    bubbleOther: "#80deea",
    bubbleOtherDark: "#0a2e3a",
  },
];

export function getThema(id?: string | null): Thema {
  return THEMAS.find((t) => t.id === id) || THEMAS[0];
}
