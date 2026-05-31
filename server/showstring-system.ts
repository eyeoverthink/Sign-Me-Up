/**
 * ShowString Modular Tracing System
 * 
 * A continuous, whimsical, cartoon-like tracing system that converts
 * any image into smooth, hollow tube-like paths that can be 3D printed
 * as multi-layer light boxes with different diffusion materials.
 * 
 * Core Concepts:
 * - ShowString: A hollow tube you can bend any direction - consistent design
 * - Modular Primitives: Tetris-like pieces (curves, straights, junctions)
 * - Continuous Path: One unbroken snake forming entire shapes/letters
 * - Multi-Layer Z-Depth: Different diffusion at each layer
 */

import { Point2D, douglasPeucker, traceBoundary, applyThreshold, findStartPoint } from './scott-algorithm';

// ============================================================================
// SHOWSTRING TUBE PRIMITIVES
// Like Tetris pieces - minimal set that can build anything
// ============================================================================

export type TubePrimitiveType = 
  | 'straight'      // |  - linear segment
  | 'curve_90'      // ⌐  - 90° bend
  | 'curve_45'      // /  - 45° gentle curve
  | 'curve_135'     // ⌝  - 135° sharp bend
  | 'curve_180'     // ⌒  - U-turn
  | 't_junction'    // ┬  - 3-way split
  | 'cross'         // ┼  - 4-way intersection
  | 'end_cap'       // •  - terminal end
  | 'y_junction'    // Y  - organic 3-way
  | 'spiral_in'     // @  - inward spiral
  | 'spiral_out';   // ◎  - outward spiral

export interface TubePrimitive {
  type: TubePrimitiveType;
  length: number;           // mm - segment length
  angle: number;            // degrees - rotation from entry
  innerDiameter: number;    // mm - hollow core for LED
  wallThickness: number;    // mm - tube wall
  entryAngle: number;       // where it connects from
  exitAngles: number[];     // where it can connect to (multiple for junctions)
}

export interface ShowStringPath {
  primitives: TubePrimitive[];
  totalLength: number;
  isClosed: boolean;
  zLevel: number;           // for multi-layer light box
}

export interface MultiLayerLightBox {
  layers: ShowStringLayer[];
  baseWidth: number;
  baseHeight: number;
  baseDepth: number;
  diffusionType: 'clamshell' | 'flat' | 'domed';
}

export interface ShowStringLayer {
  path: ShowStringPath;
  zLevel: number;           // -3 = far back, 0 = front
  material: 'clear' | 'frosted' | 'white' | 'colored';
  diffusionStrength: number; // 0-1
  color?: string;           // hex color for colored material
}

// ============================================================================
// SHOWSTRING TRACE ALGORITHM
// Converts any image to smooth, cartoon-like, whimsical curves
// ============================================================================

export interface ShowStringTraceOptions {
  smoothingPasses: number;      // how many times to smooth (3-5 typical)
  cornerRadius: number;         // mm - how rounded corners are
  minSegmentLength: number;     // mm - shortest allowed segment
  strokeWidth: number;          // mm - width of the "string"
  whimsyFactor: number;         // 0-1 - adds organic wobble
  simplificationTolerance: number; // Douglas-Peucker tolerance
}

export const DEFAULT_TRACE_OPTIONS: ShowStringTraceOptions = {
  smoothingPasses: 4,
  cornerRadius: 2.0,
  minSegmentLength: 1.0,
  strokeWidth: 3.0,
  whimsyFactor: 0.15,
  simplificationTolerance: 1.5,
};

/**
 * Chaikin's corner-cutting algorithm for smooth curves
 * Each pass makes corners more rounded
 */
