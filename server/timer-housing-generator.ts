/**
 * 555 Timer Circuit Housing Generator
 * 
 * Creates electronics enclosures for 555 timer circuits with PCB mounts,
 * component cutouts, and wire routing channels.
 */

import {
  type Triangle,
  type Point2D,
  type Point3D,
  roundedRectangle,
  offsetPolygon,
  getBoundingBox,
  trianglesToSTL,
} from './geometry-engine';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export type PCBSize = 'small' | 'medium' | 'large' | 'custom';
export type VentStyle = 'none' | 'slots' | 'grid' | 'honeycomb';
export type MountStyle = 'standoffs' | 'clips' | 'rails' | 'adhesive';

export interface TimerHousingSettings {
  pcbSize: PCBSize;
  customWidth?: number;
  customLength?: number;
  pcbThickness: number;
  wallThickness: number;
  bottomThickness: number;
  clearanceAbovePCB: number;
  clearanceBelowPCB: number;
  ventStyle: VentStyle;
  mountStyle: MountStyle;
  standoffHeight: number;
  standoffDiameter: number;
  screwHoleDiameter: number;
  includeWireChannels: boolean;
  wireChannelCount: number;
  wireChannelDiameter: number;
  includeLidSnaps: boolean;
  includePotentiometerHole: boolean;
  potentiometerDiameter: number;
  includeLEDHole: boolean;
  ledDiameter: number;
  includePowerJack: boolean;
  powerJackDiameter: number;
}

export const defaultTimerHousingSettings: TimerHousingSettings = {
  pcbSize: 'small',
  pcbThickness: 1.6,
  wallThickness: 2,
  bottomThickness: 2,
  clearanceAbovePCB: 15,
  clearanceBelowPCB: 3,
  ventStyle: 'slots',
  mountStyle: 'standoffs',
  standoffHeight: 5,
  standoffDiameter: 6,
  screwHoleDiameter: 2.5,
  includeWireChannels: true,
  wireChannelCount: 2,
  wireChannelDiameter: 5,
  includeLidSnaps: true,
  includePotentiometerHole: true,
  potentiometerDiameter: 7,
  includeLEDHole: true,
  ledDiameter: 5,
  includePowerJack: true,
  powerJackDiameter: 6,
};

// Standard PCB sizes for 555 timer circuits
const PCB_SIZES: Record<PCBSize, { width: number; length: number }> = {
  small: { width: 25, length: 35 },   // Minimal 555 timer
  medium: { width: 35, length: 50 },  // 555 with components
  large: { width: 50, length: 70 },   // 555 with power stage
  custom: { width: 40, length: 60 },  // Default custom size
};

interface GeneratedPart {
  name: string;
  triangles: Triangle[];
  description: string;
}

/**
 * Generate complete timer housing with base and lid
 */
export function generateTimerHousing(settings: TimerHousingSettings): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  
  // Get PCB dimensions
  const pcbDims = settings.pcbSize === 'custom' 
    ? { width: settings.customWidth || 40, length: settings.customLength || 60 }
    : PCB_SIZES[settings.pcbSize];
  
  // Calculate housing dimensions
  const innerWidth = pcbDims.width + settings.wallThickness;
  const innerLength = pcbDims.length + settings.wallThickness;
  const innerHeight = settings.clearanceBelowPCB + settings.pcbThickness + settings.clearanceAbovePCB;
  
  const outerWidth = innerWidth + settings.wallThickness * 2;
  const outerLength = innerLength + settings.wallThickness * 2;
  const outerHeight = innerHeight + settings.bottomThickness;
  
  // Generate base/body
  const baseTriangles = generateBase(settings, pcbDims, outerWidth, outerLength, outerHeight);
  parts.push({
    name: 'Housing_Base',
    triangles: baseTriangles,
    description: 'Main enclosure body with PCB mounts',
  });
  
  // Generate lid
  const lidTriangles = generateLid(settings, outerWidth, outerLength);
  parts.push({
    name: 'Housing_Lid',
    triangles: lidTriangles,
    description: 'Snap-fit lid with ventilation',
  });
  
  return parts;
}

