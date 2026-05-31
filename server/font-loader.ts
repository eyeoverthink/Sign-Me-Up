import * as opentype from 'opentype.js';
import * as path from 'path';
import * as fs from 'fs';

interface StrokePath {
  points: number[][];
  closed: boolean;
  area?: number;
}

const fontCache: Map<string, opentype.Font> = new Map();

// Fonts that work well for neon signs (single-stroke or thin outline)
export const neonFontOptions = [
  { id: "aerioz", name: "Aerioz (Neon Script)", file: "Aerioz-Demo.otf", scale: 0.08, strokeBased: false },
  { id: "airstream", name: "Airstream", file: "Airstream.ttf", scale: 0.08, strokeBased: false },
  { id: "airstream-nf", name: "Airstream NF", file: "AirstreamNF.ttf", scale: 0.08, strokeBased: false },
  { id: "alliston", name: "Alliston (Script)", file: "Alliston-Demo.ttf", scale: 0.08, strokeBased: false },
  { id: "cookiemonster", name: "Cookie Monster", file: "Cookiemonster.ttf", scale: 0.08, strokeBased: false },
  { id: "darlington", name: "Darlington", file: "Darlington-Demo.ttf", scale: 0.08, strokeBased: false },
  { id: "dirtyboy", name: "Dirtyboy", file: "Dirtyboy.ttf", scale: 0.08, strokeBased: false },
  { id: "future-light", name: "Future Light", file: "FutureLight.ttf", scale: 0.08, strokeBased: false },
  { id: "future-light-italic", name: "Future Light Italic", file: "FutureLightItalic.ttf", scale: 0.08, strokeBased: false },
  { id: "halimun", name: "Halimun (Script)", file: "Halimun.ttf", scale: 0.08, strokeBased: false },
  { id: "hershey-sans", name: "Hershey Sans", file: null, scale: 1, strokeBased: true },
  { id: "hershey-script", name: "Hershey Script", file: null, scale: 1, strokeBased: true },
];

function loadFont(fontFile: string): opentype.Font | null {
  if (fontCache.has(fontFile)) {
    return fontCache.get(fontFile)!;
  }
  
  const fontPath = path.join(process.cwd(), 'public', 'fonts', fontFile);
  
  if (!fs.existsSync(fontPath)) {
    console.error(`[FontLoader] Font file not found: ${fontPath}`);
    return null;
  }
  
  try {
    const font = opentype.loadSync(fontPath);
    fontCache.set(fontFile, font);
    console.log(`[FontLoader] Loaded font: ${fontFile}`);
    return font;
  } catch (error) {
    console.error(`[FontLoader] Failed to load font: ${fontFile}`, error);
    return null;
  }
}

// Extract the OUTER contour only from font outlines
// This gives us a single clean path per letter component
function extractOuterContour(pathData: opentype.Path, scale: number): number[][][] {
  const contours: StrokePath[] = [];
  let currentPath: number[][] = [];
  let currentX = 0;
  let currentY = 0;
  
  for (const cmd of pathData.commands) {
    switch (cmd.type) {
      case 'M':
        if (currentPath.length > 1) {
          const area = Math.abs(calculateSignedArea(currentPath));
          contours.push({ points: [...currentPath], closed: false, area });
        }
        currentPath = [[cmd.x! * scale, cmd.y! * scale]];
        currentX = cmd.x!;
        currentY = cmd.y!;
        break;
        
      case 'L':
        currentPath.push([cmd.x! * scale, cmd.y! * scale]);
        currentX = cmd.x!;
        currentY = cmd.y!;
        break;
        
      case 'C':
        // Sample bezier - fewer steps for cleaner output
        const steps = 6;
        for (let t = 1; t <= steps; t++) {
          const tt = t / steps;
          const t2 = tt * tt;
          const t3 = t2 * tt;
          const mt = 1 - tt;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          
          const x = mt3 * currentX + 3 * mt2 * tt * cmd.x1! + 3 * mt * t2 * cmd.x2! + t3 * cmd.x!;
          const y = mt3 * currentY + 3 * mt2 * tt * cmd.y1! + 3 * mt * t2 * cmd.y2! + t3 * cmd.y!;
          currentPath.push([x * scale, y * scale]);
        }
        currentX = cmd.x!;
        currentY = cmd.y!;
        break;
        
      case 'Q':
        const qSteps = 5;
        for (let t = 1; t <= qSteps; t++) {
          const tt = t / qSteps;
          const mt = 1 - tt;
          const x = mt * mt * currentX + 2 * mt * tt * cmd.x1! + tt * tt * cmd.x!;
          const y = mt * mt * currentY + 2 * mt * tt * cmd.y1! + tt * tt * cmd.y!;
          currentPath.push([x * scale, y * scale]);
        }
        currentX = cmd.x!;
        currentY = cmd.y!;
        break;
        
      case 'Z':
        if (currentPath.length > 1) {
          const area = Math.abs(calculateSignedArea(currentPath));
          contours.push({ points: [...currentPath], closed: true, area });
        }
        currentPath = [];
        break;
    }
  }
  
  if (currentPath.length > 1) {
    const area = Math.abs(calculateSignedArea(currentPath));
    contours.push({ points: currentPath, closed: true, area });
  }
  
  // For outline fonts, we need to extract paths that represent the letter's stroke
  // Keep all significant outer contours (positive area) but filter out small inner holes
  if (contours.length === 0) return [];
  
  // Sort by area descending 
  contours.sort((a, b) => (b.area || 0) - (a.area || 0));
  
  // Get the largest contour area as reference
  const maxArea = contours[0].area || 0;
  const minAreaThreshold = maxArea * 0.05; // Keep contours at least 5% of largest
  
  const result: number[][][] = [];
  
  // Keep all significant contours (not just the largest)
  // This preserves multi-component glyphs like "i", "j", etc.
  for (const contour of contours) {
    if ((contour.area || 0) >= minAreaThreshold && contour.points.length >= 3) {
      result.push(simplifyPath(contour.points, 0.5));
    }
  }
  
  return result;
}

