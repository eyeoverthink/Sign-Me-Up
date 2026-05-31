import { useState, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
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
import { useToast } from "@/hooks/use-toast";
import { 
  type HolographicPanelSettings,
  type HoloPatternType,
  type HoloLayer,
  holoPatternTypes,
  defaultHolographicPanelSettings,
} from "@shared/schema";
import { 
  Download, 
  Layers,
  Settings,
  Box,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Palette,
} from "lucide-react";

function generatePatternTexture(patternType: HoloPatternType, density: number, scale: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 2 / scale;
  
  const count = Math.floor(density / 5);
  
  switch (patternType) {
    case "floral":
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const petals = 5 + Math.floor(Math.random() * 3);
        const r = 20 + Math.random() * 30;
        ctx.beginPath();
        for (let j = 0; j < petals; j++) {
          const angle = (j / petals) * Math.PI * 2;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(px + 10, py + 10, px, py);
        }
        ctx.stroke();
      }
      break;
    case "geometric":
      for (let i = 0; i < count / 2; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const sides = 6;
        const r = 30 + Math.random() * 40;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const angle = (j / sides) * Math.PI * 2;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      break;
    case "mandala":
      const cx = 256, cy = 256;
      for (let ring = 0; ring < count / 3; ring++) {
        const r = 40 + ring * 50;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * 250, cy + Math.sin(angle) * 250);
          ctx.stroke();
        }
      }
      break;
    case "wave":
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        const yOffset = (i / count) * 512;
        for (let x = 0; x <= 512; x += 10) {
          const y = yOffset + Math.sin(x * 0.02 + i) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    case "circuit":
      for (let i = 0; i < count; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          const dir = Math.random() > 0.5;
          if (dir) x += (Math.random() - 0.5) * 80;
          else y += (Math.random() - 0.5) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "nature":
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.ellipse(x, y, 25, 15, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 25, y);
        ctx.lineTo(x + 25, y);
        ctx.stroke();
      }
      break;
    default:
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 30, 0, Math.PI * 2);
        ctx.stroke();
      }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function HoloLayer3D({ 
  layer, 
  index, 
  totalLayers,
  settings 
}: { 
  layer: HoloLayer; 
  index: number; 
  totalLayers: number;
  settings: HolographicPanelSettings;
}) {
  const texture = useMemo(() => 
    generatePatternTexture(layer.patternType, layer.patternDensity, layer.patternScale),
    [layer.patternType, layer.patternDensity, layer.patternScale]
  );
  
  const zPosition = (index - (totalLayers - 1) / 2) * (settings.layerSpacing / 20);
  const width = settings.panelWidth / 50;
  const height = settings.panelHeight / 50;
  
  const layerOpacity = (layer.opacity ?? 100) / 100;
  const layerColor = layer.tintColor || "#ffffff";
  
  return (
    <mesh position={[0, 0, zPosition]} rotation={[0, 0, (layer.rotation * Math.PI) / 180]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial 
        map={texture}
        transparent
        opacity={layerOpacity * 0.8}
        side={THREE.DoubleSide}
        color={layerColor}
      />
    </mesh>
  );
}

function Frame3D({ settings }: { settings: HolographicPanelSettings }) {
  const width = settings.panelWidth / 50;
  const height = settings.panelHeight / 50;
  const frameWidth = 0.2;
  const depth = (settings.layerCount * settings.layerSpacing) / 20 + 0.3;
  
  return (
    <group>
      <mesh position={[0, height / 2 + frameWidth / 2, 0]}>
        <boxGeometry args={[width + frameWidth * 2, frameWidth, depth]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, -height / 2 - frameWidth / 2, 0]}>
        <boxGeometry args={[width + frameWidth * 2, frameWidth, depth]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-width / 2 - frameWidth / 2, 0, 0]}>
        <boxGeometry args={[frameWidth, height, depth]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[width / 2 + frameWidth / 2, 0, 0]}>
        <boxGeometry args={[frameWidth, height, depth]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

function HolographicPreview({ settings }: { settings: HolographicPanelSettings }) {
  const ledColor = settings.ledColor || "#4488ff";
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[0, 0, -3]} intensity={0.5} color={ledColor} />
      
      <Frame3D settings={settings} />
      
      {settings.layers.slice(0, settings.layerCount).map((layer, index) => (
        <HoloLayer3D 
          key={index} 
          layer={layer} 
          index={index} 
          totalLayers={settings.layerCount}
          settings={settings}
        />
      ))}
      
      <Grid 
        position={[0, -3, 0]} 
        args={[20, 20]} 
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={30}
      />
      
      <PerspectiveCamera makeDefault position={[6, 4, 8]} />
      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

const patternLabels: Record<HoloPatternType, string> = {
  "floral": "Floral / Vine",
  "geometric": "Geometric Shapes",
  "mandala": "Mandala",
  "wave": "Flowing Waves",
  "circuit": "Circuit Board",
  "nature": "Nature Elements",
  "abstract": "Abstract",
  "custom": "Custom Pattern",
};

const patternDescriptions: Record<HoloPatternType, string> = {
  "floral": "Intricate floral and vine patterns inspired by Art Nouveau",
  "geometric": "Hexagonal and geometric tessellations",
  "mandala": "Circular, symmetrical mandala designs",
  "wave": "Flowing wave lines creating dynamic movement",
  "circuit": "Tech-inspired circuit board patterns",
  "nature": "Organic leaves and natural forms",
  "abstract": "Abstract flowing shapes",
  "custom": "Upload your own pattern",
};

const effectPresets = [
  {
    name: "Sunset Glow",
    description: "Warm gradient with floral patterns",
    layers: [
      { patternType: "floral" as HoloPatternType, opacity: 100, tintColor: "#ff6b35" },
      { patternType: "wave" as HoloPatternType, opacity: 70, tintColor: "#f7c59f" },
      { patternType: "abstract" as HoloPatternType, opacity: 50, tintColor: "#efa00b" },
    ],
    ledColor: "#ff8c42",
  },
  {
    name: "Ocean Depth",
    description: "Cool blues with wave patterns",
    layers: [
      { patternType: "wave" as HoloPatternType, opacity: 100, tintColor: "#0077b6" },
      { patternType: "nature" as HoloPatternType, opacity: 75, tintColor: "#00b4d8" },
      { patternType: "abstract" as HoloPatternType, opacity: 55, tintColor: "#90e0ef" },
    ],
    ledColor: "#0096c7",
  },
  {
    name: "Forest Magic",
    description: "Natural greens with organic patterns",
    layers: [
      { patternType: "nature" as HoloPatternType, opacity: 100, tintColor: "#2d6a4f" },
      { patternType: "floral" as HoloPatternType, opacity: 80, tintColor: "#40916c" },
      { patternType: "wave" as HoloPatternType, opacity: 60, tintColor: "#74c69d" },
    ],
    ledColor: "#52b788",
  },
  {
    name: "Cyberpunk Neon",
    description: "Electric purples and pinks",
    layers: [
      { patternType: "circuit" as HoloPatternType, opacity: 100, tintColor: "#7b2cbf" },
      { patternType: "geometric" as HoloPatternType, opacity: 85, tintColor: "#c77dff" },
      { patternType: "abstract" as HoloPatternType, opacity: 65, tintColor: "#e0aaff" },
    ],
    ledColor: "#9d4edd",
  },
  {
    name: "Zen Garden",
    description: "Peaceful neutrals with mandala patterns",
    layers: [
      { patternType: "mandala" as HoloPatternType, opacity: 100, tintColor: "#6c757d" },
      { patternType: "wave" as HoloPatternType, opacity: 70, tintColor: "#adb5bd" },
      { patternType: "nature" as HoloPatternType, opacity: 50, tintColor: "#dee2e6" },
    ],
    ledColor: "#f8f9fa",
  },
  {
    name: "Aurora Borealis",
    description: "Northern lights color palette",
    layers: [
      { patternType: "wave" as HoloPatternType, opacity: 100, tintColor: "#2a9d8f" },
      { patternType: "abstract" as HoloPatternType, opacity: 80, tintColor: "#8338ec" },
      { patternType: "geometric" as HoloPatternType, opacity: 60, tintColor: "#3a86ff" },
    ],
    ledColor: "#06d6a0",
  },
];

export default function HolographicPanelEditor() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<HolographicPanelSettings>(defaultHolographicPanelSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("layers");

  const updateSettings = <K extends keyof HolographicPanelSettings>(
    key: K,
    value: HolographicPanelSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateLayer = (layerIndex: number, updates: Partial<HoloLayer>) => {
    setSettings(prev => {
      const newLayers = [...prev.layers];
      if (newLayers[layerIndex]) {
        newLayers[layerIndex] = { ...newLayers[layerIndex], ...updates };
      }
      return { ...prev, layers: newLayers };
    });
  };

  const setLayerCount = (count: number) => {
    const newLayers: HoloLayer[] = [];
    for (let i = 0; i < count; i++) {
      if (settings.layers[i]) {
        newLayers.push(settings.layers[i]);
      } else {
        newLayers.push({
          layerIndex: i,
          patternType: "floral",
          patternDensity: 40 - i * 10,
          patternScale: 1 + i * 0.2,
          rotation: i * 15,
          opacity: 100 - i * 20,
          tintColor: "#ffffff",
        });
      }
    }
    setSettings(prev => ({ ...prev, layerCount: count, layers: newLayers }));
  };

  const applyEffectPreset = (preset: typeof effectPresets[number]) => {
    const newLayers = settings.layers.map((layer, i) => ({
      ...layer,
      patternType: preset.layers[i]?.patternType || layer.patternType,
      opacity: preset.layers[i]?.opacity || layer.opacity || 100,
      tintColor: preset.layers[i]?.tintColor || layer.tintColor || "#ffffff",
    }));
    setSettings(prev => ({
      ...prev,
      layers: newLayers,
      ledColor: preset.ledColor,
    }));
    toast({
      title: "Effect Applied",
      description: `Applied "${preset.name}" color theme`,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/holographic-panel", {
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
      a.download = `holographic_panel_${settings.layerCount}layers.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${settings.layerCount}-layer holographic panel`,
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

  const totalDepth = settings.layerCount * settings.layerThickness + (settings.layerCount - 1) * settings.layerSpacing + 10;

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="h-[350px] bg-gradient-to-b from-slate-900 to-slate-800 relative">
          <Canvas>
            <Suspense fallback={null}>
              <HolographicPreview settings={settings} />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-2 left-2 text-xs text-white/60">
            Drag to rotate | Scroll to zoom
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Multi-Layer Holographic Panel
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create stunning 3D depth effects with stacked pattern layers and LED backlighting
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Panel Width: {settings.panelWidth}mm</Label>
                  <Slider
                    value={[settings.panelWidth]}
                    onValueChange={([v]) => updateSettings("panelWidth", v)}
                    min={50}
                    max={400}
                    step={10}
                    data-testid="slider-panel-width"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Panel Height: {settings.panelHeight}mm</Label>
                  <Slider
                    value={[settings.panelHeight]}
                    onValueChange={([v]) => updateSettings("panelHeight", v)}
                    min={50}
                    max={500}
                    step={10}
                    data-testid="slider-panel-height"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Layers: {settings.layerCount}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLayerCount(Math.max(2, settings.layerCount - 1))}
                    disabled={settings.layerCount <= 2}
                    data-testid="button-layer-minus"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[settings.layerCount]}
                    onValueChange={([v]) => setLayerCount(v)}
                    min={2}
                    max={5}
                    step={1}
                    className="flex-1"
                    data-testid="slider-layer-count"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLayerCount(Math.min(5, settings.layerCount + 1))}
                    disabled={settings.layerCount >= 5}
                    data-testid="button-layer-plus"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Effect Presets
                </Label>
                <div className="flex flex-wrap gap-2">
                  {effectPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => applyEffectPreset(preset)}
                      className="text-xs"
                      data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: preset.ledColor }}
                      />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="layers" data-testid="tab-layers">
                    <Layers className="h-4 w-4 mr-2" />
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="frame" data-testid="tab-frame">
                    <Box className="h-4 w-4 mr-2" />
                    Frame
                  </TabsTrigger>
                  <TabsTrigger value="settings" data-testid="tab-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="layers" className="space-y-4 mt-4">
                  {settings.layers.slice(0, settings.layerCount).map((layer, index) => (
                    <Card key={index}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Layer {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={layer.tintColor || "#ffffff"}
                              onChange={(e) => updateLayer(index, { tintColor: e.target.value })}
                              className="w-8 h-8 p-0 border-0"
                              data-testid={`input-layer-${index}-color`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {index === 0 ? "(Front)" : index === settings.layerCount - 1 ? "(Back)" : ""}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Pattern</Label>
                            <Select
                              value={layer.patternType}
                              onValueChange={(v) => updateLayer(index, { patternType: v as HoloPatternType })}
                            >
                              <SelectTrigger data-testid={`select-layer-${index}-pattern`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {holoPatternTypes.filter(p => p !== "custom").map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {patternLabels[type]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Opacity: {layer.opacity || 100}%</Label>
                            <Slider
                              value={[layer.opacity || 100]}
                              onValueChange={([v]) => updateLayer(index, { opacity: v })}
                              min={20}
                              max={100}
                              step={5}
                              data-testid={`slider-layer-${index}-opacity`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Density: {layer.patternDensity}%</Label>
                            <Slider
                              value={[layer.patternDensity]}
                              onValueChange={([v]) => updateLayer(index, { patternDensity: v })}
                              min={10}
                              max={80}
                              step={5}
                              data-testid={`slider-layer-${index}-density`}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Scale: {layer.patternScale.toFixed(1)}x</Label>
                            <Slider
                              value={[layer.patternScale]}
                              onValueChange={([v]) => updateLayer(index, { patternScale: v })}
                              min={0.5}
                              max={2.5}
                              step={0.1}
                              data-testid={`slider-layer-${index}-scale`}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              Rotation: {layer.rotation}°
                            </Label>
                            <Slider
                              value={[layer.rotation]}
                              onValueChange={([v]) => updateLayer(index, { rotation: v })}
                              min={0}
                              max={90}
                              step={5}
                              data-testid={`slider-layer-${index}-rotation`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="space-y-2">
                    <Label>Layer Spacing: {settings.layerSpacing}mm</Label>
                    <Slider
                      value={[settings.layerSpacing]}
                      onValueChange={([v]) => updateSettings("layerSpacing", v)}
                      min={3}
                      max={20}
                      step={1}
                      data-testid="slider-layer-spacing"
                    />
                    <p className="text-xs text-muted-foreground">
                      Distance between layers - larger spacing creates more pronounced depth effect
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="frame" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-frame"
                      checked={settings.includeFrame}
                      onCheckedChange={(v) => updateSettings("includeFrame", v)}
                      data-testid="switch-include-frame"
                    />
                    <Label htmlFor="include-frame">Include Frame</Label>
                  </div>

                  {settings.includeFrame && (
                    <>
                      <div className="space-y-2">
                        <Label>Frame Thickness: {settings.frameThickness}mm</Label>
                        <Slider
                          value={[settings.frameThickness]}
                          onValueChange={([v]) => updateSettings("frameThickness", v)}
                          min={2}
                          max={10}
                          step={1}
                          data-testid="slider-frame-thickness"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Frame Style</Label>
                        <Select
                          value={settings.frameStyle}
                          onValueChange={(v) => updateSettings("frameStyle", v as "simple" | "beveled" | "rounded")}
                        >
                          <SelectTrigger data-testid="select-frame-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple (Flat edges)</SelectItem>
                            <SelectItem value="beveled">Beveled (Angled edges)</SelectItem>
                            <SelectItem value="rounded">Rounded (Soft edges)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-led"
                      checked={settings.includeLedChannel}
                      onCheckedChange={(v) => updateSettings("includeLedChannel", v)}
                      data-testid="switch-include-led"
                    />
                    <Label htmlFor="include-led">Include LED Channel</Label>
                  </div>

                  {settings.includeLedChannel && (
                    <>
                      <div className="space-y-2">
                        <Label>LED Strip Width: {settings.ledStripWidth}mm</Label>
                        <Slider
                          value={[settings.ledStripWidth]}
                          onValueChange={([v]) => updateSettings("ledStripWidth", v)}
                          min={8}
                          max={20}
                          step={1}
                          data-testid="slider-led-width"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>LED Type</Label>
                          <Select
                            value={settings.ledType}
                            onValueChange={(v) => updateSettings("ledType", v as "simple" | "ws2812" | "cob" | "filament")}
                          >
                            <SelectTrigger data-testid="select-led-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Simple LED Strip</SelectItem>
                              <SelectItem value="ws2812">WS2812B (Addressable RGB)</SelectItem>
                              <SelectItem value="cob">COB Strip (High Density)</SelectItem>
                              <SelectItem value="filament">LED Filament</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Backlight Color
                          </Label>
                          <Input
                            type="color"
                            value={settings.ledColor || "#ffffff"}
                            onChange={(e) => updateSettings("ledColor", e.target.value)}
                            className="w-full h-10"
                            data-testid="input-led-color"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Layer Thickness: {settings.layerThickness}mm</Label>
                    <Slider
                      value={[settings.layerThickness]}
                      onValueChange={([v]) => updateSettings("layerThickness", v)}
                      min={0.8}
                      max={3}
                      step={0.1}
                      data-testid="slider-layer-thickness"
                    />
                    <p className="text-xs text-muted-foreground">
                      Thinner layers allow more light through for better glow
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-mounting"
                      checked={settings.includeMountingBrackets}
                      onCheckedChange={(v) => updateSettings("includeMountingBrackets", v)}
                      data-testid="switch-mounting"
                    />
                    <Label htmlFor="include-mounting">Include Mounting Brackets</Label>
                  </div>

                  {settings.includeMountingBrackets && (
                    <div className="space-y-2">
                      <Label>Wall Standoff: {settings.wallStandoff}mm</Label>
                      <Slider
                        value={[settings.wallStandoff]}
                        onValueChange={([v]) => updateSettings("wallStandoff", v)}
                        min={5}
                        max={30}
                        step={5}
                        data-testid="slider-standoff"
                      />
                      <p className="text-xs text-muted-foreground">
                        Distance from wall - creates ambient glow around panel edges
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-spacers"
                      checked={settings.includeSpacerRings}
                      onCheckedChange={(v) => updateSettings("includeSpacerRings", v)}
                      data-testid="switch-spacers"
                    />
                    <Label htmlFor="include-spacers">Include Spacer Rings</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="separate-layers"
                      checked={settings.exportLayersSeparate}
                      onCheckedChange={(v) => updateSettings("exportLayersSeparate", v)}
                      data-testid="switch-separate"
                    />
                    <Label htmlFor="separate-layers">Export Layers as Separate Files</Label>
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
            {isExporting ? "Generating..." : `Export Holographic Panel (${settings.layerCount} layers)`}
          </Button>
          </div>
        </div>
      </div>

      <div className="w-80 border-l bg-sidebar p-4 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Panel Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{settings.panelWidth} x {settings.panelHeight}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Layers:</span>
              <span>{settings.layerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Depth:</span>
              <span>{totalDepth.toFixed(1)}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Layer Spacing:</span>
              <span>{settings.layerSpacing}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LED Type:</span>
              <span>{settings.includeLedChannel ? settings.ledType : "None"}</span>
            </div>
            <Separator className="my-2" />
            <div className="text-muted-foreground">Files included:</div>
            <ul className="space-y-1">
              {settings.layers.slice(0, settings.layerCount).map((layer, i) => (
                <li key={i}>layer_{i + 1}_{layer.patternType}.stl</li>
              ))}
              {settings.includeFrame && <li>frame.stl</li>}
              {settings.includeLedChannel && <li>led_channel.stl</li>}
              {settings.includeMountingBrackets && <li>mounting_brackets.stl</li>}
              {settings.includeSpacerRings && <li>spacer_rings.stl</li>}
              <li>README.md</li>
              <li>manifest.json</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Printing Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground">
            <p>Use translucent or white filament for best light diffusion</p>
            <p>Print at 0.2mm layer height for smooth patterns</p>
            <p>20-30% infill is sufficient</p>
            <p>PETG works great for durability + transparency</p>
            <p>Consider silk or matte PLA for unique effects</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
