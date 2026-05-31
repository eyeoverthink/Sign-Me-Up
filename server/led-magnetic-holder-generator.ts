/**
 * LED Magnetic Holder Generator
 * 
 * Two-piece magnetic holder design:
 * - BOTTOM: Flat disc with magnet pocket on TOP face, wire holes through to bottom
 * - TOP (Cap): LED socket with magnet pocket on BOTTOM face
 * - Halves snap together via magnets (NO screw threads)
 * 
 * Based on user's working SCAD design showing T-shaped LED holder concept
 */

// LED specifications by type
const LED_SPECS: Record<string, { diameter: number; length: number; name: string }> = {
  '3mm': { diameter: 3, length: 5, name: '3mm LED' },
  '5mm': { diameter: 5, length: 8.6, name: '5mm LED' },
  '10mm': { diameter: 10, length: 13, name: '10mm LED' },
};

// Common magnet sizes (diameter x thickness in mm)
const MAGNET_SPECS: Record<string, { diameter: number; thickness: number }> = {
  '6x2': { diameter: 6, thickness: 2 },
  '8x2': { diameter: 8, thickness: 2 },
  '8x3': { diameter: 8, thickness: 3 },
  '10x2': { diameter: 10, thickness: 2 },
  '10x3': { diameter: 10, thickness: 3 },
  '12x2': { diameter: 12, thickness: 2 },
};

// Battery specs for battery-powered mode
const BATTERY_SPECS: Record<string, { diameter: number; thickness: number; name: string }> = {
  'CR2032': { diameter: 20, thickness: 3.2, name: 'CR2032' },
  'CR2025': { diameter: 20, thickness: 2.5, name: 'CR2025' },
  'CR2016': { diameter: 20, thickness: 1.6, name: 'CR2016' },
};

export interface LEDMagneticHolderConfig {
  // LED configuration
  ledType: '3mm' | '5mm' | '10mm';
  ledCount: 1 | 2 | 3;
  
  // Power mode: wired (LED wires pass through), neopixel (3-4 wires), or battery
  mode: 'wired' | 'neopixel' | 'battery';
  batteryType?: 'CR2032' | 'CR2025' | 'CR2016';
  wireCount: 2 | 3 | 4; // 2 for standard LED, 3-4 for NeoPixel
  
  // Overall size
  diameter: number;      // Overall disc diameter (default 25mm)
  thickness: number;     // Total assembled thickness (default 6mm)
  wallThickness: number; // Wall thickness (default 1.5mm)
  
  // Magnet configuration
  magnetSize: '6x2' | '8x2' | '8x3' | '10x2' | '10x3' | '12x2';
  
  // Optional features
  usePennySlot: boolean; // Use penny instead of magnet
  wireChannelDiameter: number; // Wire hole diameter (default 2mm)
  
  // Export options
  includeAlignment: boolean; // Add alignment nub/socket
}

type Vec3 = [number, number, number];
type Triangle = [Vec3, Vec3, Vec3];

function addTriangle(triangles: Triangle[], v1: Vec3, v2: Vec3, v3: Vec3): void {
  triangles.push([v1, v2, v3]);
}

function addQuad(triangles: Triangle[], v1: Vec3, v2: Vec3, v3: Vec3, v4: Vec3): void {
  addTriangle(triangles, v1, v2, v3);
  addTriangle(triangles, v1, v3, v4);
}

// Generate a solid cylinder
function generateCylinder(
  triangles: Triangle[],
  cx: number, cy: number,
  zBottom: number, zTop: number,
  radius: number,
  segments: number
): void {
  const angleStep = (Math.PI * 2) / segments;
  
  // Bottom cap
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    addTriangle(triangles,
      [cx, cy, zBottom],
      [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, zBottom],
      [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, zBottom]
    );
  }
  
  // Top cap
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    addTriangle(triangles,
      [cx, cy, zTop],
      [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, zTop],
      [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, zTop]
    );
  }
  
  // Side wall
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const x2 = cx + Math.cos(a2) * radius;
    const y2 = cy + Math.sin(a2) * radius;
    
    addQuad(triangles,
      [x1, y1, zBottom],
      [x2, y2, zBottom],
      [x2, y2, zTop],
      [x1, y1, zTop]
    );
  }
}

