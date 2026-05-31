/**
 * CR2032 Battery Holder Generator
 * 
 * Generates compact coin cell battery housings with snap-fit designs.
 * Supports CR2032, CR2025, CR2016 coin cells and AAA batteries.
 */

import {
  BATTERY_PROFILES,
  TOLERANCE_PROFILES,
  type BatteryType,
  type FitType,
  type Triangle,
  type Point2D,
  type Point3D,
  calculateNormal,
  circle,
  trianglesToSTL,
} from './geometry-engine';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export interface BatteryHolderSettings {
  batteryType: BatteryType;
  fitType: FitType;
  wallThickness: number;
  includeSnapLid: boolean;
  includeSwitchMount: boolean;
  includeWireChannels: boolean;
  wireChannelDiameter: number;
  baseStyle: 'flat' | 'rounded' | 'angled';
  coinSlotForRemoval: boolean;
}

export const defaultBatteryHolderSettings: BatteryHolderSettings = {
  batteryType: 'CR2032',
  fitType: 'normal',
  wallThickness: 2,
  includeSnapLid: true,
  includeSwitchMount: false,
  includeWireChannels: true,
  wireChannelDiameter: 3,
  baseStyle: 'flat',
  coinSlotForRemoval: true,
};

interface GeneratedPart {
  name: string;
  triangles: Triangle[];
}

/**
 * Generate complete battery holder with base and lid
 */
export function generateBatteryHolder(settings: BatteryHolderSettings): GeneratedPart[] {
  const battery = BATTERY_PROFILES[settings.batteryType];
  const tolerance = TOLERANCE_PROFILES[settings.fitType];
  const parts: GeneratedPart[] = [];
  
  // Calculate dimensions
  const innerDiameter = battery.diameter + tolerance.clearance;
  const innerHeight = battery.height + tolerance.clearance + 0.5; // Extra for easy removal
  const outerDiameter = innerDiameter + settings.wallThickness * 2;
  const outerHeight = innerHeight + settings.wallThickness;
  const segments = 48;
  
  // Generate base
  const baseTriangles = generateBase(
    innerDiameter,
    outerDiameter,
    innerHeight,
    outerHeight,
    settings,
    segments
  );
  parts.push({ name: 'Base', triangles: baseTriangles });
  
  // Generate lid if enabled
  if (settings.includeSnapLid) {
    const lidTriangles = generateSnapLid(
      innerDiameter,
      outerDiameter,
      settings.wallThickness,
      tolerance.clearance,
      settings.coinSlotForRemoval,
      segments
    );
    parts.push({ name: 'Lid', triangles: lidTriangles });
  }
  
  return parts;
}

/**
 * Generate the battery holder base
 */
