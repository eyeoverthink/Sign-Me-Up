import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, RotateCw, Orbit, Play, Pause, FastForward } from "lucide-react";
import * as THREE from "three";

interface CelestialBody {
  id: string;
  name: string;
  type: "star" | "planet" | "moon" | "dwarf";
  radius: number;
  distanceAU: number;
  color: string;
  hasRings?: boolean;
  parent?: string;
  orbitPeriodDays: number;
  rotationPeriodDays: number;
  tilt: number;
  description: string;
  mass?: string;
  temperature?: string;
}

interface Galaxy {
  id: string;
  name: string;
  type: "spiral" | "elliptical" | "irregular" | "lenticular";
  distanceLY: number;
  diameter: number;
  starCount: string;
  description: string;
  color: string;
}

interface NearbyStarSystem {
  id: string;
  name: string;
  distanceLY: number;
  spectralType: string;
  planets: number;
  description: string;
  color: string;
}

const SOLAR_SYSTEM: CelestialBody[] = [
  { id: "sun", name: "Sun", type: "star", radius: 696340, distanceAU: 0, color: "#FDB813", orbitPeriodDays: 0, rotationPeriodDays: 25.4, tilt: 7.25, description: "Our star - 4.6 billion years old", mass: "1.989 × 10³⁰ kg", temperature: "5,778 K surface" },
  { id: "mercury", name: "Mercury", type: "planet", radius: 2440, distanceAU: 0.39, color: "#B5B5B5", orbitPeriodDays: 88, rotationPeriodDays: 58.6, tilt: 0.03, description: "Smallest planet, closest to Sun", mass: "3.3 × 10²³ kg", temperature: "-180°C to 430°C" },
  { id: "venus", name: "Venus", type: "planet", radius: 6052, distanceAU: 0.72, color: "#E6C229", orbitPeriodDays: 225, rotationPeriodDays: 243, tilt: 177.4, description: "Hottest planet, rotates backwards", mass: "4.87 × 10²⁴ kg", temperature: "465°C average" },
  { id: "earth", name: "Earth", type: "planet", radius: 6371, distanceAU: 1.0, color: "#6B93D6", orbitPeriodDays: 365.25, rotationPeriodDays: 1, tilt: 23.4, description: "Our home - the blue marble", mass: "5.97 × 10²⁴ kg", temperature: "15°C average" },
  { id: "moon", name: "Moon", type: "moon", radius: 1737, distanceAU: 0.00257, color: "#C4C4C4", parent: "earth", orbitPeriodDays: 27.3, rotationPeriodDays: 27.3, tilt: 1.5, description: "Earth's natural satellite", mass: "7.35 × 10²² kg" },
  { id: "mars", name: "Mars", type: "planet", radius: 3390, distanceAU: 1.52, color: "#C1440E", orbitPeriodDays: 687, rotationPeriodDays: 1.03, tilt: 25.2, description: "The Red Planet", mass: "6.42 × 10²³ kg", temperature: "-65°C average" },
  { id: "jupiter", name: "Jupiter", type: "planet", radius: 69911, distanceAU: 5.2, color: "#D8CA9D", orbitPeriodDays: 4333, rotationPeriodDays: 0.41, tilt: 3.1, description: "Largest planet, Great Red Spot", mass: "1.9 × 10²⁷ kg", temperature: "-110°C cloud tops" },
  { id: "saturn", name: "Saturn", type: "planet", radius: 58232, distanceAU: 9.5, color: "#F4D59E", hasRings: true, orbitPeriodDays: 10759, rotationPeriodDays: 0.45, tilt: 26.7, description: "The ringed planet", mass: "5.68 × 10²⁶ kg", temperature: "-140°C" },
  { id: "uranus", name: "Uranus", type: "planet", radius: 25362, distanceAU: 19.2, color: "#B5E3E3", orbitPeriodDays: 30687, rotationPeriodDays: 0.72, tilt: 97.8, description: "Ice giant tilted on its side", mass: "8.68 × 10²⁵ kg", temperature: "-195°C" },
  { id: "neptune", name: "Neptune", type: "planet", radius: 24622, distanceAU: 30.1, color: "#5B5DDF", orbitPeriodDays: 60190, rotationPeriodDays: 0.67, tilt: 28.3, description: "Windiest planet, 2,100 km/h", mass: "1.02 × 10²⁶ kg", temperature: "-200°C" },
  { id: "pluto", name: "Pluto", type: "dwarf", radius: 1188, distanceAU: 39.5, color: "#E5D4C0", orbitPeriodDays: 90560, rotationPeriodDays: 6.4, tilt: 122.5, description: "Dwarf planet with heart shape", mass: "1.3 × 10²² kg", temperature: "-230°C" }
];

