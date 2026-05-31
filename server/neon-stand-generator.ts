/**
 * Neon Stand Designer Generator
 * 
 * Creates portable LED neon signs with split tubes, bases, and battery housing.
 * Perfect for desk signs, event displays, and portable signage.
 */

import {
  HARDWARE_PROFILES,
  TOLERANCE_PROFILES,
  type LightType,
  type FitType,
  type Triangle,
  type Point2D,
  type Point3D,
  calculateNormal,
  circle,
  roundedRectangle,
  offsetPolygon,
  getBoundingBox,
  trianglesToSTL,
} from './geometry-engine';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export type BaseStyle = 'rectangular' | 'oval' | 'weighted' | 'minimal' | 'angled';
export type TubeStyle = 'split_half' | 'full_round' | 'channel';
export type MountType = 'friction' | 'screw' | 'magnetic' | 'adhesive';

export interface NeonStandSettings {
  text: string;
  fontSize: number;
  fontFamily: string;
  lightType: LightType;
  tubeStyle: TubeStyle;
  baseStyle: BaseStyle;
  baseWidth: number;
  baseDepth: number;
  baseHeight: number;
  signHeight: number;
  wallThickness: number;
  mountType: MountType;
  includeBatteryCompartment: boolean;
  batteryType: 'AAA' | 'AA' | '18650' | 'USB';
  includeSwitch: boolean;
  includeStandoffs: boolean;
  standoffHeight: number;
}

export const defaultNeonStandSettings: NeonStandSettings = {
  text: 'OPEN',
  fontSize: 50,
  fontFamily: 'Arial',
  lightType: 'silicone_neon_6mm',
  tubeStyle: 'split_half',
  baseStyle: 'rectangular',
  baseWidth: 150,
  baseDepth: 40,
  baseHeight: 15,
  signHeight: 80,
  wallThickness: 2,
  mountType: 'friction',
  includeBatteryCompartment: true,
  batteryType: 'AAA',
  includeSwitch: true,
  includeStandoffs: true,
  standoffHeight: 10,
};

interface GeneratedPart {
  name: string;
  triangles: Triangle[];
  description: string;
}

/**
 * Generate complete neon stand with all components
 */
export function generateNeonStand(settings: NeonStandSettings): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const hardware = HARDWARE_PROFILES[settings.lightType];
  
  // Generate base
  const basePart = generateBase(settings, hardware);
  parts.push(basePart);
  
  // Generate sign holder uprights
  const uprightParts = generateUprights(settings, hardware);
  parts.push(...uprightParts);
  
  // Generate sign shell (front half)
  const signFront = generateSignShell(settings, hardware, 'front');
  parts.push(signFront);
  
  // Generate sign shell (back half)
  const signBack = generateSignShell(settings, hardware, 'back');
  parts.push(signBack);
  
  // Generate battery compartment cover if enabled
  if (settings.includeBatteryCompartment) {
    const batteryLid = generateBatteryLid(settings);
    parts.push(batteryLid);
  }
  
  return parts;
}

/**
 * Generate the base of the stand
 */
function generateBase(settings: NeonStandSettings, hardware: typeof HARDWARE_PROFILES[LightType]): GeneratedPart {
  const triangles: Triangle[] = [];
  const segments = 32;
  
  let basePath: Point2D[];
  
  switch (settings.baseStyle) {
    case 'oval':
      basePath = [];
      for (let i = 0; i < segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        basePath.push({
          x: (settings.baseWidth / 2) * Math.cos(angle),
          y: (settings.baseDepth / 2) * Math.sin(angle),
        });
      }
      break;
    case 'weighted':
      // Weighted base with heavier front
      basePath = roundedRectangle(settings.baseWidth, settings.baseDepth * 1.5, 10, 8);
      break;
    case 'minimal':
      // Two small feet
      basePath = roundedRectangle(settings.baseWidth * 0.3, settings.baseDepth, 5, 8);
      break;
    case 'angled':
      // Angled display base
      basePath = [
        { x: -settings.baseWidth / 2, y: -settings.baseDepth / 2 },
        { x: settings.baseWidth / 2, y: -settings.baseDepth / 2 },
        { x: settings.baseWidth / 2 * 0.8, y: settings.baseDepth / 2 },
        { x: -settings.baseWidth / 2 * 0.8, y: settings.baseDepth / 2 },
      ];
      break;
    default: // rectangular
      basePath = roundedRectangle(settings.baseWidth, settings.baseDepth, 5, 8);
  }
  
  // Extrude base
  const baseTriangles = extrudeSimplePath(basePath, settings.baseHeight);
  triangles.push(...baseTriangles);
  
  // Add battery compartment cavity if enabled
  if (settings.includeBatteryCompartment) {
    const batteryTriangles = addBatteryCompartment(settings, basePath);
    // In a full implementation, these would be boolean subtracted
  }
  
  // Add upright mount points
  const mountTriangles = addMountPoints(settings, hardware);
  triangles.push(...mountTriangles);
  
  // Add switch cutout if enabled
  if (settings.includeSwitch) {
    // Switch hole would be boolean subtracted
  }
  
  // Add wire routing channels
  const wireChannels = addWireChannels(settings, hardware);
  // Wire channels would be boolean subtracted
  
  return {
    name: 'Base',
    triangles,
    description: `${settings.baseStyle} base with ${settings.includeBatteryCompartment ? 'battery compartment' : 'no battery'}`,
  };
}

