import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Search, FolderDown, Clock, FileType, Image, Globe, Layers, ScanLine, Grid3X3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportRecord {
  id: string;
  name: string;
  type: 'symbol' | 'combo' | 'image' | 'led-grid' | 'custom-font' | 'phrase' | 'other';
  timestamp: number;
  preview?: string;
  metadata?: {
    character?: string;
    text?: string;
    fontSize?: number;
    fontFile?: string;
  };
}

const STORAGE_KEY = 'signcraft_exports';

function getTypeIcon(type: string) {
  switch (type) {
    case 'symbol': return Globe;
    case 'combo': return Layers;
    case 'image': return ScanLine;
    case 'led-grid': return Grid3X3;
    case 'custom-font': return FileType;
    default: return FileType;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'symbol': return 'Symbol Sign';
    case 'combo': return 'Combo Sign';
    case 'image': return 'Logo Sign';
    case 'led-grid': return 'LED Grid';
    case 'custom-font': return 'Font Sign';
    case 'phrase': return 'Phrase Sign';
    default: return 'Other';
  }
}

export function loadExports(): ExportRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveExport(record: Omit<ExportRecord, 'id' | 'timestamp'>): ExportRecord {
  const exports = loadExports();
  const newExport: ExportRecord = {
    ...record,
    id: `export_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  exports.unshift(newExport);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exports.slice(0, 100)));
  return newExport;
}

export function deleteExport(id: string): void {
  const exports = loadExports();
  const filtered = exports.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export default function MyExportsManager() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setExports(loadExports());
  }, []);

  const filteredExports = exports.filter(exp => {
    const matchesSearch = !searchQuery || 
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.metadata?.character?.includes(searchQuery) ||
      exp.metadata?.text?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || exp.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    deleteExport(id);
    setExports(loadExports());
    toast({ title: "Export deleted", description: "The export record has been removed" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const types = ['symbol', 'combo', 'image', 'led-grid', 'custom-font', 'phrase'];

  return (
    <div className="h-full p-4 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderDown className="h-5 w-5" />
              My Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-exports"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={filterType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(null)}
                  data-testid="button-filter-all"
                >
                  All
                </Button>
                {types.map(type => {
                  const Icon = getTypeIcon(type);
                  return (
                    <Button
                      key={type}
                      variant={filterType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType(type)}
                      data-testid={`button-filter-${type}`}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {getTypeLabel(type).split(' ')[0]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {filteredExports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No exports yet</p>
                <p className="text-sm">
                  {exports.length === 0 
                    ? "Create and export designs from other tabs - they'll appear here automatically"
                    : "No exports match your search criteria"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  {filteredExports.map(exp => {
                    const Icon = getTypeIcon(exp.type);
                    return (
                      <Card key={exp.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              {exp.preview ? (
                                <img src={exp.preview} alt="" className="w-10 h-10 object-contain" />
                              ) : exp.metadata?.character ? (
                                <span className="text-2xl">{exp.metadata.character}</span>
                              ) : (
                                <Icon className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{exp.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getTypeLabel(exp.type)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(exp.timestamp)}
                                {exp.metadata?.fontFile && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span>Font: {exp.metadata.fontFile}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(exp.id)}
                                data-testid={`button-delete-${exp.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                {exports.length} export{exports.length !== 1 ? 's' : ''} saved locally • 
                Exports are stored in your browser and persist between sessions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
