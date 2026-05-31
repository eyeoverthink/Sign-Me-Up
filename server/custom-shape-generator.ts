// Custom Shape Generator - Creates split-half LED channels with tongue-and-groove assembly
// Design: Two halves with interlocking edges for alignment during LED insertion
// Supports modular end connectors for chaining segments
// Compatible with WS2812/addressable LEDs, simple strips, COB, and filament lights

import type { CustomShapeSettings, SketchPath } from "@shared/schema";
import opentype from "opentype.js";
import path from "path";
import fs from "fs";

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Vector2 {
  x: number;
  y: number;
}

interface Triangle {
  normal: Vector3;
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

export interface CustomShapePart {
  filename: string;
  content: Buffer;
  partType: string;
  material: string;
}

// Font file mapping - synced with routes.ts fontFileMap
const fontFileMap: Record<string, string> = {
  "aerioz": "Aerioz-Demo.otf",
  "airstream": "Airstream-24Ov.ttf",
  "airstream-nf": "AirstreamNf-pRwZ.ttf",
  "alliston": "AllistionDemo-8OwnM.ttf",
  "cookiemonster": "Cookiemonster-gv11.ttf",
  "darlington": "DarlingtonDemo-z8xjG.ttf",
  "electronica": "Electronica-On53.ttf",
  "halimun": "Halimun-W7jn.ttf",
  "neoncity": "NeoncityScript-K77Je.otf",
  "inter": "Inter-Bold.ttf",
  "roboto": "Roboto-Bold.ttf",
  "poppins": "Poppins-Bold.ttf",
  "montserrat": "Montserrat-Bold.ttf",
  "open-sans": "OpenSans-Bold.ttf",
  "playfair": "PlayfairDisplay-Bold.ttf",
  "merriweather": "Merriweather-Bold.ttf",
  "lora": "Lora-Bold.ttf",
  "space-grotesk": "SpaceGrotesk-Bold.ttf",
  "outfit": "Outfit-Bold.ttf",
  "architects-daughter": "ArchitectsDaughter-Regular.ttf",
  "oxanium": "Oxanium-Bold.ttf",
};

function loadFont(fontId: string): opentype.Font {
  const fontFilename = fontFileMap[fontId];
  
  // Check server/fonts first (where user-uploaded fonts are), then public/fonts
  const serverFontsDir = path.join(process.cwd(), "server", "fonts");
  const publicFontsDir = path.join(process.cwd(), "public", "fonts");
  
  if (fontFilename) {
    const serverPath = path.join(serverFontsDir, fontFilename);
    if (fs.existsSync(serverPath)) {
      return opentype.loadSync(serverPath);
    }
    
    const publicPath = path.join(publicFontsDir, fontFilename);
    if (fs.existsSync(publicPath)) {
      return opentype.loadSync(publicPath);
    }
  }
  
  // Fallback to Aerioz in public fonts
  console.log(`[CustomShape] Font not found: ${fontId}, using fallback`);
  const fallbackPath = path.join(publicFontsDir, "Aerioz-Demo.otf");
  return opentype.loadSync(fallbackPath);
}

function calcNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const ax = v2.x - v1.x, ay = v2.y - v1.y, az = v2.z - v1.z;
  const bx = v3.x - v1.x, by = v3.y - v1.y, bz = v3.z - v1.z;
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 0.0001) return { x: 0, y: 0, z: 1 };
  return { x: nx / len, y: ny / len, z: nz / len };
}

function addTriangle(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3) {
  triangles.push({ normal: calcNormal(v1, v2, v3), v1, v2, v3 });
}

// Generate a circular cross-section ring at a point along the path
// The ring lies in a plane perpendicular to the path tangent
// zCenter is the center height of the ring (not the bottom)
function generateCircularRing(
  center: Vector2,
  tangentX: number,
  tangentY: number,
  radius: number,
  segments: number,
  zCenter: number
): Vector3[] {
  const ring: Vector3[] = [];
  
  // Calculate perpendicular vectors for the ring plane
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  if (tangentLen < 0.0001) {
    // Default to XY plane if no tangent
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      ring.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        z: zCenter,
      });
    }
    return ring;
  }
  
  // Normalized tangent (direction along the path in XY plane)
  const tx = tangentX / tangentLen;
  const ty = tangentY / tangentLen;
  
  // Perpendicular in XY plane (horizontal offset direction)
  const px = -ty;
  const py = tx;
  
  // Generate ring points using two orthogonal directions:
  // 1. Perpendicular in XY plane (px, py, 0)
  // 2. Vertical Z axis (0, 0, 1)
  // This ensures inner and outer rings share the same center
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    ring.push({
      x: center.x + px * radius * cos,
      y: center.y + py * radius * cos,
      z: zCenter + radius * sin,
    });
  }
  
  return ring;
}