/**
 * Generate upright supports for the sign
 */
function generateUprights(settings: NeonStandSettings, hardware: typeof HARDWARE_PROFILES[LightType]): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  
  if (!settings.includeStandoffs) {
    return parts;
  }
  
  const uprightWidth = 10;
  const uprightDepth = settings.wallThickness * 2 + hardware.channelWidth;
  const uprightHeight = settings.standoffHeight;
  
  // Left upright
  const leftTriangles = generateUpright(
    -settings.baseWidth / 3,
    0,
    uprightWidth,
    uprightDepth,
    uprightHeight,
    settings.baseHeight
  );
  parts.push({
    name: 'Upright_Left',
    triangles: leftTriangles,
    description: 'Left support upright',
  });
  
  // Right upright
  const rightTriangles = generateUpright(
    settings.baseWidth / 3,
    0,
    uprightWidth,
    uprightDepth,
    uprightHeight,
    settings.baseHeight
  );
  parts.push({
    name: 'Upright_Right',
    triangles: rightTriangles,
    description: 'Right support upright',
  });
  
  return parts;
}

/**
 * Generate a single upright support
 */
function generateUpright(
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
  baseZ: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const path = roundedRectangle(width, depth, 2, 4);
  
  // Translate path to position
  const translatedPath = path.map(p => ({
    x: p.x + x,
    y: p.y + y,
  }));
  
  // Extrude from base top to upright height
  const z1 = baseZ;
  const z2 = baseZ + height;
  
  for (let i = 0; i < translatedPath.length; i++) {
    const j = (i + 1) % translatedPath.length;
    const p1 = translatedPath[i];
    const p2 = translatedPath[j];
    
    // Side walls
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
  
  // Top face
  const bbox = getBoundingBox(translatedPath);
  for (let i = 0; i < translatedPath.length; i++) {
    const j = (i + 1) % translatedPath.length;
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: z2 },
      v2: { x: translatedPath[i].x, y: translatedPath[i].y, z: z2 },
      v3: { x: translatedPath[j].x, y: translatedPath[j].y, z: z2 },
    });
  }
  
  return triangles;
}

/**
 * Generate sign shell (split-half design)
 */
