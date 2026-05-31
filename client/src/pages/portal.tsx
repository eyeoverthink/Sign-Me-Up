import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Smile, 
  FileImage, 
  Box, 
  Wrench, 
  ArrowRight,
  Sparkles,
  Zap,
  Globe
} from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  features: string[];
}

function ToolCard({ title, description, icon, href, badge, features }: ToolCardProps) {
  return (
    <Card className="hover-elevate group relative overflow-visible">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
        <Link href={href}>
          <Button className="w-full group" data-testid={`button-portal-${title.toLowerCase().replace(/\s/g, '-')}`}>
            Open Tool
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function PortalPage() {
  const tools: ToolCardProps[] = [
    {
      title: "Emoji Library",
      description: "Browse and use 1,500+ emojis for LED signs. Search by name or keyword - no guessing!",
      icon: <Smile className="h-6 w-6" />,
      href: "/emoji-library",
      badge: "Native",
      features: [
        "1,500+ named emojis",
        "Search by keyword",
        "Ancient & hieroglyphics",
        "Category dropdown"
      ]
    },
    {
      title: "Direct STL Export",
      description: "Convert any image to 3D printable STL. Like imagetostl.com but with LED sign optimization.",
      icon: <FileImage className="h-6 w-6" />,
      href: "/direct-stl",
      badge: "Free",
      features: [
        "PNG, JPG, WebP support",
        "Heightmap & extrude modes",
        "Instant binary STL",
        "No OpenSCAD needed"
      ]
    },
    {
      title: "Sovereign Engine",
      description: "Tri-Layer LED sign system. Generates OpenSCAD files for Body, Lid, and Detail overlay parts.",
      icon: <Box className="h-6 w-6" />,
      href: "/sovereign-engine",
      badge: "V16",
      features: [
        "Body + Lid + Detail layers",
        "LED channel optimization",
        "Snap-fit tolerance control",
        "Wire exit & mounting holes"
      ]
    },
    {
      title: "Terrain Generator",
      description: "Generate procedural 3D terrain from GPS coordinates for 3D printing.",
      icon: <Wrench className="h-6 w-6" />,
      href: "/mesh-tools",
      badge: "Native",
      features: [
        "10 famous preset locations",
        "Custom GPS coordinates",
        "Adjustable resolution/scale",
        "Direct STL download"
      ]
    },
    {
      title: "Universe Map",
      description: "Explore the cosmos! 3D print planets, moons, and constellations with real astronomical data.",
      icon: <Globe className="h-6 w-6" />,
      href: "/universe",
      badge: "NEW",
      features: [
        "Real planetary data",
        "Lithophane & topographical modes",
        "Constellations with star lines",
        "STL, OBJ, SVG export"
      ]
    }
  ];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Tool Portal</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Free tools that do what other sites can't. All-in-one 3D sign creation suite.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              No account required
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Instant processing
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6" data-testid="portal-tools-grid">
          {tools.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-semibold text-lg">Looking for the full sign editors?</h3>
                <p className="text-sm text-muted-foreground">
                  Create complete LED signs with fonts, mounting holes, and wire channels.
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/">
                  <Button variant="outline" data-testid="button-portal-editors">
                    Open Editors
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
