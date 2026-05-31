/**
 * Terrain STL Generator
 * Generates 3D printable terrain models from coordinates
 * Uses improved procedural terrain generation with visible features
 */

interface TerrainSettings {
  lat: number;
  lng: number;
  size: number; // km
  resolution: number; // grid points
  heightScale: number;
  baseThickness: number;
}

// Improved Perlin-style noise with better variation
function hash(x: number, y: number, seed: number): number {
  let h = seed;
  h ^= Math.floor(x * 374761393);
  h ^= Math.floor(y * 668265263);
  h = Math.imul(h, 1274126177);
  h ^= h >> 16;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function perlinNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  
  const n00 = hash(x0, y0, seed);
  const n10 = hash(x1, y0, seed);
  const n01 = hash(x0, y1, seed);
  const n11 = hash(x1, y1, seed);
  
  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  
  return lerp(nx0, nx1, sy);
}

function fbmNoise(x: number, y: number, seed: number, octaves: number = 6): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += perlinNoise(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

function generateTerrainHeight(x: number, y: number, seed: number): number {
  // Base terrain with multiple octaves
  let height = fbmNoise(x * 0.1, y * 0.1, seed, 6);
  
  // Add larger mountain features
  const mountains = fbmNoise(x * 0.03, y * 0.03, seed + 5000, 4);
  height = lerp(height, mountains * 1.5, 0.4);
  
  // Add ridgelines for dramatic peaks
  const ridgeNoise = fbmNoise(x * 0.05, y * 0.05, seed + 2000, 3);
  const ridge = 1 - Math.abs(ridgeNoise - 0.5) * 2;
  height += ridge * ridge * 0.3;
  
  // Add some valleys
  const valleyNoise = fbmNoise(x * 0.02, y * 0.02, seed + 3000, 2);
  if (valleyNoise < 0.3) {
    height *= 0.3 + valleyNoise;
  }
  
  // Ensure height is in 0-1 range with good variation
  return Math.max(0, Math.min(1, height));
}

function generateElevationGrid(settings: TerrainSettings): number[][] {
  const { lat, lng, size, resolution } = settings;
  
  // Create unique seed from coordinates
  const seed = Math.abs(Math.floor(lat * 10000 + lng * 1000)) % 100000;
  
  const grid: number[][] = [];
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  
  // First pass: generate raw heights
  for (let y = 0; y < resolution; y++) {
    const row: number[] = [];
    for (let x = 0; x < resolution; x++) {
      // Scale coordinates based on actual location and size
      const worldX = lat + (x / resolution) * size * 0.01;
      const worldY = lng + (y / resolution) * size * 0.01;
      
      const height = generateTerrainHeight(worldX * 100, worldY * 100, seed);
      row.push(height);
      
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
    grid.push(row);
  }
  
  // Second pass: normalize to full 0-1 range for maximum variation
  const heightRange = maxHeight - minHeight || 1;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      grid[y][x] = (grid[y][x] - minHeight) / heightRange;
    }
  }
  
  return grid;
}

