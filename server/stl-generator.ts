import type { LetterSettings, WiringSettings, MountingSettings, GeometrySettings, TubeSettings, TwoPartSystem, SketchPath } from "@shared/schema";
import { defaultTubeSettings, defaultTwoPartSystem } from "@shared/schema";
import opentype from "opentype.js";
import earcut from "earcut";
import path from "path";
import fs from "fs";

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

interface GeneratedPart {
  name: string;
  triangles: Triangle[];
  material: string;
}

const fontCache: Map<string, opentype.Font> = new Map();

const fontFileMap: Record<string, string> = {
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

function loadFontSync(fontId: string = "roboto"): opentype.Font {
  if (fontCache.has(fontId)) {
    return fontCache.get(fontId)!;
  }
  
  const fontFileName = fontFileMap[fontId] || "Roboto-Bold.ttf";
  const fontPath = path.join(process.cwd(), "server/fonts", fontFileName);
  
  const parseBuffer = (buf: Buffer): opentype.Font => {
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return opentype.parse(arrayBuffer);
  };
  
  if (!fs.existsSync(fontPath)) {
    console.warn(`Font file not found: ${fontPath}, falling back to Roboto`);
    const fallbackPath = path.join(process.cwd(), "server/fonts/Roboto-Bold.ttf");
    if (!fs.existsSync(fallbackPath)) {
      throw new Error(`Default font file not found at ${fallbackPath}`);
    }
    const buffer = fs.readFileSync(fallbackPath);
    const font = parseBuffer(buffer);
    fontCache.set(fontId, font);
    return font;
  }
  
  const buffer = fs.readFileSync(fontPath);
  const font = parseBuffer(buffer);
  fontCache.set(fontId, font);
  return font;
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function calculateNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const edge1 = subtract(v2, v1);
  const edge2 = subtract(v3, v1);
  return normalize(cross(edge1, edge2));
}

function pathToContours(fontPath: opentype.Path): number[][] {
  const contours: number[][] = [];
  let currentContour: number[] = [];
  const curveSteps = 8;

  for (const cmd of fontPath.commands) {
    switch (cmd.type) {
      case "M":
        if (currentContour.length > 0) {
          contours.push(currentContour);
        }
        currentContour = [cmd.x, cmd.y];
        break;

      case "L":
        currentContour.push(cmd.x, cmd.y);
        break;

      case "Q": {
        const lastX = currentContour[currentContour.length - 2];
        const lastY = currentContour[currentContour.length - 1];
        for (let i = 1; i <= curveSteps; i++) {
          const t = i / curveSteps;
          const mt = 1 - t;
          const x = mt * mt * lastX + 2 * mt * t * cmd.x1 + t * t * cmd.x;
          const y = mt * mt * lastY + 2 * mt * t * cmd.y1 + t * t * cmd.y;
          currentContour.push(x, y);
        }
        break;
      }

      case "C": {
        const cLastX = currentContour[currentContour.length - 2];
        const cLastY = currentContour[currentContour.length - 1];
        for (let i = 1; i <= curveSteps; i++) {
          const t = i / curveSteps;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          const t2 = t * t;
          const t3 = t2 * t;
          const x = mt3 * cLastX + 3 * mt2 * t * cmd.x1 + 3 * mt * t2 * cmd.x2 + t3 * cmd.x;
          const y = mt3 * cLastY + 3 * mt2 * t * cmd.y1 + 3 * mt * t2 * cmd.y2 + t3 * cmd.y;
          currentContour.push(x, y);
        }
        break;
      }

      case "Z":
        break;
    }
  }

  if (currentContour.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}

function getContourWindingArea(contour: number[]): number {
  let area = 0;
  const n = contour.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += contour[i * 2] * contour[j * 2 + 1];
    area -= contour[j * 2] * contour[i * 2 + 1];
  }
  return area / 2;
}

function extractCenterlines(contours: number[][]): number[][] {
  const outerContours = contours.filter(c => {
    const area = getContourWindingArea(c);
    return area < 0;
  });
  
  if (outerContours.length === 0) {
    return contours.filter(c => c.length >= 6);
  }
  
  return outerContours.filter(c => c.length >= 6);
}

function triangulateContours(contours: number[][]): { vertices: number[]; indices: number[] } {
  if (contours.length === 0) return { vertices: [], indices: [] };

  const vertices = [...contours[0]];
  const holes: number[] = [];

  let offset = vertices.length / 2;
  for (let i = 1; i < contours.length; i++) {
    holes.push(offset);
    vertices.push(...contours[i]);
    offset += contours[i].length / 2;
  }

  const indices = earcut(vertices, holes);
  return { vertices, indices };
}

function getBoundaryEdges(vertices: number[], indices: number[]): number[][] {
  const edgeCount = new Map<string, { count: number; a: number; b: number }>();

  for (let i = 0; i < indices.length; i += 3) {
    const edges = [
      [indices[i], indices[i + 1]],
      [indices[i + 1], indices[i + 2]],
      [indices[i + 2], indices[i]],
    ];

    for (const [a, b] of edges) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const existing = edgeCount.get(key);
      if (existing) {
        existing.count++;
      } else {
        edgeCount.set(key, { count: 1, a, b });
      }
    }
  }

  const boundaryEdges: number[][] = [];
  edgeCount.forEach(({ count, a, b }) => {
    if (count === 1) {
      boundaryEdges.push([a, b]);
    }
  });

  return boundaryEdges;
}

function orderBoundaryEdges(edges: number[][]): number[][] {
  if (edges.length === 0) return [];

  const contours: number[][] = [];
  const usedEdges = new Set<number>();
  
  while (usedEdges.size < edges.length) {
    let startIdx = -1;
    for (let i = 0; i < edges.length; i++) {
      if (!usedEdges.has(i)) {
        startIdx = i;
        break;
      }
    }
    
    if (startIdx === -1) break;
    
    const contour: number[] = [];
    let currentIdx = startIdx;
    let currentVertex = edges[currentIdx][0];
    contour.push(currentVertex);
    
    while (true) {
      usedEdges.add(currentIdx);
      const edge = edges[currentIdx];
      const nextVertex = edge[0] === currentVertex ? edge[1] : edge[0];
      
      if (nextVertex === contour[0] && contour.length > 2) {
        break;
      }
      
      contour.push(nextVertex);
      currentVertex = nextVertex;
      
      let foundNext = false;
      for (let i = 0; i < edges.length; i++) {
        if (!usedEdges.has(i)) {
          if (edges[i][0] === currentVertex || edges[i][1] === currentVertex) {
            currentIdx = i;
            foundNext = true;
            break;
          }
        }
      }
      
      if (!foundNext) break;
    }
    
    contours.push(contour);
  }
  
  return contours;
}

function extrudeToTriangles(
  vertices2D: number[],
  indices: number[],
  depth: number,
  offsetX: number = 0,
  offsetY: number = 0,
  offsetZ: number = 0
): Triangle[] {
  const triangles: Triangle[] = [];
  const numVerts = vertices2D.length / 2;

  const frontVertices: Vector3[] = [];
  const backVertices: Vector3[] = [];

  for (let i = 0; i < vertices2D.length; i += 2) {
    frontVertices.push({
      x: vertices2D[i] + offsetX,
      y: vertices2D[i + 1] + offsetY,
      z: offsetZ,
    });
    backVertices.push({
      x: vertices2D[i] + offsetX,
      y: vertices2D[i + 1] + offsetY,
      z: offsetZ + depth,
    });
  }

  for (let i = 0; i < indices.length; i += 3) {
    const v1 = frontVertices[indices[i]];
    const v2 = frontVertices[indices[i + 1]];
    const v3 = frontVertices[indices[i + 2]];
    const normal = calculateNormal(v1, v2, v3);
    triangles.push({ normal, v1, v2, v3 });
  }

  for (let i = 0; i < indices.length; i += 3) {
    const v1 = backVertices[indices[i + 2]];
    const v2 = backVertices[indices[i + 1]];
    const v3 = backVertices[indices[i]];
    const normal = calculateNormal(v1, v2, v3);
    triangles.push({ normal, v1, v2, v3 });
  }

  const boundaryEdges = getBoundaryEdges(vertices2D, indices);
  const orderedContours = orderBoundaryEdges(boundaryEdges);

  for (const contour of orderedContours) {
    for (let i = 0; i < contour.length; i++) {
      const curr = contour[i];
      const next = contour[(i + 1) % contour.length];

      const v1 = frontVertices[curr];
      const v2 = frontVertices[next];
      const v3 = backVertices[curr];
      const v4 = backVertices[next];

      const normal1 = calculateNormal(v1, v2, v3);
      triangles.push({ normal: normal1, v1, v2, v3 });

      const normal2 = calculateNormal(v2, v4, v3);
      triangles.push({ normal: normal2, v1: v2, v2: v4, v3 });
    }
  }

  return triangles;
}

