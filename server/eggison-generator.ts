import { EggisonSettings } from "@shared/schema";

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

function trianglesToSTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  
  buffer.write("Eggison Bulb STL - SignCraft3D", 0);
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

function generateEggProfile(height: number, width: number, segments: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI;
    const y = height * (1 - Math.cos(angle)) / 2;
    const eggFactor = 1 - 0.25 * Math.pow(Math.sin(angle), 2) * (1 - t * 0.6);
    const r = (width / 2) * Math.sin(angle) * eggFactor;
    points.push([r, y]);
  }
  return points;
}

function generateCrackedEdgeHeight(radialIndex: number, radialSegments: number, baseHeight: number, amplitude: number): number {
  const numTeeth = 8;
  const angle = (radialIndex / radialSegments) * Math.PI * 2;
  const toothAngle = angle * numTeeth;
  const zigzag = Math.abs((toothAngle % (Math.PI * 2)) / Math.PI - 1) * 2 - 1;
  const jitter = Math.sin(angle * 13) * 0.15 + Math.sin(angle * 7) * 0.1;
  return baseHeight + (zigzag * 0.8 + jitter) * amplitude;
}

function interpolateRadius(profile: [number, number][], targetY: number): number {
  for (let i = 0; i < profile.length - 1; i++) {
    if (profile[i][1] <= targetY && profile[i + 1][1] > targetY) {
      const t = (targetY - profile[i][1]) / (profile[i + 1][1] - profile[i][1]);
      return profile[i][0] + t * (profile[i + 1][0] - profile[i][0]);
    }
  }
  return profile[0][0];
}

function generateCrackedEggShell(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness } = settings;
  const radialSegments = 48;
  const heightSegments = 40;
  
  const crackHeightRatio = 0.55;
  const crackAmplitude = shellHeight * 0.12;
  const crackBaseHeight = shellHeight * crackHeightRatio;
  
  const outerProfile = generateEggProfile(shellHeight, shellWidth, heightSegments);
  const innerWidth = shellWidth - wallThickness * 2;
  const innerHeight = shellHeight - wallThickness * 2;
  const innerProfile = generateEggProfile(innerHeight, innerWidth, heightSegments);
  
  const crackHeights: number[] = [];
  for (let j = 0; j <= radialSegments; j++) {
    crackHeights.push(generateCrackedEdgeHeight(j, radialSegments, crackBaseHeight, crackAmplitude));
  }
  
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const crackY1 = crackHeights[j];
      const crackY2 = crackHeights[j + 1];
      
      const [or1, oy1] = outerProfile[i];
      const [or2, oy2] = outerProfile[i + 1];
      
      if (oy1 >= crackY1 && oy1 >= crackY2) continue;
      
      let finalOy2_1 = oy2, finalOr2_1 = or2;
      let finalOy2_2 = oy2, finalOr2_2 = or2;
      
      if (oy2 > crackY1) {
        finalOy2_1 = crackY1;
        finalOr2_1 = interpolateRadius(outerProfile, crackY1);
      }
      if (oy2 > crackY2) {
        finalOy2_2 = crackY2;
        finalOr2_2 = interpolateRadius(outerProfile, crackY2);
      }
      
      const ox1 = or1 * Math.cos(theta1), oz1 = or1 * Math.sin(theta1);
      const ox2 = or1 * Math.cos(theta2), oz2 = or1 * Math.sin(theta2);
      const ox3 = finalOr2_1 * Math.cos(theta1), oz3 = finalOr2_1 * Math.sin(theta1);
      const ox4 = finalOr2_2 * Math.cos(theta2), oz4 = finalOr2_2 * Math.sin(theta2);
      
      if (or1 > 0.1) {
        const v1: [number, number, number] = [ox1, Math.min(oy1, crackY1), oz1];
        const v2: [number, number, number] = [ox2, Math.min(oy1, crackY2), oz2];
        const v3: [number, number, number] = [ox3, finalOy2_1, oz3];
        const v4: [number, number, number] = [ox4, finalOy2_2, oz4];
        triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
        triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      }
      
      if (i > 1) {
        const [ir1, iy1] = innerProfile[i];
        const [ir2, iy2] = innerProfile[i + 1];
        const offsetY = wallThickness;
        
        const adjIy1 = iy1 + offsetY;
        const adjIy2 = iy2 + offsetY;
        
        if (adjIy1 >= crackY1 && adjIy1 >= crackY2) continue;
        
        let finalIy2_1 = adjIy2, finalIr2_1 = ir2;
        let finalIy2_2 = adjIy2, finalIr2_2 = ir2;
        
        if (adjIy2 > crackY1) {
          finalIy2_1 = crackY1;
          finalIr2_1 = interpolateRadius(innerProfile, crackY1 - offsetY);
        }
        if (adjIy2 > crackY2) {
          finalIy2_2 = crackY2;
          finalIr2_2 = interpolateRadius(innerProfile, crackY2 - offsetY);
        }
        
        if (ir1 > 0.1) {
          const ix1 = ir1 * Math.cos(theta1), iz1 = ir1 * Math.sin(theta1);
          const ix2 = ir1 * Math.cos(theta2), iz2 = ir1 * Math.sin(theta2);
          const ix3 = finalIr2_1 * Math.cos(theta1), iz3 = finalIr2_1 * Math.sin(theta1);
          const ix4 = finalIr2_2 * Math.cos(theta2), iz4 = finalIr2_2 * Math.sin(theta2);
          
          const iv1: [number, number, number] = [ix1, Math.min(adjIy1, crackY1), iz1];
          const iv2: [number, number, number] = [ix2, Math.min(adjIy1, crackY2), iz2];
          const iv3: [number, number, number] = [ix3, finalIy2_1, iz3];
          const iv4: [number, number, number] = [ix4, finalIy2_2, iz4];
          triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
          triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
        }
      }
    }
  }
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const crackY1 = crackHeights[j];
    const crackY2 = crackHeights[j + 1];
    
    const outerR1 = interpolateRadius(outerProfile, crackY1);
    const outerR2 = interpolateRadius(outerProfile, crackY2);
    const innerR1 = Math.max(outerR1 - wallThickness, 1);
    const innerR2 = Math.max(outerR2 - wallThickness, 1);
    
    const ox1 = outerR1 * Math.cos(theta1), oz1 = outerR1 * Math.sin(theta1);
    const ox2 = outerR2 * Math.cos(theta2), oz2 = outerR2 * Math.sin(theta2);
    const ix1 = innerR1 * Math.cos(theta1), iz1 = innerR1 * Math.sin(theta1);
    const ix2 = innerR2 * Math.cos(theta2), iz2 = innerR2 * Math.sin(theta2);
    
    const ov1: [number, number, number] = [ox1, crackY1, oz1];
    const ov2: [number, number, number] = [ox2, crackY2, oz2];
    const iv1: [number, number, number] = [ix1, crackY1, iz1];
    const iv2: [number, number, number] = [ix2, crackY2, iz2];
    
    triangles.push({ vertices: [ov1, iv1, ov2], normal: calculateNormal(ov1, iv1, ov2) });
    triangles.push({ vertices: [iv1, iv2, ov2], normal: calculateNormal(iv1, iv2, ov2) });
  }
  
  const bottomIndex = 3;
  const bottomRadius = outerProfile[bottomIndex][0];
  const bottomY = outerProfile[bottomIndex][1];
  const innerBottomRadius = Math.max(bottomRadius - wallThickness, 5);
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = bottomRadius * Math.cos(theta1), oz1 = bottomRadius * Math.sin(theta1);
    const ox2 = bottomRadius * Math.cos(theta2), oz2 = bottomRadius * Math.sin(theta2);
    const ix1 = innerBottomRadius * Math.cos(theta1), iz1 = innerBottomRadius * Math.sin(theta1);
    const ix2 = innerBottomRadius * Math.cos(theta2), iz2 = innerBottomRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [ox1, bottomY, oz1];
    const v2: [number, number, number] = [ox2, bottomY, oz2];
    const v3: [number, number, number] = [ix1, bottomY, iz1];
    const v4: [number, number, number] = [ix2, bottomY, iz2];
    
    triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
    triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
  }
  
  return triangles;
}

