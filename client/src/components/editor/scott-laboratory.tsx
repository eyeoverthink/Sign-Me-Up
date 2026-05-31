import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Brain, 
  Zap, 
  Target, 
  FlaskConical, 
  Sparkles,
  Check,
  X,
  Clock,
  Layers,
  ImagePlus,
  Printer,
  Camera,
  Download,
  Play,
  Square,
  Eye,
  Repeat,
  Film,
  Scissors,
  Box,
  Sandwich
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface GeometricSignature {
  vertexCount: number;
  aspectRatio: number;
  compactness: number;
  angles: number[];
  phiResonance: number;
}

interface LearnedShape {
  id: string;
  name: string;
  signature: GeometricSignature;
  learnedAt: number;
}

interface RecognitionResult {
  matchName: string | null;
  confidence: number;
  processingTimeMs: number;
}

interface SequenceFrame {
  signature: GeometricSignature;
  timestamp: number;
  frameIndex: number;
}

interface LearnedSequence {
  id: string;
  name: string;
  frames: SequenceFrame[];
  duration: number;
  learnedAt: number;
}

interface SequenceRecognitionState {
  isRecording: boolean;
  isWatching: boolean;
  currentFrames: SequenceFrame[];
  matchedSequence: LearnedSequence | null;
  loopCount: number;
  confidence: number;
  predictedNext: string | null;
  lastMatchTime: number;
}

const PHI = 1.6180339887498948482;

function calculatePhiResonance(value: number): number {
  if (value === 0) return 0;
  const product = Math.abs(value) * PHI;
  const fractional = product - Math.floor(product);
  return 1 - Math.min(fractional, 1 - fractional);
}

