// Custom Font Sign Generator - Based on user's "Sign Sculptor" OpenSCAD engine
// Generates .scad files for letter-shaped signs with lighting channels

export interface CustomFontSignSettings {
  letter: string;
  fontName: string;
  fontSize: number;
  lightType: 
    | 'silicone_neon_6mm' 
    | 'silicone_neon_8mm' 
    | 'ws2812b_5mm' 
    | 'ws2812b_10mm' 
    | 'ws2812b_12mm'
    | 'cob_strip_8mm'
    | 'cob_strip_10mm';
  signHeight: number;
  wallThickness: number;
  baseThickness: number;
  renderMode: 'body' | 'lid' | 'both';
  includeHoles: boolean;
  holeSize: number;
  holeHeight: number;
}

// Returns channel width in mm based on actual LED/strip dimensions
// Adds ~0.5mm tolerance for easy insertion
function getChannelWidth(lightType: string): number {
  switch (lightType) {
    case 'silicone_neon_6mm': return 6.5;   // 6mm tube + tolerance
    case 'silicone_neon_8mm': return 8.5;   // 8mm tube + tolerance
    case 'ws2812b_5mm': return 5.5;         // 5mm PCB + tolerance
    case 'ws2812b_10mm': return 10.5;       // 10mm PCB + tolerance
    case 'ws2812b_12mm': return 12.5;       // 12mm PCB + tolerance
    case 'cob_strip_8mm': return 8.5;       // 8mm COB strip + tolerance
    case 'cob_strip_10mm': return 10.5;     // 10mm COB strip + tolerance
    default: return 6.5;
  }
}

// Returns channel depth for different LED types
function getChannelDepth(lightType: string): number {
  switch (lightType) {
    case 'silicone_neon_6mm': return 6.0;   // Circular profile
    case 'silicone_neon_8mm': return 8.0;   // Circular profile
    case 'ws2812b_5mm': return 3.5;         // SMD 5050 height ~2.5mm + PCB ~1mm
    case 'ws2812b_10mm': return 3.5;        // Same LED height
    case 'ws2812b_12mm': return 3.5;        // Same LED height
    case 'cob_strip_8mm': return 2.5;       // COB is thinner
    case 'cob_strip_10mm': return 2.5;      // COB is thinner
    default: return 6.0;
  }
}

function getLipOverhang(lightType: string): number {
  // Silicone neon uses friction fit lip
  if (lightType === 'silicone_neon_6mm' || lightType === 'silicone_neon_8mm') {
    return 0.4;
  }
  // LED strips don't need friction lip - they use adhesive backing
  return 0.0;
}

function getLightTypeDescription(lightType: string): string {
  switch (lightType) {
    case 'silicone_neon_6mm': return 'Silicone Neon Flex 6mm diameter';
    case 'silicone_neon_8mm': return 'Silicone Neon Flex 8mm diameter';
    case 'ws2812b_5mm': return 'WS2812B Addressable LED Strip (5mm PCB)';
    case 'ws2812b_10mm': return 'WS2812B Addressable LED Strip (10mm PCB)';
    case 'ws2812b_12mm': return 'WS2812B Addressable LED Strip (12mm PCB)';
    case 'cob_strip_8mm': return 'COB LED Strip (8mm width)';
    case 'cob_strip_10mm': return 'COB LED Strip (10mm width)';
    default: return lightType.replace(/_/g, ' ');
  }
}

