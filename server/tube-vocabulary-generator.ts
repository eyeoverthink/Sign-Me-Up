import type { 
  ModularTubeSettings, 
  ModularBackplateSettings,
  TubeVocabularySettings 
} from "@shared/schema";

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  normal: Vector3;
}

function calculateNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  const normal = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
  const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: normal.x / len, y: normal.y / len, z: normal.z / len };
}

function addTriangle(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3): void {
  triangles.push({ v1, v2, v3, normal: calculateNormal(v1, v2, v3) });
}

function addQuad(triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3, v4: Vector3): void {
  addTriangle(triangles, v1, v2, v3);
  addTriangle(triangles, v1, v3, v4);
}

function trianglesToBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  buffer.write("Binary STL - Tube Vocabulary", 0);
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    buffer.writeFloatLE(tri.normal.x, offset); offset += 4;
    buffer.writeFloatLE(tri.normal.y, offset); offset += 4;
    buffer.writeFloatLE(tri.normal.z, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v1.z, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v2.z, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.x, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.y, offset); offset += 4;
    buffer.writeFloatLE(tri.v3.z, offset); offset += 4;
    buffer.writeUInt16LE(0, offset); offset += 2;
  }
  return buffer;
}

interface RingPoints {
  outer: Vector3[];
  inner: Vector3[];
  center: Vector3;
}

interface HalfRingPoints {
  outer: Vector3[];
  inner: Vector3[];
  center: Vector3;
  leftEdgeOuter: Vector3;
  rightEdgeOuter: Vector3;
  leftEdgeInner: Vector3;
  rightEdgeInner: Vector3;
}

function getOrthonormalBasis(direction: Vector3): { right: Vector3; forward: Vector3 } {
  const up = Math.abs(direction.z) < 0.9 
    ? { x: 0, y: 0, z: 1 } 
    : { x: 1, y: 0, z: 0 };
  
  const right = {
    x: direction.y * up.z - direction.z * up.y,
    y: direction.z * up.x - direction.x * up.z,
    z: direction.x * up.y - direction.y * up.x,
  };
  const len1 = Math.sqrt(right.x ** 2 + right.y ** 2 + right.z ** 2);
  if (len1 > 0) {
    right.x /= len1; right.y /= len1; right.z /= len1;
  }
  
  const forward = {
    x: right.y * direction.z - right.z * direction.y,
    y: right.z * direction.x - right.x * direction.z,
    z: right.x * direction.y - right.y * direction.x,
  };
  
  return { right, forward };
}

function generateHalfRing(
  center: Vector3,
  direction: Vector3,
  outerRadius: number,
  innerRadius: number,
  segments: number,
  isTop: boolean
): HalfRingPoints {
  const outer: Vector3[] = [];
  const inner: Vector3[] = [];
  
  const { right, forward } = getOrthonormalBasis(direction);
  
  const startAngle = isTop ? 0 : Math.PI;
  const endAngle = isTop ? Math.PI : Math.PI * 2;
  const halfSegments = Math.ceil(segments / 2) + 1;
  
  for (let i = 0; i <= halfSegments; i++) {
    const t = i / halfSegments;
    const angle = startAngle + t * (endAngle - startAngle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    outer.push({
      x: center.x + (right.x * cos + forward.x * sin) * outerRadius,
      y: center.y + (right.y * cos + forward.y * sin) * outerRadius,
      z: center.z + (right.z * cos + forward.z * sin) * outerRadius,
    });
    
    if (innerRadius > 0) {
      inner.push({
        x: center.x + (right.x * cos + forward.x * sin) * innerRadius,
        y: center.y + (right.y * cos + forward.y * sin) * innerRadius,
        z: center.z + (right.z * cos + forward.z * sin) * innerRadius,
      });
    }
  }
  
  const leftEdgeOuter = outer[0];
  const rightEdgeOuter = outer[outer.length - 1];
  const leftEdgeInner = inner.length > 0 ? inner[0] : { ...center };
  const rightEdgeInner = inner.length > 0 ? inner[inner.length - 1] : { ...center };
  
  return { outer, inner, center, leftEdgeOuter, rightEdgeOuter, leftEdgeInner, rightEdgeInner };
}

function generateRing(
  center: Vector3,
  direction: Vector3,
  outerRadius: number,
  innerRadius: number,
  segments: number
): RingPoints {
  const outer: Vector3[] = [];
  const inner: Vector3[] = [];
  
  const { right, forward } = getOrthonormalBasis(direction);
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    outer.push({
      x: center.x + (right.x * cos + forward.x * sin) * outerRadius,
      y: center.y + (right.y * cos + forward.y * sin) * outerRadius,
      z: center.z + (right.z * cos + forward.z * sin) * outerRadius,
    });
    
    if (innerRadius > 0) {
      inner.push({
        x: center.x + (right.x * cos + forward.x * sin) * innerRadius,
        y: center.y + (right.y * cos + forward.y * sin) * innerRadius,
        z: center.z + (right.z * cos + forward.z * sin) * innerRadius,
      });
    }
  }
  
  return { outer, inner, center };
}