function generateBase(
  innerDiameter: number,
  outerDiameter: number,
  innerHeight: number,
  outerHeight: number,
  settings: BatteryHolderSettings,
  segments: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const outerRadius = outerDiameter / 2;
  const innerRadius = innerDiameter / 2;
  
  // Generate outer cylinder walls
  for (let i = 0; i < segments; i++) {
    const angle1 = (2 * Math.PI * i) / segments;
    const angle2 = (2 * Math.PI * (i + 1)) / segments;
    
    const x1 = outerRadius * Math.cos(angle1);
    const y1 = outerRadius * Math.sin(angle1);
    const x2 = outerRadius * Math.cos(angle2);
    const y2 = outerRadius * Math.sin(angle2);
    
    // Outer wall
    triangles.push({
      v1: { x: x1, y: y1, z: 0 },
      v2: { x: x2, y: y2, z: 0 },
      v3: { x: x1, y: y1, z: outerHeight },
    });
    triangles.push({
      v1: { x: x2, y: y2, z: 0 },
      v2: { x: x2, y: y2, z: outerHeight },
      v3: { x: x1, y: y1, z: outerHeight },
    });
    
    // Inner wall (battery pocket)
    const ix1 = innerRadius * Math.cos(angle1);
    const iy1 = innerRadius * Math.sin(angle1);
    const ix2 = innerRadius * Math.cos(angle2);
    const iy2 = innerRadius * Math.sin(angle2);
    const baseZ = outerHeight - innerHeight;
    
    triangles.push({
      v1: { x: ix1, y: iy1, z: outerHeight },
      v2: { x: ix2, y: iy2, z: baseZ },
      v3: { x: ix1, y: iy1, z: baseZ },
    });
    triangles.push({
      v1: { x: ix1, y: iy1, z: outerHeight },
      v2: { x: ix2, y: iy2, z: outerHeight },
      v3: { x: ix2, y: iy2, z: baseZ },
    });
    
    // Top ring (between outer and inner)
    triangles.push({
      v1: { x: x1, y: y1, z: outerHeight },
      v2: { x: ix1, y: iy1, z: outerHeight },
      v3: { x: x2, y: y2, z: outerHeight },
    });
    triangles.push({
      v1: { x: ix1, y: iy1, z: outerHeight },
      v2: { x: ix2, y: iy2, z: outerHeight },
      v3: { x: x2, y: y2, z: outerHeight },
    });
    
    // Bottom of battery pocket
    triangles.push({
      v1: { x: 0, y: 0, z: baseZ },
      v2: { x: ix2, y: iy2, z: baseZ },
      v3: { x: ix1, y: iy1, z: baseZ },
    });
  }
  
  // Bottom face
  for (let i = 0; i < segments; i++) {
    const angle1 = (2 * Math.PI * i) / segments;
    const angle2 = (2 * Math.PI * (i + 1)) / segments;
    
    triangles.push({
      v1: { x: 0, y: 0, z: 0 },
      v2: { x: outerRadius * Math.cos(angle1), y: outerRadius * Math.sin(angle1), z: 0 },
      v3: { x: outerRadius * Math.cos(angle2), y: outerRadius * Math.sin(angle2), z: 0 },
    });
  }
  
  // Add snap posts for lid
  if (settings.includeSnapLid) {
    const postTriangles = generateSnapPosts(outerRadius - settings.wallThickness / 2, outerHeight, 4);
    triangles.push(...postTriangles);
  }
  
  // Add wire channels if enabled
  if (settings.includeWireChannels) {
    // Wire channel exits on opposite sides
    const channelRadius = settings.wireChannelDiameter / 2;
    const channelZ = outerHeight - innerHeight + 1; // Just above battery floor
    
    // Simple notch representation (full boolean would need CSG)
    // In STL we represent as indentations
  }
  
  // Add contact spring tabs (simplified representation)
  const springTriangles = generateContactSprings(innerRadius, outerHeight - innerHeight, innerHeight);
  triangles.push(...springTriangles);
  
  return triangles;
}

/**
 * Generate snap posts around the holder rim
 */
function generateSnapPosts(radius: number, height: number, count: number): Triangle[] {
  const triangles: Triangle[] = [];
  const postWidth = 3;
  const postDepth = 1.5;
  const postHeight = 2.5;
  const undercut = 0.6;
  
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.PI / 4; // Offset 45 degrees
    const cx = radius * Math.cos(angle);
    const cy = radius * Math.sin(angle);
    
    // Direction vectors
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const tx = -ny; // Tangent
    const ty = nx;
    
    // Post vertices
    const hw = postWidth / 2;
    const z1 = height;
    const z2 = height + postHeight - undercut;
    const z3 = height + postHeight;
    
    // Main post body
    const postVerts: Point3D[] = [
      { x: cx - tx * hw, y: cy - ty * hw, z: z1 },
      { x: cx + tx * hw, y: cy + ty * hw, z: z1 },
      { x: cx + tx * hw + nx * postDepth, y: cy + ty * hw + ny * postDepth, z: z1 },
      { x: cx - tx * hw + nx * postDepth, y: cy - ty * hw + ny * postDepth, z: z1 },
    ];
    
    // Extrude post
    for (let j = 0; j < 4; j++) {
      const k = (j + 1) % 4;
      const p1 = postVerts[j];
      const p2 = postVerts[k];
      
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: z1 },
        v2: { x: p2.x, y: p2.y, z: z1 },
        v3: { x: p1.x, y: p1.y, z: z2 },
      });
      triangles.push({
        v1: { x: p2.x, y: p2.y, z: z1 },
        v2: { x: p2.x, y: p2.y, z: z2 },
        v3: { x: p1.x, y: p1.y, z: z2 },
      });
    }
    
    // Snap undercut (angled top)
    const undercutVerts: Point3D[] = [
      { x: cx - tx * hw + nx * (postDepth + undercut), y: cy - ty * hw + ny * (postDepth + undercut), z: z2 },
      { x: cx + tx * hw + nx * (postDepth + undercut), y: cy + ty * hw + ny * (postDepth + undercut), z: z2 },
      { x: cx + tx * hw + nx * postDepth, y: cy + ty * hw + ny * postDepth, z: z3 },
      { x: cx - tx * hw + nx * postDepth, y: cy - ty * hw + ny * postDepth, z: z3 },
    ];
    
    // Top face
    triangles.push({
      v1: undercutVerts[0],
      v2: undercutVerts[1],
      v3: undercutVerts[2],
    });
    triangles.push({
      v1: undercutVerts[0],
      v2: undercutVerts[2],
      v3: undercutVerts[3],
    });
  }
  
  return triangles;
}

