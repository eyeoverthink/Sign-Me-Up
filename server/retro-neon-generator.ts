import type { RetroNeonSettings, EdisonBulbSettings, NeonSignSettings, ElectronicsHousingSettings, PrimitiveShape } from "@shared/schema";
import { normalizeSvgPath, commandsToPoints, PRIMITIVE_SHAPES } from "@shared/svg-utils";
import archiver from "archiver";
import { Writable } from "stream";

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

function addTriangle(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3) {
  triangles.push({ v1, v2, v3 });
}

function addQuad(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3, v4: Vector3, flip = false) {
  if (flip) {
    addTriangle(triangles, v1, v3, v2);
    addTriangle(triangles, v1, v4, v3);
  } else {
    addTriangle(triangles, v1, v2, v3);
    addTriangle(triangles, v1, v3, v4);
  }
}

// Generate hollow glass shell for Edison bulb with proper watertight geometry
// Creates both outer and inner walls with closed top, suitable for 3D printing
function generateGlassShell(
  shape: string,
  diameter: number,
  height: number,
  wallThickness: number,
  includeLedMounts: boolean = true
): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 36; // More segments for smoother curves
  const rings = 32; // More rings for better shape definition
  const outerRadius = diameter / 2;
  const innerRadius = Math.max(outerRadius - wallThickness, 2); // Minimum 2mm cavity

  // Generate profile based on shape - returns radius at given height
  function getRadiusAtHeight(h: number, radius: number): number {
    const t = h / height; // 0 at bottom, 1 at top
    
    switch (shape) {
      case "tube":
        // Straight cylinder with rounded dome top
        if (t > 0.85) {
          const topT = (t - 0.85) / 0.15;
          return radius * Math.cos(topT * Math.PI / 2);
        }
        return radius;
        
      case "globe":
        // Spherical shape - properly closes at top and bottom
        return radius * Math.sin(t * Math.PI);
        
      case "flame":
        // Tapered flame/candle shape
        if (t < 0.2) return radius * (t / 0.2) * 0.7;
        if (t > 0.6) return radius * 0.7 * Math.pow(1 - (t - 0.6) / 0.4, 1.5);
        return radius * 0.7;
        
      case "vintage":
        // Classic Edison A19 shape - smooth bulge
        const bulge = Math.sin(t * Math.PI);
        const taper = t > 0.8 ? Math.cos((t - 0.8) / 0.2 * Math.PI / 2) : 1;
        return radius * (0.5 + 0.5 * bulge) * taper;
        
      case "pear":
        // Pear shape - wider at bottom, tapers to rounded top
        if (t < 0.5) return radius * (0.6 + 0.4 * (t / 0.5));
        if (t > 0.85) return radius * Math.cos((t - 0.85) / 0.15 * Math.PI / 2);
        return radius;
        
      default:
        // Default cylindrical with dome
        if (t > 0.85) {
          return radius * Math.cos((t - 0.85) / 0.15 * Math.PI / 2);
        }
        return radius;
    }
  }

  // Store last valid radii for closing geometry - use consistent epsilon
  const EPS = 0.5; // Consistent threshold for both inner and outer
  let lastOuterR = 0, lastInnerR = 0, lastZ = 0;
  let closedAtApex = false; // Track if we closed with apex triangles (both inner AND outer)

  // Generate outer and inner shell surfaces with unified closure strategy
  for (let ring = 0; ring < rings; ring++) {
    const h0 = (ring / rings) * height;
    const h1 = ((ring + 1) / rings) * height;
    
    const outerR0 = getRadiusAtHeight(h0, outerRadius);
    const outerR1 = getRadiusAtHeight(h1, outerRadius);
    const innerR0 = getRadiusAtHeight(h0, innerRadius);
    const innerR1 = getRadiusAtHeight(h1, innerRadius);

    // Track last valid ring for potential top ring closure
    if (outerR1 > EPS) {
      lastOuterR = outerR1;
      lastInnerR = Math.max(innerR1, 0);
      lastZ = h1;
    }

    // Determine closure strategy: if outer collapses to zero, both inner and outer close at apex
    const outerCollapses = outerR0 > EPS && outerR1 <= EPS;

    for (let seg = 0; seg < segments; seg++) {
      const a0 = (seg / segments) * Math.PI * 2;
      const a1 = ((seg + 1) / segments) * Math.PI * 2;
      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      // Outer surface quads
      if (outerR0 > EPS && outerR1 > EPS) {
        const o00: Vector3 = { x: cos0 * outerR0, y: sin0 * outerR0, z: h0 };
        const o01: Vector3 = { x: cos1 * outerR0, y: sin1 * outerR0, z: h0 };
        const o10: Vector3 = { x: cos0 * outerR1, y: sin0 * outerR1, z: h1 };
        const o11: Vector3 = { x: cos1 * outerR1, y: sin1 * outerR1, z: h1 };
        addQuad(triangles, o00, o01, o11, o10, false);
      } else if (outerCollapses) {
        // Closing triangle at apex - outer shell meets at point
        const o00: Vector3 = { x: cos0 * outerR0, y: sin0 * outerR0, z: h0 };
        const o01: Vector3 = { x: cos1 * outerR0, y: sin1 * outerR0, z: h0 };
        const apex: Vector3 = { x: 0, y: 0, z: h1 };
        addTriangle(triangles, o00, o01, apex);
        closedAtApex = true;
      }

      // Inner surface quads - use same epsilon for consistency
      if (innerR0 > EPS && innerR1 > EPS) {
        const i00: Vector3 = { x: cos0 * innerR0, y: sin0 * innerR0, z: h0 };
        const i01: Vector3 = { x: cos1 * innerR0, y: sin1 * innerR0, z: h0 };
        const i10: Vector3 = { x: cos0 * innerR1, y: sin0 * innerR1, z: h1 };
        const i11: Vector3 = { x: cos1 * innerR1, y: sin1 * innerR1, z: h1 };
        addQuad(triangles, i00, i10, i11, i01, false);
      } else if (innerR0 > EPS && (innerR1 <= EPS || outerCollapses)) {
        // Inner closing triangle at apex - close when outer does to maintain consistency
        const i00: Vector3 = { x: cos0 * innerR0, y: sin0 * innerR0, z: h0 };
        const i01: Vector3 = { x: cos1 * innerR0, y: sin1 * innerR0, z: h0 };
        const apex: Vector3 = { x: 0, y: 0, z: h1 };
        addTriangle(triangles, apex, i01, i00);
      }
    }
  }

  // Close the top with annular ring ONLY if we didn't close at apex
  // This handles shapes that don't naturally close to a point (flat/domed tops)
  if (!closedAtApex && lastOuterR > EPS && lastOuterR > lastInnerR) {
    for (let seg = 0; seg < segments; seg++) {
      const a0 = (seg / segments) * Math.PI * 2;
      const a1 = ((seg + 1) / segments) * Math.PI * 2;
      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      const outer0: Vector3 = { x: cos0 * lastOuterR, y: sin0 * lastOuterR, z: lastZ };
      const outer1: Vector3 = { x: cos1 * lastOuterR, y: sin1 * lastOuterR, z: lastZ };
      const inner0: Vector3 = { x: cos0 * lastInnerR, y: sin0 * lastInnerR, z: lastZ };
      const inner1: Vector3 = { x: cos1 * lastInnerR, y: sin1 * lastInnerR, z: lastZ };
      
      addQuad(triangles, outer0, outer1, inner1, inner0, false);
    }
  }

  // Bottom ring (annular face where glass meets base collar)
  const bottomOuterR = getRadiusAtHeight(0, outerRadius);
  const bottomInnerR = getRadiusAtHeight(0, innerRadius);
  
  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    const outer0: Vector3 = { x: cos0 * bottomOuterR, y: sin0 * bottomOuterR, z: 0 };
    const outer1: Vector3 = { x: cos1 * bottomOuterR, y: sin1 * bottomOuterR, z: 0 };
    const inner0: Vector3 = { x: cos0 * bottomInnerR, y: sin0 * bottomInnerR, z: 0 };
    const inner1: Vector3 = { x: cos1 * bottomInnerR, y: sin1 * bottomInnerR, z: 0 };
    
    addQuad(triangles, outer0, inner0, inner1, outer1, false);
  }

  // Add LED filament mounting posts inside the shell
  if (includeLedMounts && innerRadius > 5) {
    const postRadius = 2; // 4mm diameter posts
    const postHeight = height * 0.6; // Posts go 60% up the shell
    const postCount = 2; // Two posts for LED filament ends
    const postOffset = innerRadius * 0.5; // Posts positioned at half inner radius
    
    for (let p = 0; p < postCount; p++) {
      const postAngle = (p / postCount) * Math.PI * 2;
      const postX = postOffset * Math.cos(postAngle);
      const postY = postOffset * Math.sin(postAngle);
      
      // Generate closed cylindrical post (watertight with top and bottom caps)
      const postSegs = 12;
      for (let seg = 0; seg < postSegs; seg++) {
        const a0 = (seg / postSegs) * Math.PI * 2;
        const a1 = ((seg + 1) / postSegs) * Math.PI * 2;
        const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
        const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
        
        // Post wall
        const pw0: Vector3 = { x: postX + cos0 * postRadius, y: postY + sin0 * postRadius, z: 0 };
        const pw1: Vector3 = { x: postX + cos1 * postRadius, y: postY + sin1 * postRadius, z: 0 };
        const pw2: Vector3 = { x: postX + cos0 * postRadius, y: postY + sin0 * postRadius, z: postHeight };
        const pw3: Vector3 = { x: postX + cos1 * postRadius, y: postY + sin1 * postRadius, z: postHeight };
        addQuad(triangles, pw0, pw1, pw3, pw2, false);
        
        // Post top cap (closes top)
        const topCenter: Vector3 = { x: postX, y: postY, z: postHeight };
        addTriangle(triangles, topCenter, pw2, pw3);
        
        // Post bottom cap (closes bottom - makes watertight)
        const bottomCenter: Vector3 = { x: postX, y: postY, z: 0 };
        addTriangle(triangles, bottomCenter, pw1, pw0);
      }
    }
  }

  return triangles;
}