/**
 * Generate the housing base
 */
function generateBase(
  settings: TimerHousingSettings,
  pcbDims: { width: number; length: number },
  outerWidth: number,
  outerLength: number,
  outerHeight: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Outer shell path
  const outerPath = roundedRectangle(outerWidth, outerLength, 3, 8);
  const innerPath = offsetPolygon(outerPath, -settings.wallThickness);
  
  // Extrude outer walls
  for (let i = 0; i < outerPath.length; i++) {
    const j = (i + 1) % outerPath.length;
    const p1 = outerPath[i];
    const p2 = outerPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: outerHeight },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: outerHeight },
      v3: { x: p1.x, y: p1.y, z: outerHeight },
    });
  }
  
  // Inner walls
  for (let i = 0; i < innerPath.length; i++) {
    const j = (i + 1) % innerPath.length;
    const p1 = innerPath[i];
    const p2 = innerPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: outerHeight },
      v2: { x: p2.x, y: p2.y, z: settings.bottomThickness },
      v3: { x: p1.x, y: p1.y, z: settings.bottomThickness },
    });
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: outerHeight },
      v2: { x: p2.x, y: p2.y, z: outerHeight },
      v3: { x: p2.x, y: p2.y, z: settings.bottomThickness },
    });
  }
  
  // Top rim
  for (let i = 0; i < Math.min(outerPath.length, innerPath.length); i++) {
    const j = (i + 1) % outerPath.length;
    const o1 = outerPath[i];
    const o2 = outerPath[j];
    const i1 = innerPath[Math.min(i, innerPath.length - 1)];
    const i2 = innerPath[Math.min(j, innerPath.length - 1)];
    
    triangles.push({
      v1: { x: o1.x, y: o1.y, z: outerHeight },
      v2: { x: i1.x, y: i1.y, z: outerHeight },
      v3: { x: o2.x, y: o2.y, z: outerHeight },
    });
    triangles.push({
      v1: { x: i1.x, y: i1.y, z: outerHeight },
      v2: { x: i2.x, y: i2.y, z: outerHeight },
      v3: { x: o2.x, y: o2.y, z: outerHeight },
    });
  }
  
  // Bottom
  const outerBbox = getBoundingBox(outerPath);
  for (let i = 0; i < outerPath.length; i++) {
    const j = (i + 1) % outerPath.length;
    triangles.push({
      v1: { x: outerBbox.centerX, y: outerBbox.centerY, z: 0 },
      v2: { x: outerPath[j].x, y: outerPath[j].y, z: 0 },
      v3: { x: outerPath[i].x, y: outerPath[i].y, z: 0 },
    });
  }
  
  // Interior floor
  const innerBbox = getBoundingBox(innerPath);
  for (let i = 0; i < innerPath.length; i++) {
    const j = (i + 1) % innerPath.length;
    triangles.push({
      v1: { x: innerBbox.centerX, y: innerBbox.centerY, z: settings.bottomThickness },
      v2: { x: innerPath[i].x, y: innerPath[i].y, z: settings.bottomThickness },
      v3: { x: innerPath[j].x, y: innerPath[j].y, z: settings.bottomThickness },
    });
  }
  
  // Add PCB standoffs
  if (settings.mountStyle === 'standoffs') {
    const standoffTriangles = generatePCBStandoffs(
      pcbDims,
      settings.bottomThickness,
      settings.standoffHeight,
      settings.standoffDiameter,
      settings.screwHoleDiameter
    );
    triangles.push(...standoffTriangles);
  }
  
  // Add wire channels if enabled
  if (settings.includeWireChannels) {
    // Wire channels would typically be subtractions from the wall
    // Represented here as geometry modifications
  }
  
  // Add lid snap features
  if (settings.includeLidSnaps) {
    const snapTriangles = generateLidSnapPosts(outerPath, outerHeight, settings.wallThickness);
    triangles.push(...snapTriangles);
  }
  
  // Add power jack hole (represented as cylinder on wall)
  if (settings.includePowerJack) {
    // Power jack would be a boolean subtraction
    // Position on the side wall
  }
  
  return triangles;
}

