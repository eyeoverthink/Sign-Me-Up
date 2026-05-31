import { z } from "zod";

export const ledHolderSettingsSchema = z.object({
  ledType: z.enum(["3mm", "5mm", "ws2812b", "ws2812b_strip", "10mm_uv"]),
  holderStyle: z.enum(["clip", "socket", "cradle", "canvas_glow_clip"]),
  mountType: z.enum(["magnetic", "screw", "adhesive", "clip_on"]),
  wireChannelDiameter: z.number().min(1).max(10).default(3),
  magnetDiameter: z.number().min(3).max(15).default(8),
  magnetDepth: z.number().min(1).max(5).default(3),
  screwHoleDiameter: z.number().min(2).max(6).default(3),
  wallThickness: z.number().min(1).max(5).default(2),
  tiltAngle: z.number().min(0).max(90).default(45),
  quantity: z.number().min(1).max(20).default(1),
  adjustableHeight: z.boolean().optional(),
  minHeight: z.number().min(10).max(50).optional(),
  maxHeight: z.number().min(20).max(100).optional(),
  reflectorDepth: z.number().min(5).max(25).default(12),
  beamAngle: z.number().min(15).max(120).default(45),
  hasDiffuser: z.boolean().default(true),
  // Canvas Glow-Clip specific settings (duckbill wide diffuser)
  diffuserWidth: z.number().min(15).max(50).default(30),
  diffuserHeight: z.number().min(5).max(20).default(10),
  diffuserLength: z.number().min(10).max(30).default(15),
  lightingMode: z.enum(["spot", "wash"]).default("wash"),
});

export type LEDHolderSettings = z.infer<typeof ledHolderSettingsSchema>;

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  normal: Vector3;
}

function calculateNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  const n = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: n.x / len, y: n.y / len, z: n.z / len };
}

function addTriangle(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3): void {
  triangles.push({ v1, v2, v3, normal: calculateNormal(v1, v2, v3) });
}

function trianglesToBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);

  const header = "SignCraft3D LED Holder - Light Diffuser & Director";
  buffer.write(header.slice(0, 79), 0);
  buffer.writeUInt32LE(triangles.length, headerSize);

  let offset = headerSize + triangleCountSize;
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal.x, offset);
    buffer.writeFloatLE(tri.normal.y, offset + 4);
    buffer.writeFloatLE(tri.normal.z, offset + 8);
    buffer.writeFloatLE(tri.v1.x, offset + 12);
    buffer.writeFloatLE(tri.v1.y, offset + 16);
    buffer.writeFloatLE(tri.v1.z, offset + 20);
    buffer.writeFloatLE(tri.v2.x, offset + 24);
    buffer.writeFloatLE(tri.v2.y, offset + 28);
    buffer.writeFloatLE(tri.v2.z, offset + 32);
    buffer.writeFloatLE(tri.v3.x, offset + 36);
    buffer.writeFloatLE(tri.v3.y, offset + 40);
    buffer.writeFloatLE(tri.v3.z, offset + 44);
    buffer.writeUInt16LE(0, offset + 48);
    offset += triangleSize;
  }

  return buffer;
}

function getLEDDimensions(ledType: string): { diameter: number; depth: number; isRound: boolean } {
  switch (ledType) {
    case "3mm":
      return { diameter: 3.2, depth: 8, isRound: true };
    case "5mm":
      return { diameter: 5.2, depth: 10, isRound: true };
    case "10mm_uv":
      return { diameter: 10.2, depth: 15, isRound: true };
    case "ws2812b":
      return { diameter: 5.5, depth: 3, isRound: false };
    case "ws2812b_strip":
      return { diameter: 12, depth: 5, isRound: false };
    default:
      return { diameter: 5.2, depth: 10, isRound: true };
  }
}

