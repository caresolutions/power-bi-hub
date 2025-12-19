import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Maximize, 
  Minimize,
  Settings,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as pbi from "powerbi-client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SliderSlide {
  id: string;
  slide_name: string;
  workspace_id: string;
  report_id: string;
  report_section: string | null;
  credential_id: string | null;
  duration_seconds: number;
  slide_order: number;
  transition_type: string;
  is_visible: boolean;
}

interface EmbedData {
  embedToken: string;
  embedUrl: string;
  reportSection: string | null;
}

interface SliderViewerProps {
  dashboardId: string;
}

const SliderViewer = ({ dashboardId }: SliderViewerProps) => {
  const [slides, setSlides] = useState<SliderSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [embedsLoading, setEmbedsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoHideControls, setAutoHideControls] = useState(true);
  const [embedDataMap, setEmbedDataMap] = useState<Map<string, EmbedData>>(new Map());
  const [loadedSlides, setLoadedSlides] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const embedContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const powerbiRef = useRef<pbi.service.Service | null>(null);
  const reportsRef = useRef<Map<string, pbi.Report>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const visibleSlides = slides.filter(s => s.is_visible);
  const currentSlide = visibleSlides[currentSlideIndex];

  useEffect(() => {
    powerbiRef.current = new pbi.service.Service(
      pbi.factories.hpmFactory,
      pbi.factories.wpmpFactory,
      pbi.factories.routerFactory
    );

    fetchSlides();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      
      // Reset all embeds
      embedContainersRef.current.forEach((container) => {
        if (powerbiRef.current) {
          powerbiRef.current.reset(container);
        }
      });
    };
  }, [dashboardId]);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("slider_slides")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .order("slide_order");

    if (data && !error) {
      setSlides(data);
      
      // Pre-fetch all embed tokens
      const visible = data.filter(s => s.is_visible);
      if (visible.length > 0) {
        await prefetchAllEmbeds(visible);
      }
    }
    setLoading(false);
  };

  const prefetchAllEmbeds = async (slidesToFetch: SliderSlide[]) => {
    setEmbedsLoading(true);
    const embedMap = new Map<string, EmbedData>();

    await Promise.all(
      slidesToFetch.map(async (slide) => {
        if (!slide.credential_id) return;

        try {
          const response = await supabase.functions.invoke("get-powerbi-embed", {
            body: { 
              workspaceId: slide.workspace_id,
              reportId: slide.report_id,
              credentialId: slide.credential_id,
              reportSection: slide.report_section,
            },
          });

          if (response.error) throw new Error(response.error.message);

          const data = response.data as any;
          if (!data.success) throw new Error(data.error || "Falha ao obter token");

          embedMap.set(slide.id, {
            embedToken: data.embedToken,
            embedUrl: data.embedUrl,
            reportSection: data.reportSection,
          });
        } catch (error) {
          console.error("Error prefetching embed for slide:", slide.id, error);
        }
      })
    );

    setEmbedDataMap(embedMap);
    setEmbedsLoading(false);
  };

  // Refresh all embeds when sequence loops
  const refreshAllEmbeds = useCallback(async () => {
    console.log("Sequence completed - refreshing all embeds...");
    
    // Reset all embed containers
    embedContainersRef.current.forEach((container) => {
      if (powerbiRef.current) {
        powerbiRef.current.reset(container);
      }
    });
    
    // Clear loaded slides to allow re-embedding
    setLoadedSlides(new Set());
    reportsRef.current.clear();
    
    // Re-fetch all embed tokens
    if (visibleSlides.length > 0) {
      await prefetchAllEmbeds(visibleSlides);
    }
  }, [visibleSlides]);

  // Embed a slide into its container
  const embedSlide = useCallback((slide: SliderSlide) => {
    const container = embedContainersRef.current.get(slide.id);
    const embedData = embedDataMap.get(slide.id);
    
    if (!container || !embedData || !powerbiRef.current || loadedSlides.has(slide.id)) {
      return;
    }

    const config: pbi.IEmbedConfiguration = {
      type: "report",
      tokenType: pbi.models.TokenType.Embed,
      accessToken: embedData.embedToken,
      embedUrl: embedData.embedUrl,
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false },
        },
        background: pbi.models.BackgroundType.Default,
        layoutType: pbi.models.LayoutType.Custom,
        customLayout: {
          displayOption: pbi.models.DisplayOption.FitToPage,
        },
      },
    };

    if (embedData.reportSection) {
      config.pageName = embedData.reportSection;
    }

    const report = powerbiRef.current.embed(container, config) as pbi.Report;
    reportsRef.current.set(slide.id, report);
    setLoadedSlides(prev => new Set(prev).add(slide.id));
  }, [embedDataMap, loadedSlides]);

  // Load current slide and preload adjacent slides
  useEffect(() => {
    if (visibleSlides.length === 0 || embedDataMap.size === 0) return;

    // Load current slide
    if (currentSlide) {
      embedSlide(currentSlide);
    }

    // Preload next slide
    const nextIndex = (currentSlideIndex + 1) % visibleSlides.length;
    const nextSlide = visibleSlides[nextIndex];
    if (nextSlide && nextSlide.id !== currentSlide?.id) {
      embedSlide(nextSlide);
    }

    // Preload previous slide
    const prevIndex = currentSlideIndex === 0 ? visibleSlides.length - 1 : currentSlideIndex - 1;
    const prevSlide = visibleSlides[prevIndex];
    if (prevSlide && prevSlide.id !== currentSlide?.id) {
      embedSlide(prevSlide);
    }
  }, [currentSlideIndex, embedDataMap, visibleSlides, currentSlide, embedSlide]);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || visibleSlides.length === 0 || !currentSlide || isTransitioning) return;

    const duration = currentSlide.duration_seconds * 1000;
    let startTime = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
    }, 50);

    timerRef.current = setTimeout(() => {
      goToNextSlide();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, currentSlideIndex, visibleSlides.length, isTransitioning]);

  const goToNextSlide = useCallback(async () => {
    const isLastSlide = currentSlideIndex >= visibleSlides.length - 1;
    const nextIndex = isLastSlide ? 0 : currentSlideIndex + 1;
    const nextSlide = visibleSlides[nextIndex];
    
    // Apply transition
    setIsTransitioning(true);
    setProgress(0);
    
    // If looping back to first slide, refresh all embeds
    if (isLastSlide) {
      console.log("Sequence complete - will refresh embeds");
      await refreshAllEmbeds();
    }
    
    setTimeout(() => {
      setCurrentSlideIndex(nextIndex);
      setIsTransitioning(false);
    }, nextSlide?.transition_type === "fade" ? 300 : 0);
  }, [currentSlideIndex, visibleSlides, refreshAllEmbeds]);

  const goToPrevSlide = useCallback(() => {
    const prevIndex = currentSlideIndex <= 0 ? visibleSlides.length - 1 : currentSlideIndex - 1;
    const prevSlide = visibleSlides[prevIndex];
    
    // Apply transition
    setIsTransitioning(true);
    setProgress(0);
    
    setTimeout(() => {
      setCurrentSlideIndex(prevIndex);
      setIsTransitioning(false);
    }, prevSlide?.transition_type === "fade" ? 300 : 0);
  }, [currentSlideIndex, visibleSlides]);

  const goToSlide = useCallback((index: number) => {
    if (index === currentSlideIndex) return;
    
    const targetSlide = visibleSlides[index];
    setIsTransitioning(true);
    setProgress(0);
    
    setTimeout(() => {
      setCurrentSlideIndex(index);
      setIsTransitioning(false);
    }, targetSlide?.transition_type === "fade" ? 300 : 0);
  }, [currentSlideIndex, visibleSlides]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setProgress(0);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (autoHideControls && isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [autoHideControls, isPlaying]);

  useEffect(() => {
    resetControlsTimer();
  }, [isPlaying, autoHideControls]);

  // Set container ref for a slide
  const setEmbedContainerRef = useCallback((slideId: string, element: HTMLDivElement | null) => {
    if (element) {
      embedContainersRef.current.set(slideId, element);
    }
  }, []);

  // Get transition class based on type
  const getTransitionClass = (slide: SliderSlide, isActive: boolean) => {
    const baseClass = "absolute inset-0 w-full h-full transition-all duration-500";
    
    if (slide.transition_type === "fade") {
      return cn(baseClass, isActive ? "opacity-100 z-10" : "opacity-0 z-0");
    }
    
    if (slide.transition_type === "slide") {
      return cn(
        baseClass,
        isActive 
          ? "translate-x-0 opacity-100 z-10" 
          : "translate-x-full opacity-0 z-0"
      );
    }
    
    // Default: instant switch
    return cn(baseClass, isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none");
  };

  if (loading || embedsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {loading ? "Carregando slides..." : "Preparando apresentação..."}
        </span>
      </div>
    );
  }

  if (visibleSlides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Nenhum slide configurado para este Slider
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col relative bg-black h-full overflow-hidden"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* All Embed Containers - stacked with transitions */}
      {visibleSlides.map((slide, index) => (
        <div
          key={slide.id}
          ref={(el) => setEmbedContainerRef(slide.id, el)}
          className={cn(
            "slider-embed-container",
            getTransitionClass(slide, index === currentSlideIndex)
          )}
        />
      ))}

      {/* Transition overlay */}
      {isTransitioning && currentSlide?.transition_type === "fade" && (
        <div className="absolute inset-0 bg-black/50 z-20 pointer-events-none animate-pulse" />
      )}

      {/* Controls Overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 z-30",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress bar */}
        <Progress value={progress} className="h-1 mb-3" />

        <div className="flex items-center justify-between">
          {/* Slide info */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {currentSlideIndex + 1} / {visibleSlides.length}
            </Badge>
            <span className="text-white font-medium">
              {currentSlide?.slide_name}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevSlide}
              className="text-white hover:bg-white/20"
              disabled={isTransitioning}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextSlide}
              className="text-white hover:bg-white/20"
              disabled={isTransitioning}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-hide" className="text-sm">
                      Auto-ocultar controles
                    </Label>
                    <Switch
                      id="auto-hide"
                      checked={autoHideControls}
                      onCheckedChange={setAutoHideControls}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {visibleSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentSlideIndex 
                  ? "bg-white w-4" 
                  : "bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SliderViewer;
