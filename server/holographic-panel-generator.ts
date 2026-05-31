import { HolographicPanelSettings, HoloPatternType } from "@shared/schema";

interface Triangle {
  vertices: [number, number, number][];
  normal: [number, number, number];
}

interface Point2D {
  x: number;
  y: number;
}

function createBox(x: number, y: number, z: number, w: number, h: number, d: number): Triangle[] {
  const triangles: Triangle[] = [];
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const cx = x, cy = y, cz = z;
  
  const addFace = (vertices: [number, number, number][], normal: [number, number, number]) => {
    triangles.push({ vertices: [vertices[0], vertices[1], vertices[2]], normal });
    if (vertices.length > 3) {
      triangles.push({ vertices: [vertices[0], vertices[2], vertices[3]], normal });
    }
  };
  
  addFace([
    [cx - hw, cy - hh, cz + hd],
    [cx + hw, cy - hh, cz + hd],
    [cx + hw, cy + hh, cz + hd],
    [cx - hw, cy + hh, cz + hd],
  ], [0, 0, 1]);
  
  addFace([
    [cx + hw, cy - hh, cz - hd],
    [cx - hw, cy - hh, cz - hd],
    [cx - hw, cy + hh, cz - hd],
    [cx + hw, cy + hh, cz - hd],
  ], [0, 0, -1]);
  
  addFace([
    [cx - hw, cy + hh, cz - hd],
    [cx - hw, cy + hh, cz + hd],
    [cx + hw, cy + hh, cz + hd],
    [cx + hw, cy + hh, cz - hd],
  ], [0, 1, 0]);
  
  addFace([
    [cx - hw, cy - hh, cz + hd],
    [cx - hw, cy - hh, cz - hd],
    [cx + hw, cy - hh, cz - hd],
    [cx + hw, cy - hh, cz + hd],
  ], [0, -1, 0]);
  
  addFace([
    [cx + hw, cy - hh, cz + hd],
    [cx + hw, cy - hh, cz - hd],
    [cx + hw, cy + hh, cz - hd],
    [cx + hw, cy + hh, cz + hd],
  ], [1, 0, 0]);
  
  addFace([
    [cx - hw, cy - hh, cz - hd],
    [cx - hw, cy - hh, cz + hd],
    [cx - hw, cy + hh, cz + hd],
    [cx - hw, cy + hh, cz - hd],
  ], [-1, 0, 0]);
  
  return triangles;
}

function createCylinder(x: number, y: number, z: number, radius: number, height: number, segments: number = 16): Triangle[] {
  const triangles: Triangle[] = [];
  const halfHeight = height / 2;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const x1 = x + Math.cos(angle1) * radius;
    const z1 = z + Math.sin(angle1) * radius;
    const x2 = x + Math.cos(angle2) * radius;
    const z2 = z + Math.sin(angle2) * radius;
    
    const nx = (Math.cos(angle1) + Math.cos(angle2)) / 2;
    const nz = (Math.sin(angle1) + Math.sin(angle2)) / 2;
    const len = Math.sqrt(nx * nx + nz * nz);
    
    triangles.push({
      vertices: [[x1, y - halfHeight, z1], [x2, y - halfHeight, z2], [x2, y + halfHeight, z2]],
      normal: [nx / len, 0, nz / len]
    });
    triangles.push({
      vertices: [[x1, y - halfHeight, z1], [x2, y + halfHeight, z2], [x1, y + halfHeight, z1]],
      normal: [nx / len, 0, nz / len]
    });
    
    triangles.push({
      vertices: [[x, y + halfHeight, z], [x1, y + halfHeight, z1], [x2, y + halfHeight, z2]],
      normal: [0, 1, 0]
    });
    triangles.push({
      vertices: [[x, y - halfHeight, z], [x2, y - halfHeight, z2], [x1, y - halfHeight, z1]],
      normal: [0, -1, 0]
    });
  }
  
  return triangles;
}

function generateFloralPattern(
  width: number,
  height: number,
  density: number,
  scale: number,
  rotation: number,
  thickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const numElements = Math.floor((density / 100) * 30);
  const elementSize = 8 * scale;
  
  const rotRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  
  for (let i = 0; i < numElements; i++) {
    for (let j = 0; j < numElements * (height / width); j++) {
      const baseX = -width / 2 + (i + 0.5) * (width / numElements);
      const baseY = -height / 2 + (j + 0.5) * (height / (numElements * (height / width)));
      
      const rx = cos * baseX - sin * baseY;
      const ry = sin * baseX + cos * baseY;
      
      if (Math.abs(rx) < width / 2 - 5 && Math.abs(ry) < height / 2 - 5) {
        for (let p = 0; p < 5; p++) {
          const angle = (p / 5) * Math.PI * 2;
          const px = rx + Math.cos(angle) * elementSize;
          const py = ry + Math.sin(angle) * elementSize;
          triangles.push(...createBox(px, py, 0, elementSize * 0.4, elementSize * 0.15, thickness));
        }
        triangles.push(...createCylinder(rx, ry, 0, elementSize * 0.2, thickness, 8));
      }
    }
  }
  
  return triangles;
}