// Generate a parabolic reflector cone that focuses/directs LED light
function generateParabolicReflector(triangles: Triangle[], 
  cx: number, cy: number, cz: number,
  ledRadius: number, reflectorDepth: number, beamAngle: number,
  wallThickness: number, segments: number = 32): void {
  
  const beamRad = (beamAngle * Math.PI) / 180;
  const openingRadius = ledRadius + reflectorDepth * Math.tan(beamRad / 2);
  const innerOpeningR = openingRadius;
  const outerOpeningR = openingRadius + wallThickness;
  const innerBackR = ledRadius + 0.5; // LED sits here
  const outerBackR = ledRadius + wallThickness + 0.5;
  
  // Generate parabolic reflector surface (inner reflective surface)
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    // Parabolic curve from back (LED) to front (opening)
    const curveSteps = 12;
    for (let j = 0; j < curveSteps; j++) {
      const t1 = j / curveSteps;
      const t2 = (j + 1) / curveSteps;
      
      // Parabolic profile: r = r_led + (r_open - r_led) * t^0.7
      // This creates a curved reflector surface
      const r1_inner = innerBackR + (innerOpeningR - innerBackR) * Math.pow(t1, 0.7);
      const r2_inner = innerBackR + (innerOpeningR - innerBackR) * Math.pow(t2, 0.7);
      const r1_outer = outerBackR + (outerOpeningR - outerBackR) * Math.pow(t1, 0.7);
      const r2_outer = outerBackR + (outerOpeningR - outerBackR) * Math.pow(t2, 0.7);
      
      const y1 = cy + t1 * reflectorDepth;
      const y2 = cy + t2 * reflectorDepth;
      
      // Inner surface (reflective side facing LED)
      const pi1: Vector3 = { x: cx + cos1 * r1_inner, y: y1, z: cz + sin1 * r1_inner };
      const pi2: Vector3 = { x: cx + cos2 * r1_inner, y: y1, z: cz + sin2 * r1_inner };
      const pi3: Vector3 = { x: cx + cos2 * r2_inner, y: y2, z: cz + sin2 * r2_inner };
      const pi4: Vector3 = { x: cx + cos1 * r2_inner, y: y2, z: cz + sin1 * r2_inner };
      
      // Inner surface faces inward (toward LED)
      addTriangle(triangles, pi1, pi3, pi2);
      addTriangle(triangles, pi1, pi4, pi3);
      
      // Outer surface (shell exterior)
      const po1: Vector3 = { x: cx + cos1 * r1_outer, y: y1, z: cz + sin1 * r1_outer };
      const po2: Vector3 = { x: cx + cos2 * r1_outer, y: y1, z: cz + sin2 * r1_outer };
      const po3: Vector3 = { x: cx + cos2 * r2_outer, y: y2, z: cz + sin2 * r2_outer };
      const po4: Vector3 = { x: cx + cos1 * r2_outer, y: y2, z: cz + sin1 * r2_outer };
      
      // Outer surface faces outward
      addTriangle(triangles, po1, po2, po3);
      addTriangle(triangles, po1, po3, po4);
    }
    
    // Back rim (connects inner to outer at LED end)
    const backInner1: Vector3 = { x: cx + cos1 * innerBackR, y: cy, z: cz + sin1 * innerBackR };
    const backInner2: Vector3 = { x: cx + cos2 * innerBackR, y: cy, z: cz + sin2 * innerBackR };
    const backOuter1: Vector3 = { x: cx + cos1 * outerBackR, y: cy, z: cz + sin1 * outerBackR };
    const backOuter2: Vector3 = { x: cx + cos2 * outerBackR, y: cy, z: cz + sin2 * outerBackR };
    
    addTriangle(triangles, backInner1, backOuter2, backOuter1);
    addTriangle(triangles, backInner1, backInner2, backOuter2);
    
    // Front rim (connects inner to outer at opening)
    const frontInner1: Vector3 = { x: cx + cos1 * innerOpeningR, y: cy + reflectorDepth, z: cz + sin1 * innerOpeningR };
    const frontInner2: Vector3 = { x: cx + cos2 * innerOpeningR, y: cy + reflectorDepth, z: cz + sin2 * innerOpeningR };
    const frontOuter1: Vector3 = { x: cx + cos1 * outerOpeningR, y: cy + reflectorDepth, z: cz + sin1 * outerOpeningR };
    const frontOuter2: Vector3 = { x: cx + cos2 * outerOpeningR, y: cy + reflectorDepth, z: cz + sin2 * outerOpeningR };
    
    addTriangle(triangles, frontInner1, frontOuter1, frontOuter2);
    addTriangle(triangles, frontInner1, frontOuter2, frontInner2);
  }
}

// Generate LED socket that holds the LED securely at the back of reflector
function generateLEDSocket(triangles: Triangle[],
  cx: number, cy: number, cz: number,
  ledRadius: number, ledDepth: number,
  wallThickness: number, segments: number = 24): void {
  
  const innerR = ledRadius + 0.2; // Slight clearance for LED
  const outerR = ledRadius + wallThickness + 0.2;
  const socketDepth = ledDepth * 0.6; // Socket holds 60% of LED body
  
  // Socket cylinder walls
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    // Inner wall (LED slides into this)
    const ib1: Vector3 = { x: cx + cos1 * innerR, y: cy - socketDepth, z: cz + sin1 * innerR };
    const ib2: Vector3 = { x: cx + cos2 * innerR, y: cy - socketDepth, z: cz + sin2 * innerR };
    const it1: Vector3 = { x: cx + cos1 * innerR, y: cy, z: cz + sin1 * innerR };
    const it2: Vector3 = { x: cx + cos2 * innerR, y: cy, z: cz + sin2 * innerR };
    
    addTriangle(triangles, ib1, it2, it1);
    addTriangle(triangles, ib1, ib2, it2);
    
    // Outer wall
    const ob1: Vector3 = { x: cx + cos1 * outerR, y: cy - socketDepth, z: cz + sin1 * outerR };
    const ob2: Vector3 = { x: cx + cos2 * outerR, y: cy - socketDepth, z: cz + sin2 * outerR };
    const ot1: Vector3 = { x: cx + cos1 * outerR, y: cy, z: cz + sin1 * outerR };
    const ot2: Vector3 = { x: cx + cos2 * outerR, y: cy, z: cz + sin2 * outerR };
    
    addTriangle(triangles, ob1, ot1, ot2);
    addTriangle(triangles, ob1, ot2, ob2);
    
    // Bottom ring (connects inner to outer at socket bottom)
    addTriangle(triangles, ib1, ob2, ob1);
    addTriangle(triangles, ib1, ib2, ob2);
  }
  
  // Wire exit hole at bottom of socket
  const wireHoleR = 1.5; // 3mm diameter wire channel
  for (let i = 0; i < 16; i++) {
    const angle1 = (i / 16) * Math.PI * 2;
    const angle2 = ((i + 1) / 16) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    // Ring around wire hole
    const center: Vector3 = { x: cx, y: cy - socketDepth, z: cz };
    const p1: Vector3 = { x: cx + cos1 * wireHoleR, y: cy - socketDepth, z: cz + sin1 * wireHoleR };
    const p2: Vector3 = { x: cx + cos2 * wireHoleR, y: cy - socketDepth, z: cz + sin2 * wireHoleR };
    const p3: Vector3 = { x: cx + cos1 * innerR, y: cy - socketDepth, z: cz + sin1 * innerR };
    const p4: Vector3 = { x: cx + cos2 * innerR, y: cy - socketDepth, z: cz + sin2 * innerR };
    
    // Bottom face with hole
    addTriangle(triangles, p1, p4, p3);
    addTriangle(triangles, p1, p2, p4);
  }
}

