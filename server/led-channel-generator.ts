/**
 * LED Channel/Diffuser Generator
 * Creates hollow tube profiles for various LED types with shape patterns
 * Supports: WS2812B strips, EL wire, LED neon flex, filament tubes, single LEDs
 */

type Triangle = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

// LED Profile specifications (all measurements in mm)
export const LED_PROFILES = {
  // WS2812B LED Strip - 10mm wide PCB, 5mm height
  ws2812b_strip: {
    name: "WS2812B LED Strip",
    channelWidth: 12,    // PCB width + clearance
    channelHeight: 6,    // Height for strip + wiring
    pcbSlotWidth: 10.5,  // Slot for PCB base
    pcbSlotHeight: 2,    // PCB thickness slot
  },
  // COB LED Strip - 8mm wide, continuous light
  cob_strip: {
    name: "COB LED Strip",
    channelWidth: 10,
    channelHeight: 5,
    pcbSlotWidth: 8.5,
    pcbSlotHeight: 1.5,
  },
  // EL Wire - 2.3mm diameter typical
  el_wire: {
    name: "EL Wire",
    channelWidth: 4,
    channelHeight: 4,
    pcbSlotWidth: 3,
    pcbSlotHeight: 3,
  },
  // LED Neon Flex - 8x16mm typical
  neon_flex: {
    name: "LED Neon Flex",
    channelWidth: 10,
    channelHeight: 18,
    pcbSlotWidth: 8.5,
    pcbSlotHeight: 16,
  },
  // Flexible Filament Tube - 6mm diameter
  filament_tube: {
    name: "Filament Tube",
    channelWidth: 8,
    channelHeight: 8,
    pcbSlotWidth: 6.5,
    pcbSlotHeight: 6.5,
  },
  // Single 5mm LED
  single_led_5mm: {
    name: "5mm LED",
    channelWidth: 7,
    channelHeight: 7,
    pcbSlotWidth: 5.5,
    pcbSlotHeight: 5.5,
  },
  // NeoPixel single SMD (can be chained)
  neopixel_smd: {
    name: "NeoPixel SMD",
    channelWidth: 8,
    channelHeight: 4,
    pcbSlotWidth: 6,
    pcbSlotHeight: 2,
  },
  // Custom - user defined
  custom: {
    name: "Custom",
    channelWidth: 12,
    channelHeight: 8,
    pcbSlotWidth: 10,
    pcbSlotHeight: 4,
  },
} as const;

export type LEDProfileType = keyof typeof LED_PROFILES;

// Shape patterns for diffuser layouts
export const SHAPE_PATTERNS = {
  hexagon: "Hexagonal Grid",
  molecule: "Molecular/Organic",
  phi_spiral: "Phi/Fibonacci Spiral",
  triangle: "Triangle Grid",
  square: "Square Grid",
  pentagon: "Pentagon Pattern",
  atom: "Atomic Orbital",
  dna_helix: "DNA Helix",
  tree_branch: "Tree Branch",
  lightning: "Lightning Bolt",
  wave: "Wave Pattern",
  star: "Star Burst",
  custom_path: "Custom Path",
} as const;

export type ShapePatternType = keyof typeof SHAPE_PATTERNS;

export interface LEDChannelConfig {
  ledType: LEDProfileType;
  shapePattern: ShapePatternType;
  
  // Channel dimensions
  channelLength: number;     // Length of each segment
  wallThickness: number;     // Outer wall thickness
  diffuserThickness: number; // Diffuser cover thickness
  
  // Pattern-specific settings
  patternScale: number;      // Overall size multiplier
  patternDensity: number;    // How many repeats
  
  // Features
  includeDiffuser: boolean;  // Generate snap-on diffuser
  includeEndCaps: boolean;   // Generate end caps
  includeMountingClips: boolean;
  wireChannels: boolean;     // Internal wire routing
  
  // Custom overrides
  customChannelWidth?: number;
  customChannelHeight?: number;
}

function createBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCount = triangles.length;
  const dataSize = headerSize + 4 + triangleCount * 50;
  const buffer = Buffer.alloc(dataSize);
  
  buffer.write("LED Channel Diffuser - SignCraft3D", 0);
  buffer.writeUInt32LE(triangleCount, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    const [p1, p2, p3] = tri;
    const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0], vy = p3[1] - p1[1], vz = p3[2] - p1[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;
    
    buffer.writeFloatLE(nx, offset); offset += 4;
    buffer.writeFloatLE(ny, offset); offset += 4;
    buffer.writeFloatLE(nz, offset); offset += 4;
    
    for (const p of tri) {
      buffer.writeFloatLE(p[0], offset); offset += 4;
      buffer.writeFloatLE(p[1], offset); offset += 4;
      buffer.writeFloatLE(p[2], offset); offset += 4;
    }
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  return buffer;
}

// Generate a single watertight hollow tube segment
// Each segment is a complete closed solid - overlaps handled by slicer union
function generateWatertightTubeSegment(
  triangles: Triangle[],
  x1: number, y1: number,
  x2: number, y2: number,
  outerW: number, outerH: number,
  innerW: number, innerH: number,
  wallThickness: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.1) return;
  
  const px = -dy / length;
  const py = dx / length;
  const oHalfW = outerW / 2;
  const iHalfW = innerW / 2;
  
  // Outer shell corners at start
  const s_ol: [number, number, number] = [x1 + px * oHalfW, y1 + py * oHalfW, 0];
  const s_or: [number, number, number] = [x1 - px * oHalfW, y1 - py * oHalfW, 0];
  const s_olT: [number, number, number] = [x1 + px * oHalfW, y1 + py * oHalfW, outerH];
  const s_orT: [number, number, number] = [x1 - px * oHalfW, y1 - py * oHalfW, outerH];
  
  // Outer shell corners at end
  const e_ol: [number, number, number] = [x2 + px * oHalfW, y2 + py * oHalfW, 0];
  const e_or: [number, number, number] = [x2 - px * oHalfW, y2 - py * oHalfW, 0];
  const e_olT: [number, number, number] = [x2 + px * oHalfW, y2 + py * oHalfW, outerH];
  const e_orT: [number, number, number] = [x2 - px * oHalfW, y2 - py * oHalfW, outerH];
  
  // Inner channel corners at start (cavity height = innerH, not outerH)
  const innerTopZ = wallThickness + innerH;
  const s_il: [number, number, number] = [x1 + px * iHalfW, y1 + py * iHalfW, wallThickness];
  const s_ir: [number, number, number] = [x1 - px * iHalfW, y1 - py * iHalfW, wallThickness];
  const s_ilT: [number, number, number] = [x1 + px * iHalfW, y1 + py * iHalfW, innerTopZ];
  const s_irT: [number, number, number] = [x1 - px * iHalfW, y1 - py * iHalfW, innerTopZ];
  
  // Inner channel corners at end
  const e_il: [number, number, number] = [x2 + px * iHalfW, y2 + py * iHalfW, wallThickness];
  const e_ir: [number, number, number] = [x2 - px * iHalfW, y2 - py * iHalfW, wallThickness];
  const e_ilT: [number, number, number] = [x2 + px * iHalfW, y2 + py * iHalfW, innerTopZ];
  const e_irT: [number, number, number] = [x2 - px * iHalfW, y2 - py * iHalfW, innerTopZ];
  
  // === OUTER SHELL - U-shaped open channel ===
  // Bottom (full solid floor)
  triangles.push([s_ol, e_ol, e_or]);
  triangles.push([s_ol, e_or, s_or]);
  
  // Top rim (left side only - between outer and inner)
  triangles.push([s_olT, s_ilT, e_ilT]);
  triangles.push([s_olT, e_ilT, e_olT]);
  
  // Top rim (right side only - between outer and inner)
  triangles.push([s_orT, e_orT, e_irT]);
  triangles.push([s_orT, e_irT, s_irT]);
  
  // NO triangles across inner top - channel stays OPEN for LED insertion
  
  // Left outer wall
  triangles.push([s_ol, s_olT, e_olT]);
  triangles.push([s_ol, e_olT, e_ol]);
  
  // Right outer wall
  triangles.push([s_or, e_orT, s_orT]);
  triangles.push([s_or, e_or, e_orT]);
  
  // === INNER CHANNEL WALLS (open top for LED/diffuser) ===
  // Inner bottom
  triangles.push([s_il, s_ir, e_ir]);
  triangles.push([s_il, e_ir, e_il]);
  
  // Inner left wall
  triangles.push([s_il, e_il, e_ilT]);
  triangles.push([s_il, e_ilT, s_ilT]);
  
  // Inner right wall
  triangles.push([s_ir, s_irT, e_irT]);
  triangles.push([s_ir, e_irT, e_ir]);
}

