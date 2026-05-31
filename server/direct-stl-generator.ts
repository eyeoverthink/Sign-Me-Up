/**
 * Direct STL Generator - Converts images directly to STL binary format
 * No OpenSCAD required - pure TypeScript mesh generation
 * 
 * Uses Marching Squares for smooth contour extraction
 * 
 * Modes:
 * - Heightmap: Brightness values become Z heights (like lithophane)
 * - Extrude: Silhouette is extruded to uniform height with smooth edges
 */

import sharp from 'sharp';

export interface ImageToSTLSettings {
  mode: 'heightmap' | 'extrude';
  width: number;           // Output width in mm
  height: number;          // Output height in mm  
  maxDepth: number;        // Maximum Z height in mm
  baseThickness: number;   // Solid base thickness in mm
  invert: boolean;         // Invert brightness
  detail: 'low' | 'medium' | 'high';
  removeBackground: boolean;
  backgroundTolerance: number;
}

interface Triangle {
  normal: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}

interface Point {
  x: number;
  y: number;
}

// Calculate normal from 3 vertices
function calculateNormal(v1: number[], v2: number[], v3: number[]): [number, number, number] {
  const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
  
  const nx = u[1] * v[2] - u[2] * v[1];
  const ny = u[2] * v[0] - u[0] * v[2];
  const nz = u[0] * v[1] - u[1] * v[0];
  
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return [0, 0, 1];
  
  return [nx / len, ny / len, nz / len];
}

// Marching Squares lookup table - edge configurations
const MARCHING_SQUARES_EDGES: { [key: number]: [number, number][] } = {
  0: [],
  1: [[3, 0]],
  2: [[0, 1]],
  3: [[3, 1]],
  4: [[1, 2]],
  5: [[3, 0], [1, 2]],
  6: [[0, 2]],
  7: [[3, 2]],
  8: [[2, 3]],
  9: [[2, 0]],
  10: [[0, 1], [2, 3]],
  11: [[2, 1]],
  12: [[1, 3]],
  13: [[1, 0]],
  14: [[0, 3]],
  15: []
};

// Get interpolated point on edge using linear interpolation
function getEdgePoint(
  x: number, y: number,
  edge: number,
  v00: number, v10: number, v01: number, v11: number,
  threshold: number
): Point {
  // Edge indices: 0=top, 1=right, 2=bottom, 3=left
  let t: number;
  
  switch (edge) {
    case 0: // Top edge (y, between x and x+1)
      t = (threshold - v00) / (v10 - v00 + 0.0001);
      t = Math.max(0, Math.min(1, t));
      return { x: x + t, y: y };
    case 1: // Right edge (x+1, between y and y+1)
      t = (threshold - v10) / (v11 - v10 + 0.0001);
      t = Math.max(0, Math.min(1, t));
      return { x: x + 1, y: y + t };
    case 2: // Bottom edge (y+1, between x and x+1)
      t = (threshold - v01) / (v11 - v01 + 0.0001);
      t = Math.max(0, Math.min(1, t));
      return { x: x + t, y: y + 1 };
    case 3: // Left edge (x, between y and y+1)
      t = (threshold - v00) / (v01 - v00 + 0.0001);
      t = Math.max(0, Math.min(1, t));
      return { x: x, y: y + t };
    default:
      return { x: x, y: y };
  }
}

