/**
 * UNIVERSE 3D GENERATOR
 * Creates 3D printable celestial bodies with real astronomical data
 * Supports: Planets, Moons, Stars, Constellations
 * Output: STL, OBJ with lithophane or topographical detail
 */

// Real planetary data from NASA
const CELESTIAL_BODIES = {
  sun: {
    name: "Sun",
    type: "star",
    radius: 696340, // km
    color: "#FDB813",
    texture: "solar_surface",
    description: "Our home star"
  },
  mercury: {
    name: "Mercury",
    type: "planet",
    radius: 2439.7,
    orbitalRadius: 57.9, // million km
    color: "#B5B5B5",
    texture: "cratered",
    description: "Smallest planet, closest to Sun"
  },
  venus: {
    name: "Venus",
    type: "planet",
    radius: 6051.8,
    orbitalRadius: 108.2,
    color: "#E6E6AA",
    texture: "cloudy",
    description: "Earth's twin, shrouded in clouds"
  },
  earth: {
    name: "Earth",
    type: "planet",
    radius: 6371,
    orbitalRadius: 149.6,
    color: "#6B93D6",
    texture: "terrain",
    hasOceans: true,
    description: "Our home world"
  },
  moon: {
    name: "Moon",
    type: "moon",
    parent: "earth",
    radius: 1737.4,
    orbitalRadius: 0.384, // million km from Earth
    color: "#C4C4C4",
    texture: "cratered",
    description: "Earth's natural satellite"
  },
  mars: {
    name: "Mars",
    type: "planet",
    radius: 3389.5,
    orbitalRadius: 227.9,
    color: "#C1440E",
    texture: "terrain",
    description: "The Red Planet"
  },
  jupiter: {
    name: "Jupiter",
    type: "planet",
    radius: 69911,
    orbitalRadius: 778.5,
    color: "#D8CA9D",
    texture: "banded",
    hasGreatRedSpot: true,
    description: "Largest planet, gas giant"
  },
  saturn: {
    name: "Saturn",
    type: "planet",
    radius: 58232,
    orbitalRadius: 1434,
    color: "#F4D59E",
    texture: "banded",
    hasRings: true,
    ringInnerRadius: 74500,
    ringOuterRadius: 140220,
    description: "The ringed planet"
  },
  uranus: {
    name: "Uranus",
    type: "planet",
    radius: 25362,
    orbitalRadius: 2871,
    color: "#D1E7E7",
    texture: "smooth",
    axialTilt: 97.77,
    description: "Ice giant, tilted on its side"
  },
  neptune: {
    name: "Neptune",
    type: "planet",
    radius: 24622,
    orbitalRadius: 4495,
    color: "#5B5DDF",
    texture: "stormy",
    description: "Distant ice giant"
  },
  pluto: {
    name: "Pluto",
    type: "dwarf",
    radius: 1188.3,
    orbitalRadius: 5906,
    color: "#E8D4B8",
    texture: "icy",
    description: "Dwarf planet in the Kuiper Belt"
  }
};