const GALAXIES: Galaxy[] = [
  { id: "milky_way", name: "Milky Way", type: "spiral", distanceLY: 0, diameter: 100000, starCount: "200-400 billion", description: "Our home galaxy - you are here!", color: "#E8E4D9" },
  { id: "andromeda", name: "Andromeda (M31)", type: "spiral", distanceLY: 2537000, diameter: 220000, starCount: "1 trillion", description: "Nearest major galaxy, approaching us", color: "#C9B8A8" },
  { id: "triangulum", name: "Triangulum (M33)", type: "spiral", distanceLY: 2730000, diameter: 60000, starCount: "40 billion", description: "Third largest in Local Group", color: "#A8C9E8" },
  { id: "large_magellanic", name: "Large Magellanic Cloud", type: "irregular", distanceLY: 158200, diameter: 14000, starCount: "30 billion", description: "Satellite galaxy, visible from southern hemisphere", color: "#D9E8FF" },
  { id: "small_magellanic", name: "Small Magellanic Cloud", type: "irregular", distanceLY: 199000, diameter: 7000, starCount: "3 billion", description: "Dwarf satellite galaxy", color: "#E8F0FF" },
  { id: "sombrero", name: "Sombrero Galaxy (M104)", type: "lenticular", distanceLY: 29350000, diameter: 50000, starCount: "100 billion", description: "Famous hat-shaped galaxy", color: "#FFE8D0" },
  { id: "whirlpool", name: "Whirlpool Galaxy (M51)", type: "spiral", distanceLY: 23160000, diameter: 76000, starCount: "160 billion", description: "Classic spiral with companion", color: "#D0E8FF" },
  { id: "centaurus_a", name: "Centaurus A", type: "elliptical", distanceLY: 12000000, diameter: 60000, starCount: "1 trillion", description: "Nearest active galaxy with jets", color: "#FFD0A0" }
];

const NEARBY_STARS: NearbyStarSystem[] = [
  { id: "proxima", name: "Proxima Centauri", distanceLY: 4.24, spectralType: "M5.5Ve (Red Dwarf)", planets: 3, description: "Nearest star to Sun, has exoplanet in habitable zone", color: "#FF6B6B" },
  { id: "alpha_centauri", name: "Alpha Centauri A/B", distanceLY: 4.37, spectralType: "G2V + K1V", planets: 0, description: "Binary star system, similar to our Sun", color: "#FFE066" },
  { id: "barnards", name: "Barnard's Star", distanceLY: 5.96, spectralType: "M4Ve (Red Dwarf)", planets: 1, description: "Fastest moving star in Earth's sky", color: "#FF8866" },
  { id: "wolf359", name: "Wolf 359", distanceLY: 7.86, spectralType: "M6.5Ve (Red Dwarf)", planets: 2, description: "Famous from Star Trek - Battle site!", color: "#FF5555" },
  { id: "sirius", name: "Sirius A/B", distanceLY: 8.6, spectralType: "A1V + DA2", planets: 0, description: "Brightest star in night sky", color: "#AADDFF" },
  { id: "ross154", name: "Ross 154", distanceLY: 9.69, spectralType: "M3.5Ve", planets: 0, description: "Flare star with sudden brightness", color: "#FF7777" },
  { id: "epsilon_eridani", name: "Epsilon Eridani", distanceLY: 10.5, spectralType: "K2V (Orange Dwarf)", planets: 2, description: "Young star with asteroid belt", color: "#FFB366" },
  { id: "tau_ceti", name: "Tau Ceti", distanceLY: 11.9, spectralType: "G8.5V", planets: 4, description: "Sun-like star, potential habitable planets", color: "#FFDD88" }
];

