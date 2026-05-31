// Pet Tag Generator - Raised 3D Neon-Style Letters for Pets
// Creates extruded 3D letters with U-channels for LED strips
// Loop attaches at TOP for proper front-facing hang (like Mr. T's chains)

import type { PetTagSettings, HangPosition } from "@shared/schema";
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

export interface PetTagPart {
  filename: string;
  content: Buffer;
  partType: string;
  material: string;
}

// Font file mapping - synced with routes.ts and custom-shape-generator.ts
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
  
  // Check server/fonts first, then public/fonts
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
  
  // Fallback to Aerioz
  console.log(`[PetTag] Font not found: ${fontId}, using fallback`);
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

function addQuad(triangles: Triangle[], a: Vector3, b: Vector3, c: Vector3, d: Vector3, ccw: boolean = true) {
  if (ccw) {
    addTriangle(triangles, a, b, c);
    addTriangle(triangles, a, c, d);
  } else {
    addTriangle(triangles, a, c, b);
    addTriangle(triangles, a, d, c);
  }
}

// Parse font path commands into contours (arrays of points)
function pathToContours(fontPath: opentype.Path): number[][] {
  const contours: number[][] = [];
  let currentContour: number[] = [];

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
      case "Q":
        // Quadratic bezier - interpolate
        const steps = 8;
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
      case "C":
        // Cubic bezier - interpolate
        const cSteps = 10;
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
      case "Z":
        if (currentContour.length > 0) {
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

// Generate extruded 3D letter geometry with U-channel
function generateExtrudedLetter(
  contours: number[][],
  depth: number,
  channelWidth: number,
  channelDepth: number,
  wallThickness: number,
  offsetX: number = 0,
  offsetY: number = 0
): { base: Triangle[], cap: Triangle[] } {
  const baseTriangles: Triangle[] = [];
  const capTriangles: Triangle[] = [];

  if (contours.length === 0) return { base: baseTriangles, cap: capTriangles };

  // Identify outer contours (counter-clockwise) and holes (clockwise)
  const signedArea = (contour: number[]) => {
    let area = 0;
    const n = contour.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += contour[i * 2] * contour[j * 2 + 1];
      area -= contour[j * 2] * contour[i * 2 + 1];
    }
    return area / 2;
  };

  // Point-in-polygon test using ray casting algorithm
  const pointInPolygon = (px: number, py: number, polygon: number[]): boolean => {
    let inside = false;
    const n = polygon.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i * 2], yi = polygon[i * 2 + 1];
      const xj = polygon[j * 2], yj = polygon[j * 2 + 1];
      
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Check if a hole belongs to an outer contour by testing if hole's centroid is inside
  const isHoleInside = (hole: number[], outer: number[]): boolean => {
    // Calculate centroid of hole
    let cx = 0, cy = 0;
    const n = hole.length / 2;
    for (let i = 0; i < n; i++) {
      cx += hole[i * 2];
      cy += hole[i * 2 + 1];
    }
    cx /= n;
    cy /= n;
    
    return pointInPolygon(cx, cy, outer);
  };

  const outerContours: number[][] = [];
  const holes: number[][] = [];

  for (const contour of contours) {
    if (contour.length < 6) continue;
    const area = signedArea(contour);
    // After X-mirroring, outer contours have positive area
    if (area > 0) {
      outerContours.push(contour);
    } else {
      holes.push(contour);
    }
  }

  console.log(`[PetTag] Outer contours: ${outerContours.length}, holes: ${holes.length}`);

  // For each outer contour, triangulate with its associated holes
  for (const outer of outerContours) {
    // Find holes that belong to this outer contour (point-in-polygon test)
    const relevantHoles = holes.filter(hole => isHoleInside(hole, outer));

    // Prepare data for earcut
    const coords: number[] = [...outer];
    const holeIndices: number[] = [];

    for (const hole of relevantHoles) {
      holeIndices.push(coords.length / 2);
      coords.push(...hole);
    }

    // Triangulate the 2D shape
    const indices = earcut(coords, holeIndices.length > 0 ? holeIndices : undefined);

    // Create bottom face (z = 0)
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const v0: Vector3 = { x: coords[i0 * 2] + offsetX, y: coords[i0 * 2 + 1] + offsetY, z: 0 };
      const v1: Vector3 = { x: coords[i1 * 2] + offsetX, y: coords[i1 * 2 + 1] + offsetY, z: 0 };
      const v2: Vector3 = { x: coords[i2 * 2] + offsetX, y: coords[i2 * 2 + 1] + offsetY, z: 0 };

      addTriangle(baseTriangles, v0, v2, v1); // Reversed for bottom face
    }

    // Create top face with channel (z = depth - channelDepth is the floor of the channel)
    const topZ = depth;
    const channelFloorZ = depth - channelDepth;

    // Top outer rim (the walls around the channel)
    // For now, create solid top and add channel as separate geometry
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const v0: Vector3 = { x: coords[i0 * 2] + offsetX, y: coords[i0 * 2 + 1] + offsetY, z: channelFloorZ };
      const v1: Vector3 = { x: coords[i1 * 2] + offsetX, y: coords[i1 * 2 + 1] + offsetY, z: channelFloorZ };
      const v2: Vector3 = { x: coords[i2 * 2] + offsetX, y: coords[i2 * 2 + 1] + offsetY, z: channelFloorZ };

      addTriangle(baseTriangles, v0, v1, v2);
    }

    // Create side walls for all contours
    const allContours = [outer, ...relevantHoles];
    for (const contour of allContours) {
      const n = contour.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x0 = contour[i * 2] + offsetX;
        const y0 = contour[i * 2 + 1] + offsetY;
        const x1 = contour[j * 2] + offsetX;
        const y1 = contour[j * 2 + 1] + offsetY;

        // Bottom edge to channel floor
        const bl: Vector3 = { x: x0, y: y0, z: 0 };
        const br: Vector3 = { x: x1, y: y1, z: 0 };
        const tr: Vector3 = { x: x1, y: y1, z: channelFloorZ };
        const tl: Vector3 = { x: x0, y: y0, z: channelFloorZ };

        addQuad(baseTriangles, bl, br, tr, tl, true);

        // Channel walls (from floor to top)
        const wbl: Vector3 = { x: x0, y: y0, z: channelFloorZ };
        const wbr: Vector3 = { x: x1, y: y1, z: channelFloorZ };
        const wtr: Vector3 = { x: x1, y: y1, z: topZ };
        const wtl: Vector3 = { x: x0, y: y0, z: topZ };

        addQuad(baseTriangles, wbl, wbr, wtr, wtl, true);

        // Inner walls of channel (offset inward by wallThickness)
        // This creates the U-channel profile
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.01) {
          const nx = -dy / len * wallThickness;
          const ny = dx / len * wallThickness;

          const ix0 = x0 + nx;
          const iy0 = y0 + ny;
          const ix1 = x1 + nx;
          const iy1 = y1 + ny;

          // Inner wall from floor to top
          const ibl: Vector3 = { x: ix0, y: iy0, z: channelFloorZ };
          const ibr: Vector3 = { x: ix1, y: iy1, z: channelFloorZ };
          const itr: Vector3 = { x: ix1, y: iy1, z: topZ };
          const itl: Vector3 = { x: ix0, y: iy0, z: topZ };

          addQuad(baseTriangles, ibl, itl, itr, ibr, true); // Reversed for inner face

          // Top rim connecting outer to inner
          const otl: Vector3 = { x: x0, y: y0, z: topZ };
          const otr: Vector3 = { x: x1, y: y1, z: topZ };
          addQuad(baseTriangles, otl, otr, itr, itl, true);
        }
      }
    }
  }

  // Generate diffuser cap - sits inside the U-channel
  const capThickness = 2;
  const tolerance = 0.2;
  const channelFloor = depth - channelDepth;
  const capZ = channelFloor;  // Cap starts at channel floor
  const capTopZ = channelFloor + capThickness;  // Cap extends upward from floor

  for (const outer of outerContours) {
    // Find holes that belong to this outer contour (point-in-polygon test)
    const relevantHoles = holes.filter(hole => isHoleInside(hole, outer));
    const coords: number[] = [...outer];
    const holeIndices: number[] = [];

    for (const hole of relevantHoles) {
      holeIndices.push(coords.length / 2);
      coords.push(...hole);
    }

    // Offset inward by wall thickness + tolerance for cap to fit in channel
    const offsetAmount = wallThickness + tolerance;
    const offsetCoords: number[] = [];
    const n = coords.length / 2;
    
    for (let i = 0; i < n; i++) {
      const prev = (i - 1 + n) % n;
      const next = (i + 1) % n;
      
      const x = coords[i * 2];
      const y = coords[i * 2 + 1];
      
      // Calculate inward offset
      const dx1 = x - coords[prev * 2];
      const dy1 = y - coords[prev * 2 + 1];
      const dx2 = coords[next * 2] - x;
      const dy2 = coords[next * 2 + 1] - y;
      
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (len1 > 0.01 && len2 > 0.01) {
        const nx = (-dy1 / len1 - dy2 / len2) / 2;
        const ny = (dx1 / len1 + dx2 / len2) / 2;
        const nlen = Math.sqrt(nx * nx + ny * ny);
        if (nlen > 0.01) {
          offsetCoords.push(x + nx / nlen * offsetAmount + offsetX);
          offsetCoords.push(y + ny / nlen * offsetAmount + offsetY);
        } else {
          offsetCoords.push(x + offsetX);
          offsetCoords.push(y + offsetY);
        }
      } else {
        offsetCoords.push(x + offsetX);
        offsetCoords.push(y + offsetY);
      }
    }

    const capIndices = earcut(offsetCoords, holeIndices.length > 0 ? holeIndices : undefined);

    // Bottom face of cap
    for (let i = 0; i < capIndices.length; i += 3) {
      const i0 = capIndices[i];
      const i1 = capIndices[i + 1];
      const i2 = capIndices[i + 2];

      const v0: Vector3 = { x: offsetCoords[i0 * 2], y: offsetCoords[i0 * 2 + 1], z: capZ };
      const v1: Vector3 = { x: offsetCoords[i1 * 2], y: offsetCoords[i1 * 2 + 1], z: capZ };
      const v2: Vector3 = { x: offsetCoords[i2 * 2], y: offsetCoords[i2 * 2 + 1], z: capZ };

      addTriangle(capTriangles, v0, v2, v1);
    }

    // Top face of cap
    for (let i = 0; i < capIndices.length; i += 3) {
      const i0 = capIndices[i];
      const i1 = capIndices[i + 1];
      const i2 = capIndices[i + 2];

      const v0: Vector3 = { x: offsetCoords[i0 * 2], y: offsetCoords[i0 * 2 + 1], z: capTopZ };
      const v1: Vector3 = { x: offsetCoords[i1 * 2], y: offsetCoords[i1 * 2 + 1], z: capTopZ };
      const v2: Vector3 = { x: offsetCoords[i2 * 2], y: offsetCoords[i2 * 2 + 1], z: capTopZ };

      addTriangle(capTriangles, v0, v1, v2);
    }

    // Side walls of cap
    const capN = offsetCoords.length / 2;
    for (let i = 0; i < capN; i++) {
      const j = (i + 1) % capN;
      const x0 = offsetCoords[i * 2];
      const y0 = offsetCoords[i * 2 + 1];
      const x1 = offsetCoords[j * 2];
      const y1 = offsetCoords[j * 2 + 1];

      const bl: Vector3 = { x: x0, y: y0, z: capZ };
      const br: Vector3 = { x: x1, y: y1, z: capZ };
      const tr: Vector3 = { x: x1, y: y1, z: capTopZ };
      const tl: Vector3 = { x: x0, y: y0, z: capTopZ };

      addQuad(capTriangles, bl, br, tr, tl, true);
    }
  }

  return { base: baseTriangles, cap: capTriangles };
}

