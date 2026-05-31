import { FilamentShapeSettings } from "@shared/schema";

interface Triangle {
  vertices: [number, number, number][];
  normal: [number, number, number];
}

interface Point2D {
  x: number;
  y: number;
}

function calculateNormal(v1: number[], v2: number[], v3: number[]): [number, number, number] {
  const ux = v2[0] - v1[0], uy = v2[1] - v1[1], uz = v2[2] - v1[2];
  const vx = v3[0] - v1[0], vy = v3[1] - v1[1], vz = v3[2] - v1[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return len > 0 ? [nx / len, ny / len, nz / len] : [0, 0, 1];
}

function trianglesToSTL(triangles: Triangle[], label: string): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  
  buffer.write(`Filament Shape ${label} - SignCraft3D`, 0);
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal[0], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[1], offset); offset += 4;
    buffer.writeFloatLE(tri.normal[2], offset); offset += 4;
    for (const vertex of tri.vertices) {
      buffer.writeFloatLE(vertex[0], offset); offset += 4;
      buffer.writeFloatLE(vertex[1], offset); offset += 4;
      buffer.writeFloatLE(vertex[2], offset); offset += 4;
    }
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  return buffer;
}

function generateShapePathFromCustomData(
  customPathData: { x: number; y: number }[][],
  width: number,
  height: number
): Point2D[] {
  // Custom path data contains normalized points (0-1 range), scale to actual dimensions
  // Use only the first/longest segment to avoid stitching disconnected paths
  if (!customPathData || customPathData.length === 0) {
    return [{ x: 0, y: 0 }];
  }
  
  // Sort by segment length and use the longest one
  const sortedSegments = [...customPathData].sort((a, b) => b.length - a.length);
  const primarySegment = sortedSegments[0];
  
  if (!primarySegment || primarySegment.length < 2) {
    return [{ x: 0, y: 0 }];
  }
  
  const points: Point2D[] = [];
  for (const point of primarySegment) {
    // Convert from normalized 0-1 to centered coordinates
    const x = (point.x - 0.5) * width;
    const y = (0.5 - point.y) * height; // Flip Y axis
    points.push({ x, y });
  }
  
  return points;
}

function generateShapePath(shapeType: string, width: number, height: number, segments: number = 64): Point2D[] {
  const points: Point2D[] = [];
  const hw = width / 2;
  const hh = height / 2;
  
  switch (shapeType) {
    case "heart": {
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        points.push({ x: (x / 16) * hw, y: (y / 17) * hh });
      }
      break;
    }
    case "star": {
      const outerRadius = Math.min(hw, hh);
      const innerRadius = outerRadius * 0.4;
      const starPoints = 5;
      for (let i = 0; i <= starPoints * 2; i++) {
        const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      points.push(points[0]); // Close the path
      break;
    }
    case "circle": {
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      break;
    }
    case "infinity": {
      const a = hw * 0.8;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const x = (a * Math.cos(t)) / denom;
        const y = (a * Math.sin(t) * Math.cos(t)) / denom;
        points.push({ x, y: y * (hh / hw) });
      }
      break;
    }
    case "moon": {
      const outerR = Math.min(hw, hh);
      const innerR = outerR * 0.65;
      const offset = outerR * 0.35;
      // Outer arc
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI - Math.PI / 2;
        points.push({ x: Math.cos(angle) * outerR, y: Math.sin(angle) * outerR });
      }
      // Inner arc (reversed, offset)
      for (let i = segments / 2; i >= 0; i--) {
        const angle = (i / (segments / 2)) * Math.PI - Math.PI / 2;
        points.push({ x: Math.cos(angle) * innerR + offset, y: Math.sin(angle) * innerR });
      }
      break;
    }
    case "wave": {
      const amplitude = hh * 0.5;
      const waves = 2;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = -hw + t * width;
        const y = Math.sin(t * Math.PI * 2 * waves) * amplitude;
        points.push({ x, y });
      }
      break;
    }
    case "spiral": {
      const maxRadius = Math.min(hw, hh);
      const turns = 2;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2 * turns;
        const radius = t * maxRadius;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      break;
    }
    case "lightning": {
      const pts = [
        { x: 0, y: hh },
        { x: -hw * 0.2, y: hh * 0.3 },
        { x: hw * 0.15, y: hh * 0.35 },
        { x: -hw * 0.1, y: -hh * 0.2 },
        { x: hw * 0.2, y: -hh * 0.15 },
        { x: 0, y: -hh }
      ];
      points.push(...pts);
      break;
    }
    case "arrow": {
      const pts = [
        { x: 0, y: hh },
        { x: hw * 0.5, y: hh * 0.4 },
        { x: hw * 0.2, y: hh * 0.4 },
        { x: hw * 0.2, y: -hh },
        { x: -hw * 0.2, y: -hh },
        { x: -hw * 0.2, y: hh * 0.4 },
        { x: -hw * 0.5, y: hh * 0.4 },
        { x: 0, y: hh }
      ];
      points.push(...pts);
      break;
    }
    case "triangle": {
      points.push({ x: 0, y: hh });
      points.push({ x: hw, y: -hh });
      points.push({ x: -hw, y: -hh });
      points.push({ x: 0, y: hh });
      break;
    }
    case "square": {
      points.push({ x: -hw, y: hh });
      points.push({ x: hw, y: hh });
      points.push({ x: hw, y: -hh });
      points.push({ x: -hw, y: -hh });
      points.push({ x: -hw, y: hh });
      break;
    }
    case "diamond": {
      points.push({ x: 0, y: hh });
      points.push({ x: hw, y: 0 });
      points.push({ x: 0, y: -hh });
      points.push({ x: -hw, y: 0 });
      points.push({ x: 0, y: hh });
      break;
    }
    case "pineapple": {
      // Pineapple shape: oval body with crown on top
      // Body (oval lower portion)
      for (let i = 0; i <= segments * 0.6; i++) {
        const t = (i / (segments * 0.6)) * Math.PI;
        const x = Math.sin(t) * hw * 0.7;
        const y = -Math.cos(t) * hh * 0.6 - hh * 0.1;
        points.push({ x, y });
      }
      // Crown leaves (zigzag top)
      const crownBase = hh * 0.5;
      const crownTop = hh;
      const leafWidth = hw * 0.15;
      const numLeaves = 5;
      for (let i = 0; i <= numLeaves; i++) {
        const t = i / numLeaves;
        const x = -hw * 0.5 + t * hw;
        const isUp = i % 2 === 0;
        const y = isUp ? crownTop : crownBase + (crownTop - crownBase) * 0.3;
        points.push({ x, y });
      }
      // Close back to start
      points.push(points[0]);
      break;
    }
    case "cactus": {
      // Saguaro cactus with two arms
      const stemW = hw * 0.3;
      const armW = hw * 0.2;
      const pts = [
        // Main stem base
        { x: -stemW, y: -hh },
        { x: -stemW, y: hh * 0.3 },
        // Left arm
        { x: -hw * 0.8, y: hh * 0.3 },
        { x: -hw * 0.8, y: hh * 0.6 },
        { x: -hw * 0.5, y: hh * 0.6 },
        { x: -hw * 0.5, y: hh * 0.3 },
        { x: -stemW, y: hh * 0.3 },
        // Stem top
        { x: -stemW, y: hh },
        { x: stemW, y: hh },
        // Right arm
        { x: stemW, y: hh * 0.1 },
        { x: hw * 0.5, y: hh * 0.1 },
        { x: hw * 0.5, y: hh * 0.5 },
        { x: hw * 0.8, y: hh * 0.5 },
        { x: hw * 0.8, y: hh * 0.1 },
        { x: stemW, y: hh * 0.1 },
        // Close stem
        { x: stemW, y: -hh },
        { x: -stemW, y: -hh },
      ];
      points.push(...pts);
      break;
    }
    case "planet": {
      // Planet with ring (like Saturn)
      const planetR = Math.min(hw, hh) * 0.5;
      const ringOuterR = Math.min(hw, hh) * 0.95;
      const ringInnerR = Math.min(hw, hh) * 0.7;
      const ringThickness = hh * 0.08;
      
      // Draw the planet sphere
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * planetR, y: Math.sin(angle) * planetR });
      }
      // Add a gap for the ring
      points.push({ x: planetR * 0.7, y: 0 });
      // Ring outer edge (top half visible)
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const x = ringInnerR + t * (ringOuterR - ringInnerR);
        const y = ringThickness * Math.sin(t * Math.PI);
        points.push({ x, y });
      }
      // Ring outer edge back
      for (let i = segments / 4; i >= 0; i--) {
        const t = i / (segments / 4);
        const x = -(ringInnerR + t * (ringOuterR - ringInnerR));
        const y = ringThickness * Math.sin(t * Math.PI);
        points.push({ x, y });
      }
      break;
    }
    case "alien": {
      // Classic alien head shape - pointed chin, large eyes area
      const headW = hw * 0.8;
      const headH = hh * 0.95;
      // Rounded top
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI + t * Math.PI;
        const x = Math.cos(angle) * headW;
        const y = Math.sin(angle) * headH * 0.6 + headH * 0.3;
        points.push({ x, y });
      }
      // Pointed chin
      points.push({ x: 0, y: -headH });
      points.push(points[0]);
      break;
    }
    case "brain": {
      // Brain shape with wavy lobes
      const brainW = hw * 0.85;
      const brainH = hh * 0.8;
      // Left lobe with bulges
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI * 0.5 + t * Math.PI;
        const wobble = Math.sin(t * Math.PI * 4) * 0.15;
        const x = Math.cos(angle) * brainW * (1 + wobble);
        const y = Math.sin(angle) * brainH * (1 + wobble);
        points.push({ x, y });
      }
      // Right lobe with bulges
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI * 1.5 + t * Math.PI;
        const wobble = Math.sin(t * Math.PI * 4) * 0.15;
        const x = Math.cos(angle) * brainW * (1 + wobble);
        const y = Math.sin(angle) * brainH * (1 + wobble);
        points.push({ x, y });
      }
      break;
    }
    case "retro_phone": {
      // 80s brick phone with antenna
      const bodyW = hw * 0.5;
      const bodyH = hh * 0.85;
      const antennaH = hh * 0.15;
      const pts = [
        // Antenna
        { x: -bodyW * 0.2, y: bodyH + antennaH },
        { x: bodyW * 0.1, y: bodyH + antennaH },
        { x: bodyW * 0.1, y: bodyH },
        // Body right
        { x: bodyW, y: bodyH },
        { x: bodyW, y: -bodyH },
        // Body bottom
        { x: -bodyW, y: -bodyH },
        // Body left
        { x: -bodyW, y: bodyH },
        { x: -bodyW * 0.2, y: bodyH },
        { x: -bodyW * 0.2, y: bodyH + antennaH },
      ];
      points.push(...pts);
      break;
    }
    case "clock": {
      // Classic round clock face
      const clockR = Math.min(hw, hh) * 0.9;
      // Outer circle
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * clockR, y: Math.sin(angle) * clockR });
      }
      break;
    }
    case "leaf": {
      // Simple leaf shape with pointed tip
      const leafW = hw * 0.6;
      const leafH = hh * 0.95;
      // Right side curve
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = -Math.PI / 2 + t * Math.PI;
        const x = Math.sin(angle * 0.8) * leafW * Math.sin(t * Math.PI);
        const y = -leafH + t * leafH * 2;
        points.push({ x, y });
      }
      // Left side curve (mirror)
      for (let i = segments / 2; i >= 0; i--) {
        const t = i / (segments / 2);
        const angle = -Math.PI / 2 + t * Math.PI;
        const x = -Math.sin(angle * 0.8) * leafW * Math.sin(t * Math.PI);
        const y = -leafH + t * leafH * 2;
        points.push({ x, y });
      }
      break;
    }
    case "music_note": {
      // Eighth note / quaver shape
      const noteR = hw * 0.35;
      const stemH = hh * 0.7;
      const flagW = hw * 0.4;
      // Note head (circle at bottom)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * noteR, y: Math.sin(angle) * noteR - hh + noteR });
      }
      // Stem going up
      points.push({ x: noteR, y: -hh + noteR * 2 });
      points.push({ x: noteR, y: hh });
      // Flag
      points.push({ x: noteR + flagW, y: hh * 0.5 });
      points.push({ x: noteR, y: hh * 0.3 });
      break;
    }
    case "t_rex": {
      // Cute T-Rex dinosaur silhouette
      const pts = [
        // Head top
        { x: hw * 0.3, y: hh },
        { x: hw * 0.6, y: hh * 0.8 },
        // Mouth
        { x: hw * 0.8, y: hh * 0.7 },
        { x: hw * 0.6, y: hh * 0.5 },
        // Neck
        { x: hw * 0.3, y: hh * 0.4 },
        // Tiny arm
        { x: hw * 0.4, y: hh * 0.2 },
        { x: hw * 0.5, y: hh * 0.1 },
        { x: hw * 0.4, y: 0 },
        // Body
        { x: hw * 0.3, y: -hh * 0.2 },
        // Leg
        { x: hw * 0.4, y: -hh * 0.6 },
        { x: hw * 0.2, y: -hh },
        { x: 0, y: -hh },
        { x: hw * 0.1, y: -hh * 0.5 },
        // Back leg
        { x: -hw * 0.2, y: -hh * 0.5 },
        { x: -hw * 0.4, y: -hh },
        { x: -hw * 0.6, y: -hh },
        { x: -hw * 0.5, y: -hh * 0.4 },
        // Tail
        { x: -hw * 0.6, y: -hh * 0.2 },
        { x: -hw * 0.9, y: 0 },
        { x: -hw * 0.7, y: hh * 0.2 },
        // Back to head
        { x: -hw * 0.2, y: hh * 0.3 },
        { x: 0, y: hh * 0.6 },
        { x: hw * 0.3, y: hh },
      ];
      points.push(...pts);
      break;
    }
    case "stick_figure": {
      // Simple stick figure person
      const headR = hh * 0.15;
      const bodyTop = hh * 0.5;
      const bodyBot = -hh * 0.1;
      const legBot = -hh;
      const armSpan = hw * 0.6;
      // Head circle
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR, y: Math.sin(angle) * headR + hh - headR });
      }
      // Body line
      points.push({ x: 0, y: bodyTop });
      points.push({ x: 0, y: bodyBot });
      // Left leg
      points.push({ x: -hw * 0.3, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Right leg
      points.push({ x: hw * 0.3, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Back to arms
      points.push({ x: 0, y: bodyTop * 0.7 });
      // Left arm
      points.push({ x: -armSpan, y: bodyTop * 0.5 });
      points.push({ x: 0, y: bodyTop * 0.7 });
      // Right arm (waving up)
      points.push({ x: armSpan, y: hh * 0.8 });
      break;
    }
    case "retro_computer": {
      // 80s style computer with CRT monitor
      const monW = hw * 0.85;
      const monH = hh * 0.7;
      const baseW = hw * 0.9;
      const baseH = hh * 0.25;
      const pts = [
        // Monitor top left
        { x: -monW, y: hh },
        // Monitor top right
        { x: monW, y: hh },
        // Monitor right
        { x: monW, y: hh - monH },
        // Base top right
        { x: baseW, y: hh - monH },
        // Base right
        { x: baseW, y: -hh },
        // Base bottom
        { x: -baseW, y: -hh },
        // Base left
        { x: -baseW, y: hh - monH },
        // Monitor bottom left
        { x: -monW, y: hh - monH },
        // Close to start
        { x: -monW, y: hh },
      ];
      points.push(...pts);
      break;
    }
    case "wine_glass": {
      // Wine glass / champagne flute shape
      const bowlW = hw * 0.75;
      const stemW = hw * 0.1;
      const baseW = hw * 0.5;
      // Bowl curve
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI + t * Math.PI;
        const x = Math.cos(angle) * bowlW;
        const y = hh * 0.3 + Math.sin(angle) * hh * 0.5 * 0.8;
        points.push({ x, y });
      }
      // Stem
      points.push({ x: stemW, y: hh * 0.1 });
      points.push({ x: stemW, y: -hh + hh * 0.15 });
      // Base
      points.push({ x: baseW, y: -hh + hh * 0.15 });
      points.push({ x: baseW, y: -hh });
      points.push({ x: -baseW, y: -hh });
      points.push({ x: -baseW, y: -hh + hh * 0.15 });
      points.push({ x: -stemW, y: -hh + hh * 0.15 });
      points.push({ x: -stemW, y: hh * 0.1 });
      break;
    }
    case "pac_man_ghost": {
      // Classic Pac-Man ghost shape
      const ghostW = hw * 0.85;
      const waveAmp = hh * 0.1;
      // Rounded top (dome)
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI + t * Math.PI;
        const x = Math.cos(angle) * ghostW;
        const y = hh * 0.4 + Math.sin(angle) * ghostW * 0.8;
        points.push({ x, y });
      }
      // Right side
      points.push({ x: ghostW, y: -hh + waveAmp * 3 });
      // Wavy bottom (3 waves)
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const x = ghostW - t * ghostW * 2;
        const wave = Math.sin(t * Math.PI * 3) * waveAmp;
        const y = -hh + wave + waveAmp;
        points.push({ x, y });
      }
      points.push({ x: -ghostW, y: -hh + waveAmp * 3 });
      break;
    }
    case "letter_A": {
      const lw = hw * 0.8;
      const lh = hh * 0.9;
      points.push(
        { x: 0, y: lh }, { x: lw, y: -lh }, { x: lw * 0.6, y: -lh },
        { x: lw * 0.4, y: -lh * 0.3 }, { x: -lw * 0.4, y: -lh * 0.3 },
        { x: -lw * 0.6, y: -lh }, { x: -lw, y: -lh }, { x: 0, y: lh }
      );
      break;
    }
    case "letter_B": {
      const lw = hw * 0.7;
      const lh = hh * 0.9;
      points.push({ x: -lw, y: lh });
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const angle = -Math.PI / 2 + t * Math.PI;
        points.push({ x: Math.cos(angle) * lw * 0.6, y: lh * 0.55 + Math.sin(angle) * lh * 0.4 });
      }
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const angle = -Math.PI / 2 + t * Math.PI;
        points.push({ x: Math.cos(angle) * lw * 0.7, y: -lh * 0.45 + Math.sin(angle) * lh * 0.45 });
      }
      points.push({ x: -lw, y: -lh }, { x: -lw, y: lh });
      break;
    }
    case "letter_C": {
      const lw = hw * 0.8;
      const lh = hh * 0.9;
      for (let i = 0; i <= Math.floor(segments * 0.75); i++) {
        const t = i / Math.floor(segments * 0.75);
        const angle = Math.PI * 0.25 + t * Math.PI * 1.5;
        points.push({ x: Math.cos(angle) * lw, y: Math.sin(angle) * lh });
      }
      break;
    }
    case "letter_D": {
      const lw = hw * 0.75;
      const lh = hh * 0.9;
      points.push({ x: -lw, y: lh }, { x: 0, y: lh });
      for (let i = 0; i <= segments / 2; i++) {
        const t = i / (segments / 2);
        const angle = Math.PI / 2 - t * Math.PI;
        points.push({ x: Math.cos(angle) * lw * 0.8 + lw * 0.1, y: Math.sin(angle) * lh });
      }
      points.push({ x: 0, y: -lh }, { x: -lw, y: -lh }, { x: -lw, y: lh });
      break;
    }
    case "letter_E": {
      const lw = hw * 0.7;
      const lh = hh * 0.9;
      points.push(
        { x: lw, y: lh }, { x: -lw, y: lh }, { x: -lw, y: 0 },
        { x: lw * 0.5, y: 0 }, { x: -lw, y: 0 },
        { x: -lw, y: -lh }, { x: lw, y: -lh }
      );
      break;
    }
    case "letter_F": {
      const lw = hw * 0.7;
      const lh = hh * 0.9;
      points.push(
        { x: lw, y: lh }, { x: -lw, y: lh }, { x: -lw, y: 0 },
        { x: lw * 0.4, y: 0 }, { x: -lw, y: 0 }, { x: -lw, y: -lh }
      );
      break;
    }
    case "letter_G": {
      const lw = hw * 0.8;
      const lh = hh * 0.9;
      for (let i = 0; i <= Math.floor(segments * 0.8); i++) {
        const t = i / Math.floor(segments * 0.8);
        const angle = Math.PI * 0.2 + t * Math.PI * 1.6;
        points.push({ x: Math.cos(angle) * lw, y: Math.sin(angle) * lh });
      }
      points.push({ x: lw * 0.5, y: -lh * 0.1 }, { x: 0, y: -lh * 0.1 });
      break;
    }
    case "letter_H": {
      const lw = hw * 0.7;
      const lh = hh * 0.9;
      points.push(
        { x: -lw, y: lh }, { x: -lw, y: 0 }, { x: lw, y: 0 },
        { x: lw, y: lh }, { x: lw, y: -lh }, { x: lw, y: 0 },
        { x: -lw, y: 0 }, { x: -lw, y: -lh }
      );
      break;
    }
    case "flamingo": {
      // Flamingo standing on one leg
      const bodyW = hw * 0.5;
      points.push({ x: hw * 0.3, y: hh });
      points.push({ x: -hw * 0.1, y: hh - hh * 0.1 });
      for (let i = 0; i <= segments / 3; i++) {
        const t = i / (segments / 3);
        const x = Math.sin(t * Math.PI * 1.5) * hw * 0.3;
        const y = hh - hh * 0.15 - t * hh * 0.6;
        points.push({ x, y });
      }
      for (let i = 0; i <= segments / 3; i++) {
        const t = i / (segments / 3);
        const angle = Math.PI * 0.3 + t * Math.PI * 0.8;
        const x = Math.cos(angle) * bodyW - hw * 0.1;
        const y = -hh * 0.1 + Math.sin(angle) * hh * 0.25;
        points.push({ x, y });
      }
      points.push({ x: -hw * 0.1, y: -hh * 0.3 });
      points.push({ x: -hw * 0.05, y: -hh });
      points.push({ x: hw * 0.1, y: -hh });
      break;
    }
    case "palm_tree": {
      const trunkW = hw * 0.15;
      const frondSpread = hw * 0.9;
      points.push({ x: -trunkW, y: -hh });
      points.push({ x: -trunkW * 1.2, y: hh * 0.2 });
      points.push({ x: -frondSpread, y: hh * 0.7 });
      points.push({ x: -frondSpread * 0.5, y: hh * 0.4 });
      points.push({ x: -frondSpread * 0.8, y: hh });
      points.push({ x: 0, y: hh * 0.5 });
      points.push({ x: frondSpread * 0.8, y: hh });
      points.push({ x: frondSpread * 0.5, y: hh * 0.4 });
      points.push({ x: frondSpread, y: hh * 0.7 });
      points.push({ x: trunkW * 1.2, y: hh * 0.2 });
      points.push({ x: trunkW, y: -hh });
      break;
    }
    case "butterfly": {
      const wingW = hw * 0.9;
      const wingH = hh * 0.7;
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI * 0.5 + t * Math.PI * 0.6;
        const x = Math.cos(angle) * wingW - wingW * 0.1;
        const y = Math.sin(angle) * wingH * 0.8 + hh * 0.1;
        points.push({ x, y });
      }
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI * 1.1 + t * Math.PI * 0.5;
        const x = Math.cos(angle) * wingW * 0.8 - wingW * 0.1;
        const y = Math.sin(angle) * wingH * 0.7 - hh * 0.2;
        points.push({ x, y });
      }
      points.push({ x: 0, y: -hh * 0.5 });
      points.push({ x: 0, y: hh * 0.5 });
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = -Math.PI * 0.4 + t * Math.PI * 0.5;
        const x = Math.cos(angle) * wingW * 0.8 + wingW * 0.1;
        const y = Math.sin(angle) * wingH * 0.7 - hh * 0.2;
        points.push({ x, y });
      }
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI * 0.1 + t * Math.PI * 0.6;
        const x = Math.cos(angle) * wingW + wingW * 0.1;
        const y = Math.sin(angle) * wingH * 0.8 + hh * 0.1;
        points.push({ x, y });
      }
      break;
    }
    case "cat": {
      const bodyW = hw * 0.6;
      const headW = hw * 0.5;
      points.push({ x: -hw * 0.5, y: hh });
      points.push({ x: -hw * 0.6, y: hh * 0.65 });
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI + t * Math.PI * 0.5;
        const x = Math.cos(angle) * headW;
        const y = hh * 0.4 + Math.sin(angle) * headW * 0.5;
        points.push({ x, y });
      }
      points.push({ x: -bodyW, y: hh * 0.2 });
      points.push({ x: -bodyW * 1.1, y: -hh * 0.3 });
      points.push({ x: -hw * 0.9, y: -hh * 0.5 });
      points.push({ x: -hw, y: -hh * 0.2 });
      points.push({ x: -hw * 0.8, y: -hh * 0.4 });
      points.push({ x: -bodyW * 0.7, y: -hh });
      points.push({ x: bodyW * 0.7, y: -hh });
      points.push({ x: bodyW * 1.1, y: -hh * 0.3 });
      points.push({ x: bodyW, y: hh * 0.2 });
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = -Math.PI * 0.5 + t * Math.PI * 0.5;
        const x = Math.cos(angle) * headW;
        const y = hh * 0.4 + Math.sin(angle) * headW * 0.5;
        points.push({ x, y });
      }
      points.push({ x: hw * 0.6, y: hh * 0.65 });
      points.push({ x: hw * 0.5, y: hh });
      points.push({ x: 0, y: hh * 0.75 });
      break;
    }
    case "dog": {
      const headW = hw * 0.8;
      const headH = hh * 0.7;
      points.push({ x: -hw * 0.9, y: hh * 0.3 });
      points.push({ x: -hw, y: -hh * 0.2 });
      points.push({ x: -hw * 0.7, y: 0 });
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI + t * Math.PI * 0.5;
        const x = Math.cos(angle) * headW * 0.7;
        const y = hh * 0.3 + Math.sin(angle) * headH * 0.5;
        points.push({ x, y });
      }
      points.push({ x: 0, y: hh });
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI * 0.5 - t * Math.PI * 0.5;
        const x = Math.cos(angle) * headW * 0.7;
        const y = hh * 0.3 + Math.sin(angle) * headH * 0.5;
        points.push({ x, y });
      }
      points.push({ x: hw * 0.7, y: 0 });
      points.push({ x: hw, y: -hh * 0.2 });
      points.push({ x: hw * 0.9, y: hh * 0.3 });
      points.push({ x: hw * 0.4, y: -hh * 0.3 });
      points.push({ x: hw * 0.3, y: -hh });
      points.push({ x: -hw * 0.3, y: -hh });
      points.push({ x: -hw * 0.4, y: -hh * 0.3 });
      break;
    }
    case "right_arrow": {
      // Right-pointing arrow (like reference image)
      const arrowW = hw * 0.9;
      const arrowH = hh * 0.9;
      const shaftH = arrowH * 0.4;
      points.push(
        { x: arrowW, y: 0 },
        { x: arrowW * 0.3, y: arrowH },
        { x: arrowW * 0.3, y: shaftH },
        { x: -arrowW, y: shaftH },
        { x: -arrowW, y: -shaftH },
        { x: arrowW * 0.3, y: -shaftH },
        { x: arrowW * 0.3, y: -arrowH },
        { x: arrowW, y: 0 }
      );
      break;
    }
    case "saturn": {
      // Saturn planet with ring (improved)
      const planetR = Math.min(hw, hh) * 0.4;
      const ringW = hw * 0.95;
      const ringH = hh * 0.2;
      // Planet circle
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * planetR, y: Math.sin(angle) * planetR });
      }
      // Draw ring as ellipse around planet
      points.push({ x: planetR, y: 0 });
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * ringW;
        const y = Math.sin(angle) * ringH;
        points.push({ x, y });
      }
      break;
    }
    case "soda_can": {
      // Soda/beverage can shape
      const canW = hw * 0.5;
      const canH = hh * 0.9;
      const lipH = hh * 0.05;
      // Top lip (rounded)
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = Math.PI + t * Math.PI;
        points.push({ x: Math.cos(angle) * canW * 0.9, y: canH + Math.sin(angle) * lipH });
      }
      // Right side
      points.push({ x: canW, y: canH - lipH });
      points.push({ x: canW, y: -canH + lipH });
      // Bottom lip (rounded)
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = t * Math.PI;
        points.push({ x: Math.cos(angle) * canW * 0.9, y: -canH + Math.sin(angle) * lipH });
      }
      // Left side
      points.push({ x: -canW, y: -canH + lipH });
      points.push({ x: -canW, y: canH - lipH });
      break;
    }
    case "stick_walking": {
      // Stick figure in walking pose
      const headR = hh * 0.12;
      const bodyTop = hh * 0.55;
      const bodyMid = hh * 0.15;
      const bodyBot = -hh * 0.1;
      const legBot = -hh;
      // Head
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR, y: Math.sin(angle) * headR + hh - headR });
      }
      // Neck to body
      points.push({ x: 0, y: bodyTop });
      points.push({ x: 0, y: bodyBot });
      // Left leg (forward)
      points.push({ x: -hw * 0.35, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Right leg (back)
      points.push({ x: hw * 0.25, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Arms position
      points.push({ x: 0, y: bodyMid });
      // Left arm (back)
      points.push({ x: -hw * 0.4, y: bodyMid - hh * 0.15 });
      points.push({ x: 0, y: bodyMid });
      // Right arm (forward)
      points.push({ x: hw * 0.45, y: bodyMid + hh * 0.1 });
      break;
    }
    case "stick_jumping": {
      // Stick figure jumping with arms up (like reference image)
      const headR = hh * 0.12;
      const bodyTop = hh * 0.55;
      const bodyBot = hh * 0.05;
      const legBot = -hh * 0.6;
      // Head
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR, y: Math.sin(angle) * headR + hh - headR });
      }
      // Neck to body
      points.push({ x: 0, y: bodyTop });
      points.push({ x: 0, y: bodyBot });
      // Left leg (spread out)
      points.push({ x: -hw * 0.4, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Right leg (spread out)
      points.push({ x: hw * 0.4, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Arms position
      points.push({ x: 0, y: bodyTop * 0.85 });
      // Left arm (up and out)
      points.push({ x: -hw * 0.5, y: hh * 0.9 });
      points.push({ x: 0, y: bodyTop * 0.85 });
      // Right arm (up and out)
      points.push({ x: hw * 0.5, y: hh * 0.9 });
      break;
    }
    case "stick_waving": {
      // Stick figure waving (like reference image)
      const headR = hh * 0.12;
      const bodyTop = hh * 0.55;
      const bodyBot = -hh * 0.1;
      const legBot = -hh;
      // Head
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR, y: Math.sin(angle) * headR + hh - headR });
      }
      // Neck to body
      points.push({ x: 0, y: bodyTop });
      points.push({ x: 0, y: bodyBot });
      // Left leg
      points.push({ x: -hw * 0.25, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Right leg
      points.push({ x: hw * 0.25, y: legBot });
      points.push({ x: 0, y: bodyBot });
      // Arms position
      points.push({ x: 0, y: bodyTop * 0.75 });
      // Left arm (down)
      points.push({ x: -hw * 0.4, y: bodyTop * 0.3 });
      points.push({ x: 0, y: bodyTop * 0.75 });
      // Right arm (waving up)
      points.push({ x: hw * 0.45, y: hh * 0.85 });
      break;
    }
    case "stick_running": {
      // Stick figure in running pose
      const headR = hh * 0.12;
      const bodyTop = hh * 0.55;
      const bodyBot = -hh * 0.05;
      const legBot = -hh;
      // Head (slightly forward)
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR + hw * 0.1, y: Math.sin(angle) * headR + hh - headR });
      }
      // Neck to body (leaning forward)
      points.push({ x: hw * 0.1, y: bodyTop });
      points.push({ x: -hw * 0.05, y: bodyBot });
      // Back leg (extended behind)
      points.push({ x: -hw * 0.5, y: legBot });
      points.push({ x: -hw * 0.05, y: bodyBot });
      // Front leg (knee bent forward)
      points.push({ x: hw * 0.2, y: -hh * 0.4 });
      points.push({ x: hw * 0.35, y: legBot });
      points.push({ x: hw * 0.2, y: -hh * 0.4 });
      points.push({ x: -hw * 0.05, y: bodyBot });
      // Arms position
      points.push({ x: 0, y: bodyTop * 0.6 });
      // Back arm
      points.push({ x: -hw * 0.45, y: bodyTop * 0.3 });
      points.push({ x: 0, y: bodyTop * 0.6 });
      // Front arm
      points.push({ x: hw * 0.5, y: bodyTop * 0.7 });
      break;
    }
    case "ball": {
      // Simple ball/circle for bouncing animation
      const r = Math.min(hw, hh) * 0.8;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      break;
    }
    case "balloon": {
      // Balloon shape with string
      const balloonW = hw * 0.7;
      const balloonH = hh * 0.75;
      // Balloon body (teardrop-ish)
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2;
        const r = balloonW * (0.9 + 0.1 * Math.sin(angle * 2));
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * balloonH + hh * 0.1;
        points.push({ x, y });
      }
      // Tie point
      points.push({ x: 0, y: -hh * 0.65 });
      // String
      points.push({ x: hw * 0.05, y: -hh * 0.8 });
      points.push({ x: -hw * 0.05, y: -hh * 0.9 });
      points.push({ x: 0, y: -hh });
      break;
    }
    case "cube_outline": {
      // 3D cube outline (isometric-ish)
      const s = Math.min(hw, hh) * 0.5;
      const ox = s * 0.5;
      const oy = s * 0.3;
      // Front face
      points.push({ x: -s, y: -s + oy });
      points.push({ x: s, y: -s + oy });
      points.push({ x: s, y: s + oy });
      points.push({ x: -s, y: s + oy });
      points.push({ x: -s, y: -s + oy });
      // Back face connections
      points.push({ x: -s + ox, y: -s });
      points.push({ x: s + ox, y: -s });
      points.push({ x: s, y: -s + oy });
      points.push({ x: s + ox, y: -s });
      points.push({ x: s + ox, y: s });
      points.push({ x: s, y: s + oy });
      break;
    }
    case "pacman": {
      // Pac-Man with closed mouth
      const r = Math.min(hw, hh) * 0.85;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      break;
    }
    case "pacman_open": {
      // Pac-Man with open mouth
      const r = Math.min(hw, hh) * 0.85;
      const mouthAngle = Math.PI * 0.2;
      points.push({ x: 0, y: 0 });
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = mouthAngle + t * (Math.PI * 2 - mouthAngle * 2);
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      points.push({ x: 0, y: 0 });
      break;
    }
    case "ant": {
      // Simple ant shape for marching animation
      const bodyW = hw * 0.25;
      const headR = hw * 0.2;
      // Head
      for (let i = 0; i <= segments / 3; i++) {
        const t = i / (segments / 3);
        const angle = t * Math.PI * 2;
        points.push({ x: hw * 0.5 + Math.cos(angle) * headR, y: Math.sin(angle) * headR * 0.8 });
      }
      // Antennae
      points.push({ x: hw * 0.7, y: hh * 0.1 });
      points.push({ x: hw * 0.9, y: hh * 0.4 });
      points.push({ x: hw * 0.7, y: hh * 0.1 });
      points.push({ x: hw * 0.7, y: -hh * 0.1 });
      points.push({ x: hw * 0.85, y: -hh * 0.35 });
      points.push({ x: hw * 0.7, y: -hh * 0.1 });
      // Body segments
      points.push({ x: hw * 0.3, y: 0 });
      // Thorax
      for (let i = 0; i <= segments / 4; i++) {
        const t = i / (segments / 4);
        const angle = t * Math.PI * 2;
        points.push({ x: Math.cos(angle) * bodyW, y: Math.sin(angle) * bodyW * 0.7 });
      }
      // Legs (3 pairs simplified)
      points.push({ x: -bodyW, y: 0 });
      points.push({ x: -hw * 0.5, y: hh * 0.5 });
      points.push({ x: -bodyW, y: 0 });
      points.push({ x: -hw * 0.5, y: -hh * 0.5 });
      points.push({ x: -bodyW, y: 0 });
      // Abdomen
      for (let i = 0; i <= segments / 3; i++) {
        const t = i / (segments / 3);
        const angle = t * Math.PI * 2;
        points.push({ x: -hw * 0.5 + Math.cos(angle) * bodyW * 1.3, y: Math.sin(angle) * bodyW });
      }
      break;
    }
    default: // Default to circle
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
  }
  
  return points;
}

