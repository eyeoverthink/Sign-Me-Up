import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, ImageIcon, Zap, Settings, RefreshCw, AlertCircle, CheckCircle, Eye, Layers, CircleDot, Square, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ComponentBoundary {
  id: number;
  boundary: number[][];
  simplified: number[][];
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  pixelCount: number;
}

interface TraceData {
  components: ComponentBoundary[];
  imageWidth: number;
  imageHeight: number;
  totalPixels: number;
  componentCount: number;
}

interface ScottVarianceIndex {
  sigma: number;
  isOrganic: boolean;
  verdict: string;
  standardSignature: { perimeterAreaRatio: number; skeletonComplexity: number; hullSolidity: number };
  invertedSignature: { perimeterAreaRatio: number; skeletonComplexity: number; hullSolidity: number };
}

interface ProcessResult {
  success: boolean;
  error?: string;
  originalPoints?: number;
  simplifiedPoints?: number;
  perimeter?: number;
  scadContent?: string;
  traceData?: TraceData;
  scottVariance?: ScottVarianceIndex;
}

type FeatureType = "main" | "hole" | "recessed" | "raised";

interface LayerConfig {
  componentId: number;
  featureType: FeatureType;
  depth: number;
  enabled: boolean;
}

// Component colors for visualization
const COMPONENT_COLORS = [
  '#00FF88', '#FF6B6B', '#FFD700', '#00BFFF', '#FF69B4', 
  '#9370DB', '#20B2AA', '#FF7F50', '#7FFF00', '#DC143C'
];