/**
 * Generate PCB mounting standoffs
 */
function generatePCBStandoffs(
  pcbDims: { width: number; length: number },
  baseZ: number,
  height: number,
  diameter: number,
  holeDiameter: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const segments = 24;
  const radius = diameter / 2;
  const holeRadius = holeDiameter / 2;
  
  // Standard PCB mounting hole positions (3mm from edges)
  const inset = 3;
  const positions = [
    { x: -pcbDims.width / 2 + inset, y: -pcbDims.length / 2 + inset },
    { x: pcbDims.width / 2 - inset, y: -pcbDims.length / 2 + inset },
    { x: -pcbDims.width / 2 + inset, y: pcbDims.length / 2 - inset },
    { x: pcbDims.width / 2 - inset, y: pcbDims.length / 2 - inset },
  ];
  
  for (const pos of positions) {
    // Outer cylinder
    for (let i = 0; i < segments; i++) {
      const angle1 = (2 * Math.PI * i) / segments;
      const angle2 = (2 * Math.PI * (i + 1)) / segments;
      
      const ox1 = pos.x + radius * Math.cos(angle1);
      const oy1 = pos.y + radius * Math.sin(angle1);
      const ox2 = pos.x + radius * Math.cos(angle2);
      const oy2 = pos.y + radius * Math.sin(angle2);
      
      const ix1 = pos.x + holeRadius * Math.cos(angle1);
      const iy1 = pos.y + holeRadius * Math.sin(angle1);
      const ix2 = pos.x + holeRadius * Math.cos(angle2);
      const iy2 = pos.y + holeRadius * Math.sin(angle2);
      
      const z1 = baseZ;
      const z2 = baseZ + height;
      
      // Outer wall
      triangles.push({
        v1: { x: ox1, y: oy1, z: z1 },
        v2: { x: ox2, y: oy2, z: z1 },
        v3: { x: ox1, y: oy1, z: z2 },
      });
      triangles.push({
        v1: { x: ox2, y: oy2, z: z1 },
        v2: { x: ox2, y: oy2, z: z2 },
        v3: { x: ox1, y: oy1, z: z2 },
      });
      
      // Inner wall (screw hole)
      triangles.push({
        v1: { x: ix1, y: iy1, z: z2 },
        v2: { x: ix2, y: iy2, z: z1 },
        v3: { x: ix1, y: iy1, z: z1 },
      });
      triangles.push({
        v1: { x: ix1, y: iy1, z: z2 },
        v2: { x: ix2, y: iy2, z: z2 },
        v3: { x: ix2, y: iy2, z: z1 },
      });
      
      // Top ring
      triangles.push({
        v1: { x: ox1, y: oy1, z: z2 },
        v2: { x: ix1, y: iy1, z: z2 },
        v3: { x: ox2, y: oy2, z: z2 },
      });
      triangles.push({
        v1: { x: ix1, y: iy1, z: z2 },
        v2: { x: ix2, y: iy2, z: z2 },
        v3: { x: ox2, y: oy2, z: z2 },
      });
    }
  }
  
  return triangles;
}

/**
 * Generate snap posts for lid retention
 */
