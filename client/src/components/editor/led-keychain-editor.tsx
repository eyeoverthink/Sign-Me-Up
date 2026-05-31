import { useState, useMemo, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";

interface TextPath {
  points: { x: number; y: number }[];
  closed: boolean;
}

interface TextPathResponse {
  paths: TextPath[];
  bounds: { width: number; height: number; centerX: number; centerY: number };
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Battery, ToggleLeft, Cable, Lightbulb, Download, Loader2, Dog, Zap } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { apiRequest } from "@/lib/queryClient";
import {
  keychainShapes,
  keychainLedTypes,
  keychainBatteryTypes,
  keychainSwitchPositions,
  keychainTextStyles,
  type KeychainShape,
  type KeychainLedType,
  type KeychainBatteryType,
  type KeychainSwitchPosition,
  type KeychainTextStyle,
} from "@shared/schema";

const shapeLabels: Record<KeychainShape, string> = {
  rectangle: "Rectangle",
  oval: "Oval",
  dogtag: "Dog Tag",
  heart: "Heart",
  rounded_rect: "Rounded Rectangle",
  bone: "Dog Bone",
};

const ledTypeLabels: Record<KeychainLedType, string> = {
  el_wire: "EL Wire (2.3mm)",
  led_strip_3mm: "LED Strip (3mm)",
  neon_tube_4mm: "Neon Tube (4mm)",
  neon_tube_6mm: "Neon Tube (6mm)",
  cob_strip_8mm: "COB Strip (8mm)",
  cob_strip_10mm: "COB Strip (10mm)",
};

const batteryLabels: Record<KeychainBatteryType, string> = {
  cr2032: "CR2032 (3V, 20mm)",
  cr2025: "CR2025 (3V, 20mm thin)",
  cr2016: "CR2016 (3V, 20mm ultra-thin)",
  "2xAAA": "2x AAA (3V)",
  lipo_small: "LiPo 100mAh",
};

const switchLabels: Record<KeychainSwitchPosition, string> = {
  side_right: "Right Side",
  side_left: "Left Side",
  top: "Top Edge",
  back: "Back Panel",
  integrated: "Push Button (Top)",
};

const textStyleLabels: Record<KeychainTextStyle, string> = {
  embossed: "Embossed (Raised)",
  engraved: "Engraved (Carved)",
  hollow: "Hollow (Cut-Through)",
  recessed: "Recessed (Shallow Cut)",
  outline: "Outline Only",
};

interface KeychainState {
  text: string;
  shape: KeychainShape;
  width: number;
  height: number;
  depth: number;
  textStyle: KeychainTextStyle;
  textDepth: number;
  ledType: KeychainLedType;
  ledChannelEnabled: boolean;
  ledChannelWidth: number;
  ledChannelDepth: number;
  batteryType: KeychainBatteryType;
  batterySlideIn: boolean;
  switchPosition: KeychainSwitchPosition;
  switchCutoutWidth: number;
  switchCutoutHeight: number;
  wiringChannelEnabled: boolean;
  wiringChannelDiameter: number;
  keychainHole: boolean;
  keychainHoleDiameter: number;
  keychainHolePosition: "top" | "top_left" | "top_right";
  wallThickness: number;
  diffuserEnabled: boolean;
  diffuserThickness: number;
  splitHalves: boolean;
}

function BatteryPocket({ settings, batteryGeometry }: { settings: KeychainState; batteryGeometry: THREE.BufferGeometry }) {
  const isCoinCell = settings.batteryType === "cr2032" || settings.batteryType === "cr2025" || settings.batteryType === "cr2016";
  const batteryThickness = settings.batteryType === "cr2032" ? 3.2 : settings.batteryType === "cr2025" ? 2.5 : 1.6;
  
  // Position battery in recessed pocket on the back
  const batteryZ = isCoinCell 
    ? -settings.depth / 2 + batteryThickness / 2 + 1  // Recessed in back
    : -settings.depth * 0.3;
  
  // Pocket dimensions (slightly larger than battery)
  const pocketRadius = isCoinCell ? 11 : 0;
  const pocketDepth = isCoinCell ? batteryThickness + 1.5 : 0;
  
  return (
    <group position={[0, -settings.height * 0.15, 0]}>
      {isCoinCell && (
        <mesh position={[0, 0, -settings.depth / 2 + pocketDepth / 2 + 0.5]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[pocketRadius, pocketRadius, pocketDepth, 32]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      )}
      
      <mesh
        geometry={batteryGeometry}
        position={[0, 0, batteryZ]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
      </mesh>
      
      {isCoinCell && (
        <mesh position={[0, 0, -settings.depth / 2 + 0.3]} rotation={[0, 0, 0]}>
          <ringGeometry args={[pocketRadius - 1.5, pocketRadius + 0.5, 32]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
      )}
      
      {settings.batterySlideIn && isCoinCell && (
        <mesh position={[pocketRadius + 2, 0, -settings.depth / 2 + pocketDepth / 2]} rotation={[0, 0, 0]}>
          <boxGeometry args={[6, 4, pocketDepth]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function Keychain3DPreview({ settings, textPaths, pathBounds }: { 
  settings: KeychainState;
  textPaths: TextPath[];
  pathBounds: { width: number; height: number } | null;
}) {
  const geometry = useMemo(() => {
    const { shape, width, height, depth } = settings;
    
    if (shape === "rectangle" || shape === "rounded_rect") {
      const radius = shape === "rounded_rect" ? Math.min(width, height) * 0.15 : 0;
      const roundedShape = new THREE.Shape();
      
      if (radius > 0) {
        const x = -width / 2;
        const y = -height / 2;
        const w = width;
        const h = height;
        const r = radius;
        
        roundedShape.moveTo(x + r, y);
        roundedShape.lineTo(x + w - r, y);
        roundedShape.quadraticCurveTo(x + w, y, x + w, y + r);
        roundedShape.lineTo(x + w, y + h - r);
        roundedShape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        roundedShape.lineTo(x + r, y + h);
        roundedShape.quadraticCurveTo(x, y + h, x, y + h - r);
        roundedShape.lineTo(x, y + r);
        roundedShape.quadraticCurveTo(x, y, x + r, y);
      } else {
        roundedShape.moveTo(-width / 2, -height / 2);
        roundedShape.lineTo(width / 2, -height / 2);
        roundedShape.lineTo(width / 2, height / 2);
        roundedShape.lineTo(-width / 2, height / 2);
        roundedShape.closePath();
      }
      
      return new THREE.ExtrudeGeometry(roundedShape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 3,
      });
    }
    
    if (shape === "oval") {
      const ovalShape = new THREE.Shape();
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * (width / 2);
        const y = Math.sin(angle) * (height / 2);
        if (i === 0) ovalShape.moveTo(x, y);
        else ovalShape.lineTo(x, y);
      }
      return new THREE.ExtrudeGeometry(ovalShape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 3,
      });
    }
    
    if (shape === "dogtag") {
      const tagShape = new THREE.Shape();
      const r = height * 0.3;
      tagShape.moveTo(-width / 2 + r, -height / 2);
      tagShape.lineTo(width / 2 - r, -height / 2);
      tagShape.arc(0, r, r, -Math.PI / 2, Math.PI / 2, false);
      tagShape.lineTo(-width / 2 + r, height / 2);
      tagShape.arc(0, -r, r, Math.PI / 2, -Math.PI / 2, false);
      return new THREE.ExtrudeGeometry(tagShape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 3,
      });
    }
    
    if (shape === "heart") {
      const heartShape = new THREE.Shape();
      const scale = Math.min(width, height) / 60;
      heartShape.moveTo(0, -20 * scale);
      heartShape.bezierCurveTo(25 * scale, -35 * scale, 40 * scale, 0, 0, 30 * scale);
      heartShape.bezierCurveTo(-40 * scale, 0, -25 * scale, -35 * scale, 0, -20 * scale);
      return new THREE.ExtrudeGeometry(heartShape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 3,
      });
    }
    
    if (shape === "bone") {
      const boneShape = new THREE.Shape();
      const knobRadius = height * 0.35;
      const bodyWidth = width - knobRadius * 2;
      
      boneShape.moveTo(-bodyWidth / 2, height * 0.15);
      boneShape.lineTo(bodyWidth / 2, height * 0.15);
      boneShape.arc(0, knobRadius * 0.5, knobRadius * 0.5, -Math.PI / 2, Math.PI / 2, false);
      boneShape.lineTo(-bodyWidth / 2, height * 0.15 + knobRadius);
      boneShape.arc(0, -knobRadius * 0.5, knobRadius * 0.5, Math.PI / 2, -Math.PI / 2, false);
      
      return new THREE.ExtrudeGeometry(boneShape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        bevelSegments: 3,
      });
    }
    
    return new THREE.BoxGeometry(width, height, depth);
  }, [settings.shape, settings.width, settings.height, settings.depth]);

  const batteryGeometry = useMemo(() => {
    const { batteryType } = settings;
    if (batteryType === "cr2032" || batteryType === "cr2025" || batteryType === "cr2016") {
      const thickness = batteryType === "cr2032" ? 3.2 : batteryType === "cr2025" ? 2.5 : 1.6;
      return new THREE.CylinderGeometry(10, 10, thickness, 32);
    }
    if (batteryType === "2xAAA") {
      return new THREE.BoxGeometry(25, 10, 44);
    }
    return new THREE.BoxGeometry(15, 5, 20);
  }, [settings.batteryType]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      
      {settings.keychainHole && (
        <mesh
          position={[
            settings.keychainHolePosition === "top_left" ? -settings.width * 0.35 :
            settings.keychainHolePosition === "top_right" ? settings.width * 0.35 : 0,
            settings.height * 0.4,
            settings.depth / 2
          ]}
        >
          <torusGeometry args={[settings.keychainHoleDiameter / 2, 1, 8, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      
      <BatteryPocket settings={settings} batteryGeometry={batteryGeometry} />
      
      {settings.ledChannelEnabled && (
        <mesh position={[0, 0, settings.depth / 2 + 0.5]}>
          <torusGeometry args={[Math.min(settings.width, settings.height) * 0.35, settings.ledChannelWidth / 4, 8, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      <TextPreview text={settings.text} settings={settings} textPaths={textPaths} pathBounds={pathBounds} />
    </group>
  );
}

function TextPreview({ text, settings, textPaths, pathBounds }: { 
  text: string; 
  settings: KeychainState;
  textPaths: TextPath[];
  pathBounds: { width: number; height: number } | null;
}) {
  const textGeometry = useMemo(() => {
    if (textPaths.length === 0 || !pathBounds) return null;
    
    const targetWidth = settings.width * 0.7;
    const scaleFactor = targetWidth / Math.max(pathBounds.width, 1);
    
    const shapes: THREE.Shape[] = [];
    
    for (const path of textPaths) {
      if (path.points.length < 3) continue;
      
      const shape = new THREE.Shape();
      const firstPt = path.points[0];
      shape.moveTo(firstPt.x * scaleFactor, -firstPt.y * scaleFactor);
      
      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        shape.lineTo(pt.x * scaleFactor, -pt.y * scaleFactor);
      }
      
      if (path.closed) {
        shape.closePath();
      }
      
      shapes.push(shape);
    }
    
    if (shapes.length === 0) return null;
    
    const outerShapes: THREE.Shape[] = [];
    const holeShapes: THREE.Shape[] = [];
    
    for (const shape of shapes) {
      const pts = shape.getPoints();
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y;
        area -= pts[j].x * pts[i].y;
      }
      area /= 2;
      
      if (area < 0) {
        outerShapes.push(shape);
      } else {
        holeShapes.push(shape);
      }
    }
    
    const isPointInShape = (pt: THREE.Vector2, shape: THREE.Shape): boolean => {
      const pts = shape.getPoints();
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        if ((pts[i].y > pt.y) !== (pts[j].y > pt.y) &&
            pt.x < (pts[j].x - pts[i].x) * (pt.y - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x) {
          inside = !inside;
        }
      }
      return inside;
    };
    
    for (const hole of holeShapes) {
      const holePts = hole.getPoints();
      if (holePts.length === 0) continue;
      const testPt = holePts[0];
      
      for (const outer of outerShapes) {
        if (isPointInShape(testPt, outer)) {
          outer.holes.push(new THREE.Path(holePts));
          break;
        }
      }
    }
    
    if (outerShapes.length === 0) return null;
    
    const textDepth = settings.textStyle === "embossed" || settings.textStyle === "outline" 
      ? settings.textDepth 
      : settings.textStyle === "engraved" || settings.textStyle === "recessed"
        ? settings.textDepth * 0.5
        : 1;
    
    const geometry = new THREE.ExtrudeGeometry(outerShapes, {
      depth: textDepth,
      bevelEnabled: false,
    });
    
    geometry.center();
    return geometry;
  }, [textPaths, pathBounds, settings.width, settings.textStyle, settings.textDepth]);

  if (!text || !textGeometry) return null;
  
  const textZ = settings.textStyle === "embossed" || settings.textStyle === "outline"
    ? settings.depth / 2 + settings.textDepth / 2
    : settings.textStyle === "engraved" || settings.textStyle === "recessed"
      ? settings.depth / 2 - settings.textDepth / 4
      : settings.depth / 2 + 0.5;
  
  const textColor = settings.textStyle === "embossed" || settings.textStyle === "outline"
    ? "#60a5fa"
    : settings.textStyle === "engraved" || settings.textStyle === "recessed"
      ? "#1e3a8a"
      : settings.textStyle === "hollow"
        ? "#fbbf24"
        : "#3b82f6";

  return (
    <mesh geometry={textGeometry} position={[0, 0, textZ]}>
      <meshStandardMaterial 
        color={textColor} 
        roughness={0.3}
        metalness={0.2}
        transparent={settings.textStyle === "hollow"}
        opacity={settings.textStyle === "hollow" ? 0.5 : 1}
      />
    </mesh>
  );
}

export default function LEDKeychainEditor() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("shape");
  const [textPaths, setTextPaths] = useState<TextPath[]>([]);
  const [pathBounds, setPathBounds] = useState<{ width: number; height: number } | null>(null);
  
  const [settings, setSettings] = useState<KeychainState>({
    text: "MILES",
    shape: "dogtag",
    width: 60,
    height: 35,
    depth: 12,
    textStyle: "embossed",
    textDepth: 2,
    ledType: "neon_tube_4mm",
    ledChannelEnabled: true,
    ledChannelWidth: 6,
    ledChannelDepth: 4,
    batteryType: "cr2032",
    batterySlideIn: true,
    switchPosition: "side_right",
    switchCutoutWidth: 8,
    switchCutoutHeight: 4,
    wiringChannelEnabled: true,
    wiringChannelDiameter: 2,
    keychainHole: true,
    keychainHoleDiameter: 5,
    keychainHolePosition: "top",
    wallThickness: 2,
    diffuserEnabled: true,
    diffuserThickness: 1,
    splitHalves: true,
  });

  const updateSettings = (updates: Partial<KeychainState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const text = settings.text.trim();
    if (!text) {
      setTextPaths([]);
      setPathBounds(null);
      return;
    }
    
    const fetchPaths = async () => {
      try {
        const response = await fetch("/api/preview/text-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text, 
            fontId: "OpenSans-Bold",
            fontSize: 50 
          }),
        });
        
        if (response.ok) {
          const data: TextPathResponse = await response.json();
          setTextPaths(data.paths);
          setPathBounds({ width: data.bounds.width, height: data.bounds.height });
        }
      } catch (error) {
        console.error("Failed to fetch text paths:", error);
      }
    };
    
    fetchPaths();
  }, [settings.text]);

  const handleExport = async () => {
    if (!settings.text.trim()) {
      toast({ title: "Name required", description: "Please enter text for the keychain", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/generate/led-keychain", settings);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${settings.text.toLowerCase().replace(/\s+/g, "_")}_keychain.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: "Export Complete!", description: `Downloaded keychain design for "${settings.text}"` });
    } catch (error) {
      toast({ title: "Export Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-800">
        <Canvas shadows camera={{ position: [0, 0, 150], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          <pointLight position={[-10, -10, 10]} intensity={0.5} color="#fbbf24" />
          <Suspense fallback={null}>
            <Center>
              <Keychain3DPreview settings={settings} textPaths={textPaths} pathBounds={pathBounds} />
            </Center>
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
        
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            <KeyRound className="h-3 w-3 mr-1" />
            LED Keychain Designer
          </Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {settings.width}×{settings.height}×{settings.depth}mm
          </Badge>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-center">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 border">
            <p className="text-xs text-muted-foreground text-center">
              Battery-powered LED keychain with slide-in {batteryLabels[settings.batteryType]} holder
            </p>
          </div>
        </div>
      </div>
      
      <ScrollArea className="w-96 border-l bg-sidebar">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                LED Keychain
              </h2>
              <p className="text-xs text-muted-foreground">
                Battery-powered illuminated tags for pets & more
              </p>
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={handleExport}
            disabled={isExporting || !settings.text.trim()}
            data-testid="button-export-keychain"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Export Keychain"}
          </Button>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="shape" data-testid="tab-shape">
                <Dog className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="led" data-testid="tab-led">
                <Lightbulb className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="power" data-testid="tab-power">
                <Battery className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="wiring" data-testid="tab-wiring">
                <Cable className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="shape" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Text & Shape</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pet Name / Text</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.text}
                        onChange={(e) => updateSettings({ text: e.target.value.toUpperCase() })}
                        placeholder="MILES"
                        maxLength={12}
                        className="text-lg font-bold uppercase flex-1"
                        data-testid="input-keychain-text"
                      />
                      <EmojiPicker onSelect={(emoji) => updateSettings({ text: (settings.text + emoji).slice(0, 12).toUpperCase() })} />
                    </div>
                    <p className="text-xs text-muted-foreground">{settings.text.length}/12 characters</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shape</Label>
                    <Select
                      value={settings.shape}
                      onValueChange={(v) => updateSettings({ shape: v as KeychainShape })}
                    >
                      <SelectTrigger data-testid="select-shape">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keychainShapes.map((shape) => (
                          <SelectItem key={shape} value={shape}>
                            {shapeLabels[shape]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Text Style</Label>
                    <Select
                      value={settings.textStyle}
                      onValueChange={(v) => updateSettings({ textStyle: v as KeychainTextStyle })}
                    >
                      <SelectTrigger data-testid="select-text-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keychainTextStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {textStyleLabels[style]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Width</Label>
                      <Input
                        type="number"
                        value={settings.width}
                        onChange={(e) => updateSettings({ width: Number(e.target.value) })}
                        min={30}
                        max={120}
                        data-testid="input-width"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height</Label>
                      <Input
                        type="number"
                        value={settings.height}
                        onChange={(e) => updateSettings({ height: Number(e.target.value) })}
                        min={20}
                        max={80}
                        data-testid="input-height"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Depth</Label>
                      <Input
                        type="number"
                        value={settings.depth}
                        onChange={(e) => updateSettings({ depth: Number(e.target.value) })}
                        min={8}
                        max={25}
                        data-testid="input-depth"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Text Depth</Label>
                      <span className="text-xs text-muted-foreground">{settings.textDepth}mm</span>
                    </div>
                    <Slider
                      value={[settings.textDepth]}
                      onValueChange={([v]) => updateSettings({ textDepth: v })}
                      min={0.5}
                      max={5}
                      step={0.5}
                      data-testid="slider-text-depth"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Keychain Hole</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Keychain Hole</Label>
                    <Switch
                      checked={settings.keychainHole}
                      onCheckedChange={(v) => updateSettings({ keychainHole: v })}
                      data-testid="switch-keychain-hole"
                    />
                  </div>
                  
                  {settings.keychainHole && (
                    <>
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={settings.keychainHolePosition}
                          onValueChange={(v) => updateSettings({ keychainHolePosition: v as "top" | "top_left" | "top_right" })}
                        >
                          <SelectTrigger data-testid="select-hole-position">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top Center</SelectItem>
                            <SelectItem value="top_left">Top Left</SelectItem>
                            <SelectItem value="top_right">Top Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">Hole Diameter</Label>
                          <span className="text-xs text-muted-foreground">{settings.keychainHoleDiameter}mm</span>
                        </div>
                        <Slider
                          value={[settings.keychainHoleDiameter]}
                          onValueChange={([v]) => updateSettings({ keychainHoleDiameter: v })}
                          min={3}
                          max={8}
                          step={0.5}
                          data-testid="slider-hole-diameter"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="led" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    LED Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>LED Type</Label>
                    <Select
                      value={settings.ledType}
                      onValueChange={(v) => updateSettings({ ledType: v as KeychainLedType })}
                    >
                      <SelectTrigger data-testid="select-led-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keychainLedTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ledTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>LED Channel</Label>
                    <Switch
                      checked={settings.ledChannelEnabled}
                      onCheckedChange={(v) => updateSettings({ ledChannelEnabled: v })}
                      data-testid="switch-led-channel"
                    />
                  </div>
                  
                  {settings.ledChannelEnabled && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">Channel Width</Label>
                          <span className="text-xs text-muted-foreground">{settings.ledChannelWidth}mm</span>
                        </div>
                        <Slider
                          value={[settings.ledChannelWidth]}
                          onValueChange={([v]) => updateSettings({ ledChannelWidth: v })}
                          min={2}
                          max={12}
                          step={0.5}
                          data-testid="slider-channel-width"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">Channel Depth</Label>
                          <span className="text-xs text-muted-foreground">{settings.ledChannelDepth}mm</span>
                        </div>
                        <Slider
                          value={[settings.ledChannelDepth]}
                          onValueChange={([v]) => updateSettings({ ledChannelDepth: v })}
                          min={2}
                          max={8}
                          step={0.5}
                          data-testid="slider-channel-depth"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Label>Diffuser Cover</Label>
                    <Switch
                      checked={settings.diffuserEnabled}
                      onCheckedChange={(v) => updateSettings({ diffuserEnabled: v })}
                      data-testid="switch-diffuser"
                    />
                  </div>
                  
                  {settings.diffuserEnabled && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Diffuser Thickness</Label>
                        <span className="text-xs text-muted-foreground">{settings.diffuserThickness}mm</span>
                      </div>
                      <Slider
                        value={[settings.diffuserThickness]}
                        onValueChange={([v]) => updateSettings({ diffuserThickness: v })}
                        min={0.5}
                        max={2}
                        step={0.1}
                        data-testid="slider-diffuser-thickness"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="power" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Battery className="h-4 w-4" />
                    Battery Holder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Battery Type</Label>
                    <Select
                      value={settings.batteryType}
                      onValueChange={(v) => updateSettings({ batteryType: v as KeychainBatteryType })}
                    >
                      <SelectTrigger data-testid="select-battery-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keychainBatteryTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {batteryLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {settings.batteryType.startsWith("cr") 
                        ? "Coin cell - compact, easy to replace"
                        : settings.batteryType === "2xAAA"
                        ? "AAA cells - more capacity, larger size"
                        : "Rechargeable LiPo - smallest, needs USB charging"
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Slide-In Battery Holder</Label>
                      <p className="text-xs text-muted-foreground">Easy battery swap without tools</p>
                    </div>
                    <Switch
                      checked={settings.batterySlideIn}
                      onCheckedChange={(v) => updateSettings({ batterySlideIn: v })}
                      data-testid="switch-slide-in"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4" />
                    Switch Placement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Switch Position</Label>
                    <Select
                      value={settings.switchPosition}
                      onValueChange={(v) => updateSettings({ switchPosition: v as KeychainSwitchPosition })}
                    >
                      <SelectTrigger data-testid="select-switch-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keychainSwitchPositions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {switchLabels[pos]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Cutout Width</Label>
                      <Input
                        type="number"
                        value={settings.switchCutoutWidth}
                        onChange={(e) => updateSettings({ switchCutoutWidth: Number(e.target.value) })}
                        min={4}
                        max={12}
                        data-testid="input-switch-width"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cutout Height</Label>
                      <Input
                        type="number"
                        value={settings.switchCutoutHeight}
                        onChange={(e) => updateSettings({ switchCutoutHeight: Number(e.target.value) })}
                        min={2}
                        max={8}
                        data-testid="input-switch-height"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="wiring" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cable className="h-4 w-4" />
                    Wiring Channels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Internal Wiring Channels</Label>
                      <p className="text-xs text-muted-foreground">Route wires cleanly inside</p>
                    </div>
                    <Switch
                      checked={settings.wiringChannelEnabled}
                      onCheckedChange={(v) => updateSettings({ wiringChannelEnabled: v })}
                      data-testid="switch-wiring-channel"
                    />
                  </div>
                  
                  {settings.wiringChannelEnabled && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Channel Diameter</Label>
                        <span className="text-xs text-muted-foreground">{settings.wiringChannelDiameter}mm</span>
                      </div>
                      <Slider
                        value={[settings.wiringChannelDiameter]}
                        onValueChange={([v]) => updateSettings({ wiringChannelDiameter: v })}
                        min={1.5}
                        max={4}
                        step={0.5}
                        data-testid="slider-wiring-diameter"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 2mm for thin wire, 3mm for thicker gauge
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Construction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Wall Thickness</Label>
                      <span className="text-xs text-muted-foreground">{settings.wallThickness}mm</span>
                    </div>
                    <Slider
                      value={[settings.wallThickness]}
                      onValueChange={([v]) => updateSettings({ wallThickness: v })}
                      min={1}
                      max={4}
                      step={0.5}
                      data-testid="slider-wall-thickness"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Split Into Halves</Label>
                      <p className="text-xs text-muted-foreground">Print as two pieces that snap together</p>
                    </div>
                    <Switch
                      checked={settings.splitHalves}
                      onCheckedChange={(v) => updateSettings({ splitHalves: v })}
                      data-testid="switch-split-halves"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• CR2032 batteries last 20-50 hours of continuous use</li>
                    <li>• EL wire is brightest and most flexible for curves</li>
                    <li>• Split halves make LED installation much easier</li>
                    <li>• Side switches are easiest to operate one-handed</li>
                    <li>• Print diffusers in white PETG for best glow</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