// Live Trace Visualization Component - Shows each traced component
function TraceVisualization({ 
  traceData, 
  imagePreview,
  animationStep 
}: { 
  traceData: TraceData; 
  imagePreview: string;
  animationStep: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Scale canvas to fit image
      const scale = Math.min(400 / img.width, 300 / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Draw original image (dimmed)
      ctx.globalAlpha = 0.4;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
      
      const scaleX = canvas.width / traceData.imageWidth;
      const scaleY = canvas.height / traceData.imageHeight;
      
      // Calculate total boundary points for animation
      let totalPoints = 0;
      for (const comp of traceData.components) {
        totalPoints += comp.boundary.length;
      }
      
      // Draw each component's boundary with different colors
      let pointIndex = 0;
      for (let c = 0; c < traceData.components.length; c++) {
        const comp = traceData.components[c];
        const color = COMPONENT_COLORS[c % COMPONENT_COLORS.length];
        
        // Animate boundary trace
        const pointsToShow = Math.min(
          animationStep - pointIndex,
          comp.boundary.length
        );
        
        if (pointsToShow > 0) {
          // Draw raw boundary trace (animated)
          ctx.beginPath();
          ctx.strokeStyle = `${color}66`; // Semi-transparent
          ctx.lineWidth = 1;
          
          const firstPt = comp.boundary[0];
          ctx.moveTo(firstPt[0] * scaleX, firstPt[1] * scaleY);
          
          for (let i = 1; i < Math.min(pointsToShow, comp.boundary.length); i++) {
            const pt = comp.boundary[i];
            ctx.lineTo(pt[0] * scaleX, pt[1] * scaleY);
          }
          ctx.stroke();
        }
        
        // Draw simplified polygon (when animation complete for this component)
        if (animationStep >= pointIndex + comp.boundary.length && comp.simplified.length > 2) {
          ctx.beginPath();
          const firstPt = comp.simplified[0];
          ctx.moveTo(firstPt[0] * scaleX, firstPt[1] * scaleY);
          
          for (let i = 1; i < comp.simplified.length; i++) {
            const pt = comp.simplified[i];
            ctx.lineTo(pt[0] * scaleX, pt[1] * scaleY);
          }
          ctx.closePath();
          
          ctx.fillStyle = `${color}33`;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw corner points
          for (const pt of comp.simplified) {
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(pt[0] * scaleX, pt[1] * scaleY, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        pointIndex += comp.boundary.length;
      }
    };
    img.src = imagePreview;
  }, [traceData, imagePreview, animationStep]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="border rounded-lg bg-black/90"
      data-testid="trace-visualization-canvas"
    />
  );
}

export default function ImageSignEditor() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  
  const [settings, setSettings] = useState({
    tolerance: 2.0,
    lightType: "silicone_neon_6mm" as const,
    signHeight: 30,
    wallThickness: 2,
    baseThickness: 2,
  });
  
  const [layerConfigs, setLayerConfigs] = useState<LayerConfig[]>([]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  
  // Direct STL export settings (like imagetostl.com)
  const [stlMode, setStlMode] = useState<'heightmap' | 'extrude'>('extrude');
  const [stlWidth, setStlWidth] = useState(100);
  const [stlDepth, setStlDepth] = useState(5);
  const [stlBaseThickness, setStlBaseThickness] = useState(2);
  const [stlInvert, setStlInvert] = useState(false);
  const [isDownloadingSTL, setIsDownloadingSTL] = useState(false);

  // Calculate total boundary points for animation
  const getTotalBoundaryPoints = () => {
    if (!processResult?.traceData) return 0;
    return processResult.traceData.components.reduce((sum, comp) => sum + comp.boundary.length, 0);
  };

  // Animate trace visualization
  useEffect(() => {
    if (!showTrace || !processResult?.traceData) return;
    
    const totalSteps = getTotalBoundaryPoints() + 20; // Add extra steps for final display
    if (animationStep >= totalSteps) return;
    
    const timer = setTimeout(() => {
      setAnimationStep(prev => prev + 5); // 5 points per frame for faster animation
    }, 16); // ~60fps
    
    return () => clearTimeout(timer);
  }, [showTrace, processResult, animationStep]);

  // Initialize layer configs when traceData changes
  useEffect(() => {
    if (!processResult?.traceData?.components) return;
    
    const components = processResult.traceData.components;
    if (components.length <= 1) {
      setLayerConfigs([]);
      return;
    }
    
    // Sort by area (largest = main, smaller = potential internal features)
    const sortedBySize = [...components].sort((a, b) => b.pixelCount - a.pixelCount);
    
    const configs: LayerConfig[] = sortedBySize.map((comp, idx) => ({
      componentId: comp.id,
      featureType: idx === 0 ? "main" : "hole", // First (largest) is main, others default to hole
      depth: idx === 0 ? settings.signHeight : 5, // Internal features default to 5mm depth
      enabled: true,
    }));
    
    setLayerConfigs(configs);
    if (components.length > 1) {
      setShowLayerPanel(true); // Auto-show if multiple components detected
    }
  }, [processResult?.traceData, settings.signHeight]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    setImageName(file.name);
    setProcessResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageName(file.name);
      setProcessResult(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const processImage = async () => {
    if (!imagePreview) return;

    setIsProcessing(true);
    setProcessResult(null);

    try {
      const response = await fetch('/api/image-to-sign/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imagePreview,
          imageName,
          settings
        })
      });

      const result = await response.json();
      setProcessResult(result);

      if (result.success) {
        toast({
          title: "Image Processed!",
          description: `Reduced ${result.originalPoints} points to ${result.simplifiedPoints} (${((1 - result.simplifiedPoints / result.originalPoints) * 100).toFixed(1)}% reduction)`,
        });
      } else {
        toast({
          title: "Processing Failed",
          description: result.error || "Could not process image",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with server",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMultiLayerSCAD = (): string => {
    if (!processResult?.scadContent || !processResult?.traceData) {
      return processResult?.scadContent || "";
    }
    
    const { components, imageWidth, imageHeight } = processResult.traceData;
    
    // If no layer configs or only one component, return original
    if (layerConfigs.length <= 1) {
      return processResult.scadContent;
    }
    
    // LED profiles matching server-side
    const ledProfiles: Record<string, { channelWidth: number; channelDepth: number }> = {
      'silicone_neon_6mm': { channelWidth: 6.5, channelDepth: 6.5 },
      'silicone_neon_8mm': { channelWidth: 8.5, channelDepth: 8.5 },
      'ws2812b_strip': { channelWidth: 12, channelDepth: 4 },
      'cob_strip': { channelWidth: 10, channelDepth: 3 }
    };
    
    const profile = ledProfiles[settings.lightType] || ledProfiles['silicone_neon_6mm'];
    
    // Use same scaling as server: fit to 200mm max dimension
    const scale = Math.min(200 / imageWidth, 200 / imageHeight);
    
    // Helper: convert points to OpenSCAD polygon with proper coordinate transform
    const pointsToScaledPolygon = (points: number[][]): string => {
      // Apply same transform as server: scale and flip Y-axis
      const pts = points.map(([x, y]) => 
        `[${(x * scale).toFixed(2)}, ${((imageHeight - y) * scale).toFixed(2)}]`
      ).join(", ");
      return `polygon(points=[${pts}])`;
    };
    
    // Generate header with parameters
    let scad = `// SignCraft 3D - Multi-Layer Sign with Layer Configurations
// Generated with Scott Algorithm Image Processing
// Components: ${layerConfigs.filter(c => c.enabled).length} configured shapes
// Generated: ${new Date().toISOString()}

// LED Profile: ${settings.lightType}
channel_width = ${profile.channelWidth};
channel_depth = ${profile.channelDepth};
wall_thickness = ${settings.wallThickness};
base_thickness = ${settings.baseThickness};
sign_height = ${settings.signHeight};
scale_factor = ${scale.toFixed(4)};

`;

    // Generate modules for each enabled component
    for (const cfg of layerConfigs) {
      if (!cfg.enabled) continue;
      
      const comp = components.find(c => c.id === cfg.componentId);
      if (!comp || !comp.simplified || comp.simplified.length < 3) continue;
      
      // Clamp depth to valid range
      const clampedDepth = Math.min(Math.max(cfg.depth, 1), settings.signHeight);
      
      scad += `
// Component ${cfg.componentId} - ${getFeatureLabel(cfg.featureType)} (${comp.pixelCount} pixels)
module shape_${cfg.componentId}() {
  offset(r = wall_thickness) {
    ${pointsToScaledPolygon(comp.simplified)}
  }
}
`;
    }

    // Generate assembly with CSG operations
    const mainCfg = layerConfigs.find(c => c.featureType === "main" && c.enabled);
    const holes = layerConfigs.filter(c => c.featureType === "hole" && c.enabled);
    const recessed = layerConfigs.filter(c => c.featureType === "recessed" && c.enabled);
    const raised = layerConfigs.filter(c => c.featureType === "raised" && c.enabled);
    
    scad += `
// Assembled sign with layer operations
module assembled_sign() {
`;

    if (mainCfg) {
      const hasSubtractions = holes.length > 0 || recessed.length > 0;
      
      if (hasSubtractions) {
        scad += `  difference() {\n`;
        scad += `    // Main sign body\n`;
        scad += `    linear_extrude(height = sign_height) shape_${mainCfg.componentId}();\n`;
        
        // Subtract holes (full cut-through)
        for (const hole of holes) {
          scad += `    // Hole cut-through for LED diffuser\n`;
          scad += `    translate([0, 0, -1]) linear_extrude(height = sign_height + 2) shape_${hole.componentId}();\n`;
        }
        
        // Subtract recessed areas (from top surface)
        for (const rec of recessed) {
          const clampedDepth = Math.min(Math.max(rec.depth, 1), settings.signHeight - 1);
          scad += `    // Recessed area (${clampedDepth}mm deep)\n`;
          scad += `    translate([0, 0, sign_height - ${clampedDepth}]) linear_extrude(height = ${clampedDepth} + 1) shape_${rec.componentId}();\n`;
        }
        
        scad += `  }\n`;
      } else {
        scad += `  // Main sign body\n`;
        scad += `  linear_extrude(height = sign_height) shape_${mainCfg.componentId}();\n`;
      }
      
      // Add raised features on top
      for (const r of raised) {
        const clampedDepth = Math.min(Math.max(r.depth, 1), 15);
        scad += `  // Raised feature (${clampedDepth}mm tall)\n`;
        scad += `  translate([0, 0, sign_height]) linear_extrude(height = ${clampedDepth}) shape_${r.componentId}();\n`;
      }
    } else {
      // No main shape defined - union all enabled shapes
      scad += `  union() {\n`;
      for (const cfg of layerConfigs) {
        if (cfg.enabled) {
          scad += `    linear_extrude(height = sign_height) shape_${cfg.componentId}();\n`;
        }
      }
      scad += `  }\n`;
    }
    
    scad += `}

assembled_sign();

// LED Channel template (uncomment and adjust as needed)
/*
difference() {
  assembled_sign();
  translate([0, 0, base_thickness]) {
    linear_extrude(height = channel_depth + 1) {
      offset(r = -wall_thickness - channel_width/2) {
        // Apply same offset to main shape for channel
      }
    }
  }
}
*/
`;

    return scad;
  };

  const downloadSCAD = () => {
    if (!processResult?.scadContent) return;

    // Use multi-layer generation if layer configs exist
    const content = layerConfigs.length > 1 ? generateMultiLayerSCAD() : processResult.scadContent;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = imageName.replace(/\.[^.]+$/, '_scott.scad') || 'image_sign.scad';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const layerMsg = layerConfigs.length > 1 
      ? ` with ${layerConfigs.filter(c => c.enabled).length} layer configs applied` 
      : "";
    
    toast({
      title: "Downloaded!",
      description: `OpenSCAD file ready for 3D printing${layerMsg}`,
    });
  };

  // Direct STL download - like imagetostl.com
  const downloadDirectSTL = async () => {
    if (!imagePreview) return;
    
    setIsDownloadingSTL(true);
    try {
      const response = await fetch('/api/image-to-stl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imagePreview,
          settings: {
            mode: stlMode,
            width: stlWidth,
            height: stlWidth, // Keep square aspect ratio
            maxDepth: stlDepth,
            baseThickness: stlBaseThickness,
            invert: stlInvert,
            detail: 'medium',
            removeBackground: true,
            backgroundTolerance: 30,
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate STL');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = imageName.replace(/\.[^.]+$/, '.stl') || 'signcraft_export.stl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const triangleCount = response.headers.get('X-Triangle-Count') || 'unknown';
      
      toast({
        title: "STL Downloaded!",
        description: `Direct 3D model ready with ${triangleCount} triangles`,
      });
    } catch (error) {
      toast({
        title: "STL Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingSTL(false);
    }
  };

  const updateLayerConfig = (componentId: number, updates: Partial<LayerConfig>) => {
    setLayerConfigs(prev => prev.map(cfg => 
      cfg.componentId === componentId ? { ...cfg, ...updates } : cfg
    ));
  };

  const getFeatureIcon = (featureType: FeatureType) => {
    switch (featureType) {
      case "main": return <Square className="h-4 w-4" />;
      case "hole": return <CircleDot className="h-4 w-4" />;
      case "recessed": return <ArrowDown className="h-4 w-4" />;
      case "raised": return <ArrowUp className="h-4 w-4" />;
    }
  };

  const getFeatureLabel = (featureType: FeatureType) => {
    switch (featureType) {
      case "main": return "Main Shape";
      case "hole": return "Hole (Cut Through)";
      case "recessed": return "Recessed Area";
      case "raised": return "Raised Feature";
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Image-to-Sign Generator</h2>
            <p className="text-muted-foreground">
              Upload any image or logo and convert it to a 3D printable LED sign using the Scott Engine
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  imagePreview ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/30'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                data-testid="image-drop-zone"
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg shadow-lg"
                      data-testid="image-preview"
                    />
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span>{imageName}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-change-image"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop image here or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Best results: White shape on black background, PNG or JPG
                      </p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-image">
                      <Upload className="h-4 w-4 mr-2" />
                      Select Image
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
              </div>
            </CardContent>
          </Card>

          {imagePreview && (
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={processImage}
                disabled={isProcessing}
                className="px-8"
                data-testid="button-process-image"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing with Scott Engine...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Generate 3D Sign
                  </>
                )}
              </Button>
            </div>
          )}

          {processResult && (
            <Card className={processResult.success ? "border-green-500/50" : "border-destructive/50"}>
              <CardContent className="p-6">
                {processResult.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Successfully Processed!</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{processResult.traceData?.componentCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Components</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{processResult.originalPoints}</div>
                        <div className="text-xs text-muted-foreground">Boundary Points</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {processResult.simplifiedPoints}
                        </div>
                        <div className="text-xs text-muted-foreground">Simplified</div>
                      </div>
                    </div>

                    {/* Scott Variance Index - AI Detection */}
                    {processResult.scottVariance && (
                      <div className={`p-3 rounded-lg border ${processResult.scottVariance.isOrganic ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium ${processResult.scottVariance.isOrganic ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
                            {processResult.scottVariance.isOrganic ? 'Real Photo Detected' : 'AI/Clip-Art Detected'}
                          </div>
                          <div className="text-xs text-muted-foreground ml-auto">
                            Scott Index: {processResult.scottVariance.sigma.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {processResult.scottVariance.isOrganic 
                            ? 'Tip: AI-generated versions of logos often trace cleaner than photos'
                            : 'Clean geometric shapes detected - optimal for 3D printing'}
                        </div>
                      </div>
                    )}

                    {/* Component Trace Visualization */}
                    {processResult.traceData && imagePreview && (
                      <div className="space-y-3">
                        <Button
                          variant={showTrace ? "default" : "outline"}
                          className="w-full"
                          onClick={() => {
                            setShowTrace(!showTrace);
                            setAnimationStep(0);
                          }}
                          data-testid="button-toggle-trace"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showTrace ? "Hide" : "Show"} Boundary Trace
                        </Button>
                        
                        {showTrace && (
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <TraceVisualization 
                                traceData={processResult.traceData}
                                imagePreview={imagePreview}
                                animationStep={animationStep}
                              />
                            </div>
                            <div className="text-center space-y-1">
                              <div className="flex items-center justify-center gap-4 flex-wrap text-xs">
                                {processResult.traceData.components.slice(0, 5).map((comp, i) => (
                                  <div key={comp.id} className="flex items-center gap-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }}
                                    />
                                    <span>Shape {comp.id}</span>
                                  </div>
                                ))}
                                {processResult.traceData.components.length > 5 && (
                                  <span className="text-muted-foreground">+{processResult.traceData.components.length - 5} more</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Moore-Neighbor boundary tracing | {getTotalBoundaryPoints()} edge points
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setAnimationStep(0)}
                              data-testid="button-replay-trace"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Replay Animation
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={downloadSCAD}
                      data-testid="button-download-scad"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download OpenSCAD File
                    </Button>
                    
                    {/* Direct STL Export - like imagetostl.com */}
                    <div className="pt-4 border-t space-y-3">
                      <div className="text-center">
                        <Badge variant="secondary" className="mb-2">Direct STL Export</Badge>
                        <p className="text-xs text-muted-foreground">
                          Download ready-to-print STL without OpenSCAD
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Mode</Label>
                          <Select value={stlMode} onValueChange={(v: 'heightmap' | 'extrude') => setStlMode(v)}>
                            <SelectTrigger data-testid="select-stl-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="extrude">Extrude (Silhouette)</SelectItem>
                              <SelectItem value="heightmap">Heightmap (Relief)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Size (mm)</Label>
                          <Input
                            type="number"
                            value={stlWidth}
                            onChange={(e) => setStlWidth(Number(e.target.value))}
                            min={20}
                            max={300}
                            data-testid="input-stl-width"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Depth (mm)</Label>
                          <Input
                            type="number"
                            value={stlDepth}
                            onChange={(e) => setStlDepth(Number(e.target.value))}
                            min={1}
                            max={30}
                            data-testid="input-stl-depth"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Base (mm)</Label>
                          <Input
                            type="number"
                            value={stlBaseThickness}
                            onChange={(e) => setStlBaseThickness(Number(e.target.value))}
                            min={0}
                            max={10}
                            data-testid="input-stl-base"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Invert Colors</Label>
                        <Switch
                          checked={stlInvert}
                          onCheckedChange={setStlInvert}
                          data-testid="switch-stl-invert"
                        />
                      </div>
                      
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full"
                        onClick={downloadDirectSTL}
                        disabled={!imagePreview || isDownloadingSTL}
                        data-testid="button-download-stl"
                      >
                        {isDownloadingSTL ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5 mr-2" />
                        )}
                        {isDownloadingSTL ? "Generating..." : "Download STL File"}
                      </Button>
                    </div>
                    
                    {/* Multi-Layer Configuration Panel */}
                    {layerConfigs.length > 1 && (
                      <div className="space-y-3 pt-4 border-t">
                        <Button
                          variant={showLayerPanel ? "default" : "outline"}
                          className="w-full"
                          onClick={() => setShowLayerPanel(!showLayerPanel)}
                          data-testid="button-toggle-layers"
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          {showLayerPanel ? "Hide" : "Show"} Layer Config ({layerConfigs.length} shapes)
                        </Button>
                        
                        {showLayerPanel && (
                          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              Configure each detected shape as a hole, recessed area, or raised feature for multi-dimensional effects.
                            </p>
                            
                            {layerConfigs.map((cfg, idx) => {
                              const comp = processResult?.traceData?.components.find(c => c.id === cfg.componentId);
                              const color = COMPONENT_COLORS[processResult?.traceData?.components.findIndex(c => c.id === cfg.componentId) ?? idx % COMPONENT_COLORS.length];
                              
                              return (
                                <div 
                                  key={cfg.componentId}
                                  className={`p-3 rounded border ${cfg.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-3 h-3 rounded-full shrink-0" 
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="text-sm font-medium flex-1">
                                      Shape {cfg.componentId}
                                      {idx === 0 && <Badge variant="outline" className="ml-2 text-xs">Largest</Badge>}
                                    </span>
                                    <Switch
                                      checked={cfg.enabled}
                                      onCheckedChange={(v) => updateLayerConfig(cfg.componentId, { enabled: v })}
                                      data-testid={`switch-layer-${cfg.componentId}`}
                                    />
                                  </div>
                                  
                                  {cfg.enabled && (
                                    <div className="space-y-3">
                                      <div className="flex gap-1">
                                        {(["main", "hole", "recessed", "raised"] as FeatureType[]).map(type => (
                                          <Button
                                            key={type}
                                            size="sm"
                                            variant={cfg.featureType === type ? "default" : "outline"}
                                            className="flex-1 text-xs px-1"
                                            onClick={() => updateLayerConfig(cfg.componentId, { featureType: type })}
                                            data-testid={`button-layer-${cfg.componentId}-${type}`}
                                          >
                                            {getFeatureIcon(type)}
                                          </Button>
                                        ))}
                                      </div>
                                      <div className="text-xs text-center text-muted-foreground">
                                        {getFeatureLabel(cfg.featureType)}
                                      </div>
                                      
                                      {cfg.featureType !== "main" && cfg.featureType !== "hole" && (
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span>Depth</span>
                                            <span>{cfg.depth}mm</span>
                                          </div>
                                          <Slider
                                            value={[cfg.depth]}
                                            onValueChange={([v]) => updateLayerConfig(cfg.componentId, { depth: v })}
                                            min={1}
                                            max={15}
                                            step={1}
                                            data-testid={`slider-layer-depth-${cfg.componentId}`}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            <p className="text-xs text-muted-foreground text-center pt-2">
                              Holes cut through for LED diffusers. Recessed/raised add depth variation.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-destructive">
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Processing Failed</div>
                      <div className="text-sm mt-1">{processResult.error}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Tip: Use a high-contrast image with a clear white shape on black background
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="w-80 border-l bg-sidebar p-4 space-y-6 overflow-auto">
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4" />
            Scott Engine Settings
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Simplification Tolerance</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[settings.tolerance]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, tolerance: v }))}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="flex-1"
                  data-testid="slider-tolerance"
                />
                <Badge variant="secondary">{settings.tolerance}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher = fewer points, less detail
              </p>
            </div>

            <div className="space-y-2">
              <Label>LED Type</Label>
              <Select
                value={settings.lightType}
                onValueChange={(v) => setSettings(s => ({ ...s, lightType: v as typeof settings.lightType }))}
              >
                <SelectTrigger data-testid="select-led-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silicone_neon_6mm">Silicone Neon 6mm</SelectItem>
                  <SelectItem value="silicone_neon_8mm">Silicone Neon 8mm</SelectItem>
                  <SelectItem value="ws2812b_strip">WS2812B Strip</SelectItem>
                  <SelectItem value="cob_strip">COB Strip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sign Height (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[settings.signHeight]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, signHeight: v }))}
                  min={15}
                  max={60}
                  step={5}
                  className="flex-1"
                  data-testid="slider-height"
                />
                <Badge variant="secondary">{settings.signHeight}mm</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wall Thickness (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[settings.wallThickness]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, wallThickness: v }))}
                  min={1}
                  max={4}
                  step={0.5}
                  className="flex-1"
                  data-testid="slider-wall"
                />
                <Badge variant="secondary">{settings.wallThickness}mm</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Base Thickness (mm)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[settings.baseThickness]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, baseThickness: v }))}
                  min={1}
                  max={4}
                  step={0.5}
                  className="flex-1"
                  data-testid="slider-base"
                />
                <Badge variant="secondary">{settings.baseThickness}mm</Badge>
              </div>
            </div>
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-4 text-sm space-y-2">
            <div className="font-medium">Scott Engine Features</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Moore-Neighbor boundary tracing</li>
              <li>• Douglas-Peucker simplification</li>
              <li>• Adaptive tolerance calculation</li>
              <li>• LED channel with snap-fit lid</li>
              <li>• Centered & scaled output</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 text-sm">
            <div className="font-medium text-amber-600 mb-2">Best Results Tips</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use white shape on black background</li>
              <li>• High contrast, clean edges</li>
              <li>• Simple shapes work best</li>
              <li>• 200-500px image size ideal</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