function getContourWinding(contour: number[]): number {
  let sum = 0;
  for (let i = 0; i < contour.length; i += 2) {
    const x1 = contour[i];
    const y1 = contour[i + 1];
    const x2 = contour[(i + 2) % contour.length];
    const y2 = contour[(i + 3) % contour.length];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum;
}

function isContourInside(inner: number[], outer: number[]): boolean {
  if (inner.length < 2) return false;
  const testX = inner[0];
  const testY = inner[1];
  
  let inside = false;
  for (let i = 0, j = outer.length - 2; i < outer.length; j = i, i += 2) {
    const xi = outer[i];
    const yi = outer[i + 1];
    const xj = outer[j];
    const yj = outer[j + 1];
    
    if (((yi > testY) !== (yj > testY)) && 
        (testX < (xj - xi) * (testY - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

function generateTextGeometry(
  text: string,
  fontSize: number,
  depth: number,
  offsetX: number = 0,
  offsetY: number = 0,
  offsetZ: number = 0,
  fontId: string = "roboto"
): Triangle[] {
  const font = loadFontSync(fontId);
  const allTriangles: Triangle[] = [];

  const glyphs = font.stringToGlyphs(text);
  let currentX = 0;
  
  const glyphData: { contours: number[][]; x: number }[] = [];
  
  for (const glyph of glyphs) {
    if (glyph.advanceWidth) {
      const glyphPath = glyph.getPath(currentX, 0, fontSize);
      const contours = pathToContours(glyphPath);
      if (contours.length > 0) {
        glyphData.push({ contours, x: currentX });
      }
      currentX += (glyph.advanceWidth / font.unitsPerEm) * fontSize;
    }
  }

  if (glyphData.length === 0) {
    return generateFallbackTextGeometry(text, fontSize, depth, offsetX, offsetY, offsetZ);
  }

  let globalMinX = Infinity, globalMaxX = -Infinity;
  let globalMinY = Infinity, globalMaxY = -Infinity;

  for (const { contours } of glyphData) {
    for (const contour of contours) {
      for (let i = 0; i < contour.length; i += 2) {
        globalMinX = Math.min(globalMinX, contour[i]);
        globalMaxX = Math.max(globalMaxX, contour[i]);
        globalMinY = Math.min(globalMinY, contour[i + 1]);
        globalMaxY = Math.max(globalMaxY, contour[i + 1]);
      }
    }
  }

  const centerX = (globalMinX + globalMaxX) / 2;
  const centerY = (globalMinY + globalMaxY) / 2;

  for (const { contours } of glyphData) {
    const outerContours: number[][] = [];
    const holeContours: number[][] = [];
    
    for (const contour of contours) {
      const winding = getContourWinding(contour);
      if (winding > 0) {
        holeContours.push(contour);
      } else {
        outerContours.push(contour);
      }
    }
    
    for (const outer of outerContours) {
      const holesForThisOuter: number[][] = [];
      for (const hole of holeContours) {
        if (isContourInside(hole, outer)) {
          holesForThisOuter.push(hole);
        }
      }
      
      const { vertices, indices } = triangulateContours([outer, ...holesForThisOuter]);
      
      if (indices.length > 0) {
        const centeredVertices: number[] = [];
        for (let i = 0; i < vertices.length; i += 2) {
          centeredVertices.push(
            vertices[i] - centerX,
            -(vertices[i + 1] - centerY)
          );
        }
        
        const letterTriangles = extrudeToTriangles(
          centeredVertices,
          indices,
          depth,
          offsetX,
          offsetY,
          offsetZ
        );
        allTriangles.push(...letterTriangles);
      }
    }
  }

  if (allTriangles.length === 0) {
    return generateFallbackTextGeometry(text, fontSize, depth, offsetX, offsetY, offsetZ);
  }

  return allTriangles;
}

function generateFallbackTextGeometry(
  text: string,
  fontSize: number,
  depth: number,
  offsetX: number,
  offsetY: number,
  offsetZ: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;
  const spacing = fontSize * 0.1;
  const totalWidth = text.length * (charWidth + spacing) - spacing;
  const startX = -totalWidth / 2;

  for (let i = 0; i < text.length; i++) {
    const x = startX + i * (charWidth + spacing) + charWidth / 2 + offsetX;
    const boxTriangles = generateBoxTriangles(
      charWidth,
      charHeight,
      depth,
      x,
      offsetY,
      offsetZ + depth / 2
    );
    triangles.push(...boxTriangles);
  }

  return triangles;
}

function generateBoxTriangles(
  width: number,
  height: number,
  depth: number,
  offsetX: number = 0,
  offsetY: number = 0,
  offsetZ: number = 0
): Triangle[] {
  const triangles: Triangle[] = [];
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  const vertices = [
    { x: -hw + offsetX, y: -hh + offsetY, z: -hd + offsetZ },
    { x: hw + offsetX, y: -hh + offsetY, z: -hd + offsetZ },
    { x: hw + offsetX, y: hh + offsetY, z: -hd + offsetZ },
    { x: -hw + offsetX, y: hh + offsetY, z: -hd + offsetZ },
    { x: -hw + offsetX, y: -hh + offsetY, z: hd + offsetZ },
    { x: hw + offsetX, y: -hh + offsetY, z: hd + offsetZ },
    { x: hw + offsetX, y: hh + offsetY, z: hd + offsetZ },
    { x: -hw + offsetX, y: hh + offsetY, z: hd + offsetZ },
  ];

  const faces = [
    [0, 1, 2, 3],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [1, 5, 6, 2],
    [4, 5, 1, 0],
    [3, 2, 6, 7],
  ];

  for (const face of faces) {
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    const v3 = vertices[face[3]];

    const normal1 = calculateNormal(v0, v1, v2);
    triangles.push({ normal: normal1, v1: v0, v2: v1, v3: v2 });

    const normal2 = calculateNormal(v0, v2, v3);
    triangles.push({ normal: normal2, v1: v0, v2: v2, v3: v3 });
  }

  return triangles;
}

function generateOrientedTubeSegment(
  radius: number,
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  segments: number = 8
): Triangle[] {
  const triangles: Triangle[] = [];
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  if (length < 0.001) return triangles;
  
  const dir = { x: dx / length, y: dy / length, z: dz / length };
  
  let perp1: { x: number; y: number; z: number };
  if (Math.abs(dir.z) < 0.9) {
    const temp = { x: 0, y: 0, z: 1 };
    perp1 = normalize(cross(dir, temp));
  } else {
    const temp = { x: 1, y: 0, z: 0 };
    perp1 = normalize(cross(dir, temp));
  }
  const perp2 = normalize(cross(dir, perp1));
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    
    const p1 = {
      x: start.x + radius * (cos1 * perp1.x + sin1 * perp2.x),
      y: start.y + radius * (cos1 * perp1.y + sin1 * perp2.y),
      z: start.z + radius * (cos1 * perp1.z + sin1 * perp2.z),
    };
    const p2 = {
      x: start.x + radius * (cos2 * perp1.x + sin2 * perp2.x),
      y: start.y + radius * (cos2 * perp1.y + sin2 * perp2.y),
      z: start.z + radius * (cos2 * perp1.z + sin2 * perp2.z),
    };
    const p3 = {
      x: end.x + radius * (cos2 * perp1.x + sin2 * perp2.x),
      y: end.y + radius * (cos2 * perp1.y + sin2 * perp2.y),
      z: end.z + radius * (cos2 * perp1.z + sin2 * perp2.z),
    };
    const p4 = {
      x: end.x + radius * (cos1 * perp1.x + sin1 * perp2.x),
      y: end.y + radius * (cos1 * perp1.y + sin1 * perp2.y),
      z: end.z + radius * (cos1 * perp1.z + sin1 * perp2.z),
    };
    
    const normal1 = calculateNormal(p1, p2, p3);
    triangles.push({ normal: normal1, v1: p1, v2: p2, v3: p3 });
    
    const normal2 = calculateNormal(p1, p3, p4);
    triangles.push({ normal: normal2, v1: p1, v2: p3, v3: p4 });
    
    const startCenter = start;
    const endCenter = end;
    const startNormal = { x: -dir.x, y: -dir.y, z: -dir.z };
    triangles.push({ normal: startNormal, v1: startCenter, v2: p2, v3: p1 });
    
    const endNormal = dir;
    triangles.push({ normal: endNormal, v1: endCenter, v2: p4, v3: p3 });
  }
  
  return triangles;
}

function generateCylinderTriangles(
  radius: number,
  height: number,
  segments: number,
  offsetX: number = 0,
  offsetY: number = 0,
  offsetZ: number = 0,
  rotateX: boolean = false
): Triangle[] {
  const triangles: Triangle[] = [];
  const hh = height / 2;

  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;

    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);

    let p1: Vector3, p2: Vector3, p3: Vector3, p4: Vector3;
    let top: Vector3, bottom: Vector3;

    if (rotateX) {
      p1 = { x: offsetX, y: radius * cos1 + offsetY, z: -hh + offsetZ };
      p2 = { x: offsetX, y: radius * cos2 + offsetY, z: -hh + offsetZ };
      p3 = { x: offsetX, y: radius * cos2 + offsetY, z: hh + offsetZ };
      p4 = { x: offsetX, y: radius * cos1 + offsetY, z: hh + offsetZ };
      top = { x: offsetX, y: offsetY, z: hh + offsetZ };
      bottom = { x: offsetX, y: offsetY, z: -hh + offsetZ };
    } else {
      p1 = { x: radius * cos1 + offsetX, y: -hh + offsetY, z: radius * sin1 + offsetZ };
      p2 = { x: radius * cos2 + offsetX, y: -hh + offsetY, z: radius * sin2 + offsetZ };
      p3 = { x: radius * cos2 + offsetX, y: hh + offsetY, z: radius * sin2 + offsetZ };
      p4 = { x: radius * cos1 + offsetX, y: hh + offsetY, z: radius * sin1 + offsetZ };
      top = { x: offsetX, y: hh + offsetY, z: offsetZ };
      bottom = { x: offsetX, y: -hh + offsetY, z: offsetZ };
    }

    const sideNormal1 = calculateNormal(p1, p2, p3);
    triangles.push({ normal: sideNormal1, v1: p1, v2: p2, v3: p3 });

    const sideNormal2 = calculateNormal(p1, p3, p4);
    triangles.push({ normal: sideNormal2, v1: p1, v2: p3, v3: p4 });

    const bottomNormal = rotateX
      ? { x: 0, y: 0, z: -1 }
      : { x: 0, y: -1, z: 0 };
    triangles.push({ normal: bottomNormal, v1: bottom, v2: p2, v3: p1 });

    const topNormal = rotateX
      ? { x: 0, y: 0, z: 1 }
      : { x: 0, y: 1, z: 0 };
    triangles.push({ normal: topNormal, v1: top, v2: p4, v3: p3 });
  }

  return triangles;
}

function trianglesToSTL(triangles: Triangle[], solidName: string = "signage"): Buffer {
  const headerSize = 80;
  const triangleCount = triangles.length;
  const dataSize = headerSize + 4 + triangleCount * 50;

  const buffer = Buffer.alloc(dataSize);
  const header = `SignCraft 3D STL - ${solidName}`.slice(0, 80).padEnd(80, "\0");
  buffer.write(header, 0);
  buffer.writeUInt32LE(triangleCount, 80);

  let offset = 84;
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal.x, offset);
    buffer.writeFloatLE(tri.normal.y, offset + 4);
    buffer.writeFloatLE(tri.normal.z, offset + 8);
    offset += 12;

    buffer.writeFloatLE(tri.v1.x, offset);
    buffer.writeFloatLE(tri.v1.y, offset + 4);
    buffer.writeFloatLE(tri.v1.z, offset + 8);
    offset += 12;

    buffer.writeFloatLE(tri.v2.x, offset);
    buffer.writeFloatLE(tri.v2.y, offset + 4);
    buffer.writeFloatLE(tri.v2.z, offset + 8);
    offset += 12;

    buffer.writeFloatLE(tri.v3.x, offset);
    buffer.writeFloatLE(tri.v3.y, offset + 4);
    buffer.writeFloatLE(tri.v3.z, offset + 8);
    offset += 12;

    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}

function trianglesToOBJ(triangles: Triangle[], objectName: string = "signage"): string {
  const vertices: Vector3[] = [];
  const vertexIndices: Map<string, number> = new Map();
  const faces: number[][] = [];

  function getVertexIndex(v: Vector3): number {
    const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
    if (vertexIndices.has(key)) {
      return vertexIndices.get(key)!;
    }
    const index = vertices.length + 1;
    vertices.push(v);
    vertexIndices.set(key, index);
    return index;
  }

  for (const tri of triangles) {
    const i1 = getVertexIndex(tri.v1);
    const i2 = getVertexIndex(tri.v2);
    const i3 = getVertexIndex(tri.v3);
    faces.push([i1, i2, i3]);
  }

  let obj = "# SignCraft 3D OBJ Export\n";
  obj += `# Vertices: ${vertices.length}\n`;
  obj += `# Faces: ${faces.length}\n\n`;
  obj += `o ${objectName}\n`;

  for (const v of vertices) {
    obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
  }

  obj += "\n";

  for (const face of faces) {
    obj += `f ${face[0]} ${face[1]} ${face[2]}\n`;
  }

  return obj;
}

function generateBackingPlate(
  text: string,
  fontSize: number,
  backingThickness: number,
  paddingX: number = 10,
  paddingY: number = 8,
  fontId: string = "roboto"
): Triangle[] {
  const font = loadFontSync(fontId);
  const fontPath = font.getPath(text, 0, 0, fontSize);
  const contours = pathToContours(fontPath);

  let totalWidth: number;
  let totalHeight: number;

  if (contours.length > 0) {
    const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
    const allY = contours.flatMap(c => c.filter((_, i) => i % 2 === 1));
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    totalWidth = (maxX - minX) + paddingX * 2;
    totalHeight = (maxY - minY) + paddingY * 2;
  } else {
    const charWidth = fontSize * 0.6;
    const spacing = fontSize * 0.1;
    totalWidth = (text.length * (charWidth + spacing) - spacing) + paddingX * 2;
    totalHeight = fontSize + paddingY * 2;
  }

  return generateBoxTriangles(
    totalWidth,
    totalHeight,
    backingThickness,
    0,
    0,
    -backingThickness / 2
  );
}

export interface GeneratedSignage {
  parts: GeneratedPart[];
  combined: Triangle[];
}

export function generateSignageParts(
  letterSettings: LetterSettings,
  geometrySettings: GeometrySettings,
  wiringSettings: WiringSettings,
  mountingSettings: MountingSettings,
  tubeSettings: TubeSettings = defaultTubeSettings
): GeneratedSignage {
  const parts: GeneratedPart[] = [];
  const text = letterSettings.text || "A";
  const scale = letterSettings.scale;
  const fontSize = 45 * scale;
  const fontId = letterSettings.fontId || "roboto";

  switch (geometrySettings.mode) {
    case "raised": {
      const backingTriangles = generateBackingPlate(
        text,
        fontSize,
        geometrySettings.backingThickness,
        10 * scale,
        8 * scale,
        fontId
      );
      parts.push({
        name: "backing",
        triangles: backingTriangles,
        material: geometrySettings.backingMaterial,
      });

      const letterZOffset = geometrySettings.letterOffset;
      const letterTriangles = generateTextGeometry(
        text,
        fontSize,
        geometrySettings.letterHeight,
        0,
        0,
        letterZOffset,
        fontId
      );
      parts.push({
        name: "letters",
        triangles: letterTriangles,
        material: geometrySettings.letterMaterial,
      });
      break;
    }

    case "stencil": {
      const backingTriangles = generateBackingPlate(
        text,
        fontSize,
        geometrySettings.backingThickness,
        10 * scale,
        8 * scale,
        fontId
      );
      parts.push({
        name: "stencil_backing",
        triangles: backingTriangles,
        material: geometrySettings.backingMaterial,
      });
      break;
    }

    case "layered": {
      const backingTriangles = generateBackingPlate(
        text,
        fontSize,
        geometrySettings.backingThickness,
        10 * scale,
        8 * scale,
        fontId
      );
      parts.push({
        name: "backing",
        triangles: backingTriangles,
        material: geometrySettings.backingMaterial,
      });

      const letterTriangles = generateTextGeometry(
        text,
        fontSize,
        geometrySettings.letterHeight,
        0,
        0,
        geometrySettings.letterOffset,
        fontId
      );
      parts.push({
        name: "letters",
        triangles: letterTriangles,
        material: geometrySettings.letterMaterial,
      });
      break;
    }

    case "outline": {
      const font = loadFontSync(fontId);
      const fontPath = font.getPath(text, 0, 0, fontSize);
      const rawContours = pathToContours(fontPath);
      const contours = extractCenterlines(rawContours);
      
      if (contours.length > 0) {
        const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
        const allY = contours.flatMap(c => c.filter((_, i) => i % 2 === 1));
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const tubeRadius = (tubeSettings.neonTubeDiameter / 2) + tubeSettings.wallThickness;
        const zOffset = tubeRadius;
        
        const tubeTriangles: Triangle[] = [];
        
        for (const contour of contours) {
          const numPoints = contour.length / 2;
          if (numPoints < 2) continue;
          
          for (let i = 0; i < numPoints - 1; i++) {
            const x1 = contour[i * 2] - centerX;
            const y1 = -(contour[i * 2 + 1] - centerY);
            const x2 = contour[(i + 1) * 2] - centerX;
            const y2 = -(contour[(i + 1) * 2 + 1] - centerY);
            
            const segTriangles = generateOrientedTubeSegment(
              tubeRadius,
              { x: x1, y: y1, z: zOffset },
              { x: x2, y: y2, z: zOffset },
              12
            );
            tubeTriangles.push(...segTriangles);
          }
        }
        
        parts.push({
          name: "neon_tube",
          triangles: tubeTriangles,
          material: geometrySettings.letterMaterial,
        });
        
        if (tubeSettings.enableOverlay) {
          const overlayTriangles: Triangle[] = [];
          const overlayZ = zOffset * 2 + tubeSettings.overlayThickness / 2;
          const overlayRadius = tubeRadius * 1.1;
          
          for (const contour of contours) {
            const numPoints = contour.length / 2;
            if (numPoints < 3) continue;
            
            for (let i = 0; i < numPoints; i++) {
              const x1 = contour[i * 2] - centerX;
              const y1 = -(contour[i * 2 + 1] - centerY);
              const next = (i + 1) % numPoints;
              const x2 = contour[next * 2] - centerX;
              const y2 = -(contour[next * 2 + 1] - centerY);
              
              const segTriangles = generateOrientedTubeSegment(
                overlayRadius,
                { x: x1, y: y1, z: overlayZ },
                { x: x2, y: y2, z: overlayZ },
                12
              );
              overlayTriangles.push(...segTriangles);
            }
          }
          
          parts.push({
            name: "overlay_cap",
            triangles: overlayTriangles,
            material: "diffuser",
          });
        }
        
        if (geometrySettings.enableBacking !== false) {
          const backingTriangles = generateBackingPlate(
            text,
            fontSize,
            geometrySettings.backingThickness,
            10 * scale,
            8 * scale,
            fontId
          );
          parts.push({
            name: "backing",
            triangles: backingTriangles,
            material: geometrySettings.backingMaterial,
          });
        }
      }
      break;
    }

    case "flat":
    default: {
      const letterTriangles = generateTextGeometry(
        text,
        fontSize,
        letterSettings.depth,
        0,
        0,
        0,
        fontId
      );
      parts.push({
        name: "letters",
        triangles: letterTriangles,
        material: geometrySettings.letterMaterial,
      });
      break;
    }
  }

  if (wiringSettings.channelType !== "none") {
    const font = loadFontSync(fontId);
    const fontPath = font.getPath(text, 0, 0, fontSize);
    const contours = pathToContours(fontPath);

    let textWidth: number;
    if (contours.length > 0) {
      const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
      textWidth = Math.max(...allX) - Math.min(...allX);
    } else {
      textWidth = text.length * fontSize * 0.7;
    }

    const channelY = (wiringSettings.channelType === "back" || wiringSettings.channelType === "ws2812b")
      ? -fontSize * 0.4 
      : 0;

    let channelTriangles: Triangle[];
    
    if (wiringSettings.channelType === "ws2812b") {
      const channelWidth = wiringSettings.channelWidth || 12;
      const channelHeight = Math.min(wiringSettings.channelDepth || 4, geometrySettings.backingThickness - 1);
      channelTriangles = generateBoxTriangles(
        textWidth * 0.9,
        channelWidth,
        channelHeight,
        0,
        channelY,
        -(geometrySettings.backingThickness - channelHeight / 2)
      );
    } else if (wiringSettings.channelType === "filament") {
      const channelDiameter = wiringSettings.channelDiameter || 10;
      const clampedDiameter = Math.min(channelDiameter, geometrySettings.backingThickness * 0.9);
      channelTriangles = generateCylinderTriangles(
        clampedDiameter / 2,
        textWidth * 0.9,
        16,
        0,
        channelY,
        -(geometrySettings.backingThickness - clampedDiameter / 2),
        true
      );
    } else {
      channelTriangles = generateCylinderTriangles(
        wiringSettings.channelDiameter / 2,
        textWidth * 0.9,
        16,
        0,
        channelY,
        -geometrySettings.backingThickness / 2,
        true
      );
    }

    const existingLetters = parts.find(p => p.name === "letters" || p.name === "stencil_backing");
    if (existingLetters) {
      existingLetters.triangles.push(...channelTriangles);
    }
  }

  if (mountingSettings.pattern !== "none") {
    const font = loadFontSync(fontId);
    const fontPath = font.getPath(text, 0, 0, fontSize);
    const contours = pathToContours(fontPath);

    let totalWidth: number;
    let totalHeight: number;

    if (contours.length > 0) {
      const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
      const allY = contours.flatMap(c => c.filter((_, i) => i % 2 === 1));
      totalWidth = Math.max(...allX) - Math.min(...allX) + 20 * scale;
      totalHeight = Math.max(...allY) - Math.min(...allY) + 16 * scale;
    } else {
      totalWidth = text.length * fontSize * 0.7 + 20 * scale;
      totalHeight = fontSize + 16 * scale;
    }

    const holePositions: { x: number; y: number }[] = [];
    const hw = totalWidth / 2 - mountingSettings.insetFromEdge * scale;
    const hh = totalHeight / 2 - mountingSettings.insetFromEdge * scale;

    switch (mountingSettings.pattern) {
      case "4-corner":
        holePositions.push(
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: -hw, y: hh },
          { x: hw, y: hh }
        );
        break;
      case "2-point":
        holePositions.push({ x: -hw, y: 0 }, { x: hw, y: 0 });
        break;
      case "6-point":
        holePositions.push(
          { x: -hw, y: -hh },
          { x: 0, y: -hh },
          { x: hw, y: -hh },
          { x: -hw, y: hh },
          { x: 0, y: hh },
          { x: hw, y: hh }
        );
        break;
      case "custom":
        holePositions.push({ x: 0, y: 0 });
        break;
    }

    for (const pos of holePositions) {
      const holeTriangles = generateCylinderTriangles(
        mountingSettings.holeDiameter / 2,
        geometrySettings.backingThickness + 2,
        16,
        pos.x,
        pos.y,
        -geometrySettings.backingThickness / 2
      );

      const backing = parts.find(p => p.name === "backing" || p.name === "stencil_backing");
      if (backing) {
        backing.triangles.push(...holeTriangles);
      }
    }
  }

  const combined: Triangle[] = [];
  for (const part of parts) {
    combined.push(...part.triangles);
  }

  return { parts, combined };
}

// Generate 3MF model XML content from triangles
export function trianglesTo3MFModel(triangles: Triangle[], modelName: string = "SignCraft Model"): string {
  // Collect unique vertices and build index map
  const vertexMap = new Map<string, number>();
  const vertices: Vector3[] = [];
  const triangleIndices: number[][] = [];
  
  for (const tri of triangles) {
    const indices: number[] = [];
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
      if (!vertexMap.has(key)) {
        vertexMap.set(key, vertices.length);
        vertices.push(v);
      }
      indices.push(vertexMap.get(key)!);
    }
    triangleIndices.push(indices);
  }
  
  // Build 3MF model XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${modelName}</metadata>
  <metadata name="Designer">SignCraft 3D</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertices.map(v => `          <vertex x="${v.x.toFixed(6)}" y="${v.y.toFixed(6)}" z="${v.z.toFixed(6)}" />`).join('\n')}
        </vertices>
        <triangles>
