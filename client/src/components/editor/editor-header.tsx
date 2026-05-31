import { Box, Save, FileDown, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEditorStore } from "@/lib/editor-store";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function EditorHeader() {
  const [projectName, setProjectName] = useState("Untitled Sign");
  const { letterSettings, resetAll } = useEditorStore();
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Project saved",
      description: `"${projectName}" has been saved successfully.`,
    });
  };

  const handleNew = () => {
    resetAll();
    setProjectName("Untitled Sign");
    toast({
      title: "New project created",
      description: "All settings have been reset.",
    });
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Box className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              SignCraft 3D
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Signage Generator
            </span>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8" />

        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-48 h-8 text-sm"
          data-testid="input-project-name"
        />
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNew}
              data-testid="button-new"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create new project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save project (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-help">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help & shortcuts</TooltipContent>
        </Tooltip>

        <ThemeToggle />
      </div>
    </header>
  );
}