// Generate diffuser dome that spreads light evenly
function generateDiffuserDome(triangles: Triangle[],
  cx: number, cy: number, cz: number,
  domeRadius: number, domeHeight: number,
  wallThickness: number, segments: number = 24): void {
  
  const innerR = domeRadius;
  const outerR = domeRadius + wallThickness;
  const latSteps = 12;
  
  // Hemispherical dome
  for (let i = 0; i < segments; i++) {
    const phi1 = (i / segments) * Math.PI * 2;
    const phi2 = ((i + 1) / segments) * Math.PI * 2;
    
    for (let j = 0; j < latSteps; j++) {
      const theta1 = (j / latSteps) * (Math.PI / 2);
      const theta2 = ((j + 1) / latSteps) * (Math.PI / 2);
      
      // Outer dome surface
      const getOuter = (theta: number, phi: number): Vector3 => ({
        x: cx + outerR * Math.sin(theta) * Math.cos(phi),
        y: cy + domeHeight * Math.cos(theta),
        z: cz + outerR * Math.sin(theta) * Math.sin(phi)
      });
      
      const po1 = getOuter(theta1, phi1);
      const po2 = getOuter(theta1, phi2);
      const po3 = getOuter(theta2, phi2);
      const po4 = getOuter(theta2, phi1);
      
      addTriangle(triangles, po1, po2, po3);
      addTriangle(triangles, po1, po3, po4);
      
      // Inner dome surface (for wall thickness)
      const getInner = (theta: number, phi: number): Vector3 => ({
        x: cx + innerR * Math.sin(theta) * Math.cos(phi),
        y: cy + (domeHeight - wallThickness) * Math.cos(theta),
        z: cz + innerR * Math.sin(theta) * Math.sin(phi)
      });
      
      const pi1 = getInner(theta1, phi1);
      const pi2 = getInner(theta1, phi2);
      const pi3 = getInner(theta2, phi2);
      const pi4 = getInner(theta2, phi1);
      
      addTriangle(triangles, pi1, pi3, pi2);
      addTriangle(triangles, pi1, pi4, pi3);
    }
  }
  
  // Rim connecting outer to inner at base
  for (let i = 0; i < segments; i++) {
    const phi1 = (i / segments) * Math.PI * 2;
    const phi2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(phi1);
    const sin1 = Math.sin(phi1);
    const cos2 = Math.cos(phi2);
    const sin2 = Math.sin(phi2);
    
    const outerTheta = Math.PI / 2;
    const ro1: Vector3 = { x: cx + outerR * cos1, y: cy, z: cz + outerR * sin1 };
    const ro2: Vector3 = { x: cx + outerR * cos2, y: cy, z: cz + outerR * sin2 };
    const ri1: Vector3 = { x: cx + innerR * cos1, y: cy, z: cz + innerR * sin1 };
    const ri2: Vector3 = { x: cx + innerR * cos2, y: cy, z: cz + innerR * sin2 };
    
    addTriangle(triangles, ro1, ri2, ri1);
    addTriangle(triangles, ro1, ro2, ri2);
  }
}

