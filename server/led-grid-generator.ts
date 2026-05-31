import { LEDGridSettings, LED_FONT_5x7 } from "@shared/schema";

type Triangle = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

function createBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCount = triangles.length;
  const dataSize = headerSize + 4 + triangleCount * 50;
  const buffer = Buffer.alloc(dataSize);
  
  buffer.write("LED Grid Sign - SignCraft3D", 0);
  buffer.writeUInt32LE(triangleCount, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    const [p1, p2, p3] = tri;
    const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0], vy = p3[1] - p1[1], vz = p3[2] - p1[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;
    
    buffer.writeFloatLE(nx, offset); offset += 4;
    buffer.writeFloatLE(ny, offset); offset += 4;
    buffer.writeFloatLE(nz, offset); offset += 4;
    
    for (const p of tri) {
      buffer.writeFloatLE(p[0], offset); offset += 4;
      buffer.writeFloatLE(p[1], offset); offset += 4;
      buffer.writeFloatLE(p[2], offset); offset += 4;
    }
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  return buffer;
}

function addBox(triangles: Triangle[], x: number, y: number, z: number, 
                w: number, h: number, d: number): void {
  const x1 = x, x2 = x + w;
  const y1 = y, y2 = y + h;
  const z1 = z, z2 = z + d;
  
  triangles.push([[x1, y1, z1], [x2, y1, z1], [x2, y2, z1]]);
  triangles.push([[x1, y1, z1], [x2, y2, z1], [x1, y2, z1]]);
  triangles.push([[x1, y1, z2], [x2, y2, z2], [x2, y1, z2]]);
  triangles.push([[x1, y1, z2], [x1, y2, z2], [x2, y2, z2]]);
  triangles.push([[x1, y1, z1], [x1, y2, z1], [x1, y2, z2]]);
  triangles.push([[x1, y1, z1], [x1, y2, z2], [x1, y1, z2]]);
  triangles.push([[x2, y1, z1], [x2, y2, z2], [x2, y2, z1]]);
  triangles.push([[x2, y1, z1], [x2, y1, z2], [x2, y2, z2]]);
  triangles.push([[x1, y2, z1], [x2, y2, z1], [x2, y2, z2]]);
  triangles.push([[x1, y2, z1], [x2, y2, z2], [x1, y2, z2]]);
  triangles.push([[x1, y1, z1], [x2, y1, z2], [x2, y1, z1]]);
  triangles.push([[x1, y1, z1], [x1, y1, z2], [x2, y1, z2]]);
}

function addCylinder(triangles: Triangle[], cx: number, cy: number, z1: number, 
                     z2: number, r: number, segments: number = 16): void {
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    
    triangles.push([[cx, cy, z1], [x2, y2, z1], [x1, y1, z1]]);
    triangles.push([[cx, cy, z2], [x1, y1, z2], [x2, y2, z2]]);
    triangles.push([[x1, y1, z1], [x2, y2, z1], [x2, y2, z2]]);
    triangles.push([[x1, y1, z1], [x2, y2, z2], [x1, y1, z2]]);
  }
}

function subtractCylinder(triangles: Triangle[], cx: number, cy: number, 
                          z1: number, z2: number, r: number, segments: number = 16): void {
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const x1 = cx + Math.cos(a1) * r;
    const y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    
    triangles.push([[cx, cy, z1], [x1, y1, z1], [x2, y2, z1]]);
    triangles.push([[cx, cy, z2], [x2, y2, z2], [x1, y1, z2]]);
    triangles.push([[x1, y1, z1], [x1, y1, z2], [x2, y2, z2]]);
    triangles.push([[x1, y1, z1], [x2, y2, z2], [x2, y2, z1]]);
  }
}