function getPathLength(points: Point2D[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function samplePathAtDistance(points: Point2D[], distance: number): { point: Point2D; angle: number } | null {
  let traveled = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    
    if (traveled + segLen >= distance) {
      const t = (distance - traveled) / segLen;
      const x = points[i - 1].x + t * dx;
      const y = points[i - 1].y + t * dy;
      const angle = Math.atan2(dy, dx);
      return { point: { x, y }, angle };
    }
    traveled += segLen;
  }
  
  return null;
}

function generateUChannelClip(
  x: number, y: number, z: number, angle: number,
  clipWidth: number, clipHeight: number, filamentDiameter: number, wallThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const channelWidth = filamentDiameter + 0.5; // Slight clearance
  const channelDepth = filamentDiameter * 0.7;
  const totalWidth = channelWidth + wallThickness * 2;
  const totalHeight = clipHeight;
  
  // Create U-channel profile
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  function transform(lx: number, ly: number, lz: number): [number, number, number] {
    return [x + lx * cos - ly * sin, y + lx * sin + ly * cos, z + lz];
  }
  
  const hw = clipWidth / 2;
  
  // Generate box with U-channel cutout
  // Outer box vertices
  const w2 = totalWidth / 2;
  const h = totalHeight;
  const d2 = hw;
  
  // Bottom face
  const v0 = transform(-w2, -d2, 0);
  const v1 = transform(w2, -d2, 0);
  const v2 = transform(w2, d2, 0);
  const v3 = transform(-w2, d2, 0);
  
  // Top face
  const v4 = transform(-w2, -d2, h);
  const v5 = transform(w2, -d2, h);
  const v6 = transform(w2, d2, h);
  const v7 = transform(-w2, d2, h);
  
  // Channel bottom
  const cw2 = channelWidth / 2;
  const cd = channelDepth;
  const v8 = transform(-cw2, -d2, h - cd);
  const v9 = transform(cw2, -d2, h - cd);
  const v10 = transform(cw2, d2, h - cd);
  const v11 = transform(-cw2, d2, h - cd);
  
  // Bottom face
  triangles.push({ vertices: [v0, v1, v2], normal: calculateNormal(v0, v1, v2) });
  triangles.push({ vertices: [v0, v2, v3], normal: calculateNormal(v0, v2, v3) });
  
  // Front face (with channel)
  triangles.push({ vertices: [v4, v5, v1], normal: calculateNormal(v4, v5, v1) });
  triangles.push({ vertices: [v4, v1, v0], normal: calculateNormal(v4, v1, v0) });
  
  // Back face (with channel)
  triangles.push({ vertices: [v7, v3, v2], normal: calculateNormal(v7, v3, v2) });
  triangles.push({ vertices: [v7, v2, v6], normal: calculateNormal(v7, v2, v6) });
  
  // Left side
  triangles.push({ vertices: [v4, v0, v3], normal: calculateNormal(v4, v0, v3) });
  triangles.push({ vertices: [v4, v3, v7], normal: calculateNormal(v4, v3, v7) });
  
  // Right side
  triangles.push({ vertices: [v5, v6, v2], normal: calculateNormal(v5, v6, v2) });
  triangles.push({ vertices: [v5, v2, v1], normal: calculateNormal(v5, v2, v1) });
  
  // Top with channel
  // Left wing
  const v4l = transform(-w2, -d2, h);
  const v8l = transform(-cw2, -d2, h);
  const v11l = transform(-cw2, d2, h);
  const v7l = transform(-w2, d2, h);
  triangles.push({ vertices: [v4l, v8l, v11l], normal: [0, 0, 1] });
  triangles.push({ vertices: [v4l, v11l, v7l], normal: [0, 0, 1] });
  
  // Right wing
  const v9r = transform(cw2, -d2, h);
  const v5r = transform(w2, -d2, h);
  const v6r = transform(w2, d2, h);
  const v10r = transform(cw2, d2, h);
  triangles.push({ vertices: [v9r, v5r, v6r], normal: [0, 0, 1] });
  triangles.push({ vertices: [v9r, v6r, v10r], normal: [0, 0, 1] });
  
  // Channel bottom
  triangles.push({ vertices: [v8, v9, v10], normal: [0, 0, -1] });
  triangles.push({ vertices: [v8, v10, v11], normal: [0, 0, -1] });
  
  // Channel walls
  // Left wall
  triangles.push({ vertices: [v8l, v8, v11], normal: calculateNormal(v8l, v8, v11) });
  triangles.push({ vertices: [v8l, v11, v11l], normal: calculateNormal(v8l, v11, v11l) });
  
  // Right wall
  triangles.push({ vertices: [v9, v9r, v10r], normal: calculateNormal(v9, v9r, v10r) });
  triangles.push({ vertices: [v9, v10r, v10], normal: calculateNormal(v9, v10r, v10) });
  
  return triangles;
}

function generatePinchClip(
  x: number, y: number, z: number, angle: number,
  clipWidth: number, clipHeight: number, filamentDiameter: number, wallThickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 16;
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  function transform(lx: number, ly: number, lz: number): [number, number, number] {
    return [x + lx * cos - ly * sin, y + lx * sin + ly * cos, z + lz];
  }
  
  // C-shaped clip with pinch opening at top
  const outerR = filamentDiameter / 2 + wallThickness;
  const innerR = filamentDiameter / 2 + 0.2; // Slight clearance
  const hw = clipWidth / 2;
  const openingAngle = Math.PI * 0.25; // Opening at top
  
  // Generate C-shaped profile
  for (let i = 0; i < segments; i++) {
    const a1 = openingAngle + (i / segments) * (Math.PI * 2 - openingAngle * 2);
    const a2 = openingAngle + ((i + 1) / segments) * (Math.PI * 2 - openingAngle * 2);
    
    // Outer surface
    const o1f = transform(Math.cos(a1) * outerR, -hw, Math.sin(a1) * outerR + outerR);
    const o2f = transform(Math.cos(a2) * outerR, -hw, Math.sin(a2) * outerR + outerR);
    const o1b = transform(Math.cos(a1) * outerR, hw, Math.sin(a1) * outerR + outerR);
    const o2b = transform(Math.cos(a2) * outerR, hw, Math.sin(a2) * outerR + outerR);
    
    triangles.push({ vertices: [o1f, o2f, o2b], normal: calculateNormal(o1f, o2f, o2b) });
    triangles.push({ vertices: [o1f, o2b, o1b], normal: calculateNormal(o1f, o2b, o1b) });
    
    // Inner surface
    const i1f = transform(Math.cos(a1) * innerR, -hw, Math.sin(a1) * innerR + outerR);
    const i2f = transform(Math.cos(a2) * innerR, -hw, Math.sin(a2) * innerR + outerR);
    const i1b = transform(Math.cos(a1) * innerR, hw, Math.sin(a1) * innerR + outerR);
    const i2b = transform(Math.cos(a2) * innerR, hw, Math.sin(a2) * innerR + outerR);
    
    triangles.push({ vertices: [i1f, i2b, i2f], normal: calculateNormal(i1f, i2b, i2f) });
    triangles.push({ vertices: [i1f, i1b, i2b], normal: calculateNormal(i1f, i1b, i2b) });
    
    // Front face
    triangles.push({ vertices: [o1f, o2f, i2f], normal: calculateNormal(o1f, o2f, i2f) });
    triangles.push({ vertices: [o1f, i2f, i1f], normal: calculateNormal(o1f, i2f, i1f) });
    
    // Back face
    triangles.push({ vertices: [o1b, i2b, o2b], normal: calculateNormal(o1b, i2b, o2b) });
    triangles.push({ vertices: [o1b, i1b, i2b], normal: calculateNormal(o1b, i1b, i2b) });
  }
  
  return triangles;
}

function generateClip(
  x: number, y: number, z: number, angle: number,
  settings: FilamentShapeSettings
): Triangle[] {
  const { clipStyle, clipWidth, clipHeight, filamentDiameter, wallThickness } = settings;
  
  switch (clipStyle) {
    case "u_channel":
      return generateUChannelClip(x, y, z, angle, clipWidth, clipHeight, filamentDiameter, wallThickness);
    case "pinch_clip":
      return generatePinchClip(x, y, z, angle, clipWidth, clipHeight, filamentDiameter, wallThickness);
    case "wrap_around":
      return generatePinchClip(x, y, z, angle, clipWidth, clipHeight, filamentDiameter, wallThickness * 1.5);
    case "groove":
      return generateUChannelClip(x, y, z, angle, clipWidth, clipHeight * 0.7, filamentDiameter, wallThickness);
    default:
      return generateUChannelClip(x, y, z, angle, clipWidth, clipHeight, filamentDiameter, wallThickness);
  }
}

function generateBasePlateWithIntegratedClips(
  shapePath: Point2D[],
  settings: FilamentShapeSettings
): Triangle[] {
  const triangles: Triangle[] = [];
  const padding = 15;
  const thickness = settings.basePlateThickness;
  const feedChannelWidth = 4;
  const feedChannelDepth = thickness * 0.6;
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of shapePath) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  // Add padding
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;
  
  // Base plate box
  const v0: [number, number, number] = [minX, minY, 0];
  const v1: [number, number, number] = [maxX, minY, 0];
  const v2: [number, number, number] = [maxX, maxY, 0];
  const v3: [number, number, number] = [minX, maxY, 0];
  const v4: [number, number, number] = [minX, minY, thickness];
  const v5: [number, number, number] = [maxX, minY, thickness];
  const v6: [number, number, number] = [maxX, maxY, thickness];
  const v7: [number, number, number] = [minX, maxY, thickness];
  
  // Bottom face
  triangles.push({ vertices: [v0, v2, v1], normal: [0, 0, -1] });
  triangles.push({ vertices: [v0, v3, v2], normal: [0, 0, -1] });
  
  // Top face
  triangles.push({ vertices: [v4, v5, v6], normal: [0, 0, 1] });
  triangles.push({ vertices: [v4, v6, v7], normal: [0, 0, 1] });
  
  // Sides
  triangles.push({ vertices: [v0, v1, v5], normal: [0, -1, 0] });
  triangles.push({ vertices: [v0, v5, v4], normal: [0, -1, 0] });
  triangles.push({ vertices: [v2, v3, v7], normal: [0, 1, 0] });
  triangles.push({ vertices: [v2, v7, v6], normal: [0, 1, 0] });
  triangles.push({ vertices: [v0, v4, v7], normal: [-1, 0, 0] });
  triangles.push({ vertices: [v0, v7, v3], normal: [-1, 0, 0] });
  triangles.push({ vertices: [v1, v2, v6], normal: [1, 0, 0] });
  triangles.push({ vertices: [v1, v6, v5], normal: [1, 0, 0] });
  
  // INTEGRATED CLIPS: Generate clips directly on top of base plate following shape path
  const pathLength = getPathLength(shapePath);
  const numClips = Math.max(3, Math.floor(pathLength / settings.clipSpacing));
  const actualSpacing = pathLength / numClips;
  const clipZ = thickness;
  
  for (let i = 0; i < numClips; i++) {
    const distance = i * actualSpacing;
    const sample = samplePathAtDistance(shapePath, distance);
    if (sample) {
      const { point, angle } = sample;
      const clipTris = generateIntegratedClip(point.x, point.y, clipZ, angle, settings);
      triangles.push(...clipTris);
    }
  }
  
  // WIRE FEED CHANNELS: Add channels at start and end points for wire routing
  // Find start and end points of the path
  if (shapePath.length >= 2) {
    const startPoint = shapePath[0];
    const endPoint = shapePath[shapePath.length - 1];
    
    // Create feed channel from start point to nearest edge
    const startChannel = generateFeedChannel(startPoint, minX, minY, maxX, maxY, thickness, feedChannelWidth, feedChannelDepth);
    triangles.push(...startChannel);
    
    // Create feed channel from end point to nearest edge
    const endChannel = generateFeedChannel(endPoint, minX, minY, maxX, maxY, thickness, feedChannelWidth, feedChannelDepth);
    triangles.push(...endChannel);
  }
  
  return triangles;
}