// Major constellations with star positions
const CONSTELLATIONS = {
  orion: {
    name: "Orion",
    description: "The Hunter",
    stars: [
      { name: "Betelgeuse", ra: 88.79, dec: 7.41, magnitude: 0.42, color: "#FF6B35" },
      { name: "Rigel", ra: 78.63, dec: -8.20, magnitude: 0.13, color: "#A0C4FF" },
      { name: "Bellatrix", ra: 81.28, dec: 6.35, magnitude: 1.64, color: "#B8D4E3" },
      { name: "Mintaka", ra: 83.00, dec: -0.30, magnitude: 2.23, color: "#B8D4E3" },
      { name: "Alnilam", ra: 84.05, dec: -1.20, magnitude: 1.70, color: "#B8D4E3" },
      { name: "Alnitak", ra: 85.19, dec: -1.94, magnitude: 1.77, color: "#B8D4E3" },
      { name: "Saiph", ra: 86.94, dec: -9.67, magnitude: 2.09, color: "#B8D4E3" }
    ],
    lines: [[0,2], [2,3], [3,4], [4,5], [5,6], [6,1], [1,5], [0,4]]
  },
  ursa_major: {
    name: "Ursa Major",
    description: "The Great Bear (Big Dipper)",
    stars: [
      { name: "Dubhe", ra: 165.93, dec: 61.75, magnitude: 1.79, color: "#FFCC80" },
      { name: "Merak", ra: 165.46, dec: 56.38, magnitude: 2.37, color: "#FFFFFF" },
      { name: "Phecda", ra: 178.46, dec: 53.69, magnitude: 2.44, color: "#FFFFFF" },
      { name: "Megrez", ra: 183.86, dec: 57.03, magnitude: 3.31, color: "#FFFFFF" },
      { name: "Alioth", ra: 193.51, dec: 55.96, magnitude: 1.77, color: "#FFFFFF" },
      { name: "Mizar", ra: 200.98, dec: 54.93, magnitude: 2.27, color: "#FFFFFF" },
      { name: "Alkaid", ra: 206.89, dec: 49.31, magnitude: 1.86, color: "#B8D4E3" }
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6]]
  },
  cassiopeia: {
    name: "Cassiopeia",
    description: "The Queen",
    stars: [
      { name: "Schedar", ra: 10.13, dec: 56.54, magnitude: 2.24, color: "#FFCC80" },
      { name: "Caph", ra: 2.29, dec: 59.15, magnitude: 2.28, color: "#FFFFFF" },
      { name: "Gamma Cas", ra: 14.18, dec: 60.72, magnitude: 2.47, color: "#B8D4E3" },
      { name: "Ruchbah", ra: 21.45, dec: 60.24, magnitude: 2.68, color: "#FFFFFF" },
      { name: "Segin", ra: 28.60, dec: 63.67, magnitude: 3.37, color: "#B8D4E3" }
    ],
    lines: [[0,1], [0,2], [2,3], [3,4]]
  },
  scorpius: {
    name: "Scorpius",
    description: "The Scorpion",
    stars: [
      { name: "Antares", ra: 247.35, dec: -26.43, magnitude: 0.96, color: "#FF6B35" },
      { name: "Shaula", ra: 263.40, dec: -37.10, magnitude: 1.63, color: "#B8D4E3" },
      { name: "Sargas", ra: 264.33, dec: -42.99, magnitude: 1.87, color: "#FFFFFF" },
      { name: "Dschubba", ra: 240.08, dec: -22.62, magnitude: 2.32, color: "#B8D4E3" },
      { name: "Acrab", ra: 241.36, dec: -19.81, magnitude: 2.64, color: "#B8D4E3" }
    ],
    lines: [[4,3], [3,0], [0,1], [1,2]]
  },
  leo: {
    name: "Leo",
    description: "The Lion",
    stars: [
      { name: "Regulus", ra: 152.09, dec: 11.97, magnitude: 1.40, color: "#B8D4E3" },
      { name: "Denebola", ra: 177.27, dec: 14.57, magnitude: 2.14, color: "#FFFFFF" },
      { name: "Algieba", ra: 146.46, dec: 19.84, magnitude: 2.08, color: "#FFCC80" },
      { name: "Zosma", ra: 168.53, dec: 20.52, magnitude: 2.56, color: "#FFFFFF" },
      { name: "Chertan", ra: 168.56, dec: 15.43, magnitude: 3.34, color: "#FFFFFF" }
    ],
    lines: [[0,2], [2,3], [3,1], [3,4], [4,0]]
  }
};

// φ golden ratio for harmonic proportions
const PHI = 1.618033988749895;

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Point3D;
  v2: Point3D;
  v3: Point3D;
  normal: Point3D;
}

function calculateNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
  const n = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x
  };
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  return { x: n.x / len, y: n.y / len, z: n.z / len };
}