// Generate attachment loop ring
function generateAttachmentLoop(
  centerX: number,
  centerY: number,
  innerDiameter: number,
  outerDiameter: number,
  height: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 32;
  const innerR = innerDiameter / 2;
  const outerR = outerDiameter / 2;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    const cos0 = Math.cos(a0);
    const sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1);
    const sin1 = Math.sin(a1);

    // Outer surface
    const o00: Vector3 = { x: centerX + cos0 * outerR, y: centerY + sin0 * outerR, z: 0 };
    const o01: Vector3 = { x: centerX + cos1 * outerR, y: centerY + sin1 * outerR, z: 0 };
    const o10: Vector3 = { x: centerX + cos0 * outerR, y: centerY + sin0 * outerR, z: height };
    const o11: Vector3 = { x: centerX + cos1 * outerR, y: centerY + sin1 * outerR, z: height };

    addQuad(triangles, o00, o01, o11, o10, true);

    // Inner surface
    const i00: Vector3 = { x: centerX + cos0 * innerR, y: centerY + sin0 * innerR, z: 0 };
    const i01: Vector3 = { x: centerX + cos1 * innerR, y: centerY + sin1 * innerR, z: 0 };
    const i10: Vector3 = { x: centerX + cos0 * innerR, y: centerY + sin0 * innerR, z: height };
    const i11: Vector3 = { x: centerX + cos1 * innerR, y: centerY + sin1 * innerR, z: height };

    addQuad(triangles, i00, i10, i11, i01, true);

    // Top face
    addQuad(triangles, o10, o11, i11, i10, true);

    // Bottom face
    addQuad(triangles, o00, i00, i01, o01, true);
  }

  return triangles;
}

