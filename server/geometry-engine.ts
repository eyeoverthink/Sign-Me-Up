/**
 * OpenSCAD Offset-Based Geometry Engine
 * 
 * A shared utility for automatic shell/lip/tolerance creation.
 * Provides parametric geometry generation for LED signage manufacturing.
 * 
 * Based on the Procedural Manufacturing Kernel Architecture:
 * - Hardware Abstraction Layer (HAL) for LED types
 * - Offset-based geometry for shells, lips, tolerances
 * - Snap-fit and friction-fit connectors
 */

// ============================================================================
// HARDWARE ABSTRACTION LAYER (HAL)
// ============================================================================

export type LightType = 
  | 'silicone_neon_6mm'
  | 'silicone_neon_8mm'
  | 'led_strip_10mm'
  | 'ws2812b_pixels'
  | 'cob_strip'
  | 'el_wire'
  | 'led_filament'
  | 'fairy_lights';

export interface HardwareProfile {
  name: string;
  channelWidth: number;      // LED channel width in mm
  channelDepth: number;      // LED channel depth in mm
  frictionLip: boolean;      // Whether to add friction lips
  lipOverhang: number;       // Lip overhang in mm (if friction lip enabled)
  wireHoleDiameter: number;  // Wire pass-through hole diameter
  minWallThickness: number;  // Minimum wall thickness for strength
  diffuserThickness: number; // Recommended diffuser thickness
}

export const HARDWARE_PROFILES: Record<LightType, HardwareProfile> = {
  silicone_neon_6mm: {
    name: 'Silicone Neon 6mm',
    channelWidth: 6.0,
    channelDepth: 6.0,
    frictionLip: true,
    lipOverhang: 0.4,
    wireHoleDiameter: 3.0,
    minWallThickness: 1.5,
    diffuserThickness: 1.2,
  },
  silicone_neon_8mm: {
    name: 'Silicone Neon 8mm',
    channelWidth: 8.0,
    channelDepth: 8.0,
    frictionLip: true,
    lipOverhang: 0.5,
    wireHoleDiameter: 4.0,
    minWallThickness: 1.5,
    diffuserThickness: 1.5,
  },
  led_strip_10mm: {
    name: 'LED Strip 10mm',
    channelWidth: 10.5,
    channelDepth: 4.0,
    frictionLip: false,
    lipOverhang: 0,
    wireHoleDiameter: 4.0,
    minWallThickness: 1.5,
    diffuserThickness: 1.5,
  },
  ws2812b_pixels: {
    name: 'WS2812B Individual Pixels',
    channelWidth: 14.0,
    channelDepth: 6.0,
    frictionLip: false,
    lipOverhang: 0,
    wireHoleDiameter: 5.0,
    minWallThickness: 2.0,
    diffuserThickness: 2.0,
  },
  cob_strip: {
    name: 'COB LED Strip',
    channelWidth: 12.0,
    channelDepth: 3.0,
    frictionLip: false,
    lipOverhang: 0,
    wireHoleDiameter: 4.0,
    minWallThickness: 1.5,
    diffuserThickness: 1.5,
  },
  el_wire: {
    name: 'EL Wire',
    channelWidth: 3.5,
    channelDepth: 3.5,
    frictionLip: true,
    lipOverhang: 0.3,
    wireHoleDiameter: 2.5,
    minWallThickness: 1.2,
    diffuserThickness: 1.0,
  },
  led_filament: {
    name: 'LED Filament',
    channelWidth: 4.0,
    channelDepth: 4.0,
    frictionLip: true,
    lipOverhang: 0.35,
    wireHoleDiameter: 2.5,
    minWallThickness: 1.2,
    diffuserThickness: 1.0,
  },
  fairy_lights: {
    name: 'Fairy Lights',
    channelWidth: 5.0,
    channelDepth: 5.0,
    frictionLip: false,
    lipOverhang: 0,
    wireHoleDiameter: 3.0,
    minWallThickness: 1.2,
    diffuserThickness: 1.2,
  },
};

// ============================================================================
// TOLERANCE & FIT PROFILES
// ============================================================================