// Generate sphere with surface detail
function generateSphere(
  radius: number,
  segments: number = 64,
  surfaceFunc?: (theta: number, phi: number) => number
): Triangle[] {
  const triangles: Triangle[] = [];
  
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments * 2; j++) {
      const theta1 = (i / segments) * Math.PI;
      const theta2 = ((i + 1) / segments) * Math.PI;
      const phi1 = (j / (segments * 2)) * Math.PI * 2;
      const phi2 = ((j + 1) / (segments * 2)) * Math.PI * 2;
      
      const getPoint = (theta: number, phi: number): Point3D => {
        let r = radius;
        if (surfaceFunc) {
          r += surfaceFunc(theta, phi);
        }
        return {
          x: r * Math.sin(theta) * Math.cos(phi),
          y: r * Math.sin(theta) * Math.sin(phi),
          z: r * Math.cos(theta)
        };
      };
      
      const p1 = getPoint(theta1, phi1);
      const p2 = getPoint(theta1, phi2);
      const p3 = getPoint(theta2, phi1);
      const p4 = getPoint(theta2, phi2);
      
      // First triangle
      const n1 = calculateNormal(p1, p2, p3);
      triangles.push({ v1: p1, v2: p2, v3: p3, normal: n1 });
      
      // Second triangle
      const n2 = calculateNormal(p2, p4, p3);
      triangles.push({ v1: p2, v2: p4, v3: p3, normal: n2 });
    }
  }
  
  return triangles;
}

// Generate rings (for Saturn) - Full 3D printable ring with proper thickness
function generateRings(
  innerRadius: number,
  outerRadius: number,
  thickness: number = 1.5,
  segments: number = 128,
  ringGaps: boolean = true
): Triangle[] {
  const triangles: Triangle[] = [];
  
  // Create multiple concentric rings with gaps (like Saturn's actual rings)
  const ringBands = ringGaps ? [
    { inner: innerRadius, outer: innerRadius + (outerRadius - innerRadius) * 0.15 }, // C Ring
    { inner: innerRadius + (outerRadius - innerRadius) * 0.2, outer: innerRadius + (outerRadius - innerRadius) * 0.55 }, // B Ring
    { inner: innerRadius + (outerRadius - innerRadius) * 0.6, outer: outerRadius }, // A Ring
  ] : [
    { inner: innerRadius, outer: outerRadius }
  ];
  
  for (const band of ringBands) {
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2);
      const sin2 = Math.sin(angle2);
      
      // Top surface
      const t1 = { x: band.inner * cos1, y: band.inner * sin1, z: thickness / 2 };
      const t2 = { x: band.outer * cos1, y: band.outer * sin1, z: thickness / 2 };
      const t3 = { x: band.inner * cos2, y: band.inner * sin2, z: thickness / 2 };
      const t4 = { x: band.outer * cos2, y: band.outer * sin2, z: thickness / 2 };
      
      triangles.push({ v1: t1, v2: t2, v3: t3, normal: { x: 0, y: 0, z: 1 } });
      triangles.push({ v1: t2, v2: t4, v3: t3, normal: { x: 0, y: 0, z: 1 } });
      
      // Bottom surface
      const b1 = { x: band.inner * cos1, y: band.inner * sin1, z: -thickness / 2 };
      const b2 = { x: band.outer * cos1, y: band.outer * sin1, z: -thickness / 2 };
      const b3 = { x: band.inner * cos2, y: band.inner * sin2, z: -thickness / 2 };
      const b4 = { x: band.outer * cos2, y: band.outer * sin2, z: -thickness / 2 };
      
      triangles.push({ v1: b1, v2: b3, v3: b2, normal: { x: 0, y: 0, z: -1 } });
      triangles.push({ v1: b2, v2: b3, v3: b4, normal: { x: 0, y: 0, z: -1 } });
      
      // Inner edge (watertight)
      const nInner1 = { x: -cos1, y: -sin1, z: 0 };
      const nInner2 = { x: -cos2, y: -sin2, z: 0 };
      triangles.push({ v1: t1, v2: t3, v3: b1, normal: nInner1 });
      triangles.push({ v1: t3, v2: b3, v3: b1, normal: nInner2 });
      
      // Outer edge (watertight)
      const nOuter1 = { x: cos1, y: sin1, z: 0 };
      const nOuter2 = { x: cos2, y: sin2, z: 0 };
      triangles.push({ v1: t2, v2: b2, v3: t4, normal: nOuter1 });
      triangles.push({ v1: t4, v2: b2, v3: b4, normal: nOuter2 });
    }
  }
  
  return triangles;
}

