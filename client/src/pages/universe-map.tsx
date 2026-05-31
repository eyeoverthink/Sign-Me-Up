import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Globe, Star, Orbit, Loader2, Layers, Box, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as THREE from "three";

// Celestial body data
const CELESTIAL_BODIES = [
  { id: "sun", name: "Sun", type: "star", color: "#FDB813", radius: 20, orbit: 0 },
  { id: "mercury", name: "Mercury", type: "planet", color: "#B5B5B5", radius: 2, orbit: 30 },
  { id: "venus", name: "Venus", type: "planet", color: "#E6E6AA", radius: 4, orbit: 45 },
  { id: "earth", name: "Earth", type: "planet", color: "#6B93D6", radius: 4.5, orbit: 60 },
  { id: "moon", name: "Moon", type: "moon", color: "#C4C4C4", radius: 1.2, orbit: 8, parent: "earth" },
  { id: "mars", name: "Mars", type: "planet", color: "#C1440E", radius: 3, orbit: 80 },
  { id: "jupiter", name: "Jupiter", type: "planet", color: "#D8CA9D", radius: 12, orbit: 110 },
  { id: "saturn", name: "Saturn", type: "planet", color: "#F4D59E", radius: 10, orbit: 145, hasRings: true },
  { id: "uranus", name: "Uranus", type: "planet", color: "#D1E7E7", radius: 6, orbit: 180 },
  { id: "neptune", name: "Neptune", type: "planet", color: "#5B5DDF", radius: 5.5, orbit: 210 },
  { id: "pluto", name: "Pluto", type: "dwarf", color: "#E8D4B8", radius: 1, orbit: 240 }
];

const CONSTELLATIONS = [
  { id: "orion", name: "Orion", description: "The Hunter" },
  { id: "ursa_major", name: "Ursa Major", description: "The Great Bear" },
  { id: "cassiopeia", name: "Cassiopeia", description: "The Queen" },
  { id: "scorpius", name: "Scorpius", description: "The Scorpion" },
  { id: "leo", name: "Leo", description: "The Lion" }
];