export type FitType = 'tight' | 'normal' | 'loose' | 'press' | 'snap';

export interface ToleranceProfile {
  name: string;
  clearance: number;      // Gap between mating parts
  interference: number;   // Overlap for press/snap fits (negative clearance)
  snapDepth: number;      // Depth of snap-fit undercut
  snapAngle: number;      // Angle of snap-fit ramp (degrees)
}

export const TOLERANCE_PROFILES: Record<FitType, ToleranceProfile> = {
  tight: {
    name: 'Tight Fit',
    clearance: 0.1,
    interference: 0,
    snapDepth: 0,
    snapAngle: 0,
  },
  normal: {
    name: 'Normal Fit',
    clearance: 0.2,
    interference: 0,
    snapDepth: 0,
    snapAngle: 0,
  },
  loose: {
    name: 'Loose Fit',
    clearance: 0.4,
    interference: 0,
    snapDepth: 0,
    snapAngle: 0,
  },
  press: {
    name: 'Press Fit',
    clearance: 0,
    interference: 0.15,
    snapDepth: 0,
    snapAngle: 0,
  },
  snap: {
    name: 'Snap Fit',
    clearance: 0.15,
    interference: 0,
    snapDepth: 0.8,
    snapAngle: 45,
  },
};

// ============================================================================
// 2D GEOMETRY PRIMITIVES
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculate bounding box of a 2D path
 */
export function getBoundingBox(points: Point2D[]): BoundingBox2D {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Offset a 2D polygon by a given distance
 * Positive offset = expand outward
 * Negative offset = shrink inward
 */
export function offsetPolygon(points: Point2D[], offset: number): Point2D[] {
  if (points.length < 3 || offset === 0) return [...points];
  
  const result: Point2D[] = [];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    
    // Calculate edge vectors
    const e1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const e2 = { x: next.x - curr.x, y: next.y - curr.y };
    
    // Normalize edge vectors
    const len1 = Math.sqrt(e1.x * e1.x + e1.y * e1.y);
    const len2 = Math.sqrt(e2.x * e2.x + e2.y * e2.y);
    
    if (len1 < 0.0001 || len2 < 0.0001) {
      result.push({ ...curr });
      continue;
    }
    
    const n1 = { x: -e1.y / len1, y: e1.x / len1 };
    const n2 = { x: -e2.y / len2, y: e2.x / len2 };
    
    // Average normal
    const avgNx = n1.x + n2.x;
    const avgNy = n1.y + n2.y;
    const avgLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy);
    
    if (avgLen < 0.0001) {
      result.push({ x: curr.x + n1.x * offset, y: curr.y + n1.y * offset });
      continue;
    }
    
    // Calculate miter factor
    const dot = n1.x * n2.x + n1.y * n2.y;
    const miter = offset / Math.max(0.5, Math.sqrt((1 + dot) / 2));
    
    // Clamp miter to prevent spikes
    const clampedMiter = Math.min(miter, offset * 3);
    
    result.push({
      x: curr.x + (avgNx / avgLen) * clampedMiter,
      y: curr.y + (avgNy / avgLen) * clampedMiter,
    });
  }
  
  return result;
}

/**
 * Generate a rounded rectangle path
 */
export function roundedRectangle(
  width: number,
  height: number,
  radius: number,
  segments: number = 8
): Point2D[] {
  const points: Point2D[] = [];
  const r = Math.min(radius, Math.min(width, height) / 2);
  const hw = width / 2;
  const hh = height / 2;
  
  // Top right corner
  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI / 2) * (i / segments);
    points.push({
      x: hw - r + r * Math.cos(angle),
      y: hh - r + r * Math.sin(angle),
    });
  }
  
  // Top left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (i / segments);
    points.push({
      x: -hw + r + r * Math.cos(angle),
      y: hh - r + r * Math.sin(angle),
    });
  }
  
  // Bottom left corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / segments);
    points.push({
      x: -hw + r + r * Math.cos(angle),
      y: -hh + r + r * Math.sin(angle),
    });
  }
  
  // Bottom right corner
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI * 1.5 + (Math.PI / 2) * (i / segments);
    points.push({
      x: hw - r + r * Math.cos(angle),
      y: -hh + r + r * Math.sin(angle),
    });
  }
  
  return points;
}