// Generate shape filament from primitive SVG
function generateShapeFilament(
  shape: PrimitiveShape,
  scale: number,
  wireThickness: number,
  height: number,
  addSupports: boolean
): Triangle[] {
  const triangles: Triangle[] = [];
  const svgPath = PRIMITIVE_SHAPES[shape];
  if (!svgPath) return triangles;

  const commands = normalizeSvgPath(svgPath, scale);
  const points = commandsToPoints(commands, 8);
  if (points.length < 2) return triangles;

  const segments = 8;
  const halfThickness = wireThickness / 2;
  const centerZ = height / 2;

  // Generate tube along the shape path
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.1) continue;

    // Create tube segment
    for (let seg = 0; seg < segments; seg++) {
      const a0 = (seg / segments) * Math.PI * 2;
      const a1 = ((seg + 1) / segments) * Math.PI * 2;
      
      // Direction perpendicular to path segment
      const nx = -dy / len;
      const ny = dx / len;
      
      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      const v00: Vector3 = {
        x: p0.x + (nx * cos0) * halfThickness,
        y: p0.y + (ny * cos0) * halfThickness,
        z: centerZ + sin0 * halfThickness
      };
      const v01: Vector3 = {
        x: p0.x + (nx * cos1) * halfThickness,
        y: p0.y + (ny * cos1) * halfThickness,
        z: centerZ + sin1 * halfThickness
      };
      const v10: Vector3 = {
        x: p1.x + (nx * cos0) * halfThickness,
        y: p1.y + (ny * cos0) * halfThickness,
        z: centerZ + sin0 * halfThickness
      };
      const v11: Vector3 = {
        x: p1.x + (nx * cos1) * halfThickness,
        y: p1.y + (ny * cos1) * halfThickness,
        z: centerZ + sin1 * halfThickness
      };

      addQuad(triangles, v00, v01, v11, v10, false);
    }
  }

  // Add support posts if enabled
  if (addSupports && points.length > 0) {
    const supportRadius = wireThickness * 0.4;
    const supportSegments = 6;
    
    // Add supports at start and end
    const supportPoints = [points[0], points[points.length - 1]];
    if (points.length > 4) {
      supportPoints.push(points[Math.floor(points.length / 2)]);
    }

    for (const pt of supportPoints) {
      for (let seg = 0; seg < supportSegments; seg++) {
        const a0 = (seg / supportSegments) * Math.PI * 2;
        const a1 = ((seg + 1) / supportSegments) * Math.PI * 2;
        const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
        const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

        const b0: Vector3 = { x: pt.x + cos0 * supportRadius, y: pt.y + sin0 * supportRadius, z: 0 };
        const b1: Vector3 = { x: pt.x + cos1 * supportRadius, y: pt.y + sin1 * supportRadius, z: 0 };
        const t0: Vector3 = { x: pt.x + cos0 * supportRadius, y: pt.y + sin0 * supportRadius, z: centerZ - halfThickness };
        const t1: Vector3 = { x: pt.x + cos1 * supportRadius, y: pt.y + sin1 * supportRadius, z: centerZ - halfThickness };

        addQuad(triangles, b0, b1, t1, t0, false);

        // Bottom cap
        const center: Vector3 = { x: pt.x, y: pt.y, z: 0 };
        addTriangle(triangles, center, b1, b0);
      }
    }
  }

  return triangles;
}