${triangleIndices.map(t => `          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" />`).join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;
}

export function generateSignage(
  letterSettings: LetterSettings,
  wiringSettings: WiringSettings,
  mountingSettings: MountingSettings,
  format: string,
  geometrySettings: GeometrySettings,
  tubeSettings: TubeSettings = defaultTubeSettings
): Buffer | string {
  const { combined } = generateSignageParts(
    letterSettings,
    geometrySettings,
    wiringSettings,
    mountingSettings,
    tubeSettings
  );

  if (format === "obj") {
    return trianglesToOBJ(combined);
  }
  
  if (format === "3mf") {
    // Return the model XML - routes will package it into proper 3MF ZIP structure
    return trianglesTo3MFModel(combined, `${letterSettings.text} Sign`);
  }

  return trianglesToSTL(combined);
}

export interface ExportedPart {
  filename: string;
  content: Buffer | string;
  partType: string;
  material: string;
}

export function generateMultiPartExport(
  letterSettings: LetterSettings,
  geometrySettings: GeometrySettings,
  wiringSettings: WiringSettings,
  mountingSettings: MountingSettings,
  format: "stl" | "obj",
  tubeSettings: TubeSettings = defaultTubeSettings
): ExportedPart[] {
  const { parts } = generateSignageParts(letterSettings, geometrySettings, wiringSettings, mountingSettings, tubeSettings);
  const exportedParts: ExportedPart[] = [];

  const textSlug = letterSettings.text.replace(/\s/g, "_");

  for (const part of parts) {
    const filename = `${textSlug}_${part.name}_${part.material}.${format}`;

    const content = format === "obj"
      ? trianglesToOBJ(part.triangles, part.name)
      : trianglesToSTL(part.triangles, `SignCraft 3D - ${part.name}`);

    exportedParts.push({
      filename,
      content,
      partType: part.name,
      material: part.material,
    });
  }

  return exportedParts;
}

