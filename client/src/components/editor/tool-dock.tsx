import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Type, Pencil, Image, Eye, EyeOff, Dog, Hexagon, Layers, Lightbulb, Lamp, Egg, Grid3X3, FileType, Frame, Heart, Play, Box, ImagePlus, TextCursor, Cookie, Grip, GitBranch, Globe, ScanLine, FolderDown, FlaskConical, KeyRound, Mountain, Building2, Beaker, Sparkles, LayoutGrid, Wrench, Orbit, Brain, Atom } from "lucide-react";
import { Link } from "wouter";
import type { InputMode } from "@shared/schema";

export function ToolDock() {
  const { inputMode, setInputMode, showGrid, setShowGrid } = useEditorStore();

  const modes: { id: InputMode; icon: typeof Type; label: string; description: string }[] = [
    { id: "text", icon: Type, label: "Signs", description: "Neon sign text" },
    { id: "draw", icon: Pencil, label: "Draw", description: "Freehand drawing" },
    { id: "image", icon: Image, label: "Image", description: "Upload & trace image" },
    { id: "pettag", icon: Dog, label: "Pet Tags", description: "Illuminated dog tags" },
    { id: "modular", icon: Hexagon, label: "Panels", description: "Modular light panels" },
    { id: "custom", icon: Layers, label: "Custom", description: "Custom tube shapes" },
    { id: "retro", icon: Lightbulb, label: "Retro", description: "Retro neon & Edison bulbs" },
    { id: "ledholder", icon: Lamp, label: "LED Holders", description: "Elevated LED holders for accent lighting" },
    { id: "eggison", icon: Egg, label: "Eggison", description: "Egg-shaped Edison bulb shells" },
    { id: "ledgrid", icon: Grid3X3, label: "LED Grid", description: "WS2812B LED matrix signs" },
    { id: "customfont", icon: FileType, label: "Font Sign", description: "Custom font OpenSCAD signs" },
    { id: "lightbox", icon: Frame, label: "Light Box", description: "Backlit wall art panels" },
    { id: "filamentshape", icon: Heart, label: "Filament", description: "LED filament shape holders" },
    { id: "animation", icon: Play, label: "Animate", description: "Multi-frame LED animations" },
    { id: "holographic", icon: Box, label: "Holo", description: "Multi-layer holographic panels" },
    { id: "lithophane", icon: ImagePlus, label: "Litho", description: "3D printed photo panels" },
    { id: "phrase", icon: TextCursor, label: "Phrase", description: "Welded phrase signs with borders" },
    { id: "ledmagnetic", icon: Cookie, label: "Oreo LED", description: "Screw-together magnetic LED holder" },
    { id: "hexpanel", icon: Grip, label: "Hex LED", description: "Hexagonal modular LED panels" },
    { id: "ledchannel", icon: GitBranch, label: "Channels", description: "LED diffuser channels & organic patterns" },
    { id: "symbolsign", icon: Globe, label: "Symbols", description: "Universal symbols, emojis & world languages" },
    { id: "combosign", icon: Layers, label: "Combos", description: "Trending emoji sequences & story signs" },
    { id: "imagesign", icon: ScanLine, label: "Logo Sign", description: "Convert any image/logo to 3D sign" },
    { id: "myexports", icon: FolderDown, label: "My Exports", description: "View & manage all exported designs" },
    { id: "scottlab", icon: FlaskConical, label: "Scott Lab", description: "Zero-shot shape recognition laboratory" },
    { id: "ledkeychain", icon: KeyRound, label: "Keychain", description: "Battery-powered LED keychains & pet tags" },
    { id: "topography", icon: Mountain, label: "Terrain", description: "GPS terrain & topographic map light boxes" },
    { id: "citylightbox", icon: Building2, label: "City", description: "City/neighborhood map light boxes with roads & buildings" },
    { id: "geoboxlab", icon: Beaker, label: "Geo-Box", description: "Scott Algorithm layered terrain & architecture system" },
    { id: "artwall", icon: Sparkles, label: "Art Wall", description: "Pop culture LED panels - emojis, games, movies, memes" },
    { id: "layeredbox", icon: LayoutGrid, label: "Layered", description: "Layered shadow boxes - terrain, city, custom scenes" },
    { id: "universe", icon: Orbit, label: "Universe", description: "3D print planets, moons & constellations" },
    { id: "oracle", icon: Brain, label: "Oracle AI", description: "Fraymus Oracle - φ-harmonic AI chat" },
    { id: "quantum", icon: Atom, label: "Quantum", description: "Pure φ-harmonic Oracle - no LLM, just math" },
  ];

  return (
    <div className="w-16 border-r bg-sidebar flex flex-col items-center py-4 gap-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">Input</div>
      
      {modes.map((mode) => (
        <Tooltip key={mode.id}>
          <TooltipTrigger asChild>
            <Button
              variant={inputMode === mode.id ? "default" : "ghost"}
              size="icon"
              onClick={() => setInputMode(mode.id)}
              data-testid={`button-mode-${mode.id}`}
            >
              <mode.icon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{mode.label}</p>
            <p className="text-xs text-muted-foreground">{mode.description}</p>
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="flex-1" />

      <div className="text-xs font-medium text-muted-foreground mb-2">Tools</div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/portal">
            <Button
              variant="outline"
              size="icon"
              data-testid="button-portal"
            >
              <Wrench className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">Tool Portal</p>
          <p className="text-xs text-muted-foreground">Free tools: Emoji library, STL export, and more</p>
        </TooltipContent>
      </Tooltip>

      <div className="text-xs font-medium text-muted-foreground mb-2 mt-4">View</div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            data-testid="button-toggle-grid"
          >
            {showGrid ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{showGrid ? "Hide Grid" : "Show Grid"}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