export function generateHousingSTL(settings: LEDGridSettings): Buffer {
  const triangles: Triangle[] = [];
  
  const gridW = settings.gridWidth;
  const gridH = settings.gridHeight;
  const spacing = settings.ledSpacing;
  const wall = settings.wallThickness;
  const depth = settings.housingDepth;
  
  const innerW = gridW * spacing;
  const innerH = gridH * spacing;
  const outerW = innerW + wall * 2;
  const outerH = innerH + wall * 2;
  
  const housingStyle = settings.housingStyle || 'open_back';
  const includeWireChannel = settings.includeWireChannel !== false;
  const channelW = settings.wireChannelWidth || 5;
  const requestedChannelH = settings.wireChannelHeight || 3;
  const exitSide = settings.wireExitSide || 'bottom';
  
  const availableDepth = depth - wall - 2;
  const channelH = Math.max(2, Math.min(requestedChannelH, availableDepth));
  const channelStartZ = Math.max(wall + 1, Math.min(wall + 2, depth - channelH));
  const channelEndZ = Math.min(channelStartZ + channelH, depth);
  const validChannel = includeWireChannel && channelH >= 2 && depth > wall + 3;
  const simpleGap = includeWireChannel && !validChannel && depth > wall;
  
  if (exitSide === 'bottom' && (validChannel || simpleGap)) {
    const gapStart = Math.max(0, outerW / 2 - channelW / 2);
    const gapEnd = Math.min(outerW, outerW / 2 + channelW / 2);
    addBox(triangles, 0, 0, 0, gapStart, wall, depth);
    addBox(triangles, gapEnd, 0, 0, Math.max(0, outerW - gapEnd), wall, depth);
    if (validChannel) {
      addBox(triangles, gapStart, 0, 0, channelW, wall, channelStartZ);
      if (depth > channelEndZ) {
        addBox(triangles, gapStart, 0, channelEndZ, channelW, wall, depth - channelEndZ);
      }
    }
  } else {
    addBox(triangles, 0, 0, 0, outerW, wall, depth);
  }
  
  addBox(triangles, 0, outerH - wall, 0, outerW, wall, depth);
  
  if (exitSide === 'left' && (validChannel || simpleGap)) {
    const gapStart = Math.max(wall, outerH / 2 - channelW / 2);
    const gapEnd = Math.min(outerH - wall, outerH / 2 + channelW / 2);
    addBox(triangles, 0, wall, 0, wall, Math.max(0, gapStart - wall), depth);
    addBox(triangles, 0, gapEnd, 0, wall, Math.max(0, outerH - wall - gapEnd), depth);
    if (validChannel) {
      addBox(triangles, 0, gapStart, 0, wall, channelW, channelStartZ);
      if (depth > channelEndZ) {
        addBox(triangles, 0, gapStart, channelEndZ, wall, channelW, depth - channelEndZ);
      }
    }
  } else {
    addBox(triangles, 0, wall, 0, wall, innerH, depth);
  }
  
  if (exitSide === 'right' && (validChannel || simpleGap)) {
    const gapStart = Math.max(wall, outerH / 2 - channelW / 2);
    const gapEnd = Math.min(outerH - wall, outerH / 2 + channelW / 2);
    addBox(triangles, outerW - wall, wall, 0, wall, Math.max(0, gapStart - wall), depth);
    addBox(triangles, outerW - wall, gapEnd, 0, wall, Math.max(0, outerH - wall - gapEnd), depth);
    if (validChannel) {
      addBox(triangles, outerW - wall, gapStart, 0, wall, channelW, channelStartZ);
      if (depth > channelEndZ) {
        addBox(triangles, outerW - wall, gapStart, channelEndZ, wall, channelW, depth - channelEndZ);
      }
    }
  } else {
    addBox(triangles, outerW - wall, wall, 0, wall, innerH, depth);
  }
  
  if (housingStyle === 'open_back') {
  } else if (housingStyle === 'enclosed') {
    if (exitSide === 'back' && (validChannel || simpleGap)) {
      const gapX = Math.max(0, outerW / 2 - channelW / 2);
      const gapY = Math.max(0, outerH / 2 - channelW / 2);
      addBox(triangles, 0, 0, 0, gapX, outerH, wall);
      addBox(triangles, gapX + channelW, 0, 0, Math.max(0, outerW - gapX - channelW), outerH, wall);
      addBox(triangles, gapX, 0, 0, channelW, gapY, wall);
      addBox(triangles, gapX, gapY + channelW, 0, channelW, Math.max(0, outerH - gapY - channelW), wall);
    } else {
      addBox(triangles, 0, 0, 0, outerW, outerH, wall);
    }
  } else if (housingStyle === 'snap_lid') {
    addBox(triangles, 0, 0, 0, outerW, outerH, wall);
    const grooveWidth = 2.0;
    const grooveDepth = 2.5;
    const grooveInset = wall - 0.5;
    addBox(triangles, grooveInset, grooveInset, wall, outerW - grooveInset * 2, grooveWidth, grooveDepth);
    addBox(triangles, grooveInset, outerH - grooveInset - grooveWidth, wall, outerW - grooveInset * 2, grooveWidth, grooveDepth);
    addBox(triangles, grooveInset, grooveInset + grooveWidth, wall, grooveWidth, outerH - grooveInset * 2 - grooveWidth * 2, grooveDepth);
    addBox(triangles, outerW - grooveInset - grooveWidth, grooveInset + grooveWidth, wall, grooveWidth, outerH - grooveInset * 2 - grooveWidth * 2, grooveDepth);
  } else if (housingStyle === 'screw_lid') {
    addBox(triangles, 0, 0, 0, outerW, outerH, wall);
    const bossR = 4;
    const bossH = 6;
    const screwHoleR = 1.5;
    const bossInset = wall + bossR + 2;
    const bossPositions = [
      [bossInset, bossInset],
      [outerW - bossInset, bossInset],
      [bossInset, outerH - bossInset],
      [outerW - bossInset, outerH - bossInset],
    ];
    for (const [bx, by] of bossPositions) {
      addCylinder(triangles, bx, by, wall, wall + bossH, bossR, 16);
      subtractCylinder(triangles, bx, by, wall, wall + bossH + 1, screwHoleR, 12);
    }
  }
  
  const ledPocketSize = 5.5;
  const ledPocketDepth = 3;
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cx = wall + col * spacing + spacing / 2;
      const cy = wall + row * spacing + spacing / 2;
      subtractCylinder(triangles, cx, cy, wall, wall + ledPocketDepth, ledPocketSize / 2, 8);
    }
  }
  
  if (settings.includeMountingHoles) {
    const holeR = settings.mountingHoleDiameter / 2;
    const margin = wall + 5;
    const positions = [
      [margin, margin],
      [outerW - margin, margin],
      [margin, outerH - margin],
      [outerW - margin, outerH - margin],
    ];
    for (const [hx, hy] of positions) {
      subtractCylinder(triangles, hx, hy, 0, depth, holeR, 12);
    }
  }
  
  return createBinarySTL(triangles);
}