// Generate a hollow disc (tube/ring shape)
function generateHollowDisc(
  triangles: Triangle[],
  cx: number, cy: number,
  zBottom: number, zTop: number,
  outerRadius: number, innerRadius: number,
  segments: number,
  includeTop: boolean = true,
  includeBottom: boolean = true
): void {
  const angleStep = (Math.PI * 2) / segments;
  
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    
    const ox1 = cx + Math.cos(a1) * outerRadius;
    const oy1 = cy + Math.sin(a1) * outerRadius;
    const ox2 = cx + Math.cos(a2) * outerRadius;
    const oy2 = cy + Math.sin(a2) * outerRadius;
    
    const ix1 = cx + Math.cos(a1) * innerRadius;
    const iy1 = cy + Math.sin(a1) * innerRadius;
    const ix2 = cx + Math.cos(a2) * innerRadius;
    const iy2 = cy + Math.sin(a2) * innerRadius;
    
    // Outer wall
    addQuad(triangles,
      [ox1, oy1, zBottom],
      [ox2, oy2, zBottom],
      [ox2, oy2, zTop],
      [ox1, oy1, zTop]
    );
    
    // Inner wall
    addQuad(triangles,
      [ix2, iy2, zBottom],
      [ix1, iy1, zBottom],
      [ix1, iy1, zTop],
      [ix2, iy2, zTop]
    );
    
    // Top ring
    if (includeTop) {
      addQuad(triangles,
        [ix1, iy1, zTop],
        [ox1, oy1, zTop],
        [ox2, oy2, zTop],
        [ix2, iy2, zTop]
      );
    }
    
    // Bottom ring
    if (includeBottom) {
      addQuad(triangles,
        [ox1, oy1, zBottom],
        [ix1, iy1, zBottom],
        [ix2, iy2, zBottom],
        [ox2, oy2, zBottom]
      );
    }
  }
}

// Generate solid disc
function generateDisc(
  triangles: Triangle[],
  cx: number, cy: number,
  zBottom: number, zTop: number,
  radius: number,
  segments: number
): void {
  const angleStep = (Math.PI * 2) / segments;
  
  // Bottom face
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    addTriangle(triangles,
      [cx, cy, zBottom],
      [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, zBottom],
      [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, zBottom]
    );
  }
  
  // Top face
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    addTriangle(triangles,
      [cx, cy, zTop],
      [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, zTop],
      [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, zTop]
    );
  }
  
  // Outer wall
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const x2 = cx + Math.cos(a2) * radius;
    const y2 = cy + Math.sin(a2) * radius;
    
    addQuad(triangles,
      [x1, y1, zBottom],
      [x2, y2, zBottom],
      [x2, y2, zTop],
      [x1, y1, zTop]
    );
  }
}

// Generate knurled edge for grip
function generateKnurling(
  triangles: Triangle[],
  cx: number, cy: number,
  zBottom: number, zTop: number,
  radius: number,
  knurlDepth: number,
  knurlCount: number
): void {
  const angleStep = (Math.PI * 2) / knurlCount;
  
  for (let i = 0; i < knurlCount; i++) {
    const a1 = i * angleStep;
    const aMid = (i + 0.5) * angleStep;
    const a2 = (i + 1) * angleStep;
    
    // Valley points (at base radius)
    const vx1 = cx + Math.cos(a1) * radius;
    const vy1 = cy + Math.sin(a1) * radius;
    const vx2 = cx + Math.cos(a2) * radius;
    const vy2 = cy + Math.sin(a2) * radius;
    
    // Peak point (extends outward)
    const px = cx + Math.cos(aMid) * (radius + knurlDepth);
    const py = cy + Math.sin(aMid) * (radius + knurlDepth);
    
    // Two triangular faces for each knurl
    addQuad(triangles,
      [vx1, vy1, zBottom],
      [px, py, zBottom],
      [px, py, zTop],
      [vx1, vy1, zTop]
    );
    
    addQuad(triangles,
      [px, py, zBottom],
      [vx2, vy2, zBottom],
      [vx2, vy2, zTop],
      [px, py, zTop]
    );
  }
  
  // Top edge triangles
  for (let i = 0; i < knurlCount; i++) {
    const a1 = i * angleStep;
    const aMid = (i + 0.5) * angleStep;
    const a2 = (i + 1) * angleStep;
    
    const vx1 = cx + Math.cos(a1) * radius;
    const vy1 = cy + Math.sin(a1) * radius;
    const vx2 = cx + Math.cos(a2) * radius;
    const vy2 = cy + Math.sin(a2) * radius;
    const px = cx + Math.cos(aMid) * (radius + knurlDepth);
    const py = cy + Math.sin(aMid) * (radius + knurlDepth);
    
    addTriangle(triangles, [vx1, vy1, zTop], [px, py, zTop], [vx2, vy2, zTop]);
    addTriangle(triangles, [vx1, vy1, zBottom], [vx2, vy2, zBottom], [px, py, zBottom]);
  }
}

