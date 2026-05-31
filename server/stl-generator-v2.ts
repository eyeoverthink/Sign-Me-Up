// STL Generator V2 - Proper swept tube geometry using stroke-based fonts
// This creates watertight meshes suitable for 3D printing
// Supports OTF/TTF fonts via opentype.js and Hershey single-stroke fonts

import type { LetterSettings, TubeSettings, TwoPartSystem, SketchPath } from "@shared/schema";
import { defaultTwoPartSystem } from "@shared/schema";
import { getTextStrokePaths, interpolatePath } from "./hershey-fonts";
import { getTextStrokePathsFromFont, isOTFFont } from "./font-loader";

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  normal: Vector3;
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

export interface ExportedPart {
  filename: string;
  content: Buffer;
  partType: string;
  material: string;
}

// Vector math utilities
function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Generate a circle of points perpendicular to a direction using parallel transport
function generateCircleRing(
  center: Vector3,
  tangent: Vector3,
  normal: Vector3,
  radius: number,
  segments: number
): Vector3[] {
  const binormal = cross(tangent, normal);
  const points: Vector3[] = [];
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    points.push({
      x: center.x + (normal.x * cos + binormal.x * sin) * radius,
      y: center.y + (normal.y * cos + binormal.y * sin) * radius,
      z: center.z + (normal.z * cos + binormal.z * sin) * radius
    });
  }
  
  return points;
}

// U-Channel profile for LED insertion
// Creates a U-shaped cross-section with walls and hollow interior
interface UChannelProfile {
  outerLeft: Vector3[];   // Outer left wall points
  innerLeft: Vector3[];   // Inner left wall points  
  outerRight: Vector3[];  // Outer right wall points
  innerRight: Vector3[];  // Inner right wall points
  bottom: Vector3[];      // Bottom floor points
}

function generateUChannelRing(
  center: Vector3,
  tangent: Vector3,
  normal: Vector3,
  channelWidth: number,
  wallThickness: number,
  wallHeight: number
): UChannelProfile {
  // For 2D paths on XY plane, we want:
  // - Width direction: perpendicular to tangent in XY plane
  // - Height direction: always +Z
  
  // Calculate perpendicular direction in XY plane
  const perpX = -tangent.y;
  const perpY = tangent.x;
  const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
  const perpNormX = perpLen > 0.001 ? perpX / perpLen : 1;
  const perpNormY = perpLen > 0.001 ? perpY / perpLen : 0;
  
  const halfWidth = channelWidth / 2;
  const innerHalfWidth = halfWidth - wallThickness;
  
  const outerLeft: Vector3[] = [];
  const innerLeft: Vector3[] = [];
  const outerRight: Vector3[] = [];
  const innerRight: Vector3[] = [];
  const bottom: Vector3[] = [];
  
  // Outer left edge (from floor to top of wall)
  // Left is negative perpendicular direction
  for (let h = 0; h <= 4; h++) {
    const zPos = center.z + (h / 4) * wallHeight;
    outerLeft.push({
      x: center.x + perpNormX * (-halfWidth),
      y: center.y + perpNormY * (-halfWidth),
      z: zPos
    });
  }
  
  // Inner left edge (from floor to top of wall)
  for (let h = 0; h <= 4; h++) {
    const zPos = center.z + (h / 4) * wallHeight;
    innerLeft.push({
      x: center.x + perpNormX * (-innerHalfWidth),
      y: center.y + perpNormY * (-innerHalfWidth),
      z: zPos
    });
  }
  
  // Outer right edge (from floor to top of wall)
  for (let h = 0; h <= 4; h++) {
    const zPos = center.z + (h / 4) * wallHeight;
    outerRight.push({
      x: center.x + perpNormX * halfWidth,
      y: center.y + perpNormY * halfWidth,
      z: zPos
    });
  }
  
  // Inner right edge (from floor to top of wall)
  for (let h = 0; h <= 4; h++) {
    const zPos = center.z + (h / 4) * wallHeight;
    innerRight.push({
      x: center.x + perpNormX * innerHalfWidth,
      y: center.y + perpNormY * innerHalfWidth,
      z: zPos
    });
  }
  
  // Bottom edge (from left to right at floor level)
  for (let w = 0; w <= 4; w++) {
    const offset = -halfWidth + (w / 4) * channelWidth;
    bottom.push({
      x: center.x + perpNormX * offset,
      y: center.y + perpNormY * offset,
      z: center.z
    });
  }
  
  return { outerLeft, innerLeft, outerRight, innerRight, bottom };
}

// Create a U-channel along a path (hollow channel for LED insertion)
// Structure: solid base plate + channel floor + U-shaped walls on top
function createUChannel(
  path: number[][],
  channelWidth: number,
  wallThickness: number,
  wallHeight: number,
  baseThickness: number = 3  // Solid base plate thickness
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (path.length < 2) return triangles;
  
  // Convert 2D path to 3D - channel floor starts at baseThickness
  const path3D: Vector3[] = path.map(([x, y]) => ({ x, y, z: baseThickness }));
  
  const profiles: UChannelProfile[] = [];
  let prevNormal: Vector3 = { x: 0, y: 0, z: 1 };
  
  for (let i = 0; i < path3D.length; i++) {
    const p = path3D[i];
    
    // Calculate tangent
    let tangent: Vector3;
    if (i === 0) {
      tangent = normalize(sub(path3D[1], path3D[0]));
    } else if (i === path3D.length - 1) {
      tangent = normalize(sub(path3D[i], path3D[i - 1]));
    } else {
      const t1 = normalize(sub(path3D[i], path3D[i - 1]));
      const t2 = normalize(sub(path3D[i + 1], path3D[i]));
      tangent = normalize(add(t1, t2));
    }
    
    // Parallel transport normal
    const projection = scale(tangent, dot(prevNormal, tangent));
    let normal = sub(prevNormal, projection);
    
    const normalLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (normalLen < 0.0001) {
      if (Math.abs(tangent.z) < 0.9) {
        normal = normalize(cross(tangent, { x: 0, y: 0, z: 1 }));
      } else {
        normal = normalize(cross(tangent, { x: 1, y: 0, z: 0 }));
      }
    } else {
      normal = scale(normal, 1 / normalLen);
    }
    
    prevNormal = normal;
    
    const profile = generateUChannelRing(p, tangent, normal, channelWidth, wallThickness, wallHeight);
    profiles.push(profile);
  }
  
  if (profiles.length < 2) return triangles;
  
  // Connect adjacent profiles
  for (let i = 0; i < profiles.length - 1; i++) {
    const p1 = profiles[i];
    const p2 = profiles[i + 1];
    
    // Left outer wall
    connectEdges(triangles, p1.outerLeft, p2.outerLeft, false);
    
    // Left inner wall
    connectEdges(triangles, p1.innerLeft, p2.innerLeft, true);
    
    // Right outer wall
    connectEdges(triangles, p1.outerRight, p2.outerRight, true);
    
    // Right inner wall
    connectEdges(triangles, p1.innerRight, p2.innerRight, false);
    
    // Bottom outer surface
    connectEdges(triangles, p1.bottom, p2.bottom, false);
    
    // Left wall top cap (connects outer to inner at top)
    const leftTopOuter1 = p1.outerLeft[p1.outerLeft.length - 1];
    const leftTopInner1 = p1.innerLeft[p1.innerLeft.length - 1];
    const leftTopOuter2 = p2.outerLeft[p2.outerLeft.length - 1];
    const leftTopInner2 = p2.innerLeft[p2.innerLeft.length - 1];
    
    triangles.push({
      normal: calcNormal(leftTopOuter1, leftTopInner1, leftTopOuter2),
      v1: leftTopOuter1, v2: leftTopInner1, v3: leftTopOuter2
    });
    triangles.push({
      normal: calcNormal(leftTopInner1, leftTopInner2, leftTopOuter2),
      v1: leftTopInner1, v2: leftTopInner2, v3: leftTopOuter2
    });
    
    // Right wall top cap
    const rightTopOuter1 = p1.outerRight[p1.outerRight.length - 1];
    const rightTopInner1 = p1.innerRight[p1.innerRight.length - 1];
    const rightTopOuter2 = p2.outerRight[p2.outerRight.length - 1];
    const rightTopInner2 = p2.innerRight[p2.innerRight.length - 1];
    
    triangles.push({
      normal: calcNormal(rightTopOuter1, rightTopOuter2, rightTopInner1),
      v1: rightTopOuter1, v2: rightTopOuter2, v3: rightTopInner1
    });
    triangles.push({
      normal: calcNormal(rightTopInner1, rightTopOuter2, rightTopInner2),
      v1: rightTopInner1, v2: rightTopOuter2, v3: rightTopInner2
    });
    
    // Inner bottom (floor of the channel)
    const innerBottomLeft1 = p1.innerLeft[0];
    const innerBottomRight1 = p1.innerRight[0];
    const innerBottomLeft2 = p2.innerLeft[0];
    const innerBottomRight2 = p2.innerRight[0];
    
    triangles.push({
      normal: calcNormal(innerBottomLeft1, innerBottomLeft2, innerBottomRight1),
      v1: innerBottomLeft1, v2: innerBottomLeft2, v3: innerBottomRight1
    });
    triangles.push({
      normal: calcNormal(innerBottomRight1, innerBottomLeft2, innerBottomRight2),
      v1: innerBottomRight1, v2: innerBottomLeft2, v3: innerBottomRight2
    });
  }
  
  // End caps
  capUChannel(triangles, profiles[0], true);  // Start cap
  capUChannel(triangles, profiles[profiles.length - 1], false);  // End cap
  
  // Generate base plate if baseThickness > 0
  if (baseThickness > 0) {
    generateBasePlate(triangles, profiles, baseThickness, channelWidth);
  }
  
  return triangles;
}