// Calculate smoothed tangent at a point using adjacent points
function getSmoothedTangent(points: Vector2[], idx: number, isClosed: boolean): Vector2 {
  const n = points.length;
  
  let prev: Vector2, next: Vector2;
  
  if (isClosed) {
    prev = points[(idx - 1 + n) % n];
    next = points[(idx + 1) % n];
  } else {
    prev = idx > 0 ? points[idx - 1] : points[idx];
    next = idx < n - 1 ? points[idx + 1] : points[idx];
  }
  
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len < 0.0001) {
    return { x: 1, y: 0 };
  }
  
  return { x: dx / len, y: dy / len };
}

// Check if contour is closed
function isContourClosed(contour: number[]): boolean {
  const n = contour.length / 2;
  if (n < 3) return false;
  
  const x0 = contour[0];
  const y0 = contour[1];
  const xN = contour[(n - 1) * 2];
  const yN = contour[(n - 1) * 2 + 1];
  
  const dist = Math.sqrt((xN - x0) ** 2 + (yN - y0) ** 2);
  return dist < 1.0;
}

// Convert flat contour array to point array
function contourToPoints(contour: number[]): Vector2[] {
  const points: Vector2[] = [];
  for (let i = 0; i < contour.length; i += 2) {
    points.push({ x: contour[i], y: contour[i + 1] });
  }
  return points;
}

// Connect two circular rings with quads
function connectRings(triangles: Triangle[], ring0: Vector3[], ring1: Vector3[]) {
  const segments = ring0.length;
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    const a = ring0[i];
    const b = ring0[next];
    const c = ring1[next];
    const d = ring1[i];
    
    // Two triangles per quad
    addTriangle(triangles, a, b, c);
    addTriangle(triangles, a, c, d);
  }
}

// Cap the end of a tube with triangles (like a dome or flat cap)
function capTube(triangles: Triangle[], ring: Vector3[], center: Vector3, inward: boolean) {
  const segments = ring.length;
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    if (inward) {
      addTriangle(triangles, center, ring[next], ring[i]);
    } else {
      addTriangle(triangles, center, ring[i], ring[next]);
    }
  }
}

// Generate a half-arc cross-section (for split-half design)
// isTop: true for top half (angles 0 to PI), false for bottom half (PI to 2PI)
function generateHalfArcRing(
  center: Vector2,
  tangentX: number,
  tangentY: number,
  outerRadius: number,
  innerRadius: number,
  segments: number,
  zCenter: number,
  isTop: boolean,
  snapLipHeight: number = 0.8,
  snapLipWidth: number = 0.6
): { outer: Vector3[], inner: Vector3[], lipOuter: Vector3[], lipInner: Vector3[] } {
  const outer: Vector3[] = [];
  const inner: Vector3[] = [];
  const lipOuter: Vector3[] = [];
  const lipInner: Vector3[] = [];
  
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  const tx = tangentLen > 0.0001 ? tangentX / tangentLen : 1;
  const ty = tangentLen > 0.0001 ? tangentY / tangentLen : 0;
  const px = -ty;
  const py = tx;
  
  // Half-arc: top half is 0 to PI, bottom half is PI to 2PI
  const startAngle = isTop ? 0 : Math.PI;
  const endAngle = isTop ? Math.PI : Math.PI * 2;
  
  // Generate arc points (one extra for the endpoints)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Outer arc
    outer.push({
      x: center.x + px * outerRadius * cos,
      y: center.y + py * outerRadius * cos,
      z: zCenter + outerRadius * sin,
    });
    
    // Inner arc
    inner.push({
      x: center.x + px * innerRadius * cos,
      y: center.y + py * innerRadius * cos,
      z: zCenter + innerRadius * sin,
    });
  }
  
  // Generate snap-fit lip points at the split line (where the two halves meet)
  // Top half: lip extends down, Bottom half: lip extends up with groove
  const lipZ = isTop ? zCenter - snapLipHeight : zCenter + snapLipHeight;
  const lipOffset = isTop ? snapLipWidth : -snapLipWidth;
  
  // Start edge lip
  lipOuter.push({
    x: center.x + px * (outerRadius + lipOffset),
    y: center.y + py * (outerRadius + lipOffset),
    z: zCenter,
  });
  lipOuter.push({
    x: center.x + px * (outerRadius + lipOffset),
    y: center.y + py * (outerRadius + lipOffset),
    z: lipZ,
  });
  
  // End edge lip
  lipInner.push({
    x: center.x - px * (outerRadius + lipOffset),
    y: center.y - py * (outerRadius + lipOffset),
    z: zCenter,
  });
  lipInner.push({
    x: center.x - px * (outerRadius + lipOffset),
    y: center.y - py * (outerRadius + lipOffset),
    z: lipZ,
  });
  
  return { outer, inner, lipOuter, lipInner };
}