// Generate alignment nub (small hemisphere bump)
function generateAlignmentNub(
  triangles: Triangle[],
  cx: number, cy: number,
  z: number,
  radius: number,
  height: number,
  pointing: 'up' | 'down'
): void {
  const segments = 16;
  const rings = 4;
  
  for (let r = 0; r < rings; r++) {
    const theta1 = (r / rings) * (Math.PI / 2);
    const theta2 = ((r + 1) / rings) * (Math.PI / 2);
    
    const r1 = radius * Math.cos(theta1);
    const r2 = radius * Math.cos(theta2);
    const h1 = height * Math.sin(theta1) * (pointing === 'up' ? 1 : -1);
    const h2 = height * Math.sin(theta2) * (pointing === 'up' ? 1 : -1);
    
    for (let s = 0; s < segments; s++) {
      const a1 = (s / segments) * Math.PI * 2;
      const a2 = ((s + 1) / segments) * Math.PI * 2;
      
      const x11 = cx + Math.cos(a1) * r1;
      const y11 = cy + Math.sin(a1) * r1;
      const x12 = cx + Math.cos(a2) * r1;
      const y12 = cy + Math.sin(a2) * r1;
      const x21 = cx + Math.cos(a1) * r2;
      const y21 = cy + Math.sin(a1) * r2;
      const x22 = cx + Math.cos(a2) * r2;
      const y22 = cy + Math.sin(a2) * r2;
      
      if (pointing === 'up') {
        addQuad(triangles,
          [x11, y11, z + h1],
          [x12, y12, z + h1],
          [x22, y22, z + h2],
          [x21, y21, z + h2]
        );
      } else {
        addQuad(triangles,
          [x12, y12, z + h1],
          [x11, y11, z + h1],
          [x21, y21, z + h2],
          [x22, y22, z + h2]
        );
      }
    }
  }
}

// Generate alignment socket (small depression)
function generateAlignmentSocket(
  triangles: Triangle[],
  cx: number, cy: number,
  z: number,
  radius: number,
  depth: number,
  facing: 'up' | 'down'
): void {
  const segments = 16;
  const angleStep = (Math.PI * 2) / segments;
  
  // Socket is just a cylinder going into the surface
  const socketBottom = facing === 'up' ? z : z - depth;
  const socketTop = facing === 'up' ? z + depth : z;
  
  // Inner wall of socket
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const x2 = cx + Math.cos(a2) * radius;
    const y2 = cy + Math.sin(a2) * radius;
    
    if (facing === 'up') {
      addQuad(triangles,
        [x2, y2, socketBottom],
        [x1, y1, socketBottom],
        [x1, y1, socketTop],
        [x2, y2, socketTop]
      );
    } else {
      addQuad(triangles,
        [x1, y1, socketBottom],
        [x2, y2, socketBottom],
        [x2, y2, socketTop],
        [x1, y1, socketTop]
      );
    }
  }
  
  // Bottom of socket
  const capZ = facing === 'up' ? socketBottom : socketTop;
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    if (facing === 'up') {
      addTriangle(triangles,
        [cx, cy, capZ],
        [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, capZ],
        [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, capZ]
      );
    } else {
      addTriangle(triangles,
        [cx, cy, capZ],
        [cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius, capZ],
        [cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius, capZ]
      );
    }
  }
}

