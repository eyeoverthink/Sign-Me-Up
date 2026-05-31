import { HexPanelSettings } from "@shared/schema";

interface Triangle {
  vertices: [number, number, number][];
  normal: [number, number, number];
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

function trianglesToSTL(triangles: Triangle[], name: string = "HexPanel"): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  
  buffer.write(`${name} STL - SignCraft3D`, 0);
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

function getHexPoints(radius: number, centerX: number = 0, centerY: number = 0): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    points.push([
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle)
    ]);
  }
  return points;
}

function generateHexTube(settings: HexPanelSettings, activeEdges: number[]): Triangle[] {
  const triangles: Triangle[] = [];
  const { hexRadius, hexThickness, wallThickness, ledChannelDiameter } = settings;
  
  const outerPoints = getHexPoints(hexRadius);
  const innerRadius = hexRadius - wallThickness;
  const innerPoints = getHexPoints(innerRadius);
  const ledChannelRadius = ledChannelDiameter / 2;
  
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    
    const ox1 = outerPoints[i][0], oy1 = outerPoints[i][1];
    const ox2 = outerPoints[next][0], oy2 = outerPoints[next][1];
    const ix1 = innerPoints[i][0], iy1 = innerPoints[i][1];
    const ix2 = innerPoints[next][0], iy2 = innerPoints[next][1];
    
    const ov1: [number, number, number] = [ox1, oy1, 0];
    const ov2: [number, number, number] = [ox2, oy2, 0];
    const ov3: [number, number, number] = [ox1, oy1, hexThickness];
    const ov4: [number, number, number] = [ox2, oy2, hexThickness];
    
    triangles.push({ vertices: [ov1, ov2, ov3], normal: calculateNormal(ov1, ov2, ov3) });
    triangles.push({ vertices: [ov2, ov4, ov3], normal: calculateNormal(ov2, ov4, ov3) });
    
    const iv1: [number, number, number] = [ix1, iy1, 0];
    const iv2: [number, number, number] = [ix2, iy2, 0];
    const iv3: [number, number, number] = [ix1, iy1, hexThickness];
    const iv4: [number, number, number] = [ix2, iy2, hexThickness];
    
    triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
    triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
    
    triangles.push({ vertices: [ov1, ov3, iv1], normal: [0, 0, -1] });
    triangles.push({ vertices: [iv1, ov3, iv3], normal: [0, 0, -1] });
    triangles.push({ vertices: [ov2, iv2, ov4], normal: [0, 0, -1] });
    triangles.push({ vertices: [iv2, iv4, ov4], normal: [0, 0, -1] });
    
    if (!activeEdges.includes(i)) {
      triangles.push({ vertices: [ov3, ov4, iv3], normal: [0, 0, 1] });
      triangles.push({ vertices: [iv3, ov4, iv4], normal: [0, 0, 1] });
    }
  }
  
  // LED channel - properly closed tube structure 
  // Creates a hollow channel running through center of hex for wiring
  const radialSegs = 16;
  const channelWall = 1.5; // Wall thickness for LED channel tube
  const outerChannelR = ledChannelRadius;
  const innerChannelR = ledChannelRadius - channelWall;
  
  for (let j = 0; j < radialSegs; j++) {
    const theta1 = (j / radialSegs) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegs) * Math.PI * 2;
    
    // Outer surface of channel
    const ox1 = outerChannelR * Math.cos(theta1), oy1 = outerChannelR * Math.sin(theta1);
    const ox2 = outerChannelR * Math.cos(theta2), oy2 = outerChannelR * Math.sin(theta2);
    // Inner surface of channel (hollow core)
    const ix1 = innerChannelR * Math.cos(theta1), iy1 = innerChannelR * Math.sin(theta1);
    const ix2 = innerChannelR * Math.cos(theta2), iy2 = innerChannelR * Math.sin(theta2);
    
    // Outer channel wall
    const ov1: [number, number, number] = [ox1, oy1, 0];
    const ov2: [number, number, number] = [ox2, oy2, 0];
    const ov3: [number, number, number] = [ox1, oy1, hexThickness];
    const ov4: [number, number, number] = [ox2, oy2, hexThickness];
    triangles.push({ vertices: [ov1, ov3, ov2], normal: calculateNormal(ov1, ov3, ov2) });
    triangles.push({ vertices: [ov2, ov3, ov4], normal: calculateNormal(ov2, ov3, ov4) });
    
    // Inner channel wall (hollow core)
    const iv1: [number, number, number] = [ix1, iy1, 0];
    const iv2: [number, number, number] = [ix2, iy2, 0];
    const iv3: [number, number, number] = [ix1, iy1, hexThickness];
    const iv4: [number, number, number] = [ix2, iy2, hexThickness];
    triangles.push({ vertices: [iv1, iv2, iv3], normal: calculateNormal(iv1, iv2, iv3) });
    triangles.push({ vertices: [iv2, iv4, iv3], normal: calculateNormal(iv2, iv4, iv3) });
    
    // Bottom rim (z=0) - connects outer to inner
    triangles.push({ vertices: [ov1, ov2, iv1], normal: [0, 0, -1] });
    triangles.push({ vertices: [iv1, ov2, iv2], normal: [0, 0, -1] });
    
    // Top rim (z=hexThickness) - connects outer to inner
    triangles.push({ vertices: [ov3, iv3, ov4], normal: [0, 0, 1] });
    triangles.push({ vertices: [iv3, iv4, ov4], normal: [0, 0, 1] });
  }
  
  return triangles;
}