function generateIntegratedClip(
  x: number, y: number, z: number, angle: number,
  settings: FilamentShapeSettings
): Triangle[] {
  const triangles: Triangle[] = [];
  const { clipHeight, filamentDiameter, wallThickness, clipWidth } = settings;
  const channelWidth = filamentDiameter + 0.5;
  const totalWidth = channelWidth + wallThickness * 2;
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  function transform(lx: number, ly: number, lz: number): [number, number, number] {
    return [x + lx * cos - ly * sin, y + lx * sin + ly * cos, z + lz];
  }
  
  const hw = clipWidth / 2;
  const w2 = totalWidth / 2;
  const h = clipHeight;
  const cw2 = channelWidth / 2;
  const cd = filamentDiameter * 0.7;
  
  // Outer box with U-channel
  const v0 = transform(-w2, -hw, 0);
  const v1 = transform(w2, -hw, 0);
  const v2 = transform(w2, hw, 0);
  const v3 = transform(-w2, hw, 0);
  const v4 = transform(-w2, -hw, h);
  const v5 = transform(w2, -hw, h);
  const v6 = transform(w2, hw, h);
  const v7 = transform(-w2, hw, h);
  
  // Channel floor
  const v8 = transform(-cw2, -hw, h - cd);
  const v9 = transform(cw2, -hw, h - cd);
  const v10 = transform(cw2, hw, h - cd);
  const v11 = transform(-cw2, hw, h - cd);
  
  // Front/back faces
  triangles.push({ vertices: [v4, v5, v1], normal: calculateNormal(v4, v5, v1) });
  triangles.push({ vertices: [v4, v1, v0], normal: calculateNormal(v4, v1, v0) });
  triangles.push({ vertices: [v7, v3, v2], normal: calculateNormal(v7, v3, v2) });
  triangles.push({ vertices: [v7, v2, v6], normal: calculateNormal(v7, v2, v6) });
  
  // Left/right sides
  triangles.push({ vertices: [v4, v0, v3], normal: calculateNormal(v4, v0, v3) });
  triangles.push({ vertices: [v4, v3, v7], normal: calculateNormal(v4, v3, v7) });
  triangles.push({ vertices: [v5, v6, v2], normal: calculateNormal(v5, v6, v2) });
  triangles.push({ vertices: [v5, v2, v1], normal: calculateNormal(v5, v2, v1) });
  
  // Top wings (left of channel)
  const v4l = transform(-w2, -hw, h);
  const v8l = transform(-cw2, -hw, h);
  const v11l = transform(-cw2, hw, h);
  const v7l = transform(-w2, hw, h);
  triangles.push({ vertices: [v4l, v8l, v11l], normal: [0, 0, 1] });
  triangles.push({ vertices: [v4l, v11l, v7l], normal: [0, 0, 1] });
  
  // Top wings (right of channel)
  const v9r = transform(cw2, -hw, h);
  const v5r = transform(w2, -hw, h);
  const v6r = transform(w2, hw, h);
  const v10r = transform(cw2, hw, h);
  triangles.push({ vertices: [v9r, v5r, v6r], normal: [0, 0, 1] });
  triangles.push({ vertices: [v9r, v6r, v10r], normal: [0, 0, 1] });
  
  // Channel floor
  triangles.push({ vertices: [v8, v9, v10], normal: [0, 0, -1] });
  triangles.push({ vertices: [v8, v10, v11], normal: [0, 0, -1] });
  
  // Channel walls
  triangles.push({ vertices: [v8l, v8, v11], normal: calculateNormal(v8l, v8, v11) });
  triangles.push({ vertices: [v8l, v11, v11l], normal: calculateNormal(v8l, v11, v11l) });
  triangles.push({ vertices: [v9, v9r, v10r], normal: calculateNormal(v9, v9r, v10r) });
  triangles.push({ vertices: [v9, v10r, v10], normal: calculateNormal(v9, v10r, v10) });
  
  return triangles;
}

function generateFeedChannel(
  point: Point2D, 
  minX: number, minY: number, maxX: number, maxY: number,
  baseThickness: number, channelWidth: number, channelDepth: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Find nearest edge
  const distToLeft = point.x - minX;
  const distToRight = maxX - point.x;
  const distToBottom = point.y - minY;
  const distToTop = maxY - point.y;
  
  const minDist = Math.min(distToLeft, distToRight, distToBottom, distToTop);
  
  let endX = point.x;
  let endY = point.y;
  
  if (minDist === distToLeft) {
    endX = minX - 2;
  } else if (minDist === distToRight) {
    endX = maxX + 2;
  } else if (minDist === distToBottom) {
    endY = minY - 2;
  } else {
    endY = maxY + 2;
  }
  
  // Create channel groove from point to edge
  const dx = endX - point.x;
  const dy = endY - point.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return triangles;
  
  const nx = -dy / len * channelWidth / 2;
  const ny = dx / len * channelWidth / 2;
  
  const z1 = baseThickness - channelDepth;
  const z2 = baseThickness + 0.5;
  
  // Channel walls (raised edges to guide wires)
  const wallHeight = 2;
  const wallWidth = 1;
  
  // Left wall of channel
  const lw0: [number, number, number] = [point.x - nx - wallWidth, point.y - ny, baseThickness];
  const lw1: [number, number, number] = [point.x - nx, point.y - ny, baseThickness];
  const lw2: [number, number, number] = [endX - nx, endY - ny, baseThickness];
  const lw3: [number, number, number] = [endX - nx - wallWidth, endY - ny, baseThickness];
  const lw4: [number, number, number] = [point.x - nx - wallWidth, point.y - ny, baseThickness + wallHeight];
  const lw5: [number, number, number] = [point.x - nx, point.y - ny, baseThickness + wallHeight];
  const lw6: [number, number, number] = [endX - nx, endY - ny, baseThickness + wallHeight];
  const lw7: [number, number, number] = [endX - nx - wallWidth, endY - ny, baseThickness + wallHeight];
  
  // Left wall faces
  triangles.push({ vertices: [lw4, lw5, lw6], normal: [0, 0, 1] });
  triangles.push({ vertices: [lw4, lw6, lw7], normal: [0, 0, 1] });
  triangles.push({ vertices: [lw0, lw4, lw7], normal: calculateNormal(lw0, lw4, lw7) });
  triangles.push({ vertices: [lw0, lw7, lw3], normal: calculateNormal(lw0, lw7, lw3) });
  triangles.push({ vertices: [lw1, lw2, lw6], normal: calculateNormal(lw1, lw2, lw6) });
  triangles.push({ vertices: [lw1, lw6, lw5], normal: calculateNormal(lw1, lw6, lw5) });
  triangles.push({ vertices: [lw0, lw1, lw5], normal: calculateNormal(lw0, lw1, lw5) });
  triangles.push({ vertices: [lw0, lw5, lw4], normal: calculateNormal(lw0, lw5, lw4) });
  triangles.push({ vertices: [lw3, lw7, lw6], normal: calculateNormal(lw3, lw7, lw6) });
  triangles.push({ vertices: [lw3, lw6, lw2], normal: calculateNormal(lw3, lw6, lw2) });
  
  // Right wall of channel
  const rw0: [number, number, number] = [point.x + nx, point.y + ny, baseThickness];
  const rw1: [number, number, number] = [point.x + nx + wallWidth, point.y + ny, baseThickness];
  const rw2: [number, number, number] = [endX + nx + wallWidth, endY + ny, baseThickness];
  const rw3: [number, number, number] = [endX + nx, endY + ny, baseThickness];
  const rw4: [number, number, number] = [point.x + nx, point.y + ny, baseThickness + wallHeight];
  const rw5: [number, number, number] = [point.x + nx + wallWidth, point.y + ny, baseThickness + wallHeight];
  const rw6: [number, number, number] = [endX + nx + wallWidth, endY + ny, baseThickness + wallHeight];
  const rw7: [number, number, number] = [endX + nx, endY + ny, baseThickness + wallHeight];
  
  // Right wall faces
  triangles.push({ vertices: [rw4, rw5, rw6], normal: [0, 0, 1] });
  triangles.push({ vertices: [rw4, rw6, rw7], normal: [0, 0, 1] });
  triangles.push({ vertices: [rw0, rw4, rw7], normal: calculateNormal(rw0, rw4, rw7) });
  triangles.push({ vertices: [rw0, rw7, rw3], normal: calculateNormal(rw0, rw7, rw3) });
  triangles.push({ vertices: [rw1, rw2, rw6], normal: calculateNormal(rw1, rw2, rw6) });
  triangles.push({ vertices: [rw1, rw6, rw5], normal: calculateNormal(rw1, rw6, rw5) });
  triangles.push({ vertices: [rw0, rw1, rw5], normal: calculateNormal(rw0, rw1, rw5) });
  triangles.push({ vertices: [rw0, rw5, rw4], normal: calculateNormal(rw0, rw5, rw4) });
  triangles.push({ vertices: [rw3, rw7, rw6], normal: calculateNormal(rw3, rw7, rw6) });
  triangles.push({ vertices: [rw3, rw6, rw2], normal: calculateNormal(rw3, rw6, rw2) });
  
  return triangles;
}