function chaikinSmooth(points: Point2D[], iterations: number = 3): Point2D[] {
  let result = [...points];
  
  for (let iter = 0; iter < iterations; iter++) {
    const newPoints: Point2D[] = [];
    
    for (let i = 0; i < result.length - 1; i++) {
      const p0 = result[i];
      const p1 = result[i + 1];
      
      // 1/4 and 3/4 points along segment
      newPoints.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      newPoints.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
    
    // Add last point for open curves
    if (result.length > 0) {
      newPoints.push(result[result.length - 1]);
    }
    
    result = newPoints;
  }
  
  return result;
}

/**
 * Catmull-Rom spline interpolation for buttery-smooth curves
 */
function catmullRomSpline(
  points: Point2D[],
  tension: number = 0.5,
  pointsPerSegment: number = 10
): Point2D[] {
  if (points.length < 4) return points;
  
  const result: Point2D[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    for (let t = 0; t < pointsPerSegment; t++) {
      const s = t / pointsPerSegment;
      const s2 = s * s;
      const s3 = s2 * s;
      
      // Catmull-Rom basis functions
      const h1 = -tension * s3 + 2 * tension * s2 - tension * s;
      const h2 = (2 - tension) * s3 + (tension - 3) * s2 + 1;
      const h3 = (tension - 2) * s3 + (3 - 2 * tension) * s2 + tension * s;
      const h4 = tension * s3 - tension * s2;
      
      result.push({
        x: h1 * p0.x + h2 * p1.x + h3 * p2.x + h4 * p3.x,
        y: h1 * p0.y + h2 * p1.y + h3 * p2.y + h4 * p3.y,
      });
    }
  }
  
  // Add final point
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * Add whimsy - subtle organic wobble for cartoon feel
 */
function addWhimsy(points: Point2D[], factor: number, seed: number = 42): Point2D[] {
  if (factor <= 0) return points;
  
  // Simple seeded random for reproducibility
  let random = seed;
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    return (random / 0x7fffffff) * 2 - 1; // -1 to 1
  };
  
  return points.map((p, i) => {
    // Vary wobble along the path using sine for organic feel
    const wobbleScale = Math.sin(i * 0.1) * factor;
    const perpX = nextRandom() * wobbleScale;
    const perpY = nextRandom() * wobbleScale;
    
    return {
      x: p.x + perpX,
      y: p.y + perpY,
    };
  });
}

/**
 * Main ShowString trace function
 * Converts raw boundary points to smooth, whimsical cartoon curves
 */
export function showStringTrace(
  boundaryPoints: Point2D[],
  options: Partial<ShowStringTraceOptions> = {}
): Point2D[] {
  const opts = { ...DEFAULT_TRACE_OPTIONS, ...options };
  
  if (boundaryPoints.length < 3) return boundaryPoints;
  
  // Step 1: Simplify with Douglas-Peucker to remove noise
  let points = douglasPeucker(boundaryPoints, opts.simplificationTolerance);
  
  // Step 2: Apply Chaikin smoothing for rounded corners
  points = chaikinSmooth(points, opts.smoothingPasses);
  
  // Step 3: Catmull-Rom interpolation for buttery curves
  points = catmullRomSpline(points, 0.5, 8);
  
  // Step 4: Add whimsy for cartoon feel
  points = addWhimsy(points, opts.whimsyFactor);
  
  // Step 5: Final simplification to remove excess points
  points = douglasPeucker(points, opts.minSegmentLength * 0.5);
  
  return points;
}

/**
 * Trace from image data to ShowString path
 */
export function traceImageToShowString(
  imageData: number[],  // RGBA flat array
  width: number,
  height: number,
  threshold: number = 128,
  options: Partial<ShowStringTraceOptions> = {}
): Point2D[] {
  // Convert to grayscale
  const grayscale: number[] = [];
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    grayscale.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  // Apply threshold
  const binary = applyThreshold(grayscale, threshold);
  
  // Find start point
  const start = findStartPoint(binary, width, height);
  if (!start) return [];
  
  // Trace boundary
  const boundary = traceBoundary(binary, width, height, start.x, start.y);
  
  // Apply ShowString smoothing
  return showStringTrace(boundary, options);
}

// ============================================================================
// CONTINUOUS PATH SOLVER (SNAKE ALGORITHM)
// Finds single unbroken path through traced shape
// ============================================================================

interface PathNode {
  point: Point2D;
  connections: number[]; // indices of connected nodes
  visited: boolean;
}

/**
 * Build connection graph from path points
 * Points within connectionRadius are considered connected
 */
function buildConnectionGraph(
  points: Point2D[],
  connectionRadius: number
): PathNode[] {
  const nodes: PathNode[] = points.map(p => ({
    point: p,
    connections: [],
    visited: false,
  }));
  
  // Find connections based on proximity
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= connectionRadius) {
        nodes[i].connections.push(j);
        nodes[j].connections.push(i);
      }
    }
    
    // Also connect sequential points
    if (i < points.length - 1) {
      if (!nodes[i].connections.includes(i + 1)) {
        nodes[i].connections.push(i + 1);
        nodes[i + 1].connections.push(i);
      }
    }
  }
  
  return nodes;
}

/**
 * Eulerian path finder - visits every edge exactly once
 * For ShowString: every segment of the trace becomes tube
 */
export function findContinuousPath(
  points: Point2D[],
  connectionRadius: number = 5
): Point2D[] {
  if (points.length < 2) return points;
  
  const nodes = buildConnectionGraph(points, connectionRadius);
  
  // Find node with odd degree (Eulerian path start) or use first node
  let startIdx = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].connections.length % 2 === 1) {
      startIdx = i;
      break;
    }
  }
  
  // Hierholzer's algorithm for Eulerian path
  const path: number[] = [];
  const stack: number[] = [startIdx];
  const edgesUsed: Set<string> = new Set();
  
  const edgeKey = (a: number, b: number) => 
    a < b ? `${a}-${b}` : `${b}-${a}`;
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const node = nodes[current];
    
    // Find unused edge
    let foundEdge = false;
    for (const next of node.connections) {
      const key = edgeKey(current, next);
      if (!edgesUsed.has(key)) {
        edgesUsed.add(key);
        stack.push(next);
        foundEdge = true;
        break;
      }
    }
    
    if (!foundEdge) {
      path.push(stack.pop()!);
    }
  }
  
  // Convert indices back to points
  return path.reverse().map(i => nodes[i].point);
}

// ============================================================================
// MODULAR TUBE PRIMITIVE GENERATOR
// Creates 3D geometry for each primitive type
// ============================================================================

export interface TubeGeometry {
  vertices: [number, number, number][];
  faces: [number, number, number][]; // triangle indices
  normals: [number, number, number][];
}

/**
 * Generate cross-section circle points
 */
function generateCirclePoints(
  radius: number,
  segments: number = 16
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    points.push([
      radius * Math.cos(theta),
      radius * Math.sin(theta),
    ]);
  }
  return points;
}

/**
 * Generate hollow tube along a path
 * This is the core of the ShowString clamshell design
 * 
 * @param path - 2D path points
 * @param innerRadius - hollow core radius for LED
 * @param outerRadius - outer wall radius
 * @param tubeHeight - height/thickness of tube cross-section
 * @param zOffset - Z-level offset for multi-layer stacking
 * @param segments - circular segments for tube cross-section
 */