function generateGeometricPattern(
  width: number,
  height: number,
  density: number,
  scale: number,
  rotation: number,
  thickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const hexRadius = 12 * scale;
  const spacing = hexRadius * 2 * (1 - density / 200);
  
  const rotRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / (spacing * 0.866)) + 1;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = -width / 2 + col * spacing + (row % 2) * (spacing / 2);
      let y = -height / 2 + row * spacing * 0.866;
      
      const rx = cos * x - sin * y;
      const ry = sin * x + cos * y;
      
      if (Math.abs(rx) < width / 2 - hexRadius && Math.abs(ry) < height / 2 - hexRadius) {
        for (let i = 0; i < 6; i++) {
          const a1 = (i / 6) * Math.PI * 2;
          const a2 = ((i + 1) / 6) * Math.PI * 2;
          const x1 = rx + Math.cos(a1) * hexRadius;
          const y1 = ry + Math.sin(a1) * hexRadius;
          const x2 = rx + Math.cos(a2) * hexRadius;
          const y2 = ry + Math.sin(a2) * hexRadius;
          
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          
          triangles.push(...createBox(mx, my, 0, len, 2, thickness));
        }
      }
    }
  }
  
  return triangles;
}

function generateMandalaPattern(
  width: number,
  height: number,
  density: number,
  scale: number,
  rotation: number,
  thickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const maxRadius = Math.min(width, height) / 2 * 0.9;
  const rings = Math.floor((density / 100) * 8) + 2;
  
  const rotRad = (rotation * Math.PI) / 180;
  
  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * maxRadius;
    const segments = 6 + r * 4;
    const segmentWidth = 2 * scale;
    
    for (let i = 0; i < segments; i++) {
      const a1 = rotRad + (i / segments) * Math.PI * 2;
      const a2 = rotRad + ((i + 1) / segments) * Math.PI * 2;
      
      const x1 = Math.cos(a1) * radius;
      const y1 = Math.sin(a1) * radius;
      const x2 = Math.cos(a2) * radius;
      const y2 = Math.sin(a2) * radius;
      
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      triangles.push(...createBox(mx, my, 0, len, segmentWidth, thickness));
      
      if (i % 2 === 0 && r < rings) {
        const innerR = ((r - 0.5) / rings) * maxRadius;
        const outerR = ((r + 0.5) / rings) * maxRadius;
        const sx = Math.cos(a1) * innerR;
        const sy = Math.sin(a1) * innerR;
        const ex = Math.cos(a1) * outerR;
        const ey = Math.sin(a1) * outerR;
        const smx = (sx + ex) / 2;
        const smy = (sy + ey) / 2;
        const slen = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        triangles.push(...createBox(smx, smy, 0, segmentWidth, slen, thickness));
      }
    }
  }
  
  return triangles;
}

function generateWavePattern(
  width: number,
  height: number,
  density: number,
  scale: number,
  rotation: number,
  thickness: number
): Triangle[] {
  const triangles: Triangle[] = [];
  const waveCount = Math.floor((density / 100) * 10) + 2;
  const amplitude = 15 * scale;
  const frequency = 0.05 / scale;
  const lineWidth = 2 * scale;
  
  const rotRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  
  for (let w = 0; w < waveCount; w++) {
    const baseY = -height / 2 + (w + 0.5) * (height / waveCount);
    const segments = 40;
    
    for (let i = 0; i < segments; i++) {
      const x1 = -width / 2 + (i / segments) * width;
      const x2 = -width / 2 + ((i + 1) / segments) * width;
      const y1 = baseY + Math.sin(x1 * frequency) * amplitude;
      const y2 = baseY + Math.sin(x2 * frequency) * amplitude;
      
      const rx1 = cos * x1 - sin * y1;
      const ry1 = sin * x1 + cos * y1;
      const rx2 = cos * x2 - sin * y2;
      const ry2 = sin * x2 + cos * y2;
      
      const mx = (rx1 + rx2) / 2;
      const my = (ry1 + ry2) / 2;
      const dx = rx2 - rx1;
      const dy = ry2 - ry1;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (Math.abs(mx) < width / 2 - 5 && Math.abs(my) < height / 2 - 5) {
        triangles.push(...createBox(mx, my, 0, len, lineWidth, thickness));
      }
    }
  }
  
  return triangles;
}

