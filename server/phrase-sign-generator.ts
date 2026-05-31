import type { PhraseSignSettings } from "@shared/schema";
import archiver from "archiver";
import { Writable } from "stream";
import {
  douglasPeucker,
  generateSmoothConnection,
  connectLetterPaths,
  Point2D as ScottPoint2D,
} from "./scott-algorithm";
import { getTextStrokePathsFromFont, neonFontOptions } from "./font-loader";

interface Triangle {
  vertices: [
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ];
  normal: [number, number, number];
}

function trianglesToSTL(triangles: Triangle[], name: string = "PhraseSign"): Buffer {
  const HEADER_SIZE = 80;
  const TRIANGLE_SIZE = 50;
  const numTriangles = triangles.length;
  const bufferSize = HEADER_SIZE + 4 + numTriangles * TRIANGLE_SIZE;
  
  const buffer = Buffer.alloc(bufferSize);
  
  const headerStr = `SignCraft 3D - ${name}`.padEnd(HEADER_SIZE, " ");
  buffer.write(headerStr.substring(0, HEADER_SIZE), 0, "ascii");
  
  buffer.writeUInt32LE(numTriangles, HEADER_SIZE);
  
  let offset = HEADER_SIZE + 4;
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal[0], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[1], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[2], offset); offset += 4;
    
    for (const v of tri.vertices) {
      buffer.writeFloatLE(v[0], offset); offset += 4;
      buffer.writeFloatLE(v[1], offset); offset += 4;
      buffer.writeFloatLE(v[2], offset); offset += 4;
    }
    
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  
  return buffer;
}

function verticesToTriangles(vertices: number[], normals: number[]): Triangle[] {
  const triangles: Triangle[] = [];
  
  for (let i = 0; i < vertices.length; i += 9) {
    const v1: [number, number, number] = [vertices[i], vertices[i + 1], vertices[i + 2]];
    const v2: [number, number, number] = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
    const v3: [number, number, number] = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];
    
    const nIdx = Math.floor(i / 3);
    const n: [number, number, number] = [
      normals[nIdx] || 0,
      normals[nIdx + 1] || 0,
      normals[nIdx + 2] || 1,
    ];
    
    triangles.push({
      vertices: [v1, v2, v3],
      normal: n,
    });
  }
  
  return triangles;
}

interface Point2D {
  x: number;
  y: number;
}

