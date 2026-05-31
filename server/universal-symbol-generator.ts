// Universal Symbol Sign Generator
// Supports ANY Unicode character: emojis, symbols, CJK, Arabic, Hebrew, etc.
// Based on OpenSCAD template for proper LED channels, diffusers, and wiring

export interface SymbolSignSettings {
  character: string;           // Any Unicode character/emoji
  fontSize: number;            // Size in mm (default 100)
  signHeight: number;          // Total height (default 30)
  wallThickness: number;       // Wall thickness (default 2)
  baseThickness: number;       // Base/floor thickness (default 2)
  lightType: 'silicone_neon_6mm' | 'silicone_neon_8mm' | 'led_strip_10mm' | 'individual_pixels';
  fontOverride?: string;       // Optional: override auto-detected font
  generateBody: boolean;
  generateLid: boolean;
  generateDetail: boolean;     // NEW: Generate detail overlay stencil layer
  detailThickness: number;     // NEW: Thickness of detail overlay (default 1.2mm)
  holeSize: number;            // Wiring hole diameter (default 5)
  holeHeight: number;          // Wiring hole Z position (default 5)
  actualFontFilename?: string; // Optional: actual font filename for OpenSCAD
}

// Unicode block detection for auto-font selection
interface UnicodeRange {
  start: number;
  end: number;
  font: string;
  description: string;
}

// Available emoji/symbol fonts for user selection
export const EMOJI_FONTS = [
  { id: "auto", name: "Auto-detect", description: "Best font for character" },
  { id: "Segoe UI Emoji", name: "Segoe UI Emoji", description: "Windows emoji font" },
  { id: "Apple Color Emoji", name: "Apple Color Emoji", description: "macOS/iOS emoji font" },
  { id: "Noto Color Emoji", name: "Noto Color Emoji", description: "Google cross-platform emoji" },
  { id: "Noto Sans Symbols", name: "Noto Sans Symbols", description: "Unicode symbols" },
  { id: "Noto Sans Symbols 2", name: "Noto Sans Symbols 2", description: "Extended symbols" },
  { id: "Segoe UI Symbol", name: "Segoe UI Symbol", description: "Windows symbols (TM, (C), etc)" },
  { id: "Arial Unicode MS", name: "Arial Unicode MS", description: "Wide Unicode coverage" },
] as const;