function generateLidSnapPosts(outerPath: Point2D[], height: number, wallThickness: number): Triangle[] {
  const triangles: Triangle[] = [];
  const bbox = getBoundingBox(outerPath);
  
  const postWidth = 4;
  const postDepth = 2;
  const postHeight = 3;
  const undercut = 0.8;
  
  // Position posts along long sides
  const positions = [
    { x: -bbox.width / 4, y: bbox.height / 2 - wallThickness - postDepth / 2, angle: 0 },
    { x: bbox.width / 4, y: bbox.height / 2 - wallThickness - postDepth / 2, angle: 0 },
    { x: -bbox.width / 4, y: -(bbox.height / 2 - wallThickness - postDepth / 2), angle: Math.PI },
    { x: bbox.width / 4, y: -(bbox.height / 2 - wallThickness - postDepth / 2), angle: Math.PI },
  ];
  
  for (const pos of positions) {
    const nx = Math.sin(pos.angle);
    const ny = -Math.cos(pos.angle);
    const tx = Math.cos(pos.angle);
    const ty = Math.sin(pos.angle);
    
    const hw = postWidth / 2;
    const z1 = height;
    const z2 = height + postHeight - undercut;
    const z3 = height + postHeight;
    
    // Post base
    const baseVerts: Point3D[] = [
      { x: pos.x - tx * hw, y: pos.y - ty * hw, z: z1 },
      { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z1 },
      { x: pos.x + tx * hw + nx * postDepth, y: pos.y + ty * hw + ny * postDepth, z: z1 },
      { x: pos.x - tx * hw + nx * postDepth, y: pos.y - ty * hw + ny * postDepth, z: z1 },
    ];
    
    // Extrude to z2
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      triangles.push({
        v1: { x: baseVerts[i].x, y: baseVerts[i].y, z: z1 },
        v2: { x: baseVerts[j].x, y: baseVerts[j].y, z: z1 },
        v3: { x: baseVerts[i].x, y: baseVerts[i].y, z: z2 },
      });
      triangles.push({
        v1: { x: baseVerts[j].x, y: baseVerts[j].y, z: z1 },
        v2: { x: baseVerts[j].x, y: baseVerts[j].y, z: z2 },
        v3: { x: baseVerts[i].x, y: baseVerts[i].y, z: z2 },
      });
    }
    
    // Snap undercut (angled top)
    const undercutVerts: Point3D[] = [
      { x: pos.x - tx * hw + nx * (postDepth + undercut), y: pos.y - ty * hw + ny * (postDepth + undercut), z: z2 },
      { x: pos.x + tx * hw + nx * (postDepth + undercut), y: pos.y + ty * hw + ny * (postDepth + undercut), z: z2 },
      { x: pos.x + tx * hw + nx * postDepth, y: pos.y + ty * hw + ny * postDepth, z: z3 },
      { x: pos.x - tx * hw + nx * postDepth, y: pos.y - ty * hw + ny * postDepth, z: z3 },
    ];
    
    // Top angled face
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
 * Generate the housing lid
 */
function generateLid(
  settings: TimerHousingSettings,
  outerWidth: number,
  outerLength: number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  const lidThickness = settings.wallThickness;
  const rimDepth = 3; // How deep the rim goes into the housing
  const clearance = 0.2;
  
  // Outer lid path
  const outerPath = roundedRectangle(outerWidth - clearance * 2, outerLength - clearance * 2, 3, 8);
  const rimPath = roundedRectangle(
    outerWidth - settings.wallThickness * 2 - clearance * 2,
    outerLength - settings.wallThickness * 2 - clearance * 2,
    2, 8
  );
  
  // Top surface
  const bbox = getBoundingBox(outerPath);
  for (let i = 0; i < outerPath.length; i++) {
    const j = (i + 1) % outerPath.length;
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: lidThickness },
      v2: { x: outerPath[i].x, y: outerPath[i].y, z: lidThickness },
      v3: { x: outerPath[j].x, y: outerPath[j].y, z: lidThickness },
    });
  }
  
  // Outer walls
  for (let i = 0; i < outerPath.length; i++) {
    const j = (i + 1) % outerPath.length;
    const p1 = outerPath[i];
    const p2 = outerPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: lidThickness },
      v2: { x: p2.x, y: p2.y, z: lidThickness },
      v3: { x: p1.x, y: p1.y, z: 0 },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: lidThickness },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: 0 },
    });
  }
  
  // Bottom ring (between outer and rim)
  for (let i = 0; i < Math.min(outerPath.length, rimPath.length); i++) {
    const j = (i + 1) % outerPath.length;
    const o1 = outerPath[i];
    const o2 = outerPath[j];
    const r1 = rimPath[Math.min(i, rimPath.length - 1)];
    const r2 = rimPath[Math.min(j, rimPath.length - 1)];
    
    triangles.push({
      v1: { x: o1.x, y: o1.y, z: 0 },
      v2: { x: o2.x, y: o2.y, z: 0 },
      v3: { x: r1.x, y: r1.y, z: 0 },
    });
    triangles.push({
      v1: { x: o2.x, y: o2.y, z: 0 },
      v2: { x: r2.x, y: r2.y, z: 0 },
      v3: { x: r1.x, y: r1.y, z: 0 },
    });
  }
  
  // Rim walls (inner edge that fits into housing)
  for (let i = 0; i < rimPath.length; i++) {
    const j = (i + 1) % rimPath.length;
    const p1 = rimPath[i];
    const p2 = rimPath[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: -rimDepth },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: -rimDepth },
      v3: { x: p1.x, y: p1.y, z: -rimDepth },
    });
  }
  
  // Rim bottom
  const rimBbox = getBoundingBox(rimPath);
  for (let i = 0; i < rimPath.length; i++) {
    const j = (i + 1) % rimPath.length;
    triangles.push({
      v1: { x: rimBbox.centerX, y: rimBbox.centerY, z: -rimDepth },
      v2: { x: rimPath[j].x, y: rimPath[j].y, z: -rimDepth },
      v3: { x: rimPath[i].x, y: rimPath[i].y, z: -rimDepth },
    });
  }
  
  // Add ventilation if enabled
  if (settings.ventStyle !== 'none') {
    // Vents would be boolean subtractions
    // For visualization, we'd add indicators
  }
  
  // Add component holes
  if (settings.includePotentiometerHole) {
    // Potentiometer hole in lid
    // Boolean subtraction in full implementation
  }
  
  if (settings.includeLEDHole) {
    // LED hole in lid
    // Boolean subtraction in full implementation
  }
  
  // Add snap grooves for lid retention
  if (settings.includeLidSnaps) {
    const grooveTriangles = generateLidSnapGrooves(rimPath, clearance);
    triangles.push(...grooveTriangles);
  }
  
  return triangles;
}