function generateSnapTabBase(
  x: number, y: number, 
  nx: number, ny: number,
  tabWidth: number, tabHeight: number, 
  wallHeight: number, chamferAngle: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const chamferLen = tabHeight * 0.5;
  const halfTab = tabWidth / 2;
  const tx = ny;
  const ty = -nx;
  
  const tabBase = wallHeight - tabHeight * 2;
  const tabMid = wallHeight - tabHeight;
  const tabTop = wallHeight;
  
  const b1: Vector3 = { x: x - tx * halfTab, y: y - ty * halfTab, z: tabBase };
  const b2: Vector3 = { x: x + tx * halfTab, y: y + ty * halfTab, z: tabBase };
  const m1: Vector3 = { x: x - tx * halfTab + nx * tabHeight, y: y - ty * halfTab + ny * tabHeight, z: tabMid };
  const m2: Vector3 = { x: x + tx * halfTab + nx * tabHeight, y: y + ty * halfTab + ny * tabHeight, z: tabMid };
  const t1: Vector3 = { x: x - tx * halfTab + nx * tabHeight, y: y - ty * halfTab + ny * tabHeight, z: tabTop };
  const t2: Vector3 = { x: x + tx * halfTab + nx * tabHeight, y: y + ty * halfTab + ny * tabHeight, z: tabTop };
  
  triangles.push(
    { normal: { x: nx, y: ny, z: 0 }, v1: m1, v2: m2, v3: t1 },
    { normal: { x: nx, y: ny, z: 0 }, v1: t1, v2: m2, v3: t2 }
  );
  
  const chamferAngleRad = chamferAngle * Math.PI / 180;
  const nzChamfer = Math.sin(chamferAngleRad);
  const nxyChamfer = Math.cos(chamferAngleRad);
  triangles.push(
    { normal: { x: nx * nxyChamfer, y: ny * nxyChamfer, z: -nzChamfer }, v1: b1, v2: b2, v3: m1 },
    { normal: { x: nx * nxyChamfer, y: ny * nxyChamfer, z: -nzChamfer }, v1: m1, v2: b2, v3: m2 }
  );
  
  triangles.push(
    { normal: { x: -tx, y: -ty, z: 0 }, v1: b1, v2: m1, v3: t1 },
    { normal: { x: tx, y: ty, z: 0 }, v1: b2, v2: t2, v3: m2 }
  );
  
  triangles.push(
    { normal: { x: 0, y: 0, z: 1 }, v1: t1, v2: t2, v3: { x: x, y: y, z: tabTop } }
  );
  
  return triangles;
}