/**
 * Generate a circle path
 */
export function circle(radius: number, segments: number = 32): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Generate an oval/ellipse path
 */
export function oval(radiusX: number, radiusY: number, segments: number = 32): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({
      x: radiusX * Math.cos(angle),
      y: radiusY * Math.sin(angle),
    });
  }
  return points;
}

// ============================================================================
// 3D GEOMETRY PRIMITIVES
// ============================================================================

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  v1: Point3D;
  v2: Point3D;
  v3: Point3D;
  normal?: Point3D;
}

/**
 * Calculate triangle normal
 */
export function calculateNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  
  const normal = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
  
  const length = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (length > 0.0001) {
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
  }
  
  return normal;
}

// ============================================================================
// SHELL GENERATION
// ============================================================================

export interface ShellConfig {
  outerPath: Point2D[];
  height: number;
  wallThickness: number;
  baseThickness: number;
  lightType: LightType;
  fitType: FitType;
  addFrictionLip?: boolean;
  lipHeight?: number;
}

export interface ShellResult {
  bodyTriangles: Triangle[];
  lidTriangles: Triangle[];
  channelPath: Point2D[];
  dimensions: {
    outerWidth: number;
    outerHeight: number;
    innerWidth: number;
    innerHeight: number;
    totalHeight: number;
  };
}

/**
 * Generate a complete shell with LED channel
 */
export function generateShell(config: ShellConfig): ShellResult {
  const hardware = HARDWARE_PROFILES[config.lightType];
  const tolerance = TOLERANCE_PROFILES[config.fitType];
  
  const channelWidth = hardware.channelWidth + tolerance.clearance;
  const wallThickness = Math.max(config.wallThickness, hardware.minWallThickness);
  
  // Generate paths
  const outerPath = config.outerPath;
  const innerPath = offsetPolygon(outerPath, -(wallThickness + channelWidth / 2));
  const channelPath = offsetPolygon(outerPath, -(wallThickness));
  
  // Generate body triangles
  const bodyTriangles = extrudeWalls(outerPath, innerPath, config.height);
  
  // Add base
  const baseTriangles = triangulatePath(innerPath, 0, false);
  bodyTriangles.push(...baseTriangles);
  
  // Add outer base
  const outerBaseTriangles = createRing(outerPath, innerPath, 0, false);
  bodyTriangles.push(...outerBaseTriangles);
  
  // Add friction lip if enabled
  if (config.addFrictionLip && hardware.frictionLip) {
    const lipTriangles = generateFrictionLip(
      channelPath,
      config.height,
      hardware.lipOverhang,
      config.lipHeight || 2
    );
    bodyTriangles.push(...lipTriangles);
  }
  
  // Generate lid triangles
  const lidPath = offsetPolygon(channelPath, tolerance.clearance / 2);
  const lidTriangles = generateLid(lidPath, hardware.diffuserThickness, config.fitType);
  
  // Calculate dimensions
  const outerBbox = getBoundingBox(outerPath);
  const innerBbox = getBoundingBox(innerPath);
  
  return {
    bodyTriangles,
    lidTriangles,
    channelPath,
    dimensions: {
      outerWidth: outerBbox.width,
      outerHeight: outerBbox.height,
      innerWidth: innerBbox.width,
      innerHeight: innerBbox.height,
      totalHeight: config.height + hardware.diffuserThickness,
    },
  };
}

/**
 * Extrude walls between two paths
 */
function extrudeWalls(outerPath: Point2D[], innerPath: Point2D[], height: number): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Outer walls
  for (let i = 0; i < outerPath.length; i++) {
    const j = (i + 1) % outerPath.length;
    const p1 = outerPath[i];
    const p2 = outerPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: height },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: height },
      v3: { x: p1.x, y: p1.y, z: height },
    });
  }
  
  // Inner walls
  for (let i = 0; i < innerPath.length; i++) {
    const j = (i + 1) % innerPath.length;
    const p1 = innerPath[i];
    const p2 = innerPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: height },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: 0 },
    });
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: height },
      v2: { x: p2.x, y: p2.y, z: height },
      v3: { x: p2.x, y: p2.y, z: 0 },
    });
  }
  
  // Top ring (between outer and inner)
  triangles.push(...createRing(outerPath, innerPath, height, true));
  
  return triangles;
}