// Generate one half of a split channel along a path with snap-fit lips
function generateSplitHalf(
  contour: number[],
  channelWidth: number,
  channelDepth: number,
  wallThickness: number,
  isTop: boolean,
  snapTolerance: number,
  segments: number = 8
): Triangle[] {
  const triangles: Triangle[] = [];
  const points = contourToPoints(contour);
  const n = points.length;
  
  if (n < 2) return triangles;
  
  const isClosed = isContourClosed(contour);
  
  // Calculate radii from channel dimensions
  const halfDepth = channelDepth / 2;
  const outerRadius = halfDepth + wallThickness;
  const innerRadius = halfDepth;
  
  // Snap-fit lip dimensions
  // Top half has a ridge that extends down, bottom half has a groove
  const lipHeight = 1.0;  // How far the lip extends
  const lipWidth = 0.6;   // Width of the lip
  const tolerance = isTop ? 0 : snapTolerance;
  
  // Center height so bottom of outer sits at Z=0
  const zCenter = outerRadius;
  
  // Generate cross-section data at each point
  interface CrossSection {
    outer: Vector3[];
    inner: Vector3[];
    // Snap-fit lip points at the split line (Z = zCenter)
    lipLeftOuter: Vector3;  // Outer edge of lip on left side
    lipLeftInner: Vector3;  // Inner edge of lip on left side
    lipRightOuter: Vector3; // Outer edge of lip on right side
    lipRightInner: Vector3; // Inner edge of lip on right side
    // Path point and perpendicular direction
    pathPt?: Vector2;
    perpX?: number;
    perpY?: number;
  }
  
  const sections: CrossSection[] = [];
  
  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const tangent = getSmoothedTangent(points, i, isClosed);
    
    const tangentLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
    const tx = tangentLen > 0.0001 ? tangent.x / tangentLen : 1;
    const ty = tangentLen > 0.0001 ? tangent.y / tangentLen : 0;
    const px = -ty;  // Perpendicular in XY plane
    const py = tx;
    
    // Calculate lip Z position for snap-fit
    const lipZ = zCenter - lipHeight;
    
    // Generate half-arc for outer and inner surfaces
    // Both halves use the same outer radius to maintain flush exterior profile
    const outer: Vector3[] = [];
    const inner: Vector3[] = [];
    
    const startAngle = isTop ? 0 : Math.PI;
    const endAngle = isTop ? Math.PI : Math.PI * 2;
    
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const angle = startAngle + t * (endAngle - startAngle);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const z = zCenter + outerRadius * sin;
      
      // Both halves use full outerRadius for flush exterior
      outer.push({
        x: pt.x + px * outerRadius * cos,
        y: pt.y + py * outerRadius * cos,
        z: z,
      });
      
      inner.push({
        x: pt.x + px * innerRadius * cos,
        y: pt.y + py * innerRadius * cos,
        z: zCenter + innerRadius * sin,
      });
    }
    
    // TONGUE-AND-GROOVE alignment system
    // Top half has tongue protruding from seam
    // Bottom half has matching groove to receive tongue
    // Provides alignment during assembly - secure with adhesive or clips
    
    const tongueWidth = lipWidth;  // 0.6mm width
    const tongueDepth = lipHeight;  // 1.0mm depth
    const grooveWidth = tongueWidth + snapTolerance;  // 0.8mm with clearance
    
    // Position tongue/groove at the middle of the wall
    const midRadius = (innerRadius + outerRadius) / 2;
    
    let lipLeftOuter: Vector3, lipLeftInner: Vector3;
    let lipRightOuter: Vector3, lipRightInner: Vector3;
    
    if (isTop) {
      // TOP HALF: Tongue extends from wall midpoint downward
      lipLeftOuter = {
        x: pt.x + px * (midRadius + tongueWidth/2),
        y: pt.y + py * (midRadius + tongueWidth/2),
        z: zCenter - tongueDepth,
      };
      lipLeftInner = {
        x: pt.x + px * (midRadius - tongueWidth/2),
        y: pt.y + py * (midRadius - tongueWidth/2),
        z: zCenter - tongueDepth,
      };
      lipRightOuter = {
        x: pt.x - px * (midRadius + tongueWidth/2),
        y: pt.y - py * (midRadius + tongueWidth/2),
        z: zCenter - tongueDepth,
      };
      lipRightInner = {
        x: pt.x - px * (midRadius - tongueWidth/2),
        y: pt.y - py * (midRadius - tongueWidth/2),
        z: zCenter - tongueDepth,
      };
    } else {
      // BOTTOM HALF: Groove opening at seam plane with clearance
      lipLeftOuter = {
        x: pt.x - px * (midRadius + grooveWidth/2),
        y: pt.y - py * (midRadius + grooveWidth/2),
        z: zCenter,
      };
      lipLeftInner = {
        x: pt.x - px * (midRadius - grooveWidth/2),
        y: pt.y - py * (midRadius - grooveWidth/2),
        z: zCenter,
      };
      lipRightOuter = {
        x: pt.x + px * (midRadius + grooveWidth/2),
        y: pt.y + py * (midRadius + grooveWidth/2),
        z: zCenter,
      };
      lipRightInner = {
        x: pt.x + px * (midRadius - grooveWidth/2),
        y: pt.y + py * (midRadius - grooveWidth/2),
        z: zCenter,
      };
    }
    
    // Store path point and perpendicular direction for face generation
    sections.push({ 
      outer, inner, 
      lipLeftOuter, lipLeftInner, lipRightOuter, lipRightInner,
      pathPt: pt,  // Path point
      perpX: px,   // Perpendicular X
      perpY: py    // Perpendicular Y
    });
  }
  
  // Connect adjacent sections
  const endIdx = isClosed ? n : n - 1;
  
  for (let i = 0; i < endIdx; i++) {
    const curr = sections[i];
    const next = sections[(i + 1) % n];
    
    // Outer surface
    connectOpenRings(triangles, curr.outer, next.outer);
    
    // Inner surface (reversed winding)
    connectOpenRings(triangles, next.inner, curr.inner);
    
    // Left edge (where arc starts)
    const o0 = curr.outer[0];
    const o1 = next.outer[0];
    const i0 = curr.inner[0];
    const i1 = next.inner[0];
    
    // Right edge (where arc ends)
    const lastIdx = segments;
    const o0r = curr.outer[lastIdx];
    const o1r = next.outer[lastIdx];
    const i0r = curr.inner[lastIdx];
    const i1r = next.inner[lastIdx];
    
    // Get tongue/groove points
    const ll0o = curr.lipLeftOuter;
    const ll1o = next.lipLeftOuter;
    const ll0i = curr.lipLeftInner;
    const ll1i = next.lipLeftInner;
    const lr0o = curr.lipRightOuter;
    const lr1o = next.lipRightOuter;
    const lr0i = curr.lipRightInner;
    const lr1i = next.lipRightInner;
    
    if (isTop) {
      // TOP HALF: Straight tongue extending from seam
      // Geometry: outer wall -> tongue outer -> tongue bottom -> tongue inner -> inner wall
      
      // LEFT SEAM - Tongue geometry
      // 1. Outer wall to tongue outer
      addTriangle(triangles, o0, ll0o, ll1o);
      addTriangle(triangles, o0, ll1o, o1);
      
      // 2. Tongue bottom face
      addTriangle(triangles, ll0o, ll0i, ll1i);
      addTriangle(triangles, ll0o, ll1i, ll1o);
      
      // 3. Tongue inner to inner wall
      addTriangle(triangles, ll0i, i0, i1);
      addTriangle(triangles, ll0i, i1, ll1i);
      
      // RIGHT SEAM - Same tongue pattern
      addTriangle(triangles, o0r, o1r, lr1o);
      addTriangle(triangles, o0r, lr1o, lr0o);
      
      addTriangle(triangles, lr0o, lr1o, lr1i);
      addTriangle(triangles, lr0o, lr1i, lr0i);
      
      addTriangle(triangles, lr0i, lr1i, i1r);
      addTriangle(triangles, lr0i, i1r, i0r);
    } else {
      // BOTTOM HALF: Straight groove to receive tongue
      // Geometry: outer wall -> groove outer wall -> groove floor -> groove inner wall -> inner wall
      
      const grooveDepth = lipHeight;  // Same depth as tongue extends
      
      // Create groove floor points (straight groove)
      const ll0oFloor: Vector3 = { x: ll0o.x, y: ll0o.y, z: ll0o.z - grooveDepth };
      const ll1oFloor: Vector3 = { x: ll1o.x, y: ll1o.y, z: ll1o.z - grooveDepth };
      const ll0iFloor: Vector3 = { x: ll0i.x, y: ll0i.y, z: ll0i.z - grooveDepth };
      const ll1iFloor: Vector3 = { x: ll1i.x, y: ll1i.y, z: ll1i.z - grooveDepth };
      const lr0oFloor: Vector3 = { x: lr0o.x, y: lr0o.y, z: lr0o.z - grooveDepth };
      const lr1oFloor: Vector3 = { x: lr1o.x, y: lr1o.y, z: lr1o.z - grooveDepth };
      const lr0iFloor: Vector3 = { x: lr0i.x, y: lr0i.y, z: lr0i.z - grooveDepth };
      const lr1iFloor: Vector3 = { x: lr1i.x, y: lr1i.y, z: lr1i.z - grooveDepth };
      
      // LEFT SEAM - Groove geometry
      // 1. Outer wall to groove outer
      addTriangle(triangles, o0, ll0o, ll1o);
      addTriangle(triangles, o0, ll1o, o1);
      
      // 2. Groove outer wall (down)
      addTriangle(triangles, ll0o, ll0oFloor, ll1oFloor);
      addTriangle(triangles, ll0o, ll1oFloor, ll1o);
      
      // 3. Groove floor
      addTriangle(triangles, ll0oFloor, ll0iFloor, ll1iFloor);
      addTriangle(triangles, ll0oFloor, ll1iFloor, ll1oFloor);
      
      // 4. Groove inner wall (up)
      addTriangle(triangles, ll0iFloor, ll0i, ll1i);
      addTriangle(triangles, ll0iFloor, ll1i, ll1iFloor);
      
      // 5. Groove inner to inner wall
      addTriangle(triangles, ll0i, i0, i1);
      addTriangle(triangles, ll0i, i1, ll1i);
      
      // RIGHT SEAM - Same groove pattern
      addTriangle(triangles, o0r, o1r, lr1o);
      addTriangle(triangles, o0r, lr1o, lr0o);
      
      addTriangle(triangles, lr0o, lr1o, lr1oFloor);
      addTriangle(triangles, lr0o, lr1oFloor, lr0oFloor);
      
      addTriangle(triangles, lr0oFloor, lr1oFloor, lr1iFloor);
      addTriangle(triangles, lr0oFloor, lr1iFloor, lr0iFloor);
      
      addTriangle(triangles, lr0iFloor, lr1iFloor, lr1i);
      addTriangle(triangles, lr0iFloor, lr1i, lr0i);
      
      addTriangle(triangles, lr0i, lr1i, i1r);
      addTriangle(triangles, lr0i, i1r, i0r);
    }
  }
  
  // Cap the ends for open paths
  if (!isClosed && n >= 2) {
    capHalfArcWithLip(triangles, sections[0], isTop, true);
    capHalfArcWithLip(triangles, sections[n-1], isTop, false);
  }
  
  return triangles;
}

