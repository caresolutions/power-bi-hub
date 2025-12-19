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

interface SliderViewerProps {
  dashboardId: string;
}

const SliderViewer = ({ dashboardId }: SliderViewerProps) => {
  const [slides, setSlides] = useState<SliderSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoHideControls, setAutoHideControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.service.Service | null>(null);
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
      if (embedContainerRef.current && powerbiRef.current) {
        powerbiRef.current.reset(embedContainerRef.current);
      }
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
    }
    setLoading(false);
  };

  // Load slide embed
  useEffect(() => {
    if (currentSlide && currentSlide.credential_id) {
      loadSlideEmbed(currentSlide);
    }
  }, [currentSlideIndex, slides]);

  const loadSlideEmbed = async (slide: SliderSlide) => {
    if (!slide.credential_id) return;
    
    setEmbedLoading(true);

    try {
      const response = await supabase.functions.invoke("get-powerbi-embed", {
        body: { 
          workspaceId: slide.workspace_id,
          reportId: slide.report_id,
          credentialId: slide.credential_id,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data as any;
      if (!data.success) throw new Error(data.error || "Falha ao obter token");

      embedReport(data, slide);
    } catch (error) {
      console.error("Error loading slide:", error);
    } finally {
      setEmbedLoading(false);
    }
  };

  const embedReport = (embedData: any, slide: SliderSlide) => {
    if (!embedContainerRef.current || !powerbiRef.current) return;

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
      },
    };

    if (slide.report_section) {
      config.pageName = slide.report_section;
    }

    powerbiRef.current.reset(embedContainerRef.current);
    powerbiRef.current.embed(embedContainerRef.current, config);
  };

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || visibleSlides.length === 0 || !currentSlide) return;

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
  }, [isPlaying, currentSlideIndex, visibleSlides.length]);

  const goToNextSlide = useCallback(() => {
    setProgress(0);
    setCurrentSlideIndex(prev => 
      prev >= visibleSlides.length - 1 ? 0 : prev + 1
    );
  }, [visibleSlides.length]);

  const goToPrevSlide = useCallback(() => {
    setProgress(0);
    setCurrentSlideIndex(prev => 
      prev <= 0 ? visibleSlides.length - 1 : prev - 1
    );
  }, [visibleSlides.length]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      className="flex-1 flex flex-col relative bg-black"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* Embed Container */}
      <div 
        ref={embedContainerRef} 
        className={cn(
          "flex-1 w-full transition-opacity duration-500",
          currentSlide?.transition_type === "fade" && "animate-fadeIn"
        )}
        style={{ minHeight: "calc(100vh - 100px)" }}
      />

      {/* Loading overlay */}
      {embedLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
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
              onClick={() => {
                setProgress(0);
                setCurrentSlideIndex(index);
              }}
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
