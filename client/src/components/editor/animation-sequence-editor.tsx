import { useState, useMemo, Suspense, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, Line } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  type AnimationSequenceSettings,
  type AnimationControllerType,
  type LedControlType,
  type FilamentShapeType,
  animationControllerTypes,
  ledControlTypes,
  filamentShapeTypes,
  filamentClipStyles,
  defaultAnimationSequenceSettings,
} from "@shared/schema";
import { 
  Download, 
  Play,
  Pause,
  Plus,
  Minus,
  Cpu,
  Zap,
  Settings,
  Film,
  Code,
  Sparkles,
  Lightbulb,
  Pencil,
  Upload,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
} from "lucide-react";

function getShapePath(shapeType: FilamentShapeType): [number, number][] {
  const paths: Partial<Record<FilamentShapeType, [number, number][]>> = {
    heart: [[-0.5, 0.3], [-0.9, 0.8], [-0.9, 0.2], [-0.5, -0.5], [0, -1], [0.5, -0.5], [0.9, 0.2], [0.9, 0.8], [0.5, 0.3], [0, 0.6], [-0.5, 0.3]],
    star: [[0, 1], [0.2, 0.3], [1, 0.3], [0.4, -0.1], [0.6, -0.9], [0, -0.4], [-0.6, -0.9], [-0.4, -0.1], [-1, 0.3], [-0.2, 0.3], [0, 1]],
    circle: Array.from({ length: 33 }, (_, i) => [Math.cos(i * Math.PI * 2 / 32), Math.sin(i * Math.PI * 2 / 32)] as [number, number]),
    ball: Array.from({ length: 33 }, (_, i) => [Math.cos(i * Math.PI * 2 / 32) * 0.8, Math.sin(i * Math.PI * 2 / 32) * 0.8] as [number, number]),
    moon: [[0.5, 0.9], [0.1, 0.7], [-0.2, 0.3], [-0.3, 0], [-0.2, -0.3], [0.1, -0.7], [0.5, -0.9], [0.3, -0.5], [0.2, 0], [0.3, 0.5], [0.5, 0.9]],
    infinity: Array.from({ length: 49 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      return [Math.sin(t) / (1 + Math.cos(t) * Math.cos(t)), Math.sin(t) * Math.cos(t) / (1 + Math.cos(t) * Math.cos(t))] as [number, number];
    }),
    lightning: [[0.1, 1], [-0.3, 0.3], [0.1, 0.3], [-0.2, -0.2], [0.2, -0.2], [-0.1, -1], [0.3, -0.1], [0.1, -0.1], [0.4, 0.5], [0, 0.5], [0.1, 1]],
    triangle: [[0, 1], [-0.9, -0.7], [0.9, -0.7], [0, 1]],
    square: [[-0.8, 0.8], [0.8, 0.8], [0.8, -0.8], [-0.8, -0.8], [-0.8, 0.8]],
    // Stick figure - standing pose with head
    stick_figure: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.15, Math.sin(i * Math.PI * 2 / 16) * 0.15 + 0.85] as [number, number]),
      [0, 0.7], [0, 0.2], [-0.35, -0.6], [0, 0.2], [0.35, -0.6], [0, 0.2], [0, 0.5], [-0.4, 0.35], [0, 0.5], [0.4, 0.7]
    ],
    // Walking stick figure
    stick_walking: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.12, Math.sin(i * Math.PI * 2 / 16) * 0.12 + 0.85] as [number, number]),
      [0, 0.73], [0, 0.15], [-0.4, -0.65], [0, 0.15], [0.3, -0.65], [0, 0.15], [0, 0.45], [-0.45, 0.25], [0, 0.45], [0.5, 0.55]
    ],
    // Jumping stick figure - arms and legs spread out
    stick_jumping: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.12, Math.sin(i * Math.PI * 2 / 16) * 0.12 + 0.85] as [number, number]),
      [0, 0.73], [0, 0.25], [-0.45, -0.35], [0, 0.25], [0.45, -0.35], [0, 0.25], [0, 0.55], [-0.5, 0.85], [0, 0.55], [0.5, 0.85]
    ],
    // Waving stick figure
    stick_waving: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.12, Math.sin(i * Math.PI * 2 / 16) * 0.12 + 0.85] as [number, number]),
      [0, 0.73], [0, 0.15], [-0.3, -0.6], [0, 0.15], [0.3, -0.6], [0, 0.15], [0, 0.5], [-0.4, 0.3], [0, 0.5], [0.5, 0.9]
    ],
    // Running stick figure
    stick_running: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.12 + 0.1, Math.sin(i * Math.PI * 2 / 16) * 0.12 + 0.85] as [number, number]),
      [0.1, 0.73], [0, 0.2], [-0.5, -0.6], [0, 0.2], [0.4, -0.6], [0, 0.2], [0.05, 0.45], [-0.45, 0.25], [0.05, 0.45], [0.55, 0.6]
    ],
    // Balloon shape
    balloon: [
      ...Array.from({ length: 33 }, (_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const r = 0.6 * (1 + 0.1 * Math.sin(angle * 2));
        return [Math.cos(angle) * r, Math.sin(angle) * r * 0.9 + 0.15] as [number, number];
      }),
      [0, -0.75], [0.05, -0.85], [-0.05, -0.92], [0, -1]
    ],
    // Cube outline (isometric)
    cube_outline: [
      [-0.5, -0.3], [0.5, -0.3], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.3],
      [-0.25, -0.55], [0.75, -0.55], [0.5, -0.3], [0.75, -0.55], [0.75, 0.25], [0.5, 0.5]
    ],
    // Pacman closed
    pacman: Array.from({ length: 33 }, (_, i) => [Math.cos(i * Math.PI * 2 / 32) * 0.8, Math.sin(i * Math.PI * 2 / 32) * 0.8] as [number, number]),
    // Pacman open mouth
    pacman_open: [
      [0, 0],
      ...Array.from({ length: 27 }, (_, i) => {
        const angle = 0.4 + (i / 26) * (Math.PI * 2 - 0.8);
        return [Math.cos(angle) * 0.8, Math.sin(angle) * 0.8] as [number, number];
      }),
      [0, 0]
    ],
    // Ant for marching animation
    ant: [
      ...Array.from({ length: 9 }, (_, i) => [0.5 + Math.cos(i * Math.PI * 2 / 8) * 0.15, Math.sin(i * Math.PI * 2 / 8) * 0.12] as [number, number]),
      [0.65, 0.1], [0.8, 0.35], [0.65, 0.1], [0.65, -0.1], [0.78, -0.3], [0.65, -0.1],
      [0.35, 0],
      ...Array.from({ length: 9 }, (_, i) => [Math.cos(i * Math.PI * 2 / 8) * 0.18, Math.sin(i * Math.PI * 2 / 8) * 0.12] as [number, number]),
      [-0.18, 0], [-0.4, 0.4], [-0.18, 0], [-0.4, -0.4], [-0.18, 0],
      ...Array.from({ length: 9 }, (_, i) => [-0.5 + Math.cos(i * Math.PI * 2 / 8) * 0.22, Math.sin(i * Math.PI * 2 / 8) * 0.16] as [number, number])
    ],
    // T-Rex dinosaur
    t_rex: [
      [0.3, 1], [0.6, 0.8], [0.8, 0.65], [0.55, 0.45], [0.25, 0.35],
      [0.4, 0.15], [0.5, 0.05], [0.4, -0.05], [0.25, -0.2],
      [0.4, -0.5], [0.2, -0.9], [0, -0.9], [0.1, -0.45],
      [-0.2, -0.45], [-0.4, -0.9], [-0.6, -0.9], [-0.5, -0.35],
      [-0.6, -0.15], [-0.85, 0.05], [-0.65, 0.2],
      [-0.2, 0.3], [0, 0.55], [0.3, 1]
    ],
    brain: [
      ...Array.from({ length: 33 }, (_, i) => {
        const t = i / 32;
        const angle = t * Math.PI * 2;
        const wobble = Math.sin(t * Math.PI * 8) * 0.12;
        return [Math.cos(angle) * 0.7 * (1 + wobble), Math.sin(angle) * 0.6 * (1 + wobble)] as [number, number];
      })
    ],
    alien: [
      ...Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        const angle = Math.PI + t * Math.PI;
        return [Math.cos(angle) * 0.7, Math.sin(angle) * 0.5 + 0.3] as [number, number];
      }),
      [0, -0.9], [-0.7, 0.8]
    ],
    music_note: [
      ...Array.from({ length: 17 }, (_, i) => [Math.cos(i * Math.PI * 2 / 16) * 0.3, Math.sin(i * Math.PI * 2 / 16) * 0.3 - 0.65] as [number, number]),
      [0.3, -0.35], [0.3, 0.9], [0.7, 0.4], [0.3, 0.2]
    ],
    right_arrow: [[0.9, 0], [0.3, 0.7], [0.3, 0.3], [-0.9, 0.3], [-0.9, -0.3], [0.3, -0.3], [0.3, -0.7], [0.9, 0]],
    saturn: [
      ...Array.from({ length: 33 }, (_, i) => [Math.cos(i * Math.PI * 2 / 32) * 0.35, Math.sin(i * Math.PI * 2 / 32) * 0.35] as [number, number]),
      [0.35, 0],
      ...Array.from({ length: 33 }, (_, i) => [Math.cos(i * Math.PI * 2 / 32) * 0.9, Math.sin(i * Math.PI * 2 / 32) * 0.2] as [number, number])
    ],
    soda_can: [
      ...Array.from({ length: 9 }, (_, i) => [Math.cos(Math.PI + i * Math.PI / 8) * 0.4, 0.85 + Math.sin(Math.PI + i * Math.PI / 8) * 0.05] as [number, number]),
      [0.45, 0.8], [0.45, -0.8],
      ...Array.from({ length: 9 }, (_, i) => [Math.cos(i * Math.PI / 8) * 0.4, -0.85 + Math.sin(i * Math.PI / 8) * 0.05] as [number, number]),
      [-0.45, -0.8], [-0.45, 0.8]
    ],
  };
  return paths[shapeType] || paths.circle || [];
}