// Cap a half-arc end including lip geometry
function capHalfArcWithLip(
  triangles: Triangle[], 
  section: { outer: Vector3[], inner: Vector3[], lipLeftOuter: Vector3, lipLeftInner: Vector3, lipRightOuter: Vector3, lipRightInner: Vector3 },
  isTop: boolean,
  isStart: boolean
) {
  const { outer, inner, lipLeftOuter, lipLeftInner, lipRightOuter, lipRightInner } = section;
  const n = outer.length;
  
  // Connect outer to inner arc
  for (let i = 0; i < n - 1; i++) {
    if (isStart) {
      addTriangle(triangles, outer[i], inner[i], inner[i + 1]);
      addTriangle(triangles, outer[i], inner[i + 1], outer[i + 1]);
    } else {
      addTriangle(triangles, outer[i], outer[i + 1], inner[i + 1]);
      addTriangle(triangles, outer[i], inner[i + 1], inner[i]);
    }
  }
  
  // Cap the lip ends
  if (isStart) {
    // Left lip cap
    addTriangle(triangles, outer[0], lipLeftInner, lipLeftOuter);
    // Right lip cap
    addTriangle(triangles, outer[n-1], lipRightOuter, lipRightInner);
  } else {
    // Left lip cap
    addTriangle(triangles, outer[0], lipLeftOuter, lipLeftInner);
    // Right lip cap
    addTriangle(triangles, outer[n-1], lipRightInner, lipRightOuter);
  }
}