interface LetterPath {
  char: string;
  outline: Point2D[];
  centerline: Point2D[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

// Map common font IDs to neon font IDs that we have files for
function mapFontIdToNeonFont(fontId: string): string {
  const fontMap: Record<string, string> = {
    "arial": "airstream",
    "helvetica": "airstream", 
    "sans-serif": "airstream",
    "inter": "future-light",
    "roboto": "future-light",
    "poppins": "airstream-nf",
    "montserrat": "airstream-nf",
    "open-sans": "future-light",
    "script": "alliston",
    "cursive": "halimun",
    "serif": "darlington",
    "playfair": "darlington",
    "fun": "cookiemonster",
    "display": "dirtyboy",
  };
  
  // If it's already a neon font ID, return it
  if (neonFontOptions.some(f => f.id === fontId)) {
    return fontId;
  }
  
  // Otherwise map it or default to airstream
  return fontMap[fontId.toLowerCase()] || "airstream";
}

function generateLetterPathsFromFont(text: string, fontId: string, fontSize: number): {
  paths: LetterPath[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} {
  const mappedFontId = mapFontIdToNeonFont(fontId);
  const result = getTextStrokePathsFromFont(text, mappedFontId, fontSize);
  
  // If font loader failed, fall back to simple geometric shapes
  if (result.paths.length === 0) {
    console.log(`[PhraseSign] Font fallback for "${text}" with font "${fontId}" -> "${mappedFontId}"`);
    return generateFallbackLetterPaths(text, fontSize);
  }
  
  // Convert paths to LetterPath format
  const letterPaths: LetterPath[] = result.paths.map((pathPoints, idx) => {
    const outline: Point2D[] = pathPoints.map(p => ({ x: p[0], y: p[1] }));
    const centerline = generateCenterlineFromPath(outline);
    
    const xs = outline.map(p => p.x);
    const ys = outline.map(p => p.y);
    
    return {
      char: text[idx] || '',
      outline,
      centerline,
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
    };
  });
  
  return { paths: letterPaths, bounds: result.bounds };
}

function generateFallbackLetterPaths(text: string, fontSize: number): {
  paths: LetterPath[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
} {
  const charWidth = fontSize * 0.6;
  const letterSpacing = charWidth * 0.15;
  const letterPaths: LetterPath[] = [];
  let xOffset = 0;
  
  for (const char of text) {
    if (char === ' ') {
      xOffset += charWidth * 0.5;
      continue;
    }
    
    // Create a simple rectangular outline for the letter
    const halfW = charWidth * 0.4;
    const halfH = fontSize * 0.45;
    const cx = xOffset + charWidth / 2;
    const cy = fontSize / 2;
    
    // Generate letter outline using rectangle with rounded corners
    const outline: Point2D[] = [];
    const cornerRadius = Math.min(halfW, halfH) * 0.2;
    const segments = 8;
    
    // Top-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i / segments) * (Math.PI / 2);
      outline.push({
        x: cx + halfW - cornerRadius + Math.cos(angle) * cornerRadius,
        y: cy + halfH - cornerRadius + Math.sin(angle) * cornerRadius,
      });
    }
    // Bottom-right corner
    for (let i = 0; i <= segments; i++) {
      const angle = 0 + (i / segments) * (Math.PI / 2);
      outline.push({
        x: cx + halfW - cornerRadius + Math.cos(angle) * cornerRadius,
        y: cy - halfH + cornerRadius + Math.sin(angle) * cornerRadius,
      });
    }
    // Bottom-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI / 2 + (i / segments) * (Math.PI / 2);
      outline.push({
        x: cx - halfW + cornerRadius + Math.cos(angle) * cornerRadius,
        y: cy - halfH + cornerRadius + Math.sin(angle) * cornerRadius,
      });
    }
    // Top-left corner
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (i / segments) * (Math.PI / 2);
      outline.push({
        x: cx - halfW + cornerRadius + Math.cos(angle) * cornerRadius,
        y: cy + halfH - cornerRadius + Math.sin(angle) * cornerRadius,
      });
    }
    
    const centerline: Point2D[] = [
      { x: cx - halfW * 0.5, y: cy },
      { x: cx, y: cy },
      { x: cx + halfW * 0.5, y: cy },
    ];
    
    const xs = outline.map(p => p.x);
    const ys = outline.map(p => p.y);
    
    letterPaths.push({
      char,
      outline,
      centerline,
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
    });
    
    xOffset += charWidth + letterSpacing;
  }
  
  const allXs = letterPaths.flatMap(p => [p.bounds.minX, p.bounds.maxX]);
  const allYs = letterPaths.flatMap(p => [p.bounds.minY, p.bounds.maxY]);
  
  return {
    paths: letterPaths,
    bounds: {
      minX: Math.min(...allXs),
      maxX: Math.max(...allXs),
      minY: Math.min(...allYs),
      maxY: Math.max(...allYs),
    },
  };
}

function generateCenterlineFromPath(outline: Point2D[]): Point2D[] {
  if (outline.length < 4) return outline;
  
  // Find the center of the outline
  let centerX = 0, centerY = 0;
  outline.forEach(p => { centerX += p.x; centerY += p.y; });
  centerX /= outline.length;
  centerY /= outline.length;
  
  // Find bounding box
  const xs = outline.map(p => p.x);
  const ys = outline.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  // Create a horizontal centerline through the shape
  const width = maxX - minX;
  return [
    { x: minX + width * 0.1, y: centerY },
    { x: centerX, y: centerY },
    { x: maxX - width * 0.1, y: centerY },
  ];
}


function weldLetterPaths(paths: LetterPath[], mode: string, gap: number): Point2D[] {
  if (paths.length === 0) return [];
  
  // Convert LetterPath centerlines to number[][][] format for Scott Algorithm
  const letterPathArrays: number[][][] = paths.map(p => 
    p.centerline.map(pt => [pt.x, pt.y])
  );
  
  if (mode === "none") {
    // No welding - just return all centerlines
    const allPoints: Point2D[] = [];
    paths.forEach(p => allPoints.push(...p.centerline));
    return allPoints;
  }
  
  // Use Scott Algorithm letter connector for intelligent path welding
  const maxConnectionDistance = mode === "cursive" ? gap * 3 : gap * 2;
  const simplificationTolerance = mode === "cursive" ? 0.5 : 1.0;
  
  const connectionResult = connectLetterPaths(
    letterPathArrays,
    maxConnectionDistance,
    simplificationTolerance
  );
  
  // For cursive mode, add smooth bezier connections between letters
  if (mode === "cursive") {
    const allPoints: Point2D[] = [];
    
    paths.forEach((path, i) => {
      allPoints.push(...path.centerline);
      
      if (i < paths.length - 1) {
        const currentEnd = path.centerline[path.centerline.length - 1];
        const nextStart = paths[i + 1].centerline[0];
        
        // Use Scott Algorithm smooth connection
        const connection = generateSmoothConnection(
          [currentEnd.x, currentEnd.y],
          [nextStart.x, nextStart.y],
          8
        );
        
        // Add connection points (skip first and last to avoid duplicates)
        for (let j = 1; j < connection.length - 1; j++) {
          allPoints.push({ x: connection[j][0], y: connection[j][1] });
        }
      }
    });
    
    return allPoints;
  }
  
  // For continuous or auto mode, use Scott Algorithm connected paths
  if (connectionResult.connectedPaths.length > 0) {
    const allPoints: Point2D[] = [];
    
    for (const path of connectionResult.connectedPaths) {
      for (const pt of path) {
        allPoints.push({ x: pt[0], y: pt[1] });
      }
    }
    
    return allPoints;
  }
  
  // Fallback: return simple concatenation
  const allPoints: Point2D[] = [];
  paths.forEach((path, i) => {
    allPoints.push(...path.centerline);
    
    if (i < paths.length - 1) {
      const currentEnd = path.centerline[path.centerline.length - 1];
      const nextStart = paths[i + 1].centerline[0];
      allPoints.push({ x: (currentEnd.x + nextStart.x) / 2, y: currentEnd.y });
    }
  });
  
  return allPoints;
}

function smoothPath(points: Point2D[], level: number): Point2D[] {
  if (points.length < 3 || level <= 1) return points;
  
  // Apply Douglas-Peucker simplification using Scott Algorithm
  // Higher smoothing level = lower tolerance = more detail preserved
  const tolerance = Math.max(0.1, 10 - level);
  const scottPoints: ScottPoint2D[] = points.map(p => ({ x: p.x, y: p.y }));
  const simplified = douglasPeucker(scottPoints, tolerance);
  
  // Also apply moving average smoothing for extra smoothness
  const smoothed: Point2D[] = [simplified[0]];
  const windowSize = Math.min(Math.floor(level / 2), Math.floor(simplified.length / 3));
  
  for (let i = 1; i < simplified.length - 1; i++) {
    let sumX = 0, sumY = 0, count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(simplified.length - 1, i + windowSize); j++) {
      sumX += simplified[j].x;
      sumY += simplified[j].y;
      count++;
    }
    smoothed.push({ x: sumX / count, y: sumY / count });
  }
  