// Add end cap wall at a path endpoint (U-shaped with open top)
function addEndCap(
  triangles: Triangle[],
  x: number, y: number,
  px: number, py: number, // perpendicular direction
  outerW: number, outerH: number,
  innerW: number, innerH: number, wallThickness: number,
  isStart: boolean
): void {
  const oHalfW = outerW / 2;
  const iHalfW = innerW / 2;
  const innerTopZ = wallThickness + innerH;
  
  // Outer corners
  const ol: [number, number, number] = [x + px * oHalfW, y + py * oHalfW, 0];
  const or: [number, number, number] = [x - px * oHalfW, y - py * oHalfW, 0];
  const olT: [number, number, number] = [x + px * oHalfW, y + py * oHalfW, outerH];
  const orT: [number, number, number] = [x - px * oHalfW, y - py * oHalfW, outerH];
  
  // Inner corners (use innerTopZ for correct cavity height)
  const il: [number, number, number] = [x + px * iHalfW, y + py * iHalfW, wallThickness];
  const ir: [number, number, number] = [x - px * iHalfW, y - py * iHalfW, wallThickness];
  const ilT: [number, number, number] = [x + px * iHalfW, y + py * iHalfW, innerTopZ];
  const irT: [number, number, number] = [x - px * iHalfW, y - py * iHalfW, innerTopZ];
  
  if (isStart) {
    // Facing backward (normals point toward negative path direction)
    triangles.push([ol, ir, or]);
    triangles.push([ol, il, ir]);
    triangles.push([ol, olT, ilT]);
    triangles.push([ol, ilT, il]);
    triangles.push([or, ir, irT]);
    triangles.push([or, irT, orT]);
  } else {
    // Facing forward
    triangles.push([ol, or, ir]);
    triangles.push([ol, ir, il]);
    triangles.push([ol, ilT, olT]);
    triangles.push([ol, il, ilT]);
    triangles.push([or, irT, ir]);
    triangles.push([or, orT, irT]);
  }
}

// Generate hollow tube along a path - U-shaped open channel with end caps
function generateHollowTube(
  triangles: Triangle[],
  path: [number, number][],
  profile: { channelWidth: number; channelHeight: number; pcbSlotWidth: number; pcbSlotHeight: number },
  wallThickness: number,
  _includePCBSlot: boolean = true
): void {
  if (path.length < 2) return;
  
  const outerW = profile.channelWidth + wallThickness * 2;
  const outerH = profile.channelHeight + wallThickness * 2;
  const innerW = profile.channelWidth;
  const innerH = profile.channelHeight;
  
  // Generate main tube segments
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    generateWatertightTubeSegment(
      triangles, x1, y1, x2, y2,
      outerW, outerH, innerW, innerH, wallThickness
    );
  }
  
  // Add end cap at path start
  const [sx1, sy1] = path[0];
  const [sx2, sy2] = path[1];
  const sdx = sx2 - sx1, sdy = sy2 - sy1;
  const slen = Math.sqrt(sdx * sdx + sdy * sdy);
  if (slen > 0.1) {
    addEndCap(triangles, sx1, sy1, -sdy / slen, sdx / slen,
      outerW, outerH, innerW, innerH, wallThickness, true);
  }
  
  // Add end cap at path end
  const [ex1, ey1] = path[path.length - 2];
  const [ex2, ey2] = path[path.length - 1];
  const edx = ex2 - ex1, edy = ey2 - ey1;
  const elen = Math.sqrt(edx * edx + edy * edy);
  if (elen > 0.1) {
    addEndCap(triangles, ex2, ey2, -edy / elen, edx / elen,
      outerW, outerH, innerW, innerH, wallThickness, false);
  }
}