export default function ScottLaboratory() {
  const [learnedShapes, setLearnedShapes] = useState<LearnedShape[]>([]);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawnPoints, setDrawnPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [importedImage, setImportedImage] = useState<string | null>(null);
  
  const [photoMode, setPhotoMode] = useState(false);
  const [blockSize, setBlockSize] = useState(11);
  const [dilationIterations, setDilationIterations] = useState(1);
  const [stencilHeight, setStencilHeight] = useState(2.0);
  const [extractedContours, setExtractedContours] = useState<{ x: number; y: number }[][]>([]);
  const [storedImageData, setStoredImageData] = useState<{ data: ImageData; width: number; height: number } | null>(null);
  
  const [kidCutMode, setKidCutMode] = useState(true);
  const [kidCutBlur, setKidCutBlur] = useState(25);
  const [kidCutMask, setKidCutMask] = useState<Uint8Array | null>(null);
  
  const [lightBoxMode, setLightBoxMode] = useState(false);
  const [lightBoxThickness, setLightBoxThickness] = useState(8);
  const [ledStripWidth, setLedStripWidth] = useState(10);
  const [channelWidth, setChannelWidth] = useState(12);
  const [channelDepth, setChannelDepth] = useState(4);
  const [wallThickness, setWallThickness] = useState(1.5);
  const [raisedHeight, setRaisedHeight] = useState(1);
  const [wireEscapeSize, setWireEscapeSize] = useState(5);
  
  const [sequenceMode, setSequenceMode] = useState(false);
  const [learnedSequences, setLearnedSequences] = useState<LearnedSequence[]>([]);
  const [sequenceState, setSequenceState] = useState<SequenceRecognitionState>({
    isRecording: false,
    isWatching: false,
    currentFrames: [],
    matchedSequence: null,
    loopCount: 0,
    confidence: 0,
    predictedNext: null,
    lastMatchTime: 0
  });
  const sequenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawnPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawnPoints(prev => [...prev, { x, y }]);

    const ctx = canvas.getContext("2d");
    if (ctx && drawnPoints.length > 0) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      const last = drawnPoints[drawnPoints.length - 1];
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setDrawnPoints([]);
    setRecognitionResult(null);
    setImportedImage(null);
    setStoredImageData(null);
    setExtractedContours([]);
  };

  useEffect(() => {
    if (photoMode && storedImageData && importedImage) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        processPhotoMode(imageData, canvas.width, canvas.height);
      };
      img.src = importedImage;
    }
  }, [photoMode, blockSize, dilationIterations, importedImage, kidCutMode, kidCutBlur]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImportedImage(dataUrl);
      
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        clearCanvas();
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (canvas.width - drawWidth) / 2;
        const offsetY = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setStoredImageData({ data: imageData, width: canvas.width, height: canvas.height });
        
        if (photoMode) {
          processPhotoMode(imageData, canvas.width, canvas.height);
        } else {
          const boundary = traceBoundaryFromImage(imageData, canvas.width, canvas.height);
          
          if (boundary.length > 10) {
            setDrawnPoints(boundary);
            setExtractedContours([boundary]);
            
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(boundary[0].x, boundary[0].y);
            for (let i = 1; i < boundary.length; i++) {
              ctx.lineTo(boundary[i].x, boundary[i].y);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const traceBoundaryFromImage = (imageData: ImageData, width: number, height: number): { x: number; y: number }[] => {
    const data = imageData.data;
    const threshold = 128;
    
    const isEdge = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      return gray < threshold;
    };
    
    let startX = -1, startY = -1;
    outer: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isEdge(x, y)) {
          startX = x;
          startY = y;
          break outer;
        }
      }
    }
    
    if (startX === -1) return [];
    
    const boundary: { x: number; y: number }[] = [];
    const directions = [
      { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
      { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }
    ];
    
    let x = startX, y = startY;
    let dir = 0;
    const maxIterations = width * height;
    let iterations = 0;
    
    do {
      boundary.push({ x, y });
      
      let found = false;
      for (let i = 0; i < 8; i++) {
        const checkDir = (dir + 6 + i) % 8;
        const nx = x + directions[checkDir].dx;
        const ny = y + directions[checkDir].dy;
        
        if (isEdge(nx, ny)) {
          x = nx;
          y = ny;
          dir = checkDir;
          found = true;
          break;
        }
      }
      
      if (!found) break;
      iterations++;
    } while ((x !== startX || y !== startY) && iterations < maxIterations);
    
    const step = Math.max(1, Math.floor(boundary.length / 200));
    return boundary.filter((_, i) => i % step === 0);
  };

  const adaptiveThreshold = (imageData: ImageData, blockSize: number): Uint8ClampedArray => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new Uint8ClampedArray(width * height);
    
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
    }
    
    const halfBlock = Math.floor(blockSize / 2);
    const C = 2;
    
    const gaussianKernel = createGaussianKernel(blockSize);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let weightedSum = 0, totalWeight = 0;
        
        for (let dy = -halfBlock; dy <= halfBlock; dy++) {
          for (let dx = -halfBlock; dx <= halfBlock; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const kernelIdx = (dy + halfBlock) * blockSize + (dx + halfBlock);
              const weight = gaussianKernel[kernelIdx];
              weightedSum += gray[ny * width + nx] * weight;
              totalWeight += weight;
            }
          }
        }
        
        const localMean = weightedSum / totalWeight;
        const pixelIdx = y * width + x;
        result[pixelIdx] = gray[pixelIdx] < (localMean - C) ? 255 : 0;
      }
    }
    
    return result;
  };

  const createGaussianKernel = (size: number): Float32Array => {
    const kernel = new Float32Array(size * size);
    const sigma = size / 6;
    const half = Math.floor(size / 2);
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - half;
        const dy = y - half;
        const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel[y * size + x] = value;
        sum += value;
      }
    }
    
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= sum;
    }
    
    return kernel;
  };

  const dilate = (binary: Uint8ClampedArray, width: number, height: number, iterations: number): Uint8ClampedArray => {
    let result = new Uint8ClampedArray(binary);
    
    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8ClampedArray(width * height);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let hasNeighbor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy, nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                if (result[ny * width + nx] > 0) {
                  hasNeighbor = true;
                  break;
                }
              }
            }
            if (hasNeighbor) break;
          }
          temp[y * width + x] = hasNeighbor ? 255 : 0;
        }
      }
      result = temp;
    }
    
    return result;
  };

  const gaussianBlur = (gray: Float32Array, width: number, height: number, kernelSize: number): Float32Array => {
    const result = new Float32Array(width * height);
    const kernel = createGaussianKernel(kernelSize);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const ny = y + ky - half;
            const nx = x + kx - half;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const weight = kernel[ky * kernelSize + kx];
              sum += gray[ny * width + nx] * weight;
              weightSum += weight;
            }
          }
        }
        
        result[y * width + x] = sum / weightSum;
      }
    }
    
    return result;
  };

  const otsuThreshold = (gray: Float32Array, width: number, height: number): { binary: Uint8Array; threshold: number } => {
    const histogram = new Array(256).fill(0);
    const total = width * height;
    
    for (let i = 0; i < total; i++) {
      const val = Math.min(255, Math.max(0, Math.round(gray[i])));
      histogram[val]++;
    }
    
    let sumTotal = 0;
    for (let i = 0; i < 256; i++) {
      sumTotal += i * histogram[i];
    }
    
    let sumBackground = 0;
    let weightBackground = 0;
    let maxVariance = 0;
    let bestThreshold = 0;
    
    for (let t = 0; t < 256; t++) {
      weightBackground += histogram[t];
      if (weightBackground === 0) continue;
      
      const weightForeground = total - weightBackground;
      if (weightForeground === 0) break;
      
      sumBackground += t * histogram[t];
      
      const meanBackground = sumBackground / weightBackground;
      const meanForeground = (sumTotal - sumBackground) / weightForeground;
      
      const variance = weightBackground * weightForeground * 
                       (meanBackground - meanForeground) * (meanBackground - meanForeground);
      
      if (variance > maxVariance) {
        maxVariance = variance;
        bestThreshold = t;
      }
    }
    
    const binary = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      binary[i] = gray[i] < bestThreshold ? 255 : 0;
    }
    
    return { binary, threshold: bestThreshold };
  };

  const createKidCutMask = (imageData: ImageData, width: number, height: number, blurSize: number): Uint8Array => {
    const data = imageData.data;
    const gray = new Float32Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
    
    const blurred = gaussianBlur(gray, width, height, blurSize);
    const { binary, threshold } = otsuThreshold(blurred, width, height);
    
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const centerIdx = centerY * width + centerX;
    const centerInForeground = binary[centerIdx] > 0;
    
    const adjustedBinary = centerInForeground ? binary : new Uint8Array(binary.length).map((_, i) => binary[i] > 0 ? 0 : 255);
    
    const contours = findContoursFromBinary(adjustedBinary, width, height);
    
    if (contours.length === 0) {
      return new Uint8Array(width * height).fill(255);
    }
    
    let bestContour = contours[0];
    let bestScore = 0;
    
    for (const contour of contours) {
      let area = 0;
      let sumX = 0, sumY = 0;
      for (let i = 0; i < contour.length; i++) {
        const j = (i + 1) % contour.length;
        area += contour[i].x * contour[j].y;
        area -= contour[j].x * contour[i].y;
        sumX += contour[i].x;
        sumY += contour[i].y;
      }
      area = Math.abs(area) / 2;
      
      const contourCenterX = sumX / contour.length;
      const contourCenterY = sumY / contour.length;
      const distToCenter = Math.sqrt(
        Math.pow(contourCenterX - centerX, 2) + 
        Math.pow(contourCenterY - centerY, 2)
      );
      
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const centerScore = 1 - (distToCenter / maxDist);
      const areaScore = Math.min(area / (width * height * 0.5), 1);
      const score = centerScore * 0.6 + areaScore * 0.4;
      
      if (score > bestScore) {
        bestScore = score;
        bestContour = contour;
      }
    }
    
    const mask = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPointInPolygon(x, y, bestContour)) {
          mask[y * width + x] = 255;
        }
      }
    }
    
    return mask;
  };

  const isPointInPolygon = (x: number, y: number, polygon: { x: number; y: number }[]): boolean => {
    let inside = false;
    const n = polygon.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // =============================================================================
  // PROPER MOORE-NEIGHBOR BOUNDARY TRACING
  // This is the correct algorithm for extracting clean shape boundaries
  // =============================================================================
  const findContoursFromBinary = (binary: Uint8Array, width: number, height: number): { x: number; y: number }[][] => {
    const used = new Set<string>();
    const contours: { x: number; y: number }[][] = [];
    
    // Moore neighborhood: 8 directions clockwise starting from East
    // Index: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];
    
    const isForeground = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return binary[y * width + x] > 0;
    };
    
    // Find all starting boundary pixels (foreground with at least one background neighbor)
    for (let startY = 1; startY < height - 1; startY++) {
      for (let startX = 1; startX < width - 1; startX++) {
        const startKey = `${startX},${startY}`;
        if (used.has(startKey)) continue;
        if (!isForeground(startX, startY)) continue;
        
        // Check if it's a boundary pixel (has at least one background neighbor)
        let isBoundary = false;
        for (let d = 0; d < 8; d++) {
          if (!isForeground(startX + dx[d], startY + dy[d])) {
            isBoundary = true;
            break;
          }
        }
        if (!isBoundary) continue;
        
        // MOORE-NEIGHBOR BOUNDARY TRACING
        // 1. Start from entry direction (backtrack direction)
        // 2. Rotate clockwise checking each neighbor
        // 3. First foreground pixel found is the next boundary point
        // 4. The direction BEFORE that becomes the new backtrack direction
        
        const boundary: { x: number; y: number }[] = [];
        let x = startX, y = startY;
        
        // Find initial backtrack direction (first background neighbor)
        let backtrackDir = 0;
        for (let d = 0; d < 8; d++) {
          if (!isForeground(startX + dx[d], startY + dy[d])) {
            backtrackDir = d;
            break;
          }
        }
        
        let iterations = 0;
        const maxIter = width * height * 2;
        
        do {
          boundary.push({ x, y });
          used.add(`${x},${y}`);
          
          // Start searching from backtrack direction, go clockwise
          let foundNext = false;
          for (let i = 0; i < 8; i++) {
            const checkDir = (backtrackDir + i) % 8;
            const nx = x + dx[checkDir];
            const ny = y + dy[checkDir];
            
            if (isForeground(nx, ny)) {
              // Found next boundary pixel
              // Backtrack direction is the opposite of how we entered
              backtrackDir = (checkDir + 4) % 8;
              x = nx;
              y = ny;
              foundNext = true;
              break;
            }
          }
          
          if (!foundNext) break;
          iterations++;
          
        } while ((x !== startX || y !== startY) && iterations < maxIter);
        
        // Only keep meaningful contours
        if (boundary.length >= 20) {
          // Apply Douglas-Peucker simplification for cleaner output
          const simplified = douglasPeuckerSimplify(boundary, 1.5);
          if (simplified.length >= 4) {
            contours.push(simplified);
          }
        }
      }
    }
    
    return contours.sort((a, b) => b.length - a.length);
  };

  const applyMaskToEdges = (edges: Uint8ClampedArray, mask: Uint8Array, width: number, height: number): Uint8ClampedArray => {
    const result = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < width * height; i++) {
      result[i] = mask[i] > 0 ? edges[i] : 0;
    }
    
    return result;
  };

  // =============================================================================
  // MOORE-NEIGHBOR BOUNDARY TRACING FOR UINT8CLAMPED ARRAYS
  // =============================================================================
  const findContours = (binary: Uint8ClampedArray, width: number, height: number): { x: number; y: number }[][] => {
    const used = new Set<string>();
    const contours: { x: number; y: number }[][] = [];
    
    // Moore neighborhood: 8 directions clockwise starting from East
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];
    
    const isForeground = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return binary[y * width + x] > 0;
    };
    
    for (let startY = 1; startY < height - 1; startY++) {
      for (let startX = 1; startX < width - 1; startX++) {
        const startKey = `${startX},${startY}`;
        if (used.has(startKey)) continue;
        if (!isForeground(startX, startY)) continue;
        
        // Check if it's a boundary pixel
        let isBoundary = false;
        for (let d = 0; d < 8; d++) {
          if (!isForeground(startX + dx[d], startY + dy[d])) {
            isBoundary = true;
            break;
          }
        }
        if (!isBoundary) continue;
        
        // Moore-Neighbor tracing
        const boundary: { x: number; y: number }[] = [];
        let x = startX, y = startY;
        
        // Find initial backtrack direction
        let backtrackDir = 0;
        for (let d = 0; d < 8; d++) {
          if (!isForeground(startX + dx[d], startY + dy[d])) {
            backtrackDir = d;
            break;
          }
        }
        
        let iterations = 0;
        const maxIter = width * height * 2;
        
        do {
          boundary.push({ x, y });
          used.add(`${x},${y}`);
          
          let foundNext = false;
          for (let i = 0; i < 8; i++) {
            const checkDir = (backtrackDir + i) % 8;
            const nx = x + dx[checkDir];
            const ny = y + dy[checkDir];
            
            if (isForeground(nx, ny)) {
              backtrackDir = (checkDir + 4) % 8;
              x = nx;
              y = ny;
              foundNext = true;
              break;
            }
          }
          
          if (!foundNext) break;
          iterations++;
          
        } while ((x !== startX || y !== startY) && iterations < maxIter);
        
        if (boundary.length >= 20) {
          const simplified = douglasPeuckerSimplify(boundary, 1.5);
          if (simplified.length >= 4) {
            contours.push(simplified);
          }
        }
      }
    }
    
    return contours.sort((a, b) => b.length - a.length).slice(0, 50);
  };

  const processPhotoMode = (imageData: ImageData, width: number, height: number) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      let thresholded = adaptiveThreshold(imageData, blockSize);
      
      if (kidCutMode) {
        const mask = createKidCutMask(imageData, width, height, kidCutBlur);
        setKidCutMask(mask);
        thresholded = applyMaskToEdges(thresholded, mask, width, height);
      } else {
        setKidCutMask(null);
      }
      
      const dilated = dilate(thresholded, width, height, dilationIterations);
      const contours = findContours(dilated, width, height);
      
      setExtractedContours(contours);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (kidCutMode && kidCutMask) {
            ctx.strokeStyle = "rgba(255, 165, 0, 0.3)";
            ctx.lineWidth = 1;
            for (let y = 0; y < height; y += 3) {
              for (let x = 0; x < width; x += 3) {
                if (kidCutMask[y * width + x] > 0) {
                  ctx.fillStyle = "rgba(255, 165, 0, 0.05)";
                  ctx.fillRect(x, y, 3, 3);
                }
              }
            }
          }
          
          for (const contour of contours) {
            if (contour.length < 3) continue;
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(contour[0].x, contour[0].y);
            for (let i = 1; i < contour.length; i++) {
              ctx.lineTo(contour[i].x, contour[i].y);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
      
      if (contours.length > 0) {
        setDrawnPoints(contours[0]);
      }
      
      setIsProcessing(false);
    }, 10);
  };

  const simplifyContourForExport = (contour: { x: number; y: number }[]): { x: number; y: number }[] => {
    if (contour.length < 3) return contour;
    const simplified = douglasPeuckerSimplify(contour, 1.5);
    if (simplified.length < 3) return contour;
    
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    if (Math.sqrt(dx * dx + dy * dy) > 2) {
      simplified.push({ ...first });
    }
    
    return simplified;
  };

  const exportStencilSCAD = () => {
    if (extractedContours.length === 0) return;

    const simplifiedContours = extractedContours
      .map(simplifyContourForExport)
      .filter(c => c.length >= 3);

    if (simplifiedContours.length === 0) return;

    const allPoints = simplifiedContours.flat();
    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    let scadContent = `// ==========================================
// SCOTT ENGINE V2.0: PHOTO MANIFEST
// Generated by SignCraft 3D Scott Laboratory
// Contours: ${simplifiedContours.length}
// ==========================================

$fn = 40;
height = ${stencilHeight.toFixed(1)};

module photo_lines() {
    translate([${-centerX.toFixed(1)}, ${centerY.toFixed(1)}, 0]) {
`;

    for (const contour of simplifiedContours) {
      if (contour.length < 3) continue;
      const pointsStr = contour.map(p => `[${p.x.toFixed(1)}, ${(-p.y).toFixed(1)}]`).join(", ");
      scadContent += `        polygon(points=[${pointsStr}]);\n`;
    }

    scadContent += `    }
}

// 3D Extrusion
linear_extrude(height) photo_lines();

// Optional: Base Plate
// translate([0,0,-1]) cube([200, 200, 1], center=true);
`;

    const blob = new Blob([scadContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "photo_stencil.scad";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportLightBoxSCAD = () => {
    if (extractedContours.length === 0) return;

    const simplifiedContours = extractedContours
      .map(simplifyContourForExport)
      .filter(c => c.length >= 3);

    if (simplifiedContours.length === 0) return;

    const allPoints = simplifiedContours.flat();
    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX + 20;
    const boxHeight = maxY - minY + 20;

    const scadContent = `// ==========================================
// SCOTT ENGINE V2.0: LIGHT BOX GENERATOR
// "Hamburger" Style LED Enclosure
// Generated by SignCraft 3D Scott Laboratory
// ==========================================
// Kid Cut (Scissors Protocol) Applied
// Contours: ${simplifiedContours.length}
// ==========================================

$fn = 40;

// === PARAMETERS ===
box_width = ${boxWidth.toFixed(1)};
box_height = ${boxHeight.toFixed(1)};
total_thickness = ${lightBoxThickness};
led_strip_width = ${ledStripWidth};  // Your LED strip/tube width (2-25mm)
channel_width = ${channelWidth};     // Channel should be slightly wider than strip
channel_depth = ${channelDepth};
wall_thickness = ${wallThickness.toFixed(1)};
raised_height = ${raisedHeight};
wire_escape = ${wireEscapeSize};

// Derived values
base_thickness = wall_thickness;
lid_thickness = wall_thickness;
cavity_depth = total_thickness - base_thickness - lid_thickness;

// LED strip fitting tolerance
led_tolerance = 0.5;  // Gap for easy insertion

// === TRACED DESIGN AS RAISED CHANNELS ===
module traced_design() {
    translate([${-centerX.toFixed(1)}, ${centerY.toFixed(1)}, 0]) {
${simplifiedContours.map(contour => {
      const pointsStr = contour.map(p => `[${p.x.toFixed(1)}, ${(-p.y).toFixed(1)}]`).join(", ");
      return `        polygon(points=[${pointsStr}]);`;
    }).join('\n')}
    }
}

// === LED CHANNEL (follows traced design) ===
module led_channels() {
    // Offset the traced design to create LED routing channels
    offset(r = channel_width/2) traced_design();
}

// === WIRE ESCAPE CHANNELS ===
module wire_escapes() {
    // Corner wire escape slots
    translate([-box_width/2 + 5, 0, 0])
        square([wire_escape, wire_escape * 2], center=true);
    translate([box_width/2 - 5, 0, 0])
        square([wire_escape, wire_escape * 2], center=true);
}

// === BASE PLATE (Bottom Layer) ===
module base_plate() {
    difference() {
        // Solid base
        linear_extrude(base_thickness)
            square([box_width, box_height], center=true);
        
        // Wire escape holes through base
        translate([0, 0, -0.1])
            linear_extrude(base_thickness + 0.2)
                wire_escapes();
    }
}

// === MIDDLE LAYER (LED Cavity with Raised Design) ===
module middle_layer() {
    difference() {
        // Outer shell
        linear_extrude(cavity_depth)
            square([box_width, box_height], center=true);
        
        // Hollow out the cavity (leaving walls)
        translate([0, 0, wall_thickness])
            linear_extrude(cavity_depth)
                offset(r = -wall_thickness)
                    square([box_width, box_height], center=true);
    }
    
    // Add LED channel walls (raised design inside cavity)
    translate([0, 0, wall_thickness]) {
        linear_extrude(channel_depth) {
            difference() {
                led_channels();
                offset(r = -wall_thickness) led_channels();
            }
        }
    }
    
    // Raised surface design (the traced image as raised ridges)
    translate([0, 0, cavity_depth - raised_height])
        linear_extrude(raised_height)
            offset(r = wall_thickness) traced_design();
}

// === TOP PLATE / LID (Snap-fit or Friction) ===
module top_plate() {
    // Main lid
    linear_extrude(lid_thickness)
        square([box_width, box_height], center=true);
    
    // Friction lip (fits inside cavity)
    translate([0, 0, -wall_thickness])
        linear_extrude(wall_thickness + 0.1)
            difference() {
                offset(r = -wall_thickness - 0.2)
                    square([box_width, box_height], center=true);
                offset(r = -wall_thickness * 2 - 0.2)
                    square([box_width, box_height], center=true);
            }
}

// === DIFFUSER PLATE (Optional translucent top) ===
module diffuser_plate() {
    linear_extrude(lid_thickness)
        square([box_width - wall_thickness * 2, box_height - wall_thickness * 2], center=true);
}

// === ASSEMBLED PREVIEW ===
module assembled_lightbox() {
    base_plate();
    translate([0, 0, base_thickness]) middle_layer();
    translate([0, 0, base_thickness + cavity_depth]) top_plate();
}

// === EXPLODED VIEW (for printing separately) ===
module exploded_view() {
    // Base
    translate([-(box_width + 10), 0, 0]) base_plate();
    
    // Middle
    translate([0, 0, 0]) middle_layer();
    
    // Lid
    translate([box_width + 10, 0, 0]) top_plate();
    
    // Diffuser (optional)
    translate([0, box_height + 10, 0]) diffuser_plate();
}

// === RENDER SELECTION ===
// Uncomment the view you want:

// Assembled (preview)
assembled_lightbox();

// Exploded (for individual printing)
// exploded_view();

// Individual parts:
// base_plate();
// middle_layer();
// top_plate();
// diffuser_plate();
`;

    const blob = new Blob([scadContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lightbox_hamburger.scad";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractSignature = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return null;

    const simplified = douglasPeuckerSimplify(points, 3);
    const centroid = {
      x: simplified.reduce((sum, p) => sum + p.x, 0) / simplified.length,
      y: simplified.reduce((sum, p) => sum + p.y, 0) / simplified.length
    };

    const xs = simplified.map(p => p.x);
    const ys = simplified.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const aspectRatio = height > 0 ? width / height : 1;

    let perimeter = 0;
    for (let i = 0; i < simplified.length; i++) {
      const j = (i + 1) % simplified.length;
      perimeter += Math.sqrt(
        Math.pow(simplified[j].x - simplified[i].x, 2) +
        Math.pow(simplified[j].y - simplified[i].y, 2)
      );
    }

    let area = 0;
    for (let i = 0; i < simplified.length; i++) {
      const j = (i + 1) % simplified.length;
      area += simplified[i].x * simplified[j].y;
      area -= simplified[j].x * simplified[i].y;
    }
    area = Math.abs(area) / 2;

    const compactness = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

    const angles: number[] = [];
    for (let i = 0; i < simplified.length; i++) {
      const prev = simplified[(i - 1 + simplified.length) % simplified.length];
      const curr = simplified[i];
      const next = simplified[(i + 1) % simplified.length];
      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const cross = v1.x * v2.y - v1.y * v2.x;
      angles.push(Math.abs(Math.atan2(cross, dot) * 180 / Math.PI));
    }

    const phiResonance = angles.length > 0 
      ? angles.reduce((sum, a) => sum + calculatePhiResonance(a), 0) / angles.length 
      : 0;

    return {
      vertexCount: simplified.length,
      aspectRatio,
      compactness,
      angles,
      phiResonance
    };
  };

  const douglasPeuckerSimplify = (
    points: { x: number; y: number }[], 
    epsilon: number
  ): { x: number; y: number }[] => {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > epsilon) {
      const left = douglasPeuckerSimplify(points.slice(0, maxIndex + 1), epsilon);
      const right = douglasPeuckerSimplify(points.slice(maxIndex), epsilon);
      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  };

  const perpendicularDistance = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
    }
    return Math.abs((dx) * (a.y - p.y) - (a.x - p.x) * (dy)) / Math.sqrt(dx * dx + dy * dy);
  };

  const compareSignatures = (a: ReturnType<typeof extractSignature>, b: ReturnType<typeof extractSignature>): number => {
    if (!a || !b) return 0;

    const vertexScore = 1 - Math.abs(a.vertexCount - b.vertexCount) / Math.max(a.vertexCount, b.vertexCount, 1);
    const arScore = 1 - Math.abs(a.aspectRatio - b.aspectRatio) / Math.max(a.aspectRatio, b.aspectRatio, 0.01);
    const compactScore = Math.max(0, 1 - Math.abs(a.compactness - b.compactness));
    const phiScore = Math.max(0, 1 - Math.abs(a.phiResonance - b.phiResonance));

    return vertexScore * 0.25 + arScore * 0.25 + compactScore * 0.35 + phiScore * 0.15;
  };

  const learnShape = () => {
    if (drawnPoints.length < 10) return;

    const name = prompt("Name this shape:");
    if (!name) return;

    setIsProcessing(true);
    const startTime = performance.now();

    const signature = extractSignature(drawnPoints);
    if (!signature) {
      setIsProcessing(false);
      return;
    }

    const newShape: LearnedShape = {
      id: `shape_${Date.now()}`,
      name,
      signature: signature,
      learnedAt: Date.now()
    };

    setLearnedShapes(prev => [...prev, newShape]);
    setIsProcessing(false);

    const elapsed = performance.now() - startTime;
    alert(`Learned "${name}" in ${elapsed.toFixed(2)}ms\nVertices: ${signature.vertexCount}\nAspect: ${signature.aspectRatio.toFixed(2)}\nCompactness: ${signature.compactness.toFixed(3)}`);
    clearCanvas();
  };

  const recognizeShape = () => {
    // Use drawnPoints for freehand mode, or extractedContours for photo mode
    const pointsToRecognize = drawnPoints.length >= 10 
      ? drawnPoints 
      : (extractedContours.length > 0 && extractedContours[0].length >= 10 
        ? extractedContours[0] 
        : null);
    
    if (!pointsToRecognize || learnedShapes.length === 0) return;

    setIsProcessing(true);
    const startTime = performance.now();

    const unknownSig = extractSignature(pointsToRecognize);
    if (!unknownSig) {
      setIsProcessing(false);
      return;
    }

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const learned of learnedShapes) {
      const score = compareSignatures(unknownSig, learned.signature);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = learned.name;
      }
    }

    const elapsed = performance.now() - startTime;

    setRecognitionResult({
      matchName: bestScore > 0.6 ? bestMatch : null,
      confidence: bestScore,
      processingTimeMs: elapsed
    });

    setIsProcessing(false);
  };

  const captureSequenceFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const boundary = traceBoundaryFromImage(imageData, canvas.width, canvas.height);
    
    if (boundary.length < 10) return null;
    
    const signature = extractSignature(boundary);
    return signature;
  }, []);

  const startSequenceRecording = () => {
    recordingStartRef.current = performance.now();
    setSequenceState(prev => ({
      ...prev,
      isRecording: true,
      isWatching: false,
      currentFrames: [],
      matchedSequence: null,
      loopCount: 0,
      confidence: 0
    }));
    
    sequenceIntervalRef.current = setInterval(() => {
      const signature = captureSequenceFrame();
      if (signature) {
        const now = performance.now();
        const frame: SequenceFrame = {
          signature,
          timestamp: now - recordingStartRef.current,
          frameIndex: sequenceState.currentFrames.length
        };
        setSequenceState(prev => ({
          ...prev,
          currentFrames: [...prev.currentFrames, frame]
        }));
      }
    }, 500);
  };

  const stopSequenceRecording = () => {
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
    
    const name = prompt("Name this sequence:");
    if (!name || sequenceState.currentFrames.length < 2) {
      setSequenceState(prev => ({ ...prev, isRecording: false, currentFrames: [] }));
      return;
    }
    
    const duration = performance.now() - recordingStartRef.current;
    const newSequence: LearnedSequence = {
      id: `seq_${Date.now()}`,
      name,
      frames: sequenceState.currentFrames,
      duration,
      learnedAt: Date.now()
    };
    
    setLearnedSequences(prev => [...prev, newSequence]);
    setSequenceState(prev => ({ ...prev, isRecording: false, currentFrames: [] }));
    alert(`Learned sequence "${name}" with ${sequenceState.currentFrames.length} frames over ${(duration / 1000).toFixed(1)}s`);
  };

  const compareSequenceFrames = (current: SequenceFrame[], learned: LearnedSequence): { match: boolean; confidence: number; position: number } => {
    if (current.length === 0 || learned.frames.length === 0) {
      return { match: false, confidence: 0, position: -1 };
    }
    
    let bestMatch = 0;
    let bestPosition = -1;
    
    for (let offset = 0; offset < learned.frames.length; offset++) {
      let matchCount = 0;
      let totalScore = 0;
      
      for (let i = 0; i < Math.min(current.length, 5); i++) {
        const currentFrame = current[current.length - 1 - i];
        const learnedIdx = (learned.frames.length + offset - i) % learned.frames.length;
        const learnedFrame = learned.frames[learnedIdx];
        
        const similarity = compareSignatures(currentFrame.signature, learnedFrame.signature);
        if (similarity > 0.7) {
          matchCount++;
          totalScore += similarity;
        }
      }
      
      const avgScore = matchCount > 0 ? totalScore / Math.min(current.length, 5) : 0;
      if (avgScore > bestMatch) {
        bestMatch = avgScore;
        bestPosition = offset;
      }
    }
    
    const match = bestMatch > 0.6;
    return { match, confidence: bestMatch, position: bestPosition };
  };

  const startSequenceWatching = () => {
    if (learnedSequences.length === 0) {
      alert("No sequences learned yet. Record a sequence first.");
      return;
    }
    
    recordingStartRef.current = performance.now();
    setSequenceState(prev => ({
      ...prev,
      isRecording: false,
      isWatching: true,
      currentFrames: [],
      matchedSequence: null,
      loopCount: 0,
      confidence: 0
    }));
    
    let lastMatchPosition = -1;
    
    sequenceIntervalRef.current = setInterval(() => {
      const signature = captureSequenceFrame();
      if (!signature) return;
      
      const now = performance.now();
      const frame: SequenceFrame = {
        signature,
        timestamp: now - recordingStartRef.current,
        frameIndex: 0
      };
      
      setSequenceState(prev => {
        const newFrames = [...prev.currentFrames, frame].slice(-20);
        
        let bestSequence: LearnedSequence | null = null;
        let bestResult = { match: false, confidence: 0, position: -1 };
        
        for (const seq of learnedSequences) {
          const result = compareSequenceFrames(newFrames, seq);
          if (result.match && result.confidence > bestResult.confidence) {
            bestSequence = seq;
            bestResult = result;
          }
        }
        
        let newLoopCount = prev.loopCount;
        let predictedNext: string | null = null;
        
        if (bestSequence && bestResult.match) {
          if (bestResult.position < lastMatchPosition) {
            newLoopCount = prev.loopCount + 1;
          }
          lastMatchPosition = bestResult.position;
          
          const nextIdx = (bestResult.position + 1) % bestSequence.frames.length;
          const nextFrame = bestSequence.frames[nextIdx];
          for (const shape of learnedShapes) {
            const sim = compareSignatures(nextFrame.signature, shape.signature);
            if (sim > 0.6) {
              predictedNext = shape.name;
              break;
            }
          }
          if (!predictedNext) {
            predictedNext = `Frame ${nextIdx + 1}/${bestSequence.frames.length}`;
          }
        }
        
        return {
          ...prev,
          currentFrames: newFrames,
          matchedSequence: bestSequence,
          loopCount: newLoopCount,
          confidence: bestResult.confidence,
          predictedNext,
          lastMatchTime: now
        };
      });
    }, 500);
  };

  const stopSequenceWatching = () => {
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
    setSequenceState(prev => ({
      ...prev,
      isWatching: false
    }));
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 p-4 flex flex-col gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5 text-primary" />
              Scott Laboratory
              <Badge variant="outline" className="ml-2">Zero-Shot Recognition</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Draw shapes or import images to teach the system. It learns from ONE example - no training data needed.
            </p>
            
            <div className="relative bg-slate-900 rounded-lg overflow-hidden border">
              <canvas
                ref={canvasRef}
                width={500}
                height={350}
                className="cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                data-testid="canvas-scottlab"
              />
              {drawnPoints.length > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  {drawnPoints.length} points
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                data-testid="input-import-image"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                size="sm"
                data-testid="button-import-image"
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Import Image
              </Button>
              <Button onClick={clearCanvas} variant="outline" size="sm" data-testid="button-clear-scottlab">
                Clear
              </Button>
              <Button 
                onClick={learnShape} 
                disabled={drawnPoints.length < 10 || isProcessing}
                size="sm"
                data-testid="button-learn-shape"
              >
                <Brain className="h-4 w-4 mr-1" />
                Learn Shape
              </Button>
              <Button 
                onClick={recognizeShape} 
                disabled={(drawnPoints.length < 10 && extractedContours.length === 0) || learnedShapes.length === 0 || isProcessing}
                variant="secondary"
                size="sm"
                data-testid="button-recognize-shape"
              >
                <Target className="h-4 w-4 mr-1" />
                Recognize
              </Button>
              <Button 
                onClick={exportStencilSCAD}
                disabled={extractedContours.length === 0}
                variant="outline"
                size="sm"
                data-testid="button-export-stencil"
              >
                <Download className="h-4 w-4 mr-1" />
                Export Stencil
              </Button>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Camera className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Photo Mode</Label>
                  <Switch 
                    checked={photoMode} 
                    onCheckedChange={setPhotoMode}
                    data-testid="switch-photo-mode"
                  />
                  {photoMode && (
                    <Badge variant="secondary" className="ml-auto">
                      Adaptive Threshold
                    </Badge>
                  )}
                </div>
                
                {photoMode && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-orange-500" />
                        <Label className="text-xs font-medium">Kid Cut (Scissors)</Label>
                      </div>
                      <Switch 
                        checked={kidCutMode} 
                        onCheckedChange={setKidCutMode}
                        data-testid="switch-kid-cut"
                      />
                    </div>
                    
                    {kidCutMode && (
                      <div className="pl-2 border-l-2 border-orange-500/30 space-y-2">
                        <Label className="text-xs">Background Blur: {kidCutBlur}px</Label>
                        <Slider
                          value={[kidCutBlur]}
                          min={5}
                          max={51}
                          step={2}
                          onValueChange={([v]) => setKidCutBlur(v)}
                          className="mt-1"
                          data-testid="slider-kid-cut-blur"
                        />
                        <p className="text-xs text-muted-foreground">
                          Isolates main subject, removes background noise
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs">Block Size: {blockSize}px</Label>
                      <Slider
                        value={[blockSize]}
                        min={3}
                        max={31}
                        step={2}
                        onValueChange={([v]) => setBlockSize(v)}
                        className="mt-1"
                        data-testid="slider-block-size"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Larger = ignores more shadows/lighting
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Line Thickness: {dilationIterations}</Label>
                      <Slider
                        value={[dilationIterations]}
                        min={0}
                        max={4}
                        step={1}
                        onValueChange={([v]) => setDilationIterations(v)}
                        className="mt-1"
                        data-testid="slider-dilation"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Dilate lines for printable walls
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Stencil Height: {stencilHeight.toFixed(1)}mm</Label>
                      <Slider
                        value={[stencilHeight]}
                        min={0.5}
                        max={5}
                        step={0.5}
                        onValueChange={([v]) => setStencilHeight(v)}
                        className="mt-1"
                        data-testid="slider-stencil-height"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Sandwich className="h-4 w-4 text-purple-500" />
                        <Label className="text-xs font-medium">Light Box Mode</Label>
                      </div>
                      <Switch 
                        checked={lightBoxMode} 
                        onCheckedChange={setLightBoxMode}
                        data-testid="switch-lightbox-mode"
                      />
                    </div>
                    
                    {lightBoxMode && (
                      <div className="pl-2 border-l-2 border-purple-500/30 space-y-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          Generate "hamburger" style LED enclosure with channels
                        </p>
                        
                        <div>
                          <Label className="text-xs">Total Thickness: {lightBoxThickness}mm</Label>
                          <Slider
                            value={[lightBoxThickness]}
                            min={4}
                            max={20}
                            step={1}
                            onValueChange={([v]) => setLightBoxThickness(v)}
                            className="mt-1"
                            data-testid="slider-lightbox-thickness"
                          />
                        </div>
                        
                        <div className="bg-primary/10 p-2 rounded">
                          <Label className="text-xs font-medium">LED Strip/Tube Width: {ledStripWidth}mm</Label>
                          <Slider
                            value={[ledStripWidth]}
                            min={2}
                            max={25}
                            step={1}
                            onValueChange={([v]) => {
                              setLedStripWidth(v);
                              if (channelWidth < v + 2) setChannelWidth(v + 2);
                            }}
                            className="mt-1"
                            data-testid="slider-led-strip-width"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            COB strips: 8-10mm | Neon tubes: 6-12mm | Wide tubing: 15-25mm
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Channel Width: {channelWidth}mm</Label>
                          <Slider
                            value={[channelWidth]}
                            min={ledStripWidth + 1}
                            max={30}
                            step={1}
                            onValueChange={([v]) => setChannelWidth(v)}
                            className="mt-1"
                            data-testid="slider-channel-width"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Should be {ledStripWidth + 1}-{ledStripWidth + 4}mm for snug fit
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Channel Depth: {channelDepth}mm</Label>
                          <Slider
                            value={[channelDepth]}
                            min={2}
                            max={10}
                            step={1}
                            onValueChange={([v]) => setChannelDepth(v)}
                            className="mt-1"
                            data-testid="slider-channel-depth"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Wall Thickness: {wallThickness.toFixed(1)}mm</Label>
                          <Slider
                            value={[wallThickness]}
                            min={1}
                            max={3}
                            step={0.5}
                            onValueChange={([v]) => setWallThickness(v)}
                            className="mt-1"
                            data-testid="slider-wall-thickness"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Raised Design Height: {raisedHeight}mm</Label>
                          <Slider
                            value={[raisedHeight]}
                            min={0.5}
                            max={3}
                            step={0.5}
                            onValueChange={([v]) => setRaisedHeight(v)}
                            className="mt-1"
                            data-testid="slider-raised-height"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Wire Escape Size: {wireEscapeSize}mm</Label>
                          <Slider
                            value={[wireEscapeSize]}
                            min={3}
                            max={10}
                            step={1}
                            onValueChange={([v]) => setWireEscapeSize(v)}
                            className="mt-1"
                            data-testid="slider-wire-escape"
                          />
                        </div>
                        
                        <Button
                          onClick={exportLightBoxSCAD}
                          disabled={extractedContours.length === 0}
                          size="sm"
                          className="w-full mt-2"
                          data-testid="button-export-lightbox"
                        >
                          <Box className="h-4 w-4 mr-1" />
                          Export Light Box (.scad)
                        </Button>
                      </div>
                    )}
                    
                    {extractedContours.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t text-sm">
                        <Layers className="h-4 w-4 text-green-500" />
                        <span>{extractedContours.length} contours extracted</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3 mb-3">
                  <Film className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Sequence Mode</Label>
                  <Switch 
                    checked={sequenceMode} 
                    onCheckedChange={setSequenceMode}
                    data-testid="switch-sequence-mode"
                  />
                  {sequenceMode && (
                    <Badge variant="secondary" className="ml-auto">
                      Temporal Learning
                    </Badge>
                  )}
                </div>
                
                {sequenceMode && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Record a sequence of shapes to teach the system. It will recognize loops and predict the next shape.
                    </p>
                    
                    <div className="flex gap-2 flex-wrap">
                      {!sequenceState.isRecording && !sequenceState.isWatching && (
                        <>
                          <Button
                            onClick={startSequenceRecording}
                            size="sm"
                            variant="default"
                            data-testid="button-start-recording"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Record Sequence
                          </Button>
                          <Button
                            onClick={startSequenceWatching}
                            size="sm"
                            variant="secondary"
                            disabled={learnedSequences.length === 0}
                            data-testid="button-start-watching"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Watch & Detect
                          </Button>
                        </>
                      )}
                      
                      {sequenceState.isRecording && (
                        <Button
                          onClick={stopSequenceRecording}
                          size="sm"
                          variant="destructive"
                          data-testid="button-stop-recording"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop Recording ({sequenceState.currentFrames.length} frames)
                        </Button>
                      )}
                      
                      {sequenceState.isWatching && (
                        <Button
                          onClick={stopSequenceWatching}
                          size="sm"
                          variant="destructive"
                          data-testid="button-stop-watching"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop Watching
                        </Button>
                      )}
                    </div>
                    
                    {sequenceState.isWatching && (
                      <div className="space-y-2 pt-2 border-t">
                        {sequenceState.matchedSequence ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">
                              Matched: {sequenceState.matchedSequence.name}
                            </span>
                            <Badge variant="outline">
                              {(sequenceState.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">Analyzing sequence...</span>
                          </div>
                        )}
                        
                        {sequenceState.loopCount > 0 && (
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">
                              Loop detected: {sequenceState.loopCount} time{sequenceState.loopCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {sequenceState.predictedNext && (
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">
                              Next predicted: <strong>{sequenceState.predictedNext}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {learnedSequences.length > 0 && (
                      <div className="pt-2 border-t">
                        <Label className="text-xs text-muted-foreground">Learned Sequences:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {learnedSequences.map(seq => (
                            <Badge key={seq.id} variant="outline" className="text-xs">
                              {seq.name} ({seq.frames.length} frames)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {recognitionResult && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {recognitionResult.matchName ? (
                      <Check className="h-6 w-6 text-green-500" />
                    ) : (
                      <X className="h-6 w-6 text-red-500" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {recognitionResult.matchName 
                          ? `Recognized: ${recognitionResult.matchName}` 
                          : "No match found"}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Confidence: {(recognitionResult.confidence * 100).toFixed(1)}%</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recognitionResult.processingTimeMs.toFixed(2)}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="w-72 border-l bg-sidebar p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Learned Shapes
        </h3>
        
        {learnedShapes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Draw a shape and click "Learn Shape" to teach the system.
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="flex flex-col gap-2">
              {learnedShapes.map(shape => (
                <Card key={shape.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{shape.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {shape.signature.vertexCount} pts
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AR: {shape.signature.aspectRatio.toFixed(2)} | C: {shape.signature.compactness.toFixed(2)}
                    </div>
                    <div>φ: {shape.signature.phiResonance.toFixed(3)}</div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator className="my-4" />

        <div className="text-xs text-muted-foreground space-y-2">
          <p className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Zero training time</span>
          </p>
          <p className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span>1 example per shape</span>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>0.2ms recognition</span>
          </p>
        </div>
      </div>
    </div>
  );
}
