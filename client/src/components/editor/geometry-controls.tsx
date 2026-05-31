import { Layers, RotateCcw, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { geometryModes, materialTypes, defaultGeometrySettings } from "@shared/schema";
import { useEditorStore } from "@/lib/editor-store";

const geometryModeLabels: Record<string, { name: string; description: string }> = {
  raised: {
    name: "Raised Letters",
    description: "Letters stand proud from the backing plate - ideal for front-lit signs",
  },
  stencil: {
    name: "Cut-Out / Stencil",
    description: "Letters cut through the backing - perfect for back-lit neon effect",
  },
  layered: {
    name: "Layered (Multi-Part)",
    description: "Separate letter and backing pieces - best for multi-material 3D printing",
  },
  flat: {
    name: "Flat / Engraved",
    description: "Letters engraved into surface - for subtle signage or CNC routing",
  },
  outline: {
    name: "Outline / Neon Tube",
    description: "Hollow tube following letter contours - thread LED strips or filament lights through",
  },
};

const materialLabels: Record<string, { name: string; color: string }> = {
  opaque: { name: "Opaque / Solid", color: "bg-zinc-600" },
  transparent: { name: "Transparent / Clear", color: "bg-blue-400/50" },
  diffuser: { name: "Diffuser / Frosted", color: "bg-white/70" },
};

export function GeometryControls() {
  const { geometrySettings, setGeometrySettings } = useEditorStore();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Letter Geometry
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Geometry Mode</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">Choose how letters are constructed for your sign type</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={geometrySettings.mode}
            onValueChange={(value: typeof geometrySettings.mode) => {
              const updates: Partial<typeof geometrySettings> = { mode: value };
              if (value === "outline") {
                updates.enableBacking = false;
              }
              setGeometrySettings(updates);
            }}
          >
            <SelectTrigger data-testid="select-geometry-mode" className="h-10">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {geometryModes.map((mode) => (
                <SelectItem key={mode} value={mode} data-testid={`geometry-mode-${mode}`}>
                  <div className="flex flex-col">
                    <span>{geometryModeLabels[mode].name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {geometryModeLabels[geometrySettings.mode].description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Letter Height</Label>
            <span className="text-sm font-mono text-muted-foreground">
              {geometrySettings.letterHeight}mm
            </span>
          </div>
          <Slider
            data-testid="slider-letter-height"
            value={[geometrySettings.letterHeight]}
            onValueChange={([value]) => setGeometrySettings({ letterHeight: value })}
            min={2}
            max={50}
            step={1}
            className="py-2"
          />
          <p className="text-xs text-muted-foreground">
            How tall letters stand from the backing
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="enable-backing" className="text-sm font-medium">
                Include Backing Plate
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Turn off for free-floating neon style signs</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="enable-backing"
              data-testid="switch-enable-backing"
              checked={geometrySettings.enableBacking ?? true}
              onCheckedChange={(checked) => setGeometrySettings({ enableBacking: checked })}
            />
          </div>
        </div>

        {geometrySettings.enableBacking !== false && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Backing Thickness</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {geometrySettings.backingThickness}mm
              </span>
            </div>
            <Slider
              data-testid="slider-backing-thickness"
              value={[geometrySettings.backingThickness]}
              onValueChange={([value]) => setGeometrySettings({ backingThickness: value })}
              min={2}
              max={30}
              step={1}
              className="py-2"
            />
          </div>
        )}

        {geometrySettings.mode === "raised" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Letter Offset</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {geometrySettings.letterOffset}mm
              </span>
            </div>
            <Slider
              data-testid="slider-letter-offset"
              value={[geometrySettings.letterOffset]}
              onValueChange={([value]) => setGeometrySettings({ letterOffset: value })}
              min={0}
              max={20}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Gap between backing and letters (for hidden LED strips)
            </p>
          </div>
        )}

        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Materials</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-xs">Assign materials for multi-material 3D printing or to visualize light diffusion</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Letter Material</Label>
            <Select
              value={geometrySettings.letterMaterial}
              onValueChange={(value: typeof geometrySettings.letterMaterial) =>
                setGeometrySettings({ letterMaterial: value })
              }
            >
              <SelectTrigger data-testid="select-letter-material" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((mat) => (
                  <SelectItem key={mat} value={mat} data-testid={`letter-material-${mat}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${materialLabels[mat].color} border border-zinc-400`} />
                      <span>{materialLabels[mat].name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Backing Material</Label>
            <Select
              value={geometrySettings.backingMaterial}
              onValueChange={(value: typeof geometrySettings.backingMaterial) =>
                setGeometrySettings({ backingMaterial: value })
              }
            >
              <SelectTrigger data-testid="select-backing-material" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((mat) => (
                  <SelectItem key={mat} value={mat} data-testid={`backing-material-${mat}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${materialLabels[mat].color} border border-zinc-400`} />
                      <span>{materialLabels[mat].name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(geometrySettings.mode === "layered" || geometrySettings.letterMaterial !== geometrySettings.backingMaterial) && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="separate-files" className="text-sm font-medium">
                  Separate Export Files
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Export letters and backing as separate STL files for multi-material printing</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="separate-files"
                data-testid="switch-separate-files"
                checked={geometrySettings.separateFiles}
                onCheckedChange={(checked) =>
                  setGeometrySettings({ separateFiles: checked })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a ZIP with separate files for each material
            </p>
          </div>
        )}

        {geometrySettings.mode === "outline" && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Export Options</Label>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="mirror-x" className="text-sm font-medium">
                  Mirror (Flip Horizontal)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Flip the model horizontally for back-lit mounting</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="mirror-x"
                data-testid="switch-mirror-x"
                checked={geometrySettings.mirrorX || false}
                onCheckedChange={(checked) =>
                  setGeometrySettings({ mirrorX: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="diffuser-cap" className="text-sm font-medium">
                  Generate Diffuser Cap
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Creates a matching lid that snaps on top to diffuse the LED light</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="diffuser-cap"
                data-testid="switch-diffuser-cap"
                checked={geometrySettings.generateDiffuserCap || false}
                onCheckedChange={(checked) =>
                  setGeometrySettings({ generateDiffuserCap: checked })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Print the cap in translucent filament for best light diffusion
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="weld-letters" className="text-sm font-medium">
                  Weld Letters Together
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Connect all letters with bridges so they print as one piece</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="weld-letters"
                data-testid="switch-weld-letters"
                checked={geometrySettings.weldLetters || false}
                onCheckedChange={(checked) =>
                  setGeometrySettings({ weldLetters: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="add-feed-holes" className="text-sm font-medium">
                  Add LED Feed Holes
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Add entry/exit holes in the back for LED wire routing</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id="add-feed-holes"
                data-testid="switch-add-feed-holes"
                checked={geometrySettings.addFeedHoles || false}
                onCheckedChange={(checked) =>
                  setGeometrySettings({ addFeedHoles: checked })
                }
              />
            </div>
            
            {geometrySettings.addFeedHoles && (
              <div className="space-y-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Hole Diameter</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {geometrySettings.feedHoleDiameter || 5}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-feed-hole-diameter"
                  value={[geometrySettings.feedHoleDiameter || 5]}
                  onValueChange={([value]) => setGeometrySettings({ feedHoleDiameter: value })}
                  min={3}
                  max={12}
                  step={1}
                  className="py-2"
                />
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => setGeometrySettings(defaultGeometrySettings)}
          data-testid="button-reset-geometry"
        >
          <RotateCcw className="h-3 w-3 mr-2" />
          Reset Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