// Generate hexagon shape pattern
function generateHexagonPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const hexRadius = scale;
  const hexHeight = hexRadius * Math.sqrt(3);
  
  for (let ring = 0; ring < density; ring++) {
    for (let side = 0; side < 6; side++) {
      const angle1 = (side * 60 - 30) * Math.PI / 180;
      const angle2 = ((side + 1) * 60 - 30) * Math.PI / 180;
      
      const x1 = Math.cos(angle1) * hexRadius * (ring + 1);
      const y1 = Math.sin(angle1) * hexRadius * (ring + 1);
      const x2 = Math.cos(angle2) * hexRadius * (ring + 1);
      const y2 = Math.sin(angle2) * hexRadius * (ring + 1);
      
      paths.push([[x1, y1], [x2, y2]]);
    }
  }
  
  return paths;
}

// Generate molecular/organic pattern (like benzene rings)
function generateMoleculePattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const bondLength = scale;
  
  // Create benzene-like hexagonal rings
  const ringPositions: [number, number][] = [
    [0, 0],
    [bondLength * 1.5, bondLength * Math.sqrt(3) / 2],
    [bondLength * 1.5, -bondLength * Math.sqrt(3) / 2],
    [bondLength * 3, 0],
  ];
  
  for (let r = 0; r < Math.min(density, ringPositions.length); r++) {
    const [cx, cy] = ringPositions[r];
    
    // Hexagonal ring
    for (let i = 0; i < 6; i++) {
      const angle1 = (i * 60) * Math.PI / 180;
      const angle2 = ((i + 1) * 60) * Math.PI / 180;
      const x1 = cx + Math.cos(angle1) * bondLength * 0.6;
      const y1 = cy + Math.sin(angle1) * bondLength * 0.6;
      const x2 = cx + Math.cos(angle2) * bondLength * 0.6;
      const y2 = cy + Math.sin(angle2) * bondLength * 0.6;
      paths.push([[x1, y1], [x2, y2]]);
    }
    
    // Add branch stubs
    if (r === 0) {
      const stubAngle = 90 * Math.PI / 180;
      const stubX = cx + Math.cos(stubAngle) * bondLength * 0.6;
      const stubY = cy + Math.sin(stubAngle) * bondLength * 0.6;
      paths.push([[stubX, stubY], [stubX, stubY + bondLength * 0.4]]);
    }
  }
  
  // Connect rings
  if (density > 1) {
    paths.push([
      [bondLength * 0.6 * Math.cos(0), bondLength * 0.6 * Math.sin(0)],
      [ringPositions[1][0] + bondLength * 0.6 * Math.cos(180 * Math.PI / 180), 
       ringPositions[1][1] + bondLength * 0.6 * Math.sin(180 * Math.PI / 180)]
    ]);
  }
  
  return paths;
}

// Generate Phi spiral pattern (Fibonacci/Golden)
function generatePhiSpiralPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const phi = 1.618033988749895;
  const turns = density * 2;
  const pointsPerTurn = 20;
  
  for (let arm = 0; arm < 2; arm++) {
    const path: [number, number][] = [];
    const armOffset = arm * Math.PI;
    
    for (let i = 0; i <= turns * pointsPerTurn; i++) {
      const angle = (i / pointsPerTurn) * Math.PI * 2 + armOffset;
      const r = scale * 0.1 * Math.pow(phi, angle / (Math.PI * 2));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      path.push([x, y]);
    }
    
    // Split into segments
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  return paths;
}

// Generate star burst pattern
function generateStarPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const rays = Math.max(5, density + 4);
  
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const x = Math.cos(angle) * scale;
    const y = Math.sin(angle) * scale;
    paths.push([[0, 0], [x, y]]);
  }
  
  return paths;
}

