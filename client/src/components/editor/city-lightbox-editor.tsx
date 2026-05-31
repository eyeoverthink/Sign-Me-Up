import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Component, ErrorInfo, ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Upload, 
  Download, 
  MapPin,
  Layers,
  Lightbulb,
  AlertTriangle,
  Search,
  Loader2,
  Move,
  Building2,
  Car,
  Waves,
  Frame,
  TreePine,
} from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("WebGL/3D rendering not available:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full flex items-center justify-center bg-slate-800 text-white/60">
          <div className="text-center p-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm">3D preview not available</p>
            <p className="text-xs mt-1">Export will still work normally</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface CityLightboxSettings {
  locationName: string;
  latitude: number;
  longitude: number;
  areaSize: number;
  modelWidth: number;
  modelHeight: number;
  baseThickness: number;
  showRoads: boolean;
  roadHeight: number;
  roadStyle: "raised" | "depressed";
  showBuildings: boolean;
  buildingHeight: number;
  buildingScale: number;
  showWater: boolean;
  waterStyle: "cutout" | "depressed";
  waterDepth: number;
  showFrame: boolean;
  frameHeight: number;
  frameThickness: number;
  showTerrain: boolean;
  terrainScale: number;
  ledChannels: boolean;
  ledType: "ws2812b" | "cob_8mm" | "cob_10mm";
  detailLevel: "low" | "medium" | "high" | "ultra";
  osmData: any | null;
  isLoading: boolean;
}

const defaultSettings: CityLightboxSettings = {
  locationName: "",
  latitude: 37.7749,
  longitude: -122.4194,
  areaSize: 1,
  modelWidth: 200,
  modelHeight: 200,
  baseThickness: 3,
  showRoads: true,
  roadHeight: 1.5,
  roadStyle: "raised",
  showBuildings: true,
  buildingHeight: 3,
  buildingScale: 1.0,
  showWater: true,
  waterStyle: "cutout",
  waterDepth: 2,
  showFrame: true,
  frameHeight: 8,
  frameThickness: 4,
  showTerrain: false,
  terrainScale: 1.0,
  ledChannels: true,
  ledType: "cob_8mm",
  detailLevel: "medium",
  osmData: null,
  isLoading: false,
};

function CityPreview({ settings }: { settings: CityLightboxSettings }) {
  const scale = 4; // Model scale for preview
  const width = scale;
  const height = scale;
  const baseH = settings.baseThickness / 30;
  const frameH = settings.frameHeight / 15;
  const frameT = settings.frameThickness / 30;
  const roadH = settings.roadHeight / 30;
  const bldH = (settings.buildingHeight * settings.buildingScale) / 15;

  // Road width based on type
  const getRoadWidth = (type: string) => {
    if (type === "primary" || type === "trunk") return 0.06;
    if (type === "secondary") return 0.045;
    if (type === "tertiary") return 0.035;
    return 0.025; // residential, unclassified
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 8, 5]} intensity={1} />
      <directionalLight position={[-3, 6, 2]} intensity={0.6} />
      
      {/* Base plate */}
      <mesh position={[0, baseH / 2, 0]}>
        <boxGeometry args={[width, baseH, height]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Frame */}
      {settings.showFrame && (
        <>
          <mesh position={[0, baseH + frameH / 2, -height / 2 + frameT / 2]}>
            <boxGeometry args={[width, frameH, frameT]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh position={[0, baseH + frameH / 2, height / 2 - frameT / 2]}>
            <boxGeometry args={[width, frameH, frameT]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh position={[-width / 2 + frameT / 2, baseH + frameH / 2, 0]}>
            <boxGeometry args={[frameT, frameH, height - frameT * 2]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh position={[width / 2 - frameT / 2, baseH + frameH / 2, 0]}>
            <boxGeometry args={[frameT, frameH, height - frameT * 2]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </>
      )}
      
      {/* Roads - rendered as connected polyline segments, clamped to bounds */}
      {settings.showRoads && settings.osmData?.roads && (
        <group position={[0, baseH + (settings.roadStyle === "raised" ? roadH / 2 : -roadH / 2), 0]}>
          {settings.osmData.roads.slice(0, 200).map((road: any, roadIdx: number) => {
            const roadWidth = getRoadWidth(road.type);
            const maxBound = (width / 2) - frameT;
            
            // New polyline format: road has a "path" array of points
            if (road.path && road.path.length >= 2) {
              return road.path.slice(0, -1).map((p1: any, i: number) => {
                const p2 = road.path[i + 1];
                
                // Skip segments outside bounds
                if (Math.abs(p1.x) > 1.1 || Math.abs(p1.y) > 1.1 || 
                    Math.abs(p2.x) > 1.1 || Math.abs(p2.y) > 1.1) return null;
                
                // Clamp coordinates to bounds
                const x1 = Math.max(-maxBound, Math.min(maxBound, p1.x * width / 2));
                const y1 = Math.max(-maxBound, Math.min(maxBound, p1.y * height / 2));
                const x2 = Math.max(-maxBound, Math.min(maxBound, p2.x * width / 2));
                const y2 = Math.max(-maxBound, Math.min(maxBound, p2.y * height / 2));
                
                const dx = x2 - x1;
                const dy = y2 - y1;
                const segLength = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                if (segLength < 0.005) return null;
                
                return (
                  <mesh 
                    key={`${roadIdx}-${i}`}
                    position={[(x1 + x2) / 2, 0, (y1 + y2) / 2]}
                    rotation={[0, -angle, 0]}
                  >
                    <boxGeometry args={[segLength, roadH, roadWidth]} />
                    <meshStandardMaterial color="#e5e5e5" />
                  </mesh>
                );
              });
            }
            
            // Legacy format fallback
            if (road.x !== undefined && road.length !== undefined) {
              if (Math.abs(road.x) > 1.1 || Math.abs(road.y) > 1.1) return null;
              
              const clampedX = Math.max(-maxBound, Math.min(maxBound, road.x * width / 2));
              const clampedY = Math.max(-maxBound, Math.min(maxBound, road.y * height / 2));
              const segLength = Math.max(road.length * width / 2, 0.02);
              
              return (
                <mesh 
                  key={roadIdx} 
                  position={[clampedX, 0, clampedY]}
                  rotation={[0, -(road.angle || 0), 0]}
                >
                  <boxGeometry args={[segLength, roadH, roadWidth]} />
                  <meshStandardMaterial color="#e5e5e5" />
                </mesh>
              );
            }
            
            return null;
          })}
        </group>
      )}
      
      {/* Buildings - properly sized cubes, clamped to frame bounds */}
      {settings.showBuildings && settings.osmData?.buildings && (
        <group position={[0, baseH, 0]}>
          {settings.osmData.buildings.slice(0, 400).map((bld: any, i: number) => {
            // Use actual normalized dimensions
            const bldW = Math.max(Math.min(bld.w * width / 2, 0.3), 0.03);
            const bldD = Math.max(Math.min(bld.h * height / 2, 0.3), 0.03);
            // Vary height slightly for realism
            const heightVar = 0.7 + (Math.sin(i * 0.7) * 0.3 + Math.cos(i * 1.3) * 0.3);
            const actualH = bldH * heightVar;
            
            // Clamp position to stay within frame bounds
            const maxBound = (width / 2) - frameT - bldW / 2;
            const posX = Math.max(-maxBound, Math.min(maxBound, bld.x * width / 2));
            const posZ = Math.max(-maxBound, Math.min(maxBound, bld.y * height / 2));
            
            // Skip buildings that are clearly outside the valid area
            if (Math.abs(bld.x) > 1.2 || Math.abs(bld.y) > 1.2) return null;
            
            return (
              <mesh 
                key={i} 
                position={[posX, actualH / 2, posZ]}
              >
                <boxGeometry args={[bldW, actualH, bldD]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
            );
          })}
        </group>
      )}
      
      {/* Water features */}
      {settings.showWater && settings.osmData?.water && (
        <group position={[0, settings.waterStyle === "cutout" ? baseH * 0.3 : baseH - settings.waterDepth / 30, 0]}>
          {settings.osmData.water.slice(0, 30).map((w: any, i: number) => (
            <mesh key={i} position={[w.x * width / 2, 0, w.y * height / 2]}>
              <boxGeometry args={[Math.max(w.w * width / 2, 0.1), 0.02, Math.max(w.h * height / 2, 0.1)]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      )}
      
      {settings.ledChannels && (
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[width * 0.85, 0.04, height * 0.85]} />
          <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={0.3} transparent opacity={0.5} />
        </mesh>
      )}
      
      <OrbitControls enablePan={false} />
      <Environment preset="city" />
    </>
  );
}

function LeafletMap({ 
  lat, 
  lng, 
  areaSize, 
  onLocationSelect 
}: { 
  lat: number; 
  lng: number; 
  areaSize: number;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (rectangleRef.current) {
      mapRef.current.removeLayer(rectangleRef.current);
    }

    const halfSize = areaSize / 2 / 111;
    const bounds: L.LatLngBoundsExpression = [
      [lat - halfSize, lng - halfSize * 1.3],
      [lat + halfSize, lng + halfSize * 1.3],
    ];

    rectangleRef.current = L.rectangle(bounds, {
      color: '#8b5cf6',
      weight: 2,
      fillOpacity: 0.2,
    }).addTo(mapRef.current);

  }, [lat, lng, areaSize]);

  return <div ref={containerRef} className="h-full w-full" />;
}

export default function CityLightboxEditor() {
  const [settings, setSettings] = useState<CityLightboxSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const updateSettings = useCallback(<K extends keyof CityLightboxSettings>(
    key: K, 
    value: CityLightboxSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "User-Agent": "SignCraft3D/1.0" } }
      );
      const results = await response.json();
      
      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        updateSettings("latitude", lat);
        updateSettings("longitude", lng);
        updateSettings("locationName", result.display_name.split(",")[0]);
        toast({
          title: "Location Found",
          description: result.display_name.substring(0, 50) + "...",
        });
        fetchOSMData(lat, lng, settings.areaSize);
      } else {
        toast({
          title: "Location Not Found",
          description: "Try a different search term",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not search for location",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    updateSettings("latitude", lat);
    updateSettings("longitude", lng);
    updateSettings("locationName", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    fetchOSMData(lat, lng, settings.areaSize);
  }, [settings.areaSize, updateSettings]);

  const fetchOSMData = async (lat: number, lng: number, areaKm: number) => {
    setIsFetchingData(true);
    updateSettings("osmData", null);
    
    try {
      const response = await fetch("/api/osm/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          latitude: lat, 
          longitude: lng, 
          areaSize: areaKm,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }
      
      const data = await response.json();
      updateSettings("osmData", data);
      
      toast({
        title: "Map Data Loaded",
        description: `${data.roads?.length || 0} roads, ${data.buildings?.length || 0} buildings, ${data.water?.length || 0} water features`,
      });
    } catch (error) {
      toast({
        title: "Data Fetch Failed",
        description: "Could not get map data for this location",
        variant: "destructive",
      });
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleAreaSizeChange = (size: number) => {
    updateSettings("areaSize", size);
  };

  const handleGenerateMesh = () => {
    if (settings.latitude && settings.longitude) {
      fetchOSMData(settings.latitude, settings.longitude, settings.areaSize);
    }
  };

  const handleExport = async () => {
    if (!settings.osmData) {
      toast({
        title: "No Map Data",
        description: "Please select a location and generate mesh first",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/export/city-lightbox", {
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
      const baseName = settings.locationName || "city";
      a.download = `${baseName.toLowerCase().replace(/\s+/g, "_")}_lightbox.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "City light box model downloaded",
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
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b bg-background flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search address, city, or neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pr-10"
              data-testid="input-city-search"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            data-testid="button-city-search"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <div className="h-[280px] relative flex-shrink-0">
          <LeafletMap
            lat={settings.latitude}
            lng={settings.longitude}
            areaSize={settings.areaSize}
            onLocationSelect={handleMapClick}
          />
          
          {isFetchingData && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
              <div className="bg-background rounded-lg p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Fetching map data...</span>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-2 left-2 bg-background/90 rounded px-2 py-1 text-xs z-[1000]">
            <Move className="h-3 w-3 inline mr-1" />
            Click to select area
          </div>
          <div className="absolute bottom-2 right-2 bg-background/90 rounded px-2 py-1 text-xs z-[1000]">
            {settings.areaSize}km × {settings.areaSize}km
          </div>
        </div>

        <div className="flex-1 min-h-[200px] bg-gradient-to-b from-slate-900 to-slate-800 relative">
          <WebGLErrorBoundary>
            <Canvas camera={{ position: [0, 6, 8], fov: 45 }}>
              <Suspense fallback={null}>
                <CityPreview settings={settings} />
              </Suspense>
            </Canvas>
          </WebGLErrorBoundary>
          
          <div className="absolute top-2 left-2 text-xs text-white/80 bg-black/50 rounded px-2 py-1">
            3D Preview
          </div>
          {settings.locationName && (
            <div className="absolute bottom-2 left-2 text-xs text-white/60">
              {settings.locationName}
            </div>
          )}
          <div className="absolute bottom-2 right-2 text-xs text-white/60">
            {settings.modelWidth}mm × {settings.modelHeight}mm
          </div>
        </div>
      </div>

      <div className="w-80 border-l bg-muted/30 flex flex-col overflow-hidden">
        <div className="p-3 border-b bg-background flex-shrink-0">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            City Light Box
          </h2>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Map Area</Label>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Size: {settings.areaSize}km × {settings.areaSize}km
                </Label>
                <Slider
                  value={[settings.areaSize]}
                  min={0.5}
                  max={5}
                  step={0.5}
                  onValueChange={([v]) => handleAreaSizeChange(v)}
                  className="mt-2"
                  data-testid="slider-city-area"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleGenerateMesh}
                disabled={isFetchingData}
                data-testid="button-generate-mesh"
              >
                {isFetchingData ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Mesh
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Model Size</Label>
              <div>
                <Label className="text-xs text-muted-foreground">Width: {settings.modelWidth}mm</Label>
                <Slider
                  value={[settings.modelWidth]}
                  min={100}
                  max={300}
                  step={10}
                  onValueChange={([v]) => updateSettings("modelWidth", v)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height: {settings.modelHeight}mm</Label>
                <Slider
                  value={[settings.modelHeight]}
                  min={100}
                  max={300}
                  step={10}
                  onValueChange={([v]) => updateSettings("modelHeight", v)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base: {settings.baseThickness}mm</Label>
                <Slider
                  value={[settings.baseThickness]}
                  min={2}
                  max={6}
                  step={0.5}
                  onValueChange={([v]) => updateSettings("baseThickness", v)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Car className="h-3 w-3" /> Roads
                </Label>
                <Switch
                  checked={settings.showRoads}
                  onCheckedChange={(v) => updateSettings("showRoads", v)}
                />
              </div>
              {settings.showRoads && (
                <>
                  <Select
                    value={settings.roadStyle}
                    onValueChange={(v) => updateSettings("roadStyle", v as "raised" | "depressed")}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raised">Raised (above base)</SelectItem>
                      <SelectItem value="depressed">Depressed (carved in)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height: {settings.roadHeight}mm</Label>
                    <Slider
                      value={[settings.roadHeight]}
                      min={0.5}
                      max={3}
                      step={0.25}
                      onValueChange={([v]) => updateSettings("roadHeight", v)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Buildings
                </Label>
                <Switch
                  checked={settings.showBuildings}
                  onCheckedChange={(v) => updateSettings("showBuildings", v)}
                />
              </div>
              {settings.showBuildings && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height: {settings.buildingHeight}mm</Label>
                    <Slider
                      value={[settings.buildingHeight]}
                      min={1}
                      max={8}
                      step={0.5}
                      onValueChange={([v]) => updateSettings("buildingHeight", v)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Scale: {settings.buildingScale}x</Label>
                    <Slider
                      value={[settings.buildingScale]}
                      min={0.5}
                      max={2}
                      step={0.1}
                      onValueChange={([v]) => updateSettings("buildingScale", v)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Waves className="h-3 w-3" /> Water
                </Label>
                <Switch
                  checked={settings.showWater}
                  onCheckedChange={(v) => updateSettings("showWater", v)}
                />
              </div>
              {settings.showWater && (
                <>
                  <Select
                    value={settings.waterStyle}
                    onValueChange={(v) => updateSettings("waterStyle", v as "cutout" | "depressed")}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cutout">Cut through (for LED glow)</SelectItem>
                      <SelectItem value="depressed">Depressed surface</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-xs text-muted-foreground">Depth: {settings.waterDepth}mm</Label>
                    <Slider
                      value={[settings.waterDepth]}
                      min={1}
                      max={4}
                      step={0.5}
                      onValueChange={([v]) => updateSettings("waterDepth", v)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Frame className="h-3 w-3" /> Frame
                </Label>
                <Switch
                  checked={settings.showFrame}
                  onCheckedChange={(v) => updateSettings("showFrame", v)}
                />
              </div>
              {settings.showFrame && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height: {settings.frameHeight}mm</Label>
                    <Slider
                      value={[settings.frameHeight]}
                      min={4}
                      max={15}
                      step={1}
                      onValueChange={([v]) => updateSettings("frameHeight", v)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Thickness: {settings.frameThickness}mm</Label>
                    <Slider
                      value={[settings.frameThickness]}
                      min={2}
                      max={8}
                      step={0.5}
                      onValueChange={([v]) => updateSettings("frameThickness", v)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-3 w-3" /> LED Backlighting
                </Label>
                <Switch
                  checked={settings.ledChannels}
                  onCheckedChange={(v) => updateSettings("ledChannels", v)}
                />
              </div>
              {settings.ledChannels && (
                <Select
                  value={settings.ledType}
                  onValueChange={(v) => updateSettings("ledType", v as typeof settings.ledType)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ws2812b">WS2812B Strip (12mm)</SelectItem>
                    <SelectItem value="cob_8mm">COB Strip (8mm)</SelectItem>
                    <SelectItem value="cob_10mm">COB Strip (10mm)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-3 w-3" /> Detail Level
              </Label>
              <Select
                value={settings.detailLevel}
                onValueChange={(v) => updateSettings("detailLevel", v as typeof settings.detailLevel)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (faster export)</SelectItem>
                  <SelectItem value="medium">Medium (balanced)</SelectItem>
                  <SelectItem value="high">High (more detail)</SelectItem>
                  <SelectItem value="ultra">Ultra (maximum detail)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher detail = more roads, buildings, and features rendered
              </p>
            </div>

            <Separator />

            <Button 
              className="w-full" 
              onClick={handleExport} 
              disabled={isExporting || !settings.osmData}
              data-testid="button-city-export"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Generating..." : "Export City Light Box"}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Downloads 3MF/STL with roads, buildings, water, and frame
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