function OrbitingPlanet({ 
  body, 
  onClick, 
  selected,
  timeSpeed,
  isPaused
}: { 
  body: CelestialBody; 
  onClick: () => void; 
  selected: boolean;
  timeSpeed: number;
  isPaused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitAngleRef = useRef(Math.random() * Math.PI * 2);

  const displayRadius = body.type === "star" ? 2 : 
    body.type === "planet" ? Math.max(0.2, Math.log10(body.radius / 1000) * 0.4) :
    body.type === "moon" ? 0.15 : 0.12;

  const orbitRadius = body.type === "star" ? 0 : body.distanceAU * 2.5;

  useFrame((_, delta) => {
    if (isPaused) return;
    
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5 * (1 / Math.max(0.1, body.rotationPeriodDays));
    }
    
    if (body.type !== "star" && groupRef.current) {
      const orbitSpeed = (2 * Math.PI) / (body.orbitPeriodDays * 0.01);
      orbitAngleRef.current += delta * orbitSpeed * timeSpeed;
      
      groupRef.current.position.x = Math.cos(orbitAngleRef.current) * orbitRadius;
      groupRef.current.position.z = Math.sin(orbitAngleRef.current) * orbitRadius;
    }
  });

  return (
    <group ref={groupRef} position={[orbitRadius, 0, 0]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        rotation={[THREE.MathUtils.degToRad(body.tilt), 0, 0]}
      >
        <sphereGeometry args={[displayRadius, 32, 32]} />
        <meshStandardMaterial 
          color={body.color} 
          emissive={body.type === "star" ? body.color : "#000000"}
          emissiveIntensity={body.type === "star" ? 0.8 : 0}
        />
      </mesh>
      
      {body.hasRings && (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[displayRadius * 1.4, displayRadius * 2.3, 64]} />
          <meshStandardMaterial color="#C9B896" side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      )}

      {selected && (
        <>
          <mesh>
            <sphereGeometry args={[displayRadius * 1.2, 16, 16]} />
            <meshBasicMaterial color="#00ff00" wireframe />
          </mesh>
          <Html position={[0, displayRadius + 0.5, 0]} center>
            <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {body.name}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function OrbitRing({ radiusAU, color = "#333" }: { radiusAU: number; color?: string }) {
  const radius = radiusAU * 2.5;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return <Line points={points} color={color} lineWidth={0.5} transparent opacity={0.3} />;
}

function GalaxyView({ 
  galaxies, 
  selectedGalaxy, 
  onSelect 
}: { 
  galaxies: Galaxy[]; 
  selectedGalaxy: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars radius={200} depth={100} count={8000} factor={6} />
      
      {galaxies.map((galaxy, idx) => {
        const angle = (idx / galaxies.length) * Math.PI * 2;
        const distance = Math.log10(galaxy.distanceLY + 1) * 3;
        const size = Math.log10(galaxy.diameter) * 0.3;
        
        return (
          <group 
            key={galaxy.id} 
            position={[Math.cos(angle) * distance, (idx % 3 - 1) * 2, Math.sin(angle) * distance]}
          >
            <mesh onClick={() => onSelect(galaxy.id)}>
              {galaxy.type === "spiral" && <torusGeometry args={[size, size * 0.3, 8, 32]} />}
              {galaxy.type === "elliptical" && <sphereGeometry args={[size, 16, 16]} />}
              {galaxy.type === "irregular" && <icosahedronGeometry args={[size, 1]} />}
              {galaxy.type === "lenticular" && <cylinderGeometry args={[size, size, size * 0.2, 32]} />}
              <meshStandardMaterial 
                color={galaxy.color} 
                emissive={galaxy.color}
                emissiveIntensity={0.3}
                transparent
                opacity={0.8}
              />
            </mesh>
            {selectedGalaxy === galaxy.id && (
              <>
                <mesh>
                  <sphereGeometry args={[size * 1.5, 16, 16]} />
                  <meshBasicMaterial color="#00ffff" wireframe />
                </mesh>
                <Html position={[0, size + 1, 0]} center>
                  <div className="bg-black/90 text-white px-3 py-2 rounded text-xs max-w-48">
                    <div className="font-bold">{galaxy.name}</div>
                    <div className="text-gray-300">{galaxy.distanceLY.toLocaleString()} light years</div>
                  </div>
                </Html>
              </>
            )}
          </group>
        );
      })}

      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

function StarMapView({ 
  stars, 
  selectedStar, 
  onSelect 
}: { 
  stars: NearbyStarSystem[]; 
  selectedStar: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.1} />
      <Stars radius={150} depth={80} count={5000} factor={5} />
      
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#FDB813" emissive="#FDB813" emissiveIntensity={1} />
      </mesh>
      <Html position={[0, 0.6, 0]} center>
        <div className="text-yellow-400 text-xs font-bold">Sun (You are here)</div>
      </Html>
      
      {stars.map((star) => {
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * 2;
        const distance = star.distanceLY * 0.8;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = elevation * distance * 0.3;
        const size = 0.15 + (1 / star.distanceLY) * 0.3;
        
        return (
          <group key={star.id} position={[x, y, z]}>
            <mesh onClick={() => onSelect(star.id)}>
              <sphereGeometry args={[size, 16, 16]} />
              <meshStandardMaterial 
                color={star.color} 
                emissive={star.color}
                emissiveIntensity={0.8}
              />
            </mesh>
            {star.planets > 0 && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[size * 1.5, size * 2, 16]} />
                <meshBasicMaterial color="#666" transparent opacity={0.3} />
              </mesh>
            )}
            {selectedStar === star.id && (
              <>
                <mesh>
                  <sphereGeometry args={[size * 2, 16, 16]} />
                  <meshBasicMaterial color="#00ffff" wireframe />
                </mesh>
                <Html position={[0, size + 0.5, 0]} center>
                  <div className="bg-black/90 text-white px-3 py-2 rounded text-xs max-w-52">
                    <div className="font-bold">{star.name}</div>
                    <div className="text-gray-300">{star.distanceLY} light years</div>
                    {star.planets > 0 && <div className="text-green-400">{star.planets} known planets</div>}
                  </div>
                </Html>
              </>
            )}
          </group>
        );
      })}

      <OrbitControls enablePan enableZoom enableRotate />
    </>
  );
}

function SolarSystemScene({ 
  bodies, 
  selectedBody, 
  onSelectBody,
  showOrbits,
  timeSpeed,
  isPaused
}: { 
  bodies: CelestialBody[]; 
  selectedBody: string | null;
  onSelectBody: (id: string) => void;
  showOrbits: boolean;
  timeSpeed: number;
  isPaused: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#FDB813" distance={100} />
      <Stars radius={100} depth={50} count={5000} factor={4} />
      
      {showOrbits && bodies.filter(b => b.type !== "star" && b.type !== "moon").map((body) => (
        <OrbitRing key={`orbit-${body.id}`} radiusAU={body.distanceAU} />
      ))}

      {bodies.filter(b => b.type !== "moon").map((body) => (
        <OrbitingPlanet
          key={body.id}
          body={body}
          onClick={() => onSelectBody(body.id)}
          selected={selectedBody === body.id}
          timeSpeed={timeSpeed}
          isPaused={isPaused}
        />
      ))}

      <OrbitControls enablePan enableZoom enableRotate maxDistance={150} minDistance={2} />
    </>
  );
}

export default function UniverseEditor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"solar" | "stars" | "galaxies">("solar");
  const [selectedBody, setSelectedBody] = useState<string | null>("earth");
  const [selectedStar, setSelectedStar] = useState<string | null>(null);
  const [selectedGalaxy, setSelectedGalaxy] = useState<string | null>("milky_way");
  const [showOrbits, setShowOrbits] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [printSize, setPrintSize] = useState(80);
  const [detailLevel, setDetailLevel] = useState<"low" | "medium" | "high" | "ultra">("high");
  const [surfaceAmplitude, setSurfaceAmplitude] = useState(2);
  const [includeRings, setIncludeRings] = useState(true);
  const [lithophaneMode, setLithophaneMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<"stl" | "obj" | "svg">("stl");

  const selectedBodyData = SOLAR_SYSTEM.find(b => b.id === selectedBody);
  const selectedStarData = NEARBY_STARS.find(s => s.id === selectedStar);
  const selectedGalaxyData = GALAXIES.find(g => g.id === selectedGalaxy);

  const handleDownload = async () => {
    if (!selectedBody) {
      toast({ title: "Select a celestial body first", variant: "destructive" });
      return;
    }

    setIsDownloading(true);
    try {
      const endpoint = `/api/universe/body/${selectedBody}?printSize=${printSize}&detail=${detailLevel}&surfaceAmplitude=${surfaceAmplitude}&includeRings=${includeRings}&lithophane=${lithophaneMode}&format=${exportFormat}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedBody}_${printSize}mm.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Download started!" });
    } catch (error) {
      toast({ title: "Export failed", description: String(error), variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 relative bg-black">
        <Canvas camera={{ position: [0, 15, 30], fov: 60 }}>
          <Suspense fallback={null}>
            {activeTab === "solar" && (
              <SolarSystemScene
                bodies={SOLAR_SYSTEM}
                selectedBody={selectedBody}
                onSelectBody={setSelectedBody}
                showOrbits={showOrbits}
                timeSpeed={timeSpeed}
                isPaused={isPaused}
              />
            )}
            {activeTab === "stars" && (
              <StarMapView
                stars={NEARBY_STARS}
                selectedStar={selectedStar}
                onSelect={setSelectedStar}
              />
            )}
            {activeTab === "galaxies" && (
              <GalaxyView
                galaxies={GALAXIES}
                selectedGalaxy={selectedGalaxy}
                onSelect={setSelectedGalaxy}
              />
            )}
          </Suspense>
        </Canvas>

        <div className="absolute top-4 left-4 right-96 space-y-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="bg-black/70">
              <TabsTrigger value="solar" data-testid="tab-solar">Solar System</TabsTrigger>
              <TabsTrigger value="stars" data-testid="tab-stars">Nearby Stars</TabsTrigger>
              <TabsTrigger value="galaxies" data-testid="tab-galaxies">Galaxies</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "solar" && (
            <div className="flex flex-wrap gap-2">
              {SOLAR_SYSTEM.filter(b => b.type !== "moon").map((body) => (
                <Button
                  key={body.id}
                  size="sm"
                  variant={selectedBody === body.id ? "default" : "secondary"}
                  onClick={() => setSelectedBody(body.id)}
                  className="bg-opacity-80"
                  data-testid={`button-select-${body.id}`}
                >
                  <span 
                    className="w-3 h-3 rounded-full mr-1.5" 
                    style={{ backgroundColor: body.color }}
                  />
                  {body.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {activeTab === "solar" && (
          <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/70 rounded-lg px-4 py-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsPaused(!isPaused)}
              data-testid="button-play-pause"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 text-white text-sm">
              <span>Speed:</span>
              <Button size="sm" variant={timeSpeed === 0.25 ? "default" : "ghost"} onClick={() => setTimeSpeed(0.25)}>0.25x</Button>
              <Button size="sm" variant={timeSpeed === 1 ? "default" : "ghost"} onClick={() => setTimeSpeed(1)}>1x</Button>
              <Button size="sm" variant={timeSpeed === 5 ? "default" : "ghost"} onClick={() => setTimeSpeed(5)}>5x</Button>
              <Button size="sm" variant={timeSpeed === 20 ? "default" : "ghost"} onClick={() => setTimeSpeed(20)}>20x</Button>
            </div>
          </div>
        )}
      </div>

      <div className="w-80 border-l bg-sidebar p-4 overflow-y-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Orbit className="h-5 w-5" />
              Universe Explorer
              <Badge>Live Orbits</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === "solar" && selectedBodyData && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedBodyData.color }} />
                  <span className="font-medium">{selectedBodyData.name}</span>
                  <Badge variant="outline">{selectedBodyData.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{selectedBodyData.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Radius:</span> {selectedBodyData.radius.toLocaleString()} km</div>
                  <div><span className="text-muted-foreground">Distance:</span> {selectedBodyData.distanceAU} AU</div>
                  <div><span className="text-muted-foreground">Year:</span> {selectedBodyData.orbitPeriodDays} days</div>
                  <div><span className="text-muted-foreground">Day:</span> {selectedBodyData.rotationPeriodDays} Earth days</div>
                  {selectedBodyData.mass && <div className="col-span-2"><span className="text-muted-foreground">Mass:</span> {selectedBodyData.mass}</div>}
                  {selectedBodyData.temperature && <div className="col-span-2"><span className="text-muted-foreground">Temp:</span> {selectedBodyData.temperature}</div>}
                </div>
              </div>
            )}

            {activeTab === "stars" && selectedStarData && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedStarData.color }} />
                  <span className="font-medium">{selectedStarData.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedStarData.description}</p>
                <div className="text-xs space-y-1">
                  <div><span className="text-muted-foreground">Distance:</span> {selectedStarData.distanceLY} light years</div>
                  <div><span className="text-muted-foreground">Type:</span> {selectedStarData.spectralType}</div>
                  <div><span className="text-muted-foreground">Known Planets:</span> {selectedStarData.planets}</div>
                </div>
              </div>
            )}

            {activeTab === "galaxies" && selectedGalaxyData && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedGalaxyData.color }} />
                  <span className="font-medium">{selectedGalaxyData.name}</span>
                  <Badge variant="outline">{selectedGalaxyData.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{selectedGalaxyData.description}</p>
                <div className="text-xs space-y-1">
                  <div><span className="text-muted-foreground">Distance:</span> {selectedGalaxyData.distanceLY.toLocaleString()} light years</div>
                  <div><span className="text-muted-foreground">Diameter:</span> {selectedGalaxyData.diameter.toLocaleString()} light years</div>
                  <div><span className="text-muted-foreground">Stars:</span> {selectedGalaxyData.starCount}</div>
                </div>
              </div>
            )}

            {activeTab === "solar" && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Show Orbits</Label>
                  <Switch checked={showOrbits} onCheckedChange={setShowOrbits} data-testid="switch-orbits" />
                </div>

                <div className="space-y-2">
                  <Label>Print Size: {printSize}mm</Label>
                  <Slider
                    value={[printSize]}
                    onValueChange={([v]) => setPrintSize(v)}
                    min={20}
                    max={200}
                    step={10}
                    data-testid="slider-print-size"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detail Level</Label>
                  <Select value={detailLevel} onValueChange={(v) => setDetailLevel(v as typeof detailLevel)}>
                    <SelectTrigger data-testid="select-detail">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (fast print)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="ultra">Ultra (slow print)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Surface Detail: {surfaceAmplitude}</Label>
                  <Slider
                    value={[surfaceAmplitude]}
                    onValueChange={([v]) => setSurfaceAmplitude(v)}
                    min={0}
                    max={10}
                    step={0.5}
                    data-testid="slider-surface"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Include Rings (Saturn)</Label>
                  <Switch checked={includeRings} onCheckedChange={setIncludeRings} data-testid="switch-rings" />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Lithophane Mode</Label>
                  <Switch checked={lithophaneMode} onCheckedChange={setLithophaneMode} data-testid="switch-lithophane" />
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
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

                <Button
                  className="w-full"
                  onClick={handleDownload}
                  disabled={isDownloading || !selectedBody}
                  data-testid="button-download"
                >
                  {isDownloading ? (
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download {selectedBodyData?.name || "Planet"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