/**
 * BOTTOM HALF - The base disc
 * - Flat disc with knurled edge
 * - Magnet pocket on TOP face (recessed into disc)
 * - Wire holes going DOWN through bottom
 * - Optional penny slot instead of magnet
 * - Optional battery pocket for battery mode
 */
function generateBottomHalf(config: LEDMagneticHolderConfig): Triangle[] {
  const triangles: Triangle[] = [];
  
  const {
    diameter,
    thickness,
    wallThickness,
    magnetSize,
    usePennySlot,
    wireChannelDiameter,
    mode,
    batteryType = 'CR2032',
    wireCount,
    includeAlignment,
  } = config;
  
  const outerRadius = diameter / 2;
  const magnet = MAGNET_SPECS[magnetSize];
  const magnetRadius = magnet.diameter / 2 + 0.15; // Clearance
  const magnetDepth = magnet.thickness + 0.2;
  
  // For battery mode, we need thicker floor
  let partHeight = thickness / 2;
  if (mode === 'battery') {
    const battery = BATTERY_SPECS[batteryType];
    partHeight = Math.max(partHeight, battery.thickness + 1.5);
  }
  
  const segments = 48;
  const floorThickness = 1.0; // Solid floor at very bottom
  
  // 1. Main body - solid disc
  generateDisc(triangles, 0, 0, 0, partHeight, outerRadius, segments);
  
  // 2. Knurled edge for grip
  const knurlHeight = Math.min(partHeight, 2);
  generateKnurling(triangles, 0, 0, 0, knurlHeight, outerRadius + 0.1, 0.5, 36);
  
  // 3. Magnet pocket on TOP face (recessed into disc)
  // Cut a cylindrical pocket into the top
  if (mode === 'battery') {
    // Battery pocket instead of magnet
    const battery = BATTERY_SPECS[batteryType];
    const batteryRadius = battery.diameter / 2 + 0.3;
    const pocketDepth = battery.thickness + 0.3;
    const pocketZ = partHeight - pocketDepth;
    
    // Create pocket by making hollow disc for the pocket area
    generateHollowDisc(triangles, 0, 0, pocketZ, partHeight + 0.01, batteryRadius, 0.1, 32, true, false);
    
    // Pocket floor
    for (let i = 0; i < 32; i++) {
      const a1 = (i / 32) * Math.PI * 2;
      const a2 = ((i + 1) / 32) * Math.PI * 2;
      addTriangle(triangles,
        [0, 0, pocketZ],
        [Math.cos(a1) * batteryRadius, Math.sin(a1) * batteryRadius, pocketZ],
        [Math.cos(a2) * batteryRadius, Math.sin(a2) * batteryRadius, pocketZ]
      );
    }
  } else if (usePennySlot) {
    // Penny pocket (US penny: 19.05mm diameter, 1.52mm thick)
    const pennyRadius = 9.6 + 0.2;
    const pennyDepth = 1.7;
    const pocketZ = partHeight - pennyDepth;
    
    generateHollowDisc(triangles, 0, 0, pocketZ, partHeight + 0.01, pennyRadius, 0.1, 32, true, false);
    
    // Pocket floor
    for (let i = 0; i < 32; i++) {
      const a1 = (i / 32) * Math.PI * 2;
      const a2 = ((i + 1) / 32) * Math.PI * 2;
      addTriangle(triangles,
        [0, 0, pocketZ],
        [Math.cos(a1) * pennyRadius, Math.sin(a1) * pennyRadius, pocketZ],
        [Math.cos(a2) * pennyRadius, Math.sin(a2) * pennyRadius, pocketZ]
      );
    }
  } else {
    // Magnet pocket
    const pocketZ = partHeight - magnetDepth;
    
    generateHollowDisc(triangles, 0, 0, pocketZ, partHeight + 0.01, magnetRadius, 0.1, 32, true, false);
    
    // Pocket floor
    for (let i = 0; i < 32; i++) {
      const a1 = (i / 32) * Math.PI * 2;
      const a2 = ((i + 1) / 32) * Math.PI * 2;
      addTriangle(triangles,
        [0, 0, pocketZ],
        [Math.cos(a1) * magnetRadius, Math.sin(a1) * magnetRadius, pocketZ],
        [Math.cos(a2) * magnetRadius, Math.sin(a2) * magnetRadius, pocketZ]
      );
    }
  }
  
  // 4. Wire holes going DOWN through bottom
  // Position wire holes around the magnet pocket, towards the edge
  if (mode !== 'battery') {
    const channelRadius = wireChannelDiameter / 2;
    const channelDistance = outerRadius - wallThickness - channelRadius - 1;
    
    for (let w = 0; w < wireCount; w++) {
      const angle = (w / wireCount) * Math.PI * 2;
      const cx = Math.cos(angle) * channelDistance;
      const cy = Math.sin(angle) * channelDistance;
      
      // Hole through entire height
      generateHollowDisc(triangles, cx, cy, -0.01, partHeight + 0.01, channelRadius, 0.01, 16, true, true);
    }
  }
  
  // 5. Alignment socket on top face (for nub on cap to fit into)
  if (includeAlignment) {
    const alignX = outerRadius * 0.6;
    generateAlignmentSocket(triangles, alignX, 0, partHeight, 1.5, 0.8, 'up');
  }
  
  return triangles;
}