function generateBatteryHolder(settings: FilamentShapeSettings, baseZ: number): Triangle[] {
  const triangles: Triangle[] = [];
  
  // CR2032 battery holder dimensions - improved design with wire outlet
  const batteryDims: { [key: string]: { diameter: number; height: number } } = {
    "cr2032": { diameter: 20, height: 3.2 },
    "cr2025": { diameter: 20, height: 2.5 },
    "cr2016": { diameter: 20, height: 1.6 },
    "aaa_single": { diameter: 10.5, height: 44.5 },
    "aaa_double": { diameter: 10.5, height: 89 },
  };
  
  const battery = batteryDims[settings.batteryType] || batteryDims["cr2032"];
  const wallThickness = 2;
  const isCoinCell = battery.diameter === 20;
  
  // Position at bottom of base plate
  const cx = 0;
  const cy = -(settings.shapeHeight / 2 + (isCoinCell ? 18 : battery.height / 2 + 10) + 5);
  const z = baseZ;
  
  if (isCoinCell) {
    // Improved coin cell holder with wire outlet (like reference image)
    const innerDia = battery.diameter + 0.3;
    const outerDia = innerDia + wallThickness * 2;
    const holderHeight = battery.height + 3;
    const baseHeight = 2;
    const segments = 24;
    
    // Base disc
    const baseR = outerDia / 2 + 3;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Bottom face
      triangles.push({
        vertices: [[cx, cy, z], [cx + Math.cos(a2) * baseR, cy + Math.sin(a2) * baseR, z], [cx + Math.cos(a1) * baseR, cy + Math.sin(a1) * baseR, z]],
        normal: [0, 0, -1]
      });
      
      // Top base face
      triangles.push({
        vertices: [[cx, cy, z + baseHeight], [cx + Math.cos(a1) * baseR, cy + Math.sin(a1) * baseR, z + baseHeight], [cx + Math.cos(a2) * baseR, cy + Math.sin(a2) * baseR, z + baseHeight]],
        normal: [0, 0, 1]
      });
      
      // Base rim
      const ro1: [number, number, number] = [cx + Math.cos(a1) * baseR, cy + Math.sin(a1) * baseR, z];
      const ro2: [number, number, number] = [cx + Math.cos(a2) * baseR, cy + Math.sin(a2) * baseR, z];
      const ro3: [number, number, number] = [cx + Math.cos(a2) * baseR, cy + Math.sin(a2) * baseR, z + baseHeight];
      const ro4: [number, number, number] = [cx + Math.cos(a1) * baseR, cy + Math.sin(a1) * baseR, z + baseHeight];
      triangles.push({ vertices: [ro1, ro2, ro3], normal: calculateNormal(ro1, ro2, ro3) });
      triangles.push({ vertices: [ro1, ro3, ro4], normal: calculateNormal(ro1, ro3, ro4) });
    }
    
    // Ring wall for battery (with opening for easy insertion)
    const ringR = outerDia / 2;
    const innerR = innerDia / 2;
    const openingStart = Math.PI * 0.85;
    const openingEnd = Math.PI * 1.15;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Skip opening section
      if ((a1 >= openingStart && a1 <= openingEnd) || (a2 >= openingStart && a2 <= openingEnd)) continue;
      
      // Outer wall
      const wo1: [number, number, number] = [cx + Math.cos(a1) * ringR, cy + Math.sin(a1) * ringR, z + baseHeight];
      const wo2: [number, number, number] = [cx + Math.cos(a2) * ringR, cy + Math.sin(a2) * ringR, z + baseHeight];
      const wo3: [number, number, number] = [cx + Math.cos(a2) * ringR, cy + Math.sin(a2) * ringR, z + baseHeight + holderHeight];
      const wo4: [number, number, number] = [cx + Math.cos(a1) * ringR, cy + Math.sin(a1) * ringR, z + baseHeight + holderHeight];
      triangles.push({ vertices: [wo1, wo2, wo3], normal: calculateNormal(wo1, wo2, wo3) });
      triangles.push({ vertices: [wo1, wo3, wo4], normal: calculateNormal(wo1, wo3, wo4) });
      
      // Inner wall
      const wi1: [number, number, number] = [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR, z + baseHeight];
      const wi2: [number, number, number] = [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR, z + baseHeight];
      const wi3: [number, number, number] = [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR, z + baseHeight + holderHeight];
      const wi4: [number, number, number] = [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR, z + baseHeight + holderHeight];
      triangles.push({ vertices: [wi1, wi3, wi2], normal: calculateNormal(wi1, wi3, wi2) });
      triangles.push({ vertices: [wi1, wi4, wi3], normal: calculateNormal(wi1, wi4, wi3) });
      
      // Top ring
      triangles.push({ vertices: [wo4, wo3, wi3], normal: [0, 0, 1] });
      triangles.push({ vertices: [wo4, wi3, wi4], normal: [0, 0, 1] });
    }
    
    // Wire outlet channel at bottom (like reference images)
    const channelWidth = 4;
    const channelHeight = 3;
    const channelLength = 8;
    const channelY = cy - baseR - channelLength / 2 + 2;
    
    const cw = channelWidth / 2;
    const ch = channelHeight;
    const cl = channelLength / 2;
    
    const c0: [number, number, number] = [cx - cw, channelY - cl, z];
    const c1: [number, number, number] = [cx + cw, channelY - cl, z];
    const c2: [number, number, number] = [cx + cw, channelY + cl, z];
    const c3: [number, number, number] = [cx - cw, channelY + cl, z];
    const c4: [number, number, number] = [cx - cw, channelY - cl, z + ch];
    const c5: [number, number, number] = [cx + cw, channelY - cl, z + ch];
    const c6: [number, number, number] = [cx + cw, channelY + cl, z + ch];
    const c7: [number, number, number] = [cx - cw, channelY + cl, z + ch];
    
    // Wire channel box with hole through
    triangles.push({ vertices: [c0, c2, c1], normal: [0, 0, -1] });
    triangles.push({ vertices: [c0, c3, c2], normal: [0, 0, -1] });
    triangles.push({ vertices: [c4, c5, c6], normal: [0, 0, 1] });
    triangles.push({ vertices: [c4, c6, c7], normal: [0, 0, 1] });
    triangles.push({ vertices: [c0, c4, c7], normal: [-1, 0, 0] });
    triangles.push({ vertices: [c0, c7, c3], normal: [-1, 0, 0] });
    triangles.push({ vertices: [c1, c2, c6], normal: [1, 0, 0] });
    triangles.push({ vertices: [c1, c6, c5], normal: [1, 0, 0] });
    
  } else {
    // AAA battery holder (tube style)
    const tubeLength = battery.height + 4;
    const tubeOuter = battery.diameter + wallThickness * 2;
    const tubeInner = battery.diameter + 0.3;
    const segments = 16;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Outer surface
      const oo1: [number, number, number] = [cx + Math.cos(a1) * tubeOuter / 2, cy, z];
      const oo2: [number, number, number] = [cx + Math.cos(a2) * tubeOuter / 2, cy, z];
      const oo3: [number, number, number] = [cx + Math.cos(a2) * tubeOuter / 2, cy, z + tubeLength];
      const oo4: [number, number, number] = [cx + Math.cos(a1) * tubeOuter / 2, cy, z + tubeLength];
      triangles.push({ vertices: [oo1, oo2, oo3], normal: calculateNormal(oo1, oo2, oo3) });
      triangles.push({ vertices: [oo1, oo3, oo4], normal: calculateNormal(oo1, oo3, oo4) });
    }
  }
  
  return triangles;
}

