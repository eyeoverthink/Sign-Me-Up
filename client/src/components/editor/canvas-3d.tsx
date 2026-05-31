import { Suspense, useRef, useMemo, useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { fontOptions } from "@shared/schema";
import { Box, AlertTriangle } from "lucide-react";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch (e) {
    return false;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("3D Canvas error caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function Canvas2DFallback() {
  const { letterSettings, wiringSettings, mountingSettings } = useEditorStore();
  const selectedFont = fontOptions.find((f) => f.id === letterSettings.fontId);

  const width = letterSettings.text.length * 40 * letterSettings.scale;
  const height = 60 * letterSettings.scale;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 rounded-md p-8">
      <div className="flex items-center gap-2 mb-6 text-zinc-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">2D Preview Mode</span>
      </div>
      
      <div className="relative mb-8">
        <div
          className="bg-purple-600 rounded-md shadow-2xl flex items-center justify-center border-2 border-purple-500/50"
          style={{
            width: `${Math.min(Math.max(letterSettings.text.length * 60, 80), 400)}px`,
            height: `${Math.min(100 * letterSettings.scale, 150)}px`,
            boxShadow: "0 20px 60px rgba(147, 51, 234, 0.3)",
          }}
        >
          <span
            className="text-purple-950 font-bold tracking-wide"
            style={{
              fontFamily: selectedFont?.family || "Inter",
              fontSize: `${Math.min(48 * letterSettings.scale, 72)}px`,
            }}
          >
            {letterSettings.text || "A"}
          </span>
        </div>

        {wiringSettings.channelType !== "none" && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-yellow-500 rounded-full opacity-80" />
        )}

        {mountingSettings.pattern !== "none" && (
          <>
            <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            {mountingSettings.pattern !== "2-point" && (
              <>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-red-500 rounded-full" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </>
            )}
          </>
        )}
      </div>

      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-md px-4 py-2 text-sm font-mono text-zinc-100">
        <span className="text-zinc-400">W:</span>{" "}
        <span className="text-purple-400">{width.toFixed(0)}mm</span>
        <span className="mx-3 text-zinc-600">|</span>
        <span className="text-zinc-400">H:</span>{" "}
        <span className="text-purple-400">{height.toFixed(0)}mm</span>
        <span className="mx-3 text-zinc-600">|</span>
        <span className="text-zinc-400">D:</span>{" "}
        <span className="text-purple-400">{letterSettings.depth}mm</span>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-zinc-400">Letter body</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-zinc-400">Wire channel</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-400">Mount holes</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500 text-center max-w-xs">
        Full 3D preview requires WebGL support. Export functionality works normally.
      </p>
    </div>
  );
}

const fontFileMap: Record<string, string> = {
  "aerioz": "Aerioz-Demo.otf",
  "airstream": "Airstream.ttf",
  "airstream-nf": "AirstreamNF.ttf",
  "alliston": "Alliston-Demo.ttf",
  "cookiemonster": "Cookiemonster.ttf",
  "darlington": "Darlington-Demo.ttf",
  "dirtyboy": "Dirtyboy.ttf",
  "future-light": "FutureLight.ttf",
  "future-light-italic": "FutureLightItalic.ttf",
  "halimun": "Halimun.ttf",
  "hershey-sans": "Inter-Bold.ttf",
  "hershey-script": "Inter-Bold.ttf",
  "inter": "Inter-Bold.ttf",
  "roboto": "Roboto-Bold.ttf",
  "poppins": "Poppins-Bold.ttf",
  "montserrat": "Montserrat-Bold.ttf",
  "open-sans": "OpenSans-Bold.ttf",
  "playfair": "PlayfairDisplay-Bold.ttf",
  "merriweather": "Merriweather-Bold.ttf",
  "lora": "Lora-Bold.ttf",
  "space-grotesk": "SpaceGrotesk-Bold.ttf",
  "outfit": "Outfit-Bold.ttf",
  "architects-daughter": "ArchitectsDaughter-Regular.ttf",
  "oxanium": "Oxanium-Bold.ttf",
};

