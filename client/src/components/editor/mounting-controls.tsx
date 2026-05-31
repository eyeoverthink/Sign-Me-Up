import { CircleDot, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mountingHolePatterns, type MountingHolePattern } from "@shared/schema";
import { useEditorStore } from "@/lib/editor-store";

const patternDescriptions: Record<MountingHolePattern, string> = {
  none: "No mounting holes",
  "2-point": "Two holes for simple mounting",
  "4-corner": "Four corner holes for stability",
  "6-point": "Six holes for large signs",
  custom: "Custom hole placement",
};

const patternIcons: Record<MountingHolePattern, JSX.Element> = {
  none: <CircleDot className="h-4 w-4 opacity-30" />,
  "2-point": (
    <div className="flex gap-1">
      <CircleDot className="h-3 w-3" />
      <CircleDot className="h-3 w-3" />
    </div>
  ),
  "4-corner": (
    <div className="grid grid-cols-2 gap-0.5">
      <CircleDot className="h-2.5 w-2.5" />
      <CircleDot className="h-2.5 w-2.5" />
      <CircleDot className="h-2.5 w-2.5" />
      <CircleDot className="h-2.5 w-2.5" />
    </div>
  ),
  "6-point": (
    <div className="grid grid-cols-3 gap-0.5">
      <CircleDot className="h-2 w-2" />
      <CircleDot className="h-2 w-2" />
      <CircleDot className="h-2 w-2" />
      <CircleDot className="h-2 w-2" />
      <CircleDot className="h-2 w-2" />
      <CircleDot className="h-2 w-2" />
    </div>
  ),
  custom: <Target className="h-4 w-4" />,
};

export function MountingControls() {
  const { mountingSettings, setMountingSettings } = useEditorStore();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CircleDot className="h-4 w-4" />
          Mounting Holes
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Hole Pattern</Label>
          <Select
            value={mountingSettings.pattern}
            onValueChange={(value: MountingHolePattern) =>
              setMountingSettings({ pattern: value })
            }
          >
            <SelectTrigger data-testid="select-mounting-pattern" className="h-10">
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent>
              {mountingHolePatterns.map((pattern) => (
                <SelectItem
                  key={pattern}
                  value={pattern}
                  data-testid={`mounting-option-${pattern}`}
                >
                  <div className="flex items-center gap-3">
                    {patternIcons[pattern]}
                    <span className="capitalize">{pattern.replace("-", " ")}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {patternDescriptions[mountingSettings.pattern]}
          </p>
        </div>

        {mountingSettings.pattern !== "none" && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Hole Diameter</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {mountingSettings.holeDiameter}mm
                </span>
              </div>
              <Slider
                data-testid="slider-hole-diameter"
                value={[mountingSettings.holeDiameter]}
                onValueChange={([value]) =>
                  setMountingSettings({ holeDiameter: value })
                }
                min={2}
                max={10}
                step={0.5}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Fits M{Math.floor(mountingSettings.holeDiameter)} screws
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Hole Depth</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {mountingSettings.holeDepth}mm
                </span>
              </div>
              <Slider
                data-testid="slider-hole-depth"
                value={[mountingSettings.holeDepth]}
                onValueChange={([value]) =>
                  setMountingSettings({ holeDepth: value })
                }
                min={5}
                max={50}
                step={1}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Inset from Edge</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {mountingSettings.insetFromEdge}mm
                </span>
              </div>
              <Slider
                data-testid="slider-inset"
                value={[mountingSettings.insetFromEdge]}
                onValueChange={([value]) =>
                  setMountingSettings({ insetFromEdge: value })
                }
                min={2}
                max={20}
                step={1}
                className="py-2"
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    Mounting Tips
                  </p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>M3-M4 screws for smaller signs</li>
                    <li>M5-M6 for larger, heavier pieces</li>
                    <li>Use wall anchors for drywall</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