function generateSplitEggHalf(settings: EggisonSettings, isTopHalf: boolean): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness } = settings;
  const radialSegments = 48;
  const heightSegments = 40;
  
  const splitY = shellHeight * 0.5;
  // IMPROVED: Larger lip for better fit, matching the reference sliced image
  const lipHeight = 6; // 6mm lip for secure nesting
  const lipThickness = wallThickness * 0.6; // Lip is 60% of wall thickness
  const fitClearance = 0.3; // 0.3mm clearance for easy assembly
  
  const outerProfile = generateEggProfile(shellHeight, shellWidth, heightSegments);
  const innerWidth = shellWidth - wallThickness * 2;
  const innerHeight = shellHeight - wallThickness * 2;
  const innerProfile = generateEggProfile(innerHeight, innerWidth, heightSegments);
  
  // For top half: flip so seam is at Y=0 (print bed), top of egg points up
  // For bottom half: no offset, bottom of egg at Y=0
  const yOffset = isTopHalf ? -splitY : 0;
  
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const [or1, oy1] = outerProfile[i];
      const [or2, oy2] = outerProfile[i + 1];
      
      if (isTopHalf) {
        if (oy2 < splitY) continue;
      } else {
        if (oy1 > splitY) continue;
      }
      
      let clampedOy1 = oy1, clampedOr1 = or1;
      let clampedOy2 = oy2, clampedOr2 = or2;
      
      if (isTopHalf && oy1 < splitY) {
        clampedOy1 = splitY;
        clampedOr1 = interpolateRadius(outerProfile, splitY);
      }
      if (!isTopHalf && oy2 > splitY) {
        clampedOy2 = splitY;
        clampedOr2 = interpolateRadius(outerProfile, splitY);
      }
      
      const ox1 = clampedOr1 * Math.cos(theta1), oz1 = clampedOr1 * Math.sin(theta1);
      const ox2 = clampedOr1 * Math.cos(theta2), oz2 = clampedOr1 * Math.sin(theta2);
      const ox3 = clampedOr2 * Math.cos(theta1), oz3 = clampedOr2 * Math.sin(theta1);
      const ox4 = clampedOr2 * Math.cos(theta2), oz4 = clampedOr2 * Math.sin(theta2);
      
      if (clampedOr1 > 0.1 && clampedOr2 > 0.1) {
        const v1: [number, number, number] = [ox1, clampedOy1 + yOffset, oz1];
        const v2: [number, number, number] = [ox2, clampedOy1 + yOffset, oz2];
        const v3: [number, number, number] = [ox3, clampedOy2 + yOffset, oz3];
        const v4: [number, number, number] = [ox4, clampedOy2 + yOffset, oz4];
        triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
        triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      }
    }
  }
  
  const innerYOffset = wallThickness;
  for (let i = 2; i < heightSegments - 1; i++) {
    const [ir1, iy1] = innerProfile[i];
    const [ir2, iy2] = innerProfile[i + 1];
    const adjIy1 = iy1 + innerYOffset;
    const adjIy2 = iy2 + innerYOffset;
    
    if (isTopHalf) {
      if (adjIy2 < splitY) continue;
    } else {
      if (adjIy1 > splitY) continue;
    }
    
    let clampedIy1 = adjIy1, clampedIr1 = ir1;
    let clampedIy2 = adjIy2, clampedIr2 = ir2;
    
    if (isTopHalf && adjIy1 < splitY) {
      clampedIy1 = splitY;
      clampedIr1 = interpolateRadius(innerProfile, splitY - innerYOffset);
    }
    if (!isTopHalf && adjIy2 > splitY) {
      clampedIy2 = splitY;
      clampedIr2 = interpolateRadius(innerProfile, splitY - innerYOffset);
    }
    
    if (clampedIr1 < 0.1 || clampedIr2 < 0.1) continue;
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const ix1 = clampedIr1 * Math.cos(theta1), iz1 = clampedIr1 * Math.sin(theta1);
      const ix2 = clampedIr1 * Math.cos(theta2), iz2 = clampedIr1 * Math.sin(theta2);
      const ix3 = clampedIr2 * Math.cos(theta1), iz3 = clampedIr2 * Math.sin(theta1);
      const ix4 = clampedIr2 * Math.cos(theta2), iz4 = clampedIr2 * Math.sin(theta2);
      
      const iv1: [number, number, number] = [ix1, clampedIy1 + yOffset, iz1];
      const iv2: [number, number, number] = [ix2, clampedIy1 + yOffset, iz2];
      const iv3: [number, number, number] = [ix3, clampedIy2 + yOffset, iz3];
      const iv4: [number, number, number] = [ix4, clampedIy2 + yOffset, iz4];
      triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
      triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
    }
  }
  
  const splitOuterR = interpolateRadius(outerProfile, splitY);
  const splitInnerR = Math.max(splitOuterR - wallThickness, 1);
  
  if (isTopHalf) {
    // TOP HALF: Has an inner lip that extends DOWN into the bottom half
    // The lip sits inside the bottom half's groove
    const lipOuterR = splitInnerR + lipThickness; // Lip outer edge (sits inside bottom's groove)
    const lipInnerR = splitInnerR; // Lip inner edge matches inner shell
    const seamY = 0; // Seam sits on print bed when printing
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
      const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);
      
      // Outer shell at seam level
      const ox1 = splitOuterR * cos1, oz1 = splitOuterR * sin1;
      const ox2 = splitOuterR * cos2, oz2 = splitOuterR * sin2;
      
      // Lip outer edge
      const lox1 = lipOuterR * cos1, loz1 = lipOuterR * sin1;
      const lox2 = lipOuterR * cos2, loz2 = lipOuterR * sin2;
      
      // Lip inner edge (same as inner shell)
      const lix1 = lipInnerR * cos1, liz1 = lipInnerR * sin1;
      const lix2 = lipInnerR * cos2, liz2 = lipInnerR * sin2;
      
      // 1. Top face ring (outer shell to lip outer edge at seam)
      const t1: [number, number, number] = [ox1, seamY, oz1];
      const t2: [number, number, number] = [ox2, seamY, oz2];
      const t3: [number, number, number] = [lox1, seamY, loz1];
      const t4: [number, number, number] = [lox2, seamY, loz2];
      triangles.push({ vertices: [t1, t3, t2], normal: [0, -1, 0] });
      triangles.push({ vertices: [t2, t3, t4], normal: [0, -1, 0] });
      
      // 2. Lip outer wall (vertical, extends down from seam)
      const lo1: [number, number, number] = [lox1, seamY, loz1];
      const lo2: [number, number, number] = [lox2, seamY, loz2];
      const lo3: [number, number, number] = [lox1, seamY - lipHeight, loz1];
      const lo4: [number, number, number] = [lox2, seamY - lipHeight, loz2];
      triangles.push({ vertices: [lo1, lo2, lo3], normal: calculateNormal(lo1, lo2, lo3) });
      triangles.push({ vertices: [lo2, lo4, lo3], normal: calculateNormal(lo2, lo4, lo3) });
      
      // 3. Lip bottom face (horizontal ring at bottom of lip)
      const lb1: [number, number, number] = [lox1, seamY - lipHeight, loz1];
      const lb2: [number, number, number] = [lox2, seamY - lipHeight, loz2];
      const lb3: [number, number, number] = [lix1, seamY - lipHeight, liz1];
      const lb4: [number, number, number] = [lix2, seamY - lipHeight, liz2];
      triangles.push({ vertices: [lb1, lb3, lb2], normal: [0, -1, 0] });
      triangles.push({ vertices: [lb2, lb3, lb4], normal: [0, -1, 0] });
      
      // 4. Lip inner wall (goes up from lip bottom to connect with inner shell)
      const li1: [number, number, number] = [lix1, seamY - lipHeight, liz1];
      const li2: [number, number, number] = [lix2, seamY - lipHeight, liz2];
      const li3: [number, number, number] = [lix1, seamY, liz1];
      const li4: [number, number, number] = [lix2, seamY, liz2];
      triangles.push({ vertices: [li1, li3, li2], normal: calculateNormal(li1, li3, li2) });
      triangles.push({ vertices: [li2, li3, li4], normal: calculateNormal(li2, li3, li4) });
    }
  } else {
    // BOTTOM HALF: Has a groove/step at the top for the top half's lip to sit in
    // Groove is between outer shell and inner shelf
    const grooveOuterR = splitInnerR + lipThickness + fitClearance; // Slightly wider than lip
    const grooveInnerR = splitInnerR + fitClearance;
    const seamY = splitY; // Top of bottom half at split point
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
      const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);
      
      // Outer shell at seam
      const ox1 = splitOuterR * cos1, oz1 = splitOuterR * sin1;
      const ox2 = splitOuterR * cos2, oz2 = splitOuterR * sin2;
      
      // Groove outer edge
      const gox1 = grooveOuterR * cos1, goz1 = grooveOuterR * sin1;
      const gox2 = grooveOuterR * cos2, goz2 = grooveOuterR * sin2;
      
      // Groove inner edge (becomes inner shell)
      const gix1 = grooveInnerR * cos1, giz1 = grooveInnerR * sin1;
      const gix2 = grooveInnerR * cos2, giz2 = grooveInnerR * sin2;
      
      // Inner shell edge
      const ix1 = splitInnerR * cos1, iz1 = splitInnerR * sin1;
      const ix2 = splitInnerR * cos2, iz2 = splitInnerR * sin2;
      
      // 1. Top face - outer ring from outer shell to groove outer
      const t1: [number, number, number] = [ox1, seamY, oz1];
      const t2: [number, number, number] = [ox2, seamY, oz2];
      const t3: [number, number, number] = [gox1, seamY, goz1];
      const t4: [number, number, number] = [gox2, seamY, goz2];
      triangles.push({ vertices: [t1, t2, t3], normal: [0, 1, 0] });
      triangles.push({ vertices: [t2, t4, t3], normal: [0, 1, 0] });
      
      // 2. Groove outer wall (goes down from top into groove)
      const go1: [number, number, number] = [gox1, seamY, goz1];
      const go2: [number, number, number] = [gox2, seamY, goz2];
      const go3: [number, number, number] = [gox1, seamY - lipHeight - fitClearance, goz1];
      const go4: [number, number, number] = [gox2, seamY - lipHeight - fitClearance, goz2];
      triangles.push({ vertices: [go1, go3, go2], normal: calculateNormal(go1, go3, go2) });
      triangles.push({ vertices: [go2, go3, go4], normal: calculateNormal(go2, go3, go4) });
      
      // 3. Groove bottom (horizontal shelf where lip rests)
      const gb1: [number, number, number] = [gox1, seamY - lipHeight - fitClearance, goz1];
      const gb2: [number, number, number] = [gox2, seamY - lipHeight - fitClearance, goz2];
      const gb3: [number, number, number] = [gix1, seamY - lipHeight - fitClearance, giz1];
      const gb4: [number, number, number] = [gix2, seamY - lipHeight - fitClearance, giz2];
      triangles.push({ vertices: [gb1, gb2, gb3], normal: [0, 1, 0] });
      triangles.push({ vertices: [gb2, gb4, gb3], normal: [0, 1, 0] });
      
      // 4. Groove inner wall (goes up from groove bottom to inner shell level)
      const gi1: [number, number, number] = [gix1, seamY - lipHeight - fitClearance, giz1];
      const gi2: [number, number, number] = [gix2, seamY - lipHeight - fitClearance, giz2];
      const gi3: [number, number, number] = [ix1, seamY, iz1];
      const gi4: [number, number, number] = [ix2, seamY, iz2];
      triangles.push({ vertices: [gi1, gi2, gi3], normal: calculateNormal(gi1, gi2, gi3) });
      triangles.push({ vertices: [gi2, gi4, gi3], normal: calculateNormal(gi2, gi4, gi3) });
    }
    
    // Bottom cap (annular ring at egg bottom)
    const bottomIndex = 3;
    const bottomRadius = outerProfile[bottomIndex][0];
    const bottomY = outerProfile[bottomIndex][1];
    const innerBottomRadius = Math.max(bottomRadius - wallThickness, 5);
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const ox1 = bottomRadius * Math.cos(theta1), oz1 = bottomRadius * Math.sin(theta1);
      const ox2 = bottomRadius * Math.cos(theta2), oz2 = bottomRadius * Math.sin(theta2);
      const ix1 = innerBottomRadius * Math.cos(theta1), iz1 = innerBottomRadius * Math.sin(theta1);
      const ix2 = innerBottomRadius * Math.cos(theta2), iz2 = innerBottomRadius * Math.sin(theta2);
      
      const v1: [number, number, number] = [ox1, bottomY, oz1];
      const v2: [number, number, number] = [ox2, bottomY, oz2];
      const v3: [number, number, number] = [ix1, bottomY, iz1];
      const v4: [number, number, number] = [ix2, bottomY, iz2];
      
      triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
      triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
    }
  }
  
  return triangles;
}