// Connect two open arc rings (not closed loops)
function connectOpenRings(triangles: Triangle[], ring0: Vector3[], ring1: Vector3[]) {
  const n = ring0.length - 1; // -1 because arcs have n+1 points
  
  for (let i = 0; i < n; i++) {
    const a = ring0[i];
    const b = ring0[i + 1];
    const c = ring1[i + 1];
    const d = ring1[i];
    
    addTriangle(triangles, a, b, c);
    addTriangle(triangles, a, c, d);
  }
}

// Cap a half-arc with triangles connecting outer to inner edge
function capHalfArc(triangles: Triangle[], outer: Vector3[], inner: Vector3[], isStart: boolean) {
  const n = outer.length;
  
  for (let i = 0; i < n - 1; i++) {
    if (isStart) {
      addTriangle(triangles, outer[i], inner[i], inner[i + 1]);
      addTriangle(triangles, outer[i], inner[i + 1], outer[i + 1]);
    } else {
      addTriangle(triangles, outer[i], outer[i + 1], inner[i + 1]);
      addTriangle(triangles, outer[i], inner[i + 1], inner[i]);
    }
  }
}

// Generate split-half modular connector at path endpoint
// Generates only top or bottom half to match split-half channel design
function generateSplitConnector(
  center: Vector2,
  tangentX: number,
  tangentY: number,
  outerRadius: number,
  connectorLength: number,
  isMale: boolean,
  tolerance: number,
  isTop: boolean,
  segments: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Male connector is slightly smaller, female is larger to receive
  const connectorRadius = isMale ? outerRadius - tolerance : outerRadius + tolerance;
  const zCenter = outerRadius;
  
  // Normalize tangent
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  const tx = tangentLen > 0.0001 ? tangentX / tangentLen : 1;
  const ty = tangentLen > 0.0001 ? tangentY / tangentLen : 0;
  
  const dir = isMale ? 1 : -1; // Male extends out, female extends in
  const endCenter: Vector2 = {
    x: center.x + tx * connectorLength * dir,
    y: center.y + ty * connectorLength * dir,
  };
  
  // Generate half-arc rings (top or bottom half only)
  const startAngle = isTop ? 0 : Math.PI;
  const endAngle = isTop ? Math.PI : Math.PI * 2;
  
  // Perpendicular direction for arc plane
  const px = -ty;
  const py = tx;
  
  // Generate start and end arcs
  const arc0: Vector3[] = [];
  const arc1: Vector3[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    arc0.push({
      x: center.x + px * connectorRadius * cos,
      y: center.y + py * connectorRadius * cos,
      z: zCenter + connectorRadius * sin,
    });
    
    arc1.push({
      x: endCenter.x + px * connectorRadius * cos,
      y: endCenter.y + py * connectorRadius * cos,
      z: zCenter + connectorRadius * sin,
    });
  }
  
  // Connect arcs along the connector length
  for (let i = 0; i < segments; i++) {
    addTriangle(triangles, arc0[i], arc0[i+1], arc1[i+1]);
    addTriangle(triangles, arc0[i], arc1[i+1], arc1[i]);
  }
  
  // Flat seam face at z=zCenter
  // Connect seam edges from arc0 to arc1
  const seam0Start = arc0[0];
  const seam0End = arc0[segments];
  const seam1Start = arc1[0];
  const seam1End = arc1[segments];
  
  // Seam triangles (flat face along split plane)
  addTriangle(triangles, seam0Start, seam1Start, seam1End);
  addTriangle(triangles, seam0Start, seam1End, seam0End);
  
  // End cap (close the connector end)
  const capCenter3: Vector3 = { x: endCenter.x, y: endCenter.y, z: zCenter };
  for (let i = 0; i < segments; i++) {
    if (isMale) {
      // Male connector has solid end
      addTriangle(triangles, capCenter3, arc1[i+1], arc1[i]);
    } else {
      // Female connector has hollow end
      addTriangle(triangles, capCenter3, arc1[i], arc1[i+1]);
    }
  }
  
  return triangles;
}