// Generate magnetic mount base with proper through-hole and magnet pocket
function generateMagneticBase(triangles: Triangle[],
  cx: number, cy: number, cz: number,
  baseRadius: number, baseHeight: number,
  magnetRadius: number, magnetDepth: number,
  wireHoleRadius: number = 2.5, // Through hole for wires
  segments: number = 24): void {
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    // Side walls (outer cylinder)
    const pb1: Vector3 = { x: cx + cos1 * baseRadius, y: cy, z: cz + sin1 * baseRadius };
    const pb2: Vector3 = { x: cx + cos2 * baseRadius, y: cy, z: cz + sin2 * baseRadius };
    const pt1: Vector3 = { x: cx + cos1 * baseRadius, y: cy + baseHeight, z: cz + sin1 * baseRadius };
    const pt2: Vector3 = { x: cx + cos2 * baseRadius, y: cy + baseHeight, z: cz + sin2 * baseRadius };
    
    addTriangle(triangles, pb1, pt1, pt2);
    addTriangle(triangles, pb1, pt2, pb2);
    
    // WIRE THROUGH-HOLE: Inner wall running through entire base
    const wh1b: Vector3 = { x: cx + cos1 * wireHoleRadius, y: cy, z: cz + sin1 * wireHoleRadius };
    const wh2b: Vector3 = { x: cx + cos2 * wireHoleRadius, y: cy, z: cz + sin2 * wireHoleRadius };
    const wh1t: Vector3 = { x: cx + cos1 * wireHoleRadius, y: cy + baseHeight, z: cz + sin1 * wireHoleRadius };
    const wh2t: Vector3 = { x: cx + cos2 * wireHoleRadius, y: cy + baseHeight, z: cz + sin2 * wireHoleRadius };
    
    // Inner wall of wire hole (faces inward)
    addTriangle(triangles, wh1b, wh2t, wh1t);
    addTriangle(triangles, wh1b, wh2b, wh2t);
    
    // Top face (with wire hole in center)
    // Connect outer edge to wire hole edge
    addTriangle(triangles, pt1, wh2t, wh1t);
    addTriangle(triangles, pt1, pt2, wh2t);
    
    // Bottom face with wire through-hole (annular ring)
    addTriangle(triangles, pb1, wh1b, wh2b);
    addTriangle(triangles, pb1, wh2b, pb2);
  }
  
  // MAGNET POCKET: Cylindrical pocket on the side for gluing magnet
  if (magnetRadius > 0 && magnetDepth > 0) {
    const magnetPocketSegs = 16;
    const pocketOffsetX = baseRadius * 0.6; // Position pocket off-center
    const pocketY = cy + baseHeight / 2; // Center vertically
    
    for (let i = 0; i < magnetPocketSegs; i++) {
      const angle1 = (i / magnetPocketSegs) * Math.PI * 2;
      const angle2 = ((i + 1) / magnetPocketSegs) * Math.PI * 2;
      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2);
      const sin2 = Math.sin(angle2);
      
      // Pocket opens from the BOTTOM of the base (for easy magnet insertion)
      const pocketTop = cy + 1; // Leave 1mm floor
      const pocketBot = cy; // Opens at bottom
      
      // Pocket wall (cylindrical hole)
      const pw1t: Vector3 = { x: pocketOffsetX + cos1 * magnetRadius, y: pocketTop, z: cz + sin1 * magnetRadius };
      const pw2t: Vector3 = { x: pocketOffsetX + cos2 * magnetRadius, y: pocketTop, z: cz + sin2 * magnetRadius };
      const pw1b: Vector3 = { x: pocketOffsetX + cos1 * magnetRadius, y: pocketBot, z: cz + sin1 * magnetRadius };
      const pw2b: Vector3 = { x: pocketOffsetX + cos2 * magnetRadius, y: pocketBot, z: cz + sin2 * magnetRadius };
      
      // Inner wall of pocket (faces inward)
      addTriangle(triangles, pw1b, pw1t, pw2t);
      addTriangle(triangles, pw1b, pw2t, pw2b);
      
      // Pocket ceiling (top of pocket)
      const pocketCenter: Vector3 = { x: pocketOffsetX, y: pocketTop, z: cz };
      addTriangle(triangles, pocketCenter, pw2t, pw1t);
    }
  }
}

// Generate wire channel tube
function generateWireChannel(triangles: Triangle[],
  cx: number, cy: number, cz: number,
  channelRadius: number, channelLength: number,
  wallThickness: number, segments: number = 16): void {
  
  const innerR = channelRadius;
  const outerR = channelRadius + wallThickness;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    // Outer wall
    const ob1: Vector3 = { x: cx + cos1 * outerR, y: cy, z: cz + sin1 * outerR };
    const ob2: Vector3 = { x: cx + cos2 * outerR, y: cy, z: cz + sin2 * outerR };
    const ot1: Vector3 = { x: cx + cos1 * outerR, y: cy + channelLength, z: cz + sin1 * outerR };
    const ot2: Vector3 = { x: cx + cos2 * outerR, y: cy + channelLength, z: cz + sin2 * outerR };
    
    addTriangle(triangles, ob1, ot1, ot2);
    addTriangle(triangles, ob1, ot2, ob2);
    
    // Inner wall (hollow channel)
    const ib1: Vector3 = { x: cx + cos1 * innerR, y: cy, z: cz + sin1 * innerR };
    const ib2: Vector3 = { x: cx + cos2 * innerR, y: cy, z: cz + sin2 * innerR };
    const it1: Vector3 = { x: cx + cos1 * innerR, y: cy + channelLength, z: cz + sin1 * innerR };
    const it2: Vector3 = { x: cx + cos2 * innerR, y: cy + channelLength, z: cz + sin2 * innerR };
    
    addTriangle(triangles, ib1, it2, it1);
    addTriangle(triangles, ib1, ib2, it2);
    
    // Bottom ring
    addTriangle(triangles, ob1, ib2, ib1);
    addTriangle(triangles, ob1, ob2, ib2);
    
    // Top ring
    addTriangle(triangles, ot1, it1, it2);
    addTriangle(triangles, ot1, it2, ot2);
  }
}

