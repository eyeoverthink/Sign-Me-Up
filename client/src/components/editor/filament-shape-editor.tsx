import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  type FilamentShapeSettings,
  type FilamentShapeType,
  type FilamentClipStyle,
  type ScrewThreadType,
  type JarThreadType,
  filamentShapeTypes,
  filamentClipStyles,
  screwThreadTypes,
  jarThreadTypes,
  defaultFilamentShapeSettings,
} from "@shared/schema";
import { 
  Download, 
  Heart,
  Star,
  Circle,
  Infinity,
  Moon,
  Zap,
  ArrowUp,
  Triangle,
  Square,
  Diamond,
  Battery,
  Layers,
  Grid3X3,
  Upload,
  ImageIcon,
  Trash2,
  Skull,
  Brain,
  Phone,
  Clock,
  Leaf,
  Music,
  Bird,
  User,
  Monitor,
} from "lucide-react";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const shapeTypeLabels: Record<FilamentShapeType, string> = {
  "heart": "Heart",
  "star": "Star",
  "circle": "Circle",
  "infinity": "Infinity",
  "moon": "Crescent Moon",
  "wave": "Wave",
  "spiral": "Spiral",
  "lightning": "Lightning Bolt",
  "arrow": "Arrow",
  "triangle": "Triangle",
  "square": "Square",
  "diamond": "Diamond",
  "pineapple": "Pineapple",
  "cactus": "Cactus",
  "planet": "Planet (Saturn)",
  "alien": "Alien",
  "brain": "Brain",
  "retro_phone": "Retro Phone",
  "clock": "Clock",
  "leaf": "Leaf",
  "music_note": "Music Note",
  "t_rex": "T-Rex",
  "stick_figure": "Stick Figure",
  "retro_computer": "Retro Computer",
  "custom": "Custom Path",
};

const shapeIcons: Partial<Record<FilamentShapeType, typeof Heart>> = {
  "heart": Heart,
  "star": Star,
  "circle": Circle,
  "infinity": Infinity,
  "moon": Moon,
  "lightning": Zap,
  "arrow": ArrowUp,
  "triangle": Triangle,
  "square": Square,
  "diamond": Diamond,
  "pineapple": Star,
  "cactus": ArrowUp,
  "planet": Circle,
  "alien": Skull,
  "brain": Brain,
  "retro_phone": Phone,
  "clock": Clock,
  "leaf": Leaf,
  "music_note": Music,
  "t_rex": Bird,
  "stick_figure": User,
  "retro_computer": Monitor,
};

const clipStyleLabels: Record<FilamentClipStyle, string> = {
  "u_channel": "U-Channel (Open Top)",
  "pinch_clip": "Pinch Clip (C-Shape)",
  "wrap_around": "Wrap Around",
  "groove": "Shallow Groove",
};

interface Point2D {
  x: number;
  y: number;
}