/**
 * Create a ring between two paths at a given height
 */
function createRing(outerPath: Point2D[], innerPath: Point2D[], z: number, faceUp: boolean): Triangle[] {
  const triangles: Triangle[] = [];
  const n = Math.min(outerPath.length, innerPath.length);
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const o1 = outerPath[i];
    const o2 = outerPath[j];
    const i1 = innerPath[i];
    const i2 = innerPath[j];
    
    if (faceUp) {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z },
        v2: { x: i1.x, y: i1.y, z },
        v3: { x: o2.x, y: o2.y, z },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z },
        v2: { x: i2.x, y: i2.y, z },
        v3: { x: o2.x, y: o2.y, z },
      });
    } else {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z },
        v2: { x: o2.x, y: o2.y, z },
        v3: { x: i1.x, y: i1.y, z },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z },
        v2: { x: o2.x, y: o2.y, z },
        v3: { x: i2.x, y: i2.y, z },
      });
    }
  }
  
  return triangles;
}

/**
 * Triangulate a closed path (fan triangulation)
 */
function triangulatePath(path: Point2D[], z: number, faceUp: boolean): Triangle[] {
  if (path.length < 3) return [];
  
  const triangles: Triangle[] = [];
  const center = getBoundingBox(path);
  const cx = center.centerX;
  const cy = center.centerY;
  
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const p1 = path[i];
    const p2 = path[j];
    
    if (faceUp) {
      triangles.push({
        v1: { x: cx, y: cy, z },
        v2: { x: p1.x, y: p1.y, z },
        v3: { x: p2.x, y: p2.y, z },
      });
    } else {
      triangles.push({
        v1: { x: cx, y: cy, z },
        v2: { x: p2.x, y: p2.y, z },
        v3: { x: p1.x, y: p1.y, z },
      });
    }
  }
  
  return triangles;
}

/**
 * Generate friction lip geometry
 */
function generateFrictionLip(
  channelPath: Point2D[],
  baseHeight: number,
  overhang: number,
  lipHeight: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const lipPath = offsetPolygon(channelPath, -overhang);
  
  // Lip walls
  for (let i = 0; i < channelPath.length; i++) {
    const j = (i + 1) % channelPath.length;
    const c1 = channelPath[i];
    const c2 = channelPath[j];
    const l1 = lipPath[Math.min(i, lipPath.length - 1)];
    const l2 = lipPath[Math.min(j, lipPath.length - 1)];
    
    const z1 = baseHeight;
    const z2 = baseHeight + lipHeight;
    
    // Vertical wall
    triangles.push({
      v1: { x: c1.x, y: c1.y, z: z1 },
      v2: { x: c2.x, y: c2.y, z: z1 },
      v3: { x: c1.x, y: c1.y, z: z2 },
    });
    triangles.push({
      v1: { x: c2.x, y: c2.y, z: z1 },
      v2: { x: c2.x, y: c2.y, z: z2 },
      v3: { x: c1.x, y: c1.y, z: z2 },
    });
    
    // Overhang
    triangles.push({
      v1: { x: c1.x, y: c1.y, z: z2 },
      v2: { x: c2.x, y: c2.y, z: z2 },
      v3: { x: l1.x, y: l1.y, z: z2 },
    });
    triangles.push({
      v1: { x: c2.x, y: c2.y, z: z2 },
      v2: { x: l2.x, y: l2.y, z: z2 },
      v3: { x: l1.x, y: l1.y, z: z2 },
    });
  }
  
  return triangles;
}

/**
 * Generate lid geometry
 */