// Extract contours using Marching Squares algorithm
function extractContours(
  data: number[][],
  threshold: number
): Point[][] {
  const rows = data.length;
  const cols = data[0].length;
  const contours: Point[][] = [];
  const visited = new Set<string>();
  
  // Collect all edge segments
  const segments: { p1: Point; p2: Point }[] = [];
  
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const v00 = data[y][x];
      const v10 = data[y][x + 1];
      const v01 = data[y + 1][x];
      const v11 = data[y + 1][x + 1];
      
      // Calculate cell configuration (4-bit index)
      let config = 0;
      if (v00 >= threshold) config |= 1;
      if (v10 >= threshold) config |= 2;
      if (v01 >= threshold) config |= 4;
      if (v11 >= threshold) config |= 8;
      
      const edges = MARCHING_SQUARES_EDGES[config];
      if (!edges || edges.length === 0) continue;
      
      for (const [e1, e2] of edges) {
        const p1 = getEdgePoint(x, y, e1, v00, v10, v01, v11, threshold);
        const p2 = getEdgePoint(x, y, e2, v00, v10, v01, v11, threshold);
        segments.push({ p1, p2 });
      }
    }
  }
  
  // Connect segments into contours
  if (segments.length === 0) return contours;
  
  const pointKey = (p: Point) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  
  // Build adjacency map
  const adjacency = new Map<string, { point: Point; next: Point }[]>();
  
  for (const seg of segments) {
    const k1 = pointKey(seg.p1);
    const k2 = pointKey(seg.p2);
    
    if (!adjacency.has(k1)) adjacency.set(k1, []);
    if (!adjacency.has(k2)) adjacency.set(k2, []);
    
    adjacency.get(k1)!.push({ point: seg.p1, next: seg.p2 });
    adjacency.get(k2)!.push({ point: seg.p2, next: seg.p1 });
  }
  
  // Trace contours
  const usedSegments = new Set<string>();
  const segKey = (p1: Point, p2: Point) => `${pointKey(p1)}-${pointKey(p2)}`;
  
  for (const seg of segments) {
    const sk = segKey(seg.p1, seg.p2);
    if (usedSegments.has(sk)) continue;
    
    const contour: Point[] = [seg.p1, seg.p2];
    usedSegments.add(sk);
    usedSegments.add(segKey(seg.p2, seg.p1));
    
    // Extend forward
    let current = seg.p2;
    let attempts = 0;
    while (attempts < 10000) {
      attempts++;
      const key = pointKey(current);
      const neighbors = adjacency.get(key);
      if (!neighbors) break;
      
      let found = false;
      for (const n of neighbors) {
        const nsk = segKey(current, n.next);
        if (!usedSegments.has(nsk)) {
          usedSegments.add(nsk);
          usedSegments.add(segKey(n.next, current));
          contour.push(n.next);
          current = n.next;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    
    // Extend backward
    current = seg.p1;
    attempts = 0;
    while (attempts < 10000) {
      attempts++;
      const key = pointKey(current);
      const neighbors = adjacency.get(key);
      if (!neighbors) break;
      
      let found = false;
      for (const n of neighbors) {
        const nsk = segKey(current, n.next);
        if (!usedSegments.has(nsk)) {
          usedSegments.add(nsk);
          usedSegments.add(segKey(n.next, current));
          contour.unshift(n.next);
          current = n.next;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    
    if (contour.length >= 3) {
      contours.push(contour);
    }
  }
  
  return contours;
}

// Douglas-Peucker simplification
function simplifyContour(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance
  let maxDist = 0;
  let maxIdx = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointLineDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyContour(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyContour(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function pointLineDistance(p: Point, l1: Point, l2: Point): number {
  const dx = l2.x - l1.x;
  const dy = l2.y - l1.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    return Math.sqrt((p.x - l1.x) ** 2 + (p.y - l1.y) ** 2);
  }
  
  const t = Math.max(0, Math.min(1, ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / lenSq));
  const projX = l1.x + t * dx;
  const projY = l1.y + t * dy;
  
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

// Ear clipping triangulation for 2D polygon
function triangulatePolygon(polygon: Point[]): [number, number, number][] {
  if (polygon.length < 3) return [];
  
  const indices: [number, number, number][] = [];
  const remaining = polygon.map((_, i) => i);
  
  // Ensure polygon is counter-clockwise
  const area = polygonArea(polygon);
  if (area < 0) {
    remaining.reverse();
  }
  
  let safety = 0;
  while (remaining.length > 3 && safety < 1000) {
    safety++;
    let earFound = false;
    
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i + remaining.length - 1) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];
      
      if (isEar(polygon, remaining, prev, curr, next)) {
        indices.push([prev, curr, next]);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }
    
    if (!earFound) break;
  }
  
  if (remaining.length === 3) {
    indices.push([remaining[0], remaining[1], remaining[2]]);
  }
  
  return indices;
}

function polygonArea(polygon: Point[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
}

function isEar(polygon: Point[], remaining: number[], prev: number, curr: number, next: number): boolean {
  const a = polygon[prev];
  const b = polygon[curr];
  const c = polygon[next];
  
  // Check if convex
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (cross <= 0) return false;
  
  // Check if any other vertex is inside the triangle
  for (const idx of remaining) {
    if (idx === prev || idx === curr || idx === next) continue;
    if (pointInTriangle(polygon[idx], a, b, c)) {
      return false;
    }
  }
  
  return true;
}

function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = p.x - a.x;
  const v2y = p.y - a.y;
  
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01 + 0.0001);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  
  return (u >= 0) && (v >= 0) && (u + v < 1);
}

// Generate smooth extruded mesh using marching squares
function generateSmoothExtrudeMesh(
  heights: number[][],
  mask: boolean[][],
  settings: ImageToSTLSettings
): Triangle[] {
  const triangles: Triangle[] = [];
  const rows = heights.length;
  const cols = heights[0].length;
  
  const scaleX = settings.width / cols;
  const scaleY = settings.height / rows;
  const extrudeHeight = settings.baseThickness + settings.maxDepth;
  
  // For extrude mode: use mask directly as binary (visible = 1, not visible = 0)
  // This creates clean edges at the mask boundary
  const thresholdMap: number[][] = [];
  for (let y = 0; y < rows; y++) {
    thresholdMap[y] = [];
    for (let x = 0; x < cols; x++) {
      // Mark visible pixels as 1, masked out as 0
      thresholdMap[y][x] = mask[y][x] ? 1.0 : 0.0;
    }
  }
  
  // Extract smooth contours using marching squares at 0.5 threshold
  const contours = extractContours(thresholdMap, 0.5);
  
  if (contours.length === 0) {
    // Fallback: if no contours found, return empty or basic shape
    return triangles;
  }
  
  // Simplify and process each contour
  const epsilon = 0.3; // Simplification tolerance
  
  for (const rawContour of contours) {
    // Simplify contour using Douglas-Peucker
    let contour = simplifyContour(rawContour, epsilon);
    
    if (contour.length < 3) continue;
    
    // Scale to world coordinates
    const scaledContour = contour.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    }));
    
    // Triangulate the top surface
    const topIndices = triangulatePolygon(scaledContour);
    
    for (const [i1, i2, i3] of topIndices) {
      const p1 = scaledContour[i1];
      const p2 = scaledContour[i2];
      const p3 = scaledContour[i3];
      
      // Top face
      triangles.push({
        normal: [0, 0, 1],
        v1: [p1.x, p1.y, extrudeHeight],
        v2: [p2.x, p2.y, extrudeHeight],
        v3: [p3.x, p3.y, extrudeHeight]
      });
      
      // Bottom face (reversed winding)
      triangles.push({
        normal: [0, 0, -1],
        v1: [p1.x, p1.y, 0],
        v2: [p3.x, p3.y, 0],
        v3: [p2.x, p2.y, 0]
      });
    }
    
    // Generate side walls along the contour
    for (let i = 0; i < scaledContour.length; i++) {
      const p1 = scaledContour[i];
      const p2 = scaledContour[(i + 1) % scaledContour.length];
      
      // Calculate wall normal
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dy / (len + 0.0001);
      const ny = -dx / (len + 0.0001);
      
      // Two triangles per wall segment
      triangles.push({
        normal: [nx, ny, 0],
        v1: [p1.x, p1.y, 0],
        v2: [p2.x, p2.y, 0],
        v3: [p1.x, p1.y, extrudeHeight]
      });
      triangles.push({
        normal: [nx, ny, 0],
        v1: [p2.x, p2.y, 0],
        v2: [p2.x, p2.y, extrudeHeight],
        v3: [p1.x, p1.y, extrudeHeight]
      });
    }
  }
  
  return triangles;
}

// Parse grayscale image data into heightmap
function parseGrayscaleToHeightmap(
  grayscaleData: Buffer,
  imageWidth: number,
  imageHeight: number,
  invert: boolean,
  removeBackground: boolean,
  backgroundTolerance: number
): { heights: number[][], mask: boolean[][] } {
  const heights: number[][] = [];
  const mask: boolean[][] = [];
  
  // First pass: collect all pixel values to determine background
  let cornerSum = 0;
  let cornerCount = 0;
  
  // Sample corners to detect background color
  const sampleSize = Math.min(5, Math.floor(imageWidth / 4), Math.floor(imageHeight / 4));
  for (let dy = 0; dy < sampleSize; dy++) {
    for (let dx = 0; dx < sampleSize; dx++) {
      // Top-left
      cornerSum += grayscaleData[dy * imageWidth + dx] || 128;
      cornerCount++;
      // Top-right
      cornerSum += grayscaleData[dy * imageWidth + (imageWidth - 1 - dx)] || 128;
      cornerCount++;
      // Bottom-left
      cornerSum += grayscaleData[(imageHeight - 1 - dy) * imageWidth + dx] || 128;
      cornerCount++;
      // Bottom-right
      cornerSum += grayscaleData[(imageHeight - 1 - dy) * imageWidth + (imageWidth - 1 - dx)] || 128;
      cornerCount++;
    }
  }
  
  const avgCornerBrightness = cornerCount > 0 ? cornerSum / cornerCount / 255 : 0.5;
  const backgroundIsLight = avgCornerBrightness > 0.5;
  
  for (let y = 0; y < imageHeight; y++) {
    heights[y] = [];
    mask[y] = [];
    for (let x = 0; x < imageWidth; x++) {
      const pixelIndex = y * imageWidth + x;
      const grayValue = grayscaleData[pixelIndex] || 128;
      let brightness = grayValue / 255;
      
      if (invert) {
        brightness = 1 - brightness;
      }
      
      heights[y][x] = brightness;
      mask[y][x] = true;
      
      // Background removal based on detected background color
      if (removeBackground) {
        const tolerance = backgroundTolerance / 255;
        const originalBrightness = grayValue / 255;
        
        if (backgroundIsLight) {
          // Light background: mask out bright pixels (near white)
          if (originalBrightness > (1 - tolerance)) {
            mask[y][x] = false;
          }
        } else {
          // Dark background: mask out dark pixels (near black)
          if (originalBrightness < tolerance) {
            mask[y][x] = false;
          }
        }
      }
    }
  }
  
  return { heights, mask };
}

// Generate heightmap mesh with Gaussian smoothing
function generateHeightmapMesh(
  heights: number[][],
  mask: boolean[][],
  settings: ImageToSTLSettings
): Triangle[] {
  const triangles: Triangle[] = [];
  const rows = heights.length;
  const cols = heights[0].length;
  
  // Apply Gaussian smoothing for smoother heightmap
  const smoothed = gaussianSmooth(heights, 1.0);
  
  const scaleX = settings.width / cols;
  const scaleY = settings.height / rows;
  const scaleZ = settings.maxDepth;
  const base = settings.baseThickness;
  
  // Create top surface triangles
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      if (!mask[y][x] || !mask[y][x+1] || !mask[y+1][x] || !mask[y+1][x+1]) continue;
      
      const x0 = x * scaleX;
      const x1 = (x + 1) * scaleX;
      const y0 = y * scaleY;
      const y1 = (y + 1) * scaleY;
      
      const z00 = base + smoothed[y][x] * scaleZ;
      const z10 = base + smoothed[y][x+1] * scaleZ;
      const z01 = base + smoothed[y+1][x] * scaleZ;
      const z11 = base + smoothed[y+1][x+1] * scaleZ;
      
      const v1: [number, number, number] = [x0, y0, z00];
      const v2: [number, number, number] = [x1, y0, z10];
      const v3: [number, number, number] = [x0, y1, z01];
      const v4: [number, number, number] = [x1, y1, z11];
      
      triangles.push({
        normal: calculateNormal(v1, v2, v3),
        v1, v2, v3
      });
      triangles.push({
        normal: calculateNormal(v2, v4, v3),
        v1: v2, v2: v4, v3
      });
    }
  }
  
  // Bottom surface
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      if (!mask[y][x] || !mask[y][x+1] || !mask[y+1][x] || !mask[y+1][x+1]) continue;
      
      const x0 = x * scaleX;
      const x1 = (x + 1) * scaleX;
      const y0 = y * scaleY;
      const y1 = (y + 1) * scaleY;
      
      const v1: [number, number, number] = [x0, y0, 0];
      const v2: [number, number, number] = [x0, y1, 0];
      const v3: [number, number, number] = [x1, y0, 0];
      const v4: [number, number, number] = [x1, y1, 0];
      
      triangles.push({
        normal: [0, 0, -1],
        v1, v2, v3
      });
      triangles.push({
        normal: [0, 0, -1],
        v1: v2, v2: v4, v3
      });
    }
  }
  
  // Side walls at edges
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const visible = mask[y][x];
      if (!visible) continue;
      
      const leftVisible = x > 0 && mask[y][x-1];
      const rightVisible = x < cols - 1 && mask[y][x+1];
      const topVisible = y > 0 && mask[y-1][x];
      const bottomVisible = y < rows - 1 && mask[y+1][x];
      
      const px = x * scaleX;
      const py = y * scaleY;
      const px1 = (x + 1) * scaleX;
      const py1 = (y + 1) * scaleY;
      const z = base + smoothed[y][x] * scaleZ;
      
      if (!leftVisible) {
        triangles.push({ normal: [-1, 0, 0], v1: [px, py, 0], v2: [px, py1, 0], v3: [px, py, z] });
        triangles.push({ normal: [-1, 0, 0], v1: [px, py1, 0], v2: [px, py1, z], v3: [px, py, z] });
      }
      
      if (!rightVisible) {
        triangles.push({ normal: [1, 0, 0], v1: [px1, py, z], v2: [px1, py1, 0], v3: [px1, py, 0] });
        triangles.push({ normal: [1, 0, 0], v1: [px1, py, z], v2: [px1, py1, z], v3: [px1, py1, 0] });
      }
      
      if (!topVisible) {
        triangles.push({ normal: [0, -1, 0], v1: [px, py, 0], v2: [px1, py, z], v3: [px, py, z] });
        triangles.push({ normal: [0, -1, 0], v1: [px, py, 0], v2: [px1, py, 0], v3: [px1, py, z] });
      }
      
      if (!bottomVisible) {
        triangles.push({ normal: [0, 1, 0], v1: [px, py1, z], v2: [px1, py1, z], v3: [px, py1, 0] });
        triangles.push({ normal: [0, 1, 0], v1: [px1, py1, z], v2: [px1, py1, 0], v3: [px, py1, 0] });
      }
    }
  }
  
  return triangles;
}