function generateLithophaneShell(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness, lithophaneMinThickness = 0.6, lithophaneMaxThickness = 3 } = settings;
  const radialSegments = 64;
  const heightSegments = 60;
  
  // Parse base64 image data to simulate brightness sampling
  // In production, this would decode actual image data
  // For now, generate procedural pattern based on angle/height
  const getThicknessForUV = (u: number, v: number): number => {
    // Create procedural pattern if no image data
    // This simulates image-based thickness variation
    const pattern = Math.sin(u * Math.PI * 8) * Math.sin(v * Math.PI * 6) * 0.5 + 0.5;
    return lithophaneMinThickness + pattern * (lithophaneMaxThickness - lithophaneMinThickness);
  };
  
  const outerProfile = generateEggProfile(shellHeight, shellWidth, heightSegments);
  
  for (let i = 0; i < heightSegments; i++) {
    const v = i / heightSegments;
    for (let j = 0; j < radialSegments; j++) {
      const u = j / radialSegments;
      const theta1 = u * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      const uNext = (j + 1) / radialSegments;
      const vNext = (i + 1) / heightSegments;
      
      const [or1, oy1] = outerProfile[i];
      const [or2, oy2] = outerProfile[i + 1];
      
      // Variable thickness based on UV position (simulates image brightness)
      const t1 = getThicknessForUV(u, v);
      const t2 = getThicknessForUV(uNext, v);
      const t3 = getThicknessForUV(u, vNext);
      const t4 = getThicknessForUV(uNext, vNext);
      
      const ir1a = Math.max(or1 - t1, 1);
      const ir1b = Math.max(or1 - t2, 1);
      const ir2a = Math.max(or2 - t3, 1);
      const ir2b = Math.max(or2 - t4, 1);
      
      // Outer shell
      if (or1 > 0.1 && or2 > 0.1) {
        const ox1 = or1 * Math.cos(theta1), oz1 = or1 * Math.sin(theta1);
        const ox2 = or1 * Math.cos(theta2), oz2 = or1 * Math.sin(theta2);
        const ox3 = or2 * Math.cos(theta1), oz3 = or2 * Math.sin(theta1);
        const ox4 = or2 * Math.cos(theta2), oz4 = or2 * Math.sin(theta2);
        
        const v1: [number, number, number] = [ox1, oy1, oz1];
        const v2: [number, number, number] = [ox2, oy1, oz2];
        const v3: [number, number, number] = [ox3, oy2, oz3];
        const v4: [number, number, number] = [ox4, oy2, oz4];
        triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
        triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      }
      
      // Inner shell with variable thickness
      if (i > 1 && i < heightSegments - 1 && ir1a > 0.5 && ir2a > 0.5) {
        const offsetY = wallThickness / 2;
        const iy1 = oy1 + offsetY;
        const iy2 = oy2 + offsetY;
        
        const ix1 = ir1a * Math.cos(theta1), iz1 = ir1a * Math.sin(theta1);
        const ix2 = ir1b * Math.cos(theta2), iz2 = ir1b * Math.sin(theta2);
        const ix3 = ir2a * Math.cos(theta1), iz3 = ir2a * Math.sin(theta1);
        const ix4 = ir2b * Math.cos(theta2), iz4 = ir2b * Math.sin(theta2);
        
        const iv1: [number, number, number] = [ix1, iy1, iz1];
        const iv2: [number, number, number] = [ix2, iy1, iz2];
        const iv3: [number, number, number] = [ix3, iy2, iz3];
        const iv4: [number, number, number] = [ix4, iy2, iz4];
        triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
        triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
      }
    }
  }
  
  // Bottom cap - uses per-vertex variable thickness to match inner wall
  const bottomSegment = 1; // First segment after bottom
  const [bottomOuterR, bottomY] = outerProfile[bottomSegment];
  
  for (let j = 0; j < radialSegments; j++) {
    const u = j / radialSegments;
    const uNext = (j + 1) / radialSegments;
    const theta1 = u * Math.PI * 2;
    const theta2 = uNext * Math.PI * 2;
    
    // Get variable thickness for these UV positions
    const t1 = getThicknessForUV(u, bottomSegment / heightSegments);
    const t2 = getThicknessForUV(uNext, bottomSegment / heightSegments);
    
    const ir1 = Math.max(bottomOuterR - t1, 1);
    const ir2 = Math.max(bottomOuterR - t2, 1);
    
    const ox1 = bottomOuterR * Math.cos(theta1), oz1 = bottomOuterR * Math.sin(theta1);
    const ox2 = bottomOuterR * Math.cos(theta2), oz2 = bottomOuterR * Math.sin(theta2);
    const ix1 = ir1 * Math.cos(theta1), iz1 = ir1 * Math.sin(theta1);
    const ix2 = ir2 * Math.cos(theta2), iz2 = ir2 * Math.sin(theta2);
    
    const bv1: [number, number, number] = [ox1, bottomY, oz1];
    const bv2: [number, number, number] = [ox2, bottomY, oz2];
    const bv3: [number, number, number] = [ix1, bottomY, iz1];
    const bv4: [number, number, number] = [ix2, bottomY, iz2];
    
    triangles.push({ vertices: [bv1, bv3, bv2], normal: [0, -1, 0] });
    triangles.push({ vertices: [bv2, bv3, bv4], normal: [0, -1, 0] });
  }
  
  return triangles;
}

function generateEggShell(settings: EggisonSettings): Triangle[] {
  if (settings.lithophaneEnabled) {
    return generateLithophaneShell(settings);
  }
  if (settings.shellStyle === "cracked") {
    return generateCrackedEggShell(settings);
  }
  if (settings.shellStyle === "split") {
    return generateSplitEggHalf(settings, false);
  }
  
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness } = settings;
  const radialSegments = 48;
  const heightSegments = 40;
  
  const outerProfile = generateEggProfile(shellHeight, shellWidth, heightSegments);
  const innerWidth = shellWidth - wallThickness * 2;
  const innerHeight = shellHeight - wallThickness * 2;
  const innerProfile = generateEggProfile(innerHeight, innerWidth, heightSegments);
  
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const [or1, oy1] = outerProfile[i];
      const [or2, oy2] = outerProfile[i + 1];
      
      const ox1 = or1 * Math.cos(theta1), oz1 = or1 * Math.sin(theta1);
      const ox2 = or1 * Math.cos(theta2), oz2 = or1 * Math.sin(theta2);
      const ox3 = or2 * Math.cos(theta1), oz3 = or2 * Math.sin(theta1);
      const ox4 = or2 * Math.cos(theta2), oz4 = or2 * Math.sin(theta2);
      
      if (or1 > 0.1 && or2 > 0.1) {
        const v1: [number, number, number] = [ox1, oy1, oz1];
        const v2: [number, number, number] = [ox2, oy1, oz2];
        const v3: [number, number, number] = [ox3, oy2, oz3];
        const v4: [number, number, number] = [ox4, oy2, oz4];
        triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
        triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      }
      
      if (i > 1 && i < heightSegments - 1) {
        const [ir1, iy1] = innerProfile[i];
        const [ir2, iy2] = innerProfile[i + 1];
        const offsetY = wallThickness;
        
        if (ir1 > 0.1 && ir2 > 0.1) {
          const ix1 = ir1 * Math.cos(theta1), iz1 = ir1 * Math.sin(theta1);
          const ix2 = ir1 * Math.cos(theta2), iz2 = ir1 * Math.sin(theta2);
          const ix3 = ir2 * Math.cos(theta1), iz3 = ir2 * Math.sin(theta1);
          const ix4 = ir2 * Math.cos(theta2), iz4 = ir2 * Math.sin(theta2);
          
          const iv1: [number, number, number] = [ix1, iy1 + offsetY, iz1];
          const iv2: [number, number, number] = [ix2, iy1 + offsetY, iz2];
          const iv3: [number, number, number] = [ix3, iy2 + offsetY, iz3];
          const iv4: [number, number, number] = [ix4, iy2 + offsetY, iz4];
          triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
          triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
        }
      }
    }
  }
  
  const bottomIndex = 3;
  const bottomRadius = outerProfile[bottomIndex][0];
  const bottomY = outerProfile[bottomIndex][1];
  const innerBottomRadius = Math.max(bottomRadius - wallThickness, 5);
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = bottomRadius * Math.cos(theta1), oz1 = bottomRadius * Math.sin(theta1);
    const ox2 = bottomRadius * Math.cos(theta2), oz2 = bottomRadius * Math.sin(theta2);
    const ix1 = innerBottomRadius * Math.cos(theta1), iz1 = innerBottomRadius * Math.sin(theta1);
    const ix2 = innerBottomRadius * Math.cos(theta2), iz2 = innerBottomRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [ox1, bottomY, oz1];
    const v2: [number, number, number] = [ox2, bottomY, oz2];
    const v3: [number, number, number] = [ix1, bottomY, iz1];
    const v4: [number, number, number] = [ix2, bottomY, iz2];
    
    triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
    triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
  }
  
  return triangles;
}