// Generate solid base plate underneath the U-channel
function generateBasePlate(
  triangles: Triangle[],
  profiles: UChannelProfile[],
  baseThickness: number,
  channelWidth: number
) {
  // The base plate extends from Z=0 to the channel floor
  // It follows the outer edges of the channel
  
  for (let i = 0; i < profiles.length - 1; i++) {
    const p1 = profiles[i];
    const p2 = profiles[i + 1];
    
    // Get outer bottom corners at channel floor level
    const topLeft1 = p1.outerLeft[0];
    const topRight1 = p1.outerRight[0];
    const topLeft2 = p2.outerLeft[0];
    const topRight2 = p2.outerRight[0];
    
    // Create corresponding points at Z=0 (base bottom)
    const bottomLeft1: Vector3 = { x: topLeft1.x, y: topLeft1.y, z: 0 };
    const bottomRight1: Vector3 = { x: topRight1.x, y: topRight1.y, z: 0 };
    const bottomLeft2: Vector3 = { x: topLeft2.x, y: topLeft2.y, z: 0 };
    const bottomRight2: Vector3 = { x: topRight2.x, y: topRight2.y, z: 0 };
    
    // Bottom face of base plate (at Z=0, facing down)
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: bottomLeft1, v2: bottomRight1, v3: bottomLeft2
    });
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: bottomRight1, v2: bottomRight2, v3: bottomLeft2
    });
    
    // Left side of base plate (connects top-left to bottom-left)
    triangles.push({
      normal: calcNormal(topLeft1, bottomLeft1, topLeft2),
      v1: topLeft1, v2: bottomLeft1, v3: topLeft2
    });
    triangles.push({
      normal: calcNormal(bottomLeft1, bottomLeft2, topLeft2),
      v1: bottomLeft1, v2: bottomLeft2, v3: topLeft2
    });
    
    // Right side of base plate (connects top-right to bottom-right)
    triangles.push({
      normal: calcNormal(topRight1, topRight2, bottomRight1),
      v1: topRight1, v2: topRight2, v3: bottomRight1
    });
    triangles.push({
      normal: calcNormal(bottomRight1, topRight2, bottomRight2),
      v1: bottomRight1, v2: topRight2, v3: bottomRight2
    });
  }
  
  // End caps for base plate
  const firstProfile = profiles[0];
  const lastProfile = profiles[profiles.length - 1];
  
  // Start cap of base plate
  const startTopLeft = firstProfile.outerLeft[0];
  const startTopRight = firstProfile.outerRight[0];
  const startBottomLeft: Vector3 = { x: startTopLeft.x, y: startTopLeft.y, z: 0 };
  const startBottomRight: Vector3 = { x: startTopRight.x, y: startTopRight.y, z: 0 };
  
  // Start cap facing backward
  triangles.push({
    normal: calcNormal(startTopLeft, startTopRight, startBottomLeft),
    v1: startTopLeft, v2: startTopRight, v3: startBottomLeft
  });
  triangles.push({
    normal: calcNormal(startBottomLeft, startTopRight, startBottomRight),
    v1: startBottomLeft, v2: startTopRight, v3: startBottomRight
  });
  
  // End cap of base plate
  const endTopLeft = lastProfile.outerLeft[0];
  const endTopRight = lastProfile.outerRight[0];
  const endBottomLeft: Vector3 = { x: endTopLeft.x, y: endTopLeft.y, z: 0 };
  const endBottomRight: Vector3 = { x: endTopRight.x, y: endTopRight.y, z: 0 };
  
  // End cap facing forward
  triangles.push({
    normal: calcNormal(endTopLeft, endBottomLeft, endTopRight),
    v1: endTopLeft, v2: endBottomLeft, v3: endTopRight
  });
  triangles.push({
    normal: calcNormal(endBottomLeft, endBottomRight, endTopRight),
    v1: endBottomLeft, v2: endBottomRight, v3: endTopRight
  });
}

function connectEdges(triangles: Triangle[], edge1: Vector3[], edge2: Vector3[], reverse: boolean) {
  const len = Math.min(edge1.length, edge2.length);
  for (let i = 0; i < len - 1; i++) {
    if (reverse) {
      triangles.push({
        normal: calcNormal(edge1[i], edge2[i], edge1[i + 1]),
        v1: edge1[i], v2: edge2[i], v3: edge1[i + 1]
      });
      triangles.push({
        normal: calcNormal(edge1[i + 1], edge2[i], edge2[i + 1]),
        v1: edge1[i + 1], v2: edge2[i], v3: edge2[i + 1]
      });
    } else {
      triangles.push({
        normal: calcNormal(edge1[i], edge1[i + 1], edge2[i]),
        v1: edge1[i], v2: edge1[i + 1], v3: edge2[i]
      });
      triangles.push({
        normal: calcNormal(edge1[i + 1], edge2[i + 1], edge2[i]),
        v1: edge1[i + 1], v2: edge2[i + 1], v3: edge2[i]
      });
    }
  }
}

function capUChannel(triangles: Triangle[], profile: UChannelProfile, isStart: boolean) {
  // Create end caps for the U-channel with consistent winding
  // isStart: cap faces backward (into path), isEnd: cap faces forward (out of path)
  
  const ol = profile.outerLeft;
  const il = profile.innerLeft;
  const or = profile.outerRight;
  const ir = profile.innerRight;
  
  // Helper to add a quad with proper winding based on direction
  // Start cap: normals point opposite to path direction (-tangent)
  // End cap: normals point along path direction (+tangent)
  function addQuad(a: Vector3, b: Vector3, c: Vector3, d: Vector3) {
    // Swap winding: start cap uses CW, end cap uses CCW (relative to outward normal)
    if (isStart) {
      // CW winding for start cap - normals point backward (-tangent)
      triangles.push({ normal: calcNormal(a, c, b), v1: a, v2: c, v3: b });
      triangles.push({ normal: calcNormal(a, d, c), v1: a, v2: d, v3: c });
    } else {
      // CCW winding for end cap - normals point forward (+tangent)
      triangles.push({ normal: calcNormal(a, b, c), v1: a, v2: b, v3: c });
      triangles.push({ normal: calcNormal(a, c, d), v1: a, v2: c, v3: d });
    }
  }
  
  // Left wall end cap - connect outer left edge to inner left edge
  for (let i = 0; i < ol.length - 1; i++) {
    addQuad(ol[i], il[i], il[i + 1], ol[i + 1]);
  }
  
  // Right wall end cap - connect outer right edge to inner right edge
  for (let i = 0; i < or.length - 1; i++) {
    addQuad(or[i], or[i + 1], ir[i + 1], ir[i]);
  }
  
  // Bottom end cap (connects bottom of left wall to bottom of right wall)
  const bottomLeft = ol[0];
  const bottomRight = or[0];
  const innerBottomLeft = il[0];
  const innerBottomRight = ir[0];
  
  addQuad(bottomLeft, bottomRight, innerBottomRight, innerBottomLeft);
}