function generateShapePath(shapeType: string, width: number, height: number, segments: number = 64): Point2D[] {
  const points: Point2D[] = [];
  const hw = width / 2;
  const hh = height / 2;
  
  switch (shapeType) {
    case "heart": {
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        points.push({ x: (x / 16) * hw, y: (y / 17) * hh });
      }
      break;
    }
    case "star": {
      const outerRadius = Math.min(hw, hh);
      const innerRadius = outerRadius * 0.4;
      const starPoints = 5;
      for (let i = 0; i <= starPoints * 2; i++) {
        const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      points.push(points[0]);
      break;
    }
    case "circle": {
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      break;
    }
    case "infinity": {
      const a = hw * 0.8;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const x = (a * Math.cos(t)) / denom;
        const y = (a * Math.sin(t) * Math.cos(t)) / denom;
        points.push({ x, y: y * (hh / hw) });
      }
      break;
    }
    case "moon": {
      const outerR = Math.min(hw, hh);
      const innerR = outerR * 0.65;
      const offset = outerR * 0.35;
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI - Math.PI / 2;
        points.push({ x: Math.cos(angle) * outerR, y: Math.sin(angle) * outerR });
      }
      for (let i = segments / 2; i >= 0; i--) {
        const angle = (i / (segments / 2)) * Math.PI - Math.PI / 2;
        points.push({ x: Math.cos(angle) * innerR + offset, y: Math.sin(angle) * innerR });
      }
      break;
    }
    case "wave": {
      const amplitude = hh * 0.5;
      const waves = 2;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = -hw + t * width;
        const y = Math.sin(t * Math.PI * 2 * waves) * amplitude;
        points.push({ x, y });
      }
      break;
    }
    case "spiral": {
      const maxRadius = Math.min(hw, hh);
      const turns = 2;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2 * turns;
        const radius = t * maxRadius;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      break;
    }
    case "lightning": {
      points.push({ x: 0, y: hh });
      points.push({ x: -hw * 0.2, y: hh * 0.3 });
      points.push({ x: hw * 0.15, y: hh * 0.35 });
      points.push({ x: -hw * 0.1, y: -hh * 0.2 });
      points.push({ x: hw * 0.2, y: -hh * 0.15 });
      points.push({ x: 0, y: -hh });
      break;
    }
    case "arrow": {
      points.push({ x: 0, y: hh });
      points.push({ x: hw * 0.5, y: hh * 0.4 });
      points.push({ x: hw * 0.2, y: hh * 0.4 });
      points.push({ x: hw * 0.2, y: -hh });
      points.push({ x: -hw * 0.2, y: -hh });
      points.push({ x: -hw * 0.2, y: hh * 0.4 });
      points.push({ x: -hw * 0.5, y: hh * 0.4 });
      points.push({ x: 0, y: hh });
      break;
    }
    case "triangle": {
      points.push({ x: 0, y: hh });
      points.push({ x: hw, y: -hh });
      points.push({ x: -hw, y: -hh });
      points.push({ x: 0, y: hh });
      break;
    }
    case "square": {
      points.push({ x: -hw, y: hh });
      points.push({ x: hw, y: hh });
      points.push({ x: hw, y: -hh });
      points.push({ x: -hw, y: -hh });
      points.push({ x: -hw, y: hh });
      break;
    }
    case "diamond": {
      points.push({ x: 0, y: hh });
      points.push({ x: hw, y: 0 });
      points.push({ x: 0, y: -hh });
      points.push({ x: -hw, y: 0 });
      points.push({ x: 0, y: hh });
      break;
    }
    default:
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
  }
  
  return points;
}