function generateScrewBase(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { baseType, baseHeight } = settings;
  
  const baseDiameter = baseType === "E26" ? 26 : baseType === "E14" ? 14 : 27;
  const baseRadius = baseDiameter / 2;
  const threadPitch = baseType === "E14" ? 2.5 : 3.629;
  const threadDepth = 1.2;
  const radialSegments = 48;
  
  // SIMPLIFIED SOLID DESIGN - completely solid with just a center wire hole
  // User feeds both wires through center hole, then solders tip (positive) and threads (negative)
  const collarHeight = 10;
  const collarRadius = baseRadius + 4;
  const wireHoleRadius = 2.5; // 5mm diameter hole for wire pair
  const tipRadius = 4;
  const tipHeight = 4;
  
  const threadHeight = baseHeight - collarHeight;
  
  // 1. COLLAR OUTER WALL (Y=0 to collarHeight)
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const x1 = collarRadius * Math.cos(theta1), z1 = collarRadius * Math.sin(theta1);
    const x2 = collarRadius * Math.cos(theta2), z2 = collarRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [x1, 0, z1];
    const v2: [number, number, number] = [x2, 0, z2];
    const v3: [number, number, number] = [x1, collarHeight, z1];
    const v4: [number, number, number] = [x2, collarHeight, z2];
    
    triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
    triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
  }
  
  // 2. COLLAR TOP (annular ring from collarRadius to wireHoleRadius)
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = collarRadius * Math.cos(theta1), oz1 = collarRadius * Math.sin(theta1);
    const ox2 = collarRadius * Math.cos(theta2), oz2 = collarRadius * Math.sin(theta2);
    const hx1 = wireHoleRadius * Math.cos(theta1), hz1 = wireHoleRadius * Math.sin(theta1);
    const hx2 = wireHoleRadius * Math.cos(theta2), hz2 = wireHoleRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [ox1, collarHeight, oz1];
    const v2: [number, number, number] = [ox2, collarHeight, oz2];
    const v3: [number, number, number] = [hx1, collarHeight, hz1];
    const v4: [number, number, number] = [hx2, collarHeight, hz2];
    
    triangles.push({ vertices: [v1, v2, v3], normal: [0, 1, 0] });
    triangles.push({ vertices: [v2, v4, v3], normal: [0, 1, 0] });
  }
  
  // 3. THREADED SECTION with helical threads (Y=0 to -threadHeight)
  const threadTurns = Math.floor(threadHeight / threadPitch);
  const threadSegments = 32;
  
  for (let turn = 0; turn < threadTurns; turn++) {
    for (let seg = 0; seg < threadSegments; seg++) {
      const t1 = (turn * threadSegments + seg) / (threadTurns * threadSegments);
      const t2 = (turn * threadSegments + seg + 1) / (threadTurns * threadSegments);
      
      const y1 = -t1 * threadHeight;
      const y2 = -t2 * threadHeight;
      
      const theta1 = t1 * threadTurns * Math.PI * 2;
      const theta2 = t2 * threadTurns * Math.PI * 2;
      
      const outerR = baseRadius;
      const innerR = baseRadius - threadDepth;
      
      const ox1 = outerR * Math.cos(theta1), oz1 = outerR * Math.sin(theta1);
      const ox2 = outerR * Math.cos(theta2), oz2 = outerR * Math.sin(theta2);
      
      const v1: [number, number, number] = [ox1, y1, oz1];
      const v2: [number, number, number] = [ox2, y2, oz2];
      
      const threadY1 = y1 + threadPitch * 0.3;
      const threadY2 = y2 + threadPitch * 0.3;
      const tx1 = innerR * Math.cos(theta1), tz1 = innerR * Math.sin(theta1);
      const tx2 = innerR * Math.cos(theta2), tz2 = innerR * Math.sin(theta2);
      
      const v3: [number, number, number] = [tx1, threadY1, tz1];
      const v4: [number, number, number] = [tx2, threadY2, tz2];
      
      triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
      triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      
      const v5: [number, number, number] = [tx1, y1, tz1];
      const v6: [number, number, number] = [tx2, y2, tz2];
      triangles.push({ vertices: [v3, v4, v5], normal: calculateNormal(v3, v4, v5) });
      triangles.push({ vertices: [v4, v6, v5], normal: calculateNormal(v4, v6, v5) });
    }
  }
  
  // 4. BOTTOM CAP (annular ring from thread outer edge to tip edge)
  const bottomY = -threadHeight;
  const outerRadius = baseRadius - threadDepth;
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = outerRadius * Math.cos(theta1), oz1 = outerRadius * Math.sin(theta1);
    const ox2 = outerRadius * Math.cos(theta2), oz2 = outerRadius * Math.sin(theta2);
    const tx1 = tipRadius * Math.cos(theta1), tz1 = tipRadius * Math.sin(theta1);
    const tx2 = tipRadius * Math.cos(theta2), tz2 = tipRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [ox1, bottomY, oz1];
    const v2: [number, number, number] = [ox2, bottomY, oz2];
    const v3: [number, number, number] = [tx1, bottomY, tz1];
    const v4: [number, number, number] = [tx2, bottomY, tz2];
    
    triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
    triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
  }
  
  // 5. CENTER TIP OUTER WALL (extends from bottom cap down)
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const x1 = tipRadius * Math.cos(theta1), z1 = tipRadius * Math.sin(theta1);
    const x2 = tipRadius * Math.cos(theta2), z2 = tipRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [x1, bottomY, z1];
    const v2: [number, number, number] = [x2, bottomY, z2];
    const v3: [number, number, number] = [x1, bottomY - tipHeight, z1];
    const v4: [number, number, number] = [x2, bottomY - tipHeight, z2];
    
    triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
    triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
  }
  
  // 6. TIP BOTTOM (annular ring from tip edge to wire hole edge)
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const tx1 = tipRadius * Math.cos(theta1), tz1 = tipRadius * Math.sin(theta1);
    const tx2 = tipRadius * Math.cos(theta2), tz2 = tipRadius * Math.sin(theta2);
    const hx1 = wireHoleRadius * Math.cos(theta1), hz1 = wireHoleRadius * Math.sin(theta1);
    const hx2 = wireHoleRadius * Math.cos(theta2), hz2 = wireHoleRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [tx1, bottomY - tipHeight, tz1];
    const v2: [number, number, number] = [tx2, bottomY - tipHeight, tz2];
    const v3: [number, number, number] = [hx1, bottomY - tipHeight, hz1];
    const v4: [number, number, number] = [hx2, bottomY - tipHeight, hz2];
    
    triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
    triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
  }
  
  // 7. WIRE HOLE INNER WALL (from tip bottom up to collar top)
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const hx1 = wireHoleRadius * Math.cos(theta1), hz1 = wireHoleRadius * Math.sin(theta1);
    const hx2 = wireHoleRadius * Math.cos(theta2), hz2 = wireHoleRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [hx1, bottomY - tipHeight, hz1];
    const v2: [number, number, number] = [hx2, bottomY - tipHeight, hz2];
    const v3: [number, number, number] = [hx1, collarHeight, hz1];
    const v4: [number, number, number] = [hx2, collarHeight, hz2];
    
    // Inward-facing normal
    triangles.push({ vertices: [v1, v3, v2], normal: calculateNormal(v1, v3, v2) });
    triangles.push({ vertices: [v2, v3, v4], normal: calculateNormal(v2, v3, v4) });
  }
  
  // 8. FEET SOCKETS - two threaded sockets in the collar for feet to screw into
  // The feet have threaded posts (6mm radius, 8mm height) that go UP into these sockets
  if (settings.includeFeet) {
    const socketRadius = 6.5; // Slightly larger than foot thread (6mm) for clearance
    const socketDepth = 10; // Depth of socket
    const footSpacing = 12; // Matches feet spacing
    const socketSegments = 16;
    
    for (let socketIdx = 0; socketIdx < 2; socketIdx++) {
      const socketX = (socketIdx === 0) ? -footSpacing : footSpacing;
      const socketZ = 0;
      const socketTop = 0; // Bottom of collar
      const socketBottom = socketTop - socketDepth;
      
      // Socket inner wall (cylindrical hole)
      for (let j = 0; j < socketSegments; j++) {
        const theta1 = (j / socketSegments) * Math.PI * 2;
        const theta2 = ((j + 1) / socketSegments) * Math.PI * 2;
        
        const sx1 = socketX + socketRadius * Math.cos(theta1);
        const sz1 = socketZ + socketRadius * Math.sin(theta1);
        const sx2 = socketX + socketRadius * Math.cos(theta2);
        const sz2 = socketZ + socketRadius * Math.sin(theta2);
        
        const sb1: [number, number, number] = [sx1, socketBottom, sz1];
        const sb2: [number, number, number] = [sx2, socketBottom, sz2];
        const st1: [number, number, number] = [sx1, socketTop, sz1];
        const st2: [number, number, number] = [sx2, socketTop, sz2];
        
        // Wall facing inward (into socket)
        triangles.push({ vertices: [sb2, sb1, st1], normal: calculateNormal(sb2, sb1, st1) });
        triangles.push({ vertices: [sb2, st1, st2], normal: calculateNormal(sb2, st1, st2) });
      }
      
      // Socket bottom cap (closes the socket)
      for (let j = 0; j < socketSegments; j++) {
        const theta1 = (j / socketSegments) * Math.PI * 2;
        const theta2 = ((j + 1) / socketSegments) * Math.PI * 2;
        
        const center: [number, number, number] = [socketX, socketBottom, socketZ];
        const v1: [number, number, number] = [socketX + socketRadius * Math.cos(theta1), socketBottom, socketZ + socketRadius * Math.sin(theta1)];
        const v2: [number, number, number] = [socketX + socketRadius * Math.cos(theta2), socketBottom, socketZ + socketRadius * Math.sin(theta2)];
        
        triangles.push({ vertices: [center, v1, v2], normal: [0, -1, 0] });
      }
    }
  }
  
  return triangles;
}

function generateGlasses(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellWidth, shellHeight } = settings;
  
  const glassesWidth = 50.5;
  const glassesDepth = 24;
  const glassesHeight = 5;
  
  const eyeSpacing = 25;
  const lensRadius = 10;
  const frameThickness = 2.5;
  const radialSegments = 24;
  
  const centerY = shellHeight * 0.65;
  const centerZ = shellWidth * 0.4;
  
  for (let eye = -1; eye <= 1; eye += 2) {
    const centerX = eye * eyeSpacing / 2;
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const outerR = lensRadius + frameThickness;
      const innerR = lensRadius;
      
      const ox1 = centerX + outerR * Math.cos(theta1);
      const oy1 = centerY + outerR * Math.sin(theta1);
      const ox2 = centerX + outerR * Math.cos(theta2);
      const oy2 = centerY + outerR * Math.sin(theta2);
      const ix1 = centerX + innerR * Math.cos(theta1);
      const iy1 = centerY + innerR * Math.sin(theta1);
      const ix2 = centerX + innerR * Math.cos(theta2);
      const iy2 = centerY + innerR * Math.sin(theta2);
      
      const fv1: [number, number, number] = [ox1, oy1, centerZ];
      const fv2: [number, number, number] = [ox2, oy2, centerZ];
      const fv3: [number, number, number] = [ox1, oy1, centerZ + glassesHeight];
      const fv4: [number, number, number] = [ox2, oy2, centerZ + glassesHeight];
      
      triangles.push({ vertices: [fv1, fv2, fv3], normal: calculateNormal(fv1, fv2, fv3) });
      triangles.push({ vertices: [fv2, fv4, fv3], normal: calculateNormal(fv2, fv4, fv3) });
      
      const iv1: [number, number, number] = [ix1, iy1, centerZ];
      const iv2: [number, number, number] = [ix2, iy2, centerZ];
      const iv3: [number, number, number] = [ix1, iy1, centerZ + glassesHeight];
      const iv4: [number, number, number] = [ix2, iy2, centerZ + glassesHeight];
      
      triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
      triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
      
      const tfv1: [number, number, number] = [ox1, oy1, centerZ + glassesHeight];
      const tfv2: [number, number, number] = [ox2, oy2, centerZ + glassesHeight];
      const tfv3: [number, number, number] = [ix1, iy1, centerZ + glassesHeight];
      const tfv4: [number, number, number] = [ix2, iy2, centerZ + glassesHeight];
      
      triangles.push({ vertices: [tfv1, tfv2, tfv3], normal: [0, 0, 1] });
      triangles.push({ vertices: [tfv2, tfv4, tfv3], normal: [0, 0, 1] });
      
      const bfv1: [number, number, number] = [ox1, oy1, centerZ];
      const bfv2: [number, number, number] = [ox2, oy2, centerZ];
      const bfv3: [number, number, number] = [ix1, iy1, centerZ];
      const bfv4: [number, number, number] = [ix2, iy2, centerZ];
      
      triangles.push({ vertices: [bfv1, bfv3, bfv2], normal: [0, 0, -1] });
      triangles.push({ vertices: [bfv2, bfv3, bfv4], normal: [0, 0, -1] });
    }
  }
  
  const bridgeStartX = -eyeSpacing / 2 + lensRadius + frameThickness;
  const bridgeEndX = eyeSpacing / 2 - lensRadius - frameThickness;
  const bridgeHalfWidth = frameThickness / 2;
  const bridgeHalfHeight = frameThickness / 2;
  
  const bv: [number, number, number][] = [
    [bridgeStartX, centerY - bridgeHalfHeight, centerZ],
    [bridgeEndX, centerY - bridgeHalfHeight, centerZ],
    [bridgeEndX, centerY + bridgeHalfHeight, centerZ],
    [bridgeStartX, centerY + bridgeHalfHeight, centerZ],
    [bridgeStartX, centerY - bridgeHalfHeight, centerZ + glassesHeight],
    [bridgeEndX, centerY - bridgeHalfHeight, centerZ + glassesHeight],
    [bridgeEndX, centerY + bridgeHalfHeight, centerZ + glassesHeight],
    [bridgeStartX, centerY + bridgeHalfHeight, centerZ + glassesHeight],
  ];
  
  triangles.push({ vertices: [bv[0], bv[1], bv[2]], normal: [0, 0, -1] });
  triangles.push({ vertices: [bv[0], bv[2], bv[3]], normal: [0, 0, -1] });
  triangles.push({ vertices: [bv[4], bv[6], bv[5]], normal: [0, 0, 1] });
  triangles.push({ vertices: [bv[4], bv[7], bv[6]], normal: [0, 0, 1] });
  triangles.push({ vertices: [bv[3], bv[2], bv[7]], normal: [0, 1, 0] });
  triangles.push({ vertices: [bv[2], bv[6], bv[7]], normal: [0, 1, 0] });
  triangles.push({ vertices: [bv[0], bv[4], bv[1]], normal: [0, -1, 0] });
  triangles.push({ vertices: [bv[1], bv[4], bv[5]], normal: [0, -1, 0] });
  
  return triangles;
}