function generateHalfTube(
  rings: HalfRingPoints[],
  triangles: Triangle[],
  hollow: boolean
): void {
  for (let i = 0; i < rings.length - 1; i++) {
    const ring1 = rings[i];
    const ring2 = rings[i + 1];
    
    for (let s = 0; s < ring1.outer.length - 1; s++) {
      const o1a = ring1.outer[s];
      const o1b = ring1.outer[s + 1];
      const o2a = ring2.outer[s];
      const o2b = ring2.outer[s + 1];
      
      addQuad(triangles, o1a, o1b, o2b, o2a);
      
      if (hollow && ring1.inner.length > s + 1 && ring2.inner.length > s + 1) {
        const i1a = ring1.inner[s];
        const i1b = ring1.inner[s + 1];
        const i2a = ring2.inner[s];
        const i2b = ring2.inner[s + 1];
        
        addQuad(triangles, i1b, i1a, i2a, i2b);
      }
    }
    
    addQuad(triangles,
      ring1.leftEdgeOuter, ring2.leftEdgeOuter,
      ring2.leftEdgeInner, ring1.leftEdgeInner
    );
    addQuad(triangles,
      ring1.rightEdgeInner, ring2.rightEdgeInner,
      ring2.rightEdgeOuter, ring1.rightEdgeOuter
    );
  }
}

function connectRings(
  ring1: RingPoints,
  ring2: RingPoints,
  triangles: Triangle[],
  hollow: boolean
): void {
  const segments = ring1.outer.length;
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    addQuad(triangles,
      ring1.outer[i], ring1.outer[next],
      ring2.outer[next], ring2.outer[i]
    );
    
    if (hollow && ring1.inner.length > 0 && ring2.inner.length > 0) {
      addQuad(triangles,
        ring1.inner[next], ring1.inner[i],
        ring2.inner[i], ring2.inner[next]
      );
    }
  }
}

function capRing(ring: RingPoints, triangles: Triangle[], hollow: boolean, invert: boolean): void {
  const segments = ring.outer.length;
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    
    if (hollow && ring.inner.length > 0) {
      if (invert) {
        addQuad(triangles, ring.outer[next], ring.outer[i], ring.inner[i], ring.inner[next]);
      } else {
        addQuad(triangles, ring.outer[i], ring.outer[next], ring.inner[next], ring.inner[i]);
      }
    } else {
      if (invert) {
        addTriangle(triangles, ring.center, ring.outer[next], ring.outer[i]);
      } else {
        addTriangle(triangles, ring.center, ring.outer[i], ring.outer[next]);
      }
    }
  }
}

function capHalfRing(ring: HalfRingPoints, triangles: Triangle[], hollow: boolean, invert: boolean): void {
  for (let i = 0; i < ring.outer.length - 1; i++) {
    const o0 = ring.outer[i];
    const o1 = ring.outer[i + 1];
    
    if (hollow && ring.inner.length > i + 1) {
      const i0 = ring.inner[i];
      const i1 = ring.inner[i + 1];
      if (invert) {
        addQuad(triangles, o1, o0, i0, i1);
      } else {
        addQuad(triangles, o0, o1, i1, i0);
      }
    } else {
      if (invert) {
        addTriangle(triangles, ring.center, o1, o0);
      } else {
        addTriangle(triangles, ring.center, o0, o1);
      }
    }
  }
}