function WebGL3DCanvas() {
  const { letterSettings, geometrySettings, wiringSettings, mountingSettings, tubeSettings, showGrid, showWireframe, showMeasurements } = useEditorStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const selectedFont = fontOptions.find((f) => f.id === letterSettings.fontId);
  const fontUrl = `/fonts/${fontFileMap[letterSettings.fontId] || "Inter-Bold.ttf"}`;
  
  const depth = (letterSettings.depth / 20) * letterSettings.scale;
  const backingThickness = (geometrySettings.backingThickness / 20) * letterSettings.scale;
  const letterHeight = geometrySettings.mode === "outline" ? depth : (geometrySettings.letterHeight / 20) * letterSettings.scale;
  const letterOffset = (geometrySettings.letterOffset / 20) * letterSettings.scale;
  
  const fontSize = 2 * letterSettings.scale;
  const channelRadius = (wiringSettings.channelDiameter / 40) * letterSettings.scale;
  const channelLength = 4 * letterSettings.scale;
  const textWidth = Math.max(letterSettings.text.length * 1.6, 1.6) * letterSettings.scale;
  const textHeight = 2.6 * letterSettings.scale;
  const width = letterSettings.text.length * 40 * letterSettings.scale;
  const height = 60 * letterSettings.scale;
  
  const tubeChannelDepth = (tubeSettings.channelDepth / 20) * letterSettings.scale;
  const tubeWallThickness = (tubeSettings.wallThickness / 20) * letterSettings.scale;
  const tubeWallHeight = (tubeSettings.wallHeight / 20) * letterSettings.scale;
  const tubeWidth = (tubeSettings.tubeWidth / 20) * letterSettings.scale;
  const overlayThickness = (tubeSettings.overlayThickness / 20) * letterSettings.scale;
  const filamentDiameter = (tubeSettings.filamentDiameter / 20) * letterSettings.scale;
  const isFilament = tubeSettings.channelType === "filament";
  
  const materialColors = {
    opaque: "#6b21a8",
    transparent: "#93c5fd",
    diffuser: "#f5f5f5",
  };
  
  const letterColor = materialColors[geometrySettings.letterMaterial];
  const backingColor = materialColors[geometrySettings.backingMaterial];

  const totalDepth = geometrySettings.mode === "flat" ? letterHeight : backingThickness + letterHeight + letterOffset;
  
  const mountingHoles = useMemo(() => {
    if (mountingSettings.pattern === "none") return [];
    const holes: { position: [number, number, number] }[] = [];
    const offset = (mountingSettings.insetFromEdge / 20) * letterSettings.scale;
    const baseX = textWidth / 2 - offset;
    const baseY = textHeight / 2 - offset;
    const zPos = totalDepth / 2 + 0.01;

    switch (mountingSettings.pattern) {
      case "2-point":
        holes.push({ position: [-baseX, 0, zPos] }, { position: [baseX, 0, zPos] });
        break;
      case "4-corner":
        holes.push(
          { position: [-baseX, baseY, zPos] },
          { position: [baseX, baseY, zPos] },
          { position: [-baseX, -baseY, zPos] },
          { position: [baseX, -baseY, zPos] }
        );
        break;
      case "6-point":
        holes.push(
          { position: [-baseX, baseY, zPos] },
          { position: [0, baseY, zPos] },
          { position: [baseX, baseY, zPos] },
          { position: [-baseX, -baseY, zPos] },
          { position: [0, -baseY, zPos] },
          { position: [baseX, -baseY, zPos] }
        );
        break;
    }
    return holes;
  }, [mountingSettings, letterSettings.scale, textWidth, textHeight, totalDepth]);

  const [ThreeModules, setThreeModules] = useState<{
    Canvas: any;
    OrbitControls: any;
    Environment: any;
    Center: any;
    Text: any;
    Grid: any;
    Html: any;
    RoundedBox: any;
    THREE: any;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadModules() {
      try {
        const [fiberModule, dreiModule, threeModule] = await Promise.all([
          import("@react-three/fiber"),
          import("@react-three/drei"),
          import("three"),
        ]);
        
        if (mounted) {
          setThreeModules({
            Canvas: fiberModule.Canvas,
            OrbitControls: dreiModule.OrbitControls,
            Environment: dreiModule.Environment,
            Center: dreiModule.Center,
            Text: dreiModule.Text,
            Grid: dreiModule.Grid,
            Html: dreiModule.Html,
            RoundedBox: dreiModule.RoundedBox,
            THREE: threeModule,
          });
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load 3D modules:", err);
        if (mounted) {
          setLoadError(true);
        }
      }
    }
    
    loadModules();
    return () => { mounted = false; };
  }, []);

  if (loadError) {
    return <Canvas2DFallback />;
  }

  if (!isLoaded || !ThreeModules) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 rounded-md">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Loading 3D preview...</span>
        </div>
      </div>
    );
  }

  const { Canvas, OrbitControls, Environment, Center, Text, Grid, Html, RoundedBox, THREE } = ThreeModules;

  return (
    <div ref={canvasContainerRef} className="w-full h-full rounded-md overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950" />
      <CanvasErrorBoundary fallback={<Canvas2DFallback />}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          gl={{ 
            antialias: true, 
            alpha: false,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 2]}
          onCreated={({ gl }: { gl: { setClearColor: (color: string) => void } }) => {
            gl.setClearColor("#18181b");
          }}
        >
          <color attach="background" args={["#18181b"]} />
          <fog attach="fog" args={["#18181b", 15, 30]} />
          
          <ambientLight intensity={0.45} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-5, 5, -5]} intensity={0.35} />
          <pointLight position={[0, 0, 6]} intensity={0.25} color="#a855f7" />

          <Center>
            <group>
              {geometrySettings.mode !== "flat" && geometrySettings.mode !== "stencil" && (
                <RoundedBox
                  args={[textWidth + 0.5, textHeight + 0.4, backingThickness]}
                  radius={0.05}
                  smoothness={4}
                  position={[0, 0, -backingThickness / 2]}
                >
                  {showWireframe ? (
                    <meshBasicMaterial color={backingColor} wireframe />
                  ) : (
                    <meshStandardMaterial 
                      color={backingColor} 
                      metalness={0.1} 
                      roughness={0.6}
                      transparent={geometrySettings.backingMaterial !== "opaque"}
                      opacity={geometrySettings.backingMaterial === "opaque" ? 1 : 0.7}
                    />
                  )}
                </RoundedBox>
              )}

              {geometrySettings.mode === "stencil" && (
                <RoundedBox
                  args={[textWidth + 0.5, textHeight + 0.4, backingThickness]}
                  radius={0.05}
                  smoothness={4}
                  position={[0, 0, 0]}
                >
                  {showWireframe ? (
                    <meshBasicMaterial color={backingColor} wireframe />
                  ) : (
                    <meshStandardMaterial 
                      color={backingColor} 
                      metalness={0.1} 
                      roughness={0.6}
                    />
                  )}
                </RoundedBox>
              )}

              {geometrySettings.mode !== "stencil" && (
                <RoundedBox
                  args={[textWidth + 0.3, textHeight + 0.2, letterHeight]}
                  radius={letterSettings.bevelEnabled ? 0.1 * letterSettings.scale : 0.03}
                  smoothness={4}
                  position={[0, 0, letterOffset + letterHeight / 2]}
                >
                  {showWireframe ? (
                    <meshBasicMaterial color={letterColor} wireframe />
                  ) : (
                    <meshStandardMaterial 
                      color={letterColor} 
                      metalness={geometrySettings.letterMaterial === "transparent" ? 0.3 : 0.15} 
                      roughness={geometrySettings.letterMaterial === "diffuser" ? 0.8 : 0.4}
                      transparent={geometrySettings.letterMaterial !== "opaque"}
                      opacity={geometrySettings.letterMaterial === "opaque" ? 1 : 0.75}
                    />
                  )}
                </RoundedBox>
              )}

              <Text
                font={fontUrl}
                position={[0, 0, letterOffset + letterHeight + 0.02]}
                fontSize={fontSize}
                color={showWireframe ? "#d946ef" : (geometrySettings.letterMaterial === "opaque" ? "#1e1b4b" : "#1e3a5f")}
                anchorX="center"
                anchorY="middle"
                outlineWidth={geometrySettings.mode === "outline" ? 0.08 : 0}
                outlineColor={geometrySettings.mode === "outline" ? "#fbbf24" : "#000000"}
              >
                {letterSettings.text || "A"}
              </Text>

              {geometrySettings.mode === "stencil" && (
                <Text
                  font={fontUrl}
                  position={[0, 0, backingThickness / 2 + 0.02]}
                  fontSize={fontSize * 0.9}
                  color="#fbbf24"
                  anchorX="center"
                  anchorY="middle"
                >
                  {letterSettings.text || "A"}
                </Text>
              )}

              {geometrySettings.mode === "outline" && (
                <>
                  {isFilament ? (
                    <>
                      <Text
                        font={fontUrl}
                        position={[0, 0, tubeWallHeight / 2]}
                        fontSize={fontSize}
                        color="#f97316"
                        anchorX="center"
                        anchorY="middle"
                        strokeWidth={filamentDiameter}
                        strokeColor="#f97316"
                        fillOpacity={0}
                        strokeOpacity={0.9}
                      >
                        {letterSettings.text || "A"}
                      </Text>
                      
                      <Text
                        font={fontUrl}
                        position={[0, 0, tubeWallHeight / 2 + 0.01]}
                        fontSize={fontSize}
                        color="#fbbf24"
                        anchorX="center"
                        anchorY="middle"
                        strokeWidth={filamentDiameter * 0.5}
                        strokeColor="#fbbf24"
                        fillOpacity={0}
                        strokeOpacity={1}
                      >
                        {letterSettings.text || "A"}
                      </Text>
                      
                      <mesh position={[-textWidth / 2 - 0.2, 0, tubeWallHeight / 2]}>
                        <sphereGeometry args={[filamentDiameter * 0.6, 16, 16]} />
                        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
                      </mesh>
                      <mesh position={[textWidth / 2 + 0.2, 0, tubeWallHeight / 2]}>
                        <sphereGeometry args={[filamentDiameter * 0.6, 16, 16]} />
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
                      </mesh>
                    </>
                  ) : (
                    <>
                      <Text
                        font={fontUrl}
                        position={[0, 0, tubeWallHeight / 2]}
                        fontSize={fontSize}
                        color={backingColor}
                        anchorX="center"
                        anchorY="middle"
                        strokeWidth={tubeWidth || 0.8}
                        strokeColor={backingColor}
                        fillOpacity={0}
                        strokeOpacity={1}
                      >
                        {letterSettings.text || "A"}
                      </Text>
                      
                      <Text
                        font={fontUrl}
                        position={[0, 0, tubeWallHeight / 2 + 0.01]}
                        fontSize={fontSize}
                        color="#fbbf24"
                        anchorX="center"
                        anchorY="middle"
                        strokeWidth={(tubeWidth - tubeWallThickness * 2) || 0.6}
                        strokeColor="#fbbf24"
                        fillOpacity={0}
                        strokeOpacity={0.85}
                      >
                        {letterSettings.text || "A"}
                      </Text>
                    </>
                  )}
                  
                  {tubeSettings.enableOverlay && (
                    <Text
                      font={fontUrl}
                      position={[0, 0, tubeWallHeight + overlayThickness / 2]}
                      fontSize={fontSize}
                      color={letterColor}
                      anchorX="center"
                      anchorY="middle"
                      strokeWidth={isFilament ? filamentDiameter * 1.2 : (tubeWidth || 0.8)}
                      strokeColor={letterColor}
                      fillOpacity={0}
                      strokeOpacity={0.7}
                    >
                      {letterSettings.text || "A"}
                    </Text>
                  )}
                  
                  {geometrySettings.enableBacking !== false && (
                    <Text
                      font={fontUrl}
                      position={[0, 0, -backingThickness / 2]}
                      fontSize={fontSize}
                      color={backingColor}
                      anchorX="center"
                      anchorY="middle"
                      strokeWidth={isFilament ? filamentDiameter * 1.2 : (tubeWidth || 0.8)}
                      strokeColor={backingColor}
                      fillOpacity={0}
                      strokeOpacity={0.5}
                    >
                      {letterSettings.text || "A"}
                    </Text>
                  )}
                </>
              )}

              <Text
                font={fontUrl}
                position={[0, 0, geometrySettings.mode === "flat" ? -letterHeight / 2 - 0.02 : -backingThickness - 0.02]}
                fontSize={fontSize}
                rotation={[0, Math.PI, 0]}
                color={showWireframe ? "#d946ef" : "#1e1b4b"}
                anchorX="center"
                anchorY="middle"
              >
                {letterSettings.text || "A"}
              </Text>

              {wiringSettings.channelType !== "none" && (
                <mesh
                  position={[
                    0,
                    wiringSettings.channelType === "back" ? -textHeight / 3 : 0,
                    wiringSettings.channelType === "back" 
                      ? -backingThickness - channelRadius 
                      : letterOffset + letterHeight / 2,
                  ]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[channelRadius, channelRadius, channelLength, 16]} />
                  <meshStandardMaterial color="#fbbf24" transparent opacity={0.85} emissive="#fbbf24" emissiveIntensity={0.15} />
                </mesh>
              )}

              {mountingHoles.map((hole, index) => (
                <group key={index} position={hole.position}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry
                      args={[
                        (mountingSettings.holeDiameter / 40) * letterSettings.scale,
                        (mountingSettings.holeDiameter / 40) * letterSettings.scale,
                        (mountingSettings.holeDepth / 25) * letterSettings.scale,
                        16,
                      ]}
                    />
                    <meshStandardMaterial color="#ef4444" transparent opacity={0.75} />
                  </mesh>
                  <mesh position={[0, 0, 0.03]}>
                    <ringGeometry
                      args={[
                        (mountingSettings.holeDiameter / 55) * letterSettings.scale,
                        (mountingSettings.holeDiameter / 35) * letterSettings.scale,
                        16,
                      ]}
                    />
                    <meshBasicMaterial color="#dc2626" side={THREE.DoubleSide} />
                  </mesh>
                </group>
              ))}
            </group>
          </Center>

          {showGrid && (
            <Grid
              args={[20, 20]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#3f3f46"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#52525b"
              fadeDistance={25}
              fadeStrength={1}
              position={[0, -2.5, 0]}
            />
          )}

          {showMeasurements && (
            <Html position={[0, 3.5, 0]} center>
              <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono whitespace-nowrap text-zinc-100 shadow-lg">
                <span className="text-zinc-400">W:</span> <span className="text-purple-400">{width.toFixed(0)}mm</span>
                <span className="mx-2 text-zinc-600">|</span>
                <span className="text-zinc-400">H:</span> <span className="text-purple-400">{height.toFixed(0)}mm</span>
                <span className="mx-2 text-zinc-600">|</span>
                <span className="text-zinc-400">D:</span> <span className="text-purple-400">{letterSettings.depth}mm</span>
              </div>
            </Html>
          )}

          <Environment preset="studio" />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={25}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI - Math.PI / 6}
          />
        </Canvas>
      </CanvasErrorBoundary>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-md px-2 py-1 text-[10px] text-zinc-400">
          Drag to rotate
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-md px-2 py-1 text-[10px] text-zinc-400">
          Scroll to zoom
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-1.5 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-md p-2">
        <div className="text-[9px] text-zinc-500 font-medium uppercase tracking-wide mb-1">
          {geometrySettings.mode === "raised" && "Raised Letters"}
          {geometrySettings.mode === "stencil" && "Cut-Out Stencil"}
          {geometrySettings.mode === "layered" && "Layered Parts"}
          {geometrySettings.mode === "flat" && "Flat Letters"}
          {geometrySettings.mode === "outline" && "Outline (Neon Style)"}
        </div>
        {geometrySettings.mode === "outline" ? (
          <>
            <div className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isFilament ? "#f97316" : backingColor }} />
              <span className="text-zinc-400">
                {isFilament ? `Circular tube (${tubeSettings.filamentDiameter}mm)` : `Tube walls (${tubeSettings.wallHeight}mm)`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-zinc-400">
                {isFilament ? "Filament path (continuous)" : `Light channel (${tubeSettings.channelDepth}mm)`}
              </span>
            </div>
            {isFilament && (
              <>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-zinc-400">Entry point</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-zinc-400">Exit point</span>
                </div>
              </>
            )}
            {tubeSettings.enableOverlay && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: letterColor }} />
                <span className="text-zinc-400">Overlay cap (diffuser)</span>
              </div>
            )}
            {geometrySettings.enableBacking !== false && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full opacity-50" style={{ backgroundColor: backingColor }} />
                <span className="text-zinc-400">Backing plate</span>
              </div>
            )}
          </>
        ) : (
          <>
            {geometrySettings.mode !== "flat" && geometrySettings.mode !== "stencil" && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: backingColor }} />
                <span className="text-zinc-400">Backing ({geometrySettings.backingMaterial})</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: letterColor }} />
              <span className="text-zinc-400">Letters ({geometrySettings.letterMaterial})</span>
            </div>
            {wiringSettings.channelType !== "none" && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-zinc-400">Wire channel</span>
              </div>
            )}
            {mountingSettings.pattern !== "none" && (
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-zinc-400">Mount holes</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Canvas3D() {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    const supported = checkWebGLSupport();
    setHasWebGL(supported);
  }, []);

  if (hasWebGL === null) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 rounded-md">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Checking WebGL support...</span>
        </div>
      </div>
    );
  }

  if (!hasWebGL) {
    return <Canvas2DFallback />;
  }

  return (
    <CanvasErrorBoundary fallback={<Canvas2DFallback />}>
      <WebGL3DCanvas />
    </CanvasErrorBoundary>
  );
}
