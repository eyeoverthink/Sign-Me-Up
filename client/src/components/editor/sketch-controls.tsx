import { Pencil, Trash2, Plus, MousePointer2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorStore } from "@/lib/editor-store";

export function SketchControls() {
  const { sketchPaths, removeSketchPath, setSketchPaths, inputMode, setInputMode } = useEditorStore();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          Sketch Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="p-3 bg-muted/50 rounded-md border border-dashed">
          <p className="text-xs text-muted-foreground">
            Draw custom shapes to create unique neon tube paths. Click to add points, close the path to complete.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={inputMode === "text" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setInputMode("text")}
            data-testid="button-text-mode"
          >
            <MousePointer2 className="h-4 w-4 mr-2" />
            Text Mode
          </Button>
          <Button
            variant={inputMode === "draw" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setInputMode("draw")}
            data-testid="button-sketch-mode"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Sketch Mode
          </Button>
        </div>

        {inputMode === "draw" && (
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm font-medium">Instructions</Label>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Click and drag to draw paths</li>
              <li>Release to complete a stroke</li>
              <li>Strokes become neon tube paths</li>
            </ul>
          </div>
        )}

        {sketchPaths.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sketch Paths ({sketchPaths.length})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSketchPaths([])}
                className="h-7 text-xs"
                data-testid="button-clear-all-sketches"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {sketchPaths.map((path, index) => (
                <div
                  key={path.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                >
                  <span className="text-xs font-medium">
                    Path {index + 1} ({path.points.length} points)
                    {path.closed && " - Closed"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeSketchPath(path.id)}
                    data-testid={`button-delete-sketch-${path.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
