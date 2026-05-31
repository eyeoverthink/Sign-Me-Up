import { useState, useRef, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Layers, Download, Mountain, Building2, Image, Type, 
  Lightbulb, Frame, Search, Loader2, MapPin, Sun, Moon, 
  Palette, Box, RotateCcw
} from "lucide-react";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
          <div className="text-center p-4">
            <Box className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">3D Preview</p>
            <p className="text-xs text-muted-foreground">Layered Light Box</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface LayerData {
  id: number;
  name: string;
  depth: number;
  color: string;
  opacity: number;
  visible: boolean;
  shapes: Array<{type: string; points: number[][]; fill: boolean}>;
}

interface LayeredLightboxSettings {
  sceneType: "terrain" | "city" | "custom" | "sunset";
  
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  layerCount: number;
  layerSpacing: number;
  
  showFrame: boolean;
  frameThickness: number;
  frameStyle: "simple" | "stepped" | "beveled";
  
  ledEnabled: boolean;
  ledType: "ws2812b" | "cob_8mm" | "cob_10mm" | "neon_flex";
  ledPosition: "top" | "bottom" | "all_edges";
  ledChannelDepth: number;
  
  showTextPlate: boolean;
  textContent: string;
  textPosition: "top" | "bottom";
  textHeight: number;
  
  locationName: string;
  latitude: number;
  longitude: number;
  areaSize: number;
  
  terrainElevationScale: number;
  
  customImageData: string | null;
  
  layers: LayerData[];
  isLoading: boolean;
}

const defaultSettings: LayeredLightboxSettings = {
  sceneType: "sunset",
  boxWidth: 150,
  boxHeight: 150,
  boxDepth: 30,
  layerCount: 5,
  layerSpacing: 5,
  showFrame: true,
  frameThickness: 8,
  frameStyle: "simple",
  ledEnabled: true,
  ledType: "cob_8mm",
  ledPosition: "all_edges",
  ledChannelDepth: 10,
  showTextPlate: true,
  textContent: "SINCE AUGUST 4th, 2022",
  textPosition: "top",
  textHeight: 8,
  locationName: "",
  latitude: 37.7749,
  longitude: -122.4194,
  areaSize: 1,
  terrainElevationScale: 1.0,
  customImageData: null,
  layers: [],
  isLoading: false,
};

const LAYER_COLORS = [
  "#87CEEB", // Sky blue (back)
  "#FFB347", // Peach/sunset
  "#FF6B6B", // Coral
  "#4ECDC4", // Teal
  "#2C3E50", // Dark blue (front)
];

function generateSunsetLayers(count: number): LayerData[] {
  const layers: LayerData[] = [];
  const colors = ["#87CEEB", "#FDB750", "#F97316", "#DC2626", "#1E3A5F"];
  
  for (let i = 0; i < count; i++) {
    const depth = i / (count - 1);
    layers.push({
      id: i,
      name: i === 0 ? "Sky" : i === count - 1 ? "Foreground" : `Layer ${i + 1}`,
      depth,
      color: colors[i % colors.length],
      opacity: 0.9,
      visible: true,
      shapes: [],
    });
  }
  return layers;
}

function generateTerrainLayers(count: number): LayerData[] {
  const layers: LayerData[] = [];
  const colors = ["#1a472a", "#2d5a37", "#3d6b45", "#4a7c53", "#5c9464", "#6ba573", "#8bb888", "#a5c9a5"];
  
  for (let i = 0; i < count; i++) {
    const depth = i / (count - 1);
    layers.push({
      id: i,
      name: i === 0 ? "Base" : i === count - 1 ? "Peak" : `Elevation ${i + 1}`,
      depth,
      color: colors[i % colors.length],
      opacity: 0.95,
      visible: true,
      shapes: [],
    });
  }
  return layers;
}

function generateCityLayers(count: number): LayerData[] {
  const layers: LayerData[] = [];
  const colors = ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"];
  
  for (let i = 0; i < count; i++) {
    const depth = i / (count - 1);
    layers.push({
      id: i,
      name: i === 0 ? "Background" : i === count - 1 ? "Foreground" : `Buildings ${i}`,
      depth,
      color: colors[i % colors.length],
      opacity: 0.92,
      visible: true,
      shapes: [],
    });
  }
  return layers;
}