// Generate wire channel groove along the outer wall
function generateWireChannel(
  contour: number[],
  outerRadius: number,
  wireRadius: number,
  wallThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const n = contour.length / 2;
  if (n < 2) return triangles;
  
  // Wire channel is a groove on the outside of the tube, at the bottom
  // Position: outside the outer wall, running along the path
  const channelOffset = outerRadius + wireRadius; // Center of wire channel
  const zChannel = outerRadius + wireRadius * 0.5; // Slightly below center
  const channelDepth = wireRadius;
  
  for (let i = 0; i < n - 1; i++) {
    const x0 = contour[i * 2];
    const y0 = contour[i * 2 + 1];
    const x1 = contour[(i + 1) * 2];
    const y1 = contour[(i + 1) * 2 + 1];
    
    // Calculate perpendicular direction
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) continue;
    
    const px = -dy / len; // Perpendicular
    const py = dx / len;
    
    // Wire channel outer points (groove on the outer wall)
    const wo0: Vector3 = {
      x: x0 + px * channelOffset,
      y: y0 + py * channelOffset,
      z: zChannel,
    };
    const wo1: Vector3 = {
      x: x1 + px * channelOffset,
      y: y1 + py * channelOffset,
      z: zChannel,
    };
    
    // Wire channel inner points (groove bottom)
    const wi0: Vector3 = {
      x: x0 + px * (channelOffset - channelDepth),
      y: y0 + py * (channelOffset - channelDepth),
      z: zChannel,
    };
    const wi1: Vector3 = {
      x: x1 + px * (channelOffset - channelDepth),
      y: y1 + py * (channelOffset - channelDepth),
      z: zChannel,
    };
    
    // Top of channel (connects to outer wall)
    const wt0: Vector3 = { ...wo0, z: zChannel + wireRadius };
    const wt1: Vector3 = { ...wo1, z: zChannel + wireRadius };
    const wti0: Vector3 = { ...wi0, z: zChannel + wireRadius };
    const wti1: Vector3 = { ...wi1, z: zChannel + wireRadius };
    
    // Channel walls
    addTriangle(triangles, wt0, wo0, wo1);
    addTriangle(triangles, wt0, wo1, wt1);
    
    addTriangle(triangles, wo0, wi0, wi1);
    addTriangle(triangles, wo0, wi1, wo1);
    
    addTriangle(triangles, wi0, wti0, wti1);
    addTriangle(triangles, wi0, wti1, wi1);
    
    addTriangle(triangles, wti0, wt0, wt1);
    addTriangle(triangles, wti0, wt1, wti1);
  }
  
  return triangles;
}