// Create a swept tube along a path using parallel transport frame
// This produces watertight meshes with shared vertices between rings
function createSweptTube(
  path: number[][],  // Array of [x, y] points
  tubeRadius: number,
  segments: number = 12,
  zOffset: number = 0
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (path.length < 2) return triangles;
  
  // Convert 2D path to 3D (on XY plane at z=zOffset)
  const path3D: Vector3[] = path.map(([x, y]) => ({ x, y, z: zOffset }));
  
  const rings: Vector3[][] = [];
  
  // Initialize reference frame - perpendicular to first tangent
  let prevNormal: Vector3 = { x: 0, y: 0, z: 1 };
  
  for (let i = 0; i < path3D.length; i++) {
    const p = path3D[i];
    
    // Calculate tangent direction
    let tangent: Vector3;
    if (i === 0) {
      tangent = normalize(sub(path3D[1], path3D[0]));
    } else if (i === path3D.length - 1) {
      tangent = normalize(sub(path3D[i], path3D[i - 1]));
    } else {
      // Smooth tangent using neighbors
      const t1 = normalize(sub(path3D[i], path3D[i - 1]));
      const t2 = normalize(sub(path3D[i + 1], path3D[i]));
      tangent = normalize(add(t1, t2));
    }
    
    // Parallel transport: project previous normal onto plane perpendicular to tangent
    const projection = scale(tangent, dot(prevNormal, tangent));
    let normal = sub(prevNormal, projection);
    
    const normalLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (normalLen < 0.0001) {
      // Pick arbitrary perpendicular if degenerate
      if (Math.abs(tangent.z) < 0.9) {
        normal = normalize(cross(tangent, { x: 0, y: 0, z: 1 }));
      } else {
        normal = normalize(cross(tangent, { x: 1, y: 0, z: 0 }));
      }
    } else {
      normal = scale(normal, 1 / normalLen);
    }
    
    prevNormal = normal;
    
    // Generate ring at this point
    const ring = generateCircleRing(p, tangent, normal, tubeRadius, segments);
    rings.push(ring);
  }
  
  if (rings.length < 2) return triangles;
  
  // Connect adjacent rings with triangles
  for (let i = 0; i < rings.length - 1; i++) {
    const ring1 = rings[i];
    const ring2 = rings[i + 1];
    
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      
      const v1 = ring1[j];
      const v2 = ring1[j1];
      const v3 = ring2[j];
      const v4 = ring2[j1];
      
      // Two triangles per quad
      triangles.push({
        normal: calcNormal(v1, v3, v2),
        v1: v1,
        v2: v3,
        v3: v2
      });
      triangles.push({
        normal: calcNormal(v2, v3, v4),
        v1: v2,
        v2: v3,
        v3: v4
      });
    }
  }
  
  // Cap the start (disk facing backward)
  const firstRing = rings[0];
  const firstCenter = path3D[0];
  
  for (let j = 0; j < segments; j++) {
    const j1 = (j + 1) % segments;
    triangles.push({
      normal: { x: 0, y: 0, z: -1 }, // Will be recalculated
      v1: firstCenter,
      v2: firstRing[j1],
      v3: firstRing[j]
    });
  }
  
  // Cap the end (disk facing forward)
  const lastRing = rings[rings.length - 1];
  const lastCenter = path3D[path3D.length - 1];
  
  for (let j = 0; j < segments; j++) {
    const j1 = (j + 1) % segments;
    triangles.push({
      normal: { x: 0, y: 0, z: 1 }, // Will be recalculated
      v1: lastCenter,
      v2: lastRing[j],
      v3: lastRing[j1]
    });
  }
  
  return triangles;
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

function trianglesToSTL(triangles: Triangle[], name: string = "SignCraft"): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  
  const buffer = Buffer.alloc(bufferSize);
  
  const header = `STL Export - ${name}`.padEnd(80, ' ');
  buffer.write(header, 0, 80, 'ascii');
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    // Recalculate normal for accuracy
    const normal = calcNormal(tri.v1, tri.v2, tri.v3);
    
    buffer.writeFloatLE(normal.x, offset); offset += 4;
    buffer.writeFloatLE(normal.y, offset); offset += 4;
    buffer.writeFloatLE(normal.z, offset); offset += 4;
    
    buffer.writeFloatLE(tri.v1.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.z, offset); offset += 4;
    
    buffer.writeFloatLE(tri.v2.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.z, offset); offset += 4;
    
    buffer.writeFloatLE(tri.v3.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.z, offset); offset += 4;
    
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  
  return buffer;
}

// Mirror triangles on X axis (flip horizontally)
function mirrorTrianglesX(triangles: Triangle[]): Triangle[] {
  return triangles.map(t => {
    // Mirror vertices on X axis
    const v1: Vector3 = { x: -t.v1.x, y: t.v1.y, z: t.v1.z };
    const v2: Vector3 = { x: -t.v2.x, y: t.v2.y, z: t.v2.z };
    const v3: Vector3 = { x: -t.v3.x, y: t.v3.y, z: t.v3.z };
    
    // Swap v2 and v3 to reverse winding order (flip normal direction)
    // Then recompute normal from the new vertices
    const newNormal = calcNormal(v1, v3, v2);
    
    return {
      normal: newNormal,
      v1: v1,
      v2: v3,
      v3: v2
    };
  });
}

// Create diffuser cap that fits on top of U-channel
// Simple solid rectangular cap that sits over the channel opening and walls
function createDiffuserCap(
  path: number[][],
  channelWidth: number,
  wallThickness: number,
  wallHeight: number,
  baseThickness: number = 3,
  capThickness: number = 2,
  tolerance: number = 0.2
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (path.length < 2) return triangles;
  
  // Cap sits on top of the walls
  const capBottomZ = baseThickness + wallHeight;
  const capTopZ = capBottomZ + capThickness;
  
  // Cap sits ON TOP of the walls, slightly wider than channel opening
  // The extra width creates a lip that rests on the wall tops for snap-fit
  // halfWidth = channel radius + small overlap for resting on walls
  const halfWidth = (channelWidth / 2) + tolerance;
  
  // Build profile for each path point - simple rectangle cross-section
  interface CapProfile {
    bottomLeft: Vector3;
    bottomRight: Vector3;
    topLeft: Vector3;
    topRight: Vector3;
  }
  
  const profiles: CapProfile[] = [];
  
  for (let i = 0; i < path.length; i++) {
    const [px, py] = path[i];
    
    // Calculate perpendicular direction
    let tangentX = 0, tangentY = 1;
    if (i === 0 && path.length > 1) {
      tangentX = path[1][0] - path[0][0];
      tangentY = path[1][1] - path[0][1];
    } else if (i === path.length - 1) {
      tangentX = path[i][0] - path[i-1][0];
      tangentY = path[i][1] - path[i-1][1];
    } else {
      tangentX = path[i+1][0] - path[i-1][0];
      tangentY = path[i+1][1] - path[i-1][1];
    }
    
    const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    if (len > 0.001) {
      tangentX /= len;
      tangentY /= len;
    }
    
    const perpX = -tangentY;
    const perpY = tangentX;
    
    profiles.push({
      bottomLeft: { x: px + perpX * (-halfWidth), y: py + perpY * (-halfWidth), z: capBottomZ },
      bottomRight: { x: px + perpX * halfWidth, y: py + perpY * halfWidth, z: capBottomZ },
      topLeft: { x: px + perpX * (-halfWidth), y: py + perpY * (-halfWidth), z: capTopZ },
      topRight: { x: px + perpX * halfWidth, y: py + perpY * halfWidth, z: capTopZ }
    });
  }
  
  // Connect adjacent profiles to form the cap
  for (let i = 0; i < profiles.length - 1; i++) {
    const p1 = profiles[i];
    const p2 = profiles[i + 1];
    
    // Top surface (facing up)
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: p1.topLeft, v2: p2.topLeft, v3: p1.topRight
    });
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: p1.topRight, v2: p2.topLeft, v3: p2.topRight
    });
    
    // Bottom surface (facing down)
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: p1.bottomLeft, v2: p1.bottomRight, v3: p2.bottomLeft
    });
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: p1.bottomRight, v2: p2.bottomRight, v3: p2.bottomLeft
    });
    
    // Left side (outer)
    triangles.push({
      normal: calcNormal(p1.bottomLeft, p1.topLeft, p2.bottomLeft),
      v1: p1.bottomLeft, v2: p1.topLeft, v3: p2.bottomLeft
    });
    triangles.push({
      normal: calcNormal(p1.topLeft, p2.topLeft, p2.bottomLeft),
      v1: p1.topLeft, v2: p2.topLeft, v3: p2.bottomLeft
    });
    
    // Right side (outer)
    triangles.push({
      normal: calcNormal(p1.bottomRight, p2.bottomRight, p1.topRight),
      v1: p1.bottomRight, v2: p2.bottomRight, v3: p1.topRight
    });
    triangles.push({
      normal: calcNormal(p1.topRight, p2.bottomRight, p2.topRight),
      v1: p1.topRight, v2: p2.bottomRight, v3: p2.topRight
    });
  }
  
  // End caps (start and end of path)
  const first = profiles[0];
  const last = profiles[profiles.length - 1];
  
  // Start end cap (facing backward along path)
  triangles.push({
    normal: calcNormal(first.bottomLeft, first.topLeft, first.bottomRight),
    v1: first.bottomLeft, v2: first.topLeft, v3: first.bottomRight
  });
  triangles.push({
    normal: calcNormal(first.topLeft, first.topRight, first.bottomRight),
    v1: first.topLeft, v2: first.topRight, v3: first.bottomRight
  });
  
  // End end cap (facing forward along path)
  triangles.push({
    normal: calcNormal(last.bottomLeft, last.bottomRight, last.topLeft),
    v1: last.bottomLeft, v2: last.bottomRight, v3: last.topLeft
  });
  triangles.push({
    normal: calcNormal(last.topLeft, last.bottomRight, last.topRight),
    v1: last.topLeft, v2: last.bottomRight, v3: last.topRight
  });
  
  return triangles;
}