function getPathLength(points: Point2D[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function FilamentShapePreview({ settings }: { settings: FilamentShapeSettings }) {
  const scale = 0.015;

  const previewGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    const filamentMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffa500,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xff8c00,
      emissiveIntensity: 0.6,
    });
    
    const clipMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a5568,
      roughness: 0.5,
      metalness: 0.2,
    });
    
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d3748,
      roughness: 0.6,
      metalness: 0.1,
    });
    
    const diffuserMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
    });

    // Generate shape path - use custom data if available for custom type
    let shapePath: Point2D[];
    if (settings.shapeType === "custom" && settings.customPathData && settings.customPathData.length > 0) {
      // Use only the longest segment to avoid stitching disconnected paths
      const sortedSegments = [...settings.customPathData].sort((a, b) => b.length - a.length);
      const primarySegment = sortedSegments[0];
      
      if (primarySegment && primarySegment.length >= 2) {
        shapePath = primarySegment.map(p => ({
          x: (p.x - 0.5) * settings.shapeWidth,
          y: (0.5 - p.y) * settings.shapeHeight
        }));
      } else {
        shapePath = [{ x: 0, y: 0 }];
      }
    } else {
      shapePath = generateShapePath(settings.shapeType, settings.shapeWidth, settings.shapeHeight);
    }
    const pathLength = getPathLength(shapePath);
    
    // Create curve for path (need at least 2 points)
    let curve: THREE.CatmullRomCurve3 | null = null;
    if (shapePath.length >= 2) {
      curve = new THREE.CatmullRomCurve3(
        shapePath.map(p => new THREE.Vector3(p.x, p.y, settings.clipHeight * 0.7))
      );
      const tubeGeom = new THREE.TubeGeometry(curve, Math.max(2, shapePath.length), settings.filamentDiameter / 2, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeom, filamentMaterial);
      group.add(tubeMesh);
    }
    
    // Generate clips along path based on clip style
    if (curve) {
      const numClips = Math.max(3, Math.floor(pathLength / settings.clipSpacing));
      for (let i = 0; i < numClips; i++) {
        const t = i / numClips;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const angle = Math.atan2(tangent.y, tangent.x);
        
        let clipGeom: THREE.BufferGeometry;
        
        switch (settings.clipStyle) {
          case "c_clip":
            clipGeom = new THREE.TorusGeometry(
              settings.clipWidth * 0.5, 
              settings.clipWidth * 0.15, 
              8, 
              12, 
              Math.PI * 1.5
            );
            break;
          case "channel":
            clipGeom = new THREE.BoxGeometry(
              settings.clipWidth, 
              settings.clipWidth * 0.6, 
              settings.clipHeight
            );
            break;
          case "snap":
            clipGeom = new THREE.CylinderGeometry(
              settings.clipWidth * 0.35, 
              settings.clipWidth * 0.5, 
              settings.clipHeight, 
              8
            );
            break;
          case "post":
          default:
            clipGeom = new THREE.CylinderGeometry(
              settings.clipWidth * 0.3, 
              settings.clipWidth * 0.3, 
              settings.clipHeight, 
              8
            );
            break;
        }
        
        const clipMesh = new THREE.Mesh(clipGeom, clipMaterial);
        clipMesh.position.set(point.x, point.y, settings.clipHeight / 2);
        clipMesh.rotation.z = angle;
        group.add(clipMesh);
      }
    }
    
    // Base plate
    if (settings.includeBasePlate) {
      const padding = 10;
      const baseGeom = new THREE.BoxGeometry(
        settings.shapeWidth + padding * 2,
        settings.shapeHeight + padding * 2,
        settings.basePlateThickness
      );
      const baseMesh = new THREE.Mesh(baseGeom, baseMaterial);
      baseMesh.position.set(0, 0, settings.basePlateThickness / 2);
      group.add(baseMesh);
    }
    
    // Battery holder
    if (settings.includeBatteryMount) {
      const batteryGeom = new THREE.CylinderGeometry(12, 12, 8, 16);
      const batteryMesh = new THREE.Mesh(batteryGeom, baseMaterial);
      batteryMesh.rotation.x = Math.PI / 2;
      batteryMesh.position.set(0, -(settings.shapeHeight / 2 + 20), 4);
      group.add(batteryMesh);
    }
    
    // Diffuser panel
    if (settings.includeDiffuser) {
      const diffuserGeom = new THREE.BoxGeometry(
        settings.shapeWidth + 10,
        settings.shapeHeight + 10,
        settings.diffuserThickness
      );
      const diffuserMesh = new THREE.Mesh(diffuserGeom, diffuserMaterial);
      diffuserMesh.position.set(0, 0, settings.clipHeight + settings.diffuserOffset + settings.diffuserThickness / 2);
      group.add(diffuserMesh);
    }
    
    return group;
  }, [settings]);

  return (
    <group scale={[scale, scale, scale]}>
      <primitive object={previewGeometry} />
    </group>
  );
}