  smoothed.push(simplified[simplified.length - 1]);
  return smoothed;
}

function getLedChannelWidthForType(ledType: string): number {
  switch (ledType) {
    case "silicone_neon_6mm": return 6.0;
    case "silicone_neon_8mm": return 8.0;
    case "led_strip_10mm": return 10.5;
    case "individual_pixels_14mm": return 14.0;
    default: return 6.0;
  }
}

function generateShellBody(
  paths: LetterPath[],
  settings: PhraseSignSettings
): { vertices: number[]; normals: number[] } {
  const { 
    signHeight, wallThickness, baseThickness, ledType,
    enableFrictionLip, frictionLipOverhang,
    enableWireHoles, wireHoleHeight, wireHoleDiameter,
    lidTolerance
  } = settings;
  
  const ledChannelWidth = getLedChannelWidthForType(ledType);
  const vertices: number[] = [];
  const normals: number[] = [];
  
  const LID_SHELF_WIDTH = 1.5;
  const LID_SHELF_DEPTH = 2.0;
  
  const isSiliconeNeon = ledType.startsWith("silicone_neon");
  const lipOverhang = enableFrictionLip && isSiliconeNeon ? frictionLipOverhang : 0;
  
  const offsetOutward = (points: Point2D[], offset: number): Point2D[] => {
    const center = { x: 0, y: 0 };
    points.forEach(p => { center.x += p.x; center.y += p.y; });
    center.x /= points.length;
    center.y /= points.length;
    
    return points.map(p => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return p;
      return {
        x: p.x + (dx / len) * offset,
        y: p.y + (dy / len) * offset,
      };
    });
  };
  
  const topZ = baseThickness + signHeight;
  const channelBottom = baseThickness;
  const channelTop = topZ - LID_SHELF_DEPTH;
  const lipHeight = signHeight * 0.7;
  const lipZ = channelBottom + lipHeight;
  
  paths.forEach((path, pathIdx) => {
    const innerOutline = path.outline;
    const outerOutline = offsetOutward(innerOutline, wallThickness + ledChannelWidth / 2);
    const lipOutline = offsetOutward(innerOutline, wallThickness + ledChannelWidth / 2 - lipOverhang);
    const lidShelfOutline = offsetOutward(innerOutline, wallThickness + ledChannelWidth / 2 + LID_SHELF_WIDTH);
    
    for (let i = 0; i < innerOutline.length; i++) {
      const i2 = (i + 1) % innerOutline.length;
      
      const pInner1 = innerOutline[i];
      const pInner2 = innerOutline[i2];
      const pOuter1 = outerOutline[i];
      const pOuter2 = outerOutline[i2];
      const pLip1 = lipOutline[i];
      const pLip2 = lipOutline[i2];
      const pShelf1 = lidShelfOutline[i];
      const pShelf2 = lidShelfOutline[i2];
      
      vertices.push(pOuter1.x, pOuter1.y, channelBottom);
      vertices.push(pOuter2.x, pOuter2.y, channelBottom);
      vertices.push(pShelf1.x, pShelf1.y, channelBottom);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
      
      vertices.push(pOuter2.x, pOuter2.y, channelBottom);
      vertices.push(pShelf2.x, pShelf2.y, channelBottom);
      vertices.push(pShelf1.x, pShelf1.y, channelBottom);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
      
      if (lipOverhang > 0) {
        vertices.push(pOuter1.x, pOuter1.y, channelBottom);
        vertices.push(pOuter2.x, pOuter2.y, channelBottom);
        vertices.push(pOuter1.x, pOuter1.y, lipZ);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
        
        vertices.push(pOuter2.x, pOuter2.y, channelBottom);
        vertices.push(pOuter2.x, pOuter2.y, lipZ);
        vertices.push(pOuter1.x, pOuter1.y, lipZ);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
        
        vertices.push(pOuter1.x, pOuter1.y, lipZ);
        vertices.push(pOuter2.x, pOuter2.y, lipZ);
        vertices.push(pLip1.x, pLip1.y, lipZ);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
        
        vertices.push(pOuter2.x, pOuter2.y, lipZ);
        vertices.push(pLip2.x, pLip2.y, lipZ);
        vertices.push(pLip1.x, pLip1.y, lipZ);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
        
        vertices.push(pLip1.x, pLip1.y, lipZ);
        vertices.push(pLip2.x, pLip2.y, lipZ);
        vertices.push(pLip1.x, pLip1.y, channelTop);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
        
        vertices.push(pLip2.x, pLip2.y, lipZ);
        vertices.push(pLip2.x, pLip2.y, channelTop);
        vertices.push(pLip1.x, pLip1.y, channelTop);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
      } else {
        vertices.push(pOuter1.x, pOuter1.y, channelBottom);
        vertices.push(pOuter2.x, pOuter2.y, channelBottom);
        vertices.push(pOuter1.x, pOuter1.y, channelTop);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
        
        vertices.push(pOuter2.x, pOuter2.y, channelBottom);
        vertices.push(pOuter2.x, pOuter2.y, channelTop);
        vertices.push(pOuter1.x, pOuter1.y, channelTop);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
      }
      
      vertices.push(pShelf1.x, pShelf1.y, channelBottom);
      vertices.push(pShelf2.x, pShelf2.y, channelBottom);
      vertices.push(pShelf1.x, pShelf1.y, topZ);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      
      vertices.push(pShelf2.x, pShelf2.y, channelBottom);
      vertices.push(pShelf2.x, pShelf2.y, topZ);
      vertices.push(pShelf1.x, pShelf1.y, topZ);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      
      const pLidInner1 = lipOverhang > 0 ? pLip1 : pOuter1;
      const pLidInner2 = lipOverhang > 0 ? pLip2 : pOuter2;
      
      vertices.push(pLidInner1.x, pLidInner1.y, channelTop);
      vertices.push(pLidInner2.x, pLidInner2.y, channelTop);
      vertices.push(pShelf1.x, pShelf1.y, channelTop);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      
      vertices.push(pLidInner2.x, pLidInner2.y, channelTop);
      vertices.push(pShelf2.x, pShelf2.y, channelTop);
      vertices.push(pShelf1.x, pShelf1.y, channelTop);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      
      vertices.push(pShelf1.x, pShelf1.y, channelTop);
      vertices.push(pShelf2.x, pShelf2.y, channelTop);
      vertices.push(pShelf1.x, pShelf1.y, topZ);
      normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
      
      vertices.push(pShelf2.x, pShelf2.y, channelTop);
      vertices.push(pShelf2.x, pShelf2.y, topZ);
      vertices.push(pShelf1.x, pShelf1.y, topZ);
      normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
    }
  });
  
  return { vertices, normals };
}