/**
 * Generate simplified contact spring tabs
 */
function generateContactSprings(innerRadius: number, baseZ: number, height: number): Triangle[] {
  const triangles: Triangle[] = [];
  const springWidth = 3;
  const springHeight = height * 0.7;
  const springThickness = 0.5;
  const springAngle = 15 * Math.PI / 180; // 15 degree angle
  
  // Two springs on opposite sides for + and -
  for (let side = 0; side < 2; side++) {
    const angle = side * Math.PI;
    const cx = (innerRadius - springThickness) * Math.cos(angle);
    const cy = (innerRadius - springThickness) * Math.sin(angle);
    
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const tx = -ny;
    const ty = nx;
    
    const hw = springWidth / 2;
    
    // Spring base
    const z1 = baseZ;
    const z2 = baseZ + springHeight;
    
    // Angled spring tip
    const tipOffset = springHeight * Math.tan(springAngle);
    
    // Simple rectangular spring representation
    const p1: Point3D = { x: cx - tx * hw, y: cy - ty * hw, z: z1 };
    const p2: Point3D = { x: cx + tx * hw, y: cy + ty * hw, z: z1 };
    const p3: Point3D = { x: cx + tx * hw - nx * tipOffset, y: cy + ty * hw - ny * tipOffset, z: z2 };
    const p4: Point3D = { x: cx - tx * hw - nx * tipOffset, y: cy - ty * hw - ny * tipOffset, z: z2 };
    
    // Front face
    triangles.push({ v1: p1, v2: p2, v3: p3 });
    triangles.push({ v1: p1, v2: p3, v3: p4 });
    
    // Back face (thickened)
    const backOffset = springThickness;
    const p5: Point3D = { x: p1.x + nx * backOffset, y: p1.y + ny * backOffset, z: p1.z };
    const p6: Point3D = { x: p2.x + nx * backOffset, y: p2.y + ny * backOffset, z: p2.z };
    const p7: Point3D = { x: p3.x + nx * backOffset, y: p3.y + ny * backOffset, z: p3.z };
    const p8: Point3D = { x: p4.x + nx * backOffset, y: p4.y + ny * backOffset, z: p4.z };
    
    triangles.push({ v1: p6, v2: p5, v3: p7 });
    triangles.push({ v1: p5, v2: p8, v3: p7 });
    
    // Side faces
    triangles.push({ v1: p1, v2: p4, v3: p5 });
    triangles.push({ v1: p4, v2: p8, v3: p5 });
    triangles.push({ v1: p2, v2: p6, v3: p3 });
    triangles.push({ v1: p6, v2: p7, v3: p3 });
    
    // Top face
    triangles.push({ v1: p3, v2: p7, v3: p4 });
    triangles.push({ v1: p7, v2: p8, v3: p4 });
  }
  
  return triangles;
}

/**
 * Generate snap-fit lid with optional coin slot
 */