function extractPathFromImage(
  imageData: ImageData, 
  threshold: number = 128
): { x: number; y: number }[][] {
  const { width, height, data } = imageData;
  const paths: { x: number; y: number }[][] = [];
  
  // Create binary image and edge map
  const binary: boolean[][] = [];
  const isEdge: boolean[][] = [];
  
  for (let y = 0; y < height; y++) {
    binary[y] = [];
    isEdge[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      binary[y][x] = brightness < threshold;
      isEdge[y][x] = false;
    }
  }
  
  // Detect true edges: dark pixels adjacent to light pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y][x]) {
        // Check 4-neighbors for transition to light
        const neighbors = [
          [0, -1], [1, 0], [0, 1], [-1, 0]
        ];
        for (const [dx, dy] of neighbors) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !binary[ny][nx]) {
            isEdge[y][x] = true;
            break;
          }
        }
      }
    }
  }
  
  // Trace contours using edge-following with proper direction tracking
  const visited = new Set<string>();
  const directions = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1]
  ];
  
  function traceContour(startX: number, startY: number): { x: number; y: number }[] {
    const contour: { x: number; y: number }[] = [];
    let x = startX, y = startY;
    let prevDir = 0;
    const startKey = `${startX},${startY}`;
    let steps = 0;
    const maxSteps = width * height;
    
    do {
      const key = `${x},${y}`;
      if (!visited.has(key)) {
        visited.add(key);
        contour.push({ x: x / width, y: y / height });
      }
      
      // Look for next edge pixel, starting from direction opposite to where we came from
      let found = false;
      const searchStart = (prevDir + 5) % 8; // Start search from ~opposite direction
      
      for (let i = 0; i < 8; i++) {
        const dir = (searchStart + i) % 8;
        const nx = x + directions[dir][0];
        const ny = y + directions[dir][1];
        const nkey = `${nx},${ny}`;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
            isEdge[ny][nx] && !visited.has(nkey)) {
          x = nx;
          y = ny;
          prevDir = dir;
          found = true;
          break;
        }
      }
      
      if (!found) break;
      steps++;
    } while (steps < maxSteps && `${x},${y}` !== startKey);
    
    return contour;
  }
  
  // Find all contours
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isEdge[y][x] && !visited.has(`${x},${y}`)) {
        const contour = traceContour(x, y);
        if (contour.length >= 10) {
          // Simplify path by subsampling
          const simplified: { x: number; y: number }[] = [];
          const step = Math.max(1, Math.floor(contour.length / 50));
          for (let i = 0; i < contour.length; i += step) {
            simplified.push(contour[i]);
          }
          if (simplified.length >= 3) {
            paths.push(simplified);
          }
        }
      }
    }
  }
  
  // Return only the longest path (main outline) to avoid issues with multiple disconnected segments
  if (paths.length > 0) {
    paths.sort((a, b) => b.length - a.length);
    return [paths[0]]; // Return only the main contour
  }
  
  return paths;
}