// Gaussian smoothing for heightmap
function gaussianSmooth(data: number[][], sigma: number): number[][] {
  const rows = data.length;
  const cols = data[0].length;
  const result: number[][] = [];
  
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel: number[] = [];
  const halfSize = Math.floor(kernelSize / 2);
  
  // Generate 1D Gaussian kernel
  let sum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - halfSize;
    const g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(g);
    sum += g;
  }
  // Normalize
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }
  
  // Apply horizontal pass
  const temp: number[][] = [];
  for (let y = 0; y < rows; y++) {
    temp[y] = [];
    for (let x = 0; x < cols; x++) {
      let val = 0;
      let weight = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = x + k - halfSize;
        if (sx >= 0 && sx < cols) {
          val += data[y][sx] * kernel[k];
          weight += kernel[k];
        }
      }
      temp[y][x] = weight > 0 ? val / weight : data[y][x];
    }
  }
  
  // Apply vertical pass
  for (let y = 0; y < rows; y++) {
    result[y] = [];
    for (let x = 0; x < cols; x++) {
      let val = 0;
      let weight = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = y + k - halfSize;
        if (sy >= 0 && sy < rows) {
          val += temp[sy][x] * kernel[k];
          weight += kernel[k];
        }
      }
      result[y][x] = weight > 0 ? val / weight : temp[y][x];
    }
  }
  
  return result;
}