function generatePatternLayer(
  settings: HolographicPanelSettings,
  layerIndex: number
): Triangle[] {
  const layer = settings.layers[layerIndex];
  if (!layer) return [];
  
  const { panelWidth, panelHeight, layerThickness, frameThickness } = settings;
  const contentWidth = panelWidth - frameThickness * 2;
  const contentHeight = panelHeight - frameThickness * 2;
  
  switch (layer.patternType) {
    case "floral":
      return generateFloralPattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
    case "geometric":
      return generateGeometricPattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
    case "mandala":
      return generateMandalaPattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
    case "wave":
      return generateWavePattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
    case "circuit":
      return generateGeometricPattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation + 45, layerThickness);
    case "nature":
      return generateFloralPattern(contentWidth, contentHeight, layer.patternDensity * 0.7, layer.patternScale * 1.5, layer.rotation, layerThickness);
    case "abstract":
      return generateWavePattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
    default:
      return generateFloralPattern(contentWidth, contentHeight, layer.patternDensity, layer.patternScale, layer.rotation, layerThickness);
  }
}

function generateFrame(settings: HolographicPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { panelWidth, panelHeight, frameThickness, layerThickness, layerCount, layerSpacing } = settings;
  
  const totalDepth = layerCount * layerThickness + (layerCount - 1) * layerSpacing + 10;
  
  triangles.push(...createBox(0, panelHeight / 2 - frameThickness / 2, 0, panelWidth, frameThickness, totalDepth));
  triangles.push(...createBox(0, -panelHeight / 2 + frameThickness / 2, 0, panelWidth, frameThickness, totalDepth));
  triangles.push(...createBox(-panelWidth / 2 + frameThickness / 2, 0, 0, frameThickness, panelHeight - frameThickness * 2, totalDepth));
  triangles.push(...createBox(panelWidth / 2 - frameThickness / 2, 0, 0, frameThickness, panelHeight - frameThickness * 2, totalDepth));
  
  return triangles;
}

function generateLedChannel(settings: HolographicPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { panelWidth, panelHeight, ledStripWidth, layerCount, layerThickness, layerSpacing } = settings;
  
  const channelDepth = 10;
  const channelHeight = ledStripWidth;
  const backZ = -(layerCount * layerThickness + (layerCount - 1) * layerSpacing) / 2 - channelDepth / 2;
  
  triangles.push(...createBox(0, panelHeight / 2 + channelHeight / 2, backZ, panelWidth, channelHeight, channelDepth));
  triangles.push(...createBox(0, -panelHeight / 2 - channelHeight / 2, backZ, panelWidth, channelHeight, channelDepth));
  triangles.push(...createBox(-panelWidth / 2 - channelHeight / 2, 0, backZ, channelHeight, panelHeight, channelDepth));
  triangles.push(...createBox(panelWidth / 2 + channelHeight / 2, 0, backZ, channelHeight, panelHeight, channelDepth));
  
  return triangles;
}

function generateMountingBrackets(settings: HolographicPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { panelWidth, panelHeight, wallStandoff } = settings;
  
  const bracketWidth = 20;
  const bracketHeight = 30;
  const bracketDepth = wallStandoff + 5;
  
  const positions = [
    { x: -panelWidth / 2 + 30, y: panelHeight / 2 - 30 },
    { x: panelWidth / 2 - 30, y: panelHeight / 2 - 30 },
    { x: -panelWidth / 2 + 30, y: -panelHeight / 2 + 30 },
    { x: panelWidth / 2 - 30, y: -panelHeight / 2 + 30 },
  ];
  
  for (const pos of positions) {
    triangles.push(...createBox(pos.x, pos.y, -bracketDepth / 2, bracketWidth, bracketHeight, bracketDepth));
    triangles.push(...createCylinder(pos.x, pos.y, -bracketDepth + 2, 2, 4, 8));
  }
  
  return triangles;
}

function generateSpacerRings(settings: HolographicPanelSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { panelWidth, panelHeight, layerSpacing, layerCount } = settings;
  
  const ringRadius = 5;
  const ringHeight = layerSpacing - 1;
  
  const positions = [
    { x: -panelWidth / 2 + 15, y: panelHeight / 2 - 15 },
    { x: panelWidth / 2 - 15, y: panelHeight / 2 - 15 },
    { x: -panelWidth / 2 + 15, y: -panelHeight / 2 + 15 },
    { x: panelWidth / 2 - 15, y: -panelHeight / 2 + 15 },
  ];
  
  for (const pos of positions) {
    triangles.push(...createCylinder(pos.x, pos.y, 0, ringRadius, ringHeight, 12));
  }
  
  return triangles;
}