function addDiffusionPattern(triangles: Triangle[], 
                              outerW: number, outerH: number, 
                              thickness: number, settings: LEDGridSettings): void {
  const pattern = settings.diffusionPattern || 'none';
  if (pattern === 'none') return;
  
  const density = settings.diffusionDensity || 50;
  const depthVal = Math.min(settings.diffusionDepth || 0.5, thickness - 0.5);
  if (depthVal < 0.1) return;
  
  const spacing = Math.max(4, 20 - (density / 6));
  const margin = settings.wallThickness + 3;
  
  const innerW = outerW - margin * 2;
  const innerH = outerH - margin * 2;
  if (innerW < spacing || innerH < spacing) return;
  
  switch (pattern) {
    case 'honeycomb': {
      const hexSize = spacing * 0.4;
      const safeMargin = margin + hexSize;
      const colsNeeded = Math.floor((outerW - safeMargin * 2) / spacing);
      const rowsNeeded = Math.floor((outerH - safeMargin * 2) / (spacing * 0.866));
      for (let row = 0; row <= rowsNeeded; row++) {
        const offsetX = (row % 2) * spacing * 0.5;
        for (let col = 0; col <= colsNeeded; col++) {
          const cx = safeMargin + col * spacing + offsetX;
          const cy = safeMargin + row * spacing * 0.866;
          if (cx >= safeMargin && cx <= outerW - safeMargin && cy >= safeMargin && cy <= outerH - safeMargin) {
            addCylinder(triangles, cx, cy, thickness - depthVal, thickness + 0.01, hexSize, 6);
          }
        }
      }
      break;
    }
    case 'dots': {
      const dotR = spacing * 0.2;
      const safeMargin = margin + dotR;
      for (let y = safeMargin; y <= outerH - safeMargin; y += spacing) {
        for (let x = safeMargin; x <= outerW - safeMargin; x += spacing) {
          addCylinder(triangles, x, y, thickness - depthVal, thickness + 0.01, dotR, 16);
        }
      }
      break;
    }
    case 'grid': {
      const lineW = 1.0;
      const safeMargin = margin + lineW;
      for (let x = safeMargin; x <= outerW - safeMargin; x += spacing) {
        addBox(triangles, x - lineW/2, safeMargin, thickness - depthVal, lineW, outerH - safeMargin * 2, depthVal + 0.01);
      }
      for (let y = safeMargin; y <= outerH - safeMargin; y += spacing) {
        addBox(triangles, safeMargin, y - lineW/2, thickness - depthVal, outerW - safeMargin * 2, lineW, depthVal + 0.01);
      }
      break;
    }
    case 'diamonds': {
      const diamondSize = spacing * 0.35;
      const safeMargin = margin + diamondSize;
      const colsNeeded = Math.floor((outerW - safeMargin * 2) / spacing);
      const rowsNeeded = Math.floor((outerH - safeMargin * 2) / spacing);
      for (let row = 0; row <= rowsNeeded; row++) {
        const offsetX = (row % 2) * spacing * 0.5;
        for (let col = 0; col <= colsNeeded; col++) {
          const cx = safeMargin + col * spacing + offsetX;
          const cy = safeMargin + row * spacing;
          if (cx >= safeMargin && cx <= outerW - safeMargin && cy >= safeMargin && cy <= outerH - safeMargin) {
            addCylinder(triangles, cx, cy, thickness - depthVal, thickness + 0.01, diamondSize, 4);
          }
        }
      }
      break;
    }
    case 'lines': {
      const lineW = 1.2;
      const safeMargin = margin + lineW;
      for (let y = safeMargin; y <= outerH - safeMargin; y += spacing) {
        addBox(triangles, safeMargin, y - lineW/2, thickness - depthVal, outerW - safeMargin * 2, lineW, depthVal + 0.01);
      }
      break;
    }
    case 'voronoi': {
      const cellR = spacing * 0.35;
      const safeMargin = margin + cellR + 2;
      const colsNeeded = Math.floor((outerW - safeMargin * 2) / spacing);
      const rowsNeeded = Math.floor((outerH - safeMargin * 2) / (spacing * 0.866));
      for (let row = 0; row <= rowsNeeded; row++) {
        const offsetX = (row % 2) * spacing * 0.5;
        for (let col = 0; col <= colsNeeded; col++) {
          const jitterX = Math.sin(row * col * 0.5) * 1.5;
          const jitterY = Math.cos(row * col * 0.5) * 1.5;
          const cx = safeMargin + col * spacing + offsetX + jitterX;
          const cy = safeMargin + row * spacing * 0.866 + jitterY;
          if (cx >= safeMargin && cx <= outerW - safeMargin && cy >= safeMargin && cy <= outerH - safeMargin) {
            addCylinder(triangles, cx, cy, thickness - depthVal, thickness + 0.01, cellR, 7);
          }
        }
      }
      break;
    }
  }
}