function generateFeet(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Bird/chicken-style feet - properly welded manifold mesh
  // Feet screw INTO the screw base (which already screws into the egg)
  // The egg is hollow - wires feed through naturally
  
  const legRadius = 5;
  const legHeight = 25;
  const toeRadius = 3.5;
  const toeLength = 20;
  const toeSpread = 40 * Math.PI / 180;
  const footSpacing = 12; // Distance between feet centers
  const threadRadius = 6;
  const threadHeight = 8;
  const radialSegments = 24;
  
  // Generate TWO feet (left and right)
  for (let footIdx = 0; footIdx < 2; footIdx++) {
    const footOffsetX = (footIdx === 0) ? -footSpacing : footSpacing;
    
    // Start building from ground up - toes are at Y=0, leg extends upward
    
    // 1. Generate base junction where toes meet leg (solid welded connection)
    const junctionRadius = legRadius + 2;
    const junctionHeight = 6;
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      // Junction cylinder (bottom of leg, wider, connects to toes)
      const jx1 = footOffsetX + junctionRadius * Math.cos(theta1);
      const jz1 = junctionRadius * Math.sin(theta1);
      const jx2 = footOffsetX + junctionRadius * Math.cos(theta2);
      const jz2 = junctionRadius * Math.sin(theta2);
      
      // Bottom of junction (on ground)
      const jb1: [number, number, number] = [jx1, 0, jz1];
      const jb2: [number, number, number] = [jx2, 0, jz2];
      // Top of junction (connects to leg)
      const jt1: [number, number, number] = [jx1, junctionHeight, jz1];
      const jt2: [number, number, number] = [jx2, junctionHeight, jz2];
      
      // Junction outer wall
      triangles.push({ vertices: [jb1, jb2, jt2], normal: calculateNormal(jb1, jb2, jt2) });
      triangles.push({ vertices: [jb1, jt2, jt1], normal: calculateNormal(jb1, jt2, jt1) });
      
      // Junction bottom (solid)
      const center: [number, number, number] = [footOffsetX, 0, 0];
      triangles.push({ vertices: [center, jb2, jb1], normal: [0, -1, 0] });
      
      // Junction top ring (connects to narrower leg)
      const lx1 = footOffsetX + legRadius * Math.cos(theta1);
      const lz1 = legRadius * Math.sin(theta1);
      const lx2 = footOffsetX + legRadius * Math.cos(theta2);
      const lz2 = legRadius * Math.sin(theta2);
      
      const lt1: [number, number, number] = [lx1, junctionHeight, lz1];
      const lt2: [number, number, number] = [lx2, junctionHeight, lz2];
      
      triangles.push({ vertices: [jt1, jt2, lt2], normal: [0, 1, 0] });
      triangles.push({ vertices: [jt1, lt2, lt1], normal: [0, 1, 0] });
    }
    
    // 2. Vertical leg (from junction to thread)
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const lx1 = footOffsetX + legRadius * Math.cos(theta1);
      const lz1 = legRadius * Math.sin(theta1);
      const lx2 = footOffsetX + legRadius * Math.cos(theta2);
      const lz2 = legRadius * Math.sin(theta2);
      
      const lb1: [number, number, number] = [lx1, junctionHeight, lz1];
      const lb2: [number, number, number] = [lx2, junctionHeight, lz2];
      const lt1: [number, number, number] = [lx1, legHeight, lz1];
      const lt2: [number, number, number] = [lx2, legHeight, lz2];
      
      triangles.push({ vertices: [lb1, lb2, lt2], normal: calculateNormal(lb1, lb2, lt2) });
      triangles.push({ vertices: [lb1, lt2, lt1], normal: calculateNormal(lb1, lt2, lt1) });
    }
    
    // 3. Threaded post on top (screws INTO the screw base)
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      // Thread is slightly wider than leg
      const tx1 = footOffsetX + threadRadius * Math.cos(theta1);
      const tz1 = threadRadius * Math.sin(theta1);
      const tx2 = footOffsetX + threadRadius * Math.cos(theta2);
      const tz2 = threadRadius * Math.sin(theta2);
      
      const tb1: [number, number, number] = [tx1, legHeight, tz1];
      const tb2: [number, number, number] = [tx2, legHeight, tz2];
      const tt1: [number, number, number] = [tx1, legHeight + threadHeight, tz1];
      const tt2: [number, number, number] = [tx2, legHeight + threadHeight, tz2];
      
      triangles.push({ vertices: [tb1, tb2, tt2], normal: calculateNormal(tb1, tb2, tt2) });
      triangles.push({ vertices: [tb1, tt2, tt1], normal: calculateNormal(tb1, tt2, tt1) });
      
      // Top cap (solid)
      const topCenter: [number, number, number] = [footOffsetX, legHeight + threadHeight, 0];
      triangles.push({ vertices: [topCenter, tt1, tt2], normal: [0, 1, 0] });
      
      // Ring connecting leg to thread
      const lx1 = footOffsetX + legRadius * Math.cos(theta1);
      const lz1 = legRadius * Math.sin(theta1);
      const lx2 = footOffsetX + legRadius * Math.cos(theta2);
      const lz2 = legRadius * Math.sin(theta2);
      
      const lr1: [number, number, number] = [lx1, legHeight, lz1];
      const lr2: [number, number, number] = [lx2, legHeight, lz2];
      
      triangles.push({ vertices: [lr1, lr2, tb2], normal: [0, 1, 0] });
      triangles.push({ vertices: [lr1, tb2, tb1], normal: [0, 1, 0] });
    }
    
    // 4. Generate 3 toes - properly welded to junction
    const toeAngles = [-toeSpread, 0, toeSpread];
    
    for (const toeAngle of toeAngles) {
      const toeSegments = 16;
      const toeTaper = 0.35;
      
      // Toe starts at junction edge and extends outward/downward
      const startX = footOffsetX + junctionRadius * 0.8 * Math.sin(toeAngle);
      const startZ = junctionRadius * 0.8 * Math.cos(toeAngle);
      const startY = junctionHeight * 0.3;
      
      for (let seg = 0; seg < toeSegments; seg++) {
        const t1 = seg / toeSegments;
        const t2 = (seg + 1) / toeSegments;
        
        // Radius tapers along length
        const r1 = toeRadius * (1 - t1 * (1 - toeTaper));
        const r2 = toeRadius * (1 - t2 * (1 - toeTaper));
        
        // Toe curves downward
        const dropCurve1 = Math.pow(t1, 1.5) * 3;
        const dropCurve2 = Math.pow(t2, 1.5) * 3;
        
        const toeX1 = startX + t1 * toeLength * Math.sin(toeAngle);
        const toeZ1 = startZ + t1 * toeLength * Math.cos(toeAngle);
        const toeY1 = startY - dropCurve1;
        
        const toeX2 = startX + t2 * toeLength * Math.sin(toeAngle);
        const toeZ2 = startZ + t2 * toeLength * Math.cos(toeAngle);
        const toeY2 = startY - dropCurve2;
        
        // Generate tube cross-sections
        for (let j = 0; j < 12; j++) {
          const phi1 = (j / 12) * Math.PI * 2;
          const phi2 = ((j + 1) / 12) * Math.PI * 2;
          
          // Cross-section perpendicular to toe direction
          const perpX = Math.cos(toeAngle);
          const perpZ = -Math.sin(toeAngle);
          
          const v1: [number, number, number] = [
            toeX1 + r1 * Math.cos(phi1) * perpX,
            toeY1 + r1 * Math.sin(phi1),
            toeZ1 + r1 * Math.cos(phi1) * perpZ
          ];
          const v2: [number, number, number] = [
            toeX1 + r1 * Math.cos(phi2) * perpX,
            toeY1 + r1 * Math.sin(phi2),
            toeZ1 + r1 * Math.cos(phi2) * perpZ
          ];
          const v3: [number, number, number] = [
            toeX2 + r2 * Math.cos(phi1) * perpX,
            toeY2 + r2 * Math.sin(phi1),
            toeZ2 + r2 * Math.cos(phi1) * perpZ
          ];
          const v4: [number, number, number] = [
            toeX2 + r2 * Math.cos(phi2) * perpX,
            toeY2 + r2 * Math.sin(phi2),
            toeZ2 + r2 * Math.cos(phi2) * perpZ
          ];
          
          triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
          triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
        }
      }
      
      // Toe tip cap
      const tipX = startX + toeLength * Math.sin(toeAngle);
      const tipZ = startZ + toeLength * Math.cos(toeAngle);
      const tipY = startY - Math.pow(1, 1.5) * 3;
      const tipR = toeRadius * toeTaper;
      
      for (let j = 0; j < 12; j++) {
        const phi1 = (j / 12) * Math.PI * 2;
        const phi2 = ((j + 1) / 12) * Math.PI * 2;
        
        const perpX = Math.cos(toeAngle);
        const perpZ = -Math.sin(toeAngle);
        
        const tipCenter: [number, number, number] = [tipX, tipY, tipZ];
        const v1: [number, number, number] = [
          tipX + tipR * Math.cos(phi1) * perpX,
          tipY + tipR * Math.sin(phi1),
          tipZ + tipR * Math.cos(phi1) * perpZ
        ];
        const v2: [number, number, number] = [
          tipX + tipR * Math.cos(phi2) * perpX,
          tipY + tipR * Math.sin(phi2),
          tipZ + tipR * Math.cos(phi2) * perpZ
        ];
        
        triangles.push({ vertices: [tipCenter, v2, v1], normal: calculateNormal(tipCenter, v2, v1) });
      }
    }
  }
  
  return triangles;
}