function generateConnector(settings: HexPanelSettings, edgeIndex: number): Triangle[] {
  const triangles: Triangle[] = [];
  const { hexRadius, connectorLength, connectorDiameter, ledChannelDiameter, hexThickness } = settings;
  
  const angle = (edgeIndex * Math.PI) / 3 - Math.PI / 6 + Math.PI / 6;
  const edgeMidX = hexRadius * Math.cos(angle);
  const edgeMidY = hexRadius * Math.sin(angle);
  
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  
  const outerR = connectorDiameter / 2;
  const innerR = ledChannelDiameter / 2;
  const segments = 16;
  
  for (let j = 0; j < segments; j++) {
    const theta1 = (j / segments) * Math.PI * 2;
    const theta2 = ((j + 1) / segments) * Math.PI * 2;
    
    const localX1 = outerR * Math.cos(theta1);
    const localZ1 = outerR * Math.sin(theta1);
    const localX2 = outerR * Math.cos(theta2);
    const localZ2 = outerR * Math.sin(theta2);
    
    const perpX = -dirY;
    const perpY = dirX;
    
    const startX1 = edgeMidX + localX1 * perpX;
    const startY1 = edgeMidY + localX1 * perpY;
    const startZ1 = hexThickness / 2 + localZ1;
    
    const startX2 = edgeMidX + localX2 * perpX;
    const startY2 = edgeMidY + localX2 * perpY;
    const startZ2 = hexThickness / 2 + localZ2;
    
    const endX1 = startX1 + dirX * connectorLength;
    const endY1 = startY1 + dirY * connectorLength;
    const endX2 = startX2 + dirX * connectorLength;
    const endY2 = startY2 + dirY * connectorLength;
    
    const sv1: [number, number, number] = [startX1, startY1, startZ1];
    const sv2: [number, number, number] = [startX2, startY2, startZ2];
    const ev1: [number, number, number] = [endX1, endY1, startZ1];
    const ev2: [number, number, number] = [endX2, endY2, startZ2];
    
    triangles.push({ vertices: [sv1, sv2, ev1], normal: calculateNormal(sv1, sv2, ev1) });
    triangles.push({ vertices: [sv2, ev2, ev1], normal: calculateNormal(sv2, ev2, ev1) });
  }
  
  for (let j = 0; j < segments; j++) {
    const theta1 = (j / segments) * Math.PI * 2;
    const theta2 = ((j + 1) / segments) * Math.PI * 2;
    
    const outerX1 = outerR * Math.cos(theta1);
    const outerZ1 = outerR * Math.sin(theta1);
    const outerX2 = outerR * Math.cos(theta2);
    const outerZ2 = outerR * Math.sin(theta2);
    
    const innerX1 = innerR * Math.cos(theta1);
    const innerZ1 = innerR * Math.sin(theta1);
    const innerX2 = innerR * Math.cos(theta2);
    const innerZ2 = innerR * Math.sin(theta2);
    
    const perpX = -dirY;
    const perpY = dirX;
    
    const endX = edgeMidX + dirX * connectorLength;
    const endY = edgeMidY + dirY * connectorLength;
    
    const oex1 = endX + outerX1 * perpX;
    const oey1 = endY + outerX1 * perpY;
    const oez1 = hexThickness / 2 + outerZ1;
    
    const oex2 = endX + outerX2 * perpX;
    const oey2 = endY + outerX2 * perpY;
    const oez2 = hexThickness / 2 + outerZ2;
    
    const iex1 = endX + innerX1 * perpX;
    const iey1 = endY + innerX1 * perpY;
    const iez1 = hexThickness / 2 + innerZ1;
    
    const iex2 = endX + innerX2 * perpX;
    const iey2 = endY + innerX2 * perpY;
    const iez2 = hexThickness / 2 + innerZ2;
    
    const ov1: [number, number, number] = [oex1, oey1, oez1];
    const ov2: [number, number, number] = [oex2, oey2, oez2];
    const iv1: [number, number, number] = [iex1, iey1, iez1];
    const iv2: [number, number, number] = [iex2, iey2, iez2];
    
    triangles.push({ vertices: [ov1, iv1, ov2], normal: calculateNormal(ov1, iv1, ov2) });
    triangles.push({ vertices: [ov2, iv1, iv2], normal: calculateNormal(ov2, iv1, iv2) });
  }
  
  return triangles;
}