export function generateHollowTube(
  path: Point2D[],
  innerRadius: number,
  outerRadius: number,
  tubeHeight: number,
  zOffset: number = 0,
  segments: number = 16
): TubeGeometry {
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  
  // Input validation
  if (path.length < 2) {
    return { vertices, faces, normals };
  }
  if (tubeHeight <= 0) {
    tubeHeight = 6; // Default tube height
  }
  if (outerRadius <= 0) {
    outerRadius = 3; // Default outer radius
  }
  
  // Handle solid tubes (no hollow core) by setting innerRadius to 0
  const isSolid = innerRadius <= 0;
  const effectiveInnerRadius = isSolid ? 0 : Math.min(innerRadius, outerRadius * 0.9);
  
  const outerCircle = generateCirclePoints(outerRadius, segments);
  const innerCircle = isSolid ? [] : generateCirclePoints(effectiveInnerRadius, segments);
  
  // Generate vertices along path
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    
    // Calculate tangent direction for orientation
    let tangent: [number, number];
    if (i === 0) {
      tangent = [path[1].x - p.x, path[1].y - p.y];
    } else if (i === path.length - 1) {
      tangent = [p.x - path[i - 1].x, p.y - path[i - 1].y];
    } else {
      tangent = [
        (path[i + 1].x - path[i - 1].x) / 2,
        (path[i + 1].y - path[i - 1].y) / 2,
      ];
    }
    
    // Normalize tangent
    const tLen = Math.sqrt(tangent[0] ** 2 + tangent[1] ** 2);
    if (tLen > 0.0001) {
      tangent[0] /= tLen;
      tangent[1] /= tLen;
    }
    
    // Calculate rotation angle from tangent
    const angle = Math.atan2(tangent[1], tangent[0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Generate tube cross-section as an ellipse in XZ plane
    // XY extent uses outerRadius for width, Z extent uses tubeHeight for height
    // This creates a "clamshell" style tube - wider than tall
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * 2 * Math.PI;
      // Ellipse: x = outerRadius*cos(theta), z = (tubeHeight/2)*sin(theta)
      const localX = outerRadius * Math.cos(theta);
      const localZ = (tubeHeight / 2) * Math.sin(theta);
      
      // Rotate local X by path tangent (around Z axis)
      const rx = localX * cos;
      const ry = localX * sin;
      // Z offset by layer position + tube center
      const z = zOffset + tubeHeight / 2 + localZ;
      
      vertices.push([p.x + rx, p.y + ry, z]);
    }
    
    // Inner ring for hollow tubes - same ellipse ratio
    if (!isSolid) {
      // Inner radius ratio preserves the elliptical shape
      const innerZRatio = effectiveInnerRadius / outerRadius;
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * 2 * Math.PI;
        const localX = effectiveInnerRadius * Math.cos(theta);
        const localZ = (tubeHeight / 2) * innerZRatio * Math.sin(theta);
        
        const rx = localX * cos;
        const ry = localX * sin;
        const z = zOffset + tubeHeight / 2 + localZ;
        
        vertices.push([p.x + rx, p.y + ry, z]);
      }
    }
  }
  
  // Generate faces connecting rings
  // For solid tubes: only outer ring. For hollow: outer + inner
  const ringSize = isSolid ? segments : segments * 2;
  
  for (let i = 0; i < path.length - 1; i++) {
    const baseIdx = i * ringSize;
    const nextBaseIdx = (i + 1) * ringSize;
    
    // Outer surface
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      
      faces.push([
        baseIdx + j,
        nextBaseIdx + j,
        baseIdx + j1,
      ]);
      faces.push([
        baseIdx + j1,
        nextBaseIdx + j,
        nextBaseIdx + j1,
      ]);
    }
    
    // Inner surface (reversed winding) - only for hollow tubes
    if (!isSolid) {
      for (let j = 0; j < segments; j++) {
        const j1 = (j + 1) % segments;
        const innerOffset = segments;
        
        faces.push([
          baseIdx + innerOffset + j,
          baseIdx + innerOffset + j1,
          nextBaseIdx + innerOffset + j,
        ]);
        faces.push([
          baseIdx + innerOffset + j1,
          nextBaseIdx + innerOffset + j1,
          nextBaseIdx + innerOffset + j,
        ]);
      }
    }
  }
  
  // Add end caps for watertight mesh using actual first/last ring vertices
  if (isSolid) {
    // Solid tube: cap with center vertex at geometric center of ring
    // Calculate average position of first ring for center
    let startCx = 0, startCy = 0, startCz = 0;
    for (let j = 0; j < segments; j++) {
      startCx += vertices[j][0];
      startCy += vertices[j][1];
      startCz += vertices[j][2];
    }
    const startCenter: [number, number, number] = [
      startCx / segments,
      startCy / segments,
      startCz / segments,
    ];
    const startCenterIdx = vertices.length;
    vertices.push(startCenter);
    
    // Create start cap fan (reversed winding for back-facing)
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      faces.push([startCenterIdx, j1, j]);
    }
    
    // Calculate average position of last ring for center
    const endBaseIdx = (path.length - 1) * ringSize;
    let endCx = 0, endCy = 0, endCz = 0;
    for (let j = 0; j < segments; j++) {
      endCx += vertices[endBaseIdx + j][0];
      endCy += vertices[endBaseIdx + j][1];
      endCz += vertices[endBaseIdx + j][2];
    }
    const endCenter: [number, number, number] = [
      endCx / segments,
      endCy / segments,
      endCz / segments,
    ];
    const endCenterIdx = vertices.length;
    vertices.push(endCenter);
    
    // Create end cap fan
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      faces.push([endCenterIdx, endBaseIdx + j, endBaseIdx + j1]);
    }
  } else {
    // Hollow tube: annular caps connecting outer to inner ring
    // Start cap - connects first outer ring to first inner ring
    const startOuter = 0;
    const startInner = segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      faces.push([startOuter + j, startInner + j, startOuter + j1]);
      faces.push([startOuter + j1, startInner + j, startInner + j1]);
    }
    
    // End cap - connects last outer ring to last inner ring
    const endBaseIdx = (path.length - 1) * ringSize;
    const endOuter = endBaseIdx;
    const endInner = endBaseIdx + segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      faces.push([endOuter + j, endOuter + j1, endInner + j]);
      faces.push([endOuter + j1, endInner + j1, endInner + j]);
    }
  }
  
  // Generate normals for each face
  for (const face of faces) {
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    
    const e1: [number, number, number] = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2: [number, number, number] = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    const normal: [number, number, number] = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    
    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (len > 0) {
      normal[0] /= len;
      normal[1] /= len;
      normal[2] /= len;
    }
    
    normals.push(normal);
  }
  
  return { vertices, faces, normals };
}

