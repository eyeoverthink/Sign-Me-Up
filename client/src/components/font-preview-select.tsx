import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface FontPreviewSelectProps {
  value: string;
  onValueChange: (filename: string, fontName: string) => void;
  placeholder?: string;
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

function FontPreviewItem({ 
  font, 
  isSelected, 
  onClick 
}: { 
  font: FontItem; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const fontFaceId = `preview-${font.id}`;

  useEffect(() => {
    let mounted = true;
    const loadFont = async () => {
      try {
        if (document.fonts.check(`20px "${fontFaceId}"`)) {
          if (mounted) setLoaded(true);
          return;
        }

        const fontFace = new FontFace(
          fontFaceId,
          `url(/api/font-library/${encodeURIComponent(font.filename)})`
        );
        
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);
        if (mounted) setLoaded(true);
      } catch (err) {
        if (mounted) setLoaded(true);
      }
    };

    loadFont();
    return () => { mounted = false; };
  }, [font.filename, fontFaceId]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left hover-elevate rounded-md transition-colors",
        isSelected && "bg-accent"
      )}
      data-testid={`font-option-${font.id}`}
    >
      <div className="flex-1 min-w-0">
        <div 
          className="text-base truncate"
          style={{ 
            fontFamily: loaded ? `"${fontFaceId}", sans-serif` : 'inherit',
            minHeight: '24px'
          }}
        >
          {font.name}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {font.filename}
        </div>
      </div>
      <Badge 
        variant="secondary" 
        className={cn("text-[10px] shrink-0", CATEGORY_COLORS[font.category])}
      >
        {font.category}
      </Badge>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export function FontPreviewSelect({ 
  value, 
  onValueChange,
  placeholder = "Select a font..."
}: FontPreviewSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<FontLibraryResponse>({
    queryKey: ['/api/font-library'],
  });

  const allFonts = useMemo(() => {
    if (!data) return [];
    return data.categories.flatMap(cat => cat.fonts);
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    return data.categories.map(cat => ({ name: cat.name, count: cat.fonts.length }));
  }, [data]);

  const filteredFonts = useMemo(() => {
    let fonts = allFonts;
    
    if (selectedCategory) {
      fonts = fonts.filter(f => f.category === selectedCategory);
    }
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      fonts = fonts.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        f.filename.toLowerCase().includes(searchLower)
      );
    }
    
    return fonts;
  }, [allFonts, selectedCategory, search]);

  const selectedFont = allFonts.find(f => f.filename === value);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          data-testid="select-font-dropdown"
        >
          <span className="truncate">
            {selectedFont ? selectedFont.name : (value === 'auto' || !value ? 'Auto-detect' : placeholder)}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="start"
        data-testid="font-dropdown-content"
      >
        <div className="p-3 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-font-search"
            />
          </div>
          
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(null)}
              data-testid="filter-all-fonts"
            >
              All ({data?.totalFonts || 0})
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(cat.name)}
                data-testid={`filter-${cat.name.toLowerCase()}`}
              >
                {cat.name} ({cat.count})
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2">
              <button
                onClick={() => {
                  onValueChange('', 'auto');
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left hover-elevate rounded-md transition-colors mb-1",
                  (!value || value === 'auto') && "bg-accent"
                )}
                data-testid="font-option-auto"
              >
                <div className="flex-1">
                  <div className="text-base">Auto-detect</div>
                  <div className="text-xs text-muted-foreground">
                    Best font for the character
                  </div>
                </div>
                {(!value || value === 'auto') && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>

              <div className="border-t my-2" />

              {filteredFonts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No fonts found
                </div>
              ) : (
                filteredFonts.map((font, idx) => (
                  <FontPreviewItem
                    key={`${font.filename}-${idx}`}
                    font={font}
                    isSelected={value === font.filename}
                    onClick={() => {
                      onValueChange(font.filename, font.name);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          {filteredFonts.length} of {data?.totalFonts || 0} fonts
        </div>
      </PopoverContent>
    </Popover>
  );
}