function generateSignShell(
  settings: NeonStandSettings,
  hardware: typeof HARDWARE_PROFILES[LightType],
  side: 'front' | 'back'
): GeneratedPart {
  const triangles: Triangle[] = [];
  
  // For now, generate a simple rectangular shell
  // In a full implementation, this would trace the text outline
  const textWidth = settings.fontSize * settings.text.length * 0.6;
  const textHeight = settings.fontSize;
  
  const shellWidth = textWidth + settings.wallThickness * 4 + hardware.channelWidth * 2;
  const shellHeight = textHeight + settings.wallThickness * 4 + hardware.channelWidth * 2;
  const shellDepth = (hardware.channelWidth / 2) + settings.wallThickness;
  
  const path = roundedRectangle(shellWidth, shellHeight, 10, 8);
  const innerPath = offsetPolygon(path, -(settings.wallThickness + hardware.channelWidth / 2));
  
  // Extrude the shell half
  const z1 = 0;
  const z2 = shellDepth;
  
  // Outer walls
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const p1 = path[i];
    const p2 = path[j];
    
    if (side === 'front') {
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
    } else {
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: -z2 },
        v2: { x: p2.x, y: p2.y, z: -z1 },
        v3: { x: p1.x, y: p1.y, z: -z1 },
      });
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: -z2 },
        v2: { x: p2.x, y: p2.y, z: -z2 },
        v3: { x: p2.x, y: p2.y, z: -z1 },
      });
    }
  }
  
  // Inner channel walls
  for (let i = 0; i < innerPath.length; i++) {
    const j = (i + 1) % innerPath.length;
    const p1 = innerPath[i];
    const p2 = innerPath[j];
    
    if (side === 'front') {
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: z2 },
        v2: { x: p2.x, y: p2.y, z: z1 },
        v3: { x: p1.x, y: p1.y, z: z1 },
      });
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: z2 },
        v2: { x: p2.x, y: p2.y, z: z2 },
        v3: { x: p2.x, y: p2.y, z: z1 },
      });
    } else {
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: -z1 },
        v2: { x: p2.x, y: p2.y, z: -z2 },
        v3: { x: p1.x, y: p1.y, z: -z2 },
      });
      triangles.push({
        v1: { x: p1.x, y: p1.y, z: -z1 },
        v2: { x: p2.x, y: p2.y, z: -z1 },
        v3: { x: p2.x, y: p2.y, z: -z2 },
      });
    }
  }
  
  // Face (ring between outer and inner)
  const faceZ = side === 'front' ? z2 : -z2;
  for (let i = 0; i < Math.min(path.length, innerPath.length); i++) {
    const j = (i + 1) % path.length;
    const o1 = path[i];
    const o2 = path[j];
    const i1 = innerPath[Math.min(i, innerPath.length - 1)];
    const i2 = innerPath[Math.min(j, innerPath.length - 1)];
    
    if (side === 'front') {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: faceZ },
        v2: { x: i1.x, y: i1.y, z: faceZ },
        v3: { x: o2.x, y: o2.y, z: faceZ },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z: faceZ },
        v2: { x: i2.x, y: i2.y, z: faceZ },
        v3: { x: o2.x, y: o2.y, z: faceZ },
      });
    } else {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: faceZ },
        v2: { x: o2.x, y: o2.y, z: faceZ },
        v3: { x: i1.x, y: i1.y, z: faceZ },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z: faceZ },
        v2: { x: o2.x, y: o2.y, z: faceZ },
        v3: { x: i2.x, y: i2.y, z: faceZ },
      });
    }
  }
  
  // Mating surface (flat face at z=0)
  const mateZ = side === 'front' ? z1 : -z1;
  for (let i = 0; i < Math.min(path.length, innerPath.length); i++) {
    const j = (i + 1) % path.length;
    const o1 = path[i];
    const o2 = path[j];
    const i1 = innerPath[Math.min(i, innerPath.length - 1)];
    const i2 = innerPath[Math.min(j, innerPath.length - 1)];
    
    if (side === 'front') {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: mateZ },
        v2: { x: o2.x, y: o2.y, z: mateZ },
        v3: { x: i1.x, y: i1.y, z: mateZ },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z: mateZ },
        v2: { x: o2.x, y: o2.y, z: mateZ },
        v3: { x: i2.x, y: i2.y, z: mateZ },
      });
    } else {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: mateZ },
        v2: { x: i1.x, y: i1.y, z: mateZ },
        v3: { x: o2.x, y: o2.y, z: mateZ },
      });
      triangles.push({
        v1: { x: i1.x, y: i1.y, z: mateZ },
        v2: { x: i2.x, y: i2.y, z: mateZ },
        v3: { x: o2.x, y: o2.y, z: mateZ },
      });
    }
  }
  
  // Add alignment pegs (front) or holes (back)
  const alignmentTriangles = generateAlignmentFeatures(path, side, settings.wallThickness);
  triangles.push(...alignmentTriangles);
  
  // Add friction lip for neon retention
  if (hardware.frictionLip && settings.tubeStyle === 'split_half') {
    const lipTriangles = generateChannelLip(innerPath, side, hardware.lipOverhang, z1, z2);
    triangles.push(...lipTriangles);
  }
  
  return {
    name: side === 'front' ? 'Sign_Front' : 'Sign_Back',
    triangles,
    description: `${side} half of the neon sign shell`,
  };
}

/**
 * Generate alignment pegs or holes
 */
function generateAlignmentFeatures(path: Point2D[], side: 'front' | 'back', thickness: number): Triangle[] {
  const triangles: Triangle[] = [];
  const bbox = getBoundingBox(path);
  const pegRadius = 2;
  const pegHeight = 3;
  const segments = 16;
  
  // Place pegs at corners
  const positions = [
    { x: bbox.minX + thickness * 2, y: bbox.minY + thickness * 2 },
    { x: bbox.maxX - thickness * 2, y: bbox.minY + thickness * 2 },
    { x: bbox.minX + thickness * 2, y: bbox.maxY - thickness * 2 },
    { x: bbox.maxX - thickness * 2, y: bbox.maxY - thickness * 2 },
  ];
  
  for (const pos of positions) {
    if (side === 'front') {
      // Add pegs
      const pegTriangles = generateCylinder(pos.x, pos.y, 0, pegRadius, pegHeight, segments, false);
      triangles.push(...pegTriangles);
    }
    // Back would have holes (boolean subtraction in full implementation)
  }
  
  return triangles;
}