// Generate hollow shell from primitive SVG shape (extruded with walls)
function generateHollowShapeShell(
  shape: PrimitiveShape,
  scale: number,
  height: number,
  wallThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const svgPath = PRIMITIVE_SHAPES[shape];
  if (!svgPath) return triangles;

  const commands = normalizeSvgPath(svgPath, scale);
  const points = commandsToPoints(commands, 12);
  if (points.length < 3) return triangles;

  // Create inner points by offsetting inward
  const innerPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    // Calculate inward normal
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

    const nx1 = -dy1 / len1;
    const ny1 = dx1 / len1;
    const nx2 = -dy2 / len2;
    const ny2 = dx2 / len2;

    const nx = (nx1 + nx2) / 2;
    const ny = (ny1 + ny2) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny) || 1;

    innerPoints.push({
      x: curr.x + (nx / nlen) * wallThickness,
      y: curr.y + (ny / nlen) * wallThickness
    });
  }

  // Generate walls between outer and inner profiles
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;

    // Outer wall (along height)
    const o0b: Vector3 = { x: points[i].x, y: points[i].y, z: 0 };
    const o1b: Vector3 = { x: points[next].x, y: points[next].y, z: 0 };
    const o0t: Vector3 = { x: points[i].x, y: points[i].y, z: height };
    const o1t: Vector3 = { x: points[next].x, y: points[next].y, z: height };
    addQuad(triangles, o0b, o1b, o1t, o0t, false);

    // Inner wall (along height, reversed)
    const i0b: Vector3 = { x: innerPoints[i].x, y: innerPoints[i].y, z: 0 };
    const i1b: Vector3 = { x: innerPoints[next].x, y: innerPoints[next].y, z: 0 };
    const i0t: Vector3 = { x: innerPoints[i].x, y: innerPoints[i].y, z: height };
    const i1t: Vector3 = { x: innerPoints[next].x, y: innerPoints[next].y, z: height };
    addQuad(triangles, i0b, i0t, i1t, i1b, false);

    // Bottom cap (ring)
    addQuad(triangles, o0b, i0b, i1b, o1b, true);

    // Top cap (ring)
    addQuad(triangles, o0t, o1t, i1t, i0t, true);
  }

  return triangles;
}

// Generate E26/E27 threaded screw base with proper helical thread
function generateScrewBase(
  type: string,
  height: number,
  glassDiameter: number,
  wireHole: boolean,
  wireHoleDiameter: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Standard light bulb base dimensions
  // E26: 26mm major diameter, ~4.2mm pitch (US Edison)
  // E27: 27mm major diameter, ~2.54mm pitch (European)
  // E14: 14mm major diameter (candelabra)
  
  let majorDiameter: number;
  let pitch: number;
  
  switch (type) {
    case "e26":
      majorDiameter = 26;
      pitch = 4.2;
      break;
    case "e27":
      majorDiameter = 27;
      pitch = 2.54;
      break;
    case "e14":
      majorDiameter = 14;
      pitch = 2.0;
      break;
    default:
      return triangles;
  }

  const segments = 32;
  const threadDepth = 1.5;
  const minorDiameter = majorDiameter - threadDepth * 2;
  const turns = Math.floor(height / pitch);
  const stepsPerTurn = segments;
  const totalSteps = turns * stepsPerTurn;

  // Thread radius function - trapezoidal profile
  const getThreadRadius = (phase: number): number => {
    // Thread groove in middle third of each pitch
    if (phase > 0.3 && phase < 0.7) {
      return minorDiameter / 2;
    }
    // Thread crest
    return majorDiameter / 2;
  };

  // Generate smooth cylinder with helical thread groove
  for (let step = 0; step < totalSteps; step++) {
    const t0 = step / stepsPerTurn;
    const t1 = (step + 1) / stepsPerTurn;
    
    const a0 = (step / stepsPerTurn) * Math.PI * 2;
    const a1 = ((step + 1) / stepsPerTurn) * Math.PI * 2;
    
    const z0 = -t0 * pitch;
    const z1 = -t1 * pitch;
    
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    
    // Thread radius varies with position in the pitch cycle
    const phase0 = (t0 % 1);
    const phase1 = (t1 % 1);
    
    const r0 = getThreadRadius(phase0);
    const r1 = getThreadRadius(phase1);
    
    // Create quad strip for this thread segment
    const outer0: Vector3 = { x: cos0 * r0, y: sin0 * r0, z: z0 };
    const outer1: Vector3 = { x: cos1 * r1, y: sin1 * r1, z: z1 };
    const inner0: Vector3 = { x: cos0 * (minorDiameter / 2 - 1), y: sin0 * (minorDiameter / 2 - 1), z: z0 };
    const inner1: Vector3 = { x: cos1 * (minorDiameter / 2 - 1), y: sin1 * (minorDiameter / 2 - 1), z: z1 };
    
    // Outer surface (thread profile)
    addQuad(triangles, outer0, outer1, inner1, inner0, true);
  }

  // Create solid inner cylinder wall
  const innerWallRadius = minorDiameter / 2 - 1;
  const bottomZ = -turns * pitch;
  
  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    
    const top0: Vector3 = { x: cos0 * innerWallRadius, y: sin0 * innerWallRadius, z: 0 };
    const top1: Vector3 = { x: cos1 * innerWallRadius, y: sin1 * innerWallRadius, z: 0 };
    const bot0: Vector3 = { x: cos0 * innerWallRadius, y: sin0 * innerWallRadius, z: bottomZ };
    const bot1: Vector3 = { x: cos1 * innerWallRadius, y: sin1 * innerWallRadius, z: bottomZ };
    
    addQuad(triangles, top0, bot0, bot1, top1, false);
  }

  // Collar at top to connect to glass
  const collarHeight = 4;
  const collarRadius = glassDiameter / 2 * 0.95;
  const baseRadius = majorDiameter / 2;

  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    // Tapered collar surface
    const c0: Vector3 = { x: cos0 * collarRadius, y: sin0 * collarRadius, z: collarHeight };
    const c1: Vector3 = { x: cos1 * collarRadius, y: sin1 * collarRadius, z: collarHeight };
    const b0: Vector3 = { x: cos0 * baseRadius, y: sin0 * baseRadius, z: 0 };
    const b1: Vector3 = { x: cos1 * baseRadius, y: sin1 * baseRadius, z: 0 };

    addQuad(triangles, b0, b1, c1, c0, false);

    // Top of collar - solid or with wire hole
    if (!wireHole) {
      const center: Vector3 = { x: 0, y: 0, z: collarHeight };
      addTriangle(triangles, center, c1, c0);
    } else {
      const holeRadius = wireHoleDiameter / 2;
      const h0: Vector3 = { x: cos0 * holeRadius, y: sin0 * holeRadius, z: collarHeight };
      const h1: Vector3 = { x: cos1 * holeRadius, y: sin1 * holeRadius, z: collarHeight };
      addQuad(triangles, h0, h1, c1, c0, false);
    }
  }

  // Bottom cap of screw base (solid or with center hole)
  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    const b0: Vector3 = { x: cos0 * innerWallRadius, y: sin0 * innerWallRadius, z: bottomZ };
    const b1: Vector3 = { x: cos1 * innerWallRadius, y: sin1 * innerWallRadius, z: bottomZ };

    if (!wireHole) {
      const center: Vector3 = { x: 0, y: 0, z: bottomZ };
      addTriangle(triangles, center, b0, b1);
    } else {
      const holeRadius = wireHoleDiameter / 2;
      const h0: Vector3 = { x: cos0 * holeRadius, y: sin0 * holeRadius, z: bottomZ };
      const h1: Vector3 = { x: cos1 * holeRadius, y: sin1 * holeRadius, z: bottomZ };
      addQuad(triangles, h0, h1, b1, b0, false);
    }
  }

  return triangles;
}