// ============================================================================
// MULTI-LAYER LIGHT BOX GENERATOR
// Creates layered light box with different Z-depths and diffusions
// ============================================================================

export interface LightBoxLayer {
  zLevel: number;           // -3 to 0 (back to front)
  zOffset: number;          // actual mm offset
  path: Point2D[];
  diffusion: 'none' | 'light' | 'medium' | 'heavy';
  color?: string;
  description: string;
}

export interface LightBoxConfig {
  width: number;
  height: number;
  totalDepth: number;       // total depth of light box
  layerSpacing: number;     // mm between layers
  frameThickness: number;   // mm - outer frame
  ledChannelWidth: number;  // mm - channel for LED strip
  diffusionStyle: 'clamshell' | 'flat' | 'layered';
}

const DEFAULT_LIGHTBOX_CONFIG: LightBoxConfig = {
  width: 200,
  height: 150,
  totalDepth: 30,
  layerSpacing: 5,
  frameThickness: 3,
  ledChannelWidth: 12,
  diffusionStyle: 'clamshell',
};

/**
 * Generate multi-layer light box from traced layers
 * Each layer is a ShowString tube at a specific Z depth
 */
export function generateMultiLayerLightBox(
  layers: LightBoxLayer[],
  config: Partial<LightBoxConfig> = {}
): {
  layers: { geometry: TubeGeometry; layer: LightBoxLayer }[];
  frame: TubeGeometry;
  backplate: TubeGeometry;
} {
  const cfg = { ...DEFAULT_LIGHTBOX_CONFIG, ...config };
  
  // Sort layers by Z level (back to front: -3 = furthest back, 0 = front)
  const sortedLayers = [...layers].sort((a, b) => a.zLevel - b.zLevel);
  
  // Standard tube height for all layers
  const tubeHeight = 6; // mm - consistent tube cross-section
  
  // Generate geometry for each layer
  const layerGeometries = sortedLayers.map(layer => {
    // Calculate actual Z offset: zLevel -3 to 0 maps to back to front
    // zLevel -3 = 0mm offset (back), zLevel 0 = 3 * layerSpacing (front)
    const zOffset = (layer.zLevel + 3) * cfg.layerSpacing;
    
    // Determine tube dimensions based on diffusion level
    // Heavy diffusion = thicker walls, smaller LED channel
    let innerRadius = 1.5;
    let outerRadius = 3.0;
    
    switch (layer.diffusion) {
      case 'none':
        innerRadius = 2.5;
        outerRadius = 3.0;
        break;
      case 'light':
        innerRadius = 2.0;
        outerRadius = 3.5;
        break;
      case 'medium':
        innerRadius = 1.5;
        outerRadius = 4.0;
        break;
      case 'heavy':
        innerRadius = 1.0;
        outerRadius = 5.0;
        break;
    }
    
    // Generate tube geometry with proper Z offset for stacking
    const geometry = generateHollowTube(
      layer.path,
      innerRadius,
      outerRadius,
      tubeHeight,
      zOffset,  // Z position for this layer
      16        // segments
    );
    
    return { geometry, layer };
  });
  
  // Generate frame that spans full depth
  const framePoints: Point2D[] = [
    { x: 0, y: 0 },
    { x: cfg.width, y: 0 },
    { x: cfg.width, y: cfg.height },
    { x: 0, y: cfg.height },
    { x: 0, y: 0 },
  ];
  
  const frame = generateHollowTube(
    framePoints,
    cfg.ledChannelWidth / 2,
    cfg.frameThickness + cfg.ledChannelWidth / 2,
    cfg.totalDepth,
    0,  // frame starts at z=0
    16
  );
  
  // Generate backplate (simple rectangle extrusion)
  const backplatePoints: Point2D[] = [
    { x: cfg.frameThickness, y: cfg.frameThickness },
    { x: cfg.width - cfg.frameThickness, y: cfg.frameThickness },
    { x: cfg.width - cfg.frameThickness, y: cfg.height - cfg.frameThickness },
    { x: cfg.frameThickness, y: cfg.height - cfg.frameThickness },
    { x: cfg.frameThickness, y: cfg.frameThickness },
  ];
  
  const backplate = generateHollowTube(
    backplatePoints,
    0,                    // no hollow core for backplate
    cfg.frameThickness,   // outer radius = frame thickness
    2,                    // thin backplate height
    -2,                   // slightly behind z=0
    16
  );
  
  return {
    layers: layerGeometries,
    frame,
    backplate,
  };
}

// ============================================================================
// MODULAR TUBE PRIMITIVES
// Tetris-like pieces that connect to form any shape
// ============================================================================

/**
 * Generate a straight tube primitive
 */
export function generateStraightPrimitive(
  length: number,
  innerRadius: number = 1.5,
  outerRadius: number = 3.0,
  tubeHeight: number = 6,
  segments: number = 16
): TubeGeometry {
  const path: Point2D[] = [
    { x: 0, y: 0 },
    { x: length, y: 0 },
  ];
  return generateHollowTube(path, innerRadius, outerRadius, tubeHeight, 0, segments);
}

/**
 * Generate a curved tube primitive (arc)
 * @param angle - arc angle in degrees (90, 45, 135, 180)
 * @param radius - arc radius
 */
export function generateCurvePrimitive(
  angle: number,
  radius: number = 20,
  innerTubeRadius: number = 1.5,
  outerTubeRadius: number = 3.0,
  tubeHeight: number = 6,
  segments: number = 16
): TubeGeometry {
  const path: Point2D[] = [];
  const angleRad = (angle * Math.PI) / 180;
  const steps = Math.max(8, Math.ceil(angle / 5)); // More points for smoother curves
  
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * angleRad;
    path.push({
      x: radius * Math.sin(t),
      y: radius * (1 - Math.cos(t)),
    });
  }
  
  return generateHollowTube(path, innerTubeRadius, outerTubeRadius, tubeHeight, 0, segments);
}