/**
 * Generate a cylinder
 */
function generateCylinder(
  cx: number,
  cy: number,
  baseZ: number,
  radius: number,
  height: number,
  segments: number,
  hollow: boolean
): Triangle[] {
  const triangles: Triangle[] = [];
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (2 * Math.PI * i) / segments;
    const angle2 = (2 * Math.PI * (i + 1)) / segments;
    
    const x1 = cx + radius * Math.cos(angle1);
    const y1 = cy + radius * Math.sin(angle1);
    const x2 = cx + radius * Math.cos(angle2);
    const y2 = cy + radius * Math.sin(angle2);
    
    // Side walls
    triangles.push({
      v1: { x: x1, y: y1, z: baseZ },
      v2: { x: x2, y: y2, z: baseZ },
      v3: { x: x1, y: y1, z: baseZ + height },
    });
    triangles.push({
      v1: { x: x2, y: y2, z: baseZ },
      v2: { x: x2, y: y2, z: baseZ + height },
      v3: { x: x1, y: y1, z: baseZ + height },
    });
    
    if (!hollow) {
      // Top cap
      triangles.push({
        v1: { x: cx, y: cy, z: baseZ + height },
        v2: { x: x1, y: y1, z: baseZ + height },
        v3: { x: x2, y: y2, z: baseZ + height },
      });
      
      // Bottom cap
      triangles.push({
        v1: { x: cx, y: cy, z: baseZ },
        v2: { x: x2, y: y2, z: baseZ },
        v3: { x: x1, y: y1, z: baseZ },
      });
    }
  }
  
  return triangles;
}

/**
 * Generate friction lip inside channel
 */
function generateChannelLip(
  innerPath: Point2D[],
  side: 'front' | 'back',
  overhang: number,
  z1: number,
  z2: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const lipPath = offsetPolygon(innerPath, -overhang);
  const lipZ = side === 'front' ? z2 - 1 : -(z2 - 1);
  const lipHeight = 1.5;
  
  for (let i = 0; i < Math.min(innerPath.length, lipPath.length); i++) {
    const j = (i + 1) % innerPath.length;
    const o1 = innerPath[i];
    const o2 = innerPath[j];
    const l1 = lipPath[Math.min(i, lipPath.length - 1)];
    const l2 = lipPath[Math.min(j, lipPath.length - 1)];
    
    // Lip surface
    if (side === 'front') {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: lipZ },
        v2: { x: o2.x, y: o2.y, z: lipZ },
        v3: { x: l1.x, y: l1.y, z: lipZ },
      });
      triangles.push({
        v1: { x: o2.x, y: o2.y, z: lipZ },
        v2: { x: l2.x, y: l2.y, z: lipZ },
        v3: { x: l1.x, y: l1.y, z: lipZ },
      });
    } else {
      triangles.push({
        v1: { x: o1.x, y: o1.y, z: lipZ },
        v2: { x: l1.x, y: l1.y, z: lipZ },
        v3: { x: o2.x, y: o2.y, z: lipZ },
      });
      triangles.push({
        v1: { x: o2.x, y: o2.y, z: lipZ },
        v2: { x: l1.x, y: l1.y, z: lipZ },
        v3: { x: l2.x, y: l2.y, z: lipZ },
      });
    }
  }
  
  return triangles;
}

/**
 * Generate battery compartment lid
 */