// Generate internal threaded socket for egg shell (receives the stand's threaded post)
function generateEggSocket(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  const socketRadius = 10; // Slightly larger than thread (9mm) for clearance
  const socketDepth = 15; // Depth of socket
  const wireChannelRadius = 3;
  const threadPitch = 2.5;
  const radialSegments = 32;
  
  // Socket starts at bottom of egg shell interior
  const socketTop = settings.shellHeight * 0.08; // Just above bottom of egg
  const socketBottom = socketTop - socketDepth;
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    // Internal thread profile (female thread)
    const threadTurns = socketDepth / threadPitch;
    const heightSteps = 24;
    
    for (let h = 0; h < heightSteps; h++) {
      const y1 = socketBottom + (h / heightSteps) * socketDepth;
      const y2 = socketBottom + ((h + 1) / heightSteps) * socketDepth;
      
      // Helical thread pattern (inverted for female thread)
      const helixPhase1 = ((h / heightSteps) * threadTurns + j / radialSegments) * Math.PI * 2;
      const helixPhase2 = (((h + 1) / heightSteps) * threadTurns + j / radialSegments) * Math.PI * 2;
      const threadDepth = 1.0;
      
      const r1 = socketRadius + threadDepth * 0.5 * (1 + Math.sin(helixPhase1));
      const r2 = socketRadius + threadDepth * 0.5 * (1 + Math.sin(helixPhase2));
      
      const x1 = r1 * Math.cos(theta1);
      const z1 = r1 * Math.sin(theta1);
      const x2 = r1 * Math.cos(theta2);
      const z2 = r1 * Math.sin(theta2);
      const x3 = r2 * Math.cos(theta1);
      const z3 = r2 * Math.sin(theta1);
      const x4 = r2 * Math.cos(theta2);
      const z4 = r2 * Math.sin(theta2);
      
      const v1: [number, number, number] = [x1, y1, z1];
      const v2: [number, number, number] = [x2, y1, z2];
      const v3: [number, number, number] = [x3, y2, z3];
      const v4: [number, number, number] = [x4, y2, z4];
      
      // Normals point inward for socket
      triangles.push({ vertices: [v2, v1, v3], normal: calculateNormal(v2, v1, v3) });
      triangles.push({ vertices: [v4, v2, v3], normal: calculateNormal(v4, v2, v3) });
    }
    
    // Wire channel through socket center
    const ix1 = wireChannelRadius * Math.cos(theta1);
    const iz1 = wireChannelRadius * Math.sin(theta1);
    const ix2 = wireChannelRadius * Math.cos(theta2);
    const iz2 = wireChannelRadius * Math.sin(theta2);
    
    const ibv1: [number, number, number] = [ix1, socketBottom, iz1];
    const ibv2: [number, number, number] = [ix2, socketBottom, iz2];
    const itv1: [number, number, number] = [ix1, socketTop, iz1];
    const itv2: [number, number, number] = [ix2, socketTop, iz2];
    
    // Wire channel wall (normals point inward)
    triangles.push({ vertices: [ibv1, ibv2, itv2], normal: calculateNormal(ibv1, ibv2, itv2) });
    triangles.push({ vertices: [ibv1, itv2, itv1], normal: calculateNormal(ibv1, itv2, itv1) });
    
    // Bottom cap (annular ring)
    const ox1 = socketRadius * Math.cos(theta1);
    const oz1 = socketRadius * Math.sin(theta1);
    const ox2 = socketRadius * Math.cos(theta2);
    const oz2 = socketRadius * Math.sin(theta2);
    
    const bv1: [number, number, number] = [ox1, socketBottom, oz1];
    const bv2: [number, number, number] = [ox2, socketBottom, oz2];
    
    triangles.push({ vertices: [bv2, bv1, ibv1], normal: [0, -1, 0] });
    triangles.push({ vertices: [bv2, ibv1, ibv2], normal: [0, -1, 0] });
  }
  
  return triangles;
}