function generateLid(path: Point2D[], thickness: number, fitType: FitType): Triangle[] {
  const triangles: Triangle[] = [];
  const tolerance = TOLERANCE_PROFILES[fitType];
  
  // Top surface
  triangles.push(...triangulatePath(path, thickness, true));
  
  // Bottom surface
  triangles.push(...triangulatePath(path, 0, false));
  
  // Side walls
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const p1 = path[i];
    const p2 = path[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: thickness },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: thickness },
      v3: { x: p1.x, y: p1.y, z: thickness },
    });
  }
  
  // Add snap-fit features if needed
  if (fitType === 'snap' && tolerance.snapDepth > 0) {
    const snapTriangles = generateSnapFitRidge(path, thickness, tolerance);
    triangles.push(...snapTriangles);
  }
  
  return triangles;
}

/**
 * Generate snap-fit ridge around lid
 */
function generateSnapFitRidge(
  path: Point2D[],
  baseHeight: number,
  tolerance: ToleranceProfile
): Triangle[] {
  const triangles: Triangle[] = [];
  const snapDepth = tolerance.snapDepth;
  const snapAngle = (tolerance.snapAngle * Math.PI) / 180;
  
  const innerPath = offsetPolygon(path, -snapDepth);
  const ridgeHeight = snapDepth * Math.tan(snapAngle);
  
  // Create angled snap ridge
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const o1 = path[i];
    const o2 = path[j];
    const i1 = innerPath[Math.min(i, innerPath.length - 1)];
    const i2 = innerPath[Math.min(j, innerPath.length - 1)];
    
    const z1 = 0;
    const z2 = -ridgeHeight;
    
    // Angled face
    triangles.push({
      v1: { x: o1.x, y: o1.y, z: z1 },
      v2: { x: i1.x, y: i1.y, z: z2 },
      v3: { x: o2.x, y: o2.y, z: z1 },
    });
    triangles.push({
      v1: { x: i1.x, y: i1.y, z: z2 },
      v2: { x: i2.x, y: i2.y, z: z2 },
      v3: { x: o2.x, y: o2.y, z: z1 },
    });
    
    // Vertical face
    triangles.push({
      v1: { x: i1.x, y: i1.y, z: z2 },
      v2: { x: i1.x, y: i1.y, z: z1 },
      v3: { x: i2.x, y: i2.y, z: z2 },
    });
    triangles.push({
      v1: { x: i1.x, y: i1.y, z: z1 },
      v2: { x: i2.x, y: i2.y, z: z1 },
      v3: { x: i2.x, y: i2.y, z: z2 },
    });
  }
  
  return triangles;
}

// ============================================================================
// BATTERY HOLDER GENERATION
// ============================================================================

export type BatteryType = 'CR2032' | 'CR2025' | 'CR2016' | 'AAA' | 'AA' | '18650';

export interface BatteryProfile {
  name: string;
  diameter: number;
  height: number;
  voltage: number;
  capacity: string;
}

export const BATTERY_PROFILES: Record<BatteryType, BatteryProfile> = {
  CR2032: {
    name: 'CR2032 Coin Cell',
    diameter: 20.0,
    height: 3.2,
    voltage: 3.0,
    capacity: '225mAh',
  },
  CR2025: {
    name: 'CR2025 Coin Cell',
    diameter: 20.0,
    height: 2.5,
    voltage: 3.0,
    capacity: '165mAh',
  },
  CR2016: {
    name: 'CR2016 Coin Cell',
    diameter: 20.0,
    height: 1.6,
    voltage: 3.0,
    capacity: '90mAh',
  },
  AAA: {
    name: 'AAA Battery',
    diameter: 10.5,
    height: 44.5,
    voltage: 1.5,
    capacity: '1000mAh',
  },
  AA: {
    name: 'AA Battery',
    diameter: 14.5,
    height: 50.5,
    voltage: 1.5,
    capacity: '2500mAh',
  },
  '18650': {
    name: '18650 Li-Ion',
    diameter: 18.6,
    height: 65.2,
    voltage: 3.7,
    capacity: '3000mAh',
  },
};

export interface BatteryHolderConfig {
  batteryType: BatteryType;
  fitType: FitType;
  wallThickness: number;
  includeSnapLid: boolean;
  includeWireChannels: boolean;
  wireChannelDiameter: number;
}