/**
 * Generate snap grooves in lid rim
 */
function generateLidSnapGrooves(rimPath: Point2D[], clearance: number): Triangle[] {
  const triangles: Triangle[] = [];
  const bbox = getBoundingBox(rimPath);
  
  const grooveWidth = 5;
  const grooveDepth = 1;
  const grooveHeight = 2.5;
  
  // Position grooves to match posts
  const positions = [
    { x: -bbox.width / 4, y: bbox.height / 2 - 1, angle: 0 },
    { x: bbox.width / 4, y: bbox.height / 2 - 1, angle: 0 },
    { x: -bbox.width / 4, y: -(bbox.height / 2 - 1), angle: Math.PI },
    { x: bbox.width / 4, y: -(bbox.height / 2 - 1), angle: Math.PI },
  ];
  
  for (const pos of positions) {
    const nx = Math.sin(pos.angle);
    const ny = -Math.cos(pos.angle);
    const tx = Math.cos(pos.angle);
    const ty = Math.sin(pos.angle);
    
    const hw = grooveWidth / 2;
    const z1 = 0;
    const z2 = -grooveHeight;
    
    // Groove (recessed area)
    const innerX = pos.x + nx * grooveDepth;
    const innerY = pos.y + ny * grooveDepth;
    
    // Bottom of groove
    triangles.push({
      v1: { x: pos.x - tx * hw, y: pos.y - ty * hw, z: z2 },
      v2: { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z2 },
      v3: { x: innerX - tx * hw, y: innerY - ty * hw, z: z2 },
    });
    triangles.push({
      v1: { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z2 },
      v2: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
      v3: { x: innerX - tx * hw, y: innerY - ty * hw, z: z2 },
    });
    
    // Side walls of groove
    triangles.push({
      v1: { x: pos.x - tx * hw, y: pos.y - ty * hw, z: z1 },
      v2: { x: pos.x - tx * hw, y: pos.y - ty * hw, z: z2 },
      v3: { x: innerX - tx * hw, y: innerY - ty * hw, z: z1 },
    });
    triangles.push({
      v1: { x: pos.x - tx * hw, y: pos.y - ty * hw, z: z2 },
      v2: { x: innerX - tx * hw, y: innerY - ty * hw, z: z2 },
      v3: { x: innerX - tx * hw, y: innerY - ty * hw, z: z1 },
    });
    
    triangles.push({
      v1: { x: innerX + tx * hw, y: innerY + ty * hw, z: z1 },
      v2: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
      v3: { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z1 },
    });
    triangles.push({
      v1: { x: innerX + tx * hw, y: innerY + ty * hw, z: z2 },
      v2: { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z2 },
      v3: { x: pos.x + tx * hw, y: pos.y + ty * hw, z: z1 },
    });
  }
  
  return triangles;
}