// Lighting type options for non-addressable animations
const lightingTypes = [
  { id: "el_wire", label: "EL Wire/Tube", description: "Electroluminescent wire - continuous glow" },
  { id: "neon_tube", label: "Neon Tube", description: "Traditional glass neon tubes" },
  { id: "led_3mm", label: "3mm LED", description: "Standard 3mm through-hole LEDs" },
  { id: "led_5mm", label: "5mm LED", description: "Standard 5mm through-hole LEDs" },
  { id: "cob_strip", label: "COB LED Strip", description: "Continuous chip-on-board LED strip" },
  { id: "ws2812b", label: "WS2812B (Addressable)", description: "Individually addressable RGB LEDs" },
  { id: "filament", label: "LED Filament", description: "Flexible LED filament wire" },
] as const;
type LightingType = typeof lightingTypes[number]["id"];

// Preset animation examples
const presetAnimations = [
  {
    name: "Bouncing Ball",
    description: "Ball bouncing up and down",
    frameCount: 4,
    shapes: ["ball", "ball", "ball", "ball"] as FilamentShapeType[],
  },
  {
    name: "Walking Stick Figure",
    description: "Stick figure walking cycle",
    frameCount: 4,
    shapes: ["stick_figure", "stick_walking", "stick_figure", "stick_walking"] as FilamentShapeType[],
  },
  {
    name: "Jumping Celebration",
    description: "Stick figure jumping with joy",
    frameCount: 4,
    shapes: ["stick_figure", "stick_jumping", "stick_waving", "stick_figure"] as FilamentShapeType[],
  },
  {
    name: "Balloon Deflating",
    description: "Balloon shrinking animation",
    frameCount: 4,
    shapes: ["balloon", "circle", "ball", "star"] as FilamentShapeType[],
  },
  {
    name: "Marching Ants",
    description: "Ant walking pattern",
    frameCount: 4,
    shapes: ["ant", "ant", "ant", "ant"] as FilamentShapeType[],
  },
  {
    name: "Pac-Man Chomping",
    description: "Classic Pac-Man eating animation",
    frameCount: 4,
    shapes: ["pacman", "pacman_open", "pacman", "pacman_open"] as FilamentShapeType[],
  },
  {
    name: "Pulsing Cube",
    description: "3D cube expanding and contracting",
    frameCount: 4,
    shapes: ["square", "cube_outline", "square", "cube_outline"] as FilamentShapeType[],
  },
  {
    name: "Heartbeat",
    description: "Pulsing heart animation",
    frameCount: 4,
    shapes: ["heart", "star", "heart", "star"] as FilamentShapeType[],
  },
];