// Generate wave pattern
function generateWavePattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const waves = density;
  const amplitude = scale * 0.3;
  const wavelength = scale * 2 / waves;
  
  for (let w = 0; w < waves; w++) {
    const path: [number, number][] = [];
    const yOffset = w * amplitude * 3;
    
    for (let x = -scale; x <= scale; x += wavelength / 10) {
      const y = yOffset + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
      path.push([x, y]);
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  return paths;
}

// Generate atomic orbital pattern
function generateAtomPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const orbitals = Math.min(density, 4);
  
  // Nucleus
  const nucleusR = scale * 0.1;
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    paths.push([
      [Math.cos(a1) * nucleusR, Math.sin(a1) * nucleusR],
      [Math.cos(a2) * nucleusR, Math.sin(a2) * nucleusR]
    ]);
  }
  
  // Orbital ellipses
  for (let o = 0; o < orbitals; o++) {
    const tilt = (o / orbitals) * Math.PI;
    const r = scale * (0.4 + o * 0.2);
    const segments = 24;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Apply tilt rotation
      const x1 = Math.cos(a1) * r;
      const y1 = Math.sin(a1) * r * 0.3 * Math.cos(tilt);
      const x2 = Math.cos(a2) * r;
      const y2 = Math.sin(a2) * r * 0.3 * Math.cos(tilt);
      
      // Rotate by tilt
      const rx1 = x1 * Math.cos(tilt) - y1 * Math.sin(tilt);
      const ry1 = x1 * Math.sin(tilt) + y1 * Math.cos(tilt);
      const rx2 = x2 * Math.cos(tilt) - y2 * Math.sin(tilt);
      const ry2 = x2 * Math.sin(tilt) + y2 * Math.cos(tilt);
      
      paths.push([[rx1, ry1], [rx2, ry2]]);
    }
  }
  
  return paths;
}

// Generate triangle grid pattern
function generateTrianglePattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const size = scale / density;
  const h = size * Math.sqrt(3) / 2;
  
  for (let row = 0; row < density; row++) {
    for (let col = 0; col < density; col++) {
      const xOffset = col * size + (row % 2) * size / 2;
      const yOffset = row * h;
      
      // Triangle edges
      paths.push([[xOffset, yOffset], [xOffset + size, yOffset]]);
      paths.push([[xOffset + size, yOffset], [xOffset + size / 2, yOffset + h]]);
      paths.push([[xOffset + size / 2, yOffset + h], [xOffset, yOffset]]);
    }
  }
  
  return paths;
}

// Generate DNA helix pattern
function generateDNAHelixPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const turns = density;
  const points = turns * 20;
  const helixR = scale * 0.3;
  const length = scale * 2;
  
  // Two strands
  for (let strand = 0; strand < 2; strand++) {
    const offset = strand * Math.PI;
    const path: [number, number][] = [];
    
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const angle = t * turns * Math.PI * 2 + offset;
      const x = Math.cos(angle) * helixR;
      const y = -length / 2 + t * length;
      path.push([x, y]);
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  // Cross rungs (base pairs)
  for (let i = 0; i < turns * 2; i++) {
    const t = i / (turns * 2);
    const angle = t * turns * Math.PI * 2;
    const y = -length / 2 + t * length;
    
    const x1 = Math.cos(angle) * helixR;
    const x2 = Math.cos(angle + Math.PI) * helixR;
    
    paths.push([[x1, y], [x2, y]]);
  }
  
  return paths;
}

// Generate square grid pattern
function generateSquarePattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const size = scale / density;
  
  for (let row = 0; row <= density; row++) {
    for (let col = 0; col <= density; col++) {
      const x = col * size;
      const y = row * size;
      
      // Horizontal lines
      if (col < density) {
        paths.push([[x, y], [x + size, y]]);
      }
      // Vertical lines
      if (row < density) {
        paths.push([[x, y], [x, y + size]]);
      }
    }
  }
  return paths;
}

// Generate pentagon tiled pattern
function generatePentagonPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const r = scale / (density * 2);
  
  for (let row = 0; row < density; row++) {
    for (let col = 0; col < density; col++) {
      const cx = col * r * 2 + r;
      const cy = row * r * 1.9 + r;
      
      // Draw pentagon
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 72 - 90) * Math.PI / 180;
        const a2 = ((i + 1) * 72 - 90) * Math.PI / 180;
        const x1 = cx + Math.cos(a1) * r * 0.9;
        const y1 = cy + Math.sin(a1) * r * 0.9;
        const x2 = cx + Math.cos(a2) * r * 0.9;
        const y2 = cy + Math.sin(a2) * r * 0.9;
        paths.push([[x1, y1], [x2, y2]]);
      }
    }
  }
  return paths;
}

// Generate lightning bolt pattern
function generateLightningPattern(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const segLen = scale / (density * 4);
  
  for (let i = 0; i < density; i++) {
    const startX = (i / density) * scale * 0.8 + scale * 0.1;
    const path: [number, number][] = [[startX, 0]];
    
    let x = startX;
    let y = 0;
    let dir = 1;
    
    for (let s = 0; s < density * 4; s++) {
      x += dir * segLen * 0.5;
      y += segLen;
      path.push([x, y]);
      dir *= -1;
    }
    
    for (let j = 0; j < path.length - 1; j++) {
      paths.push([path[j], path[j + 1]]);
    }
  }
  return paths;
}