function generateSnapLid(
  innerDiameter: number,
  outerDiameter: number,
  thickness: number,
  clearance: number,
  coinSlot: boolean,
  segments: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const outerRadius = outerDiameter / 2 - clearance;
  const rimRadius = innerDiameter / 2 + clearance;
  const rimDepth = 3; // Depth of the rim that sits inside the holder
  
  // Main lid disc
  for (let i = 0; i < segments; i++) {
    const angle1 = (2 * Math.PI * i) / segments;
    const angle2 = (2 * Math.PI * (i + 1)) / segments;
    
    const x1 = outerRadius * Math.cos(angle1);
    const y1 = outerRadius * Math.sin(angle1);
    const x2 = outerRadius * Math.cos(angle2);
    const y2 = outerRadius * Math.sin(angle2);
    
    // Top face
    triangles.push({
      v1: { x: 0, y: 0, z: thickness },
      v2: { x: x2, y: y2, z: thickness },
      v3: { x: x1, y: y1, z: thickness },
    });
    
    // Outer wall
    triangles.push({
      v1: { x: x1, y: y1, z: thickness },
      v2: { x: x2, y: y2, z: thickness },
      v3: { x: x1, y: y1, z: 0 },
    });
    triangles.push({
      v1: { x: x2, y: y2, z: thickness },
      v2: { x: x2, y: y2, z: 0 },
      v3: { x: x1, y: y1, z: 0 },
    });
    
    // Bottom ring
    const rx1 = rimRadius * Math.cos(angle1);
    const ry1 = rimRadius * Math.sin(angle1);
    const rx2 = rimRadius * Math.cos(angle2);
    const ry2 = rimRadius * Math.sin(angle2);
    
    triangles.push({
      v1: { x: x1, y: y1, z: 0 },
      v2: { x: x2, y: y2, z: 0 },
      v3: { x: rx1, y: ry1, z: 0 },
    });
    triangles.push({
      v1: { x: x2, y: y2, z: 0 },
      v2: { x: rx2, y: ry2, z: 0 },
      v3: { x: rx1, y: ry1, z: 0 },
    });
    
    // Inner rim wall
    triangles.push({
      v1: { x: rx1, y: ry1, z: 0 },
      v2: { x: rx2, y: ry2, z: 0 },
      v3: { x: rx1, y: ry1, z: -rimDepth },
    });
    triangles.push({
      v1: { x: rx2, y: ry2, z: 0 },
      v2: { x: rx2, y: ry2, z: -rimDepth },
      v3: { x: rx1, y: ry1, z: -rimDepth },
    });
    
    // Rim bottom
    triangles.push({
      v1: { x: 0, y: 0, z: -rimDepth },
      v2: { x: rx1, y: ry1, z: -rimDepth },
      v3: { x: rx2, y: ry2, z: -rimDepth },
    });
  }
  
  // Add coin slot for battery removal
  if (coinSlot) {
    // Coin slot is a rectangular channel across the center
    const slotWidth = 12; // Fits a coin edge
    const slotDepth = 2;
    const slotLength = rimRadius * 1.6;
    
    const hw = slotWidth / 2;
    const hl = slotLength / 2;
    const z1 = thickness;
    const z2 = thickness - slotDepth;
    
    // Slot walls
    // Left wall
    triangles.push({
      v1: { x: -hl, y: -hw, z: z1 },
      v2: { x: hl, y: -hw, z: z1 },
      v3: { x: -hl, y: -hw, z: z2 },
    });
    triangles.push({
      v1: { x: hl, y: -hw, z: z1 },
      v2: { x: hl, y: -hw, z: z2 },
      v3: { x: -hl, y: -hw, z: z2 },
    });
    
    // Right wall
    triangles.push({
      v1: { x: hl, y: hw, z: z1 },
      v2: { x: -hl, y: hw, z: z1 },
      v3: { x: hl, y: hw, z: z2 },
    });
    triangles.push({
      v1: { x: -hl, y: hw, z: z1 },
      v2: { x: -hl, y: hw, z: z2 },
      v3: { x: hl, y: hw, z: z2 },
    });
    
    // Bottom of slot
    triangles.push({
      v1: { x: -hl, y: -hw, z: z2 },
      v2: { x: hl, y: -hw, z: z2 },
      v3: { x: -hl, y: hw, z: z2 },
    });
    triangles.push({
      v1: { x: hl, y: -hw, z: z2 },
      v2: { x: hl, y: hw, z: z2 },
      v3: { x: -hl, y: hw, z: z2 },
    });
    
    // End walls
    triangles.push({
      v1: { x: -hl, y: -hw, z: z1 },
      v2: { x: -hl, y: -hw, z: z2 },
      v3: { x: -hl, y: hw, z: z1 },
    });
    triangles.push({
      v1: { x: -hl, y: -hw, z: z2 },
      v2: { x: -hl, y: hw, z: z2 },
      v3: { x: -hl, y: hw, z: z1 },
    });
    
    triangles.push({
      v1: { x: hl, y: hw, z: z1 },
      v2: { x: hl, y: hw, z: z2 },
      v3: { x: hl, y: -hw, z: z1 },
    });
    triangles.push({
      v1: { x: hl, y: hw, z: z2 },
      v2: { x: hl, y: -hw, z: z2 },
      v3: { x: hl, y: -hw, z: z1 },
    });
  }
  
  // Add snap-fit grooves (recesses for the posts)
  const grooveTriangles = generateSnapGrooves(outerRadius - 1, 0, 4, clearance);
  triangles.push(...grooveTriangles);
  
  return triangles;
}