function generateDiffuser(settings: HexPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { hexRadius, diffuserThickness } = settings;
  
  const diffuserRadius = hexRadius * 0.85;
  const points = getHexPoints(diffuserRadius);
  const center: [number, number, number] = [0, 0, 0];
  
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const v1: [number, number, number] = [points[i][0], points[i][1], 0];
    const v2: [number, number, number] = [points[next][0], points[next][1], 0];
    triangles.push({ vertices: [center, v1, v2], normal: [0, 0, -1] });
  }
  
  const topCenter: [number, number, number] = [0, 0, diffuserThickness];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const v1: [number, number, number] = [points[i][0], points[i][1], diffuserThickness];
    const v2: [number, number, number] = [points[next][0], points[next][1], diffuserThickness];
    triangles.push({ vertices: [topCenter, v2, v1], normal: [0, 0, 1] });
  }
  
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const bv1: [number, number, number] = [points[i][0], points[i][1], 0];
    const bv2: [number, number, number] = [points[next][0], points[next][1], 0];
    const tv1: [number, number, number] = [points[i][0], points[i][1], diffuserThickness];
    const tv2: [number, number, number] = [points[next][0], points[next][1], diffuserThickness];
    
    triangles.push({ vertices: [bv1, bv2, tv1], normal: calculateNormal(bv1, bv2, tv1) });
    triangles.push({ vertices: [bv2, tv2, tv1], normal: calculateNormal(bv2, tv2, tv1) });
  }
  
  return triangles;
}