// Generate connecting strut
function generateStrut(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
  height: number
): Triangle[] {
  const triangles: Triangle[] = [];

  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return triangles;

  const nx = -dy / len * (width / 2);
  const ny = dx / len * (width / 2);

  const bl: Vector3 = { x: startX + nx, y: startY + ny, z: 0 };
  const br: Vector3 = { x: startX - nx, y: startY - ny, z: 0 };
  const fl: Vector3 = { x: endX + nx, y: endY + ny, z: 0 };
  const fr: Vector3 = { x: endX - nx, y: endY - ny, z: 0 };

  const tbl: Vector3 = { x: startX + nx, y: startY + ny, z: height };
  const tbr: Vector3 = { x: startX - nx, y: startY - ny, z: height };
  const tfl: Vector3 = { x: endX + nx, y: endY + ny, z: height };
  const tfr: Vector3 = { x: endX - nx, y: endY - ny, z: height };

  // Bottom
  addQuad(triangles, bl, br, fr, fl, false);
  // Top
  addQuad(triangles, tbl, tfl, tfr, tbr, true);
  // Sides
  addQuad(triangles, bl, fl, tfl, tbl, true);
  addQuad(triangles, br, tbr, tfr, fr, true);
  addQuad(triangles, bl, tbl, tbr, br, true);
  addQuad(triangles, fl, fr, tfr, tfl, true);

  return triangles;
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

export function generatePetTagV2(settings: PetTagSettings): PetTagPart[] {
  const parts: PetTagPart[] = [];

  const {
    petName,
    ledChannelEnabled,
    ledChannelWidth,
    ledChannelDepth,
    holeEnabled,
    holeDiameter,
    fontScale,
    fontId,
    hangPosition = "top",
  } = settings;

  const name = petName || "PET";
  const fontSize = 25 * (fontScale || 1);
  const channelWidth = ledChannelWidth || 6;
  const channelDepth = ledChannelDepth || 8;
  const wallThickness = Math.max(1.5, channelWidth * 0.25);
  const baseDepth = 3;
  const totalDepth = baseDepth + channelDepth;

  console.log(`[PetTag] Generating raised 3D tag: "${name}", font=${fontId}, depth=${totalDepth}mm, hangPosition=${hangPosition}`);

  // Load font and get contours
  const font = loadFont(fontId || "aerioz");
  const fontPath = font.getPath(name, 0, 0, fontSize);
  console.log(`[PetTag] Font path commands: ${fontPath.commands.length}`);
  const rawContours = pathToContours(fontPath);
  
  // Mirror X coordinates to fix backwards text (OpenType uses different coordinate system)
  const contours = rawContours.map(contour => {
    const mirrored: number[] = [];
    for (let i = 0; i < contour.length; i += 2) {
      mirrored.push(-contour[i], contour[i + 1]); // Negate X, keep Y
    }
    return mirrored;
  });

  console.log(`[PetTag] Generated ${contours.length} contours, sizes: ${contours.map(c => c.length/2).join(', ')}`);
  
  if (contours.length === 0) {
    console.log("[PetTag] No contours generated from font");
    return parts;
  }

  // Calculate bounds
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

  const textWidth = maxX - minX;
  const textHeight = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Center the text
  const offsetX = -centerX;
  const offsetY = -centerY;

  // Generate 3D letter geometry
  const { base, cap } = generateExtrudedLetter(
    contours,
    totalDepth,
    channelWidth,
    channelDepth,
    wallThickness,
    offsetX,
    offsetY
  );

  const allBaseTriangles = [...base];
  const allCapTriangles = [...cap];

  // Add attachment loop at specified position
  if (holeEnabled) {
    const loopInnerDiam = holeDiameter || 5;
    const loopOuterDiam = loopInnerDiam + channelWidth;
    const loopHeight = totalDepth;
    const gap = channelWidth * 0.5;

    // Calculate loop position based on hangPosition
    let loopX = 0;
    let loopY = 0;
    let strutStartX = 0;
    let strutStartY = 0;

    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;

    switch (hangPosition) {
      case "top":
        loopX = 0;
        loopY = halfHeight + loopOuterDiam / 2 + gap;
        strutStartX = 0;
        strutStartY = halfHeight;
        break;
      case "top-left":
        loopX = -halfWidth - loopOuterDiam / 2 - gap / 2;
        loopY = halfHeight + loopOuterDiam / 2 + gap / 2;
        strutStartX = -halfWidth;
        strutStartY = halfHeight;
        break;
      case "top-right":
        loopX = halfWidth + loopOuterDiam / 2 + gap / 2;
        loopY = halfHeight + loopOuterDiam / 2 + gap / 2;
        strutStartX = halfWidth;
        strutStartY = halfHeight;
        break;
      case "left":
        loopX = -halfWidth - loopOuterDiam / 2 - gap;
        loopY = 0;
        strutStartX = -halfWidth;
        strutStartY = 0;
        break;
      case "right":
        loopX = halfWidth + loopOuterDiam / 2 + gap;
        loopY = 0;
        strutStartX = halfWidth;
        strutStartY = 0;
        break;
    }

    // Generate loop
    const loopTriangles = generateAttachmentLoop(loopX, loopY, loopInnerDiam, loopOuterDiam, loopHeight);
    allBaseTriangles.push(...loopTriangles);

    // Generate strut connecting loop to text
    const strutTriangles = generateStrut(strutStartX, strutStartY, loopX, loopY, channelWidth, loopHeight);
    allBaseTriangles.push(...strutTriangles);
  }

  console.log(`[PetTag] Generated ${allBaseTriangles.length} triangles for base, ${allCapTriangles.length} for cap`);

  // Create base STL
  const safeName = (petName || "pet").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const baseBuffer = trianglesToSTL(allBaseTriangles, `${name} Neon Tag`);
  parts.push({
    filename: `${safeName}_neon_tag.stl`,
    content: baseBuffer,
    partType: "base",
    material: "opaque",
  });

  // Create cap STL if LED channel is enabled
  if (ledChannelEnabled && allCapTriangles.length > 0) {
    const capBuffer = trianglesToSTL(allCapTriangles, `${name} Diffuser Cap`);
    parts.push({
      filename: `${safeName}_diffuser_cap.stl`,
      content: capBuffer,
      partType: "diffuser_cap",
      material: "translucent",
    });
  }

  return parts;
}