export interface NeonSignOptions {
  mirrorX?: boolean;
  generateDiffuserCap?: boolean;
  weldLetters?: boolean;  // Connect all letters with bridges
  addFeedHoles?: boolean;  // Add entry/exit holes in the back
  feedHoleDiameter?: number;  // Diameter of feed holes (mm)
  // Snap-fit tabs
  snapTabsEnabled?: boolean;
  snapTabHeight?: number;
  snapTabWidth?: number;
  snapTabSpacing?: number;
  // Registration pins
  registrationPinsEnabled?: boolean;
  pinDiameter?: number;
  pinHeight?: number;
  pinSpacing?: number;
}

// Create snap-fit tabs along the top of walls for secure lid attachment
// Tabs protrude INWARD from the inner edge of walls to catch the cap
function createSnapTabs(
  path: number[][],
  channelWidth: number,
  wallThickness: number,
  wallHeight: number,
  tabHeight: number = 2,
  tabWidth: number = 4,
  tabSpacing: number = 25,
  baseThickness: number = 3
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (path.length < 2) return triangles;
  
  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i-1][0];
    const dy = path[i][1] - path[i-1][1];
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  // Place tabs at regular intervals
  const numTabs = Math.max(2, Math.floor(totalLength / tabSpacing));
  const actualSpacing = totalLength / (numTabs + 1);
  
  const halfWidth = channelWidth / 2;
  const innerHalfWidth = halfWidth - wallThickness;
  
  // Tab sits at top of wall and protrudes inward
  const tabBaseZ = baseThickness + wallHeight - tabHeight; // Start slightly below wall top
  const tabTopZ = baseThickness + wallHeight; // Flush with wall top
  const tabDepth = 1.5; // How far tab protrudes inward
  
  let distanceTraveled = 0;
  let pathIndex = 1;
  let tabCount = 0;
  
  while (pathIndex < path.length && tabCount < numTabs) {
    const targetDist = (tabCount + 1) * actualSpacing;
    
    while (pathIndex < path.length) {
      const dx = path[pathIndex][0] - path[pathIndex-1][0];
      const dy = path[pathIndex][1] - path[pathIndex-1][1];
      const segmentLen = Math.sqrt(dx * dx + dy * dy);
      
      if (distanceTraveled + segmentLen >= targetDist) {
        // Place tab here
        const t = (targetDist - distanceTraveled) / segmentLen;
        const tabX = path[pathIndex-1][0] + dx * t;
        const tabY = path[pathIndex-1][1] + dy * t;
        
        // Get tangent and perpendicular directions
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const tangentX = dx / len;
        const tangentY = dy / len;
        const perpX = -tangentY;
        const perpY = tangentX;
        
        // Create tabs on both sides of the channel (on inner wall faces)
        for (const side of [-1, 1]) {
          // Position at inner edge of wall
          const wallInnerEdge = side * innerHalfWidth;
          const wallOuterEdge = side * halfWidth;
          
          // Tab protrudes from inner wall edge toward channel center
          const inwardDir = -side;
          
          // Tab corners: 8 vertices for a 3D box
          // Front-left, front-right, back-left, back-right (both bottom and top)
          const hw = tabWidth / 2;
          
          // Bottom corners
          const b0: Vector3 = { 
            x: tabX + tangentX * (-hw) + perpX * wallInnerEdge,
            y: tabY + tangentY * (-hw) + perpY * wallInnerEdge,
            z: tabBaseZ 
          };
          const b1: Vector3 = { 
            x: tabX + tangentX * hw + perpX * wallInnerEdge,
            y: tabY + tangentY * hw + perpY * wallInnerEdge,
            z: tabBaseZ 
          };
          const b2: Vector3 = { 
            x: tabX + tangentX * hw + perpX * (wallInnerEdge + inwardDir * tabDepth),
            y: tabY + tangentY * hw + perpY * (wallInnerEdge + inwardDir * tabDepth),
            z: tabBaseZ 
          };
          const b3: Vector3 = { 
            x: tabX + tangentX * (-hw) + perpX * (wallInnerEdge + inwardDir * tabDepth),
            y: tabY + tangentY * (-hw) + perpY * (wallInnerEdge + inwardDir * tabDepth),
            z: tabBaseZ 
          };
          
          // Top corners
          const t0: Vector3 = { x: b0.x, y: b0.y, z: tabTopZ };
          const t1: Vector3 = { x: b1.x, y: b1.y, z: tabTopZ };
          const t2: Vector3 = { x: b2.x, y: b2.y, z: tabTopZ };
          const t3: Vector3 = { x: b3.x, y: b3.y, z: tabTopZ };
          
          // Create box faces
          // Bottom face
          triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: b0, v2: b2, v3: b1 });
          triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: b0, v2: b3, v3: b2 });
          
          // Top face (removed - tab merges with wall top)
          
          // Front face (toward channel center)
          const frontN = { x: perpX * inwardDir, y: perpY * inwardDir, z: 0 };
          triangles.push({ normal: frontN, v1: b2, v2: b3, v3: t3 });
          triangles.push({ normal: frontN, v1: b2, v2: t3, v3: t2 });
          
          // Side faces
          const leftN = { x: -tangentX, y: -tangentY, z: 0 };
          triangles.push({ normal: leftN, v1: b0, v2: b3, v3: t3 });
          triangles.push({ normal: leftN, v1: b0, v2: t3, v3: t0 });
          
          const rightN = { x: tangentX, y: tangentY, z: 0 };
          triangles.push({ normal: rightN, v1: b1, v2: t1, v3: t2 });
          triangles.push({ normal: rightN, v1: b1, v2: t2, v3: b2 });
        }
        
        tabCount++;
        break;
      }
      
      distanceTraveled += segmentLen;
      pathIndex++;
    }
  }
  
  console.log(`[V2 Generator] Created ${tabCount * 2} snap-fit tabs`);
  return triangles;
}