export function generateDiffuserSTL(settings: LEDGridSettings): Buffer {
  const triangles: Triangle[] = [];
  
  const gridW = settings.gridWidth;
  const gridH = settings.gridHeight;
  const spacing = settings.ledSpacing;
  const wall = settings.wallThickness;
  const thickness = settings.diffuserThickness;
  
  const innerW = gridW * spacing;
  const innerH = gridH * spacing;
  const outerW = innerW + wall * 2;
  const outerH = innerH + wall * 2;
  
  addBox(triangles, 0, 0, 0, outerW, outerH, thickness);
  
  if (settings.includeMountingHoles) {
    const holeR = settings.mountingHoleDiameter / 2;
    const margin = wall + 5;
    const positions = [
      [margin, margin],
      [outerW - margin, margin],
      [margin, outerH - margin],
      [outerW - margin, outerH - margin],
    ];
    for (const [hx, hy] of positions) {
      subtractCylinder(triangles, hx, hy, 0, thickness, holeR, 12);
    }
  }
  
  addDiffusionPattern(triangles, outerW, outerH, thickness, settings);
  
  return createBinarySTL(triangles);
}

function addLEDClip(triangles: Triangle[], cx: number, cy: number, z: number,
                    ledDiameter: number, clipHeight: number, wallThickness: number): void {
  const innerR = ledDiameter / 2 + 0.2;
  const outerR = innerR + wallThickness;
  const gapAngle = Math.PI * 0.4;
  const segments = 20;
  
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * (Math.PI * 2 - gapAngle) + gapAngle / 2 + Math.PI / 2;
    const a2 = ((i + 1) / segments) * (Math.PI * 2 - gapAngle) + gapAngle / 2 + Math.PI / 2;
    
    const ix1 = cx + Math.cos(a1) * innerR;
    const iy1 = cy + Math.sin(a1) * innerR;
    const ox1 = cx + Math.cos(a1) * outerR;
    const oy1 = cy + Math.sin(a1) * outerR;
    const ix2 = cx + Math.cos(a2) * innerR;
    const iy2 = cy + Math.sin(a2) * innerR;
    const ox2 = cx + Math.cos(a2) * outerR;
    const oy2 = cy + Math.sin(a2) * outerR;
    
    const z1 = z;
    const z2 = z + clipHeight;
    
    triangles.push([[ix1, iy1, z1], [ix2, iy2, z1], [ox2, oy2, z1]]);
    triangles.push([[ix1, iy1, z1], [ox2, oy2, z1], [ox1, oy1, z1]]);
    
    triangles.push([[ix1, iy1, z2], [ox2, oy2, z2], [ix2, iy2, z2]]);
    triangles.push([[ix1, iy1, z2], [ox1, oy1, z2], [ox2, oy2, z2]]);
    
    triangles.push([[ox1, oy1, z1], [ox2, oy2, z1], [ox2, oy2, z2]]);
    triangles.push([[ox1, oy1, z1], [ox2, oy2, z2], [ox1, oy1, z2]]);
    
    triangles.push([[ix1, iy1, z1], [ix1, iy1, z2], [ix2, iy2, z2]]);
    triangles.push([[ix1, iy1, z1], [ix2, iy2, z2], [ix2, iy2, z1]]);
  }
  
  const startAngle = gapAngle / 2 + Math.PI / 2;
  const endAngle = (Math.PI * 2 - gapAngle) + gapAngle / 2 + Math.PI / 2;
  
  for (const angle of [startAngle, endAngle]) {
    const ix = cx + Math.cos(angle) * innerR;
    const iy = cy + Math.sin(angle) * innerR;
    const ox = cx + Math.cos(angle) * outerR;
    const oy = cy + Math.sin(angle) * outerR;
    
    const nx = Math.cos(angle + (angle === startAngle ? -Math.PI/2 : Math.PI/2));
    const ny = Math.sin(angle + (angle === startAngle ? -Math.PI/2 : Math.PI/2));
    
    if (angle === startAngle) {
      triangles.push([[ix, iy, z], [ox, oy, z], [ox, oy, z + clipHeight]]);
      triangles.push([[ix, iy, z], [ox, oy, z + clipHeight], [ix, iy, z + clipHeight]]);
    } else {
      triangles.push([[ix, iy, z], [ox, oy, z + clipHeight], [ox, oy, z]]);
      triangles.push([[ix, iy, z], [ix, iy, z + clipHeight], [ox, oy, z + clipHeight]]);
    }
  }
}