// Helper to get perpendicular vectors for 3D tube generation
function getPerpendicularVectors(dir: { x: number; y: number; z: number }): { perp1: Vector3; perp2: Vector3 } {
  // For 2D paths in X-Y plane, perp1 is in X-Y and perp2 is Z-up
  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  if (len < 0.0001) {
    return { perp1: { x: 1, y: 0, z: 0 }, perp2: { x: 0, y: 0, z: 1 } };
  }
  const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
  
  // perp1 is perpendicular in XY plane
  let perp1: Vector3;
  if (Math.abs(d.x) < 0.9) {
    perp1 = { x: -d.y, y: d.x, z: 0 };
  } else {
    perp1 = { x: 0, y: -d.z, z: d.y };
  }
  const p1len = Math.sqrt(perp1.x * perp1.x + perp1.y * perp1.y + perp1.z * perp1.z);
  perp1 = { x: perp1.x / p1len, y: perp1.y / p1len, z: perp1.z / p1len };
  
  // perp2 = dir cross perp1
  const perp2 = {
    x: d.y * perp1.z - d.z * perp1.y,
    y: d.z * perp1.x - d.x * perp1.z,
    z: d.x * perp1.y - d.y * perp1.x
  };
  
  return { perp1, perp2 };
}

// Generate proper round neon tube along path with circular cross-section
function generateNeonTube(settings: NeonSignSettings): { top: Triangle[]; bottom: Triangle[] } {
  const top: Triangle[] = [];
  const bottom: Triangle[] = [];
  
  const svgPath = PRIMITIVE_SHAPES[settings.shape] || settings.customSvgPath || "";
  if (!svgPath) return { top, bottom };

  const commands = normalizeSvgPath(svgPath, settings.scale);
  const points = commandsToPoints(commands, 12); // More points for smoother curves
  if (points.length < 2) return { top, bottom };

  const outerRadius = settings.tubeWidth / 2;
  const wall = settings.wallThickness;
  const innerRadius = outerRadius - wall;
  const tubeSegments = 12; // Circular segments around tube
  
  // Generate rings at each point along the path
  interface Ring {
    outer: Vector3[];
    inner: Vector3[];
    center: Vector3;
  }
  
  const rings: Ring[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const center: Vector3 = { x: p.x, y: p.y, z: 0 };
    
    // Calculate direction at this point (average of incoming and outgoing)
    let dir: { x: number; y: number; z: number };
    if (i === 0) {
      const next = points[i + 1];
      dir = { x: next.x - p.x, y: next.y - p.y, z: 0 };
    } else if (i === points.length - 1) {
      const prev = points[i - 1];
      dir = { x: p.x - prev.x, y: p.y - prev.y, z: 0 };
    } else {
      const prev = points[i - 1];
      const next = points[i + 1];
      dir = { x: (next.x - prev.x) / 2, y: (next.y - prev.y) / 2, z: 0 };
    }
    
    const { perp1, perp2 } = getPerpendicularVectors(dir);
    
    const outerRing: Vector3[] = [];
    const innerRing: Vector3[] = [];
    
    for (let s = 0; s < tubeSegments; s++) {
      const angle = (s / tubeSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Outer ring point
      outerRing.push({
        x: center.x + outerRadius * (cos * perp1.x + sin * perp2.x),
        y: center.y + outerRadius * (cos * perp1.y + sin * perp2.y),
        z: center.z + outerRadius * (cos * perp1.z + sin * perp2.z)
      });
      
      // Inner ring point (for hollow tubes)
      if (settings.hollow) {
        innerRing.push({
          x: center.x + innerRadius * (cos * perp1.x + sin * perp2.x),
          y: center.y + innerRadius * (cos * perp1.y + sin * perp2.y),
          z: center.z + innerRadius * (cos * perp1.z + sin * perp2.z)
        });
      }
    }
    
    rings.push({ outer: outerRing, inner: innerRing, center });
  }
  
  // Connect rings to form tube mesh
  for (let i = 0; i < rings.length - 1; i++) {
    const ring0 = rings[i];
    const ring1 = rings[i + 1];
    
    for (let s = 0; s < tubeSegments; s++) {
      const sNext = (s + 1) % tubeSegments;
      
      const o00 = ring0.outer[s];
      const o01 = ring0.outer[sNext];
      const o10 = ring1.outer[s];
      const o11 = ring1.outer[sNext];
      
      if (settings.splitHalf) {
        // Split into top half (positive Z) and bottom half (negative Z)
        // Top half includes segments where both points have z >= 0
        const isTopSegment = (o00.z >= -0.001 && o01.z >= -0.001) || 
                              (o10.z >= -0.001 && o11.z >= -0.001);
        const isBottomSegment = (o00.z <= 0.001 && o01.z <= 0.001) || 
                                 (o10.z <= 0.001 && o11.z <= 0.001);
        
        // Outer surface
        if (o00.z >= 0 || o01.z >= 0 || o10.z >= 0 || o11.z >= 0) {
          // Add to top half if any vertex is above z=0
          if (o00.z >= 0 && o01.z >= 0 && o10.z >= 0 && o11.z >= 0) {
            addQuad(top, o00, o10, o11, o01, false);
          } else if (o00.z >= 0 || o01.z >= 0 || o10.z >= 0 || o11.z >= 0) {
            // Partial - add to top
            addQuad(top, o00, o10, o11, o01, false);
          }
        }
        if (o00.z <= 0 && o01.z <= 0 && o10.z <= 0 && o11.z <= 0) {
          addQuad(bottom, o01, o11, o10, o00, false);
        } else if (o00.z <= 0 || o01.z <= 0 || o10.z <= 0 || o11.z <= 0) {
          if (!(o00.z >= 0 && o01.z >= 0 && o10.z >= 0 && o11.z >= 0)) {
            addQuad(bottom, o01, o11, o10, o00, false);
          }
        }
        
        // Inner surface (hollow tube)
        if (settings.hollow && ring0.inner.length > 0 && ring1.inner.length > 0) {
          const i00 = ring0.inner[s];
          const i01 = ring0.inner[sNext];
          const i10 = ring1.inner[s];
          const i11 = ring1.inner[sNext];
          
          if (i00.z >= 0 && i01.z >= 0 && i10.z >= 0 && i11.z >= 0) {
            addQuad(top, i00, i01, i11, i10, false);
          } else if (i00.z >= 0 || i01.z >= 0 || i10.z >= 0 || i11.z >= 0) {
            addQuad(top, i00, i01, i11, i10, false);
          }
          if (i00.z <= 0 && i01.z <= 0 && i10.z <= 0 && i11.z <= 0) {
            addQuad(bottom, i10, i11, i01, i00, false);
          } else if (i00.z <= 0 || i01.z <= 0 || i10.z <= 0 || i11.z <= 0) {
            if (!(i00.z >= 0 && i01.z >= 0 && i10.z >= 0 && i11.z >= 0)) {
              addQuad(bottom, i10, i11, i01, i00, false);
            }
          }
        }
      } else {
        // Single piece - add all to top
        addQuad(top, o00, o10, o11, o01, false);
        
        if (settings.hollow && ring0.inner.length > 0 && ring1.inner.length > 0) {
          const i00 = ring0.inner[s];
          const i01 = ring0.inner[sNext];
          const i10 = ring1.inner[s];
          const i11 = ring1.inner[sNext];
          addQuad(top, i00, i01, i11, i10, false);
        }
      }
    }
  }
  
  // Cap the ends
  const firstRing = rings[0];
  const lastRing = rings[rings.length - 1];
  
  // Start cap
  for (let s = 0; s < tubeSegments; s++) {
    const sNext = (s + 1) % tubeSegments;
    
    if (settings.hollow && firstRing.inner.length > 0) {
      // Ring between outer and inner
      const o0 = firstRing.outer[s];
      const o1 = firstRing.outer[sNext];
      const i0 = firstRing.inner[s];
      const i1 = firstRing.inner[sNext];
      
      if (settings.splitHalf) {
        if (o0.z >= 0 || o1.z >= 0 || i0.z >= 0 || i1.z >= 0) {
          addQuad(top, o1, o0, i0, i1, false);
        }
        if (o0.z <= 0 || o1.z <= 0 || i0.z <= 0 || i1.z <= 0) {
          addQuad(bottom, o0, o1, i1, i0, false);
        }
      } else {
        addQuad(top, o1, o0, i0, i1, false);
      }
    } else {
      // Solid cap
      const o0 = firstRing.outer[s];
      const o1 = firstRing.outer[sNext];
      if (settings.splitHalf) {
        if (o0.z >= 0 || o1.z >= 0) {
          addTriangle(top, firstRing.center, o1, o0);
        }
        if (o0.z <= 0 || o1.z <= 0) {
          addTriangle(bottom, firstRing.center, o0, o1);
        }
      } else {
        addTriangle(top, firstRing.center, o1, o0);
      }
    }
  }
  
  // End cap
  for (let s = 0; s < tubeSegments; s++) {
    const sNext = (s + 1) % tubeSegments;
    
    if (settings.hollow && lastRing.inner.length > 0) {
      const o0 = lastRing.outer[s];
      const o1 = lastRing.outer[sNext];
      const i0 = lastRing.inner[s];
      const i1 = lastRing.inner[sNext];
      
      if (settings.splitHalf) {
        if (o0.z >= 0 || o1.z >= 0 || i0.z >= 0 || i1.z >= 0) {
          addQuad(top, o0, o1, i1, i0, false);
        }
        if (o0.z <= 0 || o1.z <= 0 || i0.z <= 0 || i1.z <= 0) {
          addQuad(bottom, o1, o0, i0, i1, false);
        }
      } else {
        addQuad(top, o0, o1, i1, i0, false);
      }
    } else {
      const o0 = lastRing.outer[s];
      const o1 = lastRing.outer[sNext];
      if (settings.splitHalf) {
        if (o0.z >= 0 || o1.z >= 0) {
          addTriangle(top, lastRing.center, o0, o1);
        }
        if (o0.z <= 0 || o1.z <= 0) {
          addTriangle(bottom, lastRing.center, o1, o0);
        }
      } else {
        addTriangle(top, lastRing.center, o0, o1);
      }
    }
  }
  
  // Add split-half seam surfaces (flat faces at z=0 plane to close each half)
  if (settings.splitHalf) {
    // For each tube segment between rings, add flat seam faces at z=0
    for (let i = 0; i < rings.length - 1; i++) {
      const ring0 = rings[i];
      const ring1 = rings[i + 1];
      
      // Project all ring points to z=0 for the seam plane
      // Create flat face between outer and inner (or center for solid) at z=0
      
      // Find the outer edge points projected to z=0
      const outerSeam0Left: Vector3 = { x: ring0.outer[0].x, y: ring0.outer[0].y, z: 0 };
      const outerSeam0Right: Vector3 = { x: ring0.outer[tubeSegments / 2].x, y: ring0.outer[tubeSegments / 2].y, z: 0 };
      const outerSeam1Left: Vector3 = { x: ring1.outer[0].x, y: ring1.outer[0].y, z: 0 };
      const outerSeam1Right: Vector3 = { x: ring1.outer[tubeSegments / 2].x, y: ring1.outer[tubeSegments / 2].y, z: 0 };
      
      if (settings.hollow && ring0.inner.length > 0 && ring1.inner.length > 0) {
        const innerSeam0Left: Vector3 = { x: ring0.inner[0].x, y: ring0.inner[0].y, z: 0 };
        const innerSeam0Right: Vector3 = { x: ring0.inner[tubeSegments / 2].x, y: ring0.inner[tubeSegments / 2].y, z: 0 };
        const innerSeam1Left: Vector3 = { x: ring1.inner[0].x, y: ring1.inner[0].y, z: 0 };
        const innerSeam1Right: Vector3 = { x: ring1.inner[tubeSegments / 2].x, y: ring1.inner[tubeSegments / 2].y, z: 0 };
        
        // Left seam (top half)
        addQuad(top, outerSeam0Left, outerSeam1Left, innerSeam1Left, innerSeam0Left, false);
        // Right seam (top half)  
        addQuad(top, innerSeam0Right, innerSeam1Right, outerSeam1Right, outerSeam0Right, false);
        
        // Left seam (bottom half - reversed)
        addQuad(bottom, innerSeam0Left, innerSeam1Left, outerSeam1Left, outerSeam0Left, false);
        // Right seam (bottom half - reversed)
        addQuad(bottom, outerSeam0Right, outerSeam1Right, innerSeam1Right, innerSeam0Right, false);
      } else {
        // Solid tube - seam from outer to center
        const center0: Vector3 = { x: ring0.center.x, y: ring0.center.y, z: 0 };
        const center1: Vector3 = { x: ring1.center.x, y: ring1.center.y, z: 0 };
        
        // Left seam
        addQuad(top, outerSeam0Left, outerSeam1Left, center1, center0, false);
        // Right seam
        addQuad(top, center0, center1, outerSeam1Right, outerSeam0Right, false);
        
        // Bottom half (reversed)
        addQuad(bottom, center0, center1, outerSeam1Left, outerSeam0Left, false);
        addQuad(bottom, outerSeam0Right, outerSeam1Right, center1, center0, false);
      }
    }
    
    // Add seam faces at start and end caps
    const firstRing = rings[0];
    const lastRing = rings[rings.length - 1];
    
    // Start cap seam
    const startOuterLeft: Vector3 = { x: firstRing.outer[0].x, y: firstRing.outer[0].y, z: 0 };
    const startOuterRight: Vector3 = { x: firstRing.outer[tubeSegments / 2].x, y: firstRing.outer[tubeSegments / 2].y, z: 0 };
    const startCenter: Vector3 = { x: firstRing.center.x, y: firstRing.center.y, z: 0 };
    
    if (settings.hollow && firstRing.inner.length > 0) {
      const startInnerLeft: Vector3 = { x: firstRing.inner[0].x, y: firstRing.inner[0].y, z: 0 };
      const startInnerRight: Vector3 = { x: firstRing.inner[tubeSegments / 2].x, y: firstRing.inner[tubeSegments / 2].y, z: 0 };
      // Close the start with ring between outer and inner
      addQuad(top, startOuterLeft, startInnerLeft, startInnerRight, startOuterRight, false);
      addQuad(bottom, startOuterRight, startInnerRight, startInnerLeft, startOuterLeft, false);
    } else {
      addTriangle(top, startCenter, startOuterLeft, startOuterRight);
      addTriangle(bottom, startCenter, startOuterRight, startOuterLeft);
    }
    
    // End cap seam
    const endOuterLeft: Vector3 = { x: lastRing.outer[0].x, y: lastRing.outer[0].y, z: 0 };
    const endOuterRight: Vector3 = { x: lastRing.outer[tubeSegments / 2].x, y: lastRing.outer[tubeSegments / 2].y, z: 0 };
    const endCenter: Vector3 = { x: lastRing.center.x, y: lastRing.center.y, z: 0 };
    
    if (settings.hollow && lastRing.inner.length > 0) {
      const endInnerLeft: Vector3 = { x: lastRing.inner[0].x, y: lastRing.inner[0].y, z: 0 };
      const endInnerRight: Vector3 = { x: lastRing.inner[tubeSegments / 2].x, y: lastRing.inner[tubeSegments / 2].y, z: 0 };
      addQuad(top, endOuterRight, endInnerRight, endInnerLeft, endOuterLeft, false);
      addQuad(bottom, endOuterLeft, endInnerLeft, endInnerRight, endOuterRight, false);
    } else {
      addTriangle(top, endCenter, endOuterRight, endOuterLeft);
      addTriangle(bottom, endCenter, endOuterLeft, endOuterRight);
    }
  }

  return { top, bottom };
}

// Generate electronics housing (stand)
function generateElectronicsHousing(settings: ElectronicsHousingSettings): { housing: Triangle[]; lid: Triangle[] } {
  const housing: Triangle[] = [];
  const lid: Triangle[] = [];
  
  if (!settings.enabled) return { housing, lid };

  const segments = settings.shape === "hexagon" ? 6 : settings.shape === "square" ? 4 : 32;
  const radius = settings.diameter / 2;
  const innerRadius = radius - settings.wallThickness;
  const height = settings.height;
  const lidThickness = 3;

  // Generate housing walls
  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    // Outer wall
    const oB0: Vector3 = { x: cos0 * radius, y: sin0 * radius, z: 0 };
    const oB1: Vector3 = { x: cos1 * radius, y: sin1 * radius, z: 0 };
    const oT0: Vector3 = { x: cos0 * radius, y: sin0 * radius, z: height };
    const oT1: Vector3 = { x: cos1 * radius, y: sin1 * radius, z: height };
    addQuad(housing, oB0, oB1, oT1, oT0, false);

    // Inner wall
    const iB0: Vector3 = { x: cos0 * innerRadius, y: sin0 * innerRadius, z: lidThickness };
    const iB1: Vector3 = { x: cos1 * innerRadius, y: sin1 * innerRadius, z: lidThickness };
    const iT0: Vector3 = { x: cos0 * innerRadius, y: sin0 * innerRadius, z: height };
    const iT1: Vector3 = { x: cos1 * innerRadius, y: sin1 * innerRadius, z: height };
    addQuad(housing, iB0, iT0, iT1, iB1, false);

    // Bottom
    const center: Vector3 = { x: 0, y: 0, z: 0 };
    addTriangle(housing, center, oB1, oB0);

    // Top rim
    addQuad(housing, oT0, oT1, iT1, iT0, false);

    // Inner bottom
    const innerCenter: Vector3 = { x: 0, y: 0, z: lidThickness };
    addTriangle(housing, innerCenter, iB0, iB1);
  }

  // Generate lid (separate piece)
  const lidRadius = innerRadius - 0.2; // Slight clearance
  for (let seg = 0; seg < segments; seg++) {
    const a0 = (seg / segments) * Math.PI * 2;
    const a1 = ((seg + 1) / segments) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    const b0: Vector3 = { x: cos0 * lidRadius, y: sin0 * lidRadius, z: 0 };
    const b1: Vector3 = { x: cos1 * lidRadius, y: sin1 * lidRadius, z: 0 };
    const t0: Vector3 = { x: cos0 * lidRadius, y: sin0 * lidRadius, z: lidThickness };
    const t1: Vector3 = { x: cos1 * lidRadius, y: sin1 * lidRadius, z: lidThickness };

    addQuad(lid, b0, b1, t1, t0, false);

    const topCenter: Vector3 = { x: 0, y: 0, z: lidThickness };
    addTriangle(lid, topCenter, t0, t1);

    const botCenter: Vector3 = { x: 0, y: 0, z: 0 };
    addTriangle(lid, botCenter, b1, b0);
  }

  return { housing, lid };
}