// Complete LED holder with reflector, socket, and diffuser
function generateCompleteLEDHolder(triangles: Triangle[], settings: LEDHolderSettings): void {
  const led = getLEDDimensions(settings.ledType);
  const ledR = led.diameter / 2;
  const segments = 32;
  
  const reflectorDepth = settings.reflectorDepth || 12;
  const beamAngle = settings.beamAngle || 45;
  const hasDiffuser = settings.hasDiffuser !== false;
  
  // Start from base
  const baseRadius = Math.max(10, ledR + settings.wallThickness + 5);
  const baseHeight = 5;
  
  // 1. Magnetic base at bottom with through-hole for wires
  const wireHoleR = settings.wireChannelDiameter / 2 + 0.5; // Slightly larger than wire channel
  generateMagneticBase(triangles, 0, 0, 0, baseRadius, baseHeight,
    settings.magnetDiameter / 2, settings.magnetDepth, wireHoleR, segments);
  
  // 2. Wire channel from base to reflector
  const channelR = settings.wireChannelDiameter / 2;
  const channelLength = settings.adjustableHeight ? (settings.maxHeight || 30) : 15;
  generateWireChannel(triangles, 0, baseHeight, 0, channelR, channelLength, settings.wallThickness, 16);
  
  // 3. LED socket at top of wire channel
  const socketY = baseHeight + channelLength;
  generateLEDSocket(triangles, 0, socketY, 0, ledR, led.depth, settings.wallThickness, segments);
  
  // 4. Parabolic reflector cone (directs light forward)
  generateParabolicReflector(triangles, 0, socketY, 0, ledR, reflectorDepth, beamAngle, settings.wallThickness, segments);
  
  // 5. Diffuser dome (spreads light evenly) - optional
  if (hasDiffuser) {
    const beamRad = (beamAngle * Math.PI) / 180;
    const openingR = ledR + reflectorDepth * Math.tan(beamRad / 2);
    const diffuserY = socketY + reflectorDepth;
    generateDiffuserDome(triangles, 0, diffuserY, 0, openingR, openingR * 0.6, 1.5, segments);
  }
}