function generateWireHoles(
  paths: LetterPath[],
  settings: PhraseSignSettings
): { vertices: number[]; normals: number[] } {
  const { baseThickness, wireHoleHeight, wireHoleDiameter, wallThickness, ledType } = settings;
  const vertices: number[] = [];
  const normals: number[] = [];
  
  const ledChannelWidth = getLedChannelWidthForType(ledType);
  const holeRadius = wireHoleDiameter / 2;
  const holeCenterZ = baseThickness + wireHoleHeight;
  const segments = 12;
  
  paths.forEach((path, pathIdx) => {
    const xs = path.outline.map(p => p.x);
    const ys = path.outline.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    
    const leftHoleX = minX - wallThickness - ledChannelWidth / 2;
    const rightHoleX = maxX + wallThickness + ledChannelWidth / 2;
    
    for (const holeX of [leftHoleX, rightHoleX]) {
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = holeX;
        const y1 = centerY + Math.cos(angle1) * holeRadius;
        const z1 = holeCenterZ + Math.sin(angle1) * holeRadius;
        
        const x2 = holeX;
        const y2 = centerY + Math.cos(angle2) * holeRadius;
        const z2 = holeCenterZ + Math.sin(angle2) * holeRadius;
        
        vertices.push(holeX, centerY, holeCenterZ);
        vertices.push(x1, y1, z1);
        vertices.push(x2, y2, z2);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
      }
    }
  });
  
  return { vertices, normals };
}