export function generateGridMountSTL(settings: LEDGridSettings): Buffer {
  const triangles: Triangle[] = [];
  
  const gridW = settings.gridWidth;
  const gridH = settings.gridHeight;
  const spacing = settings.ledSpacing;
  const wall = settings.wallThickness;
  
  const innerW = gridW * spacing;
  const innerH = gridH * spacing;
  const outerW = innerW + wall * 2;
  const outerH = innerH + wall * 2;
  
  addBox(triangles, 0, 0, 0, outerW, outerH, 2);
  
  const ledDiameter = settings.ledDiameter || 5;
  const clipHeight = settings.clipHeight || 6;
  const clipWall = settings.clipWallThickness || 1.2;
  
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cx = wall + col * spacing + spacing / 2;
      const cy = wall + row * spacing + spacing / 2;
      addLEDClip(triangles, cx, cy, 2, ledDiameter, clipHeight, clipWall);
    }
  }
  
  return createBinarySTL(triangles);
}

export function getLEDIndex(col: number, row: number, gridWidth: number, 
                           gridHeight: number, wiringPattern: string): number {
  if (wiringPattern === "serpentine") {
    if (row % 2 === 0) {
      return row * gridWidth + col;
    } else {
      return row * gridWidth + (gridWidth - 1 - col);
    }
  } else if (wiringPattern === "zigzag") {
    if (col % 2 === 0) {
      return col * gridHeight + row;
    } else {
      return col * gridHeight + (gridHeight - 1 - row);
    }
  } else {
    return row * gridWidth + col;
  }
}