/**
 * Generate T-junction primitive (3-way connector)
 */
export function generateTJunctionPrimitive(
  armLength: number = 15,
  innerRadius: number = 1.5,
  outerRadius: number = 3.0,
  tubeHeight: number = 6
): TubeGeometry {
  // T-junction is three connected arms
  const mainPath: Point2D[] = [
    { x: -armLength, y: 0 },
    { x: 0, y: 0 },
    { x: armLength, y: 0 },
  ];
  
  const branchPath: Point2D[] = [
    { x: 0, y: 0 },
    { x: 0, y: armLength },
  ];
  
  // Generate both and combine
  const main = generateHollowTube(mainPath, innerRadius, outerRadius, tubeHeight, 0, 16);
  const branch = generateHollowTube(branchPath, innerRadius, outerRadius, tubeHeight, 0, 16);
  
  // Combine geometries
  const vertexOffset = main.vertices.length;
  return {
    vertices: [...main.vertices, ...branch.vertices],
    faces: [
      ...main.faces,
      ...branch.faces.map(f => [
        f[0] + vertexOffset,
        f[1] + vertexOffset,
        f[2] + vertexOffset,
      ] as [number, number, number]),
    ],
    normals: [...main.normals, ...branch.normals],
  };
}

/**
 * Generate cross (4-way) junction primitive
 */
export function generateCrossJunctionPrimitive(
  armLength: number = 15,
  innerRadius: number = 1.5,
  outerRadius: number = 3.0,
  tubeHeight: number = 6
): TubeGeometry {
  const horizontal: Point2D[] = [
    { x: -armLength, y: 0 },
    { x: 0, y: 0 },
    { x: armLength, y: 0 },
  ];
  
  const vertical: Point2D[] = [
    { x: 0, y: -armLength },
    { x: 0, y: 0 },
    { x: 0, y: armLength },
  ];
  
  const h = generateHollowTube(horizontal, innerRadius, outerRadius, tubeHeight, 0, 16);
  const v = generateHollowTube(vertical, innerRadius, outerRadius, tubeHeight, 0, 16);
  
  const vertexOffset = h.vertices.length;
  return {
    vertices: [...h.vertices, ...v.vertices],
    faces: [
      ...h.faces,
      ...v.faces.map(f => [
        f[0] + vertexOffset,
        f[1] + vertexOffset,
        f[2] + vertexOffset,
      ] as [number, number, number]),
    ],
    normals: [...h.normals, ...v.normals],
  };
}

/**
 * Generate end cap primitive (rounded terminal)
 */
export function generateEndCapPrimitive(
  outerRadius: number = 3.0,
  tubeHeight: number = 6
): TubeGeometry {
  // Simple hemispherical end cap
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  
  const segments = 16;
  const rings = 8;
  
  // Generate hemisphere vertices
  for (let ring = 0; ring <= rings; ring++) {
    const phi = (ring / rings) * (Math.PI / 2);
    const ringRadius = outerRadius * Math.cos(phi);
    const z = tubeHeight / 2 + outerRadius * Math.sin(phi);
    
    for (let seg = 0; seg < segments; seg++) {
      const theta = (seg / segments) * 2 * Math.PI;
      vertices.push([
        ringRadius * Math.cos(theta),
        ringRadius * Math.sin(theta),
        z,
      ]);
    }
  }
  
  // Generate faces
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const current = ring * segments + seg;
      const next = ring * segments + ((seg + 1) % segments);
      const above = (ring + 1) * segments + seg;
      const aboveNext = (ring + 1) * segments + ((seg + 1) % segments);
      
      faces.push([current, above, next]);
      faces.push([next, above, aboveNext]);
    }
  }
  
  // Calculate normals
  for (const face of faces) {
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    
    const e1: [number, number, number] = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2: [number, number, number] = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    const normal: [number, number, number] = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    
    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (len > 0) {
      normal[0] /= len;
      normal[1] /= len;
      normal[2] /= len;
    }
    normals.push(normal);
  }
  
  return { vertices, faces, normals };
}

/**
 * Decompose a traced path into modular primitives
 * Returns a list of primitives that approximate the path
 */
export function decomposePathToPrimitives(
  path: Point2D[],
  straightThreshold: number = 5,  // degrees - if angle change < this, it's straight
  curveRadius: number = 20
): { type: TubePrimitiveType; position: Point2D; rotation: number }[] {
  const primitives: { type: TubePrimitiveType; position: Point2D; rotation: number }[] = [];
  
  if (path.length < 2) return primitives;
  
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i];
    const p1 = path[i + 1];
    
    // Calculate segment direction
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Check angle change from previous segment
    if (i > 0) {
      const prevP = path[i - 1];
      const prevDx = p0.x - prevP.x;
      const prevDy = p0.y - prevP.y;
      const prevAngle = Math.atan2(prevDy, prevDx) * (180 / Math.PI);
      const angleDiff = Math.abs(angle - prevAngle);
      
      if (angleDiff > straightThreshold) {
        // Determine curve type based on angle
        let curveType: TubePrimitiveType = 'curve_90';
        if (angleDiff <= 60) curveType = 'curve_45';
        else if (angleDiff <= 120) curveType = 'curve_90';
        else if (angleDiff <= 160) curveType = 'curve_135';
        else curveType = 'curve_180';
        
        primitives.push({
          type: curveType,
          position: p0,
          rotation: prevAngle,
        });
      }
    }
    
    // Add straight segment
    primitives.push({
      type: 'straight',
      position: p0,
      rotation: angle,
    });
  }
  
  // Add end cap at the end
  if (path.length > 0) {
    const lastPoint = path[path.length - 1];
    const prevPoint = path[path.length - 2];
    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    primitives.push({
      type: 'end_cap',
      position: lastPoint,
      rotation: angle,
    });
  }
  
  return primitives;
}