function generateSnapTabRecess(
  x: number, y: number,
  nx: number, ny: number,
  tabWidth: number, tabHeight: number,
  capThickness: number, tolerance: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const halfTab = (tabWidth + tolerance * 2) / 2;
  const recessDepth = tabHeight + tolerance;
  const tx = ny;
  const ty = -nx;
  
  const t1: Vector3 = { x: x - tx * halfTab - nx * recessDepth, y: y - ty * halfTab - ny * recessDepth, z: 0 };
  const t2: Vector3 = { x: x + tx * halfTab - nx * recessDepth, y: y + ty * halfTab - ny * recessDepth, z: 0 };
  const t3: Vector3 = { x: x + tx * halfTab - nx * recessDepth, y: y + ty * halfTab - ny * recessDepth, z: capThickness };
  const t4: Vector3 = { x: x - tx * halfTab - nx * recessDepth, y: y - ty * halfTab - ny * recessDepth, z: capThickness };
  
  const b1: Vector3 = { x: x - tx * halfTab, y: y - ty * halfTab, z: 0 };
  const b2: Vector3 = { x: x + tx * halfTab, y: y + ty * halfTab, z: 0 };
  const b3: Vector3 = { x: x + tx * halfTab, y: y + ty * halfTab, z: capThickness };
  const b4: Vector3 = { x: x - tx * halfTab, y: y - ty * halfTab, z: capThickness };
  
  triangles.push(
    { normal: { x: -nx, y: -ny, z: 0 }, v1: t1, v2: t2, v3: t3 },
    { normal: { x: -nx, y: -ny, z: 0 }, v1: t1, v2: t3, v3: t4 }
  );
  
  triangles.push(
    { normal: { x: -tx, y: -ty, z: 0 }, v1: b1, v2: t1, v3: t4 },
    { normal: { x: -tx, y: -ty, z: 0 }, v1: b1, v2: t4, v3: b4 }
  );
  triangles.push(
    { normal: { x: tx, y: ty, z: 0 }, v1: t2, v2: b2, v3: b3 },
    { normal: { x: tx, y: ty, z: 0 }, v1: t2, v2: b3, v3: t3 }
  );
  
  triangles.push(
    { normal: { x: 0, y: 0, z: -1 }, v1: b1, v2: b2, v3: t1 },
    { normal: { x: 0, y: 0, z: -1 }, v1: t1, v2: b2, v3: t2 }
  );
  
  return triangles;
}