// Calculate pin positions along a path for registration pins/sockets
// Returns array of positions with coordinates and perpendicular direction
function calculatePinPositions(
  path: number[][],
  channelWidth: number,
  wallHeight: number,
  pinDiameter: number = 2.5,
  pinSpacing: number = 30,
  baseThickness: number = 3
): Array<{ x: number; y: number; perpX: number; perpY: number }> {
  const positions: Array<{ x: number; y: number; perpX: number; perpY: number }> = [];
  
  if (path.length < 2) return positions;
  
  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i-1][0];
    const dy = path[i][1] - path[i-1][1];
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  // Place pins at start, end, and intervals along path
  const numPins = Math.max(2, Math.floor(totalLength / pinSpacing) + 1);
  const actualSpacing = totalLength / (numPins - 1);
  
  const halfWidth = channelWidth / 2;
  
  let distanceTraveled = 0;
  let pathIndex = 1;
  
  for (let pinIdx = 0; pinIdx < numPins; pinIdx++) {
    const targetDist = pinIdx * actualSpacing;
    
    // Find position along path
    while (pathIndex < path.length) {
      const dx = path[pathIndex][0] - path[pathIndex-1][0];
      const dy = path[pathIndex][1] - path[pathIndex-1][1];
      const segmentLen = Math.sqrt(dx * dx + dy * dy);
      
      if (distanceTraveled + segmentLen >= targetDist || pinIdx === numPins - 1) {
        const t = segmentLen > 0 ? Math.min(1, (targetDist - distanceTraveled) / segmentLen) : 0;
        const posX = path[pathIndex-1][0] + dx * t;
        const posY = path[pathIndex-1][1] + dy * t;
        
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;
        
        positions.push({ x: posX, y: posY, perpX, perpY });
        break;
      }
      
      distanceTraveled += segmentLen;
      pathIndex++;
    }
    
    // Reset for finding next position
    if (pinIdx < numPins - 1) {
      distanceTraveled = 0;
      pathIndex = 1;
      // Re-traverse to find next position
      for (let i = 1; i < path.length; i++) {
        const dx = path[i][0] - path[i-1][0];
        const dy = path[i][1] - path[i-1][1];
        const segmentLen = Math.sqrt(dx * dx + dy * dy);
        distanceTraveled += segmentLen;
        if (distanceTraveled >= (pinIdx + 1) * actualSpacing) {
          pathIndex = i;
          distanceTraveled -= segmentLen; // Back up one segment
          break;
        }
      }
    }
  }
  
  return positions;
}

// Create registration pins for alignment between base and cap
// Pins are placed on the outer edge of the left wall (outside the channel)
function createRegistrationPins(
  path: number[][],
  channelWidth: number,
  wallHeight: number,
  pinDiameter: number = 2.5,
  pinHeight: number = 3,
  pinSpacing: number = 30,
  baseThickness: number = 3
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (path.length < 2) return triangles;
  
  const halfWidth = channelWidth / 2;
  const pinBaseZ = baseThickness + wallHeight;
  const pinTopZ = pinBaseZ + pinHeight;
  const pinRadius = pinDiameter / 2;
  const segments = 12;
  
  // Create pins at start and end of path
  const pinPositions: { x: number; y: number; perpX: number; perpY: number }[] = [];
  
  // Start pin
  if (path.length >= 2) {
    const dx = path[1][0] - path[0][0];
    const dy = path[1][1] - path[0][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    pinPositions.push({
      x: path[0][0],
      y: path[0][1],
      perpX: -dy / len,
      perpY: dx / len
    });
  }
  
  // End pin
  if (path.length >= 2) {
    const last = path.length - 1;
    const dx = path[last][0] - path[last-1][0];
    const dy = path[last][1] - path[last-1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    pinPositions.push({
      x: path[last][0],
      y: path[last][1],
      perpX: -dy / len,
      perpY: dx / len
    });
  }
  
  for (const pos of pinPositions) {
    // Place pin on outer edge of left wall
    const pinCenterX = pos.x + pos.perpX * (-(halfWidth + pinRadius + 1));
    const pinCenterY = pos.y + pos.perpY * (-(halfWidth + pinRadius + 1));
    
    // Create cylinder for pin
    const bottomRing: Vector3[] = [];
    const topRing: Vector3[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      bottomRing.push({ x: pinCenterX + cos * pinRadius, y: pinCenterY + sin * pinRadius, z: pinBaseZ });
      topRing.push({ x: pinCenterX + cos * pinRadius, y: pinCenterY + sin * pinRadius, z: pinTopZ });
    }
    
    // Cylinder walls
    for (let i = 0; i < segments; i++) {
      const midAngle = ((i + 0.5) / segments) * Math.PI * 2;
      const normal = { x: Math.cos(midAngle), y: Math.sin(midAngle), z: 0 };
      
      triangles.push({ normal, v1: bottomRing[i], v2: topRing[i], v3: bottomRing[i + 1] });
      triangles.push({ normal, v1: topRing[i], v2: topRing[i + 1], v3: bottomRing[i + 1] });
    }
    
    // Top cap
    const topCenter: Vector3 = { x: pinCenterX, y: pinCenterY, z: pinTopZ };
    for (let i = 0; i < segments; i++) {
      triangles.push({ normal: { x: 0, y: 0, z: 1 }, v1: topCenter, v2: topRing[i], v3: topRing[i + 1] });
    }
    
    // Bottom (optional - usually sits on wall top)
    const bottomCenter: Vector3 = { x: pinCenterX, y: pinCenterY, z: pinBaseZ };
    for (let i = 0; i < segments; i++) {
      triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: bottomCenter, v2: bottomRing[i + 1], v3: bottomRing[i] });
    }
  }
  
  console.log(`[V2 Generator] Created ${pinPositions.length} registration pins`);
  return triangles;
}

// Create a bridge/strut connecting two points (for welding letters together)
function createBridge(
  start: { x: number; y: number },
  end: { x: number; y: number },
  channelWidth: number,
  wallThickness: number,
  wallHeight: number,
  baseThickness: number = 3
): Triangle[] {
  const triangles: Triangle[] = [];
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  // If the points are too close, skip the bridge
  if (len < channelWidth * 0.5) return triangles;
  
  // Create a simple rectangular bridge path
  const path: number[][] = [[start.x, start.y], [end.x, end.y]];
  
  // Use the same U-channel function to create the bridge with proper baseThickness
  return createUChannel(path, channelWidth, wallThickness, wallHeight, baseThickness);
}

// Create a feed hole (cylinder cut) in the base at a specific point
// This creates interior-facing geometry that represents a hole through the base
// The cylinder walls have normals pointing INWARD (toward hole center) to represent void
function createFeedHole(
  center: { x: number; y: number },
  diameter: number,
  baseThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 16;
  const radius = diameter / 2;
  
  // Hole goes from slightly below base (z=-0.5) to just above the base floor
  // This ensures it punches through the entire base
  const topZ = baseThickness + 0.5;
  const bottomZ = -0.5;
  
  const topRing: Vector3[] = [];
  const bottomRing: Vector3[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    topRing.push({ x: center.x + cos * radius, y: center.y + sin * radius, z: topZ });
    bottomRing.push({ x: center.x + cos * radius, y: center.y + sin * radius, z: bottomZ });
  }
  
  // Create the inner wall of the hole with normals pointing INWARD (toward center)
  // Winding order: when looking from outside the cylinder, vertices go clockwise
  // This makes the face point toward the center (representing interior of hole)
  for (let i = 0; i < segments; i++) {
    // Calculate inward-pointing normal for this segment
    const midAngle = ((i + 0.5) / segments) * Math.PI * 2;
    const inwardNormal = { x: -Math.cos(midAngle), y: -Math.sin(midAngle), z: 0 };
    
    // First triangle
    triangles.push({
      normal: inwardNormal,
      v1: bottomRing[i],
      v2: topRing[i],
      v3: topRing[i + 1]
    });
    // Second triangle
    triangles.push({
      normal: inwardNormal,
      v1: bottomRing[i],
      v2: topRing[i + 1],
      v3: bottomRing[i + 1]
    });
  }
  
  return triangles;
}