function generateBatteryHolder(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  const holderWidth = 43.8;
  const holderDepth = 31.5;
  const holderHeight = 43.8;
  const wallThickness = 2.5;
  
  const hw = holderWidth / 2;
  const hd = holderDepth / 2;
  
  const outerVerts: [number, number, number][] = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-hw, holderHeight, -hd], [hw, holderHeight, -hd], [hw, holderHeight, hd], [-hw, holderHeight, hd]
  ];
  
  triangles.push({ vertices: [outerVerts[0], outerVerts[1], outerVerts[4]], normal: [0, 0, -1] });
  triangles.push({ vertices: [outerVerts[1], outerVerts[5], outerVerts[4]], normal: [0, 0, -1] });
  triangles.push({ vertices: [outerVerts[2], outerVerts[3], outerVerts[6]], normal: [0, 0, 1] });
  triangles.push({ vertices: [outerVerts[3], outerVerts[7], outerVerts[6]], normal: [0, 0, 1] });
  triangles.push({ vertices: [outerVerts[0], outerVerts[4], outerVerts[3]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [outerVerts[4], outerVerts[7], outerVerts[3]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [outerVerts[1], outerVerts[2], outerVerts[5]], normal: [1, 0, 0] });
  triangles.push({ vertices: [outerVerts[2], outerVerts[6], outerVerts[5]], normal: [1, 0, 0] });
  triangles.push({ vertices: [outerVerts[0], outerVerts[3], outerVerts[1]], normal: [0, -1, 0] });
  triangles.push({ vertices: [outerVerts[1], outerVerts[3], outerVerts[2]], normal: [0, -1, 0] });
  
  const ihw = hw - wallThickness;
  const ihd = hd - wallThickness;
  const innerBottom = wallThickness;
  
  const innerVerts: [number, number, number][] = [
    [-ihw, innerBottom, -ihd], [ihw, innerBottom, -ihd], [ihw, innerBottom, ihd], [-ihw, innerBottom, ihd],
    [-ihw, holderHeight, -ihd], [ihw, holderHeight, -ihd], [ihw, holderHeight, ihd], [-ihw, holderHeight, ihd]
  ];
  
  triangles.push({ vertices: [innerVerts[0], innerVerts[4], innerVerts[1]], normal: [0, 0, 1] });
  triangles.push({ vertices: [innerVerts[1], innerVerts[4], innerVerts[5]], normal: [0, 0, 1] });
  triangles.push({ vertices: [innerVerts[2], innerVerts[6], innerVerts[3]], normal: [0, 0, -1] });
  triangles.push({ vertices: [innerVerts[3], innerVerts[6], innerVerts[7]], normal: [0, 0, -1] });
  triangles.push({ vertices: [innerVerts[0], innerVerts[3], innerVerts[4]], normal: [1, 0, 0] });
  triangles.push({ vertices: [innerVerts[4], innerVerts[3], innerVerts[7]], normal: [1, 0, 0] });
  triangles.push({ vertices: [innerVerts[1], innerVerts[5], innerVerts[2]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [innerVerts[2], innerVerts[5], innerVerts[6]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [innerVerts[0], innerVerts[1], innerVerts[3]], normal: [0, 1, 0] });
  triangles.push({ vertices: [innerVerts[1], innerVerts[2], innerVerts[3]], normal: [0, 1, 0] });
  
  triangles.push({ vertices: [outerVerts[4], outerVerts[5], innerVerts[4]], normal: [0, 1, 0] });
  triangles.push({ vertices: [innerVerts[4], outerVerts[5], innerVerts[5]], normal: [0, 1, 0] });
  triangles.push({ vertices: [outerVerts[5], outerVerts[6], innerVerts[5]], normal: [0, 1, 0] });
  triangles.push({ vertices: [innerVerts[5], outerVerts[6], innerVerts[6]], normal: [0, 1, 0] });
  triangles.push({ vertices: [outerVerts[6], outerVerts[7], innerVerts[6]], normal: [0, 1, 0] });
  triangles.push({ vertices: [innerVerts[6], outerVerts[7], innerVerts[7]], normal: [0, 1, 0] });
  triangles.push({ vertices: [outerVerts[7], outerVerts[4], innerVerts[7]], normal: [0, 1, 0] });
  triangles.push({ vertices: [innerVerts[7], outerVerts[4], innerVerts[4]], normal: [0, 1, 0] });
  
  return triangles;
}

function generateTwistOffBatteryCap(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const batteryType = settings.batteryType || "AAA";
  
  const capRadius = batteryType === "CR2032" || batteryType === "CR2025" ? 14 : 16;
  const capHeight = 8;
  const coinSlotWidth = 12;
  const coinSlotDepth = 2;
  const threadHeight = 5;
  const threadPitch = 2;
  const radialSegments = 32;
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const x1 = capRadius * Math.cos(theta1), z1 = capRadius * Math.sin(theta1);
    const x2 = capRadius * Math.cos(theta2), z2 = capRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [x1, 0, z1];
    const v2: [number, number, number] = [x2, 0, z2];
    const v3: [number, number, number] = [x1, capHeight, z1];
    const v4: [number, number, number] = [x2, capHeight, z2];
    
    triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
    triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
    
    const center: [number, number, number] = [0, 0, 0];
    triangles.push({ vertices: [center, v2, v1], normal: [0, -1, 0] });
  }
  
  const slotHalfWidth = coinSlotWidth / 2;
  const slotHalfDepth = 1.5;
  const topY = capHeight;
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const x1 = capRadius * Math.cos(theta1), z1 = capRadius * Math.sin(theta1);
    const x2 = capRadius * Math.cos(theta2), z2 = capRadius * Math.sin(theta2);
    
    const isInSlot1 = Math.abs(z1) < slotHalfDepth && x1 > -slotHalfWidth && x1 < slotHalfWidth;
    const isInSlot2 = Math.abs(z2) < slotHalfDepth && x2 > -slotHalfWidth && x2 < slotHalfWidth;
    
    if (!isInSlot1 && !isInSlot2) {
      const center: [number, number, number] = [0, topY, 0];
      const tv1: [number, number, number] = [x1, topY, z1];
      const tv2: [number, number, number] = [x2, topY, z2];
      triangles.push({ vertices: [center, tv1, tv2], normal: [0, 1, 0] });
    }
  }
  
  const slotBottom = topY - coinSlotDepth;
  const slotVerts: [number, number, number][] = [
    [-slotHalfWidth, slotBottom, -slotHalfDepth],
    [slotHalfWidth, slotBottom, -slotHalfDepth],
    [slotHalfWidth, slotBottom, slotHalfDepth],
    [-slotHalfWidth, slotBottom, slotHalfDepth],
    [-slotHalfWidth, topY, -slotHalfDepth],
    [slotHalfWidth, topY, -slotHalfDepth],
    [slotHalfWidth, topY, slotHalfDepth],
    [-slotHalfWidth, topY, slotHalfDepth],
  ];
  
  triangles.push({ vertices: [slotVerts[0], slotVerts[1], slotVerts[2]], normal: [0, -1, 0] });
  triangles.push({ vertices: [slotVerts[0], slotVerts[2], slotVerts[3]], normal: [0, -1, 0] });
  triangles.push({ vertices: [slotVerts[0], slotVerts[4], slotVerts[1]], normal: [0, 0, -1] });
  triangles.push({ vertices: [slotVerts[1], slotVerts[4], slotVerts[5]], normal: [0, 0, -1] });
  triangles.push({ vertices: [slotVerts[2], slotVerts[6], slotVerts[3]], normal: [0, 0, 1] });
  triangles.push({ vertices: [slotVerts[3], slotVerts[6], slotVerts[7]], normal: [0, 0, 1] });
  triangles.push({ vertices: [slotVerts[0], slotVerts[3], slotVerts[4]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [slotVerts[3], slotVerts[7], slotVerts[4]], normal: [-1, 0, 0] });
  triangles.push({ vertices: [slotVerts[1], slotVerts[5], slotVerts[2]], normal: [1, 0, 0] });
  triangles.push({ vertices: [slotVerts[2], slotVerts[5], slotVerts[6]], normal: [1, 0, 0] });
  
  const innerCapRadius = capRadius - 2;
  const threadSegs = 24;
  const threadTurns = Math.floor(threadHeight / threadPitch);
  
  for (let turn = 0; turn < threadTurns; turn++) {
    for (let seg = 0; seg < threadSegs; seg++) {
      const t1 = (turn * threadSegs + seg) / (threadTurns * threadSegs);
      const t2 = (turn * threadSegs + seg + 1) / (threadTurns * threadSegs);
      
      const y1 = -t1 * threadHeight;
      const y2 = -t2 * threadHeight;
      const theta1 = t1 * threadTurns * Math.PI * 2;
      const theta2 = t2 * threadTurns * Math.PI * 2;
      
      const x1 = innerCapRadius * Math.cos(theta1);
      const z1 = innerCapRadius * Math.sin(theta1);
      const x2 = innerCapRadius * Math.cos(theta2);
      const z2 = innerCapRadius * Math.sin(theta2);
      
      const tv1: [number, number, number] = [x1, y1, z1];
      const tv2: [number, number, number] = [x2, y2, z2];
      const tv3: [number, number, number] = [x1 * 0.9, y1 + threadPitch * 0.3, z1 * 0.9];
      const tv4: [number, number, number] = [x2 * 0.9, y2 + threadPitch * 0.3, z2 * 0.9];
      
      triangles.push({ vertices: [tv1, tv2, tv3], normal: calculateNormal(tv1, tv2, tv3) });
      triangles.push({ vertices: [tv2, tv4, tv3], normal: calculateNormal(tv2, tv4, tv3) });
    }
  }
  
  return triangles;
}

function generateJarShell(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness } = settings;
  const radialSegments = 48;
  const heightSegments = 40;
  
  const neckRatio = 0.6;
  const neckHeight = shellHeight * 0.2;
  const bodyHeight = shellHeight - neckHeight;
  const bodyRadius = shellWidth / 2;
  const neckRadius = bodyRadius * neckRatio;
  
  for (let i = 0; i < heightSegments; i++) {
    const t1 = i / heightSegments;
    const t2 = (i + 1) / heightSegments;
    const y1 = t1 * shellHeight;
    const y2 = t2 * shellHeight;
    
    let r1, r2;
    if (y1 < bodyHeight) {
      r1 = bodyRadius * (1 - Math.pow(y1 / bodyHeight - 0.5, 4) * 0.1);
    } else {
      const neckT = (y1 - bodyHeight) / neckHeight;
      r1 = bodyRadius - (bodyRadius - neckRadius) * neckT;
    }
    
    if (y2 < bodyHeight) {
      r2 = bodyRadius * (1 - Math.pow(y2 / bodyHeight - 0.5, 4) * 0.1);
    } else {
      const neckT = (y2 - bodyHeight) / neckHeight;
      r2 = bodyRadius - (bodyRadius - neckRadius) * neckT;
    }
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const ox1 = r1 * Math.cos(theta1), oz1 = r1 * Math.sin(theta1);
      const ox2 = r1 * Math.cos(theta2), oz2 = r1 * Math.sin(theta2);
      const ox3 = r2 * Math.cos(theta1), oz3 = r2 * Math.sin(theta1);
      const ox4 = r2 * Math.cos(theta2), oz4 = r2 * Math.sin(theta2);
      
      const v1: [number, number, number] = [ox1, y1, oz1];
      const v2: [number, number, number] = [ox2, y1, oz2];
      const v3: [number, number, number] = [ox3, y2, oz3];
      const v4: [number, number, number] = [ox4, y2, oz4];
      
      triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
      triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
      
      const ir1 = r1 - wallThickness;
      const ir2 = r2 - wallThickness;
      if (ir1 > 1 && ir2 > 1) {
        const ix1 = ir1 * Math.cos(theta1), iz1 = ir1 * Math.sin(theta1);
        const ix2 = ir1 * Math.cos(theta2), iz2 = ir1 * Math.sin(theta2);
        const ix3 = ir2 * Math.cos(theta1), iz3 = ir2 * Math.sin(theta1);
        const ix4 = ir2 * Math.cos(theta2), iz4 = ir2 * Math.sin(theta2);
        
        const iv1: [number, number, number] = [ix1, y1, iz1];
        const iv2: [number, number, number] = [ix2, y1, iz2];
        const iv3: [number, number, number] = [ix3, y2, iz3];
        const iv4: [number, number, number] = [ix4, y2, iz4];
        
        triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
        triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
      }
    }
  }
  
  const bottomRadius = bodyRadius * 0.95;
  const innerBottomRadius = bottomRadius - wallThickness;
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = bottomRadius * Math.cos(theta1), oz1 = bottomRadius * Math.sin(theta1);
    const ox2 = bottomRadius * Math.cos(theta2), oz2 = bottomRadius * Math.sin(theta2);
    const ix1 = innerBottomRadius * Math.cos(theta1), iz1 = innerBottomRadius * Math.sin(theta1);
    const ix2 = innerBottomRadius * Math.cos(theta2), iz2 = innerBottomRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [ox1, 0, oz1];
    const v2: [number, number, number] = [ox2, 0, oz2];
    const v3: [number, number, number] = [ix1, 0, iz1];
    const v4: [number, number, number] = [ix2, 0, iz2];
    
    triangles.push({ vertices: [v1, v3, v2], normal: [0, -1, 0] });
    triangles.push({ vertices: [v2, v3, v4], normal: [0, -1, 0] });
  }
  
  // Top rim cap at neck opening (connects outer and inner walls)
  const topY = shellHeight;
  const topOuterR = neckRadius;
  const topInnerR = neckRadius - wallThickness;
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const ox1 = topOuterR * Math.cos(theta1), oz1 = topOuterR * Math.sin(theta1);
    const ox2 = topOuterR * Math.cos(theta2), oz2 = topOuterR * Math.sin(theta2);
    const ix1 = topInnerR * Math.cos(theta1), iz1 = topInnerR * Math.sin(theta1);
    const ix2 = topInnerR * Math.cos(theta2), iz2 = topInnerR * Math.sin(theta2);
    
    const tv1: [number, number, number] = [ox1, topY, oz1];
    const tv2: [number, number, number] = [ox2, topY, oz2];
    const tv3: [number, number, number] = [ix1, topY, iz1];
    const tv4: [number, number, number] = [ix2, topY, iz2];
    
    triangles.push({ vertices: [tv1, tv2, tv3], normal: [0, 1, 0] });
    triangles.push({ vertices: [tv2, tv4, tv3], normal: [0, 1, 0] });
  }
  
  return triangles;
}

function generateTeardropShell(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness } = settings;
  const radialSegments = 48;
  const heightSegments = 40;
  
  for (let i = 0; i < heightSegments; i++) {
    const t1 = i / heightSegments;
    const t2 = (i + 1) / heightSegments;
    const y1 = t1 * shellHeight;
    const y2 = t2 * shellHeight;
    
    const r1 = (shellWidth / 2) * Math.sin(Math.PI * t1) * Math.pow(1 - t1, 0.3);
    const r2 = (shellWidth / 2) * Math.sin(Math.PI * t2) * Math.pow(1 - t2, 0.3);
    
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      if (r1 > 0.5 && r2 > 0.5) {
        const ox1 = r1 * Math.cos(theta1), oz1 = r1 * Math.sin(theta1);
        const ox2 = r1 * Math.cos(theta2), oz2 = r1 * Math.sin(theta2);
        const ox3 = r2 * Math.cos(theta1), oz3 = r2 * Math.sin(theta1);
        const ox4 = r2 * Math.cos(theta2), oz4 = r2 * Math.sin(theta2);
        
        const v1: [number, number, number] = [ox1, y1, oz1];
        const v2: [number, number, number] = [ox2, y1, oz2];
        const v3: [number, number, number] = [ox3, y2, oz3];
        const v4: [number, number, number] = [ox4, y2, oz4];
        
        triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
        triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
        
        const ir1 = Math.max(r1 - wallThickness, 0.5);
        const ir2 = Math.max(r2 - wallThickness, 0.5);
        
        const ix1 = ir1 * Math.cos(theta1), iz1 = ir1 * Math.sin(theta1);
        const ix2 = ir1 * Math.cos(theta2), iz2 = ir1 * Math.sin(theta2);
        const ix3 = ir2 * Math.cos(theta1), iz3 = ir2 * Math.sin(theta1);
        const ix4 = ir2 * Math.cos(theta2), iz4 = ir2 * Math.sin(theta2);
        
        const iv1: [number, number, number] = [ix1, y1, iz1];
        const iv2: [number, number, number] = [ix2, y1, iz2];
        const iv3: [number, number, number] = [ix3, y2, iz3];
        const iv4: [number, number, number] = [ix4, y2, iz4];
        
        triangles.push({ vertices: [iv1, iv3, iv2], normal: calculateNormal(iv1, iv3, iv2) });
        triangles.push({ vertices: [iv2, iv3, iv4], normal: calculateNormal(iv2, iv3, iv4) });
      }
    }
  }
  
  // Bottom cap for teardrop - uses same formula as first segment to match exactly
  // Use segment 1 (not 0) since segment 0 has radius ~0
  const capSegment = 1;
  const capT = capSegment / heightSegments;
  const capY = capT * shellHeight;
  const capOuterR = (shellWidth / 2) * Math.sin(Math.PI * capT) * Math.pow(1 - capT, 0.3);
  const capInnerR = Math.max(capOuterR - wallThickness, 0.5);
  
  if (capOuterR > 1 && capInnerR > 0.5) {
    for (let j = 0; j < radialSegments; j++) {
      const theta1 = (j / radialSegments) * Math.PI * 2;
      const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
      
      const ox1 = capOuterR * Math.cos(theta1), oz1 = capOuterR * Math.sin(theta1);
      const ox2 = capOuterR * Math.cos(theta2), oz2 = capOuterR * Math.sin(theta2);
      const ix1 = capInnerR * Math.cos(theta1), iz1 = capInnerR * Math.sin(theta1);
      const ix2 = capInnerR * Math.cos(theta2), iz2 = capInnerR * Math.sin(theta2);
      
      const bv1: [number, number, number] = [ox1, capY, oz1];
      const bv2: [number, number, number] = [ox2, capY, oz2];
      const bv3: [number, number, number] = [ix1, capY, iz1];
      const bv4: [number, number, number] = [ix2, capY, iz2];
      
      triangles.push({ vertices: [bv1, bv3, bv2], normal: [0, -1, 0] });
      triangles.push({ vertices: [bv2, bv3, bv4], normal: [0, -1, 0] });
    }
  }
  
  return triangles;
}