function generateBatteryLid(settings: NeonStandSettings): GeneratedPart {
  const triangles: Triangle[] = [];
  
  // Battery compartment dimensions
  const batteryWidth = settings.batteryType === 'AAA' ? 12 : settings.batteryType === 'AA' ? 16 : 20;
  const batteryLength = settings.batteryType === 'AAA' ? 46 : settings.batteryType === 'AA' ? 52 : 70;
  const lidWidth = batteryWidth + 6;
  const lidLength = batteryLength + 10;
  const lidThickness = 2;
  
  const path = roundedRectangle(lidWidth, lidLength, 3, 4);
  
  // Extrude lid
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const p1 = path[i];
    const p2 = path[j];
    
    // Walls
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: lidThickness },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: lidThickness },
      v3: { x: p1.x, y: p1.y, z: lidThickness },
    });
  }
  
  // Top and bottom
  const bbox = getBoundingBox(path);
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    
    // Top
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: lidThickness },
      v2: { x: path[i].x, y: path[i].y, z: lidThickness },
      v3: { x: path[j].x, y: path[j].y, z: lidThickness },
    });
    
    // Bottom
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: 0 },
      v2: { x: path[j].x, y: path[j].y, z: 0 },
      v3: { x: path[i].x, y: path[i].y, z: 0 },
    });
  }
  
  return {
    name: 'Battery_Lid',
    triangles,
    description: `Battery compartment cover for ${settings.batteryType} batteries`,
  };
}

// Helper functions

function extrudeSimplePath(path: Point2D[], height: number): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Side walls
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const p1 = path[i];
    const p2 = path[j];
    
    triangles.push({
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: 0 },
      v3: { x: p1.x, y: p1.y, z: height },
    });
    triangles.push({
      v1: { x: p2.x, y: p2.y, z: 0 },
      v2: { x: p2.x, y: p2.y, z: height },
      v3: { x: p1.x, y: p1.y, z: height },
    });
  }
  
  // Top and bottom
  const bbox = getBoundingBox(path);
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    
    // Top
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: height },
      v2: { x: path[i].x, y: path[i].y, z: height },
      v3: { x: path[j].x, y: path[j].y, z: height },
    });
    
    // Bottom
    triangles.push({
      v1: { x: bbox.centerX, y: bbox.centerY, z: 0 },
      v2: { x: path[j].x, y: path[j].y, z: 0 },
      v3: { x: path[i].x, y: path[i].y, z: 0 },
    });
  }
  
  return triangles;
}

function addBatteryCompartment(settings: NeonStandSettings, basePath: Point2D[]): Triangle[] {
  // Placeholder - in full implementation this would create a cavity
  return [];
}

function addMountPoints(settings: NeonStandSettings, hardware: typeof HARDWARE_PROFILES[LightType]): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Add screw mounts or friction posts based on mount type
  if (settings.mountType === 'screw') {
    // Add screw boss cylinders
  } else if (settings.mountType === 'magnetic') {
    // Add magnet recesses
  }
  
  return triangles;
}

function addWireChannels(settings: NeonStandSettings, hardware: typeof HARDWARE_PROFILES[LightType]): Triangle[] {
  // Placeholder - wire channels would be subtracted from base
  return [];
}

/**
 * Export neon stand as ZIP with STL files
 */
export async function exportNeonStandZip(settings: NeonStandSettings): Promise<Buffer> {
  const parts = generateNeonStand(settings);
  
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
      archive.append(stl, { name: `${settings.text.replace(/\s+/g, '_')}_${part.name}.stl` });
    }
    
    // Add assembly instructions
    const instructions = `
# Neon Stand: "${settings.text}" Assembly Instructions

## Parts List
${parts.map(p => `- ${p.name}.stl: ${p.description}`).join('\n')}

## Specifications
- Text: "${settings.text}"
- Font Size: ${settings.fontSize}mm
- Light Type: ${HARDWARE_PROFILES[settings.lightType].name}
- Base Style: ${settings.baseStyle}
- Base Dimensions: ${settings.baseWidth}mm x ${settings.baseDepth}mm x ${settings.baseHeight}mm

## Assembly Instructions
1. Print all parts
2. Install ${settings.batteryType} batteries if using battery power
3. Route LED wire through base channel
4. Snap front and back sign halves together around LED tube
5. Mount sign on uprights
6. Connect power and test

## LED Installation
- Channel Width: ${HARDWARE_PROFILES[settings.lightType].channelWidth}mm
- Use ${HARDWARE_PROFILES[settings.lightType].name} for best fit
${HARDWARE_PROFILES[settings.lightType].frictionLip ? '- Friction lips will hold the LED in place' : '- Use adhesive or clips to secure LED'}

## Printing Recommendations
- Layer Height: 0.2mm
- Infill: 20%
- Material: PLA or PETG
- Supports: May be needed for overhangs

## Power Options
${settings.batteryType === 'USB' ? '- USB powered (5V input)' : `- ${settings.batteryType} batteries`}
${settings.includeSwitch ? '- Built-in on/off switch' : '- External switch recommended'}
    `.trim();
    
    archive.append(instructions, { name: 'ASSEMBLY_INSTRUCTIONS.md' });
    
    archive.finalize();
  });
}