const UNICODE_FONT_MAP: UnicodeRange[] = [
  // Letterlike Symbols (™ ℠ ℗ ℃ № etc)
  { start: 0x2100, end: 0x214F, font: "Segoe UI Symbol", description: "Letterlike Symbols (TM, SM)" },
  
  // General Punctuation (includes some marks)
  { start: 0x2000, end: 0x206F, font: "Segoe UI Symbol", description: "General Punctuation" },
  
  // Currency Symbols (€ £ ¥ ₿ etc)
  { start: 0x20A0, end: 0x20CF, font: "Segoe UI Symbol", description: "Currency Symbols" },
  
  // Emoji ranges
  { start: 0x1F300, end: 0x1F9FF, font: "Noto Color Emoji", description: "Emoji (Misc Symbols, Emoticons)" },
  { start: 0x1FA00, end: 0x1FAFF, font: "Noto Color Emoji", description: "Emoji (Extended-A)" },
  { start: 0x2600, end: 0x26FF, font: "Noto Color Emoji", description: "Miscellaneous Symbols (Sun, Moon, Stars)" },
  { start: 0x2700, end: 0x27BF, font: "Noto Color Emoji", description: "Dingbats" },
  { start: 0x2300, end: 0x23FF, font: "Noto Sans Symbols", description: "Misc Technical" },
  
  // Arrows and Math
  { start: 0x2190, end: 0x21FF, font: "Noto Sans Symbols", description: "Arrows" },
  { start: 0x2200, end: 0x22FF, font: "Noto Sans Symbols", description: "Mathematical Operators" },
  
  // Box Drawing and Geometric
  { start: 0x2500, end: 0x257F, font: "Noto Sans Symbols", description: "Box Drawing" },
  { start: 0x25A0, end: 0x25FF, font: "Noto Sans Symbols", description: "Geometric Shapes" },
  
  // CJK (Chinese, Japanese, Korean)
  { start: 0x4E00, end: 0x9FFF, font: "Noto Sans CJK SC", description: "CJK Unified Ideographs" },
  { start: 0x3040, end: 0x309F, font: "Noto Sans JP", description: "Hiragana" },
  { start: 0x30A0, end: 0x30FF, font: "Noto Sans JP", description: "Katakana" },
  { start: 0xAC00, end: 0xD7AF, font: "Noto Sans KR", description: "Korean Hangul" },
  
  // Arabic
  { start: 0x0600, end: 0x06FF, font: "Noto Sans Arabic", description: "Arabic" },
  
  // Hebrew
  { start: 0x0590, end: 0x05FF, font: "Noto Sans Hebrew", description: "Hebrew" },
  
  // Cyrillic
  { start: 0x0400, end: 0x04FF, font: "Noto Sans", description: "Cyrillic" },
  
  // Greek
  { start: 0x0370, end: 0x03FF, font: "Noto Sans", description: "Greek" },
  
  // Thai
  { start: 0x0E00, end: 0x0E7F, font: "Noto Sans Thai", description: "Thai" },
  
  // Devanagari (Hindi)
  { start: 0x0900, end: 0x097F, font: "Noto Sans Devanagari", description: "Devanagari" },
  
  // Latin Extended (© ® ° ± etc in Latin-1 Supplement)
  { start: 0x00A0, end: 0x00FF, font: "Inter", description: "Latin-1 Supplement (Copyright, Registered)" },
  
  // Basic Latin (fallback)
  { start: 0x0000, end: 0x007F, font: "Inter", description: "Basic Latin" },
];

// Detect the best font for a given character
export function detectFontForCharacter(char: string): { font: string; description: string } {
  const codePoint = char.codePointAt(0) || 0;
  
  for (const range of UNICODE_FONT_MAP) {
    if (codePoint >= range.start && codePoint <= range.end) {
      return { font: range.font, description: range.description };
    }
  }
  
  // Default fallback
  return { font: "Noto Sans", description: "Default" };
}

// Get channel width based on light type
function getChannelWidth(lightType: SymbolSignSettings['lightType']): number {
  switch (lightType) {
    case 'silicone_neon_6mm': return 6.0;
    case 'silicone_neon_8mm': return 8.0;
    case 'led_strip_10mm': return 10.5;
    case 'individual_pixels': return 14.0;
    default: return 6.0;
  }
}

// Check if light type needs friction lip
function needsFrictionLip(lightType: SymbolSignSettings['lightType']): boolean {
  return lightType === 'silicone_neon_6mm' || lightType === 'silicone_neon_8mm';
}