/**
 * Generate snap-fit grooves in the lid
 */
function generateSnapGrooves(radius: number, baseZ: number, count: number, clearance: number): Triangle[] {
  const triangles: Triangle[] = [];
  const grooveWidth = 4;
  const grooveDepth = 2;
  const grooveHeight = 3;
  
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.PI / 4;
    const cx = radius * Math.cos(angle);
    const cy = radius * Math.sin(angle);
    
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const tx = -ny;
    const ty = nx;
    
    const hw = grooveWidth / 2;
    
    // Groove vertices (recessed area)
    const z1 = baseZ;
    const z2 = baseZ - grooveHeight;
    
    // Inner and outer edges of groove
    const innerX = cx - nx * grooveDepth;
    const innerY = cy - ny * grooveDepth;
    
    // Groove walls
    // Side 1
    triangles.push({
      v1: { x: cx - tx * hw, y: cy - ty * hw, z: z1 },
      v2: { x: innerX - tx * hw, y: innerY - ty * hw, z: z1 },
      v3: { x: cx - tx * hw, y: cy - ty * hw, z: z2 },
    });
    triangles.push({
      v1: { x: innerX - tx * hw, y: innerY - ty * hw, z: z1 },
      v2: { x: innerX - tx * hw, y: innerY - ty * hw, z: z2 },
      v3: { x: cx - tx * hw, y: cy - ty * hw, z: z2 },
    });
    
    // Side 2
    triangles.push({
      v1: { x: innerX + tx * hw, y: innerY + ty * hw, z: z1 },
      v2: { x: cx + tx * hw, y: cy + ty * hw, z: z1 },
      v3: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
    });
    triangles.push({
      v1: { x: cx + tx * hw, y: cy + ty * hw, z: z1 },
      v2: { x: cx + tx * hw, y: cy + ty * hw, z: z2 },
      v3: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
    });
    
    // Bottom
    triangles.push({
      v1: { x: innerX - tx * hw, y: innerY - ty * hw, z: z2 },
      v2: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
      v3: { x: cx - tx * hw, y: cy - ty * hw, z: z2 },
    });
    triangles.push({
      v1: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
      v2: { x: cx + tx * hw, y: cy + ty * hw, z: z2 },
      v3: { x: cx - tx * hw, y: cy - ty * hw, z: z2 },
    });
  }
  
  return triangles;
}

/**
 * Export battery holder as ZIP with STL files
 */
export async function exportBatteryHolderZip(settings: BatteryHolderSettings): Promise<Buffer> {
  const parts = generateBatteryHolder(settings);
  const battery = BATTERY_PROFILES[settings.batteryType];
  
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();
    
    passthrough.on('data', (chunk) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    
    archive.pipe(passthrough);
    
    // Add STL files
    for (const part of parts) {
      const stl = trianglesToSTL(part.triangles);
      archive.append(stl, { name: `${battery.name.replace(/\s+/g, '_')}_${part.name}.stl` });
    }
    
    // Add assembly instructions
    const instructions = `
# ${battery.name} Battery Holder Assembly

## Parts List
${parts.map(p => `- ${p.name}.stl`).join('\n')}

## Specifications
- Battery Type: ${battery.name}
- Voltage: ${battery.voltage}V
- Capacity: ${battery.capacity}
- Battery Diameter: ${battery.diameter}mm
- Battery Height: ${battery.height}mm

## Assembly Instructions
1. Print all parts with supports if needed
2. Insert battery into base with correct polarity (+ side up)
3. Snap lid into place
4. Connect wires to spring contacts

## Printing Recommendations
- Layer Height: 0.2mm
- Infill: 20-30%
- Material: PLA or PETG
- Supports: None needed for base, minimal for lid

## Notes
${settings.coinSlotForRemoval ? '- Use a coin in the slot to pry off the lid for battery replacement' : ''}
${settings.includeWireChannels ? '- Wire channels allow clean wire routing' : ''}
    `.trim();
    
    archive.append(instructions, { name: 'ASSEMBLY_INSTRUCTIONS.md' });
    
    archive.finalize();
  });
}