// Surface detail generators - Enhanced for visible 3D print detail
const SURFACE_GENERATORS = {
  cratered: (theta: number, phi: number, amplitude: number = 1) => {
    // Procedural craters - more pronounced
    const n1 = Math.sin(theta * 15) * Math.cos(phi * 12);
    const n2 = Math.sin(theta * 23 + 1.3) * Math.cos(phi * 19 + 0.7);
    const n3 = Math.sin(theta * 7) * Math.cos(phi * 8);
    const crater1 = -Math.max(0, Math.sin(theta * 10) * Math.cos(phi * 8) - 0.5) * 2;
    const crater2 = -Math.max(0, Math.sin(theta * 6 + 2) * Math.cos(phi * 5 + 1) - 0.6) * 1.5;
    return ((n1 * 0.4 + n2 * 0.3 + n3 * 0.3) * 0.6 + crater1 * 0.25 + crater2 * 0.15) * amplitude;
  },
  
  terrain: (theta: number, phi: number, amplitude: number = 1) => {
    // Mountains and valleys - more dramatic terrain
    const mountains = Math.max(0, Math.sin(theta * 8) * Math.cos(phi * 10) - 0.2);
    const freq1 = Math.sin(theta * 8) * Math.cos(phi * 10);
    const freq2 = Math.sin(theta * 16 + 0.5) * Math.cos(phi * 20 + 1.2);
    const freq3 = Math.sin(theta * 32) * Math.cos(phi * 40);
    const valleys = Math.min(0, Math.sin(theta * 5 + 1) * Math.cos(phi * 6) + 0.3);
    return (freq1 * 0.4 + freq2 * 0.25 + freq3 * 0.15 + mountains * 0.5 + valleys * 0.3) * amplitude;
  },
  
  banded: (theta: number, phi: number, amplitude: number = 1) => {
    // Jupiter/Saturn style bands - more visible striations
    const bands = Math.sin(theta * 18) * 0.5;  // More bands
    const turbulence = Math.sin(theta * 6 + phi * 2) * Math.cos(phi * 4) * 0.3;
    const greatSpot = Math.exp(-((theta - 1.3) ** 2 + (phi - 2) ** 2) * 3) * 0.8; // Great Red Spot
    return (bands + turbulence + greatSpot) * amplitude;
  },
  
  smooth: (theta: number, phi: number, amplitude: number = 1) => {
    // Subtle cloud-like variations (Venus)
    const clouds = Math.sin(theta * 4) * Math.cos(phi * 6) * 0.4;
    const swirl = Math.sin(theta * 8 + phi) * 0.2;
    return (clouds + swirl) * amplitude * 0.5;
  },
  
  stormy: (theta: number, phi: number, amplitude: number = 1) => {
    // Neptune style storms - dramatic storm systems
    const base = Math.sin(theta * 8) * 0.3;
    const darkSpot = Math.exp(-((theta - 1.5) ** 2 + (phi - 3) ** 2) * 4) * -0.6;
    const storm = Math.sin((theta - 1.2) * 25) * Math.cos((phi + 0.8) * 30) * 0.4;
    const winds = Math.sin(theta * 15 + phi * 3) * 0.2;
    return (base + storm + darkSpot + winds) * amplitude;
  },
  
  icy: (theta: number, phi: number, amplitude: number = 1) => {
    // Pluto style icy surface with heart feature
    const heart = Math.exp(-((theta - 1.2) ** 2 + (phi - 1.5) ** 2) * 2) * 0.5; // Sputnik Planitia heart
    const ice = Math.sin(theta * 6) * Math.cos(phi * 7) * 0.4;
    const cracks = Math.sin(theta * 35) * Math.cos(phi * 25) * 0.15;
    const ridges = Math.max(0, Math.sin(theta * 12 + phi * 3) - 0.6) * 0.4;
    return (ice + cracks + heart + ridges) * amplitude;
  },
  
  solar_surface: (theta: number, phi: number, amplitude: number = 1) => {
    // Sun's granulated surface
    const granules = Math.sin(theta * 40) * Math.cos(phi * 40) * 0.3;
    const sunspots = -Math.exp(-((theta - 1.0) ** 2 + (phi - 2.0) ** 2) * 5) * 0.5;
    const convection = Math.sin(theta * 8 + phi * 2) * 0.2;
    return (granules + sunspots + convection) * amplitude;
  }
};