// Convert font path to contours with proper decimation
function pathToContours(fontPath: opentype.Path): number[][] {
  const contours: number[][] = [];
  let currentContour: number[] = [];
  let startX = 0, startY = 0;

  for (const cmd of fontPath.commands) {
    switch (cmd.type) {
      case "M":
        if (currentContour.length > 0) {
          contours.push(currentContour);
        }
        startX = cmd.x;
        startY = cmd.y;
        currentContour = [cmd.x, cmd.y];
        break;
      case "L":
        currentContour.push(cmd.x, cmd.y);
        break;
      case "Q": {
        // Reduce curve resolution for simpler mesh
        const steps = 4;
        const lastX = currentContour[currentContour.length - 2];
        const lastY = currentContour[currentContour.length - 1];
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const t1 = 1 - t;
          const x = t1 * t1 * lastX + 2 * t1 * t * cmd.x1 + t * t * cmd.x;
          const y = t1 * t1 * lastY + 2 * t1 * t * cmd.y1 + t * t * cmd.y;
          currentContour.push(x, y);
        }
        break;
      }
      case "C": {
        const cSteps = 5;
        const cLastX = currentContour[currentContour.length - 2];
        const cLastY = currentContour[currentContour.length - 1];
        for (let i = 1; i <= cSteps; i++) {
          const t = i / cSteps;
          const t1 = 1 - t;
          const x = t1 * t1 * t1 * cLastX + 3 * t1 * t1 * t * cmd.x1 + 3 * t1 * t * t * cmd.x2 + t * t * t * cmd.x;
          const y = t1 * t1 * t1 * cLastY + 3 * t1 * t1 * t * cmd.y1 + 3 * t1 * t * t * cmd.y2 + t * t * t * cmd.y;
          currentContour.push(x, y);
        }
        break;
      }
      case "Z":
        if (currentContour.length >= 4) {
          // Close the contour
          const lastX = currentContour[currentContour.length - 2];
          const lastY = currentContour[currentContour.length - 1];
          const dist = Math.sqrt((lastX - startX) ** 2 + (lastY - startY) ** 2);
          if (dist > 0.5) {
            currentContour.push(startX, startY);
          }
          contours.push(currentContour);
          currentContour = [];
        }
        break;
    }
  }

  if (currentContour.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}

// Simplify contour by removing points that are too close together
function simplifyContour(contour: number[], minDistance: number): number[] {
  if (contour.length < 4) return contour;
  
  const simplified: number[] = [contour[0], contour[1]];
  
  for (let i = 2; i < contour.length; i += 2) {
    const lastX = simplified[simplified.length - 2];
    const lastY = simplified[simplified.length - 1];
    const x = contour[i];
    const y = contour[i + 1];
    
    const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
    if (dist >= minDistance) {
      simplified.push(x, y);
    }
  }
  
  return simplified;
}

// Convert sketch paths to contours
function sketchPathsToContours(paths: SketchPath[], scale: number): number[][] {
  const contours: number[][] = [];
  
  for (const sketchPath of paths) {
    if (sketchPath.points.length < 2) continue;
    
    const contour: number[] = [];
    for (const point of sketchPath.points) {
      contour.push(point.x * scale, -point.y * scale);
    }
    
    if (sketchPath.closed && contour.length >= 6) {
      contour.push(contour[0], contour[1]);
    }
    
    contours.push(contour);
  }
  
  return contours;
}

function trianglesToSTL(triangles: Triangle[], name: string): Buffer {
  const bufferSize = 84 + triangles.length * 50;
  const buffer = Buffer.alloc(bufferSize);

  const header = `Binary STL - ${name}`.substring(0, 80).padEnd(80, "\0");
  buffer.write(header, 0, 80, "ascii");
  buffer.writeUInt32LE(triangles.length, 80);

  let offset = 84;
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
    offset += 50;
  }

  return buffer;
}