export function generateNeonSignV2(
  letterSettings: LetterSettings,
  tubeSettings: TubeSettings,
  twoPartSystem: TwoPartSystem = defaultTwoPartSystem,
  format: "stl" | "obj" = "stl",
  sketchPaths: SketchPath[] = [],
  inputMode: "text" | "draw" | "image" = "text",
  options: NeonSignOptions = {}
): ExportedPart[] {
  // Channel dimensions from settings - prioritize tubeSettings, fallback to twoPartSystem
  const channelWidth = tubeSettings.neonTubeDiameter || 12;
  const wallThickness = twoPartSystem.baseWallThickness || 2;
  // Use tubeSettings.wallHeight if set, otherwise fall back to twoPartSystem.baseWallHeight
  const wallHeight = tubeSettings.wallHeight || twoPartSystem.baseWallHeight || 15;
  const baseThickness = 3;
  const capThickness = twoPartSystem.capThickness || 2;
  
  console.log(`[V2 Generator] channelWidth=${channelWidth}, wallHeight=${wallHeight}, wallThickness=${wallThickness}`);
  
  let allTriangles: Triangle[] = [];
  let capTriangles: Triangle[] = [];
  let fileSlug = "neon_sign";
  
  // Store all smooth paths for cap generation
  const allSmoothPaths: number[][][] = [];
  
  if (inputMode === "draw" || inputMode === "image") {
    // Use sketch paths directly
    console.log(`[V2 Generator] Processing ${sketchPaths.length} sketch paths for ${inputMode} mode`);
    for (let i = 0; i < sketchPaths.length; i++) {
      const sketch = sketchPaths[i];
      if (sketch.points.length < 2) {
        console.log(`[V2 Generator] Skipping path ${i}: only ${sketch.points.length} points`);
        continue;
      }
      
      const path2D: number[][] = sketch.points.map(p => [p.x, p.y]);
      
      // Interpolate for smoothness
      const smoothPath = interpolatePath(path2D, channelWidth * 0.25);
      allSmoothPaths.push(smoothPath);
      
      // Create U-channel with hollow interior for LED insertion
      const channelTriangles = createUChannel(smoothPath, channelWidth, wallThickness, wallHeight);
      console.log(`[V2 Generator] Path ${i}: ${sketch.points.length} points -> ${smoothPath.length} smooth points -> ${channelTriangles.length} triangles`);
      allTriangles.push(...channelTriangles);
    }
    console.log(`[V2 Generator] Total base triangles: ${allTriangles.length}`);
    fileSlug = inputMode === "draw" ? "freehand" : "traced";
  } else {
    // Use appropriate font system based on font type
    const text = letterSettings.text || "A";
    const fontSize = 50 * letterSettings.scale;
    const fontId = letterSettings.fontId || "hershey-sans";
    
    let paths: number[][][] = [];
    
    // Check if this is an OTF font
    if (isOTFFont(fontId)) {
      console.log(`[V2 Generator] Using OTF font: ${fontId}`);
      const result = getTextStrokePathsFromFont(text, fontId, fontSize);
      paths = result.paths;
      
      // Paths from OTF loader are already centered
      for (const path of paths) {
        if (path.length < 2) continue;
        const smoothPath = interpolatePath(path, channelWidth * 0.25);
        allSmoothPaths.push(smoothPath);
        allTriangles.push(...createUChannel(smoothPath, channelWidth, wallThickness, wallHeight));
      }
    } else {
      // Use Hershey single-stroke fonts
      console.log(`[V2 Generator] Using Hershey font: ${fontId}`);
      const { paths: hersheyPaths, totalWidth, height } = getTextStrokePaths(
        text,
        fontSize,
        fontSize * 0.12 // Letter spacing
      );
      
      // Center the text
      const centerX = totalWidth / 2;
      const centerY = height / 2;
      
      for (const path of hersheyPaths) {
        if (path.length < 2) continue;
        
        // Center and flip Y (Hershey uses Y-down)
        const centeredPath: number[][] = path.map(([x, y]) => [
          x - centerX,
          centerY - y
        ]);
        
        // Interpolate for smoothness
        const smoothPath = interpolatePath(centeredPath, channelWidth * 0.25);
        allSmoothPaths.push(smoothPath);
        
        // Create U-channel with hollow interior for LED insertion
        allTriangles.push(...createUChannel(smoothPath, channelWidth, wallThickness, wallHeight));
      }
    }
    
    fileSlug = text.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
  }
  
  if (allTriangles.length === 0) {
    return [];
  }
  
  // Weld letters together with bridges if requested
  if (options.weldLetters && allSmoothPaths.length > 1) {
    console.log(`[V2 Generator] Welding ${allSmoothPaths.length} paths together`);
    
    // Connect each path to the next one
    for (let i = 0; i < allSmoothPaths.length - 1; i++) {
      const currentPath = allSmoothPaths[i];
      const nextPath = allSmoothPaths[i + 1];
      
      if (currentPath.length > 0 && nextPath.length > 0) {
        // Get end of current path and start of next path
        const endPoint = currentPath[currentPath.length - 1];
        const startPoint = nextPath[0];
        
        // Create bridge between them with proper baseThickness
        const bridgeTriangles = createBridge(
          { x: endPoint[0], y: endPoint[1] },
          { x: startPoint[0], y: startPoint[1] },
          channelWidth,
          wallThickness,
          wallHeight,
          baseThickness
        );
        
        allTriangles.push(...bridgeTriangles);
        console.log(`[V2 Generator] Added bridge ${i}: ${bridgeTriangles.length} triangles`);
      }
    }
  }
  
  // Add feed holes in the back for LED wire routing
  if (options.addFeedHoles && allSmoothPaths.length > 0) {
    const holeDiameter = options.feedHoleDiameter || 5; // Default 5mm holes
    console.log(`[V2 Generator] Adding feed holes, diameter=${holeDiameter}mm`);
    
    // Add a feed hole at the start of the first path
    const firstPath = allSmoothPaths[0];
    if (firstPath.length > 0) {
      const firstPoint = firstPath[0];
      allTriangles.push(...createFeedHole(
        { x: firstPoint[0], y: firstPoint[1] },
        holeDiameter,
        baseThickness
      ));
    }
    
    // Add a feed hole at the end of the last path
    const lastPath = allSmoothPaths[allSmoothPaths.length - 1];
    if (lastPath.length > 0) {
      const lastPoint = lastPath[lastPath.length - 1];
      allTriangles.push(...createFeedHole(
        { x: lastPoint[0], y: lastPoint[1] },
        holeDiameter,
        baseThickness
      ));
    }
  }
  
  // Add snap-fit tabs if enabled
  if (options.snapTabsEnabled && allSmoothPaths.length > 0) {
    const tabHeight = options.snapTabHeight || 2;
    const tabWidth = options.snapTabWidth || 4;
    const tabSpacing = options.snapTabSpacing || 25;
    
    console.log(`[V2 Generator] Adding snap-fit tabs: height=${tabHeight}mm, width=${tabWidth}mm, spacing=${tabSpacing}mm`);
    
    for (const smoothPath of allSmoothPaths) {
      allTriangles.push(...createSnapTabs(
        smoothPath,
        channelWidth,
        wallThickness,
        wallHeight,
        tabHeight,
        tabWidth,
        tabSpacing,
        baseThickness
      ));
    }
  }
  
  // Add registration pins if enabled
  if (options.registrationPinsEnabled && allSmoothPaths.length > 0) {
    const pinDiameter = options.pinDiameter || 2.5;
    const pinHeight = options.pinHeight || 3;
    const pinSpacing = options.pinSpacing || 30;
    
    console.log(`[V2 Generator] Adding registration pins: diameter=${pinDiameter}mm, height=${pinHeight}mm`);
    
    for (const smoothPath of allSmoothPaths) {
      allTriangles.push(...createRegistrationPins(
        smoothPath,
        channelWidth,
        wallHeight,
        pinDiameter,
        pinHeight,
        pinSpacing,
        baseThickness
      ));
    }
  }
  
  // Generate diffuser cap if requested
  if (options.generateDiffuserCap) {
    for (const smoothPath of allSmoothPaths) {
      capTriangles.push(...createDiffuserCap(
        smoothPath,
        channelWidth,
        wallThickness,
        wallHeight,
        baseThickness,
        capThickness,
        twoPartSystem.snapTolerance || 0.2
      ));
    }
  }
  
  // Apply mirror if requested
  if (options.mirrorX) {
    allTriangles = mirrorTrianglesX(allTriangles);
    if (capTriangles.length > 0) {
      capTriangles = mirrorTrianglesX(capTriangles);
    }
  }
  
  const results: ExportedPart[] = [];
  
  // Base channel
  const baseContent = trianglesToSTL(allTriangles, `${fileSlug} Neon Sign Base`);
  console.log(`[V2 Generator] Base STL: ${allTriangles.length} triangles, ${baseContent.length} bytes`);
  results.push({
    filename: `${fileSlug}_neon_channel${options.mirrorX ? '_mirrored' : ''}.stl`,
    content: baseContent,
    partType: "base_channel",
    material: "opaque"
  });
  
  // Diffuser cap
  if (capTriangles.length > 0) {
    const capContent = trianglesToSTL(capTriangles, `${fileSlug} Diffuser Cap`);
    results.push({
      filename: `${fileSlug}_diffuser_cap${options.mirrorX ? '_mirrored' : ''}.stl`,
      content: capContent,
      partType: "diffuser_cap",
      material: "diffuser"
    });
  }
  
  return results;
}