// Planet component
function Planet({ body, selected, onClick, time }: { 
  body: typeof CELESTIAL_BODIES[0]; 
  selected: boolean;
  onClick: () => void;
  time: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitSpeed = body.orbit > 0 ? 0.2 / body.orbit : 0;
  
  useFrame(() => {
    if (meshRef.current && body.orbit > 0) {
      const angle = time * orbitSpeed;
      meshRef.current.position.x = Math.cos(angle) * body.orbit;
      meshRef.current.position.z = Math.sin(angle) * body.orbit;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group>
      {/* Orbit path */}
      {body.orbit > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.orbit - 0.1, body.orbit + 0.1, 64]} />
          <meshBasicMaterial color="#333355" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Planet */}
      <mesh 
        ref={meshRef}
        onClick={onClick}
        position={[body.orbit, 0, 0]}
      >
        <sphereGeometry args={[body.radius, 32, 32]} />
        <meshStandardMaterial 
          color={body.color} 
          emissive={body.type === "star" ? body.color : "#000000"}
          emissiveIntensity={body.type === "star" ? 0.5 : 0}
        />
        
        {/* Selection indicator */}
        {selected && (
          <mesh>
            <ringGeometry args={[body.radius + 2, body.radius + 2.5, 32]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
        
        {/* Saturn's rings */}
        {body.hasRings && (
          <mesh rotation={[Math.PI / 6, 0, 0]}>
            <ringGeometry args={[body.radius + 3, body.radius + 8, 64]} />
            <meshStandardMaterial 
              color="#D4AF37" 
              transparent 
              opacity={0.7} 
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        
        {/* Label */}
        <Html position={[0, body.radius + 3, 0]} center>
          <div className="text-xs text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap">
            {body.name}
          </div>
        </Html>
      </mesh>
    </group>
  );
}

// Solar System view
function SolarSystem({ selectedBody, onSelect }: { 
  selectedBody: string | null; 
  onSelect: (id: string) => void;
}) {
  const [time, setTime] = useState(0);
  
  useFrame((state, delta) => {
    setTime(prev => prev + delta);
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#FDB813" />
      
      {CELESTIAL_BODIES.filter(b => !b.parent).map(body => (
        <Planet 
          key={body.id}
          body={body}
          selected={selectedBody === body.id}
          onClick={() => onSelect(body.id)}
          time={time}
        />
      ))}
      
      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        minDistance={30}
        maxDistance={400}
      />
    </>
  );
}

export default function UniverseMapPage() {
  const { toast } = useToast();
  const [selectedBody, setSelectedBody] = useState<string | null>("earth");
  const [selectedConstellation, setSelectedConstellation] = useState<string>("orion");
  const [viewMode, setViewMode] = useState<"solar" | "constellation">("solar");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Generation options
  const [printSize, setPrintSize] = useState(80);
  const [detail, setDetail] = useState<"low" | "medium" | "high" | "ultra">("high");
  const [surfaceAmplitude, setSurfaceAmplitude] = useState(2);
  const [includeRings, setIncludeRings] = useState(true);
  const [lithophane, setLithophane] = useState(false);
  const [format, setFormat] = useState<"stl" | "obj" | "svg">("stl");

  const selectedBodyData = CELESTIAL_BODIES.find(b => b.id === selectedBody);
  const selectedConstellationData = CONSTELLATIONS.find(c => c.id === selectedConstellation);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const endpoint = viewMode === "solar" 
        ? `/api/universe/body/${selectedBody}`
        : `/api/universe/constellation/${selectedConstellation}`;
      
      const params = new URLSearchParams({
        printSize: printSize.toString(),
        detail,
        surfaceAmplitude: surfaceAmplitude.toString(),
        includeRings: includeRings.toString(),
        lithophane: lithophane.toString(),
        format
      });
      
      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error("Generation failed");
      }
      
      const blob = await response.blob();
      const filename = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") 
        || `universe_${viewMode === "solar" ? selectedBody : selectedConstellation}.${format}`;
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: `${filename} is ready for 3D printing!`
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Globe className="w-8 h-8 text-blue-500" />
            Universe Map
          </h1>
          <p className="text-muted-foreground">
            Explore the cosmos and create 3D printable celestial objects
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 3D View */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <Orbit className="w-5 h-5" />
                  {viewMode === "solar" ? "Solar System" : "Constellations"}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "solar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("solar")}
                    data-testid="button-solar-view"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    Planets
                  </Button>
                  <Button
                    variant={viewMode === "constellation" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("constellation")}
                    data-testid="button-constellation-view"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Constellations
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] bg-black rounded-lg overflow-hidden">
                <Canvas camera={{ position: [0, 100, 200], fov: 60 }}>
                  <SolarSystem 
                    selectedBody={selectedBody}
                    onSelect={setSelectedBody}
                  />
                </Canvas>
              </div>
              
              {/* Quick select for constellation mode */}
              {viewMode === "constellation" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONSTELLATIONS.map(c => (
                    <Button
                      key={c.id}
                      variant={selectedConstellation === c.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedConstellation(c.id)}
                      data-testid={`button-constellation-${c.id}`}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* Selection Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Selected Object</CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === "solar" && selectedBodyData ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: selectedBodyData.color }}
                      />
                      <div>
                        <h3 className="font-bold">{selectedBodyData.name}</h3>
                        <Badge variant="secondary">{selectedBodyData.type}</Badge>
                      </div>
                    </div>
                  </div>
                ) : viewMode === "constellation" && selectedConstellationData ? (
                  <div className="space-y-2">
                    <h3 className="font-bold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      {selectedConstellationData.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConstellationData.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Click a planet to select</p>
                )}
              </CardContent>
            </Card>

            {/* Generation Options */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  Print Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Print Size */}
                <div className="space-y-2">
                  <Label>Print Size: {printSize}mm</Label>
                  <Slider
                    value={[printSize]}
                    onValueChange={([v]) => setPrintSize(v)}
                    min={20}
                    max={200}
                    step={5}
                    data-testid="slider-print-size"
                  />
                </div>

                {/* Detail Level */}
                <div className="space-y-2">
                  <Label>Detail Level</Label>
                  <Select value={detail} onValueChange={(v: any) => setDetail(v)}>
                    <SelectTrigger data-testid="select-detail">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Fast)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="ultra">Ultra (Slow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Surface Amplitude */}
                <div className="space-y-2">
                  <Label>Surface Detail: {surfaceAmplitude}</Label>
                  <Slider
                    value={[surfaceAmplitude]}
                    onValueChange={([v]) => setSurfaceAmplitude(v)}
                    min={0}
                    max={10}
                    step={0.5}
                    data-testid="slider-amplitude"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="rings">Include Rings (Saturn)</Label>
                  <Switch
                    id="rings"
                    checked={includeRings}
                    onCheckedChange={setIncludeRings}
                    data-testid="switch-rings"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="lithophane">Lithophane Mode</Label>
                  <Switch
                    id="lithophane"
                    checked={lithophane}
                    onCheckedChange={setLithophane}
                    data-testid="switch-lithophane"
                  />
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                    <SelectTrigger data-testid="select-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stl">STL (3D Print)</SelectItem>
                      <SelectItem value="obj">OBJ (3D Model)</SelectItem>
                      <SelectItem value="svg">SVG (2D Projection)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || (!selectedBody && viewMode === "solar")}
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download {format.toUpperCase()}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><Layers className="w-3 h-3 inline mr-1" />Lithophane: Thin shell that glows when backlit</p>
                  <p><Box className="w-3 h-3 inline mr-1" />Topographical: Real surface detail for printing</p>
                  <p><FileType className="w-3 h-3 inline mr-1" />STL/OBJ: 3D printer compatible</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Planet Quick Select */}
        {viewMode === "solar" && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {CELESTIAL_BODIES.filter(b => !b.parent).map(body => (
                  <Button
                    key={body.id}
                    variant={selectedBody === body.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBody(body.id)}
                    className="gap-1"
                    data-testid={`button-planet-${body.id}`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: body.color }}
                    />
                    {body.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