function ShapePreview3D({ 
  shapeType, 
  color = "#ff6600",
  position = [0, 0, 0] as [number, number, number]
}: { 
  shapeType: FilamentShapeType; 
  color?: string;
  position?: [number, number, number];
}) {
  const points = useMemo(() => {
    return getShapePath(shapeType).map(([x, y]) => [x * 2, y * 2, 0] as [number, number, number]);
  }, [shapeType]);

  return (
    <group position={position}>
      <Line points={points} color={color} lineWidth={3} />
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#1a1a2e" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function AnimatedPreview({ 
  settings, 
  isPlaying, 
  currentFrame,
  onFrameChange 
}: { 
  settings: AnimationSequenceSettings; 
  isPlaying: boolean;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
}) {
  useFrame(({ clock }) => {
    if (isPlaying) {
      const frameInterval = settings.frameDelayMs / 1000;
      const frameIndex = Math.floor(clock.getElapsedTime() / frameInterval) % settings.frameCount;
      if (frameIndex !== currentFrame) {
        onFrameChange(frameIndex);
      }
    }
  });

  const frame = settings.frames[currentFrame];
  const shapeType = frame?.shapeType || "circle";
  const color = frame?.ledColor || "#ff6600";

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[0, 0, 3]} intensity={0.5} color={color} />
      
      <ShapePreview3D shapeType={shapeType} color={color} />
      
      <Grid 
        position={[0, -3, 0]} 
        args={[20, 20]} 
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#444444"
        fadeDistance={30}
      />
      
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

