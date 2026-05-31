import { Grid3X3, Box, Ruler, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorStore } from "@/lib/editor-store";

export function ViewControls() {
  const {
    showGrid,
    showWireframe,
    showMeasurements,
    setShowGrid,
    setShowWireframe,
    setShowMeasurements,
    resetAll,
  } = useEditorStore();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Box className="h-4 w-4" />
          View Options
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-3">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="grid-toggle"
            className="text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            Show Grid
          </Label>
          <Switch
            id="grid-toggle"
            data-testid="switch-grid"
            checked={showGrid}
            onCheckedChange={setShowGrid}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label
            htmlFor="wireframe-toggle"
            className="text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Box className="h-4 w-4 text-muted-foreground" />
            Wireframe Mode
          </Label>
          <Switch
            id="wireframe-toggle"
            data-testid="switch-wireframe"
            checked={showWireframe}
            onCheckedChange={setShowWireframe}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label
            htmlFor="measurements-toggle"
            className="text-sm font-medium flex items-center gap-2 cursor-pointer"
          >
            <Ruler className="h-4 w-4 text-muted-foreground" />
            Show Dimensions
          </Label>
          <Switch
            id="measurements-toggle"
            data-testid="switch-measurements"
            checked={showMeasurements}
            onCheckedChange={setShowMeasurements}
          />
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={resetAll}
            data-testid="button-reset-all"
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            Reset All Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
