import { Monitor, Printer, Clock } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { fontOptions } from "@shared/schema";

export function StatusBar() {
  const { letterSettings, wiringSettings, mountingSettings } = useEditorStore();

  const selectedFont = fontOptions.find((f) => f.id === letterSettings.fontId);

  const width = letterSettings.text.length * 40 * letterSettings.scale;
  const height = 60 * letterSettings.scale;
  const depth = letterSettings.depth;

  const features: string[] = [];
  if (wiringSettings.channelType !== "none") {
    features.push(`Wire: ${wiringSettings.channelType}`);
  }
  if (mountingSettings.pattern !== "none") {
    features.push(`Mount: ${mountingSettings.pattern}`);
  }

  const estimatedTime = Math.round(
    letterSettings.text.length * depth * letterSettings.scale * 0.3
  );

  return (
    <footer className="h-8 border-t bg-muted/30 flex items-center justify-between px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Monitor className="h-3 w-3" />
          <span className="font-mono">
            {width.toFixed(0)} x {height.toFixed(0)} x {depth}mm
          </span>
        </div>

        <span className="text-muted-foreground/50">|</span>

        <div className="flex items-center gap-1.5">
          <span>Font:</span>
          <span className="font-medium text-foreground">
            {selectedFont?.name || "Inter"}
          </span>
        </div>

        {features.length > 0 && (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span>{features.join(" | ")}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Printer className="h-3 w-3" />
          <span>3D Print Ready</span>
        </div>

        <span className="text-muted-foreground/50">|</span>

        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span className="font-mono">~{estimatedTime} min print</span>
        </div>
      </div>
    </footer>
  );
}