export function textToPixels(text: string, gridWidth: number, gridHeight: number): boolean[][] {
  const grid: boolean[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false));
  
  let xOffset = 1;
  const upperText = text.toUpperCase();
  
  for (const char of upperText) {
    const charData = LED_FONT_5x7[char];
    if (!charData) continue;
    
    for (let col = 0; col < charData.length; col++) {
      const columnBits = charData[col];
      for (let bit = 0; bit < 7; bit++) {
        if ((columnBits >> bit) & 1) {
          const px = xOffset + col;
          const py = bit;
          if (px >= 0 && px < gridWidth && py >= 0 && py < gridHeight) {
            grid[py][px] = true;
          }
        }
      }
    }
    xOffset += charData.length + 1;
  }
  
  return grid;
}

export function generateWiringDiagram(settings: LEDGridSettings): string {
  const { gridWidth, gridHeight, wiringPattern } = settings;
  let diagram = `// LED Grid Wiring Diagram - ${gridWidth}x${gridHeight} (${wiringPattern})\n`;
  diagram += `// Total LEDs: ${gridWidth * gridHeight}\n\n`;
  
  const indexGrid: number[][] = [];
  for (let row = 0; row < gridHeight; row++) {
    const rowIndices: number[] = [];
    for (let col = 0; col < gridWidth; col++) {
      rowIndices.push(getLEDIndex(col, row, gridWidth, gridHeight, wiringPattern));
    }
    indexGrid.push(rowIndices);
  }
  
  diagram += "LED Index Map:\n";
  for (let row = 0; row < gridHeight; row++) {
    diagram += indexGrid[row].map(i => i.toString().padStart(3)).join(" ") + "\n";
  }
  
  diagram += `\n// Data pin connection: LED[0] is at position (${wiringPattern === "serpentine" ? "0,0" : "0,0"})\n`;
  diagram += `// Wire direction: ${wiringPattern === "serpentine" ? "Rows alternate direction" : "Columns"}\n`;
  
  return diagram;
}

export type AnimationMode = 
  | "rainbow" 
  | "confetti" 
  | "sinelon" 
  | "juggle" 
  | "bpm" 
  | "chase" 
  | "breathe"
  | "sparkle"
  | "cylon"
  | "random";