// Professional two-piece battery holder with snap-fit lid
function generateBatteryHolderTwoPiece(settings: FilamentShapeSettings, baseZ: number): { base: Triangle[]; lid: Triangle[] } {
  const baseTriangles: Triangle[] = [];
  const lidTriangles: Triangle[] = [];
  
  const batteryDims: { [key: string]: { diameter: number; height: number } } = {
    "cr2032": { diameter: 20, height: 3.2 },
    "cr2025": { diameter: 20, height: 2.5 },
    "cr2016": { diameter: 20, height: 1.6 },
    "aaa_single": { diameter: 10.5, height: 44.5 },
    "aaa_double": { diameter: 10.5, height: 89 },
  };
  
  const battery = batteryDims[settings.batteryType] || batteryDims["cr2032"];
  const isCoinCell = battery.diameter === 20;
  
  if (isCoinCell) {
    // Two-piece coin cell holder with snap clips
    const innerDia = battery.diameter + 0.5;
    const outerDia = innerDia + 4;
    const baseHeight = battery.height + 1.5;
    const wallHeight = 2;
    const lidHeight = 2;
    const clipHeight = 1.5;
    const clipDepth = 0.8;
    const segments = 32;
    
    const cx = 0;
    const cy = 0;
    const z = baseZ;
    
    // === BASE PIECE ===
    // Solid disc bottom
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const outerR = outerDia / 2;
      
      // Bottom face
      baseTriangles.push({
        vertices: [[cx, cy, z], [cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR, z], [cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR, z]],
        normal: [0, 0, -1]
      });
    }
    
    // Inner cavity (battery pocket) - circular well
    const innerR = innerDia / 2;
    const outerR = outerDia / 2;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Top ring surface (outer)
      const to1: [number, number, number] = [cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR, z + baseHeight];
      const to2: [number, number, number] = [cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR, z + baseHeight];
      const ti1: [number, number, number] = [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR, z + baseHeight];
      const ti2: [number, number, number] = [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR, z + baseHeight];
      
      baseTriangles.push({ vertices: [to1, to2, ti2], normal: [0, 0, 1] });
      baseTriangles.push({ vertices: [to1, ti2, ti1], normal: [0, 0, 1] });
      
      // Inner wall of cavity
      const bi1: [number, number, number] = [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR, z + 1];
      const bi2: [number, number, number] = [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR, z + 1];
      baseTriangles.push({ vertices: [ti1, ti2, bi2], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      baseTriangles.push({ vertices: [ti1, bi2, bi1], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Cavity bottom
      baseTriangles.push({
        vertices: [[cx, cy, z + 1], [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR, z + 1], [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR, z + 1]],
        normal: [0, 0, 1]
      });
      
      // Outer wall
      const bo1: [number, number, number] = [cx + Math.cos(a1) * outerR, cy + Math.sin(a1) * outerR, z];
      const bo2: [number, number, number] = [cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR, z];
      baseTriangles.push({ vertices: [bo1, bo2, to2], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      baseTriangles.push({ vertices: [bo1, to2, to1], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
    }
    
    // Add 4 snap-fit clip posts on base (at 0, 90, 180, 270 degrees)
    const clipAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    const postRadius = 1.5;
    const postHeight = wallHeight + clipHeight;
    const postDistance = outerR + postRadius + 0.5;
    
    for (const angle of clipAngles) {
      const px = cx + Math.cos(angle) * postDistance;
      const py = cy + Math.sin(angle) * postDistance;
      
      for (let i = 0; i < 8; i++) {
        const pa1 = (i / 8) * Math.PI * 2;
        const pa2 = ((i + 1) / 8) * Math.PI * 2;
        const pr = postRadius;
        
        // Post bottom
        baseTriangles.push({
          vertices: [[px, py, z], [px + Math.cos(pa2) * pr, py + Math.sin(pa2) * pr, z], [px + Math.cos(pa1) * pr, py + Math.sin(pa1) * pr, z]],
          normal: [0, 0, -1]
        });
        
        // Post top
        baseTriangles.push({
          vertices: [[px, py, z + postHeight], [px + Math.cos(pa1) * pr, py + Math.sin(pa1) * pr, z + postHeight], [px + Math.cos(pa2) * pr, py + Math.sin(pa2) * pr, z + postHeight]],
          normal: [0, 0, 1]
        });
        
        // Post sides
        const ps0: [number, number, number] = [px + Math.cos(pa1) * pr, py + Math.sin(pa1) * pr, z];
        const ps1: [number, number, number] = [px + Math.cos(pa2) * pr, py + Math.sin(pa2) * pr, z];
        const ps2: [number, number, number] = [px + Math.cos(pa2) * pr, py + Math.sin(pa2) * pr, z + postHeight];
        const ps3: [number, number, number] = [px + Math.cos(pa1) * pr, py + Math.sin(pa1) * pr, z + postHeight];
        
        baseTriangles.push({ vertices: [ps0, ps1, ps2], normal: [(Math.cos(pa1) + Math.cos(pa2)) / 2, (Math.sin(pa1) + Math.sin(pa2)) / 2, 0] });
        baseTriangles.push({ vertices: [ps0, ps2, ps3], normal: [(Math.cos(pa1) + Math.cos(pa2)) / 2, (Math.sin(pa1) + Math.sin(pa2)) / 2, 0] });
      }
      
      // Add clip nub at top of post (protruding inward for snap fit)
      const clipOutward = clipDepth;
      const inwardAngle = angle + Math.PI;
      const clipX = px + Math.cos(inwardAngle) * clipOutward;
      const clipY = py + Math.sin(inwardAngle) * clipOutward;
      const clipW = 1.5;
      const clipH = clipHeight;
      
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const tx = -ny;
      const ty = nx;
      
      const nc0: [number, number, number] = [px - tx * clipW / 2, py - ty * clipW / 2, z + postHeight - clipH];
      const nc1: [number, number, number] = [px + tx * clipW / 2, py + ty * clipW / 2, z + postHeight - clipH];
      const nc2: [number, number, number] = [clipX + tx * clipW / 2, clipY + ty * clipW / 2, z + postHeight - clipH];
      const nc3: [number, number, number] = [clipX - tx * clipW / 2, clipY - ty * clipW / 2, z + postHeight - clipH];
      const nc4: [number, number, number] = [px - tx * clipW / 2, py - ty * clipW / 2, z + postHeight];
      const nc5: [number, number, number] = [px + tx * clipW / 2, py + ty * clipW / 2, z + postHeight];
      const nc6: [number, number, number] = [clipX + tx * clipW / 2, clipY + ty * clipW / 2, z + postHeight];
      const nc7: [number, number, number] = [clipX - tx * clipW / 2, clipY - ty * clipW / 2, z + postHeight];
      
      // Clip nub faces
      baseTriangles.push({ vertices: [nc4, nc5, nc6], normal: [0, 0, 1] });
      baseTriangles.push({ vertices: [nc4, nc6, nc7], normal: [0, 0, 1] });
      baseTriangles.push({ vertices: [nc2, nc3, nc7], normal: [-nx, -ny, 0] });
      baseTriangles.push({ vertices: [nc2, nc7, nc6], normal: [-nx, -ny, 0] });
    }
    
    // Wire outlet groove
    const grooveWidth = 3;
    const grooveDepth = 1.5;
    const gw = grooveWidth / 2;
    const gd = grooveDepth;
    const grooveStartY = cy - innerR;
    const grooveEndY = cy - outerR - 2;
    
    const g0: [number, number, number] = [cx - gw, grooveEndY, z];
    const g1: [number, number, number] = [cx + gw, grooveEndY, z];
    const g2: [number, number, number] = [cx + gw, grooveStartY, z];
    const g3: [number, number, number] = [cx - gw, grooveStartY, z];
    const g4: [number, number, number] = [cx - gw, grooveEndY, z + gd];
    const g5: [number, number, number] = [cx + gw, grooveEndY, z + gd];
    const g6: [number, number, number] = [cx + gw, grooveStartY, z + gd];
    const g7: [number, number, number] = [cx - gw, grooveStartY, z + gd];
    
    baseTriangles.push({ vertices: [g4, g5, g6], normal: [0, 0, 1] });
    baseTriangles.push({ vertices: [g4, g6, g7], normal: [0, 0, 1] });
    baseTriangles.push({ vertices: [g0, g4, g7], normal: [-1, 0, 0] });
    baseTriangles.push({ vertices: [g0, g7, g3], normal: [-1, 0, 0] });
    baseTriangles.push({ vertices: [g1, g2, g6], normal: [1, 0, 0] });
    baseTriangles.push({ vertices: [g1, g6, g5], normal: [1, 0, 0] });
    baseTriangles.push({ vertices: [g0, g1, g5], normal: [0, -1, 0] });
    baseTriangles.push({ vertices: [g0, g5, g4], normal: [0, -1, 0] });
    
    // === LID PIECE ===
    const lidZ = 0;
    const lidOuterR = outerR + 0.3;
    const lidInnerR = innerR - 0.5;
    
    // Lid disc
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      // Top face
      lidTriangles.push({
        vertices: [[cx, cy, lidZ + lidHeight], [cx + Math.cos(a1) * lidOuterR, cy + Math.sin(a1) * lidOuterR, lidZ + lidHeight], [cx + Math.cos(a2) * lidOuterR, cy + Math.sin(a2) * lidOuterR, lidZ + lidHeight]],
        normal: [0, 0, 1]
      });
      
      // Bottom face (ring around contact hole)
      const lo1: [number, number, number] = [cx + Math.cos(a1) * lidOuterR, cy + Math.sin(a1) * lidOuterR, lidZ];
      const lo2: [number, number, number] = [cx + Math.cos(a2) * lidOuterR, cy + Math.sin(a2) * lidOuterR, lidZ];
      const li1: [number, number, number] = [cx + Math.cos(a1) * lidInnerR, cy + Math.sin(a1) * lidInnerR, lidZ];
      const li2: [number, number, number] = [cx + Math.cos(a2) * lidInnerR, cy + Math.sin(a2) * lidInnerR, lidZ];
      
      lidTriangles.push({ vertices: [lo1, li1, li2], normal: [0, 0, -1] });
      lidTriangles.push({ vertices: [lo1, li2, lo2], normal: [0, 0, -1] });
      
      // Outer edge
      const to1: [number, number, number] = [cx + Math.cos(a1) * lidOuterR, cy + Math.sin(a1) * lidOuterR, lidZ + lidHeight];
      const to2: [number, number, number] = [cx + Math.cos(a2) * lidOuterR, cy + Math.sin(a2) * lidOuterR, lidZ + lidHeight];
      lidTriangles.push({ vertices: [lo1, lo2, to2], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      lidTriangles.push({ vertices: [lo1, to2, to1], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Inner edge (contact hole)
      const ti1: [number, number, number] = [cx + Math.cos(a1) * lidInnerR, cy + Math.sin(a1) * lidInnerR, lidZ + lidHeight];
      const ti2: [number, number, number] = [cx + Math.cos(a2) * lidInnerR, cy + Math.sin(a2) * lidInnerR, lidZ + lidHeight];
      lidTriangles.push({ vertices: [li1, ti2, ti1], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      lidTriangles.push({ vertices: [li1, li2, ti2], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Top inner ring
      lidTriangles.push({ vertices: [to1, to2, ti2], normal: [0, 0, 1] });
      lidTriangles.push({ vertices: [to1, ti2, ti1], normal: [0, 0, 1] });
    }
    
    // Snap holes in lid for the clips
    for (const angle of clipAngles) {
      const holeX = cx + Math.cos(angle) * postDistance;
      const holeY = cy + Math.sin(angle) * postDistance;
      const holeR = postRadius + 0.3;
      
      for (let i = 0; i < 8; i++) {
        const ha1 = (i / 8) * Math.PI * 2;
        const ha2 = ((i + 1) / 8) * Math.PI * 2;
        
        // Hole inner walls
        const hw0: [number, number, number] = [holeX + Math.cos(ha1) * holeR, holeY + Math.sin(ha1) * holeR, lidZ];
        const hw1: [number, number, number] = [holeX + Math.cos(ha2) * holeR, holeY + Math.sin(ha2) * holeR, lidZ];
        const hw2: [number, number, number] = [holeX + Math.cos(ha2) * holeR, holeY + Math.sin(ha2) * holeR, lidZ + lidHeight];
        const hw3: [number, number, number] = [holeX + Math.cos(ha1) * holeR, holeY + Math.sin(ha1) * holeR, lidZ + lidHeight];
        
        lidTriangles.push({ vertices: [hw0, hw2, hw1], normal: [-(Math.cos(ha1) + Math.cos(ha2)) / 2, -(Math.sin(ha1) + Math.sin(ha2)) / 2, 0] });
        lidTriangles.push({ vertices: [hw0, hw3, hw2], normal: [-(Math.cos(ha1) + Math.cos(ha2)) / 2, -(Math.sin(ha1) + Math.sin(ha2)) / 2, 0] });
      }
    }
    
  } else {
    // AAA battery holder - two piece tube
    const tubeLength = battery.height + 6;
    const tubeOuter = battery.diameter + 4;
    const tubeInner = battery.diameter + 0.5;
    const wallThickness = (tubeOuter - tubeInner) / 2;
    const segments = 16;
    const lidLength = 8;
    
    // Base tube (open at one end for lid)
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const outerR = tubeOuter / 2;
      const innerR = tubeInner / 2;
      
      // End cap
      baseTriangles.push({
        vertices: [[0, 0, 0], [Math.cos(a2) * outerR, Math.sin(a2) * outerR, 0], [Math.cos(a1) * outerR, Math.sin(a1) * outerR, 0]],
        normal: [0, 0, -1]
      });
      
      // Outer wall
      const ow0: [number, number, number] = [Math.cos(a1) * outerR, Math.sin(a1) * outerR, 0];
      const ow1: [number, number, number] = [Math.cos(a2) * outerR, Math.sin(a2) * outerR, 0];
      const ow2: [number, number, number] = [Math.cos(a2) * outerR, Math.sin(a2) * outerR, tubeLength - lidLength];
      const ow3: [number, number, number] = [Math.cos(a1) * outerR, Math.sin(a1) * outerR, tubeLength - lidLength];
      baseTriangles.push({ vertices: [ow0, ow1, ow2], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      baseTriangles.push({ vertices: [ow0, ow2, ow3], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Inner wall
      const iw0: [number, number, number] = [Math.cos(a1) * innerR, Math.sin(a1) * innerR, 1];
      const iw1: [number, number, number] = [Math.cos(a2) * innerR, Math.sin(a2) * innerR, 1];
      const iw2: [number, number, number] = [Math.cos(a2) * innerR, Math.sin(a2) * innerR, tubeLength - lidLength];
      const iw3: [number, number, number] = [Math.cos(a1) * innerR, Math.sin(a1) * innerR, tubeLength - lidLength];
      baseTriangles.push({ vertices: [iw0, iw2, iw1], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      baseTriangles.push({ vertices: [iw0, iw3, iw2], normal: [-(Math.cos(a1) + Math.cos(a2)) / 2, -(Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Top ring
      baseTriangles.push({ vertices: [ow3, ow2, iw2], normal: [0, 0, 1] });
      baseTriangles.push({ vertices: [ow3, iw2, iw3], normal: [0, 0, 1] });
    }
    
    // Lid tube section
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const outerR = tubeOuter / 2;
      const innerR = tubeInner / 2;
      const insertR = outerR - 0.3;
      
      // End cap
      lidTriangles.push({
        vertices: [[0, 0, lidLength], [Math.cos(a1) * outerR, Math.sin(a1) * outerR, lidLength], [Math.cos(a2) * outerR, Math.sin(a2) * outerR, lidLength]],
        normal: [0, 0, 1]
      });
      
      // Outer wall
      const ow0: [number, number, number] = [Math.cos(a1) * outerR, Math.sin(a1) * outerR, lidLength];
      const ow1: [number, number, number] = [Math.cos(a2) * outerR, Math.sin(a2) * outerR, lidLength];
      const ow2: [number, number, number] = [Math.cos(a2) * insertR, Math.sin(a2) * insertR, 0];
      const ow3: [number, number, number] = [Math.cos(a1) * insertR, Math.sin(a1) * insertR, 0];
      lidTriangles.push({ vertices: [ow0, ow2, ow1], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      lidTriangles.push({ vertices: [ow0, ow3, ow2], normal: [(Math.cos(a1) + Math.cos(a2)) / 2, (Math.sin(a1) + Math.sin(a2)) / 2, 0] });
      
      // Inner bottom opening
      lidTriangles.push({
        vertices: [[0, 0, 0], [Math.cos(a1) * innerR, Math.sin(a1) * innerR, 0], [Math.cos(a2) * innerR, Math.sin(a2) * innerR, 0]],
        normal: [0, 0, -1]
      });
    }
  }
  
  return { base: baseTriangles, lid: lidTriangles };
}

function generateDiffuserShellSandwich(
  shapePath: Point2D[],
  settings: FilamentShapeSettings
): { front: Triangle[]; back: Triangle[] } {
  const frontTriangles: Triangle[] = [];
  const backTriangles: Triangle[] = [];
  const padding = 8;
  const shellThickness = 1.5;
  const rimHeight = 4;
  const channelWidth = 3;
  const channelDepth = 2;
  const z = settings.clipHeight + settings.diffuserOffset;
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of shapePath) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;
  
  // === FRONT SHELL (with embossed channel for EL wire) ===
  const fv0: [number, number, number] = [minX, minY, z];
  const fv1: [number, number, number] = [maxX, minY, z];
  const fv2: [number, number, number] = [maxX, maxY, z];
  const fv3: [number, number, number] = [minX, maxY, z];
  const fv4: [number, number, number] = [minX, minY, z + shellThickness];
  const fv5: [number, number, number] = [maxX, minY, z + shellThickness];
  const fv6: [number, number, number] = [maxX, maxY, z + shellThickness];
  const fv7: [number, number, number] = [minX, maxY, z + shellThickness];
  
  // Front shell base
  frontTriangles.push({ vertices: [fv0, fv2, fv1], normal: [0, 0, -1] });
  frontTriangles.push({ vertices: [fv0, fv3, fv2], normal: [0, 0, -1] });
  frontTriangles.push({ vertices: [fv4, fv5, fv6], normal: [0, 0, 1] });
  frontTriangles.push({ vertices: [fv4, fv6, fv7], normal: [0, 0, 1] });
  frontTriangles.push({ vertices: [fv0, fv1, fv5], normal: [0, -1, 0] });
  frontTriangles.push({ vertices: [fv0, fv5, fv4], normal: [0, -1, 0] });
  frontTriangles.push({ vertices: [fv2, fv3, fv7], normal: [0, 1, 0] });
  frontTriangles.push({ vertices: [fv2, fv7, fv6], normal: [0, 1, 0] });
  frontTriangles.push({ vertices: [fv0, fv4, fv7], normal: [-1, 0, 0] });
  frontTriangles.push({ vertices: [fv0, fv7, fv3], normal: [-1, 0, 0] });
  frontTriangles.push({ vertices: [fv1, fv2, fv6], normal: [1, 0, 0] });
  frontTriangles.push({ vertices: [fv1, fv6, fv5], normal: [1, 0, 0] });
  
  // Front shell rim (raised edge for sandwich connection)
  const fr0: [number, number, number] = [minX, minY, z + shellThickness];
  const fr1: [number, number, number] = [maxX, minY, z + shellThickness];
  const fr2: [number, number, number] = [maxX, maxY, z + shellThickness];
  const fr3: [number, number, number] = [minX, maxY, z + shellThickness];
  const rimInset = 3;
  const fr4: [number, number, number] = [minX + rimInset, minY + rimInset, z + shellThickness];
  const fr5: [number, number, number] = [maxX - rimInset, minY + rimInset, z + shellThickness];
  const fr6: [number, number, number] = [maxX - rimInset, maxY - rimInset, z + shellThickness];
  const fr7: [number, number, number] = [minX + rimInset, maxY - rimInset, z + shellThickness];
  const fr8: [number, number, number] = [minX, minY, z + shellThickness + rimHeight];
  const fr9: [number, number, number] = [maxX, minY, z + shellThickness + rimHeight];
  const fr10: [number, number, number] = [maxX, maxY, z + shellThickness + rimHeight];
  const fr11: [number, number, number] = [minX, maxY, z + shellThickness + rimHeight];
  
  // Rim outer walls
  frontTriangles.push({ vertices: [fr0, fr1, fr9], normal: [0, -1, 0] });
  frontTriangles.push({ vertices: [fr0, fr9, fr8], normal: [0, -1, 0] });
  frontTriangles.push({ vertices: [fr2, fr3, fr11], normal: [0, 1, 0] });
  frontTriangles.push({ vertices: [fr2, fr11, fr10], normal: [0, 1, 0] });
  frontTriangles.push({ vertices: [fr0, fr8, fr11], normal: [-1, 0, 0] });
  frontTriangles.push({ vertices: [fr0, fr11, fr3], normal: [-1, 0, 0] });
  frontTriangles.push({ vertices: [fr1, fr2, fr10], normal: [1, 0, 0] });
  frontTriangles.push({ vertices: [fr1, fr10, fr9], normal: [1, 0, 0] });
  
  // Rim top
  frontTriangles.push({ vertices: [fr8, fr9, fr10], normal: [0, 0, 1] });
  frontTriangles.push({ vertices: [fr8, fr10, fr11], normal: [0, 0, 1] });
  
  // EMBOSSED CHANNEL GROOVE in front shell (for EL wire)
  if (settings.embossedShape) {
    for (let i = 0; i < shapePath.length - 1; i++) {
      const p1 = shapePath[i];
      const p2 = shapePath[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.1) continue;
      
      const nx = -dy / len * channelWidth / 2;
      const ny = dx / len * channelWidth / 2;
      const cz = z + shellThickness;
      
      // Raised channel walls (groove for EL wire to sit in)
      const wallHeight = 1.5;
      const wallWidth = 0.8;
      
      // Left wall
      const lw0: [number, number, number] = [p1.x - nx - wallWidth, p1.y - ny, cz];
      const lw1: [number, number, number] = [p1.x - nx, p1.y - ny, cz];
      const lw2: [number, number, number] = [p2.x - nx, p2.y - ny, cz];
      const lw3: [number, number, number] = [p2.x - nx - wallWidth, p2.y - ny, cz];
      const lw4: [number, number, number] = [p1.x - nx - wallWidth, p1.y - ny, cz + wallHeight];
      const lw5: [number, number, number] = [p1.x - nx, p1.y - ny, cz + wallHeight];
      const lw6: [number, number, number] = [p2.x - nx, p2.y - ny, cz + wallHeight];
      const lw7: [number, number, number] = [p2.x - nx - wallWidth, p2.y - ny, cz + wallHeight];
      
      frontTriangles.push({ vertices: [lw4, lw5, lw6], normal: [0, 0, 1] });
      frontTriangles.push({ vertices: [lw4, lw6, lw7], normal: [0, 0, 1] });
      frontTriangles.push({ vertices: [lw0, lw4, lw7], normal: calculateNormal(lw0, lw4, lw7) });
      frontTriangles.push({ vertices: [lw0, lw7, lw3], normal: calculateNormal(lw0, lw7, lw3) });
      frontTriangles.push({ vertices: [lw1, lw2, lw6], normal: calculateNormal(lw1, lw2, lw6) });
      frontTriangles.push({ vertices: [lw1, lw6, lw5], normal: calculateNormal(lw1, lw6, lw5) });
      
      // Right wall
      const rw0: [number, number, number] = [p1.x + nx, p1.y + ny, cz];
      const rw1: [number, number, number] = [p1.x + nx + wallWidth, p1.y + ny, cz];
      const rw2: [number, number, number] = [p2.x + nx + wallWidth, p2.y + ny, cz];
      const rw3: [number, number, number] = [p2.x + nx, p2.y + ny, cz];
      const rw4: [number, number, number] = [p1.x + nx, p1.y + ny, cz + wallHeight];
      const rw5: [number, number, number] = [p1.x + nx + wallWidth, p1.y + ny, cz + wallHeight];
      const rw6: [number, number, number] = [p2.x + nx + wallWidth, p2.y + ny, cz + wallHeight];
      const rw7: [number, number, number] = [p2.x + nx, p2.y + ny, cz + wallHeight];
      
      frontTriangles.push({ vertices: [rw4, rw5, rw6], normal: [0, 0, 1] });
      frontTriangles.push({ vertices: [rw4, rw6, rw7], normal: [0, 0, 1] });
      frontTriangles.push({ vertices: [rw0, rw4, rw7], normal: calculateNormal(rw0, rw4, rw7) });
      frontTriangles.push({ vertices: [rw0, rw7, rw3], normal: calculateNormal(rw0, rw7, rw3) });
      frontTriangles.push({ vertices: [rw1, rw2, rw6], normal: calculateNormal(rw1, rw2, rw6) });
      frontTriangles.push({ vertices: [rw1, rw6, rw5], normal: calculateNormal(rw1, rw6, rw5) });
    }
  }
  
  // === BACK SHELL (flat lid that snaps on) ===
  const bz = z + shellThickness + rimHeight;
  const bv0: [number, number, number] = [minX, minY, bz];
  const bv1: [number, number, number] = [maxX, minY, bz];
  const bv2: [number, number, number] = [maxX, maxY, bz];
  const bv3: [number, number, number] = [minX, maxY, bz];
  const bv4: [number, number, number] = [minX, minY, bz + shellThickness];
  const bv5: [number, number, number] = [maxX, minY, bz + shellThickness];
  const bv6: [number, number, number] = [maxX, maxY, bz + shellThickness];
  const bv7: [number, number, number] = [minX, maxY, bz + shellThickness];
  
  // Back shell base
  backTriangles.push({ vertices: [bv0, bv2, bv1], normal: [0, 0, -1] });
  backTriangles.push({ vertices: [bv0, bv3, bv2], normal: [0, 0, -1] });
  backTriangles.push({ vertices: [bv4, bv5, bv6], normal: [0, 0, 1] });
  backTriangles.push({ vertices: [bv4, bv6, bv7], normal: [0, 0, 1] });
  backTriangles.push({ vertices: [bv0, bv1, bv5], normal: [0, -1, 0] });
  backTriangles.push({ vertices: [bv0, bv5, bv4], normal: [0, -1, 0] });
  backTriangles.push({ vertices: [bv2, bv3, bv7], normal: [0, 1, 0] });
  backTriangles.push({ vertices: [bv2, bv7, bv6], normal: [0, 1, 0] });
  backTriangles.push({ vertices: [bv0, bv4, bv7], normal: [-1, 0, 0] });
  backTriangles.push({ vertices: [bv0, bv7, bv3], normal: [-1, 0, 0] });
  backTriangles.push({ vertices: [bv1, bv2, bv6], normal: [1, 0, 0] });
  backTriangles.push({ vertices: [bv1, bv6, bv5], normal: [1, 0, 0] });
  
  return { front: frontTriangles, back: backTriangles };
}

function generateDiffuserPanel(
  shapePath: Point2D[],
  settings: FilamentShapeSettings
): Triangle[] {
  const triangles: Triangle[] = [];
  const padding = 5;
  const thickness = settings.diffuserThickness;
  const z = settings.clipHeight + settings.diffuserOffset;
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of shapePath) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;
  
  const v0: [number, number, number] = [minX, minY, z];
  const v1: [number, number, number] = [maxX, minY, z];
  const v2: [number, number, number] = [maxX, maxY, z];
  const v3: [number, number, number] = [minX, maxY, z];
  const v4: [number, number, number] = [minX, minY, z + thickness];
  const v5: [number, number, number] = [maxX, minY, z + thickness];
  const v6: [number, number, number] = [maxX, maxY, z + thickness];
  const v7: [number, number, number] = [minX, maxY, z + thickness];
  
  triangles.push({ vertices: [v0, v2, v1], normal: [0, 0, -1] });
  triangles.push({ vertices: [v0, v3, v2], normal: [0, 0, -1] });
  triangles.push({ vertices: [v4, v5, v6], normal: [0, 0, 1] });
  triangles.push({ vertices: [v4, v6, v7], normal: [0, 0, 1] });
  triangles.push({ vertices: [v0, v1, v5], normal: [0, -1, 0] });
  triangles.push({ vertices: [v0, v5, v4], normal: [0, -1, 0] });
  triangles.push({ vertices: [v2, v3, v7], normal: [0, 1, 0] });
  triangles.push({ vertices: [v2, v7, v6], normal: [0, 1, 0] });
  triangles.push({ vertices: [v0, v4, v7], normal: [-1, 0, 0] });
  triangles.push({ vertices: [v0, v7, v3], normal: [-1, 0, 0] });
  triangles.push({ vertices: [v1, v2, v6], normal: [1, 0, 0] });
  triangles.push({ vertices: [v1, v6, v5], normal: [1, 0, 0] });
  
  if (settings.embossedShape) {
    const embossHeight = 0.8;
    const embossWidth = 1.5;
    
    for (let i = 0; i < shapePath.length - 1; i++) {
      const p1 = shapePath[i];
      const p2 = shapePath[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.1) continue;
      
      const nx = -dy / len * embossWidth / 2;
      const ny = dx / len * embossWidth / 2;
      
      const ez = z + thickness;
      const ezTop = ez + embossHeight;
      
      // Raised segment
      const s0: [number, number, number] = [p1.x - nx, p1.y - ny, ez];
      const s1: [number, number, number] = [p1.x + nx, p1.y + ny, ez];
      const s2: [number, number, number] = [p2.x + nx, p2.y + ny, ez];
      const s3: [number, number, number] = [p2.x - nx, p2.y - ny, ez];
      const s4: [number, number, number] = [p1.x - nx, p1.y - ny, ezTop];
      const s5: [number, number, number] = [p1.x + nx, p1.y + ny, ezTop];
      const s6: [number, number, number] = [p2.x + nx, p2.y + ny, ezTop];
      const s7: [number, number, number] = [p2.x - nx, p2.y - ny, ezTop];
      
      // Top
      triangles.push({ vertices: [s4, s5, s6], normal: [0, 0, 1] });
      triangles.push({ vertices: [s4, s6, s7], normal: [0, 0, 1] });
      
      // Sides
      triangles.push({ vertices: [s0, s3, s7], normal: calculateNormal(s0, s3, s7) });
      triangles.push({ vertices: [s0, s7, s4], normal: calculateNormal(s0, s7, s4) });
      
      triangles.push({ vertices: [s1, s5, s6], normal: calculateNormal(s1, s5, s6) });
      triangles.push({ vertices: [s1, s6, s2], normal: calculateNormal(s1, s6, s2) });
    }
  }
  
  return triangles;
}

// Generate dimmer housing with toggle switch and/or dial potentiometer mounting
function generateDimmerHousing(settings: FilamentShapeSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Housing dimensions
  const housingWidth = 50;
  const housingDepth = 30;
  const housingHeight = 15;
  const wallThickness = 2;
  
  // Create bottom of housing
  const bx0 = -housingWidth / 2;
  const bx1 = housingWidth / 2;
  const by0 = -housingDepth / 2;
  const by1 = housingDepth / 2;
  
  // Bottom face
  const b0: [number, number, number] = [bx0, by0, 0];
  const b1: [number, number, number] = [bx1, by0, 0];
  const b2: [number, number, number] = [bx1, by1, 0];
  const b3: [number, number, number] = [bx0, by1, 0];
  triangles.push({ vertices: [b0, b2, b1], normal: [0, 0, -1] });
  triangles.push({ vertices: [b0, b3, b2], normal: [0, 0, -1] });
  
  // Create walls (outer)
  const t0: [number, number, number] = [bx0, by0, housingHeight];
  const t1: [number, number, number] = [bx1, by0, housingHeight];
  const t2: [number, number, number] = [bx1, by1, housingHeight];
  const t3: [number, number, number] = [bx0, by1, housingHeight];
  
  // Front wall
  triangles.push({ vertices: [b0, b1, t1], normal: [0, -1, 0] });
  triangles.push({ vertices: [b0, t1, t0], normal: [0, -1, 0] });
  // Back wall
  triangles.push({ vertices: [b2, b3, t3], normal: [0, 1, 0] });
  triangles.push({ vertices: [b2, t3, t2], normal: [0, 1, 0] });
  // Left wall
  triangles.push({ vertices: [b0, t0, t3], normal: [-1, 0, 0] });
  triangles.push({ vertices: [b0, t3, b3], normal: [-1, 0, 0] });
  // Right wall
  triangles.push({ vertices: [b1, b2, t2], normal: [1, 0, 0] });
  triangles.push({ vertices: [b1, t2, t1], normal: [1, 0, 0] });
  
  // Create inner cavity by offsetting walls inward
  const ix0 = bx0 + wallThickness;
  const ix1 = bx1 - wallThickness;
  const iy0 = by0 + wallThickness;
  const iy1 = by1 - wallThickness;
  const innerFloor = wallThickness;
  
  // Inner floor (inside the housing)
  const i0: [number, number, number] = [ix0, iy0, innerFloor];
  const i1: [number, number, number] = [ix1, iy0, innerFloor];
  const i2: [number, number, number] = [ix1, iy1, innerFloor];
  const i3: [number, number, number] = [ix0, iy1, innerFloor];
  triangles.push({ vertices: [i0, i1, i2], normal: [0, 0, 1] });
  triangles.push({ vertices: [i0, i2, i3], normal: [0, 0, 1] });
  
  // Inner walls
  const it0: [number, number, number] = [ix0, iy0, housingHeight];
  const it1: [number, number, number] = [ix1, iy0, housingHeight];
  const it2: [number, number, number] = [ix1, iy1, housingHeight];
  const it3: [number, number, number] = [ix0, iy1, housingHeight];
  
  // Inner front wall
  triangles.push({ vertices: [i1, i0, it0], normal: [0, 1, 0] });
  triangles.push({ vertices: [i1, it0, it1], normal: [0, 1, 0] });
  // Inner back wall
  triangles.push({ vertices: [i3, i2, it2], normal: [0, -1, 0] });
  triangles.push({ vertices: [i3, it2, it3], normal: [0, -1, 0] });
  // Inner left wall
  triangles.push({ vertices: [i3, it3, it0], normal: [1, 0, 0] });
  triangles.push({ vertices: [i3, it0, i0], normal: [1, 0, 0] });
  // Inner right wall
  triangles.push({ vertices: [i2, i1, it1], normal: [-1, 0, 0] });
  triangles.push({ vertices: [i2, it1, it2], normal: [-1, 0, 0] });
  
  // Top rim (connects outer and inner top edges)
  // Front rim
  triangles.push({ vertices: [t0, t1, it1], normal: [0, 0, 1] });
  triangles.push({ vertices: [t0, it1, it0], normal: [0, 0, 1] });
  // Back rim  
  triangles.push({ vertices: [t3, it3, it2], normal: [0, 0, 1] });
  triangles.push({ vertices: [t3, it2, t2], normal: [0, 0, 1] });
  // Left rim
  triangles.push({ vertices: [t0, it0, it3], normal: [0, 0, 1] });
  triangles.push({ vertices: [t0, it3, t3], normal: [0, 0, 1] });
  // Right rim
  triangles.push({ vertices: [t1, t2, it2], normal: [0, 0, 1] });
  triangles.push({ vertices: [t1, it2, it1], normal: [0, 0, 1] });
  
  // Add mounting holes pattern for toggle switch and potentiometer
  // These would be cutouts in actual manufacturing but we add raised bosses for 3D printing
  const potHoleRadius = 3.5; // 7mm hole for 6mm potentiometer shaft
  const toggleHoleWidth = 6;
  const toggleHoleHeight = 4;
  
  // Add boss for potentiometer (on top center-left)
  const potX = -housingWidth / 4;
  const potY = 0;
  const bossHeight = 3;
  const segments = 16;
  
  for (let j = 0; j < segments; j++) {
    const a1 = (j / segments) * Math.PI * 2;
    const a2 = ((j + 1) / segments) * Math.PI * 2;
    const x1 = potX + Math.cos(a1) * potHoleRadius;
    const y1 = potY + Math.sin(a1) * potHoleRadius;
    const x2 = potX + Math.cos(a2) * potHoleRadius;
    const y2 = potY + Math.sin(a2) * potHoleRadius;
    
    const v0: [number, number, number] = [potX, potY, housingHeight];
    const v1: [number, number, number] = [x1, y1, housingHeight];
    const v2: [number, number, number] = [x2, y2, housingHeight];
    const v3: [number, number, number] = [potX, potY, housingHeight + bossHeight];
    const v4: [number, number, number] = [x1, y1, housingHeight + bossHeight];
    const v5: [number, number, number] = [x2, y2, housingHeight + bossHeight];
    
    // Boss top
    triangles.push({ vertices: [v3, v5, v4], normal: [0, 0, 1] });
    // Boss sides
    triangles.push({ vertices: [v1, v4, v5], normal: [(x1 + x2) / 2 - potX, (y1 + y2) / 2 - potY, 0] });
    triangles.push({ vertices: [v1, v5, v2], normal: [(x1 + x2) / 2 - potX, (y1 + y2) / 2 - potY, 0] });
  }
  
  // Add rectangular boss for toggle switch (on top center-right)
  const toggleX = housingWidth / 4;
  const toggleY = 0;
  const tw = toggleHoleWidth / 2;
  const th = toggleHoleHeight / 2;
  
  const tw0: [number, number, number] = [toggleX - tw, toggleY - th, housingHeight];
  const tw1: [number, number, number] = [toggleX + tw, toggleY - th, housingHeight];
  const tw2: [number, number, number] = [toggleX + tw, toggleY + th, housingHeight];
  const tw3: [number, number, number] = [toggleX - tw, toggleY + th, housingHeight];
  const tw4: [number, number, number] = [toggleX - tw, toggleY - th, housingHeight + bossHeight];
  const tw5: [number, number, number] = [toggleX + tw, toggleY - th, housingHeight + bossHeight];
  const tw6: [number, number, number] = [toggleX + tw, toggleY + th, housingHeight + bossHeight];
  const tw7: [number, number, number] = [toggleX - tw, toggleY + th, housingHeight + bossHeight];
  
  // Toggle boss top
  triangles.push({ vertices: [tw4, tw5, tw6], normal: [0, 0, 1] });
  triangles.push({ vertices: [tw4, tw6, tw7], normal: [0, 0, 1] });
  // Toggle boss sides
  triangles.push({ vertices: [tw0, tw1, tw5], normal: [0, -1, 0] });
  triangles.push({ vertices: [tw0, tw5, tw4], normal: [0, -1, 0] });
  triangles.push({ vertices: [tw2, tw3, tw7], normal: [0, 1, 0] });
  triangles.push({ vertices: [tw2, tw7, tw6], normal: [0, 1, 0] });
  triangles.push({ vertices: [tw0, tw4, tw7], normal: [-1, 0, 0] });
  triangles.push({ vertices: [tw0, tw7, tw3], normal: [-1, 0, 0] });
  triangles.push({ vertices: [tw1, tw2, tw6], normal: [1, 0, 0] });
  triangles.push({ vertices: [tw1, tw6, tw5], normal: [1, 0, 0] });
  
  return triangles;
}

// Generate dial knob for potentiometer
function generateDimmerDial(): Triangle[] {
  const triangles: Triangle[] = [];
  
  const dialRadius = 10;
  const dialHeight = 8;
  const shaftRadius = 3;
  const shaftDepth = 6;
  const gripRadius = dialRadius - 1;
  const segments = 24;
  
  // Dial body - cylinder
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const x1 = Math.cos(a1) * dialRadius;
    const y1 = Math.sin(a1) * dialRadius;
    const x2 = Math.cos(a2) * dialRadius;
    const y2 = Math.sin(a2) * dialRadius;
    
    // Bottom face (with center hole for shaft)
    const b0: [number, number, number] = [0, 0, 0];
    const b1: [number, number, number] = [x1, y1, 0];
    const b2: [number, number, number] = [x2, y2, 0];
    triangles.push({ vertices: [b0, b2, b1], normal: [0, 0, -1] });
    
    // Top face
    const t0: [number, number, number] = [0, 0, dialHeight];
    const t1: [number, number, number] = [x1, y1, dialHeight];
    const t2: [number, number, number] = [x2, y2, dialHeight];
    triangles.push({ vertices: [t0, t1, t2], normal: [0, 0, 1] });
    
    // Side faces
    const s0: [number, number, number] = [x1, y1, 0];
    const s1: [number, number, number] = [x2, y2, 0];
    const s2: [number, number, number] = [x2, y2, dialHeight];
    const s3: [number, number, number] = [x1, y1, dialHeight];
    
    const nx = (x1 + x2) / 2;
    const ny = (y1 + y2) / 2;
    const len = Math.sqrt(nx * nx + ny * ny);
    
    triangles.push({ vertices: [s0, s1, s2], normal: [nx / len, ny / len, 0] });
    triangles.push({ vertices: [s0, s2, s3], normal: [nx / len, ny / len, 0] });
  }
  
  // Add position indicator (raised line on top)
  const indicatorLength = dialRadius * 0.7;
  const indicatorWidth = 1.5;
  const indicatorHeight = 1.5;
  
  const ind0: [number, number, number] = [-indicatorWidth / 2, 0, dialHeight];
  const ind1: [number, number, number] = [indicatorWidth / 2, 0, dialHeight];
  const ind2: [number, number, number] = [indicatorWidth / 2, indicatorLength, dialHeight];
  const ind3: [number, number, number] = [-indicatorWidth / 2, indicatorLength, dialHeight];
  const ind4: [number, number, number] = [-indicatorWidth / 2, 0, dialHeight + indicatorHeight];
  const ind5: [number, number, number] = [indicatorWidth / 2, 0, dialHeight + indicatorHeight];
  const ind6: [number, number, number] = [indicatorWidth / 2, indicatorLength, dialHeight + indicatorHeight];
  const ind7: [number, number, number] = [-indicatorWidth / 2, indicatorLength, dialHeight + indicatorHeight];
  
  // Indicator top
  triangles.push({ vertices: [ind4, ind5, ind6], normal: [0, 0, 1] });
  triangles.push({ vertices: [ind4, ind6, ind7], normal: [0, 0, 1] });
  // Indicator sides
  triangles.push({ vertices: [ind0, ind1, ind5], normal: [0, -1, 0] });
  triangles.push({ vertices: [ind0, ind5, ind4], normal: [0, -1, 0] });
  triangles.push({ vertices: [ind2, ind3, ind7], normal: [0, 1, 0] });
  triangles.push({ vertices: [ind2, ind7, ind6], normal: [0, 1, 0] });
  triangles.push({ vertices: [ind0, ind4, ind7], normal: [-1, 0, 0] });
  triangles.push({ vertices: [ind0, ind7, ind3], normal: [-1, 0, 0] });
  triangles.push({ vertices: [ind1, ind2, ind6], normal: [1, 0, 0] });
  triangles.push({ vertices: [ind1, ind6, ind5], normal: [1, 0, 0] });
  
  return triangles;
}

// Edison screw thread specifications (mm)
const threadSpecs: Record<string, { majorDia: number; pitch: number; threads: number }> = {
  E26: { majorDia: 26, pitch: 3.629, threads: 5 }, // Standard US Edison
  E27: { majorDia: 27, pitch: 3.629, threads: 5 }, // European Edison
  E14: { majorDia: 14, pitch: 2.822, threads: 4 }, // Small Edison
  E12: { majorDia: 12, pitch: 2.117, threads: 4 }, // Candelabra
  none: { majorDia: 26, pitch: 0, threads: 0 },
};

// Mason jar thread specifications (internal threads - jar screws INTO the base)
const jarSpecs: Record<string, { innerDia: number; outerDia: number; pitch: number; threads: number }> = {
  regular: { innerDia: 70, outerDia: 86, pitch: 4.5, threads: 3 },   // Regular mouth (70mm / 2.75")
  wide: { innerDia: 86, outerDia: 102, pitch: 4.5, threads: 3 },     // Wide mouth (86mm / 3.38")
  small: { innerDia: 50, outerDia: 64, pitch: 3.5, threads: 3 },     // Small jar (50mm)
  custom: { innerDia: 70, outerDia: 86, pitch: 4.5, threads: 3 },    // Defaults to regular
  none: { innerDia: 70, outerDia: 86, pitch: 0, threads: 0 },
};

function generateScrewThreadBase(settings: FilamentShapeSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  const threadType = settings.screwThreadType || "E26";
  const spec = threadSpecs[threadType] || threadSpecs.E26;
  const baseHeight = settings.screwBaseHeight || 25;
  const baseDiameter = settings.screwBaseDiameter || 40;
  const wireChannelDia = settings.wireChannelDiameter || 3;
  const includeWireChannel = settings.includeWireChannel !== false;
  
  const outerRadius = baseDiameter / 2;
  const threadMajorRadius = spec.majorDia / 2;
  const threadMinorRadius = threadMajorRadius - 0.8; // Thread depth
  const threadHeight = spec.pitch * spec.threads;
  const segments = 48;
  const threadSegments = 72;
  const wireChannelRadius = wireChannelDia / 2;
  
  // Generate main cylindrical base body
  const bodyBottomZ = 0;
  // Ensure bodyTopZ is at least 5mm above bottom to prevent inverted geometry
  const bodyTopZ = Math.max(5, baseHeight - threadHeight);
  
  // Outer cylinder (body below threads)
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const x1 = outerRadius * Math.cos(angle1);
    const y1 = outerRadius * Math.sin(angle1);
    const x2 = outerRadius * Math.cos(angle2);
    const y2 = outerRadius * Math.sin(angle2);
    
    // Bottom face (with wire channel hole if enabled)
    // Use radius comparison, not diameter
    const distFromCenter = Math.sqrt(x1*x1 + y1*y1);
    
    if (!includeWireChannel) {
      // Solid bottom - no hole
      const b0: [number, number, number] = [0, 0, bodyBottomZ];
      const b1: [number, number, number] = [x2, y2, bodyBottomZ];
      const b2: [number, number, number] = [x1, y1, bodyBottomZ];
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
    } else if (distFromCenter > wireChannelRadius + 0.5) {
      // Annular bottom face around wire channel hole
      const b0: [number, number, number] = [
        wireChannelRadius * Math.cos((i / segments) * Math.PI * 2),
        wireChannelRadius * Math.sin((i / segments) * Math.PI * 2),
        bodyBottomZ
      ];
      const b1: [number, number, number] = [x2, y2, bodyBottomZ];
      const b2: [number, number, number] = [x1, y1, bodyBottomZ];
      const b3: [number, number, number] = [
        wireChannelRadius * Math.cos(((i + 1) / segments) * Math.PI * 2),
        wireChannelRadius * Math.sin(((i + 1) / segments) * Math.PI * 2),
        bodyBottomZ
      ];
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
      triangles.push({ vertices: [b0, b3, b1], normal: [0, 0, -1] });
    }
    
    // Side faces
    const s0: [number, number, number] = [x1, y1, bodyBottomZ];
    const s1: [number, number, number] = [x2, y2, bodyBottomZ];
    const s2: [number, number, number] = [x2, y2, bodyTopZ];
    const s3: [number, number, number] = [x1, y1, bodyTopZ];
    
    const nx = (x1 + x2) / 2;
    const ny = (y1 + y2) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    
    triangles.push({ vertices: [s0, s1, s2], normal: [nx / nlen, ny / nlen, 0] });
    triangles.push({ vertices: [s0, s2, s3], normal: [nx / nlen, ny / nlen, 0] });
  }
  
  // Generate screw threads (helical ridge)
  if (spec.threads > 0) {
    const threadStartZ = bodyTopZ;
    const turnsPerSegment = spec.threads / threadSegments;
    
    for (let i = 0; i < threadSegments; i++) {
      const t1 = i / threadSegments;
      const t2 = (i + 1) / threadSegments;
      
      const angle1 = t1 * Math.PI * 2 * spec.threads;
      const angle2 = t2 * Math.PI * 2 * spec.threads;
      
      const z1 = threadStartZ + t1 * threadHeight;
      const z2 = threadStartZ + t2 * threadHeight;
      
      // Thread peak
      const px1 = threadMajorRadius * Math.cos(angle1);
      const py1 = threadMajorRadius * Math.sin(angle1);
      const px2 = threadMajorRadius * Math.cos(angle2);
      const py2 = threadMajorRadius * Math.sin(angle2);
      
      // Thread valley
      const vx1 = threadMinorRadius * Math.cos(angle1);
      const vy1 = threadMinorRadius * Math.sin(angle1);
      const vx2 = threadMinorRadius * Math.cos(angle2);
      const vy2 = threadMinorRadius * Math.sin(angle2);
      
      const halfPitch = spec.pitch / 2;
      
      // Thread profile triangles (simplified V-thread)
      const tp0: [number, number, number] = [vx1, vy1, z1];
      const tp1: [number, number, number] = [px1, py1, z1 + halfPitch / 2];
      const tp2: [number, number, number] = [vx1, vy1, z1 + halfPitch];
      const tp3: [number, number, number] = [vx2, vy2, z2];
      const tp4: [number, number, number] = [px2, py2, z2 + halfPitch / 2];
      const tp5: [number, number, number] = [vx2, vy2, z2 + halfPitch];
      
      // Connect thread segments
      triangles.push({ vertices: [tp0, tp1, tp4], normal: calculateNormal(tp0, tp1, tp4) });
      triangles.push({ vertices: [tp0, tp4, tp3], normal: calculateNormal(tp0, tp4, tp3) });
      triangles.push({ vertices: [tp1, tp2, tp5], normal: calculateNormal(tp1, tp2, tp5) });
      triangles.push({ vertices: [tp1, tp5, tp4], normal: calculateNormal(tp1, tp5, tp4) });
    }
    
    // Cylindrical core through thread section
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      const x1 = threadMinorRadius * Math.cos(angle1);
      const y1 = threadMinorRadius * Math.sin(angle1);
      const x2 = threadMinorRadius * Math.cos(angle2);
      const y2 = threadMinorRadius * Math.sin(angle2);
      
      const c0: [number, number, number] = [x1, y1, threadStartZ];
      const c1: [number, number, number] = [x2, y2, threadStartZ];
      const c2: [number, number, number] = [x2, y2, threadStartZ + threadHeight];
      const c3: [number, number, number] = [x1, y1, threadStartZ + threadHeight];
      
      const nx = (x1 + x2) / 2;
      const ny = (y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [c0, c1, c2], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [c0, c2, c3], normal: [nx / nlen, ny / nlen, 0] });
    }
  }
  
  // Generate wire channel through center
  if (includeWireChannel) {
    const channelRadius = wireChannelDia / 2;
    const channelSegments = 16;
    
    for (let i = 0; i < channelSegments; i++) {
      const angle1 = (i / channelSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / channelSegments) * Math.PI * 2;
      
      const x1 = channelRadius * Math.cos(angle1);
      const y1 = channelRadius * Math.sin(angle1);
      const x2 = channelRadius * Math.cos(angle2);
      const y2 = channelRadius * Math.sin(angle2);
      
      // Inner channel wall (negative normal = inward facing)
      const ch0: [number, number, number] = [x1, y1, 0];
      const ch1: [number, number, number] = [x2, y2, 0];
      const ch2: [number, number, number] = [x2, y2, baseHeight];
      const ch3: [number, number, number] = [x1, y1, baseHeight];
      
      const nx = -(x1 + x2) / 2;
      const ny = -(y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [ch0, ch2, ch1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [ch0, ch3, ch2], normal: [nx / nlen, ny / nlen, 0] });
    }
  }
  
  // Generate top platform with filament mounting posts
  const platformZ = baseHeight;
  const postHeight = settings.filamentPostHeight || 30;
  const postCount = settings.filamentPostCount || 3;
  const postRadius = 2;
  const postSpacing = (baseDiameter - 10) / 2; // Spread posts across base
  
  // Top face of base - solid disk or annular ring depending on wire channel
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const ox1 = (threadMinorRadius - 1) * Math.cos(angle1);
    const oy1 = (threadMinorRadius - 1) * Math.sin(angle1);
    const ox2 = (threadMinorRadius - 1) * Math.cos(angle2);
    const oy2 = (threadMinorRadius - 1) * Math.sin(angle2);
    
    if (includeWireChannel) {
      // Annular ring around wire channel
      const ix1 = (wireChannelRadius + 1) * Math.cos(angle1);
      const iy1 = (wireChannelRadius + 1) * Math.sin(angle1);
      const ix2 = (wireChannelRadius + 1) * Math.cos(angle2);
      const iy2 = (wireChannelRadius + 1) * Math.sin(angle2);
      
      const top0: [number, number, number] = [ox1, oy1, platformZ];
      const top1: [number, number, number] = [ox2, oy2, platformZ];
      const top2: [number, number, number] = [ix2, iy2, platformZ];
      const top3: [number, number, number] = [ix1, iy1, platformZ];
      
      triangles.push({ vertices: [top0, top1, top2], normal: [0, 0, 1] });
      triangles.push({ vertices: [top0, top2, top3], normal: [0, 0, 1] });
    } else {
      // Solid disk (no wire channel hole)
      const top0: [number, number, number] = [0, 0, platformZ];
      const top1: [number, number, number] = [ox1, oy1, platformZ];
      const top2: [number, number, number] = [ox2, oy2, platformZ];
      
      triangles.push({ vertices: [top0, top1, top2], normal: [0, 0, 1] });
    }
  }
  
  // Generate mounting posts around center
  for (let p = 0; p < postCount; p++) {
    const postAngle = (p / postCount) * Math.PI * 2;
    const postX = Math.cos(postAngle) * postSpacing * 0.5;
    const postY = Math.sin(postAngle) * postSpacing * 0.5;
    const postSegments = 12;
    
    for (let i = 0; i < postSegments; i++) {
      const a1 = (i / postSegments) * Math.PI * 2;
      const a2 = ((i + 1) / postSegments) * Math.PI * 2;
      
      const px1 = postX + postRadius * Math.cos(a1);
      const py1 = postY + postRadius * Math.sin(a1);
      const px2 = postX + postRadius * Math.cos(a2);
      const py2 = postY + postRadius * Math.sin(a2);
      
      // Post sides
      const ps0: [number, number, number] = [px1, py1, platformZ];
      const ps1: [number, number, number] = [px2, py2, platformZ];
      const ps2: [number, number, number] = [px2, py2, platformZ + postHeight];
      const ps3: [number, number, number] = [px1, py1, platformZ + postHeight];
      
      const pnx = Math.cos(a1 + (a2 - a1) / 2);
      const pny = Math.sin(a1 + (a2 - a1) / 2);
      
      triangles.push({ vertices: [ps0, ps1, ps2], normal: [pnx, pny, 0] });
      triangles.push({ vertices: [ps0, ps2, ps3], normal: [pnx, pny, 0] });
      
      // Post top
      const pt0: [number, number, number] = [postX, postY, platformZ + postHeight];
      const pt1: [number, number, number] = [px1, py1, platformZ + postHeight];
      const pt2: [number, number, number] = [px2, py2, platformZ + postHeight];
      
      triangles.push({ vertices: [pt0, pt1, pt2], normal: [0, 0, 1] });
      
      // U-channel clip on top of each post for filament
      const clipWidth = settings.clipWidth;
      const clipHeight = settings.clipHeight;
      const clipDepth = settings.filamentDiameter + 1;
      const clipWall = settings.wallThickness;
      const clipZ = platformZ + postHeight;
      
      // Generate simple U-channel on top
      if (i === 0) { // Only once per post
        const chw = clipWidth / 2;
        const chd = clipDepth / 2;
        
        // Left wall of U
        const ul0: [number, number, number] = [postX - chw - clipWall, postY - chd, clipZ];
        const ul1: [number, number, number] = [postX - chw, postY - chd, clipZ];
        const ul2: [number, number, number] = [postX - chw, postY + chd, clipZ];
        const ul3: [number, number, number] = [postX - chw - clipWall, postY + chd, clipZ];
        const ul4: [number, number, number] = [postX - chw - clipWall, postY - chd, clipZ + clipHeight];
        const ul5: [number, number, number] = [postX - chw, postY - chd, clipZ + clipHeight];
        const ul6: [number, number, number] = [postX - chw, postY + chd, clipZ + clipHeight];
        const ul7: [number, number, number] = [postX - chw - clipWall, postY + chd, clipZ + clipHeight];
        
        // Add left wall faces
        triangles.push({ vertices: [ul0, ul1, ul5], normal: [0, -1, 0] });
        triangles.push({ vertices: [ul0, ul5, ul4], normal: [0, -1, 0] });
        triangles.push({ vertices: [ul2, ul3, ul7], normal: [0, 1, 0] });
        triangles.push({ vertices: [ul2, ul7, ul6], normal: [0, 1, 0] });
        triangles.push({ vertices: [ul0, ul3, ul7], normal: [-1, 0, 0] });
        triangles.push({ vertices: [ul0, ul7, ul4], normal: [-1, 0, 0] });
        triangles.push({ vertices: [ul1, ul2, ul6], normal: [1, 0, 0] });
        triangles.push({ vertices: [ul1, ul6, ul5], normal: [1, 0, 0] });
        triangles.push({ vertices: [ul4, ul5, ul6], normal: [0, 0, 1] });
        triangles.push({ vertices: [ul4, ul6, ul7], normal: [0, 0, 1] });
        
        // Right wall of U (mirrored)
        const ur0: [number, number, number] = [postX + chw, postY - chd, clipZ];
        const ur1: [number, number, number] = [postX + chw + clipWall, postY - chd, clipZ];
        const ur2: [number, number, number] = [postX + chw + clipWall, postY + chd, clipZ];
        const ur3: [number, number, number] = [postX + chw, postY + chd, clipZ];
        const ur4: [number, number, number] = [postX + chw, postY - chd, clipZ + clipHeight];
        const ur5: [number, number, number] = [postX + chw + clipWall, postY - chd, clipZ + clipHeight];
        const ur6: [number, number, number] = [postX + chw + clipWall, postY + chd, clipZ + clipHeight];
        const ur7: [number, number, number] = [postX + chw, postY + chd, clipZ + clipHeight];
        
        triangles.push({ vertices: [ur0, ur1, ur5], normal: [0, -1, 0] });
        triangles.push({ vertices: [ur0, ur5, ur4], normal: [0, -1, 0] });
        triangles.push({ vertices: [ur2, ur3, ur7], normal: [0, 1, 0] });
        triangles.push({ vertices: [ur2, ur7, ur6], normal: [0, 1, 0] });
        triangles.push({ vertices: [ur0, ur3, ur7], normal: [-1, 0, 0] });
        triangles.push({ vertices: [ur0, ur7, ur4], normal: [-1, 0, 0] });
        triangles.push({ vertices: [ur1, ur2, ur6], normal: [1, 0, 0] });
        triangles.push({ vertices: [ur1, ur6, ur5], normal: [1, 0, 0] });
        triangles.push({ vertices: [ur4, ur5, ur6], normal: [0, 0, 1] });
        triangles.push({ vertices: [ur4, ur6, ur7], normal: [0, 0, 1] });
      }
    }
  }
  
  return triangles;
}

// Generate mason jar base with INTERNAL threads (jar screws INTO the base)
// This is a separate option from the Edison screw base
function generateJarBase(settings: FilamentShapeSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  const jarType = settings.jarThreadType || "regular";
  const spec = jarSpecs[jarType] || jarSpecs.regular;
  const baseHeight = settings.jarBaseHeight || 35;
  const wallThickness = settings.jarBaseWallThickness || 5;
  const wireChannelDia = settings.wireChannelDiameter || 3;
  const includeWireChannel = settings.includeWireChannel !== false;
  
  // Use custom diameter if specified, otherwise use spec
  const innerRadius = (settings.jarDiameter || spec.innerDia) / 2;
  const outerRadius = innerRadius + wallThickness;
  const threadHeight = spec.pitch * spec.threads;
  const threadDepth = 1.5; // Depth of thread grooves
  const segments = 64;
  const threadSegments = 96;
  const wireChannelRadius = wireChannelDia / 2;
  
  // Base section (solid bottom platform where filament posts sit)
  const baseBottomZ = 0;
  const basePlatformZ = 15; // Height of solid base before threads start
  const threadStartZ = basePlatformZ;
  const threadEndZ = threadStartZ + threadHeight;
  const wallTopZ = baseHeight;
  
  // Generate outer cylinder wall (full height)
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const ox1 = outerRadius * Math.cos(angle1);
    const oy1 = outerRadius * Math.sin(angle1);
    const ox2 = outerRadius * Math.cos(angle2);
    const oy2 = outerRadius * Math.sin(angle2);
    
    // Outer wall side faces
    const w0: [number, number, number] = [ox1, oy1, baseBottomZ];
    const w1: [number, number, number] = [ox2, oy2, baseBottomZ];
    const w2: [number, number, number] = [ox2, oy2, wallTopZ];
    const w3: [number, number, number] = [ox1, oy1, wallTopZ];
    
    const nx = (ox1 + ox2) / 2;
    const ny = (oy1 + oy2) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    
    triangles.push({ vertices: [w0, w1, w2], normal: [nx / nlen, ny / nlen, 0] });
    triangles.push({ vertices: [w0, w2, w3], normal: [nx / nlen, ny / nlen, 0] });
    
    // Bottom face (annular ring if wire channel, solid disk if not)
    if (!includeWireChannel) {
      const b0: [number, number, number] = [0, 0, baseBottomZ];
      const b1: [number, number, number] = [ox2, oy2, baseBottomZ];
      const b2: [number, number, number] = [ox1, oy1, baseBottomZ];
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
    } else {
      // Annular bottom with wire channel hole
      const ix1 = wireChannelRadius * Math.cos(angle1);
      const iy1 = wireChannelRadius * Math.sin(angle1);
      const ix2 = wireChannelRadius * Math.cos(angle2);
      const iy2 = wireChannelRadius * Math.sin(angle2);
      
      const b0: [number, number, number] = [ix1, iy1, baseBottomZ];
      const b1: [number, number, number] = [ox2, oy2, baseBottomZ];
      const b2: [number, number, number] = [ox1, oy1, baseBottomZ];
      const b3: [number, number, number] = [ix2, iy2, baseBottomZ];
      
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
      triangles.push({ vertices: [b0, b3, b1], normal: [0, 0, -1] });
    }
    
    // Top rim face (ring between outer wall and inner threaded area)
    const ix1 = innerRadius * Math.cos(angle1);
    const iy1 = innerRadius * Math.sin(angle1);
    const ix2 = innerRadius * Math.cos(angle2);
    const iy2 = innerRadius * Math.sin(angle2);
    
    const t0: [number, number, number] = [ox1, oy1, wallTopZ];
    const t1: [number, number, number] = [ox2, oy2, wallTopZ];
    const t2: [number, number, number] = [ix2, iy2, wallTopZ];
    const t3: [number, number, number] = [ix1, iy1, wallTopZ];
    
    triangles.push({ vertices: [t0, t1, t2], normal: [0, 0, 1] });
    triangles.push({ vertices: [t0, t2, t3], normal: [0, 0, 1] });
  }
  
  // Generate internal threads (helical groove on inside wall)
  if (spec.threads > 0) {
    const threadMinorRadius = innerRadius + threadDepth; // Thread peaks go INTO the wall
    
    for (let i = 0; i < threadSegments; i++) {
      const t1 = i / threadSegments;
      const t2 = (i + 1) / threadSegments;
      
      const angle1 = t1 * Math.PI * 2 * spec.threads;
      const angle2 = t2 * Math.PI * 2 * spec.threads;
      
      const z1 = threadStartZ + t1 * threadHeight;
      const z2 = threadStartZ + t2 * threadHeight;
      
      // Thread valley (at inner radius)
      const vx1 = innerRadius * Math.cos(angle1);
      const vy1 = innerRadius * Math.sin(angle1);
      const vx2 = innerRadius * Math.cos(angle2);
      const vy2 = innerRadius * Math.sin(angle2);
      
      // Thread peak (extends into wall)
      const px1 = threadMinorRadius * Math.cos(angle1);
      const py1 = threadMinorRadius * Math.sin(angle1);
      const px2 = threadMinorRadius * Math.cos(angle2);
      const py2 = threadMinorRadius * Math.sin(angle2);
      
      const halfPitch = spec.pitch / 2;
      
      // Thread profile (V-shape going INTO the wall)
      const tp0: [number, number, number] = [vx1, vy1, z1];
      const tp1: [number, number, number] = [px1, py1, z1 + halfPitch / 2];
      const tp2: [number, number, number] = [vx1, vy1, z1 + halfPitch];
      const tp3: [number, number, number] = [vx2, vy2, z2];
      const tp4: [number, number, number] = [px2, py2, z2 + halfPitch / 2];
      const tp5: [number, number, number] = [vx2, vy2, z2 + halfPitch];
      
      triangles.push({ vertices: [tp0, tp4, tp1], normal: calculateNormal(tp0, tp4, tp1) });
      triangles.push({ vertices: [tp0, tp3, tp4], normal: calculateNormal(tp0, tp3, tp4) });
      triangles.push({ vertices: [tp1, tp5, tp2], normal: calculateNormal(tp1, tp5, tp2) });
      triangles.push({ vertices: [tp1, tp4, tp5], normal: calculateNormal(tp1, tp4, tp5) });
    }
    
    // Inner wall above and below thread section
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      const x1 = innerRadius * Math.cos(angle1);
      const y1 = innerRadius * Math.sin(angle1);
      const x2 = innerRadius * Math.cos(angle2);
      const y2 = innerRadius * Math.sin(angle2);
      
      // Below threads (platform to thread start)
      const ib0: [number, number, number] = [x1, y1, basePlatformZ];
      const ib1: [number, number, number] = [x2, y2, basePlatformZ];
      const ib2: [number, number, number] = [x2, y2, threadStartZ];
      const ib3: [number, number, number] = [x1, y1, threadStartZ];
      
      const nx = -(x1 + x2) / 2;
      const ny = -(y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [ib0, ib2, ib1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [ib0, ib3, ib2], normal: [nx / nlen, ny / nlen, 0] });
      
      // Above threads (thread end to top)
      const it0: [number, number, number] = [x1, y1, threadEndZ];
      const it1: [number, number, number] = [x2, y2, threadEndZ];
      const it2: [number, number, number] = [x2, y2, wallTopZ];
      const it3: [number, number, number] = [x1, y1, wallTopZ];
      
      triangles.push({ vertices: [it0, it2, it1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [it0, it3, it2], normal: [nx / nlen, ny / nlen, 0] });
    }
  } else {
    // No threads - just smooth inner wall
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      const x1 = innerRadius * Math.cos(angle1);
      const y1 = innerRadius * Math.sin(angle1);
      const x2 = innerRadius * Math.cos(angle2);
      const y2 = innerRadius * Math.sin(angle2);
      
      const iw0: [number, number, number] = [x1, y1, basePlatformZ];
      const iw1: [number, number, number] = [x2, y2, basePlatformZ];
      const iw2: [number, number, number] = [x2, y2, wallTopZ];
      const iw3: [number, number, number] = [x1, y1, wallTopZ];
      
      const nx = -(x1 + x2) / 2;
      const ny = -(y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [iw0, iw2, iw1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [iw0, iw3, iw2], normal: [nx / nlen, ny / nlen, 0] });
    }
  }
  
  // Generate inner platform (floor inside the jar base where posts sit)
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const ox1 = innerRadius * Math.cos(angle1);
    const oy1 = innerRadius * Math.sin(angle1);
    const ox2 = innerRadius * Math.cos(angle2);
    const oy2 = innerRadius * Math.sin(angle2);
    
    if (includeWireChannel) {
      // Annular platform around wire channel
      const ix1 = (wireChannelRadius + 1) * Math.cos(angle1);
      const iy1 = (wireChannelRadius + 1) * Math.sin(angle1);
      const ix2 = (wireChannelRadius + 1) * Math.cos(angle2);
      const iy2 = (wireChannelRadius + 1) * Math.sin(angle2);
      
      const p0: [number, number, number] = [ox1, oy1, basePlatformZ];
      const p1: [number, number, number] = [ox2, oy2, basePlatformZ];
      const p2: [number, number, number] = [ix2, iy2, basePlatformZ];
      const p3: [number, number, number] = [ix1, iy1, basePlatformZ];
      
      triangles.push({ vertices: [p0, p1, p2], normal: [0, 0, 1] });
      triangles.push({ vertices: [p0, p2, p3], normal: [0, 0, 1] });
    } else {
      // Solid platform
      const p0: [number, number, number] = [0, 0, basePlatformZ];
      const p1: [number, number, number] = [ox1, oy1, basePlatformZ];
      const p2: [number, number, number] = [ox2, oy2, basePlatformZ];
      
      triangles.push({ vertices: [p0, p1, p2], normal: [0, 0, 1] });
    }
  }
  
  // Wire channel tube through center
  if (includeWireChannel) {
    const channelSegments = 16;
    for (let i = 0; i < channelSegments; i++) {
      const angle1 = (i / channelSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / channelSegments) * Math.PI * 2;
      
      const x1 = wireChannelRadius * Math.cos(angle1);
      const y1 = wireChannelRadius * Math.sin(angle1);
      const x2 = wireChannelRadius * Math.cos(angle2);
      const y2 = wireChannelRadius * Math.sin(angle2);
      
      const ch0: [number, number, number] = [x1, y1, 0];
      const ch1: [number, number, number] = [x2, y2, 0];
      const ch2: [number, number, number] = [x2, y2, basePlatformZ];
      const ch3: [number, number, number] = [x1, y1, basePlatformZ];
      
      const nx = -(x1 + x2) / 2;
      const ny = -(y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [ch0, ch2, ch1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [ch0, ch3, ch2], normal: [nx / nlen, ny / nlen, 0] });
    }
  }
  
  // Generate filament mounting posts on the inner platform
  const postHeight = settings.filamentPostHeight || 25;
  const postCount = settings.filamentPostCount || 4;
  const postRadius = 2.5;
  const postSpacing = (innerRadius - 10) * 0.7; // Posts arranged in circle
  
  for (let p = 0; p < postCount; p++) {
    const postAngle = (p / postCount) * Math.PI * 2;
    const postX = Math.cos(postAngle) * postSpacing;
    const postY = Math.sin(postAngle) * postSpacing;
    const postSegments = 12;
    
    // Cylindrical post
    for (let i = 0; i < postSegments; i++) {
      const a1 = (i / postSegments) * Math.PI * 2;
      const a2 = ((i + 1) / postSegments) * Math.PI * 2;
      
      const px1 = postX + postRadius * Math.cos(a1);
      const py1 = postY + postRadius * Math.sin(a1);
      const px2 = postX + postRadius * Math.cos(a2);
      const py2 = postY + postRadius * Math.sin(a2);
      
      // Post side walls
      const ps0: [number, number, number] = [px1, py1, basePlatformZ];
      const ps1: [number, number, number] = [px2, py2, basePlatformZ];
      const ps2: [number, number, number] = [px2, py2, basePlatformZ + postHeight];
      const ps3: [number, number, number] = [px1, py1, basePlatformZ + postHeight];
      
      const pnx = Math.cos(a1 + Math.PI / postSegments);
      const pny = Math.sin(a1 + Math.PI / postSegments);
      
      triangles.push({ vertices: [ps0, ps1, ps2], normal: [pnx, pny, 0] });
      triangles.push({ vertices: [ps0, ps2, ps3], normal: [pnx, pny, 0] });
      
      // Post top cap
      const pt0: [number, number, number] = [postX, postY, basePlatformZ + postHeight];
      const pt1: [number, number, number] = [px1, py1, basePlatformZ + postHeight];
      const pt2: [number, number, number] = [px2, py2, basePlatformZ + postHeight];
      
      triangles.push({ vertices: [pt0, pt1, pt2], normal: [0, 0, 1] });
    }
    
    // Add U-channel clip on top of each post
    const clipHeight = 6;
    const clipWidth = 4;
    const clipDepth = 3;
    const clipZ = basePlatformZ + postHeight;
    
    // U-channel walls
    const chw = clipWidth / 2;
    const chd = clipDepth / 2;
    
    // Left wall
    const ul0: [number, number, number] = [postX - chw - 1, postY - chd, clipZ];
    const ul1: [number, number, number] = [postX - chw, postY - chd, clipZ];
    const ul2: [number, number, number] = [postX - chw, postY + chd, clipZ];
    const ul3: [number, number, number] = [postX - chw - 1, postY + chd, clipZ];
    const ul4: [number, number, number] = [postX - chw - 1, postY - chd, clipZ + clipHeight];
    const ul5: [number, number, number] = [postX - chw, postY - chd, clipZ + clipHeight];
    const ul6: [number, number, number] = [postX - chw, postY + chd, clipZ + clipHeight];
    const ul7: [number, number, number] = [postX - chw - 1, postY + chd, clipZ + clipHeight];
    
    triangles.push({ vertices: [ul0, ul1, ul5], normal: [0, -1, 0] });
    triangles.push({ vertices: [ul0, ul5, ul4], normal: [0, -1, 0] });
    triangles.push({ vertices: [ul2, ul3, ul7], normal: [0, 1, 0] });
    triangles.push({ vertices: [ul2, ul7, ul6], normal: [0, 1, 0] });
    triangles.push({ vertices: [ul0, ul3, ul7], normal: [-1, 0, 0] });
    triangles.push({ vertices: [ul0, ul7, ul4], normal: [-1, 0, 0] });
    triangles.push({ vertices: [ul1, ul2, ul6], normal: [1, 0, 0] });
    triangles.push({ vertices: [ul1, ul6, ul5], normal: [1, 0, 0] });
    triangles.push({ vertices: [ul4, ul5, ul6], normal: [0, 0, 1] });
    triangles.push({ vertices: [ul4, ul6, ul7], normal: [0, 0, 1] });
    
    // Right wall
    const ur0: [number, number, number] = [postX + chw, postY - chd, clipZ];
    const ur1: [number, number, number] = [postX + chw + 1, postY - chd, clipZ];
    const ur2: [number, number, number] = [postX + chw + 1, postY + chd, clipZ];
    const ur3: [number, number, number] = [postX + chw, postY + chd, clipZ];
    const ur4: [number, number, number] = [postX + chw, postY - chd, clipZ + clipHeight];
    const ur5: [number, number, number] = [postX + chw + 1, postY - chd, clipZ + clipHeight];
    const ur6: [number, number, number] = [postX + chw + 1, postY + chd, clipZ + clipHeight];
    const ur7: [number, number, number] = [postX + chw, postY + chd, clipZ + clipHeight];
    
    triangles.push({ vertices: [ur0, ur1, ur5], normal: [0, -1, 0] });
    triangles.push({ vertices: [ur0, ur5, ur4], normal: [0, -1, 0] });
    triangles.push({ vertices: [ur2, ur3, ur7], normal: [0, 1, 0] });
    triangles.push({ vertices: [ur2, ur7, ur6], normal: [0, 1, 0] });
    triangles.push({ vertices: [ur0, ur3, ur7], normal: [-1, 0, 0] });
    triangles.push({ vertices: [ur0, ur7, ur4], normal: [-1, 0, 0] });
    triangles.push({ vertices: [ur1, ur2, ur6], normal: [1, 0, 0] });
    triangles.push({ vertices: [ur1, ur6, ur5], normal: [1, 0, 0] });
    triangles.push({ vertices: [ur4, ur5, ur6], normal: [0, 0, 1] });
    triangles.push({ vertices: [ur4, ur6, ur7], normal: [0, 0, 1] });
  }
  
  return triangles;
}

// Generate removable bottom plug/cap for jar base
function generateBottomPlug(settings: FilamentShapeSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  const jarType = settings.jarThreadType || "regular";
  const spec = jarSpecs[jarType] || jarSpecs.regular;
  const plugThickness = settings.bottomPlugThickness || 5;
  const plugStyle = settings.bottomPlugStyle || "friction";
  const wallThickness = settings.jarBaseWallThickness || 5;
  const wireChannelDia = settings.wireChannelDiameter || 3;
  const includeWireChannel = settings.includeWireChannel !== false;
  
  const innerRadius = (settings.jarDiameter || spec.innerDia) / 2;
  const outerRadius = innerRadius + wallThickness;
  const wireChannelRadius = wireChannelDia / 2;
  const segments = 48;
  
  // Plug is slightly smaller than outer diameter for friction fit
  const plugRadius = outerRadius - 0.3; // 0.3mm tolerance
  const lipHeight = plugStyle === "friction" ? 3 : 0;
  const lipInset = plugStyle === "friction" ? 2 : 0;
  
  // Main plug body
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const ox1 = plugRadius * Math.cos(angle1);
    const oy1 = plugRadius * Math.sin(angle1);
    const ox2 = plugRadius * Math.cos(angle2);
    const oy2 = plugRadius * Math.sin(angle2);
    
    // Bottom face
    if (!includeWireChannel) {
      const b0: [number, number, number] = [0, 0, 0];
      const b1: [number, number, number] = [ox2, oy2, 0];
      const b2: [number, number, number] = [ox1, oy1, 0];
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
    } else {
      // Annular bottom with wire channel hole
      const ix1 = wireChannelRadius * Math.cos(angle1);
      const iy1 = wireChannelRadius * Math.sin(angle1);
      const ix2 = wireChannelRadius * Math.cos(angle2);
      const iy2 = wireChannelRadius * Math.sin(angle2);
      
      const b0: [number, number, number] = [ix1, iy1, 0];
      const b1: [number, number, number] = [ox2, oy2, 0];
      const b2: [number, number, number] = [ox1, oy1, 0];
      const b3: [number, number, number] = [ix2, iy2, 0];
      
      triangles.push({ vertices: [b0, b1, b2], normal: [0, 0, -1] });
      triangles.push({ vertices: [b0, b3, b1], normal: [0, 0, -1] });
    }
    
    // Outer edge
    const e0: [number, number, number] = [ox1, oy1, 0];
    const e1: [number, number, number] = [ox2, oy2, 0];
    const e2: [number, number, number] = [ox2, oy2, plugThickness];
    const e3: [number, number, number] = [ox1, oy1, plugThickness];
    
    const nx = (ox1 + ox2) / 2;
    const ny = (oy1 + oy2) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    
    triangles.push({ vertices: [e0, e1, e2], normal: [nx / nlen, ny / nlen, 0] });
    triangles.push({ vertices: [e0, e2, e3], normal: [nx / nlen, ny / nlen, 0] });
    
    // Top face (with recessed area for friction lip)
    if (lipHeight > 0) {
      const lx1 = (plugRadius - lipInset) * Math.cos(angle1);
      const ly1 = (plugRadius - lipInset) * Math.sin(angle1);
      const lx2 = (plugRadius - lipInset) * Math.cos(angle2);
      const ly2 = (plugRadius - lipInset) * Math.sin(angle2);
      
      // Outer ring top
      const t0: [number, number, number] = [ox1, oy1, plugThickness];
      const t1: [number, number, number] = [ox2, oy2, plugThickness];
      const t2: [number, number, number] = [lx2, ly2, plugThickness];
      const t3: [number, number, number] = [lx1, ly1, plugThickness];
      
      triangles.push({ vertices: [t0, t1, t2], normal: [0, 0, 1] });
      triangles.push({ vertices: [t0, t2, t3], normal: [0, 0, 1] });
      
      // Friction lip (raised ring)
      const fl0: [number, number, number] = [lx1, ly1, plugThickness];
      const fl1: [number, number, number] = [lx2, ly2, plugThickness];
      const fl2: [number, number, number] = [lx2, ly2, plugThickness + lipHeight];
      const fl3: [number, number, number] = [lx1, ly1, plugThickness + lipHeight];
      
      triangles.push({ vertices: [fl0, fl1, fl2], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [fl0, fl2, fl3], normal: [nx / nlen, ny / nlen, 0] });
      
      // Lip top
      if (includeWireChannel) {
        const lix1 = (wireChannelRadius + 1) * Math.cos(angle1);
        const liy1 = (wireChannelRadius + 1) * Math.sin(angle1);
        const lix2 = (wireChannelRadius + 1) * Math.cos(angle2);
        const liy2 = (wireChannelRadius + 1) * Math.sin(angle2);
        
        const lt0: [number, number, number] = [lx1, ly1, plugThickness + lipHeight];
        const lt1: [number, number, number] = [lx2, ly2, plugThickness + lipHeight];
        const lt2: [number, number, number] = [lix2, liy2, plugThickness + lipHeight];
        const lt3: [number, number, number] = [lix1, liy1, plugThickness + lipHeight];
        
        triangles.push({ vertices: [lt0, lt1, lt2], normal: [0, 0, 1] });
        triangles.push({ vertices: [lt0, lt2, lt3], normal: [0, 0, 1] });
      } else {
        const lt0: [number, number, number] = [0, 0, plugThickness + lipHeight];
        const lt1: [number, number, number] = [lx1, ly1, plugThickness + lipHeight];
        const lt2: [number, number, number] = [lx2, ly2, plugThickness + lipHeight];
        
        triangles.push({ vertices: [lt0, lt1, lt2], normal: [0, 0, 1] });
      }
    } else {
      // Simple flat top
      if (includeWireChannel) {
        const ix1 = (wireChannelRadius + 1) * Math.cos(angle1);
        const iy1 = (wireChannelRadius + 1) * Math.sin(angle1);
        const ix2 = (wireChannelRadius + 1) * Math.cos(angle2);
        const iy2 = (wireChannelRadius + 1) * Math.sin(angle2);
        
        const t0: [number, number, number] = [ox1, oy1, plugThickness];
        const t1: [number, number, number] = [ox2, oy2, plugThickness];
        const t2: [number, number, number] = [ix2, iy2, plugThickness];
        const t3: [number, number, number] = [ix1, iy1, plugThickness];
        
        triangles.push({ vertices: [t0, t1, t2], normal: [0, 0, 1] });
        triangles.push({ vertices: [t0, t2, t3], normal: [0, 0, 1] });
      } else {
        const t0: [number, number, number] = [0, 0, plugThickness];
        const t1: [number, number, number] = [ox1, oy1, plugThickness];
        const t2: [number, number, number] = [ox2, oy2, plugThickness];
        
        triangles.push({ vertices: [t0, t1, t2], normal: [0, 0, 1] });
      }
    }
  }
  
  // Wire channel tube
  if (includeWireChannel) {
    const totalHeight = lipHeight > 0 ? plugThickness + lipHeight : plugThickness;
    const channelSegments = 16;
    
    for (let i = 0; i < channelSegments; i++) {
      const angle1 = (i / channelSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / channelSegments) * Math.PI * 2;
      
      const x1 = wireChannelRadius * Math.cos(angle1);
      const y1 = wireChannelRadius * Math.sin(angle1);
      const x2 = wireChannelRadius * Math.cos(angle2);
      const y2 = wireChannelRadius * Math.sin(angle2);
      
      const ch0: [number, number, number] = [x1, y1, 0];
      const ch1: [number, number, number] = [x2, y2, 0];
      const ch2: [number, number, number] = [x2, y2, totalHeight];
      const ch3: [number, number, number] = [x1, y1, totalHeight];
      
      const nx = -(x1 + x2) / 2;
      const ny = -(y1 + y2) / 2;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      
      triangles.push({ vertices: [ch0, ch2, ch1], normal: [nx / nlen, ny / nlen, 0] });
      triangles.push({ vertices: [ch0, ch3, ch2], normal: [nx / nlen, ny / nlen, 0] });
    }
  }
  
  return triangles;
}

export function generateFilamentShapeSTL(settings: FilamentShapeSettings): { [key: string]: Buffer } {
  const files: { [key: string]: Buffer } = {};
  
  // Generate shape path - use custom data if available for custom type
  let shapePath: Point2D[];
  if (settings.shapeType === "custom" && settings.customPathData && settings.customPathData.length > 0) {
    shapePath = generateShapePathFromCustomData(settings.customPathData, settings.shapeWidth, settings.shapeHeight);
  } else {
    shapePath = generateShapePath(settings.shapeType, settings.shapeWidth, settings.shapeHeight);
  }
  const pathLength = getPathLength(shapePath);
  
  // Calculate clip positions along path
  const numClips = Math.max(3, Math.floor(pathLength / settings.clipSpacing));
  const actualSpacing = pathLength / numClips;
  
  // Generate clips
  const clipTriangles: Triangle[] = [];
  const baseZ = settings.includeBasePlate ? settings.basePlateThickness : 0;
  
  for (let i = 0; i < numClips; i++) {
    const distance = i * actualSpacing;
    const sample = samplePathAtDistance(shapePath, distance);
    if (sample) {
      const { point, angle } = sample;
      const clips = generateClip(point.x, point.y, baseZ, angle, settings);
      clipTriangles.push(...clips);
    }
  }
  
  files["filament_clips.stl"] = trianglesToSTL(clipTriangles, "Clips");
  
  // Generate base plate with integrated clips if enabled
  if (settings.includeBasePlate) {
    const baseTriangles = generateBasePlateWithIntegratedClips(shapePath, settings);
    files["base_plate_with_clips.stl"] = trianglesToSTL(baseTriangles, "Base Plate With Clips");
  }
  
  // Generate battery holder if enabled - two-piece snap-fit design
  if (settings.includeBatteryMount) {
    const { base, lid } = generateBatteryHolderTwoPiece(settings, 0);
    files["battery_holder_base.stl"] = trianglesToSTL(base, "Battery Holder Base");
    files["battery_holder_lid.stl"] = trianglesToSTL(lid, "Battery Holder Lid");
  }
  
  // Generate diffuser if enabled - now creates shell sandwich for EL wire
  if (settings.includeDiffuser) {
    // Generate shell sandwich (two-part diffuser for EL wire integration)
    const { front, back } = generateDiffuserShellSandwich(shapePath, settings);
    files["diffuser_front_shell.stl"] = trianglesToSTL(front, "Diffuser Front Shell");
    files["diffuser_back_shell.stl"] = trianglesToSTL(back, "Diffuser Back Shell");
    
    // Also include simple flat panel for basic use
    const diffuserTriangles = generateDiffuserPanel(shapePath, settings);
    files["diffuser_simple.stl"] = trianglesToSTL(diffuserTriangles, "Simple Diffuser");
  }
  
  // Generate dimmer housing if enabled (for desktop neon signs)
  if (settings.includeDimmerHousing) {
    const dimmerTriangles = generateDimmerHousing(settings);
    files["dimmer_housing.stl"] = trianglesToSTL(dimmerTriangles, "Dimmer Housing");
    const dialTriangles = generateDimmerDial();
    files["dimmer_dial.stl"] = trianglesToSTL(dialTriangles, "Dimmer Dial Knob");
  }
  
  // Generate screw-thread base if enabled (for self-contained bulb design)
  if (settings.includeScrewBase) {
    const screwBaseTriangles = generateScrewThreadBase(settings);
    files["screw_thread_base.stl"] = trianglesToSTL(screwBaseTriangles, "Screw Thread Base");
  }
  
  // Generate jar base if enabled (internal threads - glass jar screws INTO the base)
  if (settings.includeJarBase) {
    const jarBaseTriangles = generateJarBase(settings);
    files["jar_base.stl"] = trianglesToSTL(jarBaseTriangles, "Jar Base");
    
    // Generate bottom plug if enabled
    if (settings.includeBottomPlug) {
      const bottomPlugTriangles = generateBottomPlug(settings);
      files["bottom_plug.stl"] = trianglesToSTL(bottomPlugTriangles, "Bottom Plug");
    }
  }
  
  // Generate assembly guide text file
  const guide = `
FILAMENT SHAPE FORMER - Assembly Guide
=======================================

Shape: ${settings.shapeType}
Dimensions: ${settings.shapeWidth}mm x ${settings.shapeHeight}mm
Filament Length Required: ~${Math.round(pathLength)}mm

COMPONENTS:
-----------
1. filament_clips.stl - ${numClips} standalone clips (for manual placement)
${settings.includeBasePlate ? `2. base_plate_with_clips.stl - Base plate with INTEGRATED clips in shape pattern
   - Clips built directly into plate - no gluing needed!
   - Wire feed channels route filament tips to back edges` : ""}
${settings.includeBatteryMount ? `3. BATTERY HOLDER (two-piece snap-fit design):
   - battery_holder_base.stl - Base with battery pocket and snap posts
   - battery_holder_lid.stl - Snap-on lid with contact hole
   - Type: ${settings.batteryType.toUpperCase()}
   - Wire outlet channel at bottom of base` : ""}
${settings.includeDiffuser ? `4. DIFFUSER SHELL SANDWICH (two-part system):
   - diffuser_front_shell.stl - Front with embossed EL wire channel groove
   - diffuser_back_shell.stl - Back lid that snaps over front
   - Feed EL wire tubes into the groove for multi-layer effects!
   - diffuser_simple.stl - Basic flat panel (alternative)` : ""}
${settings.includeDimmerHousing ? `5. DIMMER HOUSING (for brightness control):
   - dimmer_housing.stl - Housing with toggle switch & potentiometer mounts
   - dimmer_dial.stl - Knob for the potentiometer
   - Fits standard 6mm potentiometer and mini toggle switch` : ""}
${settings.includeScrewBase ? `6. SCREW-THREAD BASE (self-contained bulb design):
   - screw_thread_base.stl - Base with ${settings.screwThreadType || "E26"} screw threads
   - Thread type: ${settings.screwThreadType || "E26"} (matches Eggison shell)
   - ${settings.filamentPostCount || 3} mounting posts with U-channel clips for filament
   - Wire channel through center for LED power
   - Post height: ${settings.filamentPostHeight || 30}mm
   - Screws directly into Eggison shell for self-contained design!` : ""}
${settings.includeJarBase ? `7. JAR BASE (glass jar screws INTO the base):
   - jar_base.stl - Base with internal ${settings.jarThreadType || "regular"} mouth threads
   - Jar type: ${settings.jarThreadType || "regular"} mouth (${settings.jarDiameter || 70}mm diameter)
   - ${settings.filamentPostCount || 4} mounting posts with U-channel clips inside
   - Post height: ${settings.filamentPostHeight || 25}mm
   - Wire channel through center for LED power
   - Glass jar screws directly INTO the threaded base!
   ${settings.includeBottomPlug ? `- bottom_plug.stl - Removable ${settings.bottomPlugStyle || "friction"}-fit plug
   - Access wiring by removing plug from bottom` : ""}` : ""}

PRINTING TIPS:
--------------
- Print base plate + clips in rigid PLA or PETG
- Print diffuser shells in translucent/white PETG or clear PLA
- Layer height: 0.2mm recommended
- Infill: 30% for base plate, 100% for diffuser shells

NEW FEATURES:
-------------
- INTEGRATED CLIPS: Base plate now has clips built-in following shape path
- WIRE CHANNELS: Feed channels route wire tips to plate edges for clean wiring
- SHELL SANDWICH DIFFUSER: Two-part design with EL wire groove for depth effects
- IMPROVED BATTERY HOLDER: Circular design with wire outlet and snap-fit slot

ASSEMBLY:
---------
1. Print base_plate_with_clips.stl (clips are already integrated!)
2. Thread LED filament through the U-channel clips on the plate
3. Route filament wire tips through feed channels to back edge
4. Connect wires to battery holder
5. (Optional) Feed EL wire into diffuser front shell groove
6. Snap diffuser back shell onto front to complete sandwich

FILAMENT SPECS:
---------------
Type: Flexible LED Filament
Voltage: ${settings.filamentVoltage}V
Diameter: ${settings.filamentDiameter}mm
Length: ${settings.filamentLength}mm (adjust to ~${Math.round(pathLength)}mm for this shape)
`;
  
  files["assembly_guide.txt"] = Buffer.from(guide, "utf-8");
  
  return files;
}
