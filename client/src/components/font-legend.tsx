import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, BookOpen, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FontItem {
  id: string;
  name: string;
  filename: string;
  category: string;
}

interface FontCategory {
  name: string;
  description: string;
  sampleText: string;
  fonts: FontItem[];
}

interface FontLibraryResponse {
  totalFonts: number;
  categories: FontCategory[];
}

interface FontLegendProps {
  onSelectFont?: (font: FontItem) => void;
  selectedFontFilename?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Emoji': 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Symbol': 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  'Signs': 'bg-red-500/20 text-red-700 dark:text-red-400',
  'Logos': 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'Hieroglyphs': 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  'Neon': 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
  'Script': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Display': 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  'Handwritten': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
  'Fun': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  'DevIcons': 'bg-slate-500/20 text-slate-700 dark:text-slate-400',
  'Transport': 'bg-teal-500/20 text-teal-700 dark:text-teal-400',
  'Other': 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
};

function FontPreview({ font, sampleText }: { font: FontItem; sampleText: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const fontFaceId = `font-${font.id}`;

  useEffect(() => {
    const loadFont = async () => {
      try {
        const existingFont = document.fonts.check(`16px "${fontFaceId}"`);
        if (existingFont) {
          setLoaded(true);
          return;
        }

        const fontFace = new FontFace(
          fontFaceId,
          `url(/api/font-library/${encodeURIComponent(font.filename)})`
        );
        
        await fontFace.load();
        document.fonts.add(fontFace);
        setLoaded(true);
      } catch (err) {
        console.warn(`Failed to load font ${font.name}:`, err);
        setError(true);
      }
    };

    loadFont();
  }, [font.filename, font.name, fontFaceId]);

  if (error) {
    return (
      <span className="text-muted-foreground text-sm italic">
        Preview unavailable
      </span>
    );
  }

  if (!loaded) {
    return (
      <span className="text-muted-foreground text-sm">
        Loading...
      </span>
    );
  }

  return (
    <span 
      style={{ fontFamily: `"${fontFaceId}", sans-serif` }}
      className="text-lg leading-tight"
    >
      {sampleText}
    </span>
  );
}

export function FontLegend({ onSelectFont, selectedFontFilename }: FontLegendProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedFont, setCopiedFont] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<FontLibraryResponse>({
    queryKey: ["/api/font-library"],
    enabled: open
  });

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    
    let categories = data.categories;
    
    if (activeCategory !== "all") {
      categories = categories.filter(cat => cat.name === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      categories = categories.map(cat => ({
        ...cat,
        fonts: cat.fonts.filter(font => 
          font.name.toLowerCase().includes(query) ||
          font.filename.toLowerCase().includes(query)
        )
      })).filter(cat => cat.fonts.length > 0);
    }
    
    return categories;
  }, [data, activeCategory, searchQuery]);

  const totalFiltered = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => sum + cat.fonts.length, 0);
  }, [filteredCategories]);

  const handleSelectFont = (font: FontItem) => {
    if (onSelectFont) {
      onSelectFont(font);
      setOpen(false);
      toast({
        title: "Font Selected",
        description: `${font.name} will be used for your sign.`
      });
    }
  };

  const handleCopyFilename = (filename: string) => {
    navigator.clipboard.writeText(filename);
    setCopiedFont(filename);
    setTimeout(() => setCopiedFont(null), 2000);
    toast({
      title: "Copied",
      description: "Font filename copied to clipboard."
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          data-testid="button-font-legend"
        >
          <BookOpen className="h-4 w-4" />
          Font Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BookOpen className="h-5 w-5" />
            SignCraft 3D Font Library
            {data && (
              <Badge variant="secondary" className="ml-2">
                {data.totalFonts} Fonts
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading font library...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load font library. Please try again.
          </div>
        ) : data ? (
          <div className="flex flex-col flex-1 min-h-0 gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fonts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-font-search"
                />
              </div>
              <Badge variant="outline">
                {totalFiltered} fonts shown
              </Badge>
            </div>

            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 min-h-0 flex flex-col">
              <div className="overflow-x-auto w-full">
                <TabsList className="w-max">
                  <TabsTrigger value="all" data-testid="tab-all-fonts">
                    All
                  </TabsTrigger>
                  {data.categories.map(cat => (
                    <TabsTrigger 
                      key={cat.name} 
                      value={cat.name}
                      className="gap-1"
                      data-testid={`tab-${cat.name.toLowerCase()}`}
                    >
                      {cat.name}
                      <span className="text-xs text-muted-foreground">
                        ({cat.fonts.length})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="flex-1 mt-4 pr-4 h-[calc(85vh-200px)]">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fonts found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredCategories.map(category => (
                      <div key={category.name} className="space-y-3">
                        <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                          <Badge className={CATEGORY_COLORS[category.name] || CATEGORY_COLORS['Other']}>
                            {category.name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {category.description}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {category.fonts.length} fonts
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.fonts.map((font, idx) => (
                            <Card 
                              key={`${font.filename}-${idx}`} 
                              className={`hover-elevate cursor-pointer transition-all ${
                                selectedFontFilename === font.filename 
                                  ? 'ring-2 ring-primary' 
                                  : ''
                              }`}
                              onClick={() => handleSelectFont(font)}
                              data-testid={`font-card-${font.filename}`}
                            >
                              <CardContent className="p-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">
                                      {font.name}
                                    </span>
                                    {selectedFontFilename === font.filename && (
                                      <Check className="h-4 w-4 text-primary shrink-0" />
                                    )}
                                  </div>
                                  <div className="mt-1 overflow-hidden">
                                    <FontPreview font={font} sampleText={category.sampleText} />
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFilename(font.filename);
                                  }}
                                  data-testid={`button-copy-${font.id}`}
                                >
                                  {copiedFont === font.filename ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