// Generate OpenSCAD code for the symbol sign
export function generateSymbolSignSCAD(settings: SymbolSignSettings): string {
  const {
    character,
    fontSize = 100,
    signHeight = 30,
    wallThickness = 2,
    baseThickness = 2,
    lightType = 'silicone_neon_6mm',
    fontOverride,
    generateBody = true,
    generateLid = true,
    generateDetail = false,
    detailThickness = 1.2,
    holeSize = 5,
    holeHeight = 5,
  } = settings;
  
  // Auto-detect font if not overridden
  const fontInfo = detectFontForCharacter(character);
  const fontName = (fontOverride && fontOverride !== 'auto') ? fontOverride : fontInfo.font;
  
  const channelWidth = getChannelWidth(lightType);
  const lipOverhang = needsFrictionLip(lightType) ? 0.4 : 0.0;
  
  // Escape character for OpenSCAD string
  const escapedChar = character
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  
  // Determine render mode based on what's being generated
  // Options: Body, Lid, Detail, All (Body+Lid+Detail)
  let renderMode = 'Body';
  if (generateBody && generateLid && generateDetail) {
    renderMode = 'All';
  } else if (generateBody && generateLid) {
    renderMode = 'Both';
  } else if (generateBody) {
    renderMode = 'Body';
  } else if (generateLid) {
    renderMode = 'Lid';
  } else if (generateDetail) {
    renderMode = 'Detail';
  }
  
  // Use actual font filename if provided, otherwise create sanitized fallback
  const fontFileName = settings.actualFontFilename || `${fontName.replace(/\s+/g, '-')}.ttf`;
  
  const scad = `// ==========================================
// UNIVERSAL SYMBOL SIGN - SignCraft 3D
// Character: ${character} (U+${character.codePointAt(0)?.toString(16).toUpperCase()})
// Detected Script: ${fontInfo.description}
// ==========================================
// FONT SOURCE: ${fontFileName}

// 1. Load the Custom Font (must be in same folder as this .scad file)
use <${fontFileName}>;

// --- Render Mode ---
// Options: "Body", "Lid", "Detail", "Both", "All"
Render_Mode = "${renderMode}";

// --- Configuration ---
Letter = "${escapedChar}";
Font_Name = "${fontName}";
Font_Size = ${fontSize};
Light_Type = "${lightType}";

// -- Engineering Constants --
Sign_Height = ${signHeight};
Wall_Thickness = ${wallThickness};
Base_Thickness = ${baseThickness};
Lid_Tolerance = 0.15;
Detail_Thickness = ${detailThickness}; // Stencil overlay thickness (1.2mm = 6 layers at 0.2mm)
Hole_Height = ${holeHeight};
Hole_Size = ${holeSize};

// -- Logic Engine --
CW = (Light_Type == "silicone_neon_6mm") ? 6.0 :
     (Light_Type == "silicone_neon_8mm") ? 8.0 :
     (Light_Type == "led_strip_10mm")    ? 10.5 :
     (Light_Type == "individual_pixels") ? 14.0 : 6.0;

Lip_Overhang = (Light_Type == "silicone_neon_6mm" || Light_Type == "silicone_neon_8mm") ? 0.4 : 0.0;

$fn = 60;

// --- Core Shape Module ---
module letter_shape() {
    text(text=Letter, size=Font_Size, font=Font_Name, halign="center", valign="center");
}

// --- Wire Channel Parameters ---
Wire_Channel_Width = 4;   // 4mm wide channel for wires
Wire_Channel_Depth = 2.5; // 2.5mm deep groove

// --- Body Geometry (Main Sign) ---
module body_geometry() {
    difference() {
        // Positive Block
        linear_extrude(Sign_Height)
            offset(r = CW/2 + Wall_Thickness)
            letter_shape();

        // Light Channel (LED cavity)
        translate([0, 0, Base_Thickness])
            linear_extrude(Sign_Height + 1)
            offset(r = CW/2)
            letter_shape();

        // Wire Routing Channel - groove in the base for wire management
        // Runs along the bottom of the LED channel
        translate([0, 0, Base_Thickness - Wire_Channel_Depth])
            linear_extrude(Wire_Channel_Depth + 0.1)
            offset(r = CW/2 - Wire_Channel_Width/2)
            letter_shape();
        
        // Wire Exit Channels - connect LED channel to side holes
        // Left wire channel
        translate([-Font_Size/2, -Wire_Channel_Width/2, Base_Thickness/2])
            cube([Font_Size/2, Wire_Channel_Width, Wire_Channel_Depth + Base_Thickness/2]);
        // Right wire channel  
        translate([0, -Wire_Channel_Width/2, Base_Thickness/2])
            cube([Font_Size/2, Wire_Channel_Width, Wire_Channel_Depth + Base_Thickness/2]);

        // Friction Lip (for silicone neon)
        if (Lip_Overhang > 0) {
            translate([0, 0, Sign_Height - 2.0])
                linear_extrude(3.0)
                difference() {
                    offset(r = CW/2 + 5) letter_shape();
                    offset(r = CW/2 - Lip_Overhang) letter_shape();
                }
        }
        
        // Lid Shelf
        translate([0, 0, Sign_Height - 2.0])
            linear_extrude(3.0)
            offset(r = CW/2 + 1.5)
            letter_shape();

        // Side Holes (wire exit points)
        translate([-Font_Size/1.8, 0, Hole_Height + Base_Thickness])
            rotate([0, 90, 0]) cylinder(h = Font_Size, r = Hole_Size/2);
            
        translate([Font_Size/1.8, 0, Hole_Height + Base_Thickness])
            rotate([0, -90, 0]) cylinder(h = Font_Size, r = Hole_Size/2);
    }
}

// --- Lid/Diffuser Geometry ---
module lid_geometry() {
    color("White", 0.8)
        linear_extrude(2.0)
        offset(r = (CW/2 + 1.5) - Lid_Tolerance)
        letter_shape();
}

// --- Detail Overlay (Stencil Layer for High-Detail Emojis) ---
// Creates a thin stencil that captures internal emoji features (eyes, teeth, lines)
// Print in contrasting color (Black) and snap onto the Lid for multi-color effect
module detail_overlay() {
    color("Black")
        linear_extrude(Detail_Thickness)
        difference() {
            // Same outline as the lid for perfect snap-fit alignment
            offset(r = (CW/2 + 1.5) - Lid_Tolerance) letter_shape();
            // Inward offset to isolate only the internal details
            offset(r = -0.5) letter_shape();
        }
}

// --- Render Output ---
if (Render_Mode == "Body") { body_geometry(); }
else if (Render_Mode == "Lid") { lid_geometry(); }
else if (Render_Mode == "Detail") { detail_overlay(); }
else if (Render_Mode == "Both") {
    translate([-Font_Size * 0.6, 0, 0]) body_geometry();
    translate([Font_Size * 0.6, 0, 0]) lid_geometry();
}
else if (Render_Mode == "All") {
    // Tri-Layer Sovereign System: Body + Lid + Detail Overlay
    translate([-Font_Size, 0, 0]) body_geometry();
    lid_geometry();
    translate([Font_Size, 0, 0]) detail_overlay();
}
`;
  
  return scad;
}