function calculateSignedArea(points: number[][]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2;
}

function simplifyPath(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToLineDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function pointToLineDistance(point: number[], lineStart: number[], lineEnd: number[]): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const len = Math.hypot(dx, dy);
  
  if (len < 0.0001) {
    return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
  }
  
  return Math.abs(
    (dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / len
  );
}

export function getTextStrokePathsFromFont(
  text: string,
  fontId: string,
  letterHeight: number = 50
): { paths: number[][][]; bounds: { minX: number; maxX: number; minY: number; maxY: number } } {
  const fontOption = neonFontOptions.find(f => f.id === fontId);
  
  if (!fontOption || !fontOption.file) {
    console.log(`[FontLoader] Font ${fontId} not found or uses Hershey, falling back`);
    return { paths: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
  }
  
  const font = loadFont(fontOption.file);
  if (!font) {
    return { paths: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
  }
  
  const scale = fontOption.scale * (letterHeight / 50);
  const allPaths: number[][][] = [];
  
  let currentX = 0;
  const glyphs = font.stringToGlyphs(text);
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const glyphPath = glyph.getPath(currentX, 0, 1000);
    
    // Extract only outer contour per glyph
    const outerContours = extractOuterContour(glyphPath, scale);
    
    for (const pathPoints of outerContours) {
      const offsetPath = pathPoints.map(([x, y]) => {
        const px = x;
        const py = -y;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        return [px, py];
      });
      
      if (offsetPath.length >= 2) {
        allPaths.push(offsetPath);
      }
    }
    
    const advance = glyph.advanceWidth || 600;
    if (i < glyphs.length - 1) {
      const kerning = font.getKerningValue(glyph, glyphs[i + 1]);
      currentX += advance + kerning;
    } else {
      currentX += advance;
    }
  }
  
  if (minX === Infinity) {
    return { paths: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
  }
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  const centeredPaths = allPaths.map(path =>
    path.map(([x, y]) => [x - centerX, y - centerY])
  );
  
  console.log(`[FontLoader] Generated ${centeredPaths.length} paths for "${text}" (outer contours only)`);
  
  return {
    paths: centeredPaths,
    bounds: {
      minX: minX - centerX,
      maxX: maxX - centerX,
      minY: minY - centerY,
      maxY: maxY - centerY
    }
  };
}

export function isOTFFont(fontId: string): boolean {
  const fontOption = neonFontOptions.find(f => f.id === fontId);
  return fontOption?.file !== null && fontOption?.file !== undefined;
}

// Extract glyph paths for visualization (used by Symbol/Combo editors)
export function extractGlyphPathsForVisualization(
  text: string,
  fontFile?: string,
  fontSize: number = 100
): {
  paths: number[][][];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  originalPoints: number;
  simplifiedPoints: number;
} {
  const file = fontFile || 'NotoColorEmoji-Regular.ttf';
  const font = loadFont(file);
  
  if (!font) {
    // Try emoji/symbol fallback fonts
    const fallbacks = ['NotoSansSymbols2-Regular.ttf', 'NotoSansEgyptianHieroglyphs-Regular.ttf', 'Halimun.ttf'];
    for (const fallback of fallbacks) {
      const fallbackFont = loadFont(fallback);
      if (fallbackFont) {
        return extractPathsFromFont(fallbackFont, text, fontSize);
      }
    }
    return { paths: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, originalPoints: 0, simplifiedPoints: 0 };
  }
  
  return extractPathsFromFont(font, text, fontSize);
}

function extractPathsFromFont(
  font: opentype.Font,
  text: string,
  fontSize: number
): {
  paths: number[][][];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  originalPoints: number;
  simplifiedPoints: number;
} {
  const scale = fontSize / 1000;
  const allPaths: number[][][] = [];
  let originalPoints = 0;
  let simplifiedPoints = 0;
  
  let currentX = 0;
  const glyphs = font.stringToGlyphs(text);
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const glyphPath = glyph.getPath(currentX, 0, 1000);
    
    // Count original points from path commands
    for (const cmd of glyphPath.commands) {
      if (cmd.type !== 'Z') originalPoints++;
    }
    
    const outerContours = extractOuterContour(glyphPath, scale);
    
    for (const pathPoints of outerContours) {
      const offsetPath = pathPoints.map(([x, y]) => {
        const px = x;
        const py = -y;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        return [px, py];
      });
      
      if (offsetPath.length >= 2) {
        allPaths.push(offsetPath);
        simplifiedPoints += offsetPath.length;
      }
    }
    
    const advance = glyph.advanceWidth || 600;
    if (i < glyphs.length - 1) {
      const kerning = font.getKerningValue(glyph, glyphs[i + 1]);
      currentX += advance + kerning;
    } else {
      currentX += advance;
    }
  }
  
  if (minX === Infinity) {
    return { paths: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, originalPoints: 0, simplifiedPoints: 0 };
  }
  
  // Center paths
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  const centeredPaths = allPaths.map(path =>
    path.map(([x, y]) => [x - centerX, y - centerY])
  );
  
  return {
    paths: centeredPaths,
    bounds: {
      minX: minX - centerX,
      maxX: maxX - centerX,
      minY: minY - centerY,
      maxY: maxY - centerY
    },
    originalPoints,
    simplifiedPoints
  };
}