// ============================================================================
// SNAKE ALPHABET - CONTINUOUS A-Z, a-z
// Every letter flows into the next as one unbroken string
// ============================================================================

/**
 * Snake Alphabet: The entire alphabet drawn without lifting
 * Each letter connects to the next through "bridge" segments
 * All paths designed for continuous flow - entry at bottom-left, exit varies
 */
export const SNAKE_ALPHABET_PATHS: Record<string, Point2D[]> = {
  'A': [
    { x: 0, y: 0 }, { x: 5, y: 20 }, { x: 10, y: 0 },
    { x: 7.5, y: 10 }, { x: 2.5, y: 10 }, { x: 0, y: 0 },
  ],
  'B': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 7, y: 20 }, { x: 10, y: 17 },
    { x: 10, y: 12 }, { x: 7, y: 10 }, { x: 0, y: 10 },
    { x: 7, y: 10 }, { x: 10, y: 7 }, { x: 10, y: 3 },
    { x: 7, y: 0 }, { x: 0, y: 0 },
  ],
  'C': [
    { x: 10, y: 2 }, { x: 8, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 },
    { x: 0, y: 18 }, { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 18 },
  ],
  'D': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 6, y: 20 }, { x: 10, y: 16 },
    { x: 10, y: 4 }, { x: 6, y: 0 }, { x: 0, y: 0 },
  ],
  'E': [
    { x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 7, y: 10 },
    { x: 0, y: 10 }, { x: 0, y: 20 }, { x: 10, y: 20 },
  ],
  'F': [
    { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 7, y: 10 },
    { x: 0, y: 10 }, { x: 0, y: 20 }, { x: 10, y: 20 },
  ],
  'G': [
    { x: 10, y: 18 }, { x: 8, y: 20 }, { x: 2, y: 20 }, { x: 0, y: 18 },
    { x: 0, y: 2 }, { x: 2, y: 0 }, { x: 8, y: 0 }, { x: 10, y: 2 },
    { x: 10, y: 10 }, { x: 5, y: 10 },
  ],
  'H': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 10 }, { x: 10, y: 10 },
    { x: 10, y: 20 }, { x: 10, y: 0 },
  ],
  'I': [
    { x: 3, y: 0 }, { x: 7, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 20 },
    { x: 3, y: 20 }, { x: 7, y: 20 },
  ],
  'J': [
    { x: 10, y: 20 }, { x: 10, y: 4 }, { x: 8, y: 0 }, { x: 4, y: 0 },
    { x: 0, y: 4 }, { x: 0, y: 8 },
  ],
  'K': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 10 }, { x: 10, y: 20 },
    { x: 0, y: 10 }, { x: 10, y: 0 },
  ],
  'L': [
    { x: 0, y: 20 }, { x: 0, y: 0 }, { x: 10, y: 0 },
  ],
  'M': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 5, y: 10 }, { x: 10, y: 20 },
    { x: 10, y: 0 },
  ],
  'N': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 10, y: 0 }, { x: 10, y: 20 },
  ],
  'O': [
    { x: 5, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 17 },
    { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 }, { x: 10, y: 3 },
    { x: 8, y: 0 }, { x: 5, y: 0 },
  ],
  'P': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 7, y: 20 }, { x: 10, y: 17 },
    { x: 10, y: 13 }, { x: 7, y: 10 }, { x: 0, y: 10 },
  ],
  'Q': [
    { x: 5, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 17 },
    { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 }, { x: 10, y: 3 },
    { x: 8, y: 0 }, { x: 5, y: 0 }, { x: 7, y: 5 }, { x: 11, y: -2 },
  ],
  'R': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 7, y: 20 }, { x: 10, y: 17 },
    { x: 10, y: 13 }, { x: 7, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 },
  ],
  'S': [
    { x: 10, y: 18 }, { x: 8, y: 20 }, { x: 2, y: 20 }, { x: 0, y: 18 },
    { x: 0, y: 12 }, { x: 2, y: 10 }, { x: 8, y: 10 }, { x: 10, y: 8 },
    { x: 10, y: 2 }, { x: 8, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 },
  ],
  'T': [
    { x: 5, y: 0 }, { x: 5, y: 20 }, { x: 0, y: 20 }, { x: 10, y: 20 },
  ],
  'U': [
    { x: 0, y: 20 }, { x: 0, y: 3 }, { x: 2, y: 0 }, { x: 8, y: 0 },
    { x: 10, y: 3 }, { x: 10, y: 20 },
  ],
  'V': [
    { x: 0, y: 20 }, { x: 5, y: 0 }, { x: 10, y: 20 },
  ],
  'W': [
    { x: 0, y: 20 }, { x: 2.5, y: 0 }, { x: 5, y: 12 }, { x: 7.5, y: 0 },
    { x: 10, y: 20 },
  ],
  'X': [
    { x: 0, y: 0 }, { x: 10, y: 20 }, { x: 5, y: 10 }, { x: 0, y: 20 },
    { x: 10, y: 0 },
  ],
  'Y': [
    { x: 0, y: 20 }, { x: 5, y: 10 }, { x: 10, y: 20 }, { x: 5, y: 10 },
    { x: 5, y: 0 },
  ],
  'Z': [
    { x: 0, y: 20 }, { x: 10, y: 20 }, { x: 0, y: 0 }, { x: 10, y: 0 },
  ],
  
  // Lowercase letters - smaller scale (0-7 width, 0-14 height for x-height)
  'a': [
    { x: 7, y: 0 }, { x: 7, y: 10 }, { x: 5, y: 12 }, { x: 2, y: 12 },
    { x: 0, y: 10 }, { x: 0, y: 2 }, { x: 2, y: 0 }, { x: 7, y: 0 },
  ],
  'b': [
    { x: 0, y: 20 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 7, y: 2 },
    { x: 7, y: 10 }, { x: 5, y: 12 }, { x: 0, y: 12 },
  ],
  'c': [
    { x: 7, y: 2 }, { x: 5, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 },
    { x: 0, y: 10 }, { x: 2, y: 12 }, { x: 5, y: 12 }, { x: 7, y: 10 },
  ],
  'd': [
    { x: 7, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 10 },
    { x: 2, y: 12 }, { x: 7, y: 12 }, { x: 7, y: 20 }, { x: 7, y: 0 },
  ],
  'e': [
    { x: 0, y: 6 }, { x: 7, y: 6 }, { x: 7, y: 10 }, { x: 5, y: 12 },
    { x: 2, y: 12 }, { x: 0, y: 10 }, { x: 0, y: 2 }, { x: 2, y: 0 },
    { x: 5, y: 0 }, { x: 7, y: 2 },
  ],
  'f': [
    { x: 0, y: 8 }, { x: 5, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 0 },
    { x: 4, y: 16 }, { x: 5, y: 18 }, { x: 7, y: 20 },
  ],
  'g': [
    { x: 7, y: 12 }, { x: 2, y: 12 }, { x: 0, y: 10 }, { x: 0, y: 2 },
    { x: 2, y: 0 }, { x: 7, y: 0 }, { x: 7, y: -6 }, { x: 5, y: -8 },
    { x: 2, y: -8 },
  ],
  'h': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 10 }, { x: 5, y: 12 },
    { x: 7, y: 10 }, { x: 7, y: 0 },
  ],
  'i': [
    { x: 3, y: 0 }, { x: 3, y: 12 }, { x: 3, y: 15 }, { x: 3, y: 16 },
  ],
  'j': [
    { x: 5, y: 12 }, { x: 5, y: -4 }, { x: 3, y: -6 }, { x: 1, y: -6 },
    { x: 5, y: 15 }, { x: 5, y: 16 },
  ],
  'k': [
    { x: 0, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 6 }, { x: 7, y: 12 },
    { x: 0, y: 6 }, { x: 7, y: 0 },
  ],
  'l': [
    { x: 3, y: 0 }, { x: 3, y: 20 },
  ],
  'm': [
    { x: 0, y: 0 }, { x: 0, y: 12 }, { x: 2, y: 12 }, { x: 4, y: 10 },
    { x: 4, y: 0 }, { x: 4, y: 10 }, { x: 6, y: 12 }, { x: 8, y: 12 },
    { x: 10, y: 10 }, { x: 10, y: 0 },
  ],
  'n': [
    { x: 0, y: 0 }, { x: 0, y: 12 }, { x: 5, y: 12 }, { x: 7, y: 10 },
    { x: 7, y: 0 },
  ],
  'o': [
    { x: 3, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 9 }, { x: 3, y: 12 },
    { x: 4, y: 12 }, { x: 7, y: 9 }, { x: 7, y: 3 }, { x: 4, y: 0 },
    { x: 3, y: 0 },
  ],
  'p': [
    { x: 0, y: -8 }, { x: 0, y: 12 }, { x: 5, y: 12 }, { x: 7, y: 10 },
    { x: 7, y: 2 }, { x: 5, y: 0 }, { x: 0, y: 0 },
  ],
  'q': [
    { x: 7, y: -8 }, { x: 7, y: 12 }, { x: 2, y: 12 }, { x: 0, y: 10 },
    { x: 0, y: 2 }, { x: 2, y: 0 }, { x: 7, y: 0 },
  ],
  'r': [
    { x: 0, y: 0 }, { x: 0, y: 12 }, { x: 0, y: 8 }, { x: 3, y: 12 },
    { x: 5, y: 12 }, { x: 7, y: 10 },
  ],
  's': [
    { x: 7, y: 10 }, { x: 5, y: 12 }, { x: 2, y: 12 }, { x: 0, y: 10 },
    { x: 0, y: 7 }, { x: 7, y: 5 }, { x: 7, y: 2 }, { x: 5, y: 0 },
    { x: 2, y: 0 }, { x: 0, y: 2 },
  ],
  't': [
    { x: 0, y: 12 }, { x: 6, y: 12 }, { x: 3, y: 12 }, { x: 3, y: 2 },
    { x: 5, y: 0 }, { x: 6, y: 0 },
  ],
  'u': [
    { x: 0, y: 12 }, { x: 0, y: 2 }, { x: 2, y: 0 }, { x: 5, y: 0 },
    { x: 7, y: 2 }, { x: 7, y: 12 }, { x: 7, y: 0 },
  ],
  'v': [
    { x: 0, y: 12 }, { x: 3.5, y: 0 }, { x: 7, y: 12 },
  ],
  'w': [
    { x: 0, y: 12 }, { x: 2, y: 0 }, { x: 5, y: 8 }, { x: 8, y: 0 },
    { x: 10, y: 12 },
  ],
  'x': [
    { x: 0, y: 0 }, { x: 7, y: 12 }, { x: 3.5, y: 6 }, { x: 0, y: 12 },
    { x: 7, y: 0 },
  ],
  'y': [
    { x: 0, y: 12 }, { x: 3.5, y: 6 }, { x: 7, y: 12 }, { x: 3.5, y: 6 },
    { x: 2, y: -6 }, { x: 0, y: -8 },
  ],
  'z': [
    { x: 0, y: 12 }, { x: 7, y: 12 }, { x: 0, y: 0 }, { x: 7, y: 0 },
  ],
  
  // Numbers
  '0': [
    { x: 5, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 17 },
    { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 }, { x: 10, y: 3 },
    { x: 8, y: 0 }, { x: 5, y: 0 },
  ],
  '1': [
    { x: 5, y: 0 }, { x: 5, y: 20 }, { x: 2, y: 17 },
  ],
  '2': [
    { x: 0, y: 17 }, { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 },
    { x: 10, y: 12 }, { x: 0, y: 0 }, { x: 10, y: 0 },
  ],
  '3': [
    { x: 0, y: 17 }, { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 },
    { x: 10, y: 12 }, { x: 7, y: 10 }, { x: 10, y: 8 }, { x: 10, y: 3 },
    { x: 8, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 },
  ],
  '4': [
    { x: 8, y: 0 }, { x: 8, y: 20 }, { x: 0, y: 7 }, { x: 10, y: 7 },
  ],
  '5': [
    { x: 10, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 12 }, { x: 7, y: 12 },
    { x: 10, y: 9 }, { x: 10, y: 3 }, { x: 7, y: 0 }, { x: 0, y: 0 },
  ],
  '6': [
    { x: 10, y: 17 }, { x: 8, y: 20 }, { x: 2, y: 20 }, { x: 0, y: 17 },
    { x: 0, y: 3 }, { x: 2, y: 0 }, { x: 8, y: 0 }, { x: 10, y: 3 },
    { x: 10, y: 7 }, { x: 8, y: 10 }, { x: 0, y: 10 },
  ],
  '7': [
    { x: 0, y: 20 }, { x: 10, y: 20 }, { x: 3, y: 0 },
  ],
  '8': [
    { x: 5, y: 10 }, { x: 2, y: 10 }, { x: 0, y: 12 }, { x: 0, y: 17 },
    { x: 2, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 17 }, { x: 10, y: 12 },
    { x: 8, y: 10 }, { x: 5, y: 10 }, { x: 2, y: 10 }, { x: 0, y: 8 },
    { x: 0, y: 3 }, { x: 2, y: 0 }, { x: 8, y: 0 }, { x: 10, y: 3 },
    { x: 10, y: 8 }, { x: 8, y: 10 }, { x: 5, y: 10 },
  ],
  '9': [
    { x: 0, y: 3 }, { x: 2, y: 0 }, { x: 8, y: 0 }, { x: 10, y: 3 },
    { x: 10, y: 17 }, { x: 8, y: 20 }, { x: 2, y: 20 }, { x: 0, y: 17 },
    { x: 0, y: 13 }, { x: 2, y: 10 }, { x: 10, y: 10 },
  ],
};