function generateFilamentChannel(settings: EggisonSettings): Triangle[] {
  const triangles: Triangle[] = [];
  const { shellHeight, shellWidth, wallThickness, filamentChannelDiameter } = settings;
  
  // Scale filament channel to fit inside shell
  // The inner shell radius at midpoint determines max filament width
  const innerWidth = shellWidth - wallThickness * 2;
  const maxFilamentRadius = innerWidth / 2 * 0.3; // Max 30% of inner radius
  const channelRadius = Math.min(filamentChannelDiameter / 2, maxFilamentRadius);
  
  // Channel height should stay well inside the shell
  const channelHeight = (shellHeight - wallThickness * 2) * 0.6;
  const channelStartY = wallThickness + 5; // Start above the base connection point
  const radialSegments = 16;
  
  for (let j = 0; j < radialSegments; j++) {
    const theta1 = (j / radialSegments) * Math.PI * 2;
    const theta2 = ((j + 1) / radialSegments) * Math.PI * 2;
    
    const x1 = channelRadius * Math.cos(theta1), z1 = channelRadius * Math.sin(theta1);
    const x2 = channelRadius * Math.cos(theta2), z2 = channelRadius * Math.sin(theta2);
    
    const v1: [number, number, number] = [x1, channelStartY, z1];
    const v2: [number, number, number] = [x2, channelStartY, z2];
    const v3: [number, number, number] = [x1, channelStartY + channelHeight, z1];
    const v4: [number, number, number] = [x2, channelStartY + channelHeight, z2];
    
    triangles.push({ vertices: [v1, v2, v3], normal: calculateNormal(v1, v2, v3) });
    triangles.push({ vertices: [v2, v4, v3], normal: calculateNormal(v2, v4, v3) });
    
    const bottom: [number, number, number] = [0, channelStartY, 0];
    triangles.push({ vertices: [bottom, v2, v1], normal: [0, -1, 0] });
    
    const top: [number, number, number] = [0, channelStartY + channelHeight, 0];
    triangles.push({ vertices: [top, v3, v4], normal: [0, 1, 0] });
  }
  
  return triangles;
}

function generateVaseModeOpenSCAD(settings: EggisonSettings): string {
  const threadType = settings.threadType || "iso";
  const spiralTwist = settings.spiralTwist || 180;
  const spiralRibs = settings.spiralRibCount || 6;
  const phiRibs = settings.phiRibsEnabled || false;
  
  const baseParams = {
    "E26": { dia: 26.5, threadPitch: 3.629 },
    "E27": { dia: 27, threadPitch: 3.629 },
    "E14": { dia: 14, threadPitch: 2.822 },
  };
  
  const base = baseParams[settings.baseType] || baseParams["E26"];
  
  let scad = `// ==========================================
//   EGGISON BULB - VASE ENGINE V12
//   Generated by SignCraft 3D
//   Mode: Vase (Continuous Spiral Printing)
// ==========================================

$fn = 80;

// --- SETTINGS ---
shell_height = ${settings.shellHeight};
shell_width = ${settings.shellWidth};
wall_thickness = ${settings.wallThickness};
base_height = ${settings.baseHeight};
base_dia = ${base.dia};
thread_pitch = ${base.threadPitch};
spiral_twist = ${spiralTwist};
spiral_ribs = ${spiralRibs};
phi_ribs = ${phiRibs ? 'true' : 'false'};
thread_type = "${threadType}";

// --- LOBULAR THREAD MODULE ---
// Hex-twist thread: stronger than ISO, prints in single line (no retractions)
module lobular_thread(h, d, pitch) {
    linear_extrude(height=h, twist=-360*(h/pitch))
    offset(r=1) circle(d=d, $fn=6);
}

// --- ISO THREAD MODULE ---
module iso_thread(od, h, pitch, internal=false) {
    tolerance = internal ? 0.4 : -0.2;
    linear_extrude(height=h, twist=-360*(h/pitch), slices=h*4)
    translate([(od/2) + tolerance, 0, 0])
    rotate([0, 0, 45]) square([1.2, 1.2], center=true);
}

// --- VASE SHELL ---
// Designed for "Spiralize Outer Contour" slicer setting
module vase_shell() {
    difference() {
        // Outer shell with spiral twist
        linear_extrude(height=shell_height, scale=0.4, twist=spiral_twist)
        offset(r=2) circle(d=shell_width, $fn=spiral_ribs > 0 ? spiral_ribs : 48);
        
        // Inner hollow
        translate([0, 0, -1])
        linear_extrude(height=shell_height+2, scale=0.4, twist=spiral_twist)
        offset(r=2-wall_thickness) circle(d=shell_width-wall_thickness*2, $fn=spiral_ribs > 0 ? spiral_ribs : 48);
    }
    
    // Base thread interface
    translate([0, 0, -base_height])
    if (thread_type == "lobular") {
        lobular_thread(base_height, base_dia, thread_pitch);
    } else {
        difference() {
            cylinder(h=base_height, d=base_dia);
            translate([0, 0, -1]) cylinder(h=base_height+2, d=base_dia-4);
        }
        iso_thread(base_dia-4, base_height, thread_pitch, false);
    }
}

// --- SPIRAL CHASSIS ---
// Prints as a "climbing vine" - continuous single line
module spiral_chassis() {
    linear_extrude(height=shell_height*0.8, twist=spiral_twist*2, slices=200)
    translate([shell_width*0.15, 0, 0])
    circle(r=3);
}

// --- PHI RIBS ---
// Golden angle (137.5°) decorative ribs on shell surface
module phi_ribs() {
    if (phi_ribs) {
        for(i=[0:137.5:3600]) {
            rotate([0, 0, i])
            translate([shell_width/2-1, 0, base_height])
            cylinder(h=shell_height*0.8, d=1.5);
        }
    }
}

// --- VASE BASE ---
// Accepts the threaded shell
module vase_base() {
    color("#333")
    difference() {
        union() {
            cylinder(h=base_height*1.2, d=base_dia+4);
            // Grip texture
            for(i=[0:30:360]) rotate([0, 0, i])
            translate([base_dia/2+2, 0, 5])
            cylinder(h=base_height*0.8, d=2);
        }
        // Threaded receiver
        translate([0, 0, 2]) {
            cylinder(h=base_height+5, d=base_dia+0.5);
            if (thread_type == "lobular") {
                lobular_thread(base_height, base_dia+0.8, thread_pitch);
            } else {
                iso_thread(base_dia, base_height, thread_pitch, true);
            }
        }
        // Wire channel
        translate([0, 0, -1]) cylinder(h=base_height*2, d=4);
    }
}

// --- RENDER ---
color("Orange", 0.7) vase_shell();
color("#222") translate([base_dia*2, 0, 0]) vase_base();
`;

  return scad;
}

export function generateEggisonBulb(settings: EggisonSettings): { [key: string]: Buffer } {
  const files: { [key: string]: Buffer } = {};
  
  // Always include OpenSCAD file for vase mode
  if (settings.shellMode === "vase") {
    const scadCode = generateVaseModeOpenSCAD(settings);
    files["eggison_vase_mode.scad"] = Buffer.from(scadCode, "utf-8");
  }
  
  if (settings.shellStyle === "split") {
    const bottomHalf = generateSplitEggHalf(settings, false);
    files["egg_bottom.stl"] = trianglesToSTL(bottomHalf);
    
    const topHalf = generateSplitEggHalf(settings, true);
    files["egg_top.stl"] = trianglesToSTL(topHalf);
  } else if (settings.shellStyle === "jar") {
    const jarTriangles = generateJarShell(settings);
    files["jar_shell.stl"] = trianglesToSTL(jarTriangles);
  } else if (settings.shellStyle === "teardrop") {
    const teardropTriangles = generateTeardropShell(settings);
    files["teardrop_shell.stl"] = trianglesToSTL(teardropTriangles);
  } else {
    const shellTriangles = generateEggShell(settings);
    files["egg_shell.stl"] = trianglesToSTL(shellTriangles);
  }
  
  const baseTriangles = generateScrewBase(settings);
  files[`screw_base_${settings.baseType}.stl`] = trianglesToSTL(baseTriangles);
  
  if (settings.includeTwistOffCap) {
    const capTriangles = generateTwistOffBatteryCap(settings);
    files["twist_off_battery_cap.stl"] = trianglesToSTL(capTriangles);
  }
  
  if (settings.includeGlasses) {
    const glassesTriangles = generateGlasses(settings);
    files["glasses.stl"] = trianglesToSTL(glassesTriangles);
  }
  
  if (settings.includeFeet) {
    const feetTriangles = generateFeet(settings);
    files["feet.stl"] = trianglesToSTL(feetTriangles);
  }
  
  if (settings.includeBatteryHolder) {
    const batteryTriangles = generateBatteryHolder(settings);
    files["battery_holder.stl"] = trianglesToSTL(batteryTriangles);
  }
  
  if (settings.includeFilamentChannel) {
    const channelTriangles = generateFilamentChannel(settings);
    files["filament_channel.stl"] = trianglesToSTL(channelTriangles);
  }
  
  return files;
}