// Generate STL binary
function generateSTL(triangles: Triangle[], name: string): Buffer {
  const headerSize = 80;
  const triangleSize = 50;
  const bufferSize = headerSize + 4 + triangles.length * triangleSize;
  const buffer = Buffer.alloc(bufferSize);
  
  // Header
  const header = `Universe Generator - ${name}`.padEnd(80, '\0');
  buffer.write(header, 0, 80, 'ascii');
  
  // Triangle count
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    // Normal
    buffer.writeFloatLE(tri.normal.x, offset);
    buffer.writeFloatLE(tri.normal.y, offset + 4);
    buffer.writeFloatLE(tri.normal.z, offset + 8);
    
    // Vertices
    buffer.writeFloatLE(tri.v1.x, offset + 12);
    buffer.writeFloatLE(tri.v1.y, offset + 16);
    buffer.writeFloatLE(tri.v1.z, offset + 20);
    
    buffer.writeFloatLE(tri.v2.x, offset + 24);
    buffer.writeFloatLE(tri.v2.y, offset + 28);
    buffer.writeFloatLE(tri.v2.z, offset + 32);
    
    buffer.writeFloatLE(tri.v3.x, offset + 36);
    buffer.writeFloatLE(tri.v3.y, offset + 40);
    buffer.writeFloatLE(tri.v3.z, offset + 44);
    
    // Attribute byte count
    buffer.writeUInt16LE(0, offset + 48);
    
    offset += 50;
  }
  
  return buffer;
}

// Generate OBJ format
function generateOBJ(triangles: Triangle[], name: string): string {
  let obj = `# Universe Generator - ${name}\n`;
  obj += `# Triangles: ${triangles.length}\n\n`;
  
  // Vertices
  const vertices: Point3D[] = [];
  const vertexMap = new Map<string, number>();
  
  const getVertexIndex = (v: Point3D): number => {
    const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }
    vertices.push(v);
    const idx = vertices.length;
    vertexMap.set(key, idx);
    return idx;
  };
  
  const faces: number[][] = [];
  for (const tri of triangles) {
    faces.push([
      getVertexIndex(tri.v1),
      getVertexIndex(tri.v2),
      getVertexIndex(tri.v3)
    ]);
  }
  
  // Write vertices
  for (const v of vertices) {
    obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
  }
  
  obj += '\n';
  
  // Write faces
  for (const f of faces) {
    obj += `f ${f[0]} ${f[1]} ${f[2]}\n`;
  }
  
  return obj;
}