/**
 * TOP HALF (Cap) - The LED holder cap
 * - LED socket on top
 * - Magnet pocket on BOTTOM face
 * - LED lead holes go through to bottom
 * - Sits on top of bottom half, held by magnets
 */
function generateTopHalf(config: LEDMagneticHolderConfig): Triangle[] {
  const triangles: Triangle[] = [];
  
  const {
    ledType,
    ledCount,
    diameter,
    thickness,
    wallThickness,
    magnetSize,
    usePennySlot,
    mode,
    includeAlignment,
  } = config;
  
  const led = LED_SPECS[ledType];
  const outerRadius = diameter / 2;
  const magnet = MAGNET_SPECS[magnetSize];
  const magnetRadius = magnet.diameter / 2 + 0.15;
  const magnetDepth = magnet.thickness + 0.2;
  
  const partHeight = thickness / 2;
  const segments = 48;
  
  // 1. Main body - solid disc
  generateDisc(triangles, 0, 0, 0, partHeight, outerRadius, segments);
  
  // 2. LED socket on TOP - recessed pocket for LED to sit in
  const ledHoleRadius = led.diameter / 2 + 0.3;
  const ledDepth = Math.min(led.length * 0.6, partHeight - 0.5);
  const ledPocketZ = partHeight - ledDepth;
  
  if (ledCount === 1) {
    // Single LED in center
    // Socket walls
    generateHollowDisc(triangles, 0, 0, ledPocketZ, partHeight + 0.01, ledHoleRadius, 0.1, 24, true, false);
    
    // Socket floor with lead holes
    const leadHoleRadius = 1.2;
    const leadSpacing = 2.54 / 2; // Standard LED lead spacing
    
    // Floor with lead holes cut out
    for (let i = 0; i < 24; i++) {
      const a1 = (i / 24) * Math.PI * 2;
      const a2 = ((i + 1) / 24) * Math.PI * 2;
      const x1 = Math.cos(a1) * ledHoleRadius;
      const y1 = Math.sin(a1) * ledHoleRadius;
      const x2 = Math.cos(a2) * ledHoleRadius;
      const y2 = Math.sin(a2) * ledHoleRadius;
      
      // Just add floor at pocket bottom
      addTriangle(triangles,
        [0, 0, ledPocketZ],
        [x1, y1, ledPocketZ],
        [x2, y2, ledPocketZ]
      );
    }
    
    // Lead holes through the entire part (from LED pocket to bottom)
    generateHollowDisc(triangles, -leadSpacing, 0, -0.01, ledPocketZ + 0.01, leadHoleRadius, 0.01, 12, true, true);
    generateHollowDisc(triangles, leadSpacing, 0, -0.01, ledPocketZ + 0.01, leadHoleRadius, 0.01, 12, true, true);
  } else {
    // Multiple LEDs arranged in a circle
    const ledCircleRadius = (outerRadius - ledHoleRadius - wallThickness) * 0.6;
    
    for (let l = 0; l < ledCount; l++) {
      const angle = (l / ledCount) * Math.PI * 2;
      const lx = Math.cos(angle) * ledCircleRadius;
      const ly = Math.sin(angle) * ledCircleRadius;
      
      // LED socket
      generateHollowDisc(triangles, lx, ly, ledPocketZ, partHeight + 0.01, ledHoleRadius, 0.1, 24, true, false);
      
      // Socket floor
      for (let i = 0; i < 24; i++) {
        const a1 = (i / 24) * Math.PI * 2;
        const a2 = ((i + 1) / 24) * Math.PI * 2;
        addTriangle(triangles,
          [lx, ly, ledPocketZ],
          [lx + Math.cos(a1) * ledHoleRadius, ly + Math.sin(a1) * ledHoleRadius, ledPocketZ],
          [lx + Math.cos(a2) * ledHoleRadius, ly + Math.sin(a2) * ledHoleRadius, ledPocketZ]
        );
      }
      
      // Lead hole through
      const leadRadius = 1.2;
      generateHollowDisc(triangles, lx, ly, -0.01, ledPocketZ + 0.01, leadRadius, 0.01, 12, true, true);
    }
  }
  
  // 3. Magnet pocket on BOTTOM face
  if (!usePennySlot && mode !== 'battery') {
    // Magnet pocket recessed from bottom
    const pocketZ = magnetDepth;
    
    // Pocket walls (going up from bottom)
    generateHollowDisc(triangles, 0, 0, -0.01, pocketZ, magnetRadius, 0.1, 32, false, true);
    
    // Pocket ceiling
    for (let i = 0; i < 32; i++) {
      const a1 = (i / 32) * Math.PI * 2;
      const a2 = ((i + 1) / 32) * Math.PI * 2;
      addTriangle(triangles,
        [0, 0, pocketZ],
        [Math.cos(a2) * magnetRadius, Math.sin(a2) * magnetRadius, pocketZ],
        [Math.cos(a1) * magnetRadius, Math.sin(a1) * magnetRadius, pocketZ]
      );
    }
  }
  
  // 4. Alignment nub on bottom (fits into socket on bottom half)
  if (includeAlignment) {
    const alignX = outerRadius * 0.6;
    generateAlignmentNub(triangles, alignX, 0, 0, 1.3, 0.6, 'down');
  }
  
  return triangles;
}