function createTerrainSTL(settings: TerrainSettings): Buffer {
  const { resolution, heightScale, baseThickness } = settings;
  const grid = generateElevationGrid(settings);
  
  // Model dimensions in mm
  const modelWidth = 100; // 100mm wide model
  const cellSize = modelWidth / (resolution - 1);
  const maxHeight = 30 * heightScale; // Max terrain height in mm
  
  const triangles: number[][] = [];

  const addTriangle = (
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number
  ) => {
    const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1;
    const vx = x3 - x1, vy = y3 - y1, vz = z3 - z1;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;
    
    triangles.push([nx, ny, nz, x1, y1, z1, x2, y2, z2, x3, y3, z3]);
  };

  // Generate top surface (terrain)
  for (let y = 0; y < resolution - 1; y++) {
    for (let x = 0; x < resolution - 1; x++) {
      const x0 = x * cellSize;
      const x1 = (x + 1) * cellSize;
      const y0 = y * cellSize;
      const y1 = (y + 1) * cellSize;
      
      const z00 = grid[y][x] * maxHeight + baseThickness;
      const z10 = grid[y][x + 1] * maxHeight + baseThickness;
      const z01 = grid[y + 1][x] * maxHeight + baseThickness;
      const z11 = grid[y + 1][x + 1] * maxHeight + baseThickness;
      
      addTriangle(x0, y0, z00, x1, y0, z10, x0, y1, z01);
      addTriangle(x1, y0, z10, x1, y1, z11, x0, y1, z01);
    }
  }

  // Generate bottom surface (flat base)
  for (let y = 0; y < resolution - 1; y++) {
    for (let x = 0; x < resolution - 1; x++) {
      const x0 = x * cellSize;
      const x1 = (x + 1) * cellSize;
      const y0 = y * cellSize;
      const y1 = (y + 1) * cellSize;
      
      addTriangle(x0, y1, 0, x1, y0, 0, x0, y0, 0);
      addTriangle(x0, y1, 0, x1, y1, 0, x1, y0, 0);
    }
  }

  // Front wall (y = 0)
  for (let x = 0; x < resolution - 1; x++) {
    const x0 = x * cellSize;
    const x1 = (x + 1) * cellSize;
    const z0 = grid[0][x] * maxHeight + baseThickness;
    const z1 = grid[0][x + 1] * maxHeight + baseThickness;
    
    addTriangle(x0, 0, 0, x1, 0, 0, x0, 0, z0);
    addTriangle(x1, 0, 0, x1, 0, z1, x0, 0, z0);
  }

  // Back wall (y = max)
  const yMax = (resolution - 1) * cellSize;
  for (let x = 0; x < resolution - 1; x++) {
    const x0 = x * cellSize;
    const x1 = (x + 1) * cellSize;
    const z0 = grid[resolution - 1][x] * maxHeight + baseThickness;
    const z1 = grid[resolution - 1][x + 1] * maxHeight + baseThickness;
    
    addTriangle(x0, yMax, z0, x1, yMax, 0, x0, yMax, 0);
    addTriangle(x0, yMax, z0, x1, yMax, z1, x1, yMax, 0);
  }

  // Left wall (x = 0)
  for (let y = 0; y < resolution - 1; y++) {
    const y0 = y * cellSize;
    const y1 = (y + 1) * cellSize;
    const z0 = grid[y][0] * maxHeight + baseThickness;
    const z1 = grid[y + 1][0] * maxHeight + baseThickness;
    
    addTriangle(0, y0, z0, 0, y1, 0, 0, y0, 0);
    addTriangle(0, y0, z0, 0, y1, z1, 0, y1, 0);
  }

  // Right wall (x = max)
  const xMax = (resolution - 1) * cellSize;
  for (let y = 0; y < resolution - 1; y++) {
    const y0 = y * cellSize;
    const y1 = (y + 1) * cellSize;
    const z0 = grid[y][resolution - 1] * maxHeight + baseThickness;
    const z1 = grid[y + 1][resolution - 1] * maxHeight + baseThickness;
    
    addTriangle(xMax, y0, 0, xMax, y1, 0, xMax, y0, z0);
    addTriangle(xMax, y1, 0, xMax, y1, z1, xMax, y0, z0);
  }

  // Create binary STL
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50;
  const bufferSize = headerSize + triangleCountSize + triangles.length * triangleSize;
  
  const buffer = Buffer.alloc(bufferSize);
  buffer.write('Terrain STL generated by SignCraft 3D', 0, 80, 'ascii');
  buffer.writeUInt32LE(triangles.length, 80);
  
  let offset = 84;
  for (const tri of triangles) {
    for (let i = 0; i < 12; i++) {
      buffer.writeFloatLE(tri[i], offset);
      offset += 4;
    }
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }
  
  return buffer;
}

export { createTerrainSTL, TerrainSettings };
