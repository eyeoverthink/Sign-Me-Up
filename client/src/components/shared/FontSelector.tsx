import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Library, Type, Search, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FontPreviewSelect } from '@/components/font-preview-select';

export interface FontInfo {
  id: string;
  name: string;  // Display name
  filename: string;  // Relative path for serving
  path: string;  // Full absolute path
  category: string;
}

export interface UploadedFont {
  name: string;
  data: string;
  familyName: string;
}

interface FontSelectorProps {
  selectedFont: string;
  onFontSelect: (fontFile: string, familyName?: string) => void;
  uploadedFont: UploadedFont | null;
  onFontUpload: (font: UploadedFont | null) => void;
  fontOverride?: string;
  onFontOverrideChange?: (override: string) => void;
  showPreview?: boolean;
  previewCharacter?: string;
  compact?: boolean;
}

function FontPreviewDisplay({ 
  character, 
  fontFile,
  uploadedFont 
}: { 
  character: string; 
  fontFile: string;
  uploadedFont: UploadedFont | null;
}) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const fontId = `shared-preview-font-${fontFile || 'default'}`;

  useEffect(() => {
    if (!fontFile && !uploadedFont) {
      setFontLoaded(true);
      return;
    }

    const loadFont = async () => {
      try {
        let fontFace: FontFace;
        
        if (uploadedFont) {
          fontFace = new FontFace(fontId, `url(${uploadedFont.data})`);
        } else if (fontFile) {
          fontFace = new FontFace(fontId, `url(/api/font-library/${encodeURIComponent(fontFile)})`);
        } else {
          setFontLoaded(true);
          return;
        }

        const loaded = await fontFace.load();
        document.fonts.add(loaded);
        setFontLoaded(true);
      } catch (err) {
        console.error('Font load error:', err);
        setFontLoaded(true);
      }
    };

    setFontLoaded(false);
    loadFont();
  }, [fontFile, uploadedFont, fontId]);

  return (
    <div 
      className="text-6xl transition-opacity duration-200"
      style={{ 
        fontFamily: fontLoaded && (fontFile || uploadedFont) ? `"${fontId}", sans-serif` : 'inherit',
        opacity: fontLoaded ? 1 : 0.5
      }}
      data-testid="shared-font-preview-display"
    >
      {character}
    </div>
  );
}