function generateRegistrationPinBase(
  x: number, y: number,
  diameter: number, height: number,
  wallHeight: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const radius = diameter / 2;
  const segments = 12;
  const chamferH = radius * 0.3;
  const chamferR = radius * 0.6;
  
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const c2 = Math.cos(a2), s2 = Math.sin(a2);
    
    const baseZ = wallHeight;
    const topZ = wallHeight + height - chamferH;
    const tipZ = wallHeight + height;
    
    const b1: Vector3 = { x: x + c1 * radius, y: y + s1 * radius, z: baseZ };
    const b2: Vector3 = { x: x + c2 * radius, y: y + s2 * radius, z: baseZ };
    const t1: Vector3 = { x: x + c1 * radius, y: y + s1 * radius, z: topZ };
    const t2: Vector3 = { x: x + c2 * radius, y: y + s2 * radius, z: topZ };
    const tip1: Vector3 = { x: x + c1 * chamferR, y: y + s1 * chamferR, z: tipZ };
    const tip2: Vector3 = { x: x + c2 * chamferR, y: y + s2 * chamferR, z: tipZ };
    
    triangles.push(
      { normal: { x: c1, y: s1, z: 0 }, v1: b1, v2: b2, v3: t1 },
      { normal: { x: c2, y: s2, z: 0 }, v1: t1, v2: b2, v3: t2 }
    );
    const tipNx = (c1 + c2) / 2, tipNy = (s1 + s2) / 2;
    const tipLen = Math.sqrt(tipNx * tipNx + tipNy * tipNy + 0.5 * 0.5);
    triangles.push(
      { normal: { x: tipNx / tipLen, y: tipNy / tipLen, z: 0.5 / tipLen }, v1: t1, v2: t2, v3: tip1 },
      { normal: { x: tipNx / tipLen, y: tipNy / tipLen, z: 0.5 / tipLen }, v1: tip1, v2: t2, v3: tip2 }
    );
  }
  for (let i = 1; i < segments - 1; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: { x: x + chamferR, y: y, z: wallHeight + height },
      v2: { x: x + Math.cos(a1) * chamferR, y: y + Math.sin(a1) * chamferR, z: wallHeight + height },
      v3: { x: x + Math.cos(a2) * chamferR, y: y + Math.sin(a2) * chamferR, z: wallHeight + height }
    });
  }
  return triangles;
}

function generateRegistrationHoleCap(
  x: number, y: number,
  diameter: number, height: number,
  capThickness: number, tolerance: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const holeRadius = diameter / 2 + tolerance;
  const holeDepth = Math.min(height + tolerance, capThickness * 0.8);
  const segments = 12;
  
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const c2 = Math.cos(a2), s2 = Math.sin(a2);
    
    triangles.push({
      normal: { x: c1, y: s1, z: 0 },
      v1: { x: x + c1 * holeRadius, y: y + s1 * holeRadius, z: 0 },
      v2: { x: x + c1 * holeRadius, y: y + s1 * holeRadius, z: holeDepth },
      v3: { x: x + c2 * holeRadius, y: y + s2 * holeRadius, z: 0 }
    });
    triangles.push({
      normal: { x: c2, y: s2, z: 0 },
      v1: { x: x + c2 * holeRadius, y: y + s2 * holeRadius, z: 0 },
      v2: { x: x + c1 * holeRadius, y: y + s1 * holeRadius, z: holeDepth },
      v3: { x: x + c2 * holeRadius, y: y + s2 * holeRadius, z: holeDepth }
    });
  }
  for (let i = 1; i < segments - 1; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    triangles.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: { x: x + holeRadius, y: y, z: holeDepth },
      v2: { x: x + Math.cos(a1) * holeRadius, y: y + Math.sin(a1) * holeRadius, z: holeDepth },
      v3: { x: x + Math.cos(a2) * holeRadius, y: y + Math.sin(a2) * holeRadius, z: holeDepth }
    });
  }
  return triangles;
}

function generateDiffusionRib(
  x1: number, y1: number, x2: number, y2: number,
  ribHeight: number, ribWidth: number,
  capThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return triangles;
  
  const nx = -dy / len * ribWidth / 2;
  const ny = dx / len * ribWidth / 2;
  
  const topZ = capThickness;
  const ribZ = capThickness - ribHeight;
  
  const t1: Vector3 = { x: x1 - nx, y: y1 - ny, z: topZ };
  const t2: Vector3 = { x: x1 + nx, y: y1 + ny, z: topZ };
  const t3: Vector3 = { x: x2 + nx, y: y2 + ny, z: topZ };
  const t4: Vector3 = { x: x2 - nx, y: y2 - ny, z: topZ };
  const r1: Vector3 = { x: x1, y: y1, z: ribZ };
  const r2: Vector3 = { x: x2, y: y2, z: ribZ };
  
  const normLen = Math.sqrt(nx * nx + ny * ny + (ribHeight/2) * (ribHeight/2));
  const nxNorm = nx / normLen;
  const nyNorm = ny / normLen;
  const nzNorm = (ribHeight/2) / normLen;
  
  triangles.push(
    { normal: { x: -nxNorm, y: -nyNorm, z: nzNorm }, v1: t1, v2: t4, v3: r1 },
    { normal: { x: -nxNorm, y: -nyNorm, z: nzNorm }, v1: r1, v2: t4, v3: r2 },
    { normal: { x: nxNorm, y: nyNorm, z: nzNorm }, v1: t2, v2: r1, v3: t3 },
    { normal: { x: nxNorm, y: nyNorm, z: nzNorm }, v1: r1, v2: r2, v3: t3 }
  );
  
  return triangles;
}