export function generateCustomShape(settings: CustomShapeSettings & { paths?: SketchPath[] }): CustomShapePart[] {
  const parts: CustomShapePart[] = [];

  const {
    inputMode,
    text,
    fontId,
    fontSize,
    paths = [],
    channelWidth,
    channelDepth,
    wallThickness,
    ledType,
    splitHalf = true,
    snapFitTolerance = 0.2,
    modularConnectors = true,
    connectorLength = 5,
    wireChannel = true,
    wireChannelDiameter = 3,
    scale,
  } = settings;

  console.log(`[CustomShape] Generating split-half channel, mode=${inputMode}, LED=${ledType}, width=${channelWidth}mm`);

  let contours: number[][] = [];

  if (inputMode === "text" && text) {
    const font = loadFont(fontId || "aerioz");
    const fontPath = font.getPath(text, 0, 0, fontSize * scale);
    contours = pathToContours(fontPath);
    console.log(`[CustomShape] Generated ${contours.length} contours from text "${text}"`);
  } else if ((inputMode === "draw" || inputMode === "trace") && paths.length > 0) {
    contours = sketchPathsToContours(paths, scale);
    console.log(`[CustomShape] Generated ${contours.length} contours from ${paths.length} paths`);
  }

  if (contours.length === 0) {
    console.log("[CustomShape] No contours to generate");
    return parts;
  }

  // Calculate bounds and center
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const contour of contours) {
    for (let i = 0; i < contour.length; i += 2) {
      minX = Math.min(minX, contour[i]);
      maxX = Math.max(maxX, contour[i]);
      minY = Math.min(minY, contour[i + 1]);
      maxY = Math.max(maxY, contour[i + 1]);
    }
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Center and simplify contours
  const halfDepth = channelDepth / 2;
  const processedContours = contours.map(contour => {
    const centered: number[] = [];
    for (let i = 0; i < contour.length; i += 2) {
      centered.push(contour[i] - centerX, contour[i + 1] - centerY);
    }
    // Simplify to reduce mesh complexity
    return simplifyContour(centered, halfDepth * 0.3);
  });

  // Generate split-half geometry
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const tubeSegments = 8; // Segments per half-arc

  for (const contour of processedContours) {
    if (contour.length < 4) continue;
    
    // Check if path is closed (start ~ end)
    const n = contour.length / 2;
    const startX = contour[0], startY = contour[1];
    const endX = contour[(n-1)*2], endY = contour[(n-1)*2+1];
    const pathDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const isClosed = pathDistance < 1.0;
    
    // Generate top half
    const topHalf = generateSplitHalf(
      contour,
      channelWidth,
      channelDepth,
      wallThickness,
      true, // isTop
      snapFitTolerance,
      tubeSegments
    );
    topTriangles.push(...topHalf);
    
    // Generate bottom half
    const bottomHalf = generateSplitHalf(
      contour,
      channelWidth,
      channelDepth,
      wallThickness,
      false, // isTop
      snapFitTolerance,
      tubeSegments
    );
    bottomTriangles.push(...bottomHalf);
    
    // Add modular connectors for open paths (one male, one female)
    // Each connector is generated as split halves matching the channel geometry
    if (modularConnectors && !isClosed && n >= 2) {
      const outerRadius = (channelWidth / 2) + wallThickness;
      const tubeSegs = tubeSegments;
      
      // Start point connector (male - smaller diameter for insertion)
      const startCenter: Vector2 = { x: startX, y: startY };
      const startTangentX = contour[2] - startX;
      const startTangentY = contour[3] - startY;
      const startConnectorTop = generateSplitConnector(
        startCenter, startTangentX, startTangentY, outerRadius,
        connectorLength, true, snapFitTolerance, true, tubeSegs
      );
      const startConnectorBottom = generateSplitConnector(
        startCenter, startTangentX, startTangentY, outerRadius,
        connectorLength, true, snapFitTolerance, false, tubeSegs
      );
      topTriangles.push(...startConnectorTop);
      bottomTriangles.push(...startConnectorBottom);
      
      // End point connector (female - larger diameter to receive)
      const endCenter: Vector2 = { x: endX, y: endY };
      const endTangentX = endX - contour[(n-2)*2];
      const endTangentY = endY - contour[(n-2)*2+1];
      const endConnectorTop = generateSplitConnector(
        endCenter, endTangentX, endTangentY, outerRadius,
        connectorLength, false, snapFitTolerance, true, tubeSegs
      );
      const endConnectorBottom = generateSplitConnector(
        endCenter, endTangentX, endTangentY, outerRadius,
        connectorLength, false, snapFitTolerance, false, tubeSegs
      );
      topTriangles.push(...endConnectorTop);
      bottomTriangles.push(...endConnectorBottom);
      
      console.log(`[CustomShape] Added split modular connectors (male start, female end)`);
    }
    
    // Add wire channel for addressable LEDs
    if (wireChannel && ledType === "ws2812") {
      // Wire channel runs along the outer wall for data/power routing
      const wireRadius = wireChannelDiameter / 2;
      const outerRadius = (channelWidth / 2) + wallThickness;
      
      // Generate small channel groove on bottom half for wires
      const wireTriangles = generateWireChannel(
        contour, outerRadius, wireRadius, wallThickness
      );
      bottomTriangles.push(...wireTriangles);
      
      console.log(`[CustomShape] Added ${wireRadius*2}mm wire channel`);
    }
  }

  console.log(`[CustomShape] Generated ${topTriangles.length} top + ${bottomTriangles.length} bottom triangles`);

  if (topTriangles.length === 0 && bottomTriangles.length === 0) {
    return parts;
  }

  // Create STL files for each half
  if (topTriangles.length > 0) {
    const topBuffer = trianglesToSTL(topTriangles, "Channel Top Half");
    parts.push({
      filename: "channel_top.stl",
      content: topBuffer,
      partType: "top_half",
      material: "translucent",
    });
  }

  if (bottomTriangles.length > 0) {
    const bottomBuffer = trianglesToSTL(bottomTriangles, "Channel Bottom Half");
    parts.push({
      filename: "channel_bottom.stl",
      content: bottomBuffer,
      partType: "bottom_half",
      material: "translucent",
    });
  }

  return parts;
}

// Simplified function to generate split tubes from text directly
// Used by main export endpoint for text mode
export function generateTextAsSplitTubes(
  text: string,
  fontId: string,
  fontSize: number,
  scale: number,
  channelWidth: number = 10,
  channelDepth: number = 8,
  wallThickness: number = 1.5,
  snapFitTolerance: number = 0.2
): CustomShapePart[] {
  return generateCustomShape({
    inputMode: "text",
    text,
    fontId,
    fontSize,
    scale,
    channelWidth,
    channelDepth,
    wallThickness,
    ledType: "ws2812",
    splitHalf: true,
    snapFitTolerance,
    modularConnectors: true,
    connectorLength: 5,
    wireChannel: true,
    wireChannelDiameter: 3,
    paths: [],
    traceThreshold: 128,
    traceSmoothing: 2,
    autoTrace: false,
  });
}