// Generate separate body, lid, and detail files for a symbol
export function generateSymbolSignFiles(settings: SymbolSignSettings): {
  body: string;
  lid: string;
  detail: string;
  combined: string;
  all: string;
  characterInfo: { codePoint: string; font: string; script: string };
} {
  const fontInfo = detectFontForCharacter(settings.character);
  const codePoint = settings.character.codePointAt(0)?.toString(16).toUpperCase() || '0000';
  
  const bodySettings = { ...settings, generateBody: true, generateLid: false, generateDetail: false };
  const lidSettings = { ...settings, generateBody: false, generateLid: true, generateDetail: false };
  const detailSettings = { ...settings, generateBody: false, generateLid: false, generateDetail: true };
  const combinedSettings = { ...settings, generateBody: true, generateLid: true, generateDetail: false };
  const allSettings = { ...settings, generateBody: true, generateLid: true, generateDetail: true };
  
  return {
    body: generateSymbolSignSCAD(bodySettings),
    lid: generateSymbolSignSCAD(lidSettings),
    detail: generateSymbolSignSCAD(detailSettings),
    combined: generateSymbolSignSCAD(combinedSettings),
    all: generateSymbolSignSCAD(allSettings),
    characterInfo: {
      codePoint: `U+${codePoint}`,
      font: fontInfo.font,
      script: fontInfo.description,
    }
  };
}