export interface BatteryHolderResult {
  baseTriangles: Triangle[];
  lidTriangles: Triangle[];
  dimensions: {
    outerDiameter: number;
    outerHeight: number;
    innerDiameter: number;
    innerHeight: number;
  };
}

/**
 * Generate a battery holder for coin cells or cylindrical batteries
 */
export function generateBatteryHolder(config: BatteryHolderConfig): BatteryHolderResult {
  const battery = BATTERY_PROFILES[config.batteryType];
  const tolerance = TOLERANCE_PROFILES[config.fitType];
  
  const innerDiameter = battery.diameter + tolerance.clearance;
  const innerHeight = battery.height + tolerance.clearance;
  const outerDiameter = innerDiameter + config.wallThickness * 2;
  const outerHeight = innerHeight + config.wallThickness;
  
  const segments = 32;
  
  // Generate base (holder body)
  const outerPath = circle(outerDiameter / 2, segments);
  const innerPath = circle(innerDiameter / 2, segments);
  
  const baseTriangles: Triangle[] = [];
  
  // Outer walls
  baseTriangles.push(...extrudeWalls(outerPath, innerPath, outerHeight));
  
  // Bottom
  baseTriangles.push(...triangulatePath(outerPath, 0, false));
  
  // Add snap posts if snap lid enabled
  if (config.includeSnapLid) {
    const snapPosts = generateSnapPosts(outerDiameter / 2, outerHeight, 4);
    baseTriangles.push(...snapPosts);
  }
  
  // Add wire channels if enabled
  if (config.includeWireChannels) {
    // Wire channel would be a boolean subtraction - simplified here
    // In full implementation, would subtract cylindrical holes
  }
  
  // Generate lid
  const lidTriangles: Triangle[] = [];
  if (config.includeSnapLid) {
    const lidPath = circle(outerDiameter / 2 - tolerance.clearance, segments);
    lidTriangles.push(...generateLid(lidPath, config.wallThickness, 'snap'));
  }
  
  return {
    baseTriangles,
    lidTriangles,
    dimensions: {
      outerDiameter,
      outerHeight,
      innerDiameter,
      innerHeight,
    },
  };
}

/**
 * Generate snap posts around perimeter
 */
function generateSnapPosts(radius: number, height: number, count: number): Triangle[] {
  const triangles: Triangle[] = [];
  const postWidth = 2;
  const postDepth = 1.5;
  const postHeight = 3;
  
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const cx = radius * Math.cos(angle);
    const cy = radius * Math.sin(angle);
    
    // Simple rectangular post
    const hw = postWidth / 2;
    const postPath: Point2D[] = [
      { x: cx - hw, y: cy - postDepth / 2 },
      { x: cx + hw, y: cy - postDepth / 2 },
      { x: cx + hw, y: cy + postDepth / 2 },
      { x: cx - hw, y: cy + postDepth / 2 },
    ];
    
    // Extrude post
    for (let j = 0; j < postPath.length; j++) {
      const k = (j + 1) % postPath.length;
      const p1 = postPath[j];
      const p2 = postPath[k];
      
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: height },
        v2: { x: p2.x, y: p2.y, z: height },
        v3: { x: p1.x, y: p1.y, z: height + postHeight },
      });
      triangles.push({
        v1: { x: p2.x, y: p2.y, z: height },
        v2: { x: p2.x, y: p2.y, z: height + postHeight },
        v3: { x: p1.x, y: p1.y, z: height + postHeight },
      });
    }
    
    // Top cap
    triangles.push(...triangulatePath(postPath, height + postHeight, true));
  }
  
  return triangles;
}

// ============================================================================
// STL EXPORT
// ============================================================================

/**
 * Convert triangles to binary STL format
 */