export function generateArduinoCode(
  settings: LEDGridSettings, 
  pixelGrid?: boolean[][],
  animationMode: AnimationMode = "rainbow",
  includeEncoder: boolean = false,
  primaryColor: string = "White",
  secondaryColor: string = "Blue"
): string {
  const { gridWidth, gridHeight, wiringPattern } = settings;
  const numLeds = gridWidth * gridHeight;
  
  let code = `// SignCraft 3D - LED Grid Sign Controller
// Animation: ${animationMode.toUpperCase()}
// Grid: ${gridWidth}x${gridHeight} (${numLeds} LEDs)
// Generated by SignCraft 3D

#include <FastLED.h>
${includeEncoder ? '#include <Encoder.h>\n' : ''}
FASTLED_USING_NAMESPACE

#define LED_PIN     6
#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB
#define NUM_LEDS    ${numLeds}
#define GRID_WIDTH  ${gridWidth}
#define GRID_HEIGHT ${gridHeight}
#define BRIGHTNESS  255
#define FRAMES_PER_SECOND 60

CRGB leds[NUM_LEDS];
uint8_t gHue = 0;
${includeEncoder ? `
// Encoder pins (optional hardware)
#define ENC_PIN_A   8
#define ENC_PIN_B   9
#define ENC_SWITCH  10
Encoder Enc(ENC_PIN_A, ENC_PIN_B);
long encPosition = 0;
uint8_t brightness = BRIGHTNESS;
bool signOn = true;
` : ''}
`;

  // Add pixel mask if text pattern exists
  if (pixelGrid) {
    code += `// Pixel mask for text pattern\n`;
    code += `const bool pixelMask[GRID_HEIGHT][GRID_WIDTH] = {\n`;
    for (let y = 0; y < gridHeight; y++) {
      code += `  {`;
      for (let x = 0; x < gridWidth; x++) {
        const val = (y < pixelGrid.length && x < pixelGrid[y].length && pixelGrid[y][x]) ? '1' : '0';
        code += val + (x < gridWidth - 1 ? ',' : '');
      }
      code += `}${y < gridHeight - 1 ? ',' : ''}\n`;
    }
    code += `};\n\n`;
  }

  // LED index function
  code += `// Convert (x, y) coordinates to LED index for ${wiringPattern} wiring
int getLEDIndex(int x, int y) {
`;

  if (wiringPattern === "serpentine") {
    code += `  if (y % 2 == 0) {
    return y * GRID_WIDTH + x;
  } else {
    return y * GRID_WIDTH + (GRID_WIDTH - 1 - x);
  }
`;
  } else if (wiringPattern === "zigzag") {
    code += `  if (x % 2 == 0) {
    return x * GRID_HEIGHT + y;
  } else {
    return x * GRID_HEIGHT + (GRID_HEIGHT - 1 - y);
  }
`;
  } else {
    code += `  return y * GRID_WIDTH + x;
`;
  }

  code += `}

void setPixel(int x, int y, CRGB color) {
  if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
    leds[getLEDIndex(x, y)] = color;
  }
}

void clearGrid() {
  fill_solid(leds, NUM_LEDS, CRGB::Black);
}
`;

  // Add animation functions
  code += `
// ==================== ANIMATION FUNCTIONS ====================

void rainbow() {
  fill_rainbow(leds, NUM_LEDS, gHue, 7);
${pixelGrid ? '  applyMask();' : ''}
}

void rainbowWithGlitter() {
  rainbow();
  if (random8() < 80) {
    leds[random16(NUM_LEDS)] += CRGB::White;
  }
}

void confetti() {
  fadeToBlackBy(leds, NUM_LEDS, 10);
  int pos = random16(NUM_LEDS);
  leds[pos] += CHSV(gHue + random8(64), 200, 255);
${pixelGrid ? '  applyMask();' : ''}
}

void sinelon() {
  fadeToBlackBy(leds, NUM_LEDS, 20);
  int pos = beatsin16(13, 0, NUM_LEDS - 1);
  leds[pos] += CHSV(gHue, 255, 192);
${pixelGrid ? '  applyMask();' : ''}
}

void bpm() {
  uint8_t BeatsPerMinute = 62;
  CRGBPalette16 palette = PartyColors_p;
  uint8_t beat = beatsin8(BeatsPerMinute, 64, 255);
  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = ColorFromPalette(palette, gHue + (i * 2), beat - gHue + (i * 10));
  }
${pixelGrid ? '  applyMask();' : ''}
}

void juggle() {
  fadeToBlackBy(leds, NUM_LEDS, 20);
  byte dothue = 0;
  for (int i = 0; i < 8; i++) {
    leds[beatsin16(i + 7, 0, NUM_LEDS - 1)] |= CHSV(dothue, 200, 255);
    dothue += 32;
  }
${pixelGrid ? '  applyMask();' : ''}
}

void chase() {
  static int pos = 0;
  fadeToBlackBy(leds, NUM_LEDS, 50);
  leds[pos] = CRGB::${primaryColor};
  leds[(pos + NUM_LEDS / 4) % NUM_LEDS] = CRGB::${secondaryColor};
  pos = (pos + 1) % NUM_LEDS;
${pixelGrid ? '  applyMask();' : ''}
}

void breathe() {
  uint8_t breath = beatsin8(12, 30, 255);
  fill_solid(leds, NUM_LEDS, CRGB::${primaryColor});
  FastLED.setBrightness(breath);
${pixelGrid ? '  applyMask();' : ''}
}

void sparkle() {
  fadeToBlackBy(leds, NUM_LEDS, 100);
  int pos = random16(NUM_LEDS);
  leds[pos] = CRGB::${primaryColor};
${pixelGrid ? '  applyMask();' : ''}
}

void cylon() {
  static int pos = 0;
  static int dir = 1;
  fadeToBlackBy(leds, NUM_LEDS, 20);
  leds[pos] = CRGB::${primaryColor};
  pos += dir;
  if (pos == NUM_LEDS - 1 || pos == 0) dir = -dir;
${pixelGrid ? '  applyMask();' : ''}
}

void randomColors() {
  for (int i = 0; i < NUM_LEDS; i++) {
    if (random8() < 30) {
      leds[i] = CHSV(random8(), 255, 255);
    }
  }
  fadeToBlackBy(leds, NUM_LEDS, 10);
${pixelGrid ? '  applyMask();' : ''}
}
`;

  // Add mask function if text pattern exists
  if (pixelGrid) {
    code += `
void applyMask() {
  for (int y = 0; y < GRID_HEIGHT; y++) {
    for (int x = 0; x < GRID_WIDTH; x++) {
      if (!pixelMask[y][x]) {
        leds[getLEDIndex(x, y)] = CRGB::Black;
      }
    }
  }
}
`;
  }

  // Add encoder functions if enabled
  if (includeEncoder) {
    code += `
// ==================== ENCODER FUNCTIONS ====================

void checkEncoder() {
  long newPos = Enc.read() / 4;
  if (newPos != encPosition) {
    brightness = constrain(brightness + (newPos - encPosition) * 5, 10, 255);
    FastLED.setBrightness(brightness);
    encPosition = newPos;
  }
}

void checkButton() {
  static unsigned long lastPress = 0;
  if (digitalRead(ENC_SWITCH) == LOW && millis() - lastPress > 200) {
    signOn = !signOn;
    lastPress = millis();
  }
}
`;
  }

  // Setup function
  code += `
// ==================== SETUP ====================

void setup() {
  delay(1000);
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(BRIGHTNESS);
${includeEncoder ? '  pinMode(ENC_SWITCH, INPUT_PULLUP);\n' : ''}
  clearGrid();
  FastLED.show();
}

// ==================== MAIN LOOP ====================

`;

  // Generate loop based on animation mode
  const animFuncMap: Record<AnimationMode, string> = {
    rainbow: "rainbow",
    confetti: "confetti",
    sinelon: "sinelon",
    juggle: "juggle",
    bpm: "bpm",
    chase: "chase",
    breathe: "breathe",
    sparkle: "sparkle",
    cylon: "cylon",
    random: "randomColors"
  };

  code += `void loop() {
${includeEncoder ? '  if (!signOn) { clearGrid(); FastLED.show(); return; }\n  checkEncoder();\n  checkButton();\n' : ''}
  ${animFuncMap[animationMode]}();
  FastLED.show();
  FastLED.delay(1000 / FRAMES_PER_SECOND);
  EVERY_N_MILLISECONDS(20) { gHue++; }
}
`;

  return code;
}

export interface LEDGridExportOptions {
  animationMode?: AnimationMode;
  includeEncoder?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export function generateLEDGridExport(
  settings: LEDGridSettings,
  options: LEDGridExportOptions = {}
): {
  housing: Buffer;
  diffuser: Buffer;
  gridMount: Buffer;
  wiringDiagram: string;
  arduinoCode: string;
} {
  const pixelGrid = settings.textContent 
    ? textToPixels(settings.textContent, settings.gridWidth, settings.gridHeight) 
    : undefined;

  const {
    animationMode = "rainbow",
    includeEncoder = false,
    primaryColor = "White",
    secondaryColor = "Blue"
  } = options;
    
  return {
    housing: generateHousingSTL(settings),
    diffuser: generateDiffuserSTL(settings),
    gridMount: generateGridMountSTL(settings),
    wiringDiagram: generateWiringDiagram(settings),
    arduinoCode: generateArduinoCode(settings, pixelGrid, animationMode, includeEncoder, primaryColor, secondaryColor),
  };
}