export default function FilamentShapeEditor() {
  const { toast } = useToast();
  const [webglSupported] = useState(() => checkWebGLSupport());
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<FilamentShapeSettings>(defaultFilamentShapeSettings);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [tracedPaths, setTracedPaths] = useState<{ x: number; y: number }[][]>([]);

  const updateSetting = <K extends keyof FilamentShapeSettings>(
    key: K,
    value: FilamentShapeSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const paths = extractPathFromImage(imageData);
        
        if (paths.length === 0 || (paths[0] && paths[0].length < 3)) {
          toast({
            title: "Tracing Failed",
            description: "Could not find a clear outline. Use a simple black & white line art image.",
            variant: "destructive",
          });
          return;
        }
        
        setCustomImage(event.target?.result as string);
        setTracedPaths(paths);
        setSettings((prev) => ({ 
          ...prev, 
          shapeType: "custom" as FilamentShapeType,
          customPathData: paths 
        }));
        
        const mainPath = paths[0];
        const totalPoints = mainPath?.length || 0;
        toast({
          title: "Image Traced",
          description: `Main outline captured with ${totalPoints} points. Simple shapes work best.`,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const clearCustomImage = () => {
    setCustomImage(null);
    setTracedPaths([]);
    setSettings((prev) => ({ ...prev, customPathData: undefined }));
  };

  const pathLength = useMemo(() => {
    if (settings.shapeType === "custom" && settings.customPathData && settings.customPathData.length > 0) {
      // Use only the longest segment
      const sortedSegments = [...settings.customPathData].sort((a, b) => b.length - a.length);
      const primarySegment = sortedSegments[0];
      
      if (primarySegment && primarySegment.length >= 2) {
        const scaledPath = primarySegment.map(p => ({
          x: (p.x - 0.5) * settings.shapeWidth,
          y: (0.5 - p.y) * settings.shapeHeight
        }));
        return Math.round(getPathLength(scaledPath));
      }
    }
    const shapePath = generateShapePath(settings.shapeType, settings.shapeWidth, settings.shapeHeight);
    return Math.round(getPathLength(shapePath));
  }, [settings.shapeType, settings.shapeWidth, settings.shapeHeight, settings.customPathData]);

  const handleExport = async () => {
    // Validate custom path has enough points
    if (settings.shapeType === "custom") {
      if (!settings.customPathData || settings.customPathData.length === 0) {
        toast({
          title: "No Path",
          description: "Please upload an image to trace first.",
          variant: "destructive",
        });
        return;
      }
      const mainPath = settings.customPathData[0];
      if (!mainPath || mainPath.length < 3) {
        toast({
          title: "Invalid Path",
          description: "The traced path doesn't have enough points. Try a simpler image.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/export/filament-shape", settings);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `filament_shape_${settings.shapeType}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export Complete",
        description: "Filament shape clips and parts exported successfully!",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate filament shape files.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4" data-testid="filament-shape-editor">
      {/* 3D Preview */}
      <div className="flex-1 min-h-[400px] lg:min-h-0">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Filament Shape Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-60px)]">
            {webglSupported ? (
              <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 4]} />
                <OrbitControls enablePan enableZoom enableRotate />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <directionalLight position={[-3, -3, 2]} intensity={0.3} />
                <FilamentShapePreview settings={settings} />
              </Canvas>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                WebGL not supported
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <div className="lg:w-80 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Shape Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Shape
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shape Type</Label>
              <Select
                value={settings.shapeType}
                onValueChange={(v) => updateSetting("shapeType", v as FilamentShapeType)}
              >
                <SelectTrigger data-testid="select-shape-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filamentShapeTypes.map((type) => {
                    const Icon = shapeIcons[type] || Circle;
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {shapeTypeLabels[type]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Image Upload - shown when custom is selected */}
            {settings.shapeType === "custom" && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Custom Image Trace
                </Label>
                
                {!customImage ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Upload a simple black & white line art image. The main outline will be traced as your filament path. Works best with single continuous shapes (hearts, stars, letters).
                    </p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="input-custom-image"
                      />
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Image
                        </span>
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <img 
                        src={customImage} 
                        alt="Traced shape" 
                        className="w-full rounded border"
                        data-testid="img-custom-shape"
                      />
                      <div className="absolute inset-0 pointer-events-none">
                        <svg className="w-full h-full">
                          {tracedPaths.map((path, pathIdx) => (
                            <polyline
                              key={pathIdx}
                              points={path.map(p => `${p.x * 100}%,${p.y * 100}%`).join(" ")}
                              fill="none"
                              stroke="rgba(255, 165, 0, 0.8)"
                              strokeWidth="2"
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tracedPaths.length} path(s) found</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearCustomImage}
                        data-testid="button-clear-image"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Width: {settings.shapeWidth}mm</Label>
              <Slider
                value={[settings.shapeWidth]}
                onValueChange={([v]) => updateSetting("shapeWidth", v)}
                min={20}
                max={200}
                step={5}
                data-testid="slider-shape-width"
              />
            </div>

            <div className="space-y-2">
              <Label>Height: {settings.shapeHeight}mm</Label>
              <Slider
                value={[settings.shapeHeight]}
                onValueChange={([v]) => updateSetting("shapeHeight", v)}
                min={20}
                max={200}
                step={5}
                data-testid="slider-shape-height"
              />
            </div>

            <div className="p-2 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Path Length:</span>{" "}
              <span className="font-medium">{pathLength}mm</span>
            </div>
          </CardContent>
        </Card>

        {/* Filament Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Filament Specs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Filament Diameter: {settings.filamentDiameter}mm</Label>
              <Slider
                value={[settings.filamentDiameter]}
                onValueChange={([v]) => updateSetting("filamentDiameter", v)}
                min={1}
                max={4}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Voltage: {settings.filamentVoltage}V</Label>
              <Slider
                value={[settings.filamentVoltage]}
                onValueChange={([v]) => updateSetting("filamentVoltage", v)}
                min={1.5}
                max={12}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Your Filament Length: {settings.filamentLength}mm</Label>
              <Slider
                value={[settings.filamentLength]}
                onValueChange={([v]) => updateSetting("filamentLength", v)}
                min={50}
                max={300}
                step={10}
              />
            </div>
          </CardContent>
        </Card>

        {/* Clip Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Clip Holders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clip Style</Label>
              <Select
                value={settings.clipStyle}
                onValueChange={(v) => updateSetting("clipStyle", v as FilamentClipStyle)}
              >
                <SelectTrigger data-testid="select-clip-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filamentClipStyles.map((style) => (
                    <SelectItem key={style} value={style}>
                      {clipStyleLabels[style]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clip Spacing: {settings.clipSpacing}mm</Label>
              <Slider
                value={[settings.clipSpacing]}
                onValueChange={([v]) => updateSetting("clipSpacing", v)}
                min={10}
                max={40}
                step={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Clip Height: {settings.clipHeight}mm</Label>
              <Slider
                value={[settings.clipHeight]}
                onValueChange={([v]) => updateSetting("clipHeight", v)}
                min={4}
                max={15}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Components */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Base Plate</Label>
              <Switch
                checked={settings.includeBasePlate}
                onCheckedChange={(v) => updateSetting("includeBasePlate", v)}
                data-testid="switch-base-plate"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4" />
                <Label>Battery Mount</Label>
              </div>
              <Switch
                checked={settings.includeBatteryMount}
                onCheckedChange={(v) => updateSetting("includeBatteryMount", v)}
                data-testid="switch-battery-mount"
              />
            </div>

            {settings.includeBatteryMount && (
              <div className="space-y-2 pl-6">
                <Label>Battery Type</Label>
                <Select
                  value={settings.batteryType}
                  onValueChange={(v) => updateSetting("batteryType", v as typeof settings.batteryType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cr2032">CR2032 (3V Coin)</SelectItem>
                    <SelectItem value="cr2025">CR2025 (3V Coin)</SelectItem>
                    <SelectItem value="cr2016">CR2016 (3V Coin)</SelectItem>
                    <SelectItem value="aaa_single">AAA Single (1.5V)</SelectItem>
                    <SelectItem value="aaa_double">AAA Double (3V)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Diffuser Panel</Label>
              <Switch
                checked={settings.includeDiffuser}
                onCheckedChange={(v) => updateSetting("includeDiffuser", v)}
                data-testid="switch-diffuser"
              />
            </div>

            {settings.includeDiffuser && (
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label>Embossed Shape</Label>
                  <Switch
                    checked={settings.embossedShape}
                    onCheckedChange={(v) => updateSetting("embossedShape", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diffuser Offset: {settings.diffuserOffset}mm</Label>
                  <Slider
                    value={[settings.diffuserOffset]}
                    onValueChange={([v]) => updateSetting("diffuserOffset", v)}
                    min={2}
                    max={10}
                    step={1}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dimmer Housing</Label>
                <p className="text-xs text-muted-foreground">For brightness control</p>
              </div>
              <Switch
                checked={settings.includeDimmerHousing ?? false}
                onCheckedChange={(v) => updateSetting("includeDimmerHousing", v)}
                data-testid="switch-dimmer-housing"
              />
            </div>

            {settings.includeDimmerHousing && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label>Dimmer Type</Label>
                  <Select
                    value={settings.dimmerType ?? "both"}
                    onValueChange={(v) => updateSetting("dimmerType", v as "toggle_switch" | "dial_potentiometer" | "both")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toggle_switch">Toggle Switch Only</SelectItem>
                      <SelectItem value="dial_potentiometer">Dial Only</SelectItem>
                      <SelectItem value="both">Both (Toggle + Dial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Power Input</Label>
                  <Select
                    value={settings.powerInput ?? "usb"}
                    onValueChange={(v) => updateSetting("powerInput", v as "usb" | "barrel_jack" | "battery")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usb">USB-C Port</SelectItem>
                      <SelectItem value="barrel_jack">Barrel Jack (5.5mm)</SelectItem>
                      <SelectItem value="battery">Battery Powered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label>For Eggison Bulb</Label>
              <Switch
                checked={settings.forEggison}
                onCheckedChange={(v) => updateSetting("forEggison", v)}
                data-testid="switch-for-eggison"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Screw-Thread Base</Label>
              <Switch
                checked={settings.includeScrewBase || false}
                onCheckedChange={(v) => updateSetting("includeScrewBase", v)}
                data-testid="switch-screw-base"
              />
            </div>

            {settings.includeScrewBase && (
              <div className="space-y-4 pl-2 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Thread Type</Label>
                  <Select
                    value={settings.screwThreadType || "E26"}
                    onValueChange={(v) => updateSetting("screwThreadType", v as ScrewThreadType)}
                  >
                    <SelectTrigger data-testid="select-thread-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {screwThreadTypes.filter(t => t !== "none").map(threadType => (
                        <SelectItem key={threadType} value={threadType}>
                          {threadType === "E26" ? "E26 (US Edison)" :
                           threadType === "E27" ? "E27 (European)" :
                           threadType === "E14" ? "E14 (Small Edison)" :
                           threadType === "E12" ? "E12 (Candelabra)" : threadType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Matches Eggison shell threads - screw the shell right onto this base!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Base Height: {settings.screwBaseHeight || 25}mm</Label>
                  <Slider
                    value={[settings.screwBaseHeight || 25]}
                    onValueChange={([v]) => updateSetting("screwBaseHeight", v)}
                    min={15}
                    max={50}
                    step={1}
                    data-testid="slider-screw-base-height"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Filament Post Height: {settings.filamentPostHeight || 30}mm</Label>
                  <Slider
                    value={[settings.filamentPostHeight || 30]}
                    onValueChange={([v]) => updateSetting("filamentPostHeight", v)}
                    min={10}
                    max={60}
                    step={2}
                    data-testid="slider-post-height"
                  />
                  <p className="text-xs text-muted-foreground">
                    Posts rise from base to hold the shaped filament
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Number of Posts: {settings.filamentPostCount || 3}</Label>
                  <Slider
                    value={[settings.filamentPostCount || 3]}
                    onValueChange={([v]) => updateSetting("filamentPostCount", v)}
                    min={2}
                    max={8}
                    step={1}
                    data-testid="slider-post-count"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Wire Channel</Label>
                  <Switch
                    checked={settings.includeWireChannel !== false}
                    onCheckedChange={(v) => updateSetting("includeWireChannel", v)}
                    data-testid="switch-wire-channel"
                  />
                </div>

                {settings.includeWireChannel !== false && (
                  <div className="space-y-2">
                    <Label>Wire Channel Diameter: {settings.wireChannelDiameter || 3}mm</Label>
                    <Slider
                      value={[settings.wireChannelDiameter || 3]}
                      onValueChange={([v]) => updateSetting("wireChannelDiameter", v)}
                      min={2}
                      max={6}
                      step={0.5}
                      data-testid="slider-wire-channel-dia"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jar Base Settings (internal threads - jar screws INTO base) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jar Base (Glass Jar)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Jar Base</Label>
              <Switch
                checked={settings.includeJarBase || false}
                onCheckedChange={(v) => updateSetting("includeJarBase", v)}
                data-testid="switch-jar-base"
              />
            </div>

            {settings.includeJarBase && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                <div className="space-y-1">
                  <Label>Jar Size</Label>
                  <Select
                    value={settings.jarThreadType || "regular"}
                    onValueChange={(v) => updateSetting("jarThreadType", v as JarThreadType)}
                  >
                    <SelectTrigger data-testid="select-jar-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jarThreadTypes.filter(t => t !== "none").map(jarType => (
                        <SelectItem key={jarType} value={jarType}>
                          {jarType === "regular" ? "Regular Mouth (70mm)" :
                           jarType === "wide" ? "Wide Mouth (86mm)" :
                           jarType === "small" ? "Small Jar (50mm)" :
                           jarType === "custom" ? "Custom Size" : jarType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.jarThreadType === "custom" && (
                  <div className="space-y-1">
                    <Label>Custom Jar Diameter: {settings.jarDiameter || 70}mm</Label>
                    <Slider
                      value={[settings.jarDiameter || 70]}
                      onValueChange={([v]) => updateSetting("jarDiameter", v)}
                      min={40}
                      max={120}
                      step={1}
                      data-testid="slider-jar-diameter"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Base Height: {settings.jarBaseHeight || 35}mm</Label>
                  <Slider
                    value={[settings.jarBaseHeight || 35]}
                    onValueChange={([v]) => updateSetting("jarBaseHeight", v)}
                    min={20}
                    max={60}
                    step={1}
                    data-testid="slider-jar-base-height"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Wall Thickness: {settings.jarBaseWallThickness || 5}mm</Label>
                  <Slider
                    value={[settings.jarBaseWallThickness || 5]}
                    onValueChange={([v]) => updateSetting("jarBaseWallThickness", v)}
                    min={3}
                    max={8}
                    step={0.5}
                    data-testid="slider-jar-wall-thickness"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Bottom Plug</Label>
                  <Switch
                    checked={settings.includeBottomPlug !== false}
                    onCheckedChange={(v) => updateSetting("includeBottomPlug", v)}
                    data-testid="switch-bottom-plug"
                  />
                </div>

                {settings.includeBottomPlug !== false && (
                  <div className="space-y-3 pl-2">
                    <div className="space-y-1">
                      <Label>Plug Style</Label>
                      <Select
                        value={settings.bottomPlugStyle || "friction"}
                        onValueChange={(v) => updateSetting("bottomPlugStyle", v as "friction" | "screw" | "bayonet")}
                      >
                        <SelectTrigger data-testid="select-plug-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friction">Friction Fit</SelectItem>
                          <SelectItem value="screw">Screw-In</SelectItem>
                          <SelectItem value="bayonet">Bayonet Lock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Plug Thickness: {settings.bottomPlugThickness || 5}mm</Label>
                      <Slider
                        value={[settings.bottomPlugThickness || 5]}
                        onValueChange={([v]) => updateSetting("bottomPlugThickness", v)}
                        min={3}
                        max={10}
                        step={0.5}
                        data-testid="slider-plug-thickness"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleExport}
          disabled={isExporting}
          data-testid="button-export-filament-shape"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Generating..." : "Export Filament Shape"}
        </Button>
      </div>
    </div>
  );
}