// Generate SVG projection (for 2D prints/lithophanes)
function generateSVG(triangles: Triangle[], name: string, width: number = 400, height: number = 400): string {
  // Find bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const tri of triangles) {
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
  }
  
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.9;
  const offsetX = width / 2 - (minX + maxX) / 2 * scale;
  const offsetY = height / 2 - (minY + maxY) / 2 * scale;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
  svg += `  <title>${name}</title>\n`;
  svg += `  <rect width="100%" height="100%" fill="#000011"/>\n`;
  
  // Sort triangles by Z for proper layering
  const sortedTris = [...triangles].sort((a, b) => {
    const zA = (a.v1.z + a.v2.z + a.v3.z) / 3;
    const zB = (b.v1.z + b.v2.z + b.v3.z) / 3;
    return zA - zB;
  });
  
  for (const tri of sortedTris) {
    const avgZ = (tri.v1.z + tri.v2.z + tri.v3.z) / 3;
    const brightness = Math.max(0.1, Math.min(1, 0.5 + avgZ / 100));
    const color = Math.round(brightness * 255);
    
    const x1 = tri.v1.x * scale + offsetX;
    const y1 = tri.v1.y * scale + offsetY;
    const x2 = tri.v2.x * scale + offsetX;
    const y2 = tri.v2.y * scale + offsetY;
    const x3 = tri.v3.x * scale + offsetX;
    const y3 = tri.v3.y * scale + offsetY;
    
    svg += `  <polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" `;
    svg += `fill="rgb(${color},${color},${Math.min(255, color + 30)})" stroke="none"/>\n`;
  }
  
  svg += `</svg>`;
  return svg;
}

// Main generation function
export function generateCelestialBody(
  bodyId: string,
  options: {
    printSize?: number; // mm
    detail?: 'low' | 'medium' | 'high' | 'ultra';
    surfaceAmplitude?: number; // 0-10
    includeRings?: boolean;
    lithophane?: boolean;
    format?: 'stl' | 'obj' | 'svg';
  } = {}
): { data: Buffer | string; filename: string; contentType: string } {
  const body = CELESTIAL_BODIES[bodyId as keyof typeof CELESTIAL_BODIES];
  if (!body) {
    throw new Error(`Unknown celestial body: ${bodyId}`);
  }
  
  const {
    printSize = 80,
    detail = 'high',
    surfaceAmplitude = 2,
    includeRings = true,
    lithophane = false,
    format = 'stl'
  } = options;
  
  // Calculate segments based on detail
  const segments = {
    low: 24,
    medium: 48,
    high: 64,
    ultra: 128
  }[detail];
  
  // Normalize radius to print size
  const scaleFactor = printSize / 2;
  
  // Get surface generator
  const textureType = body.texture as keyof typeof SURFACE_GENERATORS;
  const surfaceFunc = SURFACE_GENERATORS[textureType] || SURFACE_GENERATORS.smooth;
  
  // Generate sphere with detail
  const amplitude = lithophane ? surfaceAmplitude * 0.5 : surfaceAmplitude;
  let triangles = generateSphere(
    scaleFactor,
    segments,
    (theta, phi) => surfaceFunc(theta, phi, amplitude)
  );
  
  // Add rings if Saturn and requested
  if ((body as any).hasRings && includeRings) {
    // Saturn's rings: inner at ~1.28x planet radius, outer at ~2.27x planet radius
    const innerRing = scaleFactor * 1.3;  // 1.3x planet radius
    const outerRing = scaleFactor * 2.3;  // 2.3x planet radius
    const ringThickness = Math.max(1, printSize * 0.02); // 2% of print size for good printability
    const ringTriangles = generateRings(innerRing, outerRing, ringThickness, 96, true);
    triangles = [...triangles, ...ringTriangles];
  }
  
  // Generate output
  const name = `${body.name}_${printSize}mm`;
  
  if (format === 'stl') {
    return {
      data: generateSTL(triangles, name),
      filename: `${name}.stl`,
      contentType: 'application/octet-stream'
    };
  } else if (format === 'obj') {
    return {
      data: generateOBJ(triangles, name),
      filename: `${name}.obj`,
      contentType: 'text/plain'
    };
  } else {
    return {
      data: generateSVG(triangles, name),
      filename: `${name}.svg`,
      contentType: 'image/svg+xml'
    };
  }
}