// Common symbols and emojis for quick selection
export const SYMBOL_PRESETS = {
  symbols: [
    { char: '☯', name: 'Yin Yang' },
    { char: '☮', name: 'Peace' },
    { char: '♡', name: 'Heart' },
    { char: '★', name: 'Star' },
    { char: '☀', name: 'Sun' },
    { char: '☽', name: 'Moon' },
    { char: '⚡', name: 'Lightning' },
    { char: '♪', name: 'Music Note' },
    { char: '∞', name: 'Infinity' },
    { char: '☢', name: 'Radioactive' },
    { char: '⚛', name: 'Atom' },
    { char: '✡', name: 'Star of David' },
    { char: '☪', name: 'Star and Crescent' },
    { char: '✝', name: 'Cross' },
    { char: '☸', name: 'Wheel of Dharma' },
    { char: '⚕', name: 'Caduceus' },
    { char: '♻', name: 'Recycle' },
    { char: '⚠', name: 'Warning' },
  ],
  emojis: [
    { char: '😀', name: 'Grinning Face' },
    { char: '❤️', name: 'Red Heart' },
    { char: '🔥', name: 'Fire' },
    { char: '⭐', name: 'Star' },
    { char: '🌙', name: 'Crescent Moon' },
    { char: '🌈', name: 'Rainbow' },
    { char: '🎵', name: 'Musical Note' },
    { char: '💡', name: 'Light Bulb' },
    { char: '🏠', name: 'House' },
    { char: '🚀', name: 'Rocket' },
    { char: '💎', name: 'Diamond' },
    { char: '🍕', name: 'Pizza' },
  ],
  chinese: [
    { char: '福', name: 'Fortune/Blessing' },
    { char: '愛', name: 'Love' },
    { char: '龍', name: 'Dragon' },
    { char: '禪', name: 'Zen' },
    { char: '氣', name: 'Energy/Chi' },
    { char: '和', name: 'Harmony' },
    { char: '夢', name: 'Dream' },
    { char: '力', name: 'Power/Strength' },
  ],
  japanese: [
    { char: 'あ', name: 'Hiragana A' },
    { char: 'カ', name: 'Katakana Ka' },
    { char: '愛', name: 'Love (Ai)' },
    { char: '光', name: 'Light (Hikari)' },
    { char: '風', name: 'Wind (Kaze)' },
  ],
  korean: [
    { char: '한', name: 'Han (Korea)' },
    { char: '사랑', name: 'Love (Sarang)' },
    { char: '빛', name: 'Light (Bit)' },
  ],
  arabic: [
    { char: 'سلام', name: 'Peace (Salaam)' },
    { char: 'حب', name: 'Love (Hubb)' },
    { char: 'نور', name: 'Light (Noor)' },
  ],
  hebrew: [
    { char: 'שָׁלוֹם', name: 'Peace (Shalom)' },
    { char: 'אהבה', name: 'Love (Ahava)' },
    { char: 'חי', name: 'Life (Chai)' },
  ],
  greek: [
    { char: 'Ω', name: 'Omega' },
    { char: 'Φ', name: 'Phi' },
    { char: 'Ψ', name: 'Psi' },
    { char: 'α', name: 'Alpha' },
    { char: 'β', name: 'Beta' },
  ],
};

// Get all preset categories
export function getSymbolPresets() {
  return SYMBOL_PRESETS;
}

// Default settings
export const defaultSymbolSignSettings: SymbolSignSettings = {
  character: '☯',
  fontSize: 100,
  signHeight: 30,
  wallThickness: 2,
  baseThickness: 2,
  lightType: 'silicone_neon_6mm',
  generateBody: true,
  generateLid: true,
  generateDetail: false,  // Enable for high-detail emoji stencil layer
  detailThickness: 1.2,   // 1.2mm = 6 layers at 0.2mm for good rigidity
  holeSize: 5,
  holeHeight: 5,
};