// Generate tree branch pattern
function generateTreeBranchPattern(scale: number, depth: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const PHI = 1.618033988749895;
  
  function branch(x1: number, y1: number, len: number, angle: number, d: number) {
    if (d <= 0 || len < 2) return;
    
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    paths.push([[x1, y1], [x2, y2]]);
    
    const newLen = len / PHI;
    branch(x2, y2, newLen, angle - Math.PI / 5, d - 1);
    branch(x2, y2, newLen, angle + Math.PI / 4, d - 1);
  }
  
  branch(scale / 2, 0, scale / 3, Math.PI / 2, Math.min(depth + 2, 6));
  return paths;
}

// Get path for shape pattern
function getShapePaths(pattern: ShapePatternType, scale: number, density: number): [number, number][][] {
  switch (pattern) {
    case 'hexagon': return generateHexagonPattern(scale, density);
    case 'molecule': return generateMoleculePattern(scale, density);
    case 'phi_spiral': return generatePhiSpiralPattern(scale, density);
    case 'star': return generateStarPattern(scale, density);
    case 'wave': return generateWavePattern(scale, density);
    case 'atom': return generateAtomPattern(scale, density);
    case 'triangle': return generateTrianglePattern(scale, density);
    case 'dna_helix': return generateDNAHelixPattern(scale, density);
    case 'square': return generateSquarePattern(scale, density);
    case 'pentagon': return generatePentagonPattern(scale, density);
    case 'lightning': return generateLightningPattern(scale, density);
    case 'tree_branch': return generateTreeBranchPattern(scale, density);
    case 'custom_path':
    default:
      return generateHexagonPattern(scale, density);
  }
}

// Generate diffuser cover (snap-on)
function generateDiffuserCover(
  triangles: Triangle[],
  path: [number, number][],
  channelWidth: number,
  thickness: number,
  wallThickness: number
): void {
  const coverWidth = channelWidth + 0.4; // Slight overlap for snap fit
  const lipHeight = 2;
  
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.1) continue;
    
    const px = -dy / length;
    const py = dx / length;
    const halfW = coverWidth / 2;
    
    // Top surface
    const s_l = [x1 + px * halfW, y1 + py * halfW, 0] as [number, number, number];
    const s_r = [x1 - px * halfW, y1 - py * halfW, 0] as [number, number, number];
    const s_lT = [x1 + px * halfW, y1 + py * halfW, thickness] as [number, number, number];
    const s_rT = [x1 - px * halfW, y1 - py * halfW, thickness] as [number, number, number];
    
    const e_l = [x2 + px * halfW, y2 + py * halfW, 0] as [number, number, number];
    const e_r = [x2 - px * halfW, y2 - py * halfW, 0] as [number, number, number];
    const e_lT = [x2 + px * halfW, y2 + py * halfW, thickness] as [number, number, number];
    const e_rT = [x2 - px * halfW, y2 - py * halfW, thickness] as [number, number, number];
    
    // Main diffuser body
    triangles.push([s_l, e_l, e_lT]);
    triangles.push([s_l, e_lT, s_lT]);
    triangles.push([s_r, s_rT, e_rT]);
    triangles.push([s_r, e_rT, e_r]);
    triangles.push([s_lT, e_lT, e_rT]);
    triangles.push([s_lT, e_rT, s_rT]);
    triangles.push([s_l, s_r, e_r]);
    triangles.push([s_l, e_r, e_l]);
    
    // Snap lips on sides
    const lipW = 1;
    const lipInset = halfW - lipW;
    
    // Left lip
    const ll_b = [x1 + px * lipInset, y1 + py * lipInset, -lipHeight] as [number, number, number];
    const ll_t = [x1 + px * lipInset, y1 + py * lipInset, 0] as [number, number, number];
    const ll_bE = [x2 + px * lipInset, y2 + py * lipInset, -lipHeight] as [number, number, number];
    const ll_tE = [x2 + px * lipInset, y2 + py * lipInset, 0] as [number, number, number];
    
    triangles.push([ll_b, ll_bE, ll_tE]);
    triangles.push([ll_b, ll_tE, ll_t]);
  }
}