// ============================================================================
// MODULAR SHAPE GENERATOR - Geometric light panels (hexagon, triangle, etc.)
// ============================================================================

import type { ModularShapeSettings, ModularShapeType } from "@shared/schema";

// Generate vertices for a regular polygon centered at origin
function generatePolygonPath(
  shapeType: ModularShapeType,
  edgeLength: number
): number[][] {
  const sides: Record<ModularShapeType, number> = {
    triangle: 3,
    square: 4,
    pentagon: 5,
    hexagon: 6,
    octagon: 8,
  };
  
  const numSides = sides[shapeType];
  const path: number[][] = [];
  
  // Calculate circumradius from edge length
  // For regular polygon: R = edgeLength / (2 * sin(π/n))
  const interiorAngle = Math.PI / numSides;
  const circumradius = edgeLength / (2 * Math.sin(interiorAngle));
  
  // Generate vertices starting from top and going clockwise
  // Rotate so one edge is at bottom for visual balance
  const rotationOffset = -Math.PI / 2 + (numSides % 2 === 0 ? interiorAngle : 0);
  
  for (let i = 0; i < numSides; i++) {
    const angle = rotationOffset + (i * 2 * Math.PI) / numSides;
    const x = circumradius * Math.cos(angle);
    const y = circumradius * Math.sin(angle);
    path.push([x, y]);
  }
  
  // Close the polygon by returning to start
  path.push([path[0][0], path[0][1]]);
  
  return path;
}

// Create connector tabs on polygon edges for modular assembly
function createConnectorTabs(
  path: number[][],
  channelWidth: number,
  wallHeight: number,
  baseThickness: number,
  tabWidth: number,
  tabDepth: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Create tabs at the midpoint of each edge (except the last closing segment)
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    
    // Edge midpoint
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    
    // Edge direction and perpendicular (outward)
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const tangentX = dx / len;
    const tangentY = dy / len;
    const outwardX = -tangentY;  // Perpendicular pointing outward
    const outwardY = tangentX;
    
    // Tab dimensions
    const hw = tabWidth / 2;
    const tabBaseZ = baseThickness;
    const tabTopZ = baseThickness + wallHeight;
    
    // Outer edge of channel at this point
    const halfChannel = channelWidth / 2;
    const outerX = midX + outwardX * halfChannel;
    const outerY = midY + outwardY * halfChannel;
    
    // Tab corners (extends outward from channel edge)
    const b0: Vector3 = { x: outerX + tangentX * (-hw), y: outerY + tangentY * (-hw), z: tabBaseZ };
    const b1: Vector3 = { x: outerX + tangentX * hw, y: outerY + tangentY * hw, z: tabBaseZ };
    const b2: Vector3 = { x: outerX + tangentX * hw + outwardX * tabDepth, y: outerY + tangentY * hw + outwardY * tabDepth, z: tabBaseZ };
    const b3: Vector3 = { x: outerX + tangentX * (-hw) + outwardX * tabDepth, y: outerY + tangentY * (-hw) + outwardY * tabDepth, z: tabBaseZ };
    
    const t0: Vector3 = { ...b0, z: tabTopZ };
    const t1: Vector3 = { ...b1, z: tabTopZ };
    const t2: Vector3 = { ...b2, z: tabTopZ };
    const t3: Vector3 = { ...b3, z: tabTopZ };
    
    // Bottom face
    triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: b0, v2: b2, v3: b1 });
    triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: b0, v2: b3, v3: b2 });
    
    // Top face
    triangles.push({ normal: { x: 0, y: 0, z: 1 }, v1: t0, v2: t1, v3: t2 });
    triangles.push({ normal: { x: 0, y: 0, z: 1 }, v1: t0, v2: t2, v3: t3 });
    
    // Outer face
    const outN = { x: outwardX, y: outwardY, z: 0 };
    triangles.push({ normal: outN, v1: b2, v2: b3, v3: t3 });
    triangles.push({ normal: outN, v1: b2, v2: t3, v3: t2 });
    
    // Side faces
    triangles.push({ normal: { x: -tangentX, y: -tangentY, z: 0 }, v1: b0, v2: b3, v3: t3 });
    triangles.push({ normal: { x: -tangentX, y: -tangentY, z: 0 }, v1: b0, v2: t3, v3: t0 });
    
    triangles.push({ normal: { x: tangentX, y: tangentY, z: 0 }, v1: b1, v2: t1, v3: t2 });
    triangles.push({ normal: { x: tangentX, y: tangentY, z: 0 }, v1: b1, v2: t2, v3: b2 });
  }
  
  return triangles;
}

// Create female connector slots (recesses that receive male tabs)
function createConnectorSlots(
  polygonPath: number[][],
  channelWidth: number,
  wallHeight: number,
  baseThickness: number,
  slotWidth: number,
  slotDepth: number,
  wallThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const n = polygonPath.length;
  
  // Create slot on each edge (recess into the outer wall)
  for (let i = 0; i < n; i++) {
    const p1 = { x: polygonPath[i][0], y: polygonPath[i][1] };
    const p2 = { x: polygonPath[(i + 1) % n][0], y: polygonPath[(i + 1) % n][1] };
    
    // Edge midpoint
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    
    // Edge direction (tangent)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const edgeLen = Math.sqrt(dx * dx + dy * dy);
    const tangentX = dx / edgeLen;
    const tangentY = dy / edgeLen;
    
    // Outward normal (perpendicular, pointing outward)
    const outwardX = -tangentY;
    const outwardY = tangentX;
    
    const hw = slotWidth / 2; // Half slot width
    
    // Slot dimensions - cut into the wall
    const slotBaseZ = baseThickness;
    const slotTopZ = baseThickness + wallHeight * 0.6; // Slot covers 60% of wall height
    
    // Outer edge of the panel (where slot opening is)
    const halfChannel = channelWidth / 2;
    const outerX = midX + outwardX * halfChannel;
    const outerY = midY + outwardY * halfChannel;
    
    // Slot geometry - a rectangular pocket cut into the wall
    // The slot extends inward from the outer edge
    const o0: Vector3 = { x: outerX + tangentX * (-hw), y: outerY + tangentY * (-hw), z: slotBaseZ };
    const o1: Vector3 = { x: outerX + tangentX * hw, y: outerY + tangentY * hw, z: slotBaseZ };
    const o2: Vector3 = { x: outerX + tangentX * hw, y: outerY + tangentY * hw, z: slotTopZ };
    const o3: Vector3 = { x: outerX + tangentX * (-hw), y: outerY + tangentY * (-hw), z: slotTopZ };
    
    // Inner corners (where slot ends, inside the wall)
    const innerX = outerX - outwardX * slotDepth;
    const innerY = outerY - outwardY * slotDepth;
    const i0: Vector3 = { x: innerX + tangentX * (-hw), y: innerY + tangentY * (-hw), z: slotBaseZ };
    const i1: Vector3 = { x: innerX + tangentX * hw, y: innerY + tangentY * hw, z: slotBaseZ };
    const i2: Vector3 = { x: innerX + tangentX * hw, y: innerY + tangentY * hw, z: slotTopZ };
    const i3: Vector3 = { x: innerX + tangentX * (-hw), y: innerY + tangentY * (-hw), z: slotTopZ };
    
    // Bottom face of slot (inside the recess)
    triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: o0, v2: i1, v3: o1 });
    triangles.push({ normal: { x: 0, y: 0, z: -1 }, v1: o0, v2: i0, v3: i1 });
    
    // Back face of slot (deepest part)
    const inN = { x: -outwardX, y: -outwardY, z: 0 };
    triangles.push({ normal: inN, v1: i0, v2: i3, v3: i2 });
    triangles.push({ normal: inN, v1: i0, v2: i2, v3: i1 });
    
    // Top face of slot
    triangles.push({ normal: { x: 0, y: 0, z: 1 }, v1: o3, v2: o2, v3: i2 });
    triangles.push({ normal: { x: 0, y: 0, z: 1 }, v1: o3, v2: i2, v3: i3 });
    
    // Side faces
    triangles.push({ normal: { x: -tangentX, y: -tangentY, z: 0 }, v1: o0, v2: o3, v3: i3 });
    triangles.push({ normal: { x: -tangentX, y: -tangentY, z: 0 }, v1: o0, v2: i3, v3: i0 });
    
    triangles.push({ normal: { x: tangentX, y: tangentY, z: 0 }, v1: o1, v2: i1, v3: i2 });
    triangles.push({ normal: { x: tangentX, y: tangentY, z: 0 }, v1: o1, v2: i2, v3: o2 });
  }
  
  return triangles;
}