export function generateStraightSegment(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const outerRadius = settings.tubeDiameter / 2;
  const innerRadius = outerRadius - settings.wallThickness;
  const length = settings.straightLength;
  const segments = 16;
  const hollow = innerRadius > 0;
  
  const numRings = Math.max(2, Math.ceil(length / 10));
  
  if (settings.splitHalf) {
    const topRings: HalfRingPoints[] = [];
    const bottomRings: HalfRingPoints[] = [];
    
    for (let i = 0; i <= numRings; i++) {
      const t = i / numRings;
      const center: Vector3 = { x: t * length, y: 0, z: 0 };
      const direction: Vector3 = { x: 1, y: 0, z: 0 };
      topRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      bottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    generateHalfTube(topRings, topTriangles, hollow);
    generateHalfTube(bottomRings, bottomTriangles, hollow);
    
    capHalfRing(topRings[0], topTriangles, hollow, true);
    capHalfRing(topRings[topRings.length - 1], topTriangles, hollow, false);
    capHalfRing(bottomRings[0], bottomTriangles, hollow, true);
    capHalfRing(bottomRings[bottomRings.length - 1], bottomTriangles, hollow, false);
    
    return {
      top: trianglesToBinarySTL(topTriangles),
      bottom: trianglesToBinarySTL(bottomTriangles),
    };
  }
  
  const rings: RingPoints[] = [];
  
  for (let i = 0; i <= numRings; i++) {
    const t = i / numRings;
    const center: Vector3 = { x: t * length, y: 0, z: 0 };
    const direction: Vector3 = { x: 1, y: 0, z: 0 };
    rings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i < rings.length - 1; i++) {
    connectRings(rings[i], rings[i + 1], topTriangles, hollow);
  }
  
  capRing(rings[0], topTriangles, hollow, true);
  capRing(rings[rings.length - 1], topTriangles, hollow, false);
  
  return {
    top: trianglesToBinarySTL(topTriangles),
    bottom: trianglesToBinarySTL(bottomTriangles),
  };
}

export function generateAngleConnector(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const outerRadius = settings.tubeDiameter / 2;
  const innerRadius = outerRadius - settings.wallThickness;
  const armLength = settings.angleArmLength;
  const angleDeg = settings.angleDegrees;
  const angleRad = (angleDeg * Math.PI) / 180;
  const segments = 16;
  const hollow = innerRadius > 0;
  const numRingsPerArm = Math.max(2, Math.ceil(armLength / 5));
  
  if (settings.splitHalf) {
    const topRings: HalfRingPoints[] = [];
    const bottomRings: HalfRingPoints[] = [];
    
    for (let i = 0; i <= numRingsPerArm; i++) {
      const t = i / numRingsPerArm;
      const x = -armLength + t * armLength;
      const center: Vector3 = { x, y: 0, z: 0 };
      const direction: Vector3 = { x: 1, y: 0, z: 0 };
      topRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      bottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    for (let i = 0; i <= numRingsPerArm; i++) {
      const t = i / numRingsPerArm;
      const dist = t * armLength;
      const x = Math.cos(angleRad) * dist;
      const y = Math.sin(angleRad) * dist;
      const center: Vector3 = { x, y, z: 0 };
      const direction: Vector3 = { x: Math.cos(angleRad), y: Math.sin(angleRad), z: 0 };
      if (i > 0) {
        topRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
        bottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
      }
    }
    
    generateHalfTube(topRings, topTriangles, hollow);
    generateHalfTube(bottomRings, bottomTriangles, hollow);
    
    capHalfRing(topRings[0], topTriangles, hollow, true);
    capHalfRing(topRings[topRings.length - 1], topTriangles, hollow, false);
    capHalfRing(bottomRings[0], bottomTriangles, hollow, true);
    capHalfRing(bottomRings[bottomRings.length - 1], bottomTriangles, hollow, false);
    
    return {
      top: trianglesToBinarySTL(topTriangles),
      bottom: trianglesToBinarySTL(bottomTriangles),
    };
  }
  
  const arm1Rings: RingPoints[] = [];
  const arm2Rings: RingPoints[] = [];
  
  for (let i = 0; i <= numRingsPerArm; i++) {
    const t = i / numRingsPerArm;
    const x = -armLength + t * armLength;
    const center: Vector3 = { x, y: 0, z: 0 };
    const direction: Vector3 = { x: 1, y: 0, z: 0 };
    arm1Rings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i <= numRingsPerArm; i++) {
    const t = i / numRingsPerArm;
    const dist = t * armLength;
    const x = Math.cos(angleRad) * dist;
    const y = Math.sin(angleRad) * dist;
    const center: Vector3 = { x, y, z: 0 };
    const direction: Vector3 = { x: Math.cos(angleRad), y: Math.sin(angleRad), z: 0 };
    arm2Rings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  const allRings = [...arm1Rings, ...arm2Rings.slice(1)];
  
  for (let i = 0; i < allRings.length - 1; i++) {
    connectRings(allRings[i], allRings[i + 1], topTriangles, hollow);
  }
  
  capRing(allRings[0], topTriangles, hollow, true);
  capRing(allRings[allRings.length - 1], topTriangles, hollow, false);
  
  return {
    top: trianglesToBinarySTL(topTriangles),
    bottom: trianglesToBinarySTL(bottomTriangles),
  };
}

export function generateCurveSegment(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const outerRadius = settings.tubeDiameter / 2;
  const innerRadius = outerRadius - settings.wallThickness;
  const curveRadius = settings.curveRadius;
  const curveAngleDeg = settings.curveAngle;
  const curveAngleRad = (curveAngleDeg * Math.PI) / 180;
  const segments = 16;
  const hollow = innerRadius > 0;
  const numRings = Math.max(4, Math.ceil(curveAngleDeg / 10));
  
  if (settings.splitHalf) {
    const topRings: HalfRingPoints[] = [];
    const bottomRings: HalfRingPoints[] = [];
    
    for (let i = 0; i <= numRings; i++) {
      const t = i / numRings;
      const angle = t * curveAngleRad;
      
      const x = curveRadius * Math.sin(angle);
      const y = curveRadius * (1 - Math.cos(angle));
      const center: Vector3 = { x, y, z: 0 };
      
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const direction: Vector3 = { x: dx, y: dy, z: 0 };
      
      topRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      bottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    generateHalfTube(topRings, topTriangles, hollow);
    generateHalfTube(bottomRings, bottomTriangles, hollow);
    
    capHalfRing(topRings[0], topTriangles, hollow, true);
    capHalfRing(topRings[topRings.length - 1], topTriangles, hollow, false);
    capHalfRing(bottomRings[0], bottomTriangles, hollow, true);
    capHalfRing(bottomRings[bottomRings.length - 1], bottomTriangles, hollow, false);
    
    return {
      top: trianglesToBinarySTL(topTriangles),
      bottom: trianglesToBinarySTL(bottomTriangles),
    };
  }
  
  const rings: RingPoints[] = [];
  
  for (let i = 0; i <= numRings; i++) {
    const t = i / numRings;
    const angle = t * curveAngleRad;
    
    const x = curveRadius * Math.sin(angle);
    const y = curveRadius * (1 - Math.cos(angle));
    const center: Vector3 = { x, y, z: 0 };
    
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const direction: Vector3 = { x: dx, y: dy, z: 0 };
    
    rings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i < rings.length - 1; i++) {
    connectRings(rings[i], rings[i + 1], topTriangles, hollow);
  }
  
  capRing(rings[0], topTriangles, hollow, true);
  capRing(rings[rings.length - 1], topTriangles, hollow, false);
  
  return {
    top: trianglesToBinarySTL(topTriangles),
    bottom: trianglesToBinarySTL(bottomTriangles),
  };
}

export function generateEndCap(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const outerRadius = settings.tubeDiameter / 2;
  const segments = 16;
  const capLength = outerRadius;
  
  if (settings.splitHalf) {
    const topRings: HalfRingPoints[] = [];
    const bottomRings: HalfRingPoints[] = [];
    
    topRings.push(generateHalfRing(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      outerRadius, 0, segments, true
    ));
    bottomRings.push(generateHalfRing(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      outerRadius, 0, segments, false
    ));
    
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const angle = (t * Math.PI) / 2;
      const r = Math.max(outerRadius * Math.cos(angle), 0.1);
      const x = capLength * Math.sin(angle);
      
      topRings.push(generateHalfRing({ x, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, r, 0, segments, true));
      bottomRings.push(generateHalfRing({ x, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, r, 0, segments, false));
    }
    
    generateHalfTube(topRings, topTriangles, false);
    generateHalfTube(bottomRings, bottomTriangles, false);
    
    // Leave first ring OPEN for connecting to tubes
    // Close the tip (last ring) to seal the dome
    capHalfRing(topRings[topRings.length - 1], topTriangles, false, false);
    capHalfRing(bottomRings[bottomRings.length - 1], bottomTriangles, false, false);
    
    return {
      top: trianglesToBinarySTL(topTriangles),
      bottom: trianglesToBinarySTL(bottomTriangles),
    };
  }
  
  const rings: RingPoints[] = [];
  
  rings.push(generateRing({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, outerRadius, 0, segments));
  
  for (let i = 1; i <= 4; i++) {
    const t = i / 4;
    const angle = (t * Math.PI) / 2;
    const r = Math.max(outerRadius * Math.cos(angle), 0.1);
    const x = capLength * Math.sin(angle);
    
    rings.push(generateRing({ x, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, r, 0, segments));
  }
  
  for (let i = 0; i < rings.length - 1; i++) {
    connectRings(rings[i], rings[i + 1], topTriangles, false);
  }
  
  // Leave first ring open, close the tip
  capRing(rings[rings.length - 1], topTriangles, false, false);
  
  return {
    top: trianglesToBinarySTL(topTriangles),
    bottom: trianglesToBinarySTL(bottomTriangles),
  };
}

export function generateYSplitter(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  const topTriangles: Triangle[] = [];
  const bottomTriangles: Triangle[] = [];
  
  const outerRadius = settings.tubeDiameter / 2;
  const innerRadius = outerRadius - settings.wallThickness;
  const armLength = settings.splitArmLength;
  const splitAngleDeg = settings.splitAngle;
  const halfAngleRad = (splitAngleDeg / 2 * Math.PI) / 180;
  const segments = 16;
  const hollow = innerRadius > 0;
  const numRingsPerArm = Math.max(2, Math.ceil(armLength / 5));
  
  if (settings.splitHalf) {
    const mainTopRings: HalfRingPoints[] = [];
    const mainBottomRings: HalfRingPoints[] = [];
    const leftTopRings: HalfRingPoints[] = [];
    const leftBottomRings: HalfRingPoints[] = [];
    const rightTopRings: HalfRingPoints[] = [];
    const rightBottomRings: HalfRingPoints[] = [];
    
    for (let i = 0; i <= numRingsPerArm; i++) {
      const t = i / numRingsPerArm;
      const x = -armLength + t * armLength;
      const center: Vector3 = { x, y: 0, z: 0 };
      const direction: Vector3 = { x: 1, y: 0, z: 0 };
      mainTopRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      mainBottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    for (let i = 0; i <= numRingsPerArm; i++) {
      const t = i / numRingsPerArm;
      const dist = t * armLength;
      const x = Math.cos(halfAngleRad) * dist;
      const y = Math.sin(halfAngleRad) * dist;
      const center: Vector3 = { x, y, z: 0 };
      const direction: Vector3 = { x: Math.cos(halfAngleRad), y: Math.sin(halfAngleRad), z: 0 };
      leftTopRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      leftBottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    for (let i = 0; i <= numRingsPerArm; i++) {
      const t = i / numRingsPerArm;
      const dist = t * armLength;
      const x = Math.cos(-halfAngleRad) * dist;
      const y = Math.sin(-halfAngleRad) * dist;
      const center: Vector3 = { x, y, z: 0 };
      const direction: Vector3 = { x: Math.cos(-halfAngleRad), y: Math.sin(-halfAngleRad), z: 0 };
      rightTopRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, true));
      rightBottomRings.push(generateHalfRing(center, direction, outerRadius, innerRadius, segments, false));
    }
    
    generateHalfTube(mainTopRings, topTriangles, hollow);
    generateHalfTube(mainBottomRings, bottomTriangles, hollow);
    generateHalfTube(leftTopRings, topTriangles, hollow);
    generateHalfTube(leftBottomRings, bottomTriangles, hollow);
    generateHalfTube(rightTopRings, topTriangles, hollow);
    generateHalfTube(rightBottomRings, bottomTriangles, hollow);
    
    capHalfRing(mainTopRings[0], topTriangles, hollow, true);
    capHalfRing(mainBottomRings[0], bottomTriangles, hollow, true);
    capHalfRing(leftTopRings[leftTopRings.length - 1], topTriangles, hollow, false);
    capHalfRing(leftBottomRings[leftBottomRings.length - 1], bottomTriangles, hollow, false);
    capHalfRing(rightTopRings[rightTopRings.length - 1], topTriangles, hollow, false);
    capHalfRing(rightBottomRings[rightBottomRings.length - 1], bottomTriangles, hollow, false);
    
    return {
      top: trianglesToBinarySTL(topTriangles),
      bottom: trianglesToBinarySTL(bottomTriangles),
    };
  }
  
  const mainArmRings: RingPoints[] = [];
  const leftArmRings: RingPoints[] = [];
  const rightArmRings: RingPoints[] = [];
  
  for (let i = 0; i <= numRingsPerArm; i++) {
    const t = i / numRingsPerArm;
    const x = -armLength + t * armLength;
    const center: Vector3 = { x, y: 0, z: 0 };
    const direction: Vector3 = { x: 1, y: 0, z: 0 };
    mainArmRings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i <= numRingsPerArm; i++) {
    const t = i / numRingsPerArm;
    const dist = t * armLength;
    const x = Math.cos(halfAngleRad) * dist;
    const y = Math.sin(halfAngleRad) * dist;
    const center: Vector3 = { x, y, z: 0 };
    const direction: Vector3 = { x: Math.cos(halfAngleRad), y: Math.sin(halfAngleRad), z: 0 };
    leftArmRings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i <= numRingsPerArm; i++) {
    const t = i / numRingsPerArm;
    const dist = t * armLength;
    const x = Math.cos(-halfAngleRad) * dist;
    const y = Math.sin(-halfAngleRad) * dist;
    const center: Vector3 = { x, y, z: 0 };
    const direction: Vector3 = { x: Math.cos(-halfAngleRad), y: Math.sin(-halfAngleRad), z: 0 };
    rightArmRings.push(generateRing(center, direction, outerRadius, innerRadius, segments));
  }
  
  for (let i = 0; i < mainArmRings.length - 1; i++) {
    connectRings(mainArmRings[i], mainArmRings[i + 1], topTriangles, hollow);
  }
  for (let i = 0; i < leftArmRings.length - 1; i++) {
    connectRings(leftArmRings[i], leftArmRings[i + 1], topTriangles, hollow);
  }
  for (let i = 0; i < rightArmRings.length - 1; i++) {
    connectRings(rightArmRings[i], rightArmRings[i + 1], topTriangles, hollow);
  }
  
  capRing(mainArmRings[0], topTriangles, hollow, true);
  capRing(leftArmRings[leftArmRings.length - 1], topTriangles, hollow, false);
  capRing(rightArmRings[rightArmRings.length - 1], topTriangles, hollow, false);
  
  return {
    top: trianglesToBinarySTL(topTriangles),
    bottom: trianglesToBinarySTL(bottomTriangles),
  };
}

export function generateBackplate(settings: ModularBackplateSettings): { plate: Buffer; ledHoles?: Vector3[] } {
  const triangles: Triangle[] = [];
  
  const w = settings.width;
  const h = settings.height;
  const t = settings.thickness;
  
  const hw = w / 2;
  const hh = h / 2;
  
  addQuad(triangles,
    { x: -hw, y: -hh, z: t },
    { x: hw, y: -hh, z: t },
    { x: hw, y: hh, z: t },
    { x: -hw, y: hh, z: t }
  );
  
  addQuad(triangles,
    { x: -hw, y: hh, z: 0 },
    { x: hw, y: hh, z: 0 },
    { x: hw, y: -hh, z: 0 },
    { x: -hw, y: -hh, z: 0 }
  );
  
  addQuad(triangles,
    { x: -hw, y: -hh, z: 0 },
    { x: hw, y: -hh, z: 0 },
    { x: hw, y: -hh, z: t },
    { x: -hw, y: -hh, z: t }
  );
  addQuad(triangles,
    { x: hw, y: hh, z: 0 },
    { x: -hw, y: hh, z: 0 },
    { x: -hw, y: hh, z: t },
    { x: hw, y: hh, z: t }
  );
  addQuad(triangles,
    { x: -hw, y: hh, z: 0 },
    { x: -hw, y: -hh, z: 0 },
    { x: -hw, y: -hh, z: t },
    { x: -hw, y: hh, z: t }
  );
  addQuad(triangles,
    { x: hw, y: -hh, z: 0 },
    { x: hw, y: hh, z: 0 },
    { x: hw, y: hh, z: t },
    { x: hw, y: -hh, z: t }
  );
  
  const ledHoles: Vector3[] = [];
  
  if (settings.uvLedHoles) {
    const ledRadius = settings.ledHoleDiameter / 2;
    const spacing = settings.ledHoleSpacing;
    
    if (settings.ledHolePattern === "perimeter") {
      const margin = 15;
      for (let x = -hw + margin; x <= hw - margin; x += spacing) {
        ledHoles.push({ x, y: -hh + margin, z: 0 });
        ledHoles.push({ x, y: hh - margin, z: 0 });
      }
      for (let y = -hh + margin + spacing; y <= hh - margin - spacing; y += spacing) {
        ledHoles.push({ x: -hw + margin, y, z: 0 });
        ledHoles.push({ x: hw - margin, y, z: 0 });
      }
    } else if (settings.ledHolePattern === "grid") {
      const margin = 15;
      for (let x = -hw + margin; x <= hw - margin; x += spacing) {
        for (let y = -hh + margin; y <= hh - margin; y += spacing) {
          ledHoles.push({ x, y, z: 0 });
        }
      }
    }
  }
  
  if (settings.mountHoles) {
    const holeRadius = settings.mountHoleDiameter / 2;
    const margin = 10;
    const holes = [
      { x: -hw + margin, y: hh - margin },
      { x: hw - margin, y: hh - margin },
    ];
    
    for (const hole of holes) {
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const c1 = Math.cos(a1);
        const s1 = Math.sin(a1);
        const c2 = Math.cos(a2);
        const s2 = Math.sin(a2);
        
        addQuad(triangles,
          { x: hole.x + c1 * holeRadius, y: hole.y + s1 * holeRadius, z: 0 },
          { x: hole.x + c2 * holeRadius, y: hole.y + s2 * holeRadius, z: 0 },
          { x: hole.x + c2 * holeRadius, y: hole.y + s2 * holeRadius, z: t },
          { x: hole.x + c1 * holeRadius, y: hole.y + s1 * holeRadius, z: t }
        );
      }
    }
  }
  
  return {
    plate: trianglesToBinarySTL(triangles),
    ledHoles,
  };
}

export function generateTubeComponent(settings: ModularTubeSettings): { top: Buffer; bottom: Buffer } {
  switch (settings.componentType) {
    case "straight":
      return generateStraightSegment(settings);
    case "angle":
      return generateAngleConnector(settings);
    case "curve":
      return generateCurveSegment(settings);
    case "ysplit":
      return generateYSplitter(settings);
    case "endcap":
      return generateEndCap(settings);
    default:
      return generateStraightSegment(settings);
  }
}

export function generateTubeVocabularyKit(settings: TubeVocabularySettings): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  
  const baseSettings = settings.tube;
  
  if (settings.exportStraights) {
    for (const length of settings.straightLengths) {
      const tubeSettings = { ...baseSettings, componentType: "straight" as const, straightLength: length };
      const { top, bottom } = generateStraightSegment(tubeSettings);
      files.set(`straight_${length}mm_top.stl`, top);
      files.set(`straight_${length}mm_bottom.stl`, bottom);
    }
  }
  
  if (settings.exportAngles) {
    for (const angle of settings.anglesList) {
      const tubeSettings = { ...baseSettings, componentType: "angle" as const, angleDegrees: angle };
      const { top, bottom } = generateAngleConnector(tubeSettings);
      files.set(`angle_${angle}deg_top.stl`, top);
      files.set(`angle_${angle}deg_bottom.stl`, bottom);
    }
  }
  
  if (settings.exportCurves) {
    for (const radius of settings.curveRadii) {
      const tubeSettings = { ...baseSettings, componentType: "curve" as const, curveRadius: radius };
      const { top, bottom } = generateCurveSegment(tubeSettings);
      files.set(`curve_r${radius}mm_top.stl`, top);
      files.set(`curve_r${radius}mm_bottom.stl`, bottom);
    }
  }
  
  if (settings.exportSplitters) {
    const { top, bottom } = generateYSplitter(baseSettings);
    files.set(`ysplitter_top.stl`, top);
    files.set(`ysplitter_bottom.stl`, bottom);
  }
  
  if (settings.exportEndCaps) {
    const { top, bottom } = generateEndCap(baseSettings);
    files.set(`endcap_top.stl`, top);
    files.set(`endcap_bottom.stl`, bottom);
  }
  
  if (settings.backplate.enabled) {
    const { plate } = generateBackplate(settings.backplate);
    const materialSuffix = settings.backplate.glowInDark ? "_glow" : "";
    files.set(`backplate${materialSuffix}.stl`, plate);
  }
  
  return files;
}