const controllerLabels: Record<AnimationControllerType, string> = {
  "555_timer": "555 Timer (No Code)",
  "arduino_uno": "Arduino Uno",
  "arduino_nano": "Arduino Nano",
  "esp32": "ESP32 (WiFi)",
  "pico": "Raspberry Pi Pico",
  "attiny85": "ATtiny85 (Tiny)",
};

const ledTypeLabels: Record<LedControlType, string> = {
  "common_anode": "Common Anode RGB",
  "common_cathode": "Common Cathode RGB",
  "ws2812b": "WS2812B (Addressable)",
  "simple_led": "Simple LED",
};

const shapeLabels: Partial<Record<FilamentShapeType, string>> = {
  "heart": "Heart",
  "star": "Star",
  "circle": "Circle",
  "ball": "Ball",
  "moon": "Moon",
  "lightning": "Lightning",
  "triangle": "Triangle",
  "square": "Square",
  "right_arrow": "Right Arrow",
  "saturn": "Saturn",
  "soda_can": "Soda Can",
  // Stick figure poses
  "stick_figure": "Stick Figure (Standing)",
  "stick_walking": "Stick Figure (Walking)",
  "stick_jumping": "Stick Figure (Jumping)",
  "stick_waving": "Stick Figure (Waving)",
  "stick_running": "Stick Figure (Running)",
  // Animation shapes
  "balloon": "Balloon",
  "cube_outline": "3D Cube",
  "pacman": "Pac-Man (Closed)",
  "pacman_open": "Pac-Man (Open)",
  "ant": "Ant",
  // Character shapes
  "t_rex": "T-Rex",
  "alien": "Alien",
  "brain": "Brain",
  "music_note": "Music Note",
  "infinity": "Infinity",
};