function generateMountingClip(settings: HexPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { hexThickness } = settings;
  
  const clipWidth = 15;
  const clipHeight = 10;
  const clipDepth = hexThickness + 4;
  const holeRadius = 2;
  
  const hw = clipWidth / 2;
  const hh = clipHeight / 2;
  
  const vertices: [number, number, number][] = [
    [-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0],
    [-hw, -hh, clipDepth], [hw, -hh, clipDepth], [hw, hh, clipDepth], [-hw, hh, clipDepth]
  ];
  
  triangles.push({ vertices: [vertices[0], vertices[1], vertices[2]], normal: [0, 0, -1] });
  triangles.push({ vertices: [vertices[0], vertices[2], vertices[3]], normal: [0, 0, -1] });
  triangles.push({ vertices: [vertices[4], vertices[6], vertices[5]], normal: [0, 0, 1] });
  triangles.push({ vertices: [vertices[4], vertices[7], vertices[6]], normal: [0, 0, 1] });
  triangles.push({ vertices: [vertices[0], vertices[4], vertices[1]], normal: [0, -1, 0] });
  triangles.push({ vertices: [vertices[1], vertices[4], vertices[5]], normal: [0, -1, 0] });
  triangles.push({ vertices: [vertices[2], vertices[6], vertices[3]], normal: [0, 1, 0] });
  triangles.push({ vertices: [vertices[3], vertices[6], vertices[7]], normal: [0, 1, 0] });
  triangles.push({ vertices: [vertices[0], vertices[3], vertices[4]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [vertices[3], vertices[7], vertices[4]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [vertices[1], vertices[5], vertices[2]], normal: [1, 0, 0] });
  triangles.push({ vertices: [vertices[2], vertices[5], vertices[6]], normal: [1, 0, 0] });
  
  return triangles;
}

function generateModuleVariants(settings: HexPanelSettings): { [key: string]: Triangle[] } {
  const variants: { [key: string]: Triangle[] } = {};
  
  const straightTris = generateHexTube(settings, [0, 3]);
  const conn0 = generateConnector(settings, 0);
  const conn3 = generateConnector(settings, 3);
  variants["straight"] = [...straightTris, ...conn0, ...conn3];
  
  const corner60Tris = generateHexTube(settings, [0, 1]);
  const cornerConn0 = generateConnector(settings, 0);
  const cornerConn1 = generateConnector(settings, 1);
  variants["corner_60"] = [...corner60Tris, ...cornerConn0, ...cornerConn1];
  
  const corner120Tris = generateHexTube(settings, [0, 2]);
  const c120Conn0 = generateConnector(settings, 0);
  const c120Conn2 = generateConnector(settings, 2);
  variants["corner_120"] = [...corner120Tris, ...c120Conn0, ...c120Conn2];
  
  const tSplitTris = generateHexTube(settings, [0, 2, 4]);
  const tConn0 = generateConnector(settings, 0);
  const tConn2 = generateConnector(settings, 2);
  const tConn4 = generateConnector(settings, 4);
  variants["t_split"] = [...tSplitTris, ...tConn0, ...tConn2, ...tConn4];
  
  const endCapTris = generateHexTube(settings, [0]);
  const endConn = generateConnector(settings, 0);
  variants["end_cap"] = [...endCapTris, ...endConn];
  
  return variants;
}

export function generateHexPanel(settings: HexPanelSettings): { [key: string]: Buffer } {
  const files: { [key: string]: Buffer } = {};
  
  if (settings.exportModuleSet) {
    const variants = generateModuleVariants(settings);
    for (const [name, triangles] of Object.entries(variants)) {
      files[`hex_module_${name}.stl`] = trianglesToSTL(triangles, `HexModule_${name}`);
    }
  } else {
    const hexTube = generateHexTube(settings, settings.activeConnections);
    let allTriangles = [...hexTube];
    
    for (const edge of settings.activeConnections) {
      const connector = generateConnector(settings, edge);
      allTriangles = [...allTriangles, ...connector];
    }
    
    files["hex_module_custom.stl"] = trianglesToSTL(allTriangles, "HexModule_Custom");
  }
  
  if (settings.diffuserEnabled) {
    const diffuser = generateDiffuser(settings);
    files["hex_diffuser.stl"] = trianglesToSTL(diffuser, "HexDiffuser");
  }
  
  if (settings.includeMountingClips) {
    const clip = generateMountingClip(settings);
    files["hex_mounting_clip.stl"] = trianglesToSTL(clip, "HexMountingClip");
  }
  
  return files;
}