function generateLayersForSceneType(sceneType: string, count: number): LayerData[] {
  switch (sceneType) {
    case "terrain":
      return generateTerrainLayers(count);
    case "city":
      return generateCityLayers(count);
    case "sunset":
    default:
      return generateSunsetLayers(count);
  }
}

function LayerPreview({ settings }: { settings: LayeredLightboxSettings }) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = 0.02;
  const w = settings.boxWidth * scale;
  const h = settings.boxHeight * scale;
  const totalDepth = settings.boxDepth * scale;
  const layerSpacing = settings.layerSpacing * scale;
  const frameT = settings.frameThickness * scale;
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  const layers = settings.layers.length > 0 ? settings.layers : generateSunsetLayers(settings.layerCount);

  return (
    <group ref={groupRef}>
      {settings.showFrame && (
        <>
          <mesh position={[0, h/2 + frameT/2, 0]}>
            <boxGeometry args={[w + frameT * 2, frameT, totalDepth + frameT]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
          <mesh position={[0, -h/2 - frameT/2, 0]}>
            <boxGeometry args={[w + frameT * 2, frameT, totalDepth + frameT]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
          <mesh position={[-w/2 - frameT/2, 0, 0]}>
            <boxGeometry args={[frameT, h, totalDepth + frameT]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
          <mesh position={[w/2 + frameT/2, 0, 0]}>
            <boxGeometry args={[frameT, h, totalDepth + frameT]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
          <mesh position={[0, 0, -totalDepth/2 - frameT/4]}>
            <boxGeometry args={[w + frameT * 2, h + frameT * 2, frameT/2]} />
            <meshStandardMaterial color="#6B7280" />
          </mesh>
        </>
      )}

      {layers.map((layer, i) => {
        const zPos = (i - (layers.length - 1) / 2) * layerSpacing;
        const waveOffset = Math.sin(i * 0.8) * 0.05;
        
        return (
          <group key={layer.id} position={[0, 0, zPos]}>
            <mesh position={[0, waveOffset * h, 0]}>
              <planeGeometry args={[w * 0.95, h * 0.95]} />
              <meshStandardMaterial 
                color={layer.color}
                transparent
                opacity={layer.opacity}
                side={THREE.DoubleSide}
              />
            </mesh>
            
            {i > 0 && i < layers.length - 1 && (
              <>
                <mesh position={[0, -h * 0.3 + i * 0.1, 0.001]}>
                  <planeGeometry args={[w * 0.8, h * 0.15]} />
                  <meshStandardMaterial 
                    color={layer.color}
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {settings.ledEnabled && (
        <>
          <pointLight position={[0, h/2 + 0.1, totalDepth/2]} intensity={0.8} color="#FFF5E6" distance={3} />
          <pointLight position={[0, -h/2 - 0.1, totalDepth/2]} intensity={0.8} color="#FFF5E6" distance={3} />
          <pointLight position={[-w/2 - 0.1, 0, totalDepth/2]} intensity={0.6} color="#FFF5E6" distance={3} />
          <pointLight position={[w/2 + 0.1, 0, totalDepth/2]} intensity={0.6} color="#FFF5E6" distance={3} />
        </>
      )}

      {settings.showTextPlate && (
        <mesh position={[0, settings.textPosition === "top" ? h * 0.35 : -h * 0.35, totalDepth/2 + 0.05]}>
          <boxGeometry args={[w * 0.6, settings.textHeight * scale, 0.02]} />
          <meshStandardMaterial color="#E5E7EB" />
        </mesh>
      )}
    </group>
  );
}

export function LayeredLightboxEditor() {
  const [settings, setSettings] = useState<LayeredLightboxSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("scene");
  const { toast } = useToast();

  const updateSettings = <K extends keyof LayeredLightboxSettings>(
    key: K,
    value: LayeredLightboxSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const layers = generateLayersForSceneType(settings.sceneType, settings.layerCount);
    updateSettings("layers", layers);
  }, [settings.layerCount, settings.sceneType]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/layered-lightbox", {
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
      a.download = `layered_lightbox_${settings.sceneType}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${settings.layerCount} layer STL files + frame exported`,
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

  const searchLocation = async () => {
    if (!settings.locationName.trim()) return;
    
    updateSettings("isLoading", true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(settings.locationName)}&limit=1`,
        { headers: { "User-Agent": "SignCraft3D/1.0" } }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        updateSettings("latitude", parseFloat(data[0].lat));
        updateSettings("longitude", parseFloat(data[0].lon));
        toast({ title: "Location Found", description: data[0].display_name.split(",")[0] });
      }
    } catch (error) {
      toast({ title: "Search Failed", variant: "destructive" });
    } finally {
      updateSettings("isLoading", false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            Layered Light Box Designer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="scene" className="text-xs">Scene</TabsTrigger>
              <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
              <TabsTrigger value="frame" className="text-xs">Frame</TabsTrigger>
              <TabsTrigger value="lighting" className="text-xs">LEDs</TabsTrigger>
            </TabsList>

            <TabsContent value="scene" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scene Type</Label>
                <Select
                  value={settings.sceneType}
                  onValueChange={(v) => updateSettings("sceneType", v as typeof settings.sceneType)}
                >
                  <SelectTrigger data-testid="select-scene-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunset">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" /> Sunset Scene
                      </div>
                    </SelectItem>
                    <SelectItem value="terrain">
                      <div className="flex items-center gap-2">
                        <Mountain className="h-4 w-4" /> Terrain / Topographic
                      </div>
                    </SelectItem>
                    <SelectItem value="city">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> City Map
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" /> Custom Image
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(settings.sceneType === "terrain" || settings.sceneType === "city") && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search location..."
                      value={settings.locationName}
                      onChange={(e) => updateSettings("locationName", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                      data-testid="input-location-search"
                    />
                    <Button size="icon" onClick={searchLocation} disabled={settings.isLoading} data-testid="button-search-location">
                      {settings.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={settings.latitude}
                        onChange={(e) => updateSettings("latitude", parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={settings.longitude}
                        onChange={(e) => updateSettings("longitude", parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Area Size: {settings.areaSize} km</Label>
                    <Slider
                      value={[settings.areaSize]}
                      onValueChange={([v]) => updateSettings("areaSize", v)}
                      min={0.5}
                      max={5}
                      step={0.5}
                    />
                  </div>
                </div>
              )}

              {settings.sceneType === "custom" && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <Label className="text-sm">Upload Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          updateSettings("customImageData", ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    data-testid="input-custom-image"
                  />
                  <p className="text-xs text-muted-foreground">
                    Image will be converted to layers using Scott Algorithm
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Box Width (mm)</Label>
                  <Input
                    type="number"
                    value={settings.boxWidth}
                    onChange={(e) => updateSettings("boxWidth", parseInt(e.target.value) || 100)}
                    className="h-8"
                    data-testid="input-box-width"
                  />
                </div>
                <div>
                  <Label className="text-xs">Box Height (mm)</Label>
                  <Input
                    type="number"
                    value={settings.boxHeight}
                    onChange={(e) => updateSettings("boxHeight", parseInt(e.target.value) || 100)}
                    className="h-8"
                    data-testid="input-box-height"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Box Depth (mm): {settings.boxDepth}</Label>
                <Slider
                  value={[settings.boxDepth]}
                  onValueChange={([v]) => updateSettings("boxDepth", v)}
                  min={15}
                  max={60}
                  step={5}
                />
              </div>
            </TabsContent>

            <TabsContent value="layers" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Number of Layers: {settings.layerCount}
                </Label>
                <Slider
                  value={[settings.layerCount]}
                  onValueChange={([v]) => updateSettings("layerCount", v)}
                  min={3}
                  max={8}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Each layer = separate STL for multi-color printing
                </p>
              </div>

              <div>
                <Label className="text-xs">Layer Spacing (mm): {settings.layerSpacing}</Label>
                <Slider
                  value={[settings.layerSpacing]}
                  onValueChange={([v]) => updateSettings("layerSpacing", v)}
                  min={2}
                  max={10}
                  step={0.5}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Layer Preview</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(settings.layers.length > 0 ? settings.layers : generateSunsetLayers(settings.layerCount)).map((layer, i) => (
                    <div key={layer.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm flex-1">{layer.name}</span>
                      <span className="text-xs text-muted-foreground">Layer {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="frame" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Frame className="h-4 w-4" /> Include Frame
                </Label>
                <Switch
                  checked={settings.showFrame}
                  onCheckedChange={(v) => updateSettings("showFrame", v)}
                  data-testid="switch-show-frame"
                />
              </div>

              {settings.showFrame && (
                <>
                  <div>
                    <Label className="text-xs">Frame Thickness (mm): {settings.frameThickness}</Label>
                    <Slider
                      value={[settings.frameThickness]}
                      onValueChange={([v]) => updateSettings("frameThickness", v)}
                      min={4}
                      max={15}
                      step={1}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Frame Style</Label>
                    <Select
                      value={settings.frameStyle}
                      onValueChange={(v) => updateSettings("frameStyle", v as typeof settings.frameStyle)}
                    >
                      <SelectTrigger className="h-8" data-testid="select-frame-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple (flat)</SelectItem>
                        <SelectItem value="stepped">Stepped</SelectItem>
                        <SelectItem value="beveled">Beveled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Type className="h-4 w-4" /> Text Plate
                </Label>
                <Switch
                  checked={settings.showTextPlate}
                  onCheckedChange={(v) => updateSettings("showTextPlate", v)}
                  data-testid="switch-show-text"
                />
              </div>

              {settings.showTextPlate && (
                <>
                  <Textarea
                    placeholder="Enter text for plate..."
                    value={settings.textContent}
                    onChange={(e) => updateSettings("textContent", e.target.value)}
                    className="h-16 resize-none"
                    data-testid="input-text-plate"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Position</Label>
                      <Select
                        value={settings.textPosition}
                        onValueChange={(v) => updateSettings("textPosition", v as typeof settings.textPosition)}
                      >
                        <SelectTrigger className="h-8" data-testid="select-text-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Height (mm)</Label>
                      <Input
                        type="number"
                        value={settings.textHeight}
                        onChange={(e) => updateSettings("textHeight", parseInt(e.target.value) || 8)}
                        className="h-8"
                        data-testid="input-text-height"
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="lighting" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" /> Edge LED Lighting
                </Label>
                <Switch
                  checked={settings.ledEnabled}
                  onCheckedChange={(v) => updateSettings("ledEnabled", v)}
                  data-testid="switch-led-enabled"
                />
              </div>

              {settings.ledEnabled && (
                <>
                  <div>
                    <Label className="text-xs">LED Type</Label>
                    <Select
                      value={settings.ledType}
                      onValueChange={(v) => updateSettings("ledType", v as typeof settings.ledType)}
                    >
                      <SelectTrigger className="h-8" data-testid="select-led-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ws2812b">WS2812B Strip (12mm)</SelectItem>
                        <SelectItem value="cob_8mm">COB Strip (8mm)</SelectItem>
                        <SelectItem value="cob_10mm">COB Strip (10mm)</SelectItem>
                        <SelectItem value="neon_flex">Neon Flex (10mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">LED Position</Label>
                    <Select
                      value={settings.ledPosition}
                      onValueChange={(v) => updateSettings("ledPosition", v as typeof settings.ledPosition)}
                    >
                      <SelectTrigger className="h-8" data-testid="select-led-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_edges">All Edges</SelectItem>
                        <SelectItem value="top">Top Only</SelectItem>
                        <SelectItem value="bottom">Bottom Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">LED Channel Depth (mm): {settings.ledChannelDepth}</Label>
                    <Slider
                      value={[settings.ledChannelDepth]}
                      onValueChange={([v]) => updateSettings("ledChannelDepth", v)}
                      min={5}
                      max={20}
                      step={1}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          <Button 
            className="w-full" 
            onClick={handleExport} 
            disabled={isExporting}
            data-testid="button-layered-export"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Generating Layers..." : `Export ${settings.layerCount} Layer STLs`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Exports separate STL for each layer + frame for multi-color printing
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col min-h-[400px]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Box className="h-5 w-5" /> 3D Preview
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSettings({ ...defaultSettings })}
              data-testid="button-reset-layered"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <WebGLErrorBoundary>
            <Canvas className="w-full h-full rounded-lg bg-gradient-to-b from-slate-900 to-slate-800">
              <PerspectiveCamera makeDefault position={[0, 0, 8]} />
              <OrbitControls enablePan={true} enableZoom={true} />
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 5, 5]} intensity={0.6} />
              <directionalLight position={[-5, -5, -5]} intensity={0.3} />
              <LayerPreview settings={settings} />
            </Canvas>
          </WebGLErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
}
