import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Editor from "@/pages/editor";
import PortalPage from "@/pages/portal";
import DirectSTLPage from "@/pages/direct-stl";
import EmojiLibraryPage from "@/pages/emoji-library";
import SovereignEnginePage from "@/pages/sovereign-engine";
import MeshToolsPage from "@/pages/mesh-tools";
import PhiBridgePage from "@/pages/phi-bridge";
import UniverseMapPage from "@/pages/universe-map";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Editor} />
      <Route path="/portal" component={PortalPage} />
      <Route path="/direct-stl" component={DirectSTLPage} />
      <Route path="/emoji-library" component={EmojiLibraryPage} />
      <Route path="/sovereign-engine" component={SovereignEnginePage} />
      <Route path="/mesh-tools" component={MeshToolsPage} />
      <Route path="/phi-bridge" component={PhiBridgePage} />
      <Route path="/universe" component={UniverseMapPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