/**
 * Generate bridge segment connecting two letters
 */
function generateLetterBridge(
  exitPoint: Point2D,
  entryPoint: Point2D,
  letterSpacing: number
): Point2D[] {
  // Create smooth S-curve bridge
  const midX = (exitPoint.x + entryPoint.x + letterSpacing) / 2;
  
  return [
    exitPoint,
    { x: exitPoint.x + letterSpacing * 0.3, y: exitPoint.y },
    { x: midX, y: (exitPoint.y + entryPoint.y) / 2 },
    { x: entryPoint.x - letterSpacing * 0.3, y: entryPoint.y },
    entryPoint,
  ];
}

/**
 * Generate continuous snake path for a word
 * All letters connected as one unbroken tube
 */
export function generateSnakeWord(
  word: string,
  letterWidth: number = 12,
  letterHeight: number = 20,
  letterSpacing: number = 4
): Point2D[] {
  const path: Point2D[] = [];
  let xOffset = 0;
  
  const upperWord = word.toUpperCase();
  
  for (let i = 0; i < upperWord.length; i++) {
    const char = upperWord[i];
    const letterPath = SNAKE_ALPHABET_PATHS[char];
    
    if (letterPath) {
      // Scale and offset letter
      const scaledPath = letterPath.map(p => ({
        x: p.x * (letterWidth / 10) + xOffset,
        y: p.y * (letterHeight / 20),
      }));
      
      // Add bridge from previous letter if not first
      if (path.length > 0 && scaledPath.length > 0) {
        const bridge = generateLetterBridge(
          path[path.length - 1],
          scaledPath[0],
          letterSpacing
        );
        path.push(...bridge.slice(1)); // skip first point (duplicate)
      }
      
      path.push(...scaledPath);
      xOffset += letterWidth + letterSpacing;
    } else if (char === ' ') {
      // Space - just increase offset
      xOffset += letterSpacing * 2;
    }
  }
  
  return path;
}