// Convert triangles to STL binary format
function trianglesToSTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)
  
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  
  // Header (80 bytes)
  buffer.write('LED Magnetic Holder - SignCraft 3D', 0);
  
  // Triangle count
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  
  for (const tri of triangles) {
    // Calculate normal
    const v1 = tri[0], v2 = tri[1], v3 = tri[2];
    const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
    const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
    
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len; ny /= len; nz /= len;
    }
    
    // Write normal
    buffer.writeFloatLE(nx, offset); offset += 4;
    buffer.writeFloatLE(ny, offset); offset += 4;
    buffer.writeFloatLE(nz, offset); offset += 4;
    
    // Write vertices
    for (const v of tri) {
      buffer.writeFloatLE(v[0], offset); offset += 4;
      buffer.writeFloatLE(v[1], offset); offset += 4;
      buffer.writeFloatLE(v[2], offset); offset += 4;
    }
    
    // Attribute byte count
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  
  return buffer;
}

export function generateLEDMagneticHolder(config: Partial<LEDMagneticHolderConfig> = {}): {
  bottom: Buffer;
  top: Buffer;
  config: LEDMagneticHolderConfig;
} {
  const fullConfig: LEDMagneticHolderConfig = {
    ledType: config.ledType || '5mm',
    ledCount: config.ledCount || 1,
    mode: config.mode || 'wired',
    batteryType: config.batteryType || 'CR2032',
    wireCount: config.wireCount || 2,
    diameter: config.diameter || 25,
    thickness: config.thickness || 6,
    wallThickness: config.wallThickness || 1.5,
    magnetSize: config.magnetSize || '8x2',
    usePennySlot: config.usePennySlot || false,
    wireChannelDiameter: config.wireChannelDiameter || 2,
    includeAlignment: config.includeAlignment !== false,
  };
  
  const bottomTriangles = generateBottomHalf(fullConfig);
  const topTriangles = generateTopHalf(fullConfig);
  
  return {
    bottom: trianglesToSTL(bottomTriangles),
    top: trianglesToSTL(topTriangles),
    config: fullConfig,
  };
}

export { LED_SPECS, MAGNET_SPECS, BATTERY_SPECS };