function generateLidGeometry(
  paths: LetterPath[],
  settings: PhraseSignSettings
): { vertices: number[]; normals: number[] } {
  const { 
    signHeight, wallThickness, baseThickness, 
    lidStyle, lidTolerance, domeHeight, ledType
  } = settings;
  
  const vertices: number[] = [];
  const normals: number[] = [];
  
  const ledChannelWidth = getLedChannelWidthForType(ledType);
  const LID_SHELF_WIDTH = 1.5;
  const LID_SHELF_DEPTH = 2.0;
  const LID_THICKNESS = 2.0;
  
  const lidZ = baseThickness + signHeight - LID_SHELF_DEPTH;
  
  const offsetOutward = (points: Point2D[], offset: number): Point2D[] => {
    const center = { x: 0, y: 0 };
    points.forEach(p => { center.x += p.x; center.y += p.y; });
    center.x /= points.length;
    center.y /= points.length;
    
    return points.map(p => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return p;
      return {
        x: p.x + (dx / len) * offset,
        y: p.y + (dy / len) * offset,
      };
    });
  };
  
  paths.forEach(path => {
    const lidInnerOffset = wallThickness + ledChannelWidth / 2 - lidTolerance;
    const lidOuterOffset = wallThickness + ledChannelWidth / 2 + LID_SHELF_WIDTH - lidTolerance;
    
    const lidInnerOutline = offsetOutward(path.outline, lidInnerOffset);
    const lidOuterOutline = offsetOutward(path.outline, lidOuterOffset);
    
    const center = { x: 0, y: 0 };
    lidOuterOutline.forEach(p => { center.x += p.x; center.y += p.y; });
    center.x /= lidOuterOutline.length;
    center.y /= lidOuterOutline.length;
    
    const topZ = lidStyle === "domed" ? lidZ + LID_THICKNESS + domeHeight : lidZ + LID_THICKNESS;
    
    for (let i = 0; i < lidInnerOutline.length; i++) {
      const i2 = (i + 1) % lidInnerOutline.length;
      const pIn1 = lidInnerOutline[i];
      const pIn2 = lidInnerOutline[i2];
      const pOut1 = lidOuterOutline[i];
      const pOut2 = lidOuterOutline[i2];
      
      vertices.push(pIn1.x, pIn1.y, lidZ);
      vertices.push(pIn2.x, pIn2.y, lidZ);
      vertices.push(pOut1.x, pOut1.y, lidZ);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
      
      vertices.push(pIn2.x, pIn2.y, lidZ);
      vertices.push(pOut2.x, pOut2.y, lidZ);
      vertices.push(pOut1.x, pOut1.y, lidZ);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
      
      vertices.push(pOut1.x, pOut1.y, lidZ);
      vertices.push(pOut2.x, pOut2.y, lidZ);
      vertices.push(pOut1.x, pOut1.y, lidZ + LID_THICKNESS);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      
      vertices.push(pOut2.x, pOut2.y, lidZ);
      vertices.push(pOut2.x, pOut2.y, lidZ + LID_THICKNESS);
      vertices.push(pOut1.x, pOut1.y, lidZ + LID_THICKNESS);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      
      if (lidStyle === "flat") {
        vertices.push(pIn1.x, pIn1.y, lidZ + LID_THICKNESS);
        vertices.push(pOut1.x, pOut1.y, lidZ + LID_THICKNESS);
        vertices.push(pIn2.x, pIn2.y, lidZ + LID_THICKNESS);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
        
        vertices.push(pIn2.x, pIn2.y, lidZ + LID_THICKNESS);
        vertices.push(pOut1.x, pOut1.y, lidZ + LID_THICKNESS);
        vertices.push(pOut2.x, pOut2.y, lidZ + LID_THICKNESS);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      } else {
        vertices.push(center.x, center.y, topZ);
        vertices.push(pOut1.x, pOut1.y, lidZ + LID_THICKNESS);
        vertices.push(pOut2.x, pOut2.y, lidZ + LID_THICKNESS);
        
        const dx = (pOut1.x + pOut2.x) / 2 - center.x;
        const dy = (pOut1.y + pOut2.y) / 2 - center.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / len;
        const ny = dy / len;
        normals.push(nx, ny, 0.5, nx, ny, 0.5, nx, ny, 0.5);
      }
    }
  });
  
  return { vertices, normals };
}