export function trianglesToSTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleSize = 50; // 12 bytes normal + 36 bytes vertices + 2 bytes attribute
  const bufferSize = headerSize + 4 + triangles.length * triangleSize;
  
  const buffer = Buffer.alloc(bufferSize);
  let offset = 0;
  
  // Header (80 bytes)
  buffer.write('SignCraft 3D Geometry Engine', 0);
  offset = 80;
  
  // Triangle count (4 bytes)
  buffer.writeUInt32LE(triangles.length, offset);
  offset += 4;
  
  // Write triangles
  for (const tri of triangles) {
    const normal = tri.normal || calculateNormal(tri.v1, tri.v2, tri.v3);
    
    // Normal vector (12 bytes)
    buffer.writeFloatLE(normal.x, offset); offset += 4;
    buffer.writeFloatLE(normal.y, offset); offset += 4;
    buffer.writeFloatLE(normal.z, offset); offset += 4;
    
    // Vertex 1 (12 bytes)
    buffer.writeFloatLE(tri.v1.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.z, offset); offset += 4;
    
    // Vertex 2 (12 bytes)
    buffer.writeFloatLE(tri.v2.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.z, offset); offset += 4;
    
    // Vertex 3 (12 bytes)
    buffer.writeFloatLE(tri.v3.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.z, offset); offset += 4;
    
    // Attribute byte count (2 bytes)
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  
  return buffer;
}

/**
 * Generate OpenSCAD code for the geometry
 */
export function generateOpenSCAD(config: ShellConfig): string {
  const hardware = HARDWARE_PROFILES[config.lightType];
  const tolerance = TOLERANCE_PROFILES[config.fitType];
  
  return `
// SignCraft 3D - OpenSCAD Geometry Engine Export
// Generated: ${new Date().toISOString()}

// ============ PARAMETERS ============
Letter = "A";  // Change this for different letters
Font_Name = "Arial";  // Font to use
Font_Size = 100;  // Font size in mm

// Hardware Profile: ${hardware.name}
Channel_Width = ${hardware.channelWidth};
Channel_Depth = ${hardware.channelDepth};
Friction_Lip = ${hardware.frictionLip};
Lip_Overhang = ${hardware.lipOverhang};
Wire_Hole_Diameter = ${hardware.wireHoleDiameter};
Min_Wall_Thickness = ${hardware.minWallThickness};
Diffuser_Thickness = ${hardware.diffuserThickness};

// Tolerance Profile: ${tolerance.name}
Clearance = ${tolerance.clearance};
Snap_Depth = ${tolerance.snapDepth};
Snap_Angle = ${tolerance.snapAngle};

// Shell Parameters
Sign_Height = ${config.height};
Wall_Thickness = ${config.wallThickness};
Base_Thickness = ${config.baseThickness};

// Render Mode
Render_Mode = "Body";  // [Body, Lid, Assembly, Assembly_Exploded]

// ============ MODULES ============

module letter_shape() {
    text(text=Letter, size=Font_Size, font=Font_Name, 
         halign="center", valign="center");
}

module body_geometry() {
    difference() {
        // Outer shell
        linear_extrude(Sign_Height)
            offset(r = Channel_Width/2 + Wall_Thickness)
            letter_shape();
        
        // LED channel
        translate([0, 0, Base_Thickness])
            linear_extrude(Sign_Height)
            offset(r = Channel_Width/2)
            letter_shape();
    }
    
    // Friction lip
    if (Friction_Lip) {
        translate([0, 0, Sign_Height])
            linear_extrude(2)
            difference() {
                offset(r = Channel_Width/2)
                    letter_shape();
                offset(r = Channel_Width/2 - Lip_Overhang)
                    letter_shape();
            }
    }
}

module lid_geometry() {
    linear_extrude(Diffuser_Thickness)
        offset(r = Channel_Width/2 - Clearance)
        letter_shape();
}

// ============ RENDER ============

if (Render_Mode == "Body") {
    body_geometry();
} else if (Render_Mode == "Lid") {
    lid_geometry();
} else if (Render_Mode == "Assembly") {
    color("Grey") body_geometry();
    color("White", 0.8) translate([0, 0, Sign_Height]) lid_geometry();
} else if (Render_Mode == "Assembly_Exploded") {
    color("Grey") body_geometry();
    color("White", 0.8) translate([0, 0, Sign_Height + 20]) lid_geometry();
}
`.trim();
}