// Canvas clip version with tilt angle
function generateTiltedLEDHolder(triangles: Triangle[], settings: LEDHolderSettings): void {
  const led = getLEDDimensions(settings.ledType);
  const ledR = led.diameter / 2;
  const segments = 32;
  const tiltRad = (settings.tiltAngle * Math.PI) / 180;
  
  const reflectorDepth = settings.reflectorDepth || 12;
  const beamAngle = settings.beamAngle || 45;
  
  // Base plate for mounting
  const plateW = 24;
  const plateH = 18;
  const plateD = 6;
  
  // Generate base plate
  const vertices = [
    { x: -plateW/2, y: 0, z: 0 },
    { x: plateW/2, y: 0, z: 0 },
    { x: plateW/2, y: 0, z: plateH },
    { x: -plateW/2, y: 0, z: plateH },
    { x: -plateW/2, y: plateD, z: 0 },
    { x: plateW/2, y: plateD, z: 0 },
    { x: plateW/2, y: plateD, z: plateH },
    { x: -plateW/2, y: plateD, z: plateH },
  ];
  
  // Bottom
  addTriangle(triangles, vertices[0], vertices[2], vertices[1]);
  addTriangle(triangles, vertices[0], vertices[3], vertices[2]);
  // Top
  addTriangle(triangles, vertices[4], vertices[5], vertices[6]);
  addTriangle(triangles, vertices[4], vertices[6], vertices[7]);
  // Front
  addTriangle(triangles, vertices[0], vertices[1], vertices[5]);
  addTriangle(triangles, vertices[0], vertices[5], vertices[4]);
  // Back
  addTriangle(triangles, vertices[2], vertices[3], vertices[7]);
  addTriangle(triangles, vertices[2], vertices[7], vertices[6]);
  // Left
  addTriangle(triangles, vertices[0], vertices[4], vertices[7]);
  addTriangle(triangles, vertices[0], vertices[7], vertices[3]);
  // Right
  addTriangle(triangles, vertices[1], vertices[2], vertices[6]);
  addTriangle(triangles, vertices[1], vertices[6], vertices[5]);
  
  // Magnet pocket on bottom
  const magnetR = settings.magnetDiameter / 2;
  for (let i = 0; i < 24; i++) {
    const angle1 = (i / 24) * Math.PI * 2;
    const angle2 = ((i + 1) / 24) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    const cx = 0;
    const cz = plateH / 2;
    
    // Pocket walls
    const pt1: Vector3 = { x: cx + cos1 * magnetR, y: 0, z: cz + sin1 * magnetR };
    const pt2: Vector3 = { x: cx + cos2 * magnetR, y: 0, z: cz + sin2 * magnetR };
    const pb1: Vector3 = { x: cx + cos1 * magnetR, y: -settings.magnetDepth, z: cz + sin1 * magnetR };
    const pb2: Vector3 = { x: cx + cos2 * magnetR, y: -settings.magnetDepth, z: cz + sin2 * magnetR };
    
    addTriangle(triangles, pt1, pb1, pb2);
    addTriangle(triangles, pt1, pb2, pt2);
    
    // Pocket bottom
    const center: Vector3 = { x: cx, y: -settings.magnetDepth, z: cz };
    addTriangle(triangles, center, pb2, pb1);
  }
  
  // Now add the tilted reflector on top
  // Transform all reflector points by tilt angle
  const reflectorCX = 0;
  const reflectorCY = plateD;
  const reflectorCZ = plateH / 2;
  
  const beamRad = (beamAngle * Math.PI) / 180;
  const openingRadius = ledR + reflectorDepth * Math.tan(beamRad / 2);
  
  // Generate tilted parabolic reflector
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    const curveSteps = 10;
    for (let j = 0; j < curveSteps; j++) {
      const t1 = j / curveSteps;
      const t2 = (j + 1) / curveSteps;
      
      const innerBackR = ledR + 0.5;
      const innerOpeningR = openingRadius;
      const r1 = innerBackR + (innerOpeningR - innerBackR) * Math.pow(t1, 0.7);
      const r2 = innerBackR + (innerOpeningR - innerBackR) * Math.pow(t2, 0.7);
      
      // Local coordinates along reflector axis
      const d1 = t1 * reflectorDepth;
      const d2 = t2 * reflectorDepth;
      
      // Apply tilt rotation around X axis
      const transformPoint = (localR: number, localD: number, phi: number): Vector3 => {
        const localX = localR * Math.cos(phi);
        const localY = localD;
        const localZ = localR * Math.sin(phi);
        
        // Rotate around X by tiltRad
        const rotY = localY * Math.cos(tiltRad) - localZ * Math.sin(tiltRad);
        const rotZ = localY * Math.sin(tiltRad) + localZ * Math.cos(tiltRad);
        
        return {
          x: reflectorCX + localX,
          y: reflectorCY + rotY,
          z: reflectorCZ + rotZ
        };
      };
      
      const p1 = transformPoint(r1, d1, angle1);
      const p2 = transformPoint(r1, d1, angle2);
      const p3 = transformPoint(r2, d2, angle2);
      const p4 = transformPoint(r2, d2, angle1);
      
      addTriangle(triangles, p1, p3, p2);
      addTriangle(triangles, p1, p4, p3);
      
      // Outer surface
      const outerR1 = r1 + settings.wallThickness;
      const outerR2 = r2 + settings.wallThickness;
      
      const po1 = transformPoint(outerR1, d1, angle1);
      const po2 = transformPoint(outerR1, d1, angle2);
      const po3 = transformPoint(outerR2, d2, angle2);
      const po4 = transformPoint(outerR2, d2, angle1);
      
      addTriangle(triangles, po1, po2, po3);
      addTriangle(triangles, po1, po3, po4);
    }
  }
  
  // Back plate for second magnet (to clamp canvas frame)
  const backX = 35;
  const backVertices = [
    { x: backX - plateW/2, y: 0, z: 0 },
    { x: backX + plateW/2, y: 0, z: 0 },
    { x: backX + plateW/2, y: 0, z: plateH },
    { x: backX - plateW/2, y: 0, z: plateH },
    { x: backX - plateW/2, y: plateD, z: 0 },
    { x: backX + plateW/2, y: plateD, z: 0 },
    { x: backX + plateW/2, y: plateD, z: plateH },
    { x: backX - plateW/2, y: plateD, z: plateH },
  ];
  
  addTriangle(triangles, backVertices[0], backVertices[2], backVertices[1]);
  addTriangle(triangles, backVertices[0], backVertices[3], backVertices[2]);
  addTriangle(triangles, backVertices[4], backVertices[5], backVertices[6]);
  addTriangle(triangles, backVertices[4], backVertices[6], backVertices[7]);
  addTriangle(triangles, backVertices[0], backVertices[1], backVertices[5]);
  addTriangle(triangles, backVertices[0], backVertices[5], backVertices[4]);
  addTriangle(triangles, backVertices[2], backVertices[3], backVertices[7]);
  addTriangle(triangles, backVertices[2], backVertices[7], backVertices[6]);
  addTriangle(triangles, backVertices[0], backVertices[4], backVertices[7]);
  addTriangle(triangles, backVertices[0], backVertices[7], backVertices[3]);
  addTriangle(triangles, backVertices[1], backVertices[2], backVertices[6]);
  addTriangle(triangles, backVertices[1], backVertices[6], backVertices[5]);
  
  // Back magnet pocket (on top face)
  for (let i = 0; i < 24; i++) {
    const angle1 = (i / 24) * Math.PI * 2;
    const angle2 = ((i + 1) / 24) * Math.PI * 2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    const cx = backX;
    const cz = plateH / 2;
    
    const pt1: Vector3 = { x: cx + cos1 * magnetR, y: plateD, z: cz + sin1 * magnetR };
    const pt2: Vector3 = { x: cx + cos2 * magnetR, y: plateD, z: cz + sin2 * magnetR };
    const pb1: Vector3 = { x: cx + cos1 * magnetR, y: plateD - settings.magnetDepth, z: cz + sin1 * magnetR };
    const pb2: Vector3 = { x: cx + cos2 * magnetR, y: plateD - settings.magnetDepth, z: cz + sin2 * magnetR };
    
    addTriangle(triangles, pt1, pt2, pb2);
    addTriangle(triangles, pt1, pb2, pb1);
    
    const center: Vector3 = { x: cx, y: plateD - settings.magnetDepth, z: cz };
    addTriangle(triangles, center, pb1, pb2);
  }
}