function trianglesToSTL(triangles: Triangle[], name: string = "Model"): string {
  let stl = `solid ${name}\n`;
  
  for (const tri of triangles) {
    const [nx, ny, nz] = tri.normal;
    stl += `  facet normal ${nx.toExponential(6)} ${ny.toExponential(6)} ${nz.toExponential(6)}\n`;
    stl += "    outer loop\n";
    for (const vertex of tri.vertices) {
      const [vx, vy, vz] = vertex;
      stl += `      vertex ${vx.toExponential(6)} ${vy.toExponential(6)} ${vz.toExponential(6)}\n`;
    }
    stl += "    endloop\n";
    stl += "  endfacet\n";
  }
  
  stl += `endsolid ${name}\n`;
  return stl;
}

export function generateHolographicPanel(settings: HolographicPanelSettings): {
  files: Record<string, string>;
  readme: string;
} {
  const files: Record<string, string> = {};
  
  for (let i = 0; i < settings.layerCount; i++) {
    const layerZ = (i - (settings.layerCount - 1) / 2) * (settings.layerThickness + settings.layerSpacing);
    const patternTriangles = generatePatternLayer(settings, i);
    
    const transformedTriangles = patternTriangles.map(tri => ({
      ...tri,
      vertices: tri.vertices.map(v => [v[0], v[1], v[2] + layerZ] as [number, number, number])
    }));
    
    files[`layer_${i + 1}_${settings.layers[i]?.patternType || "pattern"}.stl`] = 
      trianglesToSTL(transformedTriangles, `Layer_${i + 1}`);
  }
  
  if (settings.includeFrame) {
    const frameTriangles = generateFrame(settings);
    files["frame.stl"] = trianglesToSTL(frameTriangles, "Frame");
  }
  
  if (settings.includeLedChannel) {
    const ledChannelTriangles = generateLedChannel(settings);
    files["led_channel.stl"] = trianglesToSTL(ledChannelTriangles, "LED_Channel");
  }
  
  if (settings.includeMountingBrackets) {
    const bracketTriangles = generateMountingBrackets(settings);
    files["mounting_brackets.stl"] = trianglesToSTL(bracketTriangles, "Mounting_Brackets");
  }
  
  if (settings.includeSpacerRings) {
    const spacerTriangles = generateSpacerRings(settings);
    files["spacer_rings.stl"] = trianglesToSTL(spacerTriangles, "Spacer_Rings");
  }
  
  const readme = `# Multi-Layer Holographic Panel

## Overview
This export contains a ${settings.layerCount}-layer holographic wall panel that creates stunning 3D depth effects when backlit with LEDs.

## Panel Dimensions
- Width: ${settings.panelWidth}mm
- Height: ${settings.panelHeight}mm
- Total Depth: ~${settings.layerCount * settings.layerThickness + (settings.layerCount - 1) * settings.layerSpacing + 10}mm

## Layers
${settings.layers.slice(0, settings.layerCount).map((layer, i) => 
  `${i + 1}. Layer ${i + 1}: ${layer.patternType} pattern (${layer.patternDensity}% density, ${layer.patternScale}x scale)`
).join('\n')}

## Assembly Instructions

1. **Print all layers** using translucent or colored filament
   - Layer height: 0.2mm
   - Infill: 20-30%
   - Material: PLA, PETG, or transparent filament for best light diffusion

2. **Assemble the layers**
   - Place spacer rings between each layer
   - Stack layers front to back (Layer 1 at front)
   - Secure with frame or mounting brackets

3. **Install LED lighting**
   - Mount LED strip in the channel at the back
   - Use ${settings.ledType} strips for best results
   - Connect to power supply (5V for WS2812, 12V for standard strips)

4. **Mount to wall**
   - Use included mounting brackets
   - Maintain ${settings.wallStandoff}mm standoff for glow effect
   - Level and secure with appropriate hardware

## Tips for Best Results
- Use RGB LEDs with a controller for color-changing effects
- Dimmer switches enhance mood lighting
- Mount in a location with minimal ambient light for maximum impact
- Consider using a diffuser sheet behind the last layer for even lighting

## Files Included
${Object.keys(files).map(f => `- ${f}`).join('\n')}
`;
  
  files["README.md"] = readme;
  
  return { files, readme };
}