function trianglesToSTL(triangles: Triangle[]): Buffer {
  const header = Buffer.alloc(80, 0);
  const numTriangles = Buffer.alloc(4);
  numTriangles.writeUInt32LE(triangles.length, 0);

  const triangleBuffers: Buffer[] = [];

  for (const tri of triangles) {
    const triBuffer = Buffer.alloc(50);

    const ux = tri.v2.x - tri.v1.x;
    const uy = tri.v2.y - tri.v1.y;
    const uz = tri.v2.z - tri.v1.z;
    const vx = tri.v3.x - tri.v1.x;
    const vy = tri.v3.y - tri.v1.y;
    const vz = tri.v3.z - tri.v1.z;

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    triBuffer.writeFloatLE(nx, 0);
    triBuffer.writeFloatLE(ny, 4);
    triBuffer.writeFloatLE(nz, 8);

    triBuffer.writeFloatLE(tri.v1.x, 12);
    triBuffer.writeFloatLE(tri.v1.y, 16);
    triBuffer.writeFloatLE(tri.v1.z, 20);

    triBuffer.writeFloatLE(tri.v2.x, 24);
    triBuffer.writeFloatLE(tri.v2.y, 28);
    triBuffer.writeFloatLE(tri.v2.z, 32);

    triBuffer.writeFloatLE(tri.v3.x, 36);
    triBuffer.writeFloatLE(tri.v3.y, 40);
    triBuffer.writeFloatLE(tri.v3.z, 44);

    triBuffer.writeUInt16LE(0, 48);
    triangleBuffers.push(triBuffer);
  }

  return Buffer.concat([header, numTriangles, ...triangleBuffers]);
}