// ============================================================================
// STL EXPORT FOR SHOWSTRING
// ============================================================================

export function tubeGeometryToSTL(
  geometry: TubeGeometry,
  solidName: string = 'showstring'
): string {
  let stl = `solid ${solidName}\n`;
  
  for (let i = 0; i < geometry.faces.length; i++) {
    const face = geometry.faces[i];
    const normal = geometry.normals[i];
    const v0 = geometry.vertices[face[0]];
    const v1 = geometry.vertices[face[1]];
    const v2 = geometry.vertices[face[2]];
    
    stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${v0[0]} ${v0[1]} ${v0[2]}\n`;
    stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
    stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }
  
  stl += `endsolid ${solidName}\n`;
  return stl;
}

/**
 * Export multi-layer light box as separate STL files
 */
export function exportLightBoxToSTLs(
  lightBox: ReturnType<typeof generateMultiLayerLightBox>
): Record<string, string> {
  const stls: Record<string, string> = {};
  
  // Export each layer
  for (let i = 0; i < lightBox.layers.length; i++) {
    const { geometry, layer } = lightBox.layers[i];
    const name = `layer_z${layer.zLevel}_${layer.description.replace(/\s+/g, '_')}`;
    stls[name] = tubeGeometryToSTL(geometry, name);
  }
  
  // Export frame
  stls['frame'] = tubeGeometryToSTL(lightBox.frame, 'frame');
  
  // Export backplate
  stls['backplate'] = tubeGeometryToSTL(lightBox.backplate, 'backplate');
  
  return stls;
}