function generateBorderGeometry(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  settings: PhraseSignSettings
): { vertices: number[]; normals: number[] } {
  const { borderStyle, borderWidth, borderPadding, borderRadius, signHeight, baseThickness } = settings;
  const vertices: number[] = [];
  const normals: number[] = [];
  
  if (borderStyle === "none") return { vertices, normals };
  
  const innerWidth = bounds.maxX - bounds.minX + borderPadding * 2;
  const innerHeight = bounds.maxY - bounds.minY + borderPadding * 2;
  const outerWidth = innerWidth + borderWidth * 2;
  const outerHeight = innerHeight + borderWidth * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  const resolution = 32;
  const innerPoints: Point2D[] = [];
  const outerPoints: Point2D[] = [];
  
  if (borderStyle === "rectangle" || borderStyle === "rounded") {
    const r = borderStyle === "rounded" ? Math.min(borderRadius, innerWidth / 2, innerHeight / 2) : 0;
    const corners = [
      { x: centerX - innerWidth / 2 + r, y: centerY - innerHeight / 2 + r, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
      { x: centerX + innerWidth / 2 - r, y: centerY - innerHeight / 2 + r, startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 },
      { x: centerX + innerWidth / 2 - r, y: centerY + innerHeight / 2 - r, startAngle: 0, endAngle: Math.PI * 0.5 },
      { x: centerX - innerWidth / 2 + r, y: centerY + innerHeight / 2 - r, startAngle: Math.PI * 0.5, endAngle: Math.PI },
    ];
    
    corners.forEach((corner, idx) => {
      if (r > 0) {
        for (let i = 0; i <= 8; i++) {
          const angle = corner.startAngle + (corner.endAngle - corner.startAngle) * (i / 8);
          innerPoints.push({ x: corner.x + Math.cos(angle) * r, y: corner.y + Math.sin(angle) * r });
          outerPoints.push({ x: corner.x + Math.cos(angle) * (r + borderWidth), y: corner.y + Math.sin(angle) * (r + borderWidth) });
        }
      } else {
        innerPoints.push({ x: corner.x, y: corner.y });
        outerPoints.push({ x: corner.x + Math.cos((corner.startAngle + corner.endAngle) / 2) * borderWidth, y: corner.y + Math.sin((corner.startAngle + corner.endAngle) / 2) * borderWidth });
      }
    });
  } else if (borderStyle === "circle" || borderStyle === "oval") {
    const radiusX = (borderStyle === "circle" ? Math.max(innerWidth, innerHeight) : innerWidth) / 2;
    const radiusY = (borderStyle === "circle" ? Math.max(innerWidth, innerHeight) : innerHeight) / 2;
    
    for (let i = 0; i < resolution; i++) {
      const angle = (i / resolution) * Math.PI * 2;
      innerPoints.push({ x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY });
      outerPoints.push({ x: centerX + Math.cos(angle) * (radiusX + borderWidth), y: centerY + Math.sin(angle) * (radiusY + borderWidth) });
    }
  }
  
  for (let i = 0; i < innerPoints.length; i++) {
    const i2 = (i + 1) % innerPoints.length;
    const p1 = innerPoints[i];
    const p2 = innerPoints[i2];
    const p3 = outerPoints[i];
    const p4 = outerPoints[i2];
    
    vertices.push(p1.x, p1.y, baseThickness);
    vertices.push(p2.x, p2.y, baseThickness);
    vertices.push(p3.x, p3.y, baseThickness);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    
    vertices.push(p2.x, p2.y, baseThickness);
    vertices.push(p4.x, p4.y, baseThickness);
    vertices.push(p3.x, p3.y, baseThickness);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    
    for (let z = 0; z < signHeight; z += signHeight) {
      vertices.push(p3.x, p3.y, baseThickness + z);
      vertices.push(p4.x, p4.y, baseThickness + z);
      vertices.push(p3.x, p3.y, baseThickness + z + signHeight);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      
      vertices.push(p4.x, p4.y, baseThickness + z);
      vertices.push(p4.x, p4.y, baseThickness + z + signHeight);
      vertices.push(p3.x, p3.y, baseThickness + z + signHeight);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
    }
  }
  
  return { vertices, normals };
}

function getLedTypeName(ledType: string): string {
  switch (ledType) {
    case "silicone_neon_6mm": return "6mm Silicone Neon";
    case "silicone_neon_8mm": return "8mm Silicone Neon";
    case "led_strip_10mm": return "10mm LED Strip";
    case "individual_pixels_14mm": return "14mm Individual Pixels";
    default: return ledType;
  }
}

function generateAssemblyInstructions(settings: PhraseSignSettings): string {
  const channelWidth = getLedChannelWidthForType(settings.ledType);
  const hasFrictionLip = settings.enableFrictionLip && settings.ledType.startsWith("silicone_neon");
  
  return `# Phrase Sign Assembly Instructions

## Sign Configuration
- Text: "${settings.text}"
- Font Size: ${settings.fontSize}mm
- LED Type: ${getLedTypeName(settings.ledType)}
- Border Style: ${settings.borderStyle}

## Shell Dimensions
- Sign Height: ${settings.signHeight}mm
- Wall Thickness: ${settings.wallThickness}mm
- Base Thickness: ${settings.baseThickness}mm
- LED Channel Width: ${channelWidth}mm
${hasFrictionLip ? `- Friction Lip Overhang: ${settings.frictionLipOverhang}mm (grips LED without glue!)` : ""}

## Components Included
1. **Body.stl** - Main letter shell with LED channels${hasFrictionLip ? " and friction lips" : ""}
${settings.enableWireHoles ? `2. Wire pass-through holes (${settings.wireHoleDiameter}mm diameter at ${settings.wireHoleHeight}mm height)` : ""}
${settings.enableDiffuserLid ? `3. **Lid.stl** - ${settings.lidStyle === "flat" ? "Flat" : "Domed"} snap-fit diffuser lid (${settings.lidTolerance}mm tolerance)` : ""}
${settings.borderStyle !== "none" ? `4. **Border.stl** - ${settings.borderStyle} frame` : ""}

## LED Installation
${hasFrictionLip ? 
`1. Push silicone neon tube into channel - friction lip holds it in place!
   - No glue required - tube snaps in
   - Can remove for maintenance` :
`1. Insert LED into channel (${channelWidth}mm wide)
   - Use hot glue at corners for LED strips`}
2. Route wires through ${settings.enableWireHoles ? `side holes (${settings.wireHoleDiameter}mm at ${settings.wireHoleHeight}mm height)` : "channel"}
3. Connect to power supply (5V for standard LEDs, 12V for some neon)
${settings.enableDiffuserLid ? `4. Snap diffuser lid into place - designed with ${settings.lidTolerance}mm tolerance for perfect fit` : ""}

## Modular Letter Connection (H-E-L-L-O Example)
\`\`\`
[H]---wire---[E]---wire---[L]---wire---[L]---wire---[O]
 ^                                                    ^
 +---------------- Shared Power Bus -----------------+
\`\`\`
- Wire exits right side of letter, enters left side of next
- All letters at same height - wire holes aligned
- Space letters 5-10mm apart
- Use hot glue dabs to secure positions

## Recommended Print Settings
- **Body:** PLA or PETG, 0.2mm layer, 20% infill
- **Lid:** White or translucent PLA, 100% infill (solid for diffusion)
- Supports: Not required
- Orientation: Upright (letter facing up)

## Post-Processing Tips
- Sand lid with 400-800 grit for frosted diffusion effect
- Use white filament for body to maximize light reflection
- For domed lids, translucent PETG gives best results
`;
}

// Get preview paths for 3D rendering in browser
export function getPhraseSignPreviewPaths(settings: PhraseSignSettings): {
  letterPaths: Array<{
    char: string;
    outline: Array<{ x: number; y: number }>;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
  }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  svgPaths: string[];
} {
  const { text, fontId, fontSize } = settings;
  const { paths: letterPaths, bounds } = generateLetterPathsFromFont(text, fontId, fontSize);
  
  // Generate SVG paths for each letter
  const svgPaths = letterPaths.map(lp => {
    if (lp.outline.length < 2) return '';
    let d = `M${lp.outline[0].x.toFixed(2)},${lp.outline[0].y.toFixed(2)}`;
    for (let i = 1; i < lp.outline.length; i++) {
      d += ` L${lp.outline[i].x.toFixed(2)},${lp.outline[i].y.toFixed(2)}`;
    }
    d += ' Z';
    return d;
  });
  
  return {
    letterPaths: letterPaths.map(lp => ({
      char: lp.char,
      outline: lp.outline,
      bounds: lp.bounds,
    })),
    bounds,
    svgPaths,
  };
}

export async function generatePhraseSign(settings: PhraseSignSettings): Promise<Buffer> {
  const { text, fontId, fontSize, weldingMode, smoothingLevel } = settings;
  
  console.log(`[PhraseSign] Generating sign for "${text}" with font "${fontId}", size ${fontSize}mm`);
  
  // Use real font paths from font loader
  const { paths: letterPaths, bounds: totalBounds } = generateLetterPathsFromFont(text, fontId, fontSize);
  
  console.log(`[PhraseSign] Generated ${letterPaths.length} letter paths`);
  
  const weldedPath = weldLetterPaths(letterPaths, weldingMode, settings.weldingGap);
  const smoothedPath = smoothPath(weldedPath, smoothingLevel);
  
  const bodyGeometry = generateShellBody(letterPaths, settings);
  const bodyTriangles = verticesToTriangles(bodyGeometry.vertices, bodyGeometry.normals);
  const bodySTL = trianglesToSTL(bodyTriangles, `${text}_Body`);
  
  let lidSTL: Buffer | null = null;
  if (settings.enableDiffuserLid) {
    const lidGeometry = generateLidGeometry(letterPaths, settings);
    const lidTriangles = verticesToTriangles(lidGeometry.vertices, lidGeometry.normals);
    lidSTL = trianglesToSTL(lidTriangles, `${text}_Lid`);
  }
  
  let borderSTL: Buffer | null = null;
  if (settings.borderStyle !== "none") {
    const borderGeometry = generateBorderGeometry(totalBounds, settings);
    const borderTriangles = verticesToTriangles(borderGeometry.vertices, borderGeometry.normals);
    borderSTL = trianglesToSTL(borderTriangles, `${text}_Border`);
  }
  
  const instructions = generateAssemblyInstructions(settings);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(writable);
    
    archive.append(bodySTL, { name: `${text.replace(/\s+/g, "_")}_Body.stl` });
    
    if (lidSTL) {
      archive.append(lidSTL, { name: `${text.replace(/\s+/g, "_")}_Lid.stl` });
    }
    
    if (borderSTL) {
      archive.append(borderSTL, { name: `${text.replace(/\s+/g, "_")}_Border.stl` });
    }
    
    archive.append(Buffer.from(instructions), { name: "ASSEMBLY_INSTRUCTIONS.md" });
    
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.finalize();
  });
}