export function generateCustomFontSignSCAD(settings: CustomFontSignSettings): string {
  const channelWidth = getChannelWidth(settings.lightType);
  const channelDepth = getChannelDepth(settings.lightType);
  const lipOverhang = getLipOverhang(settings.lightType);
  const lightTypeDesc = getLightTypeDescription(settings.lightType);
  const lidTolerance = 0.15;

  const scadContent = `// SignCraft 3D - Custom Font Sign Generator
// Letter: ${settings.letter}
// Font: ${settings.fontName}
// Light Type: ${lightTypeDesc}
// Channel Width: ${channelWidth}mm (includes 0.5mm tolerance)

// === CONFIGURATION ===
Letter = "${settings.letter}";
Font_Size = ${settings.fontSize};
Font_Name = "${settings.fontName}";
Light_Type = "${settings.lightType}";
Render_Mode = "${settings.renderMode}"; // "body", "lid", or "both"

// === ENGINEERING CONSTANTS ===
Sign_Height = ${settings.signHeight};
Wall_Thickness = ${settings.wallThickness};
Base_Thickness = ${settings.baseThickness};
Lid_Tolerance = ${lidTolerance};
Hole_Height = ${settings.holeHeight};
Hole_Size = ${settings.holeSize};
Include_Holes = ${settings.includeHoles ? 'true' : 'false'};

// === CALCULATED VALUES ===
CW = ${channelWidth}; // Channel Width based on light type
Lip_Overhang = ${lipOverhang}; // For silicone neon friction fit

$fn = 60; // Resolution for curves

// === LETTER SHAPE MODULE ===
module letter_shape() {
    text(text=Letter, size=Font_Size, font=Font_Name, halign="center", valign="center");
}

// === BODY GEOMETRY ===
// The main sign body with light channel carved out
module body_geometry() {
    difference() {
        // Positive: Outer shell (letter shape + wall + channel width)
        linear_extrude(Sign_Height)
            offset(r = CW/2 + Wall_Thickness)
            letter_shape();

        // Negative: Light Channel (carved out from top)
        translate([0, 0, Base_Thickness])
            linear_extrude(Sign_Height + 1)
            offset(r = CW/2)
            letter_shape();

        // Negative: Friction Lip for silicone neon
        if (Lip_Overhang > 0) {
            translate([0, 0, Sign_Height - 2.0])
                linear_extrude(3.0)
                difference() {
                    offset(r = CW/2 + 5) letter_shape();
                    offset(r = CW/2 - Lip_Overhang) letter_shape();
                }
        }
        
        // Negative: Lid Shelf (recessed area for lid to sit)
        translate([0, 0, Sign_Height - 2.0])
            linear_extrude(3.0)
            offset(r = CW/2 + 1.5)
            letter_shape();

        // Negative: Side Wire Holes
        if (Include_Holes) {
            // Left side hole
            translate([-Font_Size/1.8, 0, Hole_Height + Base_Thickness])
                rotate([0, 90, 0]) 
                cylinder(h = Font_Size, r = Hole_Size/2);
                
            // Right side hole
            translate([Font_Size/1.8, 0, Hole_Height + Base_Thickness])
                rotate([0, -90, 0]) 
                cylinder(h = Font_Size, r = Hole_Size/2);
        }
    }
}

// === LID GEOMETRY ===
// The diffuser cap that sits on top
module lid_geometry() {
    color("White")
        linear_extrude(2.0)
        offset(r = (CW/2 + 1.5) - Lid_Tolerance)
        letter_shape();
}

// === RENDER ===
if (Render_Mode == "body") { 
    body_geometry(); 
}
else if (Render_Mode == "lid") { 
    lid_geometry(); 
}
else if (Render_Mode == "both") {
    body_geometry();
    translate([Font_Size * 1.5, 0, 0]) lid_geometry();
}

// === INSTRUCTIONS ===
// 1. Open this file in OpenSCAD
// 2. If using a custom font, place the .ttf/.otf file in the same folder
// 3. Change Font_Name to match your font's internal name
// 4. Press F6 to render, then export as STL
// 5. Print the body in your desired color
// 6. Print the lid in white or translucent material for diffusion
`;

  return scadContent;
}

export function generateAlphabetSCAD(settings: Omit<CustomFontSignSettings, 'letter'>): { [key: string]: string } {
  const files: { [key: string]: string } = {};
  
  // Generate A-Z
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    files[`Letter_${letter}.scad`] = generateCustomFontSignSCAD({
      ...settings,
      letter,
    });
  }
  
  // Generate 0-9
  for (let i = 0; i <= 9; i++) {
    files[`Number_${i}.scad`] = generateCustomFontSignSCAD({
      ...settings,
      letter: String(i),
    });
  }
  
  return files;
}