function generateLuminaryEngineOpenSCAD(edison: EdisonBulbSettings): string {
  // Apply same fallback defaults as STL generation for backward compatibility
  const shellHeight = edison.shellHeight || edison.glassHeight || 80;
  const shellScale = edison.shellScale || 1.0;
  const shellWallThickness = edison.shellWallThickness || edison.glassWallThickness || 2;
  const baseHeight = edison.baseHeight || 20;
  const screwBase = edison.screwBase || "e26";
  
  // Luminary Engine V5 specific settings with safe defaults
  const threadType = edison.threadType || "iso";
  const clipEnabled = edison.clipSystemEnabled === true;
  const clipCount = typeof edison.clipCount === 'number' ? edison.clipCount : 5;
  const clipDiameter = typeof edison.clipDiameter === 'number' ? edison.clipDiameter : 6.2;
  const phiRibs = edison.phiRibsEnabled === true;
  const spiralTwist = typeof edison.spiralTwist === 'number' ? edison.spiralTwist : 180;
  
  const baseParams: Record<string, { dia: number; pitch: number }> = {
    "e26": { dia: 26.5, pitch: 3.629 },
    "e27": { dia: 27, pitch: 3.629 },
    "e14": { dia: 14, pitch: 2.822 },
    "none": { dia: 25, pitch: 3 },
  };
  
  const base = baseParams[screwBase] || baseParams["e26"];
  
  return `// ==========================================
//   LUMINARY ENGINE V5: UNIVERSAL
//   Scott Protocol: Thread Mating + Clip System
//   Generated by SignCraft 3D
// ==========================================

$fn = 60;

// --- SETTINGS ---
Clip_ID = ${clipDiameter};
Base_Dia = ${base.dia};
Base_Height = ${baseHeight};
Thread_Pitch = ${base.pitch};
Shell_Height = ${shellHeight};
Shell_Scale = ${shellScale};
Wall_Thickness = ${shellWallThickness};
Thread_Type = "${threadType}";
Clip_Enabled = ${clipEnabled};
Clip_Count = ${clipCount};
Phi_Ribs = ${phiRibs};
Spiral_Twist = ${spiralTwist};

// --- MODULES ---

// 1. PRECISION THREAD (Trapezoidal Profile)
module iso_thread(od, h, pitch, internal=false) {
    tolerance = internal ? 0.4 : -0.2; 
    linear_extrude(height=h, twist=-360*(h/pitch), slices=h*4)
    translate([(od/2) + tolerance, 0, 0])
    rotate([0, 0, 45]) square([1.2, 1.2], center=true);
}

// 2. LOBULAR THREAD (Hex-twist, stronger, no retractions)
module lobular_thread(h, d, pitch) {
    linear_extrude(height=h, twist=-360*(h/pitch))
    offset(r=1) circle(d=d, $fn=6);
}

// 3. THE DISTINCT CLIP (C-Clamp LED Holder)
module clip_hand(angle) {
    rotate([0, 0, angle]) translate([0, -2, 0]) {
        // The Stem (Standoff)
        translate([0, -3, 0]) cube([2, 6, 3], center=true);
        
        // The C-Clamp
        translate([0, -6, 0]) rotate([90, 0, 0])
        difference() {
            cylinder(h=4, d=Clip_ID + 2.5);
            translate([0,0,-1]) cylinder(h=6, d=Clip_ID);
            translate([Clip_ID/1.5, 0, 2]) cube([Clip_ID, Clip_ID, 10], center=true);
        }
    }
}

// 4. THE CORE CHASSIS
module chassis() {
    color("Orange")
    translate([0,0,Base_Height+10])
    union() {
        // Base Plug (Threaded Male)
        translate([0,0,-10]) difference() {
            cylinder(h=10, d=Base_Dia-4);
            cylinder(h=12, d=5);
        }
        translate([0,0,-10]) 
        if (Thread_Type == "lobular") {
            lobular_thread(10, Base_Dia-4, Thread_Pitch);
        } else {
            iso_thread(Base_Dia-4, 10, Thread_Pitch, false);
        }

        // Central Spine with twist
        linear_extrude(height=Shell_Height*0.6, twist=Spiral_Twist) 
        translate([0,0]) circle(r=3);
        
        // Clips placed along the Helix
        if (Clip_Enabled) {
            clip_angle = 360 / Clip_Count;
            for(i=[0:clip_angle:360-clip_angle]) {
                rotate([0,0,i]) translate([0,0,i/6]) 
                translate([4,0,0])
                rotate([0,0,-90])
                clip_hand(0);
            }
        }
    }
}

// 5. THE POWER BASE (Female Thread)
module base() {
    color("#333")
    difference() {
        union() {
            cylinder(h=Base_Height*1.2, d=Base_Dia+4);
            // Grip Texture
            for(i=[0:30:360]) rotate([0,0,i]) 
            translate([Base_Dia/2+2, 0, 5]) 
            cylinder(h=Base_Height*0.8, d=2);
        }
        
        // Threaded Receiver
        translate([0,0,Base_Height*0.2]) {
            cylinder(h=Base_Height+5, d=Base_Dia-4.5);
            if (Thread_Type == "lobular") {
                lobular_thread(Base_Height, Base_Dia-4+0.8, Thread_Pitch);
            } else {
                iso_thread(Base_Dia-4, Base_Height, Thread_Pitch, true);
            }
        }
        
        // Wire Channel
        translate([0,0,-1]) cylinder(h=Base_Height*2, d=4);
    }
}

// 6. THE SHELL (Edison Bulb Shape)
module shell() {
    color("White", 0.2)
    translate([0,0,Base_Height])
    difference() {
        // Outer bulb body
        hull() {
            translate([0,0,0]) cylinder(h=1, d=Base_Dia);
            translate([0,0,Shell_Height*0.6]) sphere(d=50*Shell_Scale);
        }
        // Inner hollow
        hull() {
            translate([0,0,0]) cylinder(h=1, d=Base_Dia-Wall_Thickness*2);
            translate([0,0,Shell_Height*0.6]) sphere(d=50*Shell_Scale-Wall_Thickness*2);
        }
        
        // Phi-Ribs pattern (golden angle 137.5°)
        if (Phi_Ribs) {
            for(i=[0:137.5:3600]) {
                rotate([0,0,i]) 
                translate([25*Shell_Scale-1, 0, Base_Height*0.5]) 
                cylinder(h=Shell_Height*0.8, d=2);
            }
        }
    }
}

// --- RENDER ---
translate([-40, 0, 0]) base();
translate([40, 0, 0]) shell();
translate([0, 50, 0]) chassis();
`;
}