export function generateTwoPartSystem(
  contours: number[][],
  tubeSettings: TubeSettings,
  twoPartSystem: TwoPartSystem = defaultTwoPartSystem,
  centerX: number = 0,
  centerY: number = 0
): { base: Triangle[]; cap: Triangle[] } {
  const baseTriangles: Triangle[] = [];
  const capTriangles: Triangle[] = [];
  
  const channelWidth = tubeSettings.neonTubeDiameter + tubeSettings.wallThickness * 2;
  const wallHeight = twoPartSystem.baseWallHeight;
  const wallThickness = twoPartSystem.baseWallThickness;
  const capThickness = twoPartSystem.capThickness;
  const capOverhang = twoPartSystem.capOverhang;
  const snapTolerance = twoPartSystem.snapTolerance;
  
  const snapTabsEnabled = twoPartSystem.snapTabsEnabled ?? true;
  const snapTabHeight = twoPartSystem.snapTabHeight ?? 2;
  const snapTabWidth = twoPartSystem.snapTabWidth ?? 4;
  const snapTabSpacing = twoPartSystem.snapTabSpacing ?? 25;
  const chamferAngle = twoPartSystem.chamferAngle ?? 45;
  
  const registrationPinsEnabled = twoPartSystem.registrationPinsEnabled ?? true;
  const pinDiameter = twoPartSystem.pinDiameter ?? 2.5;
  const pinHeight = twoPartSystem.pinHeight ?? 3;
  const pinSpacing = twoPartSystem.pinSpacing ?? 30;
  
  const diffusionRibsEnabled = twoPartSystem.diffusionRibsEnabled ?? true;
  const ribHeight = twoPartSystem.ribHeight ?? 1;
  const ribSpacing = twoPartSystem.ribSpacing ?? 5;
  
  const cableChannelEnabled = twoPartSystem.cableChannelEnabled ?? true;
  const cableChannelWidth = twoPartSystem.cableChannelWidth ?? 5;
  const cableChannelDepth = twoPartSystem.cableChannelDepth ?? 3;
  
  let accumulatedLength = 0;
  let pinAccumulator = 0;
  
  for (const contour of contours) {
    const numPoints = contour.length / 2;
    if (numPoints < 3) continue;
    
    for (let i = 0; i < numPoints; i++) {
      const x1 = contour[i * 2] - centerX;
      const y1 = -(contour[i * 2 + 1] - centerY);
      const next = (i + 1) % numPoints;
      const x2 = contour[next * 2] - centerX;
      const y2 = -(contour[next * 2 + 1] - centerY);
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) continue;
      
      const nx = -dy / len;
      const ny = dx / len;
      
      const halfWidth = channelWidth / 2;
      const outerHalfWidth = halfWidth + wallThickness;
      
      const innerL1 = { x: x1 - nx * halfWidth, y: y1 - ny * halfWidth };
      const innerR1 = { x: x1 + nx * halfWidth, y: y1 + ny * halfWidth };
      const innerL2 = { x: x2 - nx * halfWidth, y: y2 - ny * halfWidth };
      const innerR2 = { x: x2 + nx * halfWidth, y: y2 + ny * halfWidth };
      
      const outerL1 = { x: x1 - nx * outerHalfWidth, y: y1 - ny * outerHalfWidth };
      const outerR1 = { x: x1 + nx * outerHalfWidth, y: y1 + ny * outerHalfWidth };
      const outerL2 = { x: x2 - nx * outerHalfWidth, y: y2 - ny * outerHalfWidth };
      const outerR2 = { x: x2 + nx * outerHalfWidth, y: y2 + ny * outerHalfWidth };
      
      const bottomLeftWall1: Vector3 = { x: outerL1.x, y: outerL1.y, z: 0 };
      const bottomLeftWall2: Vector3 = { x: outerL2.x, y: outerL2.y, z: 0 };
      const topLeftWall1: Vector3 = { x: outerL1.x, y: outerL1.y, z: wallHeight };
      const topLeftWall2: Vector3 = { x: outerL2.x, y: outerL2.y, z: wallHeight };
      
      const bottomLeftInner1: Vector3 = { x: innerL1.x, y: innerL1.y, z: 0 };
      const bottomLeftInner2: Vector3 = { x: innerL2.x, y: innerL2.y, z: 0 };
      const topLeftInner1: Vector3 = { x: innerL1.x, y: innerL1.y, z: wallHeight };
      const topLeftInner2: Vector3 = { x: innerL2.x, y: innerL2.y, z: wallHeight };
      
      baseTriangles.push(
        { normal: { x: -nx, y: -ny, z: 0 }, v1: bottomLeftWall1, v2: bottomLeftWall2, v3: topLeftWall1 },
        { normal: { x: -nx, y: -ny, z: 0 }, v1: topLeftWall1, v2: bottomLeftWall2, v3: topLeftWall2 }
      );
      
      baseTriangles.push(
        { normal: { x: nx, y: ny, z: 0 }, v1: bottomLeftInner2, v2: bottomLeftInner1, v3: topLeftInner1 },
        { normal: { x: nx, y: ny, z: 0 }, v1: bottomLeftInner2, v2: topLeftInner1, v3: topLeftInner2 }
      );
      
      baseTriangles.push(
        { normal: { x: 0, y: 0, z: 1 }, v1: topLeftWall1, v2: topLeftWall2, v3: topLeftInner1 },
        { normal: { x: 0, y: 0, z: 1 }, v1: topLeftInner1, v2: topLeftWall2, v3: topLeftInner2 }
      );
      
      const bottomRightWall1: Vector3 = { x: outerR1.x, y: outerR1.y, z: 0 };
      const bottomRightWall2: Vector3 = { x: outerR2.x, y: outerR2.y, z: 0 };
      const topRightWall1: Vector3 = { x: outerR1.x, y: outerR1.y, z: wallHeight };
      const topRightWall2: Vector3 = { x: outerR2.x, y: outerR2.y, z: wallHeight };
      
      const bottomRightInner1: Vector3 = { x: innerR1.x, y: innerR1.y, z: 0 };
      const bottomRightInner2: Vector3 = { x: innerR2.x, y: innerR2.y, z: 0 };
      const topRightInner1: Vector3 = { x: innerR1.x, y: innerR1.y, z: wallHeight };
      const topRightInner2: Vector3 = { x: innerR2.x, y: innerR2.y, z: wallHeight };
      
      baseTriangles.push(
        { normal: { x: nx, y: ny, z: 0 }, v1: bottomRightWall2, v2: bottomRightWall1, v3: topRightWall1 },
        { normal: { x: nx, y: ny, z: 0 }, v1: bottomRightWall2, v2: topRightWall1, v3: topRightWall2 }
      );
      
      baseTriangles.push(
        { normal: { x: -nx, y: -ny, z: 0 }, v1: bottomRightInner1, v2: bottomRightInner2, v3: topRightInner1 },
        { normal: { x: -nx, y: -ny, z: 0 }, v1: topRightInner1, v2: bottomRightInner2, v3: topRightInner2 }
      );
      
      baseTriangles.push(
        { normal: { x: 0, y: 0, z: 1 }, v1: topRightWall2, v2: topRightWall1, v3: topRightInner1 },
        { normal: { x: 0, y: 0, z: 1 }, v1: topRightWall2, v2: topRightInner1, v3: topRightInner2 }
      );
      
      baseTriangles.push(
        { normal: { x: 0, y: 0, z: -1 }, v1: bottomLeftWall1, v2: bottomRightWall1, v3: bottomLeftWall2 },
        { normal: { x: 0, y: 0, z: -1 }, v1: bottomLeftWall2, v2: bottomRightWall1, v3: bottomRightWall2 }
      );
      
      if (snapTabsEnabled && len > snapTabWidth * 2) {
        const numTabs = Math.floor(len / snapTabSpacing);
        for (let t = 0; t < numTabs; t++) {
          const tabPos = (t + 0.5) / Math.max(1, numTabs);
          const tabX = x1 + dx * tabPos - nx * (halfWidth + wallThickness / 2);
          const tabY = y1 + dy * tabPos - ny * (halfWidth + wallThickness / 2);
          baseTriangles.push(...generateSnapTabBase(tabX, tabY, -nx, -ny, snapTabWidth, snapTabHeight, wallHeight, chamferAngle));
          capTriangles.push(...generateSnapTabRecess(tabX, tabY, -nx, -ny, snapTabWidth, snapTabHeight, capThickness, snapTolerance));
          
          const tabXR = x1 + dx * tabPos + nx * (halfWidth + wallThickness / 2);
          const tabYR = y1 + dy * tabPos + ny * (halfWidth + wallThickness / 2);
          baseTriangles.push(...generateSnapTabBase(tabXR, tabYR, nx, ny, snapTabWidth, snapTabHeight, wallHeight, chamferAngle));
          capTriangles.push(...generateSnapTabRecess(tabXR, tabYR, nx, ny, snapTabWidth, snapTabHeight, capThickness, snapTolerance));
        }
      }
      
      if (registrationPinsEnabled) {
        pinAccumulator += len;
        if (pinAccumulator >= pinSpacing) {
          const pinX = (x1 + x2) / 2;
          const pinY = (y1 + y2) / 2;
          baseTriangles.push(...generateRegistrationPinBase(pinX, pinY, pinDiameter, pinHeight, wallHeight));
          capTriangles.push(...generateRegistrationHoleCap(pinX, pinY, pinDiameter, pinHeight, capThickness, snapTolerance));
          pinAccumulator = 0;
        }
      }
      
      const capHalfWidth = outerHalfWidth + capOverhang;
      
      const capOuterL1: Vector3 = { x: x1 - nx * capHalfWidth, y: y1 - ny * capHalfWidth, z: 0 };
      const capOuterL2: Vector3 = { x: x2 - nx * capHalfWidth, y: y2 - ny * capHalfWidth, z: 0 };
      const capOuterR1: Vector3 = { x: x1 + nx * capHalfWidth, y: y1 + ny * capHalfWidth, z: 0 };
      const capOuterR2: Vector3 = { x: x2 + nx * capHalfWidth, y: y2 + ny * capHalfWidth, z: 0 };
      
      const capTopL1: Vector3 = { x: x1 - nx * capHalfWidth, y: y1 - ny * capHalfWidth, z: capThickness };
      const capTopL2: Vector3 = { x: x2 - nx * capHalfWidth, y: y2 - ny * capHalfWidth, z: capThickness };
      const capTopR1: Vector3 = { x: x1 + nx * capHalfWidth, y: y1 + ny * capHalfWidth, z: capThickness };
      const capTopR2: Vector3 = { x: x2 + nx * capHalfWidth, y: y2 + ny * capHalfWidth, z: capThickness };
      
      capTriangles.push(
        { normal: { x: 0, y: 0, z: 1 }, v1: capTopL1, v2: capTopL2, v3: capTopR1 },
        { normal: { x: 0, y: 0, z: 1 }, v1: capTopR1, v2: capTopL2, v3: capTopR2 }
      );
      
      capTriangles.push(
        { normal: { x: -nx, y: -ny, z: 0 }, v1: capOuterL1, v2: capOuterL2, v3: capTopL1 },
        { normal: { x: -nx, y: -ny, z: 0 }, v1: capTopL1, v2: capOuterL2, v3: capTopL2 }
      );
      
      capTriangles.push(
        { normal: { x: nx, y: ny, z: 0 }, v1: capOuterR2, v2: capOuterR1, v3: capTopR1 },
        { normal: { x: nx, y: ny, z: 0 }, v1: capOuterR2, v2: capTopR1, v3: capTopR2 }
      );
      
      capTriangles.push(
        { normal: { x: 0, y: 0, z: -1 }, v1: capOuterL1, v2: capOuterR1, v3: capOuterL2 },
        { normal: { x: 0, y: 0, z: -1 }, v1: capOuterL2, v2: capOuterR1, v3: capOuterR2 }
      );
      
      if (diffusionRibsEnabled && len > ribSpacing * 2) {
        const numRibs = Math.floor(len / ribSpacing);
        const ribWidth = 0.8;
        for (let r = 1; r < numRibs; r++) {
          const ribPos = r / numRibs;
          const rx1 = x1 + dx * ribPos - nx * halfWidth * 0.8;
          const ry1 = y1 + dy * ribPos - ny * halfWidth * 0.8;
          const rx2 = x1 + dx * ribPos + nx * halfWidth * 0.8;
          const ry2 = y1 + dy * ribPos + ny * halfWidth * 0.8;
          capTriangles.push(...generateDiffusionRib(rx1, ry1, rx2, ry2, ribHeight, ribWidth, capThickness));
        }
      }
      
      accumulatedLength += len;
    }
    
    if (cableChannelEnabled) {
      const firstX = contour[0] - centerX;
      const firstY = -(contour[1] - centerY);
      const channelHalf = cableChannelWidth / 2;
      const channelTop = wallHeight;
      const channelBottom = wallHeight - cableChannelDepth;
      
      const t1: Vector3 = { x: firstX - channelHalf, y: firstY - channelHalf, z: channelTop };
      const t2: Vector3 = { x: firstX + channelHalf, y: firstY - channelHalf, z: channelTop };
      const t3: Vector3 = { x: firstX + channelHalf, y: firstY + channelHalf, z: channelTop };
      const t4: Vector3 = { x: firstX - channelHalf, y: firstY + channelHalf, z: channelTop };
      const b1: Vector3 = { x: firstX - channelHalf, y: firstY - channelHalf, z: channelBottom };
      const b2: Vector3 = { x: firstX + channelHalf, y: firstY - channelHalf, z: channelBottom };
      const b3: Vector3 = { x: firstX + channelHalf, y: firstY + channelHalf, z: channelBottom };
      const b4: Vector3 = { x: firstX - channelHalf, y: firstY + channelHalf, z: channelBottom };
      
      baseTriangles.push(
        { normal: { x: 0, y: 1, z: 0 }, v1: t1, v2: b1, v3: t2 },
        { normal: { x: 0, y: 1, z: 0 }, v1: t2, v2: b1, v3: b2 },
        { normal: { x: -1, y: 0, z: 0 }, v1: t2, v2: b2, v3: t3 },
        { normal: { x: -1, y: 0, z: 0 }, v1: t3, v2: b2, v3: b3 },
        { normal: { x: 0, y: -1, z: 0 }, v1: t3, v2: b3, v3: t4 },
        { normal: { x: 0, y: -1, z: 0 }, v1: t4, v2: b3, v3: b4 },
        { normal: { x: 1, y: 0, z: 0 }, v1: t4, v2: b4, v3: t1 },
        { normal: { x: 1, y: 0, z: 0 }, v1: t1, v2: b4, v3: b1 },
        { normal: { x: 0, y: 0, z: -1 }, v1: b1, v2: b4, v3: b2 },
        { normal: { x: 0, y: 0, z: -1 }, v1: b2, v2: b4, v3: b3 }
      );
    }
  }
  
  return { base: baseTriangles, cap: capTriangles };
}