// Convert triangles to binary STL format
function trianglesToBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const totalSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;
  
  // Header
  const header = "SignCraft 3D - Direct STL Export";
  buffer.write(header.padEnd(80, ' '), 0, 'ascii');
  offset = 80;
  
  // Triangle count
  buffer.writeUInt32LE(triangles.length, offset);
  offset += 4;
  
  // Write each triangle
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal[0], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[1], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[2], offset); offset += 4;
    
    buffer.writeFloatLE(tri.v1[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[2], offset); offset += 4;
    
    buffer.writeFloatLE(tri.v2[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[2], offset); offset += 4;
    
    buffer.writeFloatLE(tri.v3[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v3[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v3[2], offset); offset += 4;
    
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  
  return buffer;
}

// Generate STL from grayscale data
function generateSTLFromGrayscale(
  grayscaleData: Buffer,
  imageWidth: number,
  imageHeight: number,
  settings: ImageToSTLSettings
): Buffer {
  const { heights, mask } = parseGrayscaleToHeightmap(
    grayscaleData,
    imageWidth,
    imageHeight,
    settings.invert,
    settings.removeBackground,
    settings.backgroundTolerance
  );
  
  let triangles: Triangle[];
  
  if (settings.mode === 'heightmap') {
    triangles = generateHeightmapMesh(heights, mask, settings);
  } else {
    triangles = generateSmoothExtrudeMesh(heights, mask, settings);
  }
  
  return trianglesToBinarySTL(triangles);
}

// Generate STL from base64 image using sharp for proper decoding
export async function generateSTLFromBase64Image(
  base64Data: string,
  settings: ImageToSTLSettings
): Promise<{ stl: Buffer; triangleCount: number }> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Clean, 'base64');
  
  let image;
  let metadata;
  
  try {
    image = sharp(imageBuffer);
    metadata = await image.metadata();
  } catch (error) {
    throw new Error(`Failed to decode image: ${error instanceof Error ? error.message : 'Unknown format'}. Please ensure the image is a valid PNG, JPG, or WebP.`);
  }
  
  const originalWidth = metadata.width || 100;
  const originalHeight = metadata.height || 100;
  
  // Determine target resolution based on detail level
  let targetWidth: number;
  let targetHeight: number;
  
  switch (settings.detail) {
    case 'low':
      targetWidth = Math.min(originalWidth, 50);
      targetHeight = Math.min(originalHeight, 50);
      break;
    case 'high':
      targetWidth = Math.min(originalWidth, 300);
      targetHeight = Math.min(originalHeight, 300);
      break;
    default: // medium
      targetWidth = Math.min(originalWidth, 150);
      targetHeight = Math.min(originalHeight, 150);
  }
  
  // Maintain aspect ratio
  const aspectRatio = originalWidth / originalHeight;
  if (targetWidth / targetHeight > aspectRatio) {
    targetWidth = Math.round(targetHeight * aspectRatio);
  } else {
    targetHeight = Math.round(targetWidth / aspectRatio);
  }
  
  targetWidth = Math.max(targetWidth, 10);
  targetHeight = Math.max(targetHeight, 10);
  
  // Resize and convert to grayscale
  const grayscaleData = await image
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  
  const stl = generateSTLFromGrayscale(
    grayscaleData,
    targetWidth,
    targetHeight,
    settings
  );
  
  const triangleCount = stl.readUInt32LE(80);
  
  return { stl, triangleCount };
}

export const DEFAULT_IMAGE_TO_STL_SETTINGS: ImageToSTLSettings = {
  mode: 'extrude',
  width: 100,
  height: 100,
  maxDepth: 5,
  baseThickness: 2,
  invert: false,
  detail: 'medium',
  removeBackground: true,
  backgroundTolerance: 30
};