// Generate constellation model
export function generateConstellation(
  constellationId: string,
  options: {
    size?: number;
    starSize?: number;
    includeLines?: boolean;
    format?: 'stl' | 'obj' | 'svg';
  } = {}
): { data: Buffer | string; filename: string; contentType: string } {
  const constellation = CONSTELLATIONS[constellationId as keyof typeof CONSTELLATIONS];
  if (!constellation) {
    throw new Error(`Unknown constellation: ${constellationId}`);
  }
  
  const {
    size = 100,
    starSize = 2,
    includeLines = true,
    format = 'stl'
  } = options;
  
  let triangles: Triangle[] = [];
  
  // Convert RA/Dec to XY coordinates
  const starPositions: Point3D[] = constellation.stars.map(star => {
    // Simplified projection
    const x = (star.ra - 150) * (size / 100);
    const y = star.dec * (size / 50);
    // Magnitude affects size and Z position
    const z = (5 - star.magnitude) * 2;
    return { x, y, z };
  });
  
  // Generate star spheres
  for (const pos of starPositions) {
    const starTris = generateSphere(starSize, 12);
    // Translate to position
    for (const tri of starTris) {
      tri.v1 = { x: tri.v1.x + pos.x, y: tri.v1.y + pos.y, z: tri.v1.z + pos.z };
      tri.v2 = { x: tri.v2.x + pos.x, y: tri.v2.y + pos.y, z: tri.v2.z + pos.z };
      tri.v3 = { x: tri.v3.x + pos.x, y: tri.v3.y + pos.y, z: tri.v3.z + pos.z };
    }
    triangles = [...triangles, ...starTris];
  }
  
  // Generate connecting lines as cylinders
  if (includeLines) {
    for (const [i1, i2] of constellation.lines) {
      const p1 = starPositions[i1];
      const p2 = starPositions[i2];
      
      // Create thin cylinder between points
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const segments = 8;
      const radius = 0.3;
      
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        // Simple cylinder along Z, we'll transform it
        const c1 = Math.cos(angle1) * radius;
        const s1 = Math.sin(angle1) * radius;
        const c2 = Math.cos(angle2) * radius;
        const s2 = Math.sin(angle2) * radius;
        
        // Interpolate along line
        const v1 = { x: p1.x + c1, y: p1.y + s1, z: p1.z };
        const v2 = { x: p1.x + c2, y: p1.y + s2, z: p1.z };
        const v3 = { x: p2.x + c1, y: p2.y + s1, z: p2.z };
        const v4 = { x: p2.x + c2, y: p2.y + s2, z: p2.z };
        
        const n1 = calculateNormal(v1, v2, v3);
        const n2 = calculateNormal(v2, v4, v3);
        
        triangles.push({ v1, v2, v3, normal: n1 });
        triangles.push({ v1: v2, v2: v4, v3, normal: n2 });
      }
    }
  }
  
  const name = `${constellation.name}_constellation`;
  
  if (format === 'stl') {
    return {
      data: generateSTL(triangles, name),
      filename: `${name}.stl`,
      contentType: 'application/octet-stream'
    };
  } else if (format === 'obj') {
    return {
      data: generateOBJ(triangles, name),
      filename: `${name}.obj`,
      contentType: 'text/plain'
    };
  } else {
    return {
      data: generateSVG(triangles, name),
      filename: `${name}.svg`,
      contentType: 'image/svg+xml'
    };
  }
}

// Export data for frontend
export function getCelestialBodies() {
  return Object.entries(CELESTIAL_BODIES).map(([id, body]) => ({
    id,
    ...body
  }));
}

export function getConstellations() {
  return Object.entries(CONSTELLATIONS).map(([id, constellation]) => ({
    id,
    name: constellation.name,
    description: constellation.description,
    starCount: constellation.stars.length
  }));
}