export function generateTwoPartExport(
  letterSettings: LetterSettings,
  tubeSettings: TubeSettings,
  twoPartSystem: TwoPartSystem,
  format: "stl" | "obj" = "stl",
  sketchPaths: SketchPath[] = [],
  inputMode: "text" | "draw" | "image" = "text"
): ExportedPart[] {
  let contours: number[][] = [];
  let centerX = 0;
  let centerY = 0;
  let fileSlug = "neon_sign";
  
  if (inputMode === "draw" || inputMode === "image") {
    if (sketchPaths.length === 0) {
      return [];
    }
    
    for (const path of sketchPaths) {
      if (path.points.length < 2) continue;
      const contour: number[] = [];
      for (const point of path.points) {
        contour.push(point.x, -point.y);
      }
      contours.push(contour);
    }
    
    if (contours.length === 0) {
      return [];
    }
    
    const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
    const allY = contours.flatMap(c => c.filter((_, i) => i % 2 === 1));
    centerX = (Math.min(...allX) + Math.max(...allX)) / 2;
    centerY = (Math.min(...allY) + Math.max(...allY)) / 2;
    fileSlug = inputMode === "draw" ? "freehand_drawing" : "traced_image";
  } else {
    const text = letterSettings.text || "A";
    const scale = letterSettings.scale;
    const fontSize = 45 * scale;
    const fontId = letterSettings.fontId || "roboto";
    
    const font = loadFontSync(fontId);
    const fontPath = font.getPath(text, 0, 0, fontSize);
    const rawContours = pathToContours(fontPath);
    contours = extractCenterlines(rawContours);
    
    if (contours.length === 0) {
      return [];
    }
    
    const allX = contours.flatMap(c => c.filter((_, i) => i % 2 === 0));
    const allY = contours.flatMap(c => c.filter((_, i) => i % 2 === 1));
    centerX = (Math.min(...allX) + Math.max(...allX)) / 2;
    centerY = (Math.min(...allY) + Math.max(...allY)) / 2;
    fileSlug = text.replace(/\s/g, "_").substring(0, 20);
  }
  
  const { base, cap } = generateTwoPartSystem(contours, tubeSettings, twoPartSystem, centerX, centerY);
  
  const exportedParts: ExportedPart[] = [];
  
  if (base.length > 0) {
    const content = format === "obj"
      ? trianglesToOBJ(base, "base")
      : trianglesToSTL(base, "SignCraft 3D - Base");
    
    exportedParts.push({
      filename: `${fileSlug}_base.${format}`,
      content,
      partType: "base",
      material: "opaque",
    });
  }
  
  if (cap.length > 0) {
    const content = format === "obj"
      ? trianglesToOBJ(cap, "cap")
      : trianglesToSTL(cap, "SignCraft 3D - Diffuser Cap");
    
    exportedParts.push({
      filename: `${fileSlug}_diffuser_cap.${format}`,
      content,
      partType: "diffuser_cap",
      material: "diffuser",
    });
  }
  
  return exportedParts;
}