interface DrawingPoint {
  x: number;
  y: number;
}

interface CustomDrawing {
  frameIndex: number;
  paths: DrawingPoint[][];
  imageData?: string;
}

export default function AnimationSequenceEditor() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AnimationSequenceSettings>(defaultAnimationSequenceSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState(0);
  const [activeTab, setActiveTab] = useState("frames");
  const [selectedLightingType, setSelectedLightingType] = useState<LightingType>("ws2812b");
  
  const [customDrawings, setCustomDrawings] = useState<CustomDrawing[]>([]);
  const [currentDrawingFrame, setCurrentDrawingFrame] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);
  const [traceImage, setTraceImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSettings = <K extends keyof AnimationSequenceSettings>(
    key: K,
    value: AnimationSequenceSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateFrame = (frameIndex: number, shapeType: FilamentShapeType) => {
    setSettings(prev => {
      const newFrames = [...prev.frames];
      if (newFrames[frameIndex]) {
        newFrames[frameIndex] = { ...newFrames[frameIndex], shapeType };
      }
      return { ...prev, frames: newFrames };
    });
  };

  const setFrameCount = (count: number) => {
    const newFrames: { frameIndex: number; shapeType: FilamentShapeType; customPathData?: { x: number; y: number }[][]; ledColor?: string }[] = [];
    for (let i = 0; i < count; i++) {
      if (settings.frames[i]) {
        newFrames.push(settings.frames[i]);
      } else {
        newFrames.push({ frameIndex: i, shapeType: "circle" as FilamentShapeType });
      }
    }
    setSettings(prev => ({ ...prev, frameCount: count, frames: newFrames }));
  };

  const applyPresetAnimation = (preset: typeof presetAnimations[number]) => {
    const newFrames = preset.shapes.map((shapeType, i) => ({
      frameIndex: i,
      shapeType,
      ledColor: "#ff6600",
    }));
    setSettings(prev => ({
      ...prev,
      sequenceName: preset.name,
      frameCount: preset.frameCount,
      frames: newFrames,
    }));
    toast({
      title: "Preset Applied",
      description: `Loaded "${preset.name}" animation with ${preset.frameCount} frames`,
    });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCurrentPath(prev => [...prev, { x, y }]);
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    
    setCustomDrawings(prev => {
      const existing = prev.find(d => d.frameIndex === currentDrawingFrame);
      if (existing) {
        return prev.map(d => 
          d.frameIndex === currentDrawingFrame 
            ? { ...d, paths: [...d.paths, currentPath] }
            : d
        );
      }
      return [...prev, { frameIndex: currentDrawingFrame, paths: [currentPath] }];
    });
    
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentPath, currentDrawingFrame]);

  const clearDrawing = useCallback(() => {
    setCustomDrawings(prev => prev.filter(d => d.frameIndex !== currentDrawingFrame));
    setTraceImage(null);
  }, [currentDrawingFrame]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTraceImage(event.target?.result as string);
      toast({
        title: "Image Loaded",
        description: "Trace over the image to create your custom shape",
      });
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const getCurrentDrawing = useCallback(() => {
    return customDrawings.find(d => d.frameIndex === currentDrawingFrame);
  }, [customDrawings, currentDrawingFrame]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/animation-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `animation_${settings.sequenceName.replace(/[^a-zA-Z0-9]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${settings.frameCount} frames with ${settings.controllerType} code`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="h-[300px] bg-gradient-to-b from-slate-900 to-slate-800 relative">
          <Canvas>
            <Suspense fallback={null}>
              <AnimatedPreview 
                settings={settings} 
                isPlaying={isPlaying}
                currentFrame={currentPreviewFrame}
                onFrameChange={setCurrentPreviewFrame}
              />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-2 left-2 text-xs text-white/60">
            Frame {currentPreviewFrame + 1} of {settings.frameCount}
          </div>
          <div className="absolute bottom-2 right-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => setIsPlaying(!isPlaying)}
              data-testid="button-play-preview"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Animation Sequence System
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create multi-frame LED animations with controller code generation
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sequence-name">Sequence Name</Label>
                <Input
                  id="sequence-name"
                  value={settings.sequenceName}
                  onChange={(e) => updateSettings("sequenceName", e.target.value)}
                  placeholder="My Animation"
                  data-testid="input-sequence-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Quick Start - Preset Animations</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {presetAnimations.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPresetAnimation(preset)}
                      className="text-xs h-auto py-2 flex flex-col items-start"
                      data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-muted-foreground">{preset.frameCount} frames</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lighting Type</Label>
                <Select
                  value={selectedLightingType}
                  onValueChange={(v) => setSelectedLightingType(v as LightingType)}
                >
                  <SelectTrigger data-testid="select-lighting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lightingTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {lightingTypes.find(t => t.id === selectedLightingType)?.description}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frame Count: {settings.frameCount}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFrameCount(Math.max(2, settings.frameCount - 1))}
                      disabled={settings.frameCount <= 2}
                      data-testid="button-frame-minus"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Slider
                      value={[settings.frameCount]}
                      onValueChange={([v]) => setFrameCount(v)}
                      min={2}
                      max={8}
                      step={1}
                      className="flex-1"
                      data-testid="slider-frame-count"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFrameCount(Math.min(8, settings.frameCount + 1))}
                      disabled={settings.frameCount >= 8}
                      data-testid="button-frame-plus"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Frame Delay: {settings.frameDelayMs}ms</Label>
                  <Slider
                    value={[settings.frameDelayMs]}
                    onValueChange={([v]) => updateSettings("frameDelayMs", v)}
                    min={50}
                    max={2000}
                    step={50}
                    data-testid="slider-frame-delay"
                  />
                </div>
              </div>

              <Separator />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="frames" data-testid="tab-frames">
                    <Film className="h-4 w-4 mr-2" />
                    Frames
                  </TabsTrigger>
                  <TabsTrigger value="custom" data-testid="tab-custom">
                    <Pencil className="h-4 w-4 mr-2" />
                    Custom
                  </TabsTrigger>
                  <TabsTrigger value="controller" data-testid="tab-controller">
                    <Cpu className="h-4 w-4 mr-2" />
                    Controller
                  </TabsTrigger>
                  <TabsTrigger value="settings" data-testid="tab-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="frames" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {settings.frames.slice(0, settings.frameCount).map((frame, index) => (
                      <Card key={index} className={currentPreviewFrame === index ? "ring-2 ring-primary" : ""}>
                        <CardContent className="p-4 space-y-2">
                          <div className="text-sm font-medium text-center">Frame {index + 1}</div>
                          <Select
                            value={frame.shapeType}
                            onValueChange={(v) => updateFrame(index, v as FilamentShapeType)}
                          >
                            <SelectTrigger data-testid={`select-frame-${index}-shape`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(shapeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {settings.useRgbColors && (
                            <Input
                              type="color"
                              value={settings.frameColors?.[index] || "#ffffff"}
                              onChange={(e) => {
                                const newColors = [...(settings.frameColors || [])];
                                newColors[index] = e.target.value;
                                updateSettings("frameColors", newColors);
                              }}
                              className="h-8 w-full"
                              data-testid={`input-frame-${index}-color`}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isPlaying ? "destructive" : "default"}
                        onClick={() => setIsPlaying(!isPlaying)}
                        data-testid="button-preview-toggle"
                      >
                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        {isPlaying ? "Stop Preview" : "Play Preview"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="loop"
                        checked={settings.loopAnimation}
                        onCheckedChange={(v) => updateSettings("loopAnimation", v)}
                        data-testid="switch-loop"
                      />
                      <Label htmlFor="loop">Loop Animation</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Drawing for Frame {currentDrawingFrame + 1}</Label>
                      <Select
                        value={currentDrawingFrame.toString()}
                        onValueChange={(v) => setCurrentDrawingFrame(parseInt(v))}
                      >
                        <SelectTrigger className="w-32" data-testid="select-drawing-frame">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: settings.frameCount }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              Frame {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="relative border rounded-lg overflow-hidden bg-slate-900 aspect-square">
                      {traceImage && (
                        <img 
                          src={traceImage} 
                          alt="Trace reference" 
                          className="absolute inset-0 w-full h-full object-contain opacity-40 pointer-events-none"
                        />
                      )}
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={300}
                        className="w-full h-full cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        data-testid="canvas-drawing"
                      />
                      <svg 
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 1 1"
                        preserveAspectRatio="none"
                      >
                        {getCurrentDrawing()?.paths.map((path, i) => (
                          <path
                            key={i}
                            d={`M ${path.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                            stroke="#ff6600"
                            strokeWidth="0.01"
                            fill="none"
                          />
                        ))}
                        {currentPath.length > 1 && (
                          <path
                            d={`M ${currentPath.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                            stroke="#ff6600"
                            strokeWidth="0.01"
                            fill="none"
                            opacity="0.5"
                          />
                        )}
                      </svg>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="input-trace-image"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-trace"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import Image
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearDrawing}
                        data-testid="button-clear-drawing"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>

                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">How to Use</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>Draw directly on the canvas to create custom shapes</li>
                        <li>Import an image to trace over it</li>
                        <li>Switch between frames to create your animation sequence</li>
                        <li>Your drawings will be exported as custom clip holders</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="controller" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Controller Type</Label>
                      <Select
                        value={settings.controllerType}
                        onValueChange={(v) => updateSettings("controllerType", v as AnimationControllerType)}
                      >
                        <SelectTrigger data-testid="select-controller">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {animationControllerTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {controllerLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {settings.controllerType === "555_timer" && "Hardware-only solution using 555 timer + 4017 counter"}
                        {settings.controllerType === "arduino_nano" && "Compact Arduino with USB programming"}
                        {settings.controllerType === "esp32" && "WiFi-enabled with remote control interface"}
                        {settings.controllerType === "pico" && "MicroPython-based, easy to modify"}
                        {settings.controllerType === "attiny85" && "Minimal footprint, up to 5 outputs"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>LED Type</Label>
                      <Select
                        value={settings.ledType}
                        onValueChange={(v) => updateSettings("ledType", v as LedControlType)}
                      >
                        <SelectTrigger data-testid="select-led-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ledControlTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {ledTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {settings.ledType === "ws2812b" && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Switch
                        id="rgb-colors"
                        checked={settings.useRgbColors}
                        onCheckedChange={(v) => updateSettings("useRgbColors", v)}
                        data-testid="switch-rgb-colors"
                      />
                      <Label htmlFor="rgb-colors">Use Custom Colors Per Frame</Label>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-housing"
                      checked={settings.includeControllerHousing}
                      onCheckedChange={(v) => updateSettings("includeControllerHousing", v)}
                      data-testid="switch-controller-housing"
                    />
                    <Label htmlFor="include-housing">Include Controller Housing STL</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-diagram"
                      checked={settings.includeCircuitDiagram}
                      onCheckedChange={(v) => updateSettings("includeCircuitDiagram", v)}
                      data-testid="switch-circuit-diagram"
                    />
                    <Label htmlFor="include-diagram">Include Circuit/Wiring Info</Label>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frame Width: {settings.frameWidth}mm</Label>
                      <Slider
                        value={[settings.frameWidth]}
                        onValueChange={([v]) => updateSettings("frameWidth", v)}
                        min={20}
                        max={150}
                        step={5}
                        data-testid="slider-frame-width"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frame Height: {settings.frameHeight}mm</Label>
                      <Slider
                        value={[settings.frameHeight]}
                        onValueChange={([v]) => updateSettings("frameHeight", v)}
                        min={20}
                        max={150}
                        step={5}
                        data-testid="slider-frame-height"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Filament Diameter: {settings.filamentDiameter}mm</Label>
                      <Slider
                        value={[settings.filamentDiameter]}
                        onValueChange={([v]) => updateSettings("filamentDiameter", v)}
                        min={1}
                        max={4}
                        step={0.5}
                        data-testid="slider-filament-diameter"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Clip Spacing: {settings.clipSpacing}mm</Label>
                      <Slider
                        value={[settings.clipSpacing]}
                        onValueChange={([v]) => updateSettings("clipSpacing", v)}
                        min={10}
                        max={40}
                        step={5}
                        data-testid="slider-clip-spacing"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Clip Style</Label>
                    <Select
                      value={settings.clipStyle}
                      onValueChange={(v) => updateSettings("clipStyle", v as typeof filamentClipStyles[number])}
                    >
                      <SelectTrigger data-testid="select-clip-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="u_channel">U-Channel (Open Top)</SelectItem>
                        <SelectItem value="pinch_clip">Pinch Clip (C-Shape)</SelectItem>
                        <SelectItem value="wrap_around">Wrap Around</SelectItem>
                        <SelectItem value="groove">Groove</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="base-plate"
                      checked={settings.includeBasePlate}
                      onCheckedChange={(v) => updateSettings("includeBasePlate", v)}
                      data-testid="switch-base-plate"
                    />
                    <Label htmlFor="base-plate">Include Base Plate</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="wire-channels"
                      checked={settings.includeWireChannels}
                      onCheckedChange={(v) => updateSettings("includeWireChannels", v)}
                      data-testid="switch-wire-channels"
                    />
                    <Label htmlFor="wire-channels">Include Wire Channels</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="separate-frames"
                      checked={settings.exportSeparateFrames}
                      onCheckedChange={(v) => updateSettings("exportSeparateFrames", v)}
                      data-testid="switch-separate-frames"
                    />
                    <Label htmlFor="separate-frames">Export Frames as Separate Files</Label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export"
          >
            <Download className="h-5 w-5 mr-2" />
            {isExporting ? "Generating..." : `Export Animation (${settings.frameCount} frames + ${settings.controllerType === "555_timer" ? "circuit diagram" : "code"})`}
          </Button>
          </div>
        </div>
      </div>

      <div className="w-80 border-l bg-sidebar p-4 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="h-4 w-4" />
              Export Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frames:</span>
              <span>{settings.frameCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Controller:</span>
              <span>{controllerLabels[settings.controllerType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LED Type:</span>
              <span>{ledTypeLabels[settings.ledType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{settings.frameWidth} x {settings.frameHeight}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Animation Speed:</span>
              <span>{(1000 / settings.frameDelayMs).toFixed(1)} FPS</span>
            </div>
            <Separator className="my-2" />
            <div className="text-muted-foreground">Files included:</div>
            <ul className="space-y-1">
              {settings.frames.slice(0, settings.frameCount).map((frame, i) => (
                <li key={i}>frame_{i + 1}_{frame.shapeType}.stl</li>
              ))}
              {settings.includeControllerHousing && <li>controller_housing.stl</li>}
              <li>{settings.controllerType === "555_timer" ? "circuit_diagram.txt" : settings.controllerType === "pico" ? "animation_controller.py" : "animation_controller.ino"}</li>
              <li>README.md</li>
              <li>manifest.json</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Controller Features
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {settings.controllerType === "555_timer" && (
              <>
                <p>No programming required - pure hardware!</p>
                <p>Uses 555 timer IC for clock signal</p>
                <p>4017 decade counter sequences LEDs</p>
                <p>Adjust timing with R/C values</p>
              </>
            )}
            {settings.controllerType === "arduino_nano" && (
              <>
                <p>USB programmable, compact design</p>
                <p>PWM support for dimming</p>
                <p>Easy to modify timing in code</p>
              </>
            )}
            {settings.controllerType === "esp32" && (
              <>
                <p>WiFi-enabled remote control</p>
                <p>Web interface for speed/brightness</p>
                <p>OTA firmware updates</p>
              </>
            )}
            {settings.controllerType === "pico" && (
              <>
                <p>MicroPython for easy editing</p>
                <p>Drag-and-drop programming</p>
                <p>Low power consumption</p>
              </>
            )}
            {settings.controllerType === "attiny85" && (
              <>
                <p>Smallest footprint possible</p>
                <p>Limited to 5 GPIO pins</p>
                <p>Great for simple animations</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