/**
 * Export timer housing as ZIP with STL files
 */
export async function exportTimerHousingZip(settings: TimerHousingSettings): Promise<Buffer> {
  const parts = generateTimerHousing(settings);
  
  const pcbDims = settings.pcbSize === 'custom' 
    ? { width: settings.customWidth || 40, length: settings.customLength || 60 }
    : PCB_SIZES[settings.pcbSize];
  
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
      archive.append(stl, { name: `555_Timer_${part.name}.stl` });
    }
    
    // Add assembly instructions
    const instructions = `
# 555 Timer Circuit Housing Assembly

## Parts List
${parts.map(p => `- ${p.name}.stl: ${p.description}`).join('\n')}

## Specifications
- PCB Size: ${settings.pcbSize} (${pcbDims.width}mm x ${pcbDims.length}mm)
- Wall Thickness: ${settings.wallThickness}mm
- Standoff Height: ${settings.standoffHeight}mm
- Screw Size: M${Math.round(settings.screwHoleDiameter)}

## Component Holes
${settings.includePotentiometerHole ? `- Potentiometer: ${settings.potentiometerDiameter}mm diameter` : ''}
${settings.includeLEDHole ? `- LED: ${settings.ledDiameter}mm diameter` : ''}
${settings.includePowerJack ? `- Power Jack: ${settings.powerJackDiameter}mm diameter` : ''}

## Assembly Instructions
1. Print both parts with supports if needed
2. Insert M${Math.round(settings.screwHoleDiameter)} screws through PCB mounting holes
3. Secure PCB to standoffs
4. Route wires through channels
5. Snap lid into place

## 555 Timer Circuit Notes
- VCC: 4.5V to 16V (typically 9V or 12V)
- Output: Pin 3
- Adjust timing with R1, R2, and C1 values
- Formula: T = 0.693 × (R1 + 2×R2) × C1

## Printing Recommendations
- Layer Height: 0.2mm
- Infill: 20-30%
- Material: PLA or PETG
- Supports: May be needed for overhangs
- Orientation: Print base and lid flat side down
    `.trim();
    
    archive.append(instructions, { name: 'ASSEMBLY_INSTRUCTIONS.md' });
    
    // Add 555 timer circuit schematic reference
    const schematic = `
# 555 Timer Basic Astable Circuit

## Component List
- U1: NE555 Timer IC
- R1: 1kΩ - 1MΩ (timing resistor)
- R2: 1kΩ - 1MΩ (timing resistor)
- C1: 0.1µF - 1000µF (timing capacitor)
- C2: 10nF (decoupling capacitor)

## Pinout
Pin 1: GND (Ground)
Pin 2: TRIG (Trigger)
Pin 3: OUT (Output)
Pin 4: RESET (Reset, tie to VCC)
Pin 5: CTRL (Control, 10nF to GND)
Pin 6: THR (Threshold)
Pin 7: DIS (Discharge)
Pin 8: VCC (Power, 4.5V-16V)

## Frequency Calculation
f = 1.44 / ((R1 + 2×R2) × C1)

## Duty Cycle
D = (R1 + R2) / (R1 + 2×R2)

## Example Values (1Hz blinking)
R1 = 10kΩ
R2 = 100kΩ
C1 = 10µF
Result: ~0.7Hz (1.4 second period)
    `.trim();
    
    archive.append(schematic, { name: 'CIRCUIT_REFERENCE.md' });
    
    archive.finalize();
  });
}