// Canvas Glow-Clip v3 - Lampshade cone design based on user's reference images
// Features: Conical diffuser pointing outward/downward, wire channel going up, magnetic mount
function generateCanvasGlowClip(triangles: Triangle[], settings: LEDHolderSettings): void {
  // Exact dimensions from OpenSCAD reference
  const magnetDiameter = 8.2;
  const magnetDepth = 3.2;
  const ledDiameter = 5.2;
  
  // Base plate dimensions
  const mountW = 20;  // Width (X)
  const mountD = 20;  // Depth (Y) - made square like reference image
  const mountH = 5;   // Height/thickness (Z)
  
  // Diffuser cone dimensions
  const coneTopRadius = 5;   // LED end (small, at top)
  const coneBottomRadius = settings.diffuserWidth / 2 || 20;  // Wide end (bottom)
  const coneHeight = 25;     // Height of cone
  const wallThickness = 1.5; // Cone wall thickness
  
  // Wire channel dimensions
  const wireChannelRadius = 3;
  const wireChannelHeight = 15; // Goes up from LED
  
  const segments = 32;
  
  // Position: Base plate sits on Z=0, cone sits on top
  const basePlateZ = 0;
  const coneBaseZ = mountH; // Cone starts at top of base plate
  
  // ========== 1. BASE PLATE (square block with magnet pocket) ==========
  const generateBasePlate = (offsetX: number, withMagnetOnTop: boolean) => {
    const x0 = offsetX - mountW / 2;
    const x1 = offsetX + mountW / 2;
    const y0 = -mountD / 2;
    const y1 = mountD / 2;
    const z0 = basePlateZ;
    const z1 = basePlateZ + mountH;
    
    const v = [
      { x: x0, y: y0, z: z0 }, // 0: bottom-back-left
      { x: x1, y: y0, z: z0 }, // 1: bottom-back-right
      { x: x1, y: y1, z: z0 }, // 2: bottom-front-right
      { x: x0, y: y1, z: z0 }, // 3: bottom-front-left
      { x: x0, y: y0, z: z1 }, // 4: top-back-left
      { x: x1, y: y0, z: z1 }, // 5: top-back-right
      { x: x1, y: y1, z: z1 }, // 6: top-front-right
      { x: x0, y: y1, z: z1 }, // 7: top-front-left
    ];
    
    // Bottom face (Z=0)
    addTriangle(triangles, v[0], v[2], v[1]);
    addTriangle(triangles, v[0], v[3], v[2]);
    
    // Top face (Z=mountH) - solid
    addTriangle(triangles, v[4], v[5], v[6]);
    addTriangle(triangles, v[4], v[6], v[7]);
    
    // Front face (Y=mountD/2)
    addTriangle(triangles, v[2], v[3], v[7]);
    addTriangle(triangles, v[2], v[7], v[6]);
    
    // Back face (Y=-mountD/2)
    addTriangle(triangles, v[0], v[1], v[5]);
    addTriangle(triangles, v[0], v[5], v[4]);
    
    // Left face (X=x0)
    addTriangle(triangles, v[0], v[4], v[7]);
    addTriangle(triangles, v[0], v[7], v[3]);
    
    // Right face (X=x1)
    addTriangle(triangles, v[1], v[2], v[6]);
    addTriangle(triangles, v[1], v[6], v[5]);
    
    // Magnet pocket - cylindrical hole
    const magnetR = magnetDiameter / 2;
    const cx = offsetX;
    const cy = 0;
    const pocketTopZ = withMagnetOnTop ? z1 : z0;
    const pocketBottomZ = withMagnetOnTop ? z1 - magnetDepth : z0 + magnetDepth;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      const p1t: Vector3 = { x: cx + Math.cos(a1) * magnetR, y: cy + Math.sin(a1) * magnetR, z: pocketTopZ };
      const p2t: Vector3 = { x: cx + Math.cos(a2) * magnetR, y: cy + Math.sin(a2) * magnetR, z: pocketTopZ };
      const p1b: Vector3 = { x: cx + Math.cos(a1) * magnetR, y: cy + Math.sin(a1) * magnetR, z: pocketBottomZ };
      const p2b: Vector3 = { x: cx + Math.cos(a2) * magnetR, y: cy + Math.sin(a2) * magnetR, z: pocketBottomZ };
      
      // Pocket walls
      if (withMagnetOnTop) {
        addTriangle(triangles, p1t, p1b, p2b);
        addTriangle(triangles, p1t, p2b, p2t);
      } else {
        addTriangle(triangles, p1t, p2b, p1b);
        addTriangle(triangles, p1t, p2t, p2b);
      }
      
      // Pocket bottom
      const center: Vector3 = { x: cx, y: cy, z: pocketBottomZ };
      if (withMagnetOnTop) {
        addTriangle(triangles, center, p2b, p1b);
      } else {
        addTriangle(triangles, center, p1b, p2b);
      }
    }
  };
  
  // ========== 2. GENERATE FRONT HOUSING ==========
  // Front housing has base plate + cone diffuser + wire channel
  generateBasePlate(0, false); // magnet on bottom
  
  // ========== 3. CONICAL DIFFUSER (lampshade shape) ==========
  // Cone sits on top of base plate, narrow end at base, wide end at top
  // Wire channel goes up through the center
  const coneBaseZ2 = coneBaseZ; // Bottom of cone (narrow end, at base plate)
  const coneTopZ2 = coneBaseZ + coneHeight; // Top of cone (wide end)
  
  // Inner radii (hollow cone) - ensure positive values
  const innerNarrowR = Math.max(1, coneTopRadius - wallThickness); // Inner at narrow/bottom
  const innerWideR = Math.max(1, coneBottomRadius - wallThickness); // Inner at wide/top
  
  // Outer cone surface (narrow bottom to wide top)
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    
    // Bottom ring (narrow, at base plate top)
    const ob1: Vector3 = { x: coneTopRadius * Math.cos(a1), y: coneTopRadius * Math.sin(a1), z: coneBaseZ2 };
    const ob2: Vector3 = { x: coneTopRadius * Math.cos(a2), y: coneTopRadius * Math.sin(a2), z: coneBaseZ2 };
    
    // Top ring (wide, at cone top)
    const ot1: Vector3 = { x: coneBottomRadius * Math.cos(a1), y: coneBottomRadius * Math.sin(a1), z: coneTopZ2 };
    const ot2: Vector3 = { x: coneBottomRadius * Math.cos(a2), y: coneBottomRadius * Math.sin(a2), z: coneTopZ2 };
    
    // Outer surface (facing outward)
    addTriangle(triangles, ob1, ot1, ot2);
    addTriangle(triangles, ob1, ot2, ob2);
    
    // Inner surface (facing inward - hollow cone)
    const ib1: Vector3 = { x: innerNarrowR * Math.cos(a1), y: innerNarrowR * Math.sin(a1), z: coneBaseZ2 };
    const ib2: Vector3 = { x: innerNarrowR * Math.cos(a2), y: innerNarrowR * Math.sin(a2), z: coneBaseZ2 };
    const it1: Vector3 = { x: innerWideR * Math.cos(a1), y: innerWideR * Math.sin(a1), z: coneTopZ2 };
    const it2: Vector3 = { x: innerWideR * Math.cos(a2), y: innerWideR * Math.sin(a2), z: coneTopZ2 };
    
    // Inner surface triangles (reversed winding for inward-facing normals)
    addTriangle(triangles, ib1, it2, it1);
    addTriangle(triangles, ib1, ib2, it2);
    
    // Top rim (connect outer to inner at wide end)
    addTriangle(triangles, ot1, it1, it2);
    addTriangle(triangles, ot1, it2, ot2);
    
    // Bottom rim (connect outer to inner at narrow end)
    addTriangle(triangles, ob1, ob2, ib2);
    addTriangle(triangles, ob1, ib2, ib1);
  }
  
  // ========== 4. WIRE CHANNEL (cylinder going UP from cone top) ==========
  const wcBaseZ = coneTopZ2;
  const wcTopZ = coneTopZ2 + wireChannelHeight;
  const wcR = wireChannelRadius;
  const wcInnerR = wcR - wallThickness;
  
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    
    // Outer cylinder
    const wob1: Vector3 = { x: wcR * Math.cos(a1), y: wcR * Math.sin(a1), z: wcBaseZ };
    const wob2: Vector3 = { x: wcR * Math.cos(a2), y: wcR * Math.sin(a2), z: wcBaseZ };
    const wot1: Vector3 = { x: wcR * Math.cos(a1), y: wcR * Math.sin(a1), z: wcTopZ };
    const wot2: Vector3 = { x: wcR * Math.cos(a2), y: wcR * Math.sin(a2), z: wcTopZ };
    
    addTriangle(triangles, wob1, wot1, wot2);
    addTriangle(triangles, wob1, wot2, wob2);
    
    // Inner cylinder (hollow)
    const wib1: Vector3 = { x: wcInnerR * Math.cos(a1), y: wcInnerR * Math.sin(a1), z: wcBaseZ };
    const wib2: Vector3 = { x: wcInnerR * Math.cos(a2), y: wcInnerR * Math.sin(a2), z: wcBaseZ };
    const wit1: Vector3 = { x: wcInnerR * Math.cos(a1), y: wcInnerR * Math.sin(a1), z: wcTopZ };
    const wit2: Vector3 = { x: wcInnerR * Math.cos(a2), y: wcInnerR * Math.sin(a2), z: wcTopZ };
    
    addTriangle(triangles, wib1, wit2, wit1);
    addTriangle(triangles, wib1, wib2, wit2);
    
    // Top cap (connect outer to inner)
    addTriangle(triangles, wot1, wit1, wit2);
    addTriangle(triangles, wot1, wit2, wot2);
  }
  
  // ========== 5. BACK PLATE (separate piece) ==========
  const backX = 35; // Offset to side for printing
  generateBasePlate(backX, true); // magnet on top
}

export function generateLEDHolder(settings: LEDHolderSettings): Buffer {
  const triangles: Triangle[] = [];

  if (settings.holderStyle === "canvas_glow_clip") {
    generateCanvasGlowClip(triangles, settings);
  } else if (settings.adjustableHeight) {
    generateCompleteLEDHolder(triangles, settings);
  } else {
    generateTiltedLEDHolder(triangles, settings);
  }

  return trianglesToBinarySTL(triangles);
}