// Create shell diffuser - solid polygon that covers entire panel face (like Nanoleaf)
function createShellDiffuser(
  polygonPath: number[][],
  wallHeight: number,
  baseThickness: number,
  capThickness: number,
  tolerance: number = 0.3
): Triangle[] {
  const triangles: Triangle[] = [];
  
  if (polygonPath.length < 3) return triangles;
  
  // Shell sits on top of the walls, covering entire face
  const capBottomZ = baseThickness + wallHeight;
  const capTopZ = capBottomZ + capThickness;
  
  // Scale vertices slightly larger to create lip that rests on walls
  const centerX = polygonPath.reduce((sum, p) => sum + p[0], 0) / polygonPath.length;
  const centerY = polygonPath.reduce((sum, p) => sum + p[1], 0) / polygonPath.length;
  
  // Create outer edge vertices (slightly larger than panel for overlap)
  const outerVertices: Vector3[] = polygonPath.map(([x, y]) => {
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scale = dist > 0 ? (dist + tolerance) / dist : 1;
    return { x: centerX + dx * scale, y: centerY + dy * scale, z: capTopZ };
  });
  
  const bottomVertices: Vector3[] = outerVertices.map(v => ({ ...v, z: capBottomZ }));
  const topVertices: Vector3[] = outerVertices;
  
  // Top face - triangulate polygon from center
  const topCenter: Vector3 = { x: centerX, y: centerY, z: capTopZ };
  const bottomCenter: Vector3 = { x: centerX, y: centerY, z: capBottomZ };
  
  for (let i = 0; i < outerVertices.length; i++) {
    const next = (i + 1) % outerVertices.length;
    // Top face fan triangulation
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: topCenter,
      v2: topVertices[i],
      v3: topVertices[next]
    });
    // Bottom face fan triangulation (reversed winding)
    triangles.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: bottomCenter,
      v2: bottomVertices[next],
      v3: bottomVertices[i]
    });
    // Side faces
    const dx = topVertices[next].x - topVertices[i].x;
    const dy = topVertices[next].y - topVertices[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? dy / len : 0;
    const ny = len > 0 ? -dx / len : 0;
    
    triangles.push({
      normal: { x: nx, y: ny, z: 0 },
      v1: bottomVertices[i],
      v2: bottomVertices[next],
      v3: topVertices[next]
    });
    triangles.push({
      normal: { x: nx, y: ny, z: 0 },
      v1: bottomVertices[i],
      v2: topVertices[next],
      v3: topVertices[i]
    });
  }
  
  return triangles;
}

// Generate modular shape tiles (hexagon, triangle, etc.)
export function generateModularShape(
  settings: ModularShapeSettings
): ExportedPart[] {
  const {
    shapeType,
    edgeLength,
    channelWidth,
    wallHeight,
    wallThickness,
    baseThickness,
    capThickness,
    diffuserType = "shell",
    connectorEnabled,
    connectorType = "male",
    connectorTabWidth,
    connectorTabDepth,
    connectorTolerance = 0.2,
  } = settings;
  
  console.log(`[Modular Generator] Creating ${shapeType} tile, edge=${edgeLength}mm, connector=${connectorType}`);
  
  // Generate the polygon path
  const polygonPath = generatePolygonPath(shapeType, edgeLength);
  console.log(`[Modular Generator] Generated ${polygonPath.length} vertices`);
  
  // Create U-channel following the polygon outline
  const baseTriangles = createUChannel(polygonPath, channelWidth, wallThickness, wallHeight, baseThickness);
  console.log(`[Modular Generator] Base U-channel: ${baseTriangles.length} triangles`);
  
  // Add connector tabs (male) or slots (female) on each edge if enabled
  if (connectorEnabled) {
    if (connectorType === "male") {
      // Male: protruding tabs
      const tabTriangles = createConnectorTabs(
        polygonPath,
        channelWidth,
        wallHeight,
        baseThickness,
        connectorTabWidth - connectorTolerance, // Slightly smaller for fit
        connectorTabDepth
      );
      baseTriangles.push(...tabTriangles);
      console.log(`[Modular Generator] Added ${tabTriangles.length} male connector tab triangles`);
    } else {
      // Female: receiving slots (recesses in the wall)
      const slotTriangles = createConnectorSlots(
        polygonPath,
        channelWidth,
        wallHeight,
        baseThickness,
        connectorTabWidth + connectorTolerance, // Slightly larger for fit
        connectorTabDepth,
        wallThickness
      );
      baseTriangles.push(...slotTriangles);
      console.log(`[Modular Generator] Added ${slotTriangles.length} female connector slot triangles`);
    }
  }
  
  // Create diffuser cap based on type
  let capTriangles: Triangle[];
  if (diffuserType === "shell") {
    // Full shell cover (like Nanoleaf) - solid face for RGB diffusion
    capTriangles = createShellDiffuser(
      polygonPath,
      wallHeight,
      baseThickness,
      capThickness,
      0.3
    );
    console.log(`[Modular Generator] Created shell diffuser: ${capTriangles.length} triangles`);
  } else {
    // Outline diffuser - follows channel edge only
    capTriangles = createDiffuserCap(
      polygonPath,
      channelWidth,
      wallThickness,
      wallHeight,
      baseThickness,
      capThickness,
      0.2
    );
    console.log(`[Modular Generator] Created outline diffuser: ${capTriangles.length} triangles`);
  }
  
  const results: ExportedPart[] = [];
  const shapeNames: Record<ModularShapeType, string> = {
    hexagon: "hex",
    triangle: "tri",
    square: "square",
    pentagon: "pent",
    octagon: "oct",
  };
  const shapeName = shapeNames[shapeType];
  
  // Base tile
  const baseContent = trianglesToSTL(baseTriangles, `${shapeName}_tile_base`);
  console.log(`[Modular Generator] Base STL: ${baseTriangles.length} triangles, ${baseContent.length} bytes`);
  results.push({
    filename: `${shapeName}_tile_${edgeLength}mm_base.stl`,
    content: baseContent,
    partType: "modular_base",
    material: "opaque"
  });
  
  // Diffuser cap
  if (capTriangles.length > 0) {
    const capContent = trianglesToSTL(capTriangles, `${shapeName}_tile_cap`);
    results.push({
      filename: `${shapeName}_tile_${edgeLength}mm_cap.stl`,
      content: capContent,
      partType: "modular_cap",
      material: "diffuser"
    });
  }
  
  return results;
}