export async function generateRetroNeonSTL(settings: RetroNeonSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
      final(callback) {
        resolve(Buffer.concat(chunks));
        callback();
      }
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(writableStream);

    console.log("[RetroNeon] Generating with mode:", settings.mode);

    if (settings.mode === "edison_bulb") {
      const edison = settings.edison;
      
      // Use new shell-based fields with fallback to legacy fields
      const shellShape = edison.shellShape || edison.glassShape || "globe";
      const shellScale = edison.shellScale || 1.0;
      const shellHeight = edison.shellHeight || edison.glassHeight || 80;
      const shellWallThickness = edison.shellWallThickness || edison.glassWallThickness || 2;
      const shellMaterial = edison.shellMaterial || edison.glassMaterial || "clear";
      const openingDiameter = edison.openingDiameter || 25;
      
      // Classic bulb shapes use lathe geometry, primitive shapes use extrusion
      const isClassicBulb = ["tube", "globe", "flame", "vintage", "pear"].includes(shellShape);
      
      let shellTriangles: Triangle[] = [];
      
      if (isClassicBulb) {
        // Generate lathe-based shell for classic bulb shapes
        const diameter = 50 * shellScale;
        shellTriangles = generateGlassShell(
          shellShape,
          diameter,
          shellHeight,
          shellWallThickness
        );
      } else {
        // Generate extruded hollow shell for primitive shapes
        shellTriangles = generateHollowShapeShell(
          shellShape as PrimitiveShape,
          shellScale,
          shellHeight,
          shellWallThickness
        );
      }
      
      if (shellTriangles.length > 0) {
        archive.append(trianglesToSTL(shellTriangles), { 
          name: `shell_${shellShape}_${shellMaterial}.stl` 
        });
      }

      // Generate screw base
      if (edison.screwBase !== "none") {
        const baseTriangles = generateScrewBase(
          edison.screwBase,
          edison.baseHeight,
          openingDiameter,
          edison.wireCenterHole,
          edison.wireHoleDiameter
        );
        if (baseTriangles.length > 0) {
          archive.append(trianglesToSTL(baseTriangles), { 
            name: `screw_base_${edison.screwBase}.stl` 
          });
        }
      }

      // Generate Luminary Engine V5 OpenSCAD file with advanced features
      const luminaryScad = generateLuminaryEngineOpenSCAD(edison);
      archive.append(luminaryScad, { name: "luminary_engine_v5.scad" });
    } else {
      // Neon sign mode
      const neon = settings.neonSign;
      const { top, bottom } = generateNeonTube(neon);
      
      if (neon.splitHalf) {
        if (top.length > 0) {
          archive.append(trianglesToSTL(top), { name: `${neon.shape}_tube_top.stl` });
        }
        if (bottom.length > 0) {
          archive.append(trianglesToSTL(bottom), { name: `${neon.shape}_tube_bottom.stl` });
        }
      } else {
        const combined = [...top, ...bottom];
        if (combined.length > 0) {
          archive.append(trianglesToSTL(combined), { name: `${neon.shape}_tube.stl` });
        }
      }
    }

    // Generate electronics housing (if enabled)
    const { housing, lid } = generateElectronicsHousing(settings.housing);
    if (housing.length > 0) {
      archive.append(trianglesToSTL(housing), { name: "electronics_housing.stl" });
    }
    if (lid.length > 0) {
      archive.append(trianglesToSTL(lid), { name: "electronics_lid.stl" });
    }

    // Generate back plate (if enabled)
    if (settings.backPlateEnabled) {
      const backPlate: Triangle[] = [];
      const w = settings.backPlateWidth / 2;
      const h = settings.backPlateHeight / 2;
      const t = settings.backPlateThickness;

      // Simple rectangular plate
      const corners: Vector3[] = [
        { x: -w, y: -h, z: 0 },
        { x: w, y: -h, z: 0 },
        { x: w, y: h, z: 0 },
        { x: -w, y: h, z: 0 },
        { x: -w, y: -h, z: t },
        { x: w, y: -h, z: t },
        { x: w, y: h, z: t },
        { x: -w, y: h, z: t },
      ];

      // Bottom face
      addQuad(backPlate, corners[0], corners[1], corners[2], corners[3], true);
      // Top face
      addQuad(backPlate, corners[4], corners[7], corners[6], corners[5], true);
      // Sides
      addQuad(backPlate, corners[0], corners[4], corners[5], corners[1], false);
      addQuad(backPlate, corners[1], corners[5], corners[6], corners[2], false);
      addQuad(backPlate, corners[2], corners[6], corners[7], corners[3], false);
      addQuad(backPlate, corners[3], corners[7], corners[4], corners[0], false);

      archive.append(trianglesToSTL(backPlate), { name: "back_plate.stl" });
    }

    archive.finalize();
  });
}

export function getRetroNeonFilename(settings: RetroNeonSettings): string {
  if (settings.mode === "edison_bulb") {
    const shellShape = settings.edison.shellShape || settings.edison.glassShape || "shell";
    return `edison_${shellShape}_bulb.zip`;
  }
  return `neon_${settings.neonSign.shape}_sign.zip`;
}