export function FontSelector({
  selectedFont,
  onFontSelect,
  uploadedFont,
  onFontUpload,
  fontOverride = '',
  onFontOverrideChange,
  showPreview = true,
  previewCharacter = 'Aa',
  compact = false,
}: FontSelectorProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: fontsData, isLoading } = useQuery<{ success: boolean; fonts: FontInfo[]; count: number }>({
    queryKey: ['/api/fonts/library'],
  });

  const fonts = fontsData?.fonts || [];
  const fontsByCategory = fonts.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontInfo[]>);

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      toast({
        title: 'Invalid font format',
        description: 'Please upload a TTF, OTF, WOFF, or WOFF2 font file.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fontData = event.target?.result as string;
      const familyName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '').replace(/[-_]/g, ' ');
      onFontUpload({
        name: file.name,
        data: fontData,
        familyName,
      });
      onFontSelect('', familyName);
      toast({
        title: 'Font uploaded',
        description: `"${file.name}" is ready to use.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateFontFamilyName = (name: string) => {
    if (uploadedFont) {
      onFontUpload({ ...uploadedFont, familyName: name });
    }
  };

  const filteredFonts = searchQuery
    ? fonts.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.filename.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : fonts;

  const categories = Object.keys(fontsByCategory).sort();

  return (
    <div className={`space-y-3 ${compact ? 'space-y-2' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onChange={handleFontUpload}
        className="hidden"
        data-testid="input-font-upload"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={compact ? 'text-xs' : ''}>Font Selection</Label>
          <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-open-font-library">
                <Library className="h-4 w-4 mr-1" />
                Library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Font Library ({fonts.length} fonts)
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex items-center gap-2 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fonts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  data-testid="input-font-search"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {searchQuery ? (
                <ScrollArea className="flex-1 h-[calc(85vh-200px)]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                    {filteredFonts.map((font, idx) => (
                      <Button
                        key={`search-${font.filename}-${idx}`}
                        variant={selectedFont === font.filename ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-start justify-start text-left"
                        onClick={() => {
                          onFontSelect(font.filename, font.name);
                          onFontUpload(null);
                          setLibraryOpen(false);
                        }}
                        data-testid={`button-select-font-${font.filename}`}
                      >
                        <span className="text-sm font-medium truncate w-full">{font.name}</span>
                        <span className="text-xs text-muted-foreground truncate w-full">{font.category}</span>
                      </Button>
                    ))}
                  </div>
                  {filteredFonts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No fonts found matching "{searchQuery}"
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <Tabs defaultValue={categories[0]} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="flex flex-wrap gap-1 h-auto">
                    {categories.map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="text-xs">
                        {cat} ({fontsByCategory[cat]?.length || 0})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {categories.map((cat) => (
                    <TabsContent key={cat} value={cat} className="flex-1 mt-2 overflow-hidden">
                      <ScrollArea className="h-[calc(85vh-200px)]">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                          {(fontsByCategory[cat] || []).map((font, idx) => (
                            <Button
                              key={`${cat}-${font.filename}-${idx}`}
                              variant={selectedFont === font.filename ? 'default' : 'outline'}
                              className="h-auto py-3 flex flex-col items-start justify-start text-left"
                              onClick={() => {
                                onFontSelect(font.filename, font.name);
                                onFontUpload(null);
                                setLibraryOpen(false);
                              }}
                              data-testid={`button-select-font-${font.filename}`}
                            >
                              <span className="text-sm font-medium truncate w-full">{font.name}</span>
                              <span className="text-xs text-muted-foreground truncate w-full">{font.category}</span>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <FontPreviewSelect
          value={selectedFont}
          onValueChange={(fontFile, fontName) => {
            onFontSelect(fontFile, fontName);
            if (fontFile) onFontUpload(null);
          }}
          placeholder="Select from library..."
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
          data-testid="button-upload-font"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Custom Font
        </Button>
        {uploadedFont && (
          <Badge variant="secondary" className="text-xs">
            {uploadedFont.name}
          </Badge>
        )}
      </div>

      {uploadedFont && (
        <div className="space-y-1">
          <Label className="text-xs">Font Family Name (for OpenSCAD)</Label>
          <Input
            value={uploadedFont.familyName}
            onChange={(e) => updateFontFamilyName(e.target.value)}
            placeholder="Enter font family name..."
            className="h-8 text-sm"
            data-testid="input-font-family-name"
          />
          <p className="text-xs text-muted-foreground">
            This must match the font's internal family name for OpenSCAD
          </p>
        </div>
      )}

      {onFontOverrideChange && (
        <div className="space-y-1">
          <Label className="text-xs">Font Override (optional)</Label>
          <Input
            value={fontOverride}
            onChange={(e) => onFontOverrideChange(e.target.value)}
            placeholder="Override font family name..."
            className="h-8 text-sm"
            data-testid="input-font-override"
          />
        </div>
      )}

      {showPreview && (
        <Card>
          <CardHeader className="pb-2 py-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Type className="h-3 w-3" />
              Font Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="bg-muted rounded-lg p-4 text-center">
              <FontPreviewDisplay 
                character={previewCharacter} 
                fontFile={selectedFont}
                uploadedFont={uploadedFont}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                {selectedFont 
                  ? `Using: ${fontOverride || fonts.find(f => f.filename === selectedFont)?.name || selectedFont}`
                  : uploadedFont 
                    ? `Custom: ${uploadedFont.familyName}`
                    : 'No font selected'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