// Generate end cap
function generateEndCap(
  triangles: Triangle[],
  position: [number, number],
  direction: [number, number],
  channelWidth: number,
  channelHeight: number,
  wallThickness: number,
  hasWireHole: boolean
): void {
  const outerW = channelWidth + wallThickness * 2;
  const outerH = channelHeight + wallThickness * 2;
  
  const [x, y] = position;
  const [dx, dy] = direction;
  const length = Math.sqrt(dx * dx + dy * dy);
  const px = -dy / length;
  const py = dx / length;
  
  const halfW = outerW / 2;
  const capDepth = wallThickness * 2;
  
  // Simple rectangular end cap
  const corners = [
    [x + px * halfW, y + py * halfW, 0],
    [x - px * halfW, y - py * halfW, 0],
    [x - px * halfW, y - py * halfW, outerH],
    [x + px * halfW, y + py * halfW, outerH],
  ] as [number, number, number][];
  
  // Front face
  triangles.push([corners[0], corners[1], corners[2]]);
  triangles.push([corners[0], corners[2], corners[3]]);
  
  // Extend back
  const back = corners.map(([cx, cy, cz]) => 
    [cx - dx / length * capDepth, cy - dy / length * capDepth, cz] as [number, number, number]
  );
  
  // Back face
  triangles.push([back[0], back[2], back[1]]);
  triangles.push([back[0], back[3], back[2]]);
  
  // Side faces
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    triangles.push([corners[i], back[i], back[j]]);
    triangles.push([corners[i], back[j], corners[j]]);
  }
}

export function generateLEDChannel(config: LEDChannelConfig): {
  channel: Buffer;
  diffuser: Buffer;
  endCaps: Buffer;
  config: LEDChannelConfig;
} {
  const profile = LED_PROFILES[config.ledType];
  
  // Apply custom overrides
  const channelWidth = config.customChannelWidth || profile.channelWidth;
  const channelHeight = config.customChannelHeight || profile.channelHeight;
  const effectiveProfile = {
    ...profile,
    channelWidth,
    channelHeight,
  };
  
  // Get shape paths
  const paths = getShapePaths(config.shapePattern, config.patternScale, config.patternDensity);
  
  // Generate channel
  const channelTriangles: Triangle[] = [];
  for (const path of paths) {
    if (path.length >= 2) {
      generateHollowTube(channelTriangles, path, effectiveProfile, config.wallThickness, true);
    }
  }
  
  // Generate diffuser
  const diffuserTriangles: Triangle[] = [];
  if (config.includeDiffuser) {
    for (const path of paths) {
      if (path.length >= 2) {
        generateDiffuserCover(diffuserTriangles, path, channelWidth, config.diffuserThickness, config.wallThickness);
      }
    }
  }
  
  // Generate end caps
  const endCapTriangles: Triangle[] = [];
  if (config.includeEndCaps) {
    for (const path of paths) {
      if (path.length >= 2) {
        // Start cap
        const [x1, y1] = path[0];
        const [x2, y2] = path[1];
        generateEndCap(endCapTriangles, [x1, y1], [x2 - x1, y2 - y1], channelWidth, channelHeight, config.wallThickness, config.wireChannels);
        
        // End cap
        const [xL1, yL1] = path[path.length - 2];
        const [xL2, yL2] = path[path.length - 1];
        generateEndCap(endCapTriangles, [xL2, yL2], [xL2 - xL1, yL2 - yL1], channelWidth, channelHeight, config.wallThickness, config.wireChannels);
      }
    }
  }
  
  return {
    channel: createBinarySTL(channelTriangles),
    diffuser: createBinarySTL(diffuserTriangles),
    endCaps: createBinarySTL(endCapTriangles),
    config,
  };
}

export const defaultLEDChannelConfig: LEDChannelConfig = {
  ledType: 'ws2812b_strip',
  shapePattern: 'hexagon',
  channelLength: 100,
  wallThickness: 2,
  diffuserThickness: 1.5,
  patternScale: 50,
  patternDensity: 2,
  includeDiffuser: true,
  includeEndCaps: true,
  includeMountingClips: true,
  wireChannels: true,
};
