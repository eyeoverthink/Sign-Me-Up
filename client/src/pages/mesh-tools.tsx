import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Download, 
  Map,
  Mountain,
  Loader2,
  MapPin,
  Maximize2,
  Grid3X3,
  Search
} from "lucide-react";

interface TerrainSettings {
  lat: number;
  lng: number;
  size: number; // km
  resolution: number; // grid points
  heightScale: number;
  baseThickness: number;
}

const PRESET_LOCATIONS = [
  { name: "Grand Canyon, USA", lat: 36.0544, lng: -112.1401 },
  { name: "Mount Everest", lat: 27.9881, lng: 86.9250 },
  { name: "Mount Fuji, Japan", lat: 35.3606, lng: 138.7274 },
  { name: "Swiss Alps", lat: 46.5197, lng: 7.9613 },
  { name: "Yosemite, USA", lat: 37.8651, lng: -119.5383 },
  { name: "Machu Picchu, Peru", lat: -13.1631, lng: -72.5450 },
  { name: "Table Mountain, SA", lat: -33.9628, lng: 18.4098 },
  { name: "Matterhorn, Alps", lat: 45.9763, lng: 7.6586 },
  { name: "Kilimanjaro, Tanzania", lat: -3.0674, lng: 37.3556 },
  { name: "Uluru, Australia", lat: -25.3444, lng: 131.0369 }
];

const defaultSettings: TerrainSettings = {
  lat: 36.0544,
  lng: -112.1401,
  size: 10,
  resolution: 100,
  heightScale: 2.0,
  baseThickness: 5
};

export default function MeshToolsPage() {
  const [settings, setSettings] = useState<TerrainSettings>(defaultSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{display_name: string; lat: string; lon: string}>>([]);
  const { toast } = useToast();

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&limit=5`,
        { headers: { 'User-Agent': 'SignCraft3D/1.0' } }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const results = await response.json();
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "Try a different address or city name",
          variant: "destructive"
        });
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not search for location",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: {display_name: string; lat: string; lon: string}) => {
    setSettings({
      ...settings,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    });
    setSearchResults([]);
    setAddressSearch("");
    toast({
      title: "Location Set",
      description: result.display_name.split(',').slice(0, 2).join(',')
    });
  };

  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    setSettings({ ...settings, lat: preset.lat, lng: preset.lng });
    toast({
      title: "Location Set",
      description: `${preset.name}`
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress("Fetching elevation data...");

    try {
      const response = await fetch('/api/terrain/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate terrain');
      }

      setGenerationProgress("Building 3D mesh...");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terrain_${settings.lat.toFixed(4)}_${settings.lng.toFixed(4)}.stl`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Terrain Generated!",
        description: "STL file downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  // Generate OpenStreetMap preview URL
  const mapPreviewUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${settings.lng - settings.size / 111}%2C${settings.lat - settings.size / 111}%2C${settings.lng + settings.size / 111}%2C${settings.lat + settings.size / 111}&layer=mapnik&marker=${settings.lat}%2C${settings.lng}`;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="ghost" size="icon" data-testid="button-back-portal">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Mountain className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Map Terrain Generator</h1>
              <Badge variant="secondary">Native</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Generate procedural terrain STL files for 3D printing
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Address Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Location
                </CardTitle>
                <CardDescription>Search by address, city, or place name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter address, city, zip code..."
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                    data-testid="input-address-search"
                  />
                  <Button 
                    onClick={handleAddressSearch}
                    disabled={isSearching || !addressSearch.trim()}
                    data-testid="button-search-address"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2 bg-muted/50">
                    {searchResults.map((result, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => handleSelectSearchResult(result)}
                        data-testid={`search-result-${idx}`}
                      >
                        <MapPin className="h-3 w-3 mr-2 shrink-0 text-primary" />
                        <span className="truncate text-sm">{result.display_name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Famous Locations
                </CardTitle>
                <CardDescription>Quick-select popular terrain locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_LOCATIONS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handlePresetSelect(preset)}
                      data-testid={`preset-${preset.name.toLowerCase().replace(/[,\s]+/g, '-')}`}
                    >
                      <MapPin className="h-3 w-3 mr-2 shrink-0" />
                      <span className="truncate text-sm">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coordinates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Coordinates
                </CardTitle>
                <CardDescription>Enter GPS coordinates for your terrain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={settings.lat}
                      onChange={(e) => setSettings({ ...settings, lat: parseFloat(e.target.value) || 0 })}
                      placeholder="36.0544"
                      data-testid="input-latitude"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={settings.lng}
                      onChange={(e) => setSettings({ ...settings, lng: parseFloat(e.target.value) || 0 })}
                      placeholder="-112.1401"
                      data-testid="input-longitude"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Get coordinates from Google Maps by right-clicking any location
                </p>
              </CardContent>
            </Card>

            {/* Model Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Model Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Area Size (km): {settings.size}</Label>
                  <Slider
                    value={[settings.size]}
                    onValueChange={([v]) => setSettings({ ...settings, size: v })}
                    min={1}
                    max={50}
                    step={1}
                    data-testid="slider-size"
                  />
                  <p className="text-xs text-muted-foreground">Size of the terrain area in kilometers</p>
                </div>

                <div className="space-y-2">
                  <Label>Resolution: {settings.resolution}x{settings.resolution}</Label>
                  <Slider
                    value={[settings.resolution]}
                    onValueChange={([v]) => setSettings({ ...settings, resolution: v })}
                    min={20}
                    max={200}
                    step={10}
                    data-testid="slider-resolution"
                  />
                  <p className="text-xs text-muted-foreground">Higher = more detail, larger file</p>
                </div>

                <div className="space-y-2">
                  <Label>Height Scale: {settings.heightScale}x</Label>
                  <Slider
                    value={[settings.heightScale]}
                    onValueChange={([v]) => setSettings({ ...settings, heightScale: v })}
                    min={0.5}
                    max={5}
                    step={0.1}
                    data-testid="slider-height-scale"
                  />
                  <p className="text-xs text-muted-foreground">Exaggerate vertical features</p>
                </div>

                <div className="space-y-2">
                  <Label>Base Thickness (mm): {settings.baseThickness}</Label>
                  <Slider
                    value={[settings.baseThickness]}
                    onValueChange={([v]) => setSettings({ ...settings, baseThickness: v })}
                    min={2}
                    max={20}
                    step={1}
                    data-testid="slider-base-thickness"
                  />
                  <p className="text-xs text-muted-foreground">Minimum base for printability</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Generate */}
          <div className="space-y-6">
            {/* Map Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize2 className="h-5 w-5" />
                  Location Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={mapPreviewUrl}
                    title="Map Preview"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  OpenStreetMap preview of selected area
                </p>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{settings.size}</p>
                    <p className="text-xs text-muted-foreground">km area</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{settings.resolution * settings.resolution}</p>
                    <p className="text-xs text-muted-foreground">data points</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{((settings.resolution - 1) * (settings.resolution - 1) * 2 / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-muted-foreground">triangles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              className="w-full h-14 text-lg"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="button-generate-terrain"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {generationProgress}
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Generate 3D Terrain STL
                </>
              )}
            </Button>

            {/* Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">How it works:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Select a location using presets or enter coordinates</li>
                  <li>Adjust size, resolution, and height scale</li>
                  <li>Generate downloads a 3D printable STL file</li>
                  <li>Print on any 3D printer!</li>
                </ol>
                <p className="mt-3 text-xs">
                  Uses procedural terrain generation based on coordinates. Same GPS location always produces the same terrain.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
