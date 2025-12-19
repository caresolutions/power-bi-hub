import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Sparkles, Link2, Eye, EyeOff, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface SliderSlide {
  id?: string;
  slide_name: string;
  workspace_id: string;
  report_id: string;
  report_section: string;
  credential_id: string;
  duration_seconds: number;
  slide_order: number;
  transition_type: string;
  is_visible: boolean;
}

interface Credential {
  id: string;
  name: string;
}

interface SliderSlidesManagerProps {
  slides: SliderSlide[];
  onSlidesChange: (slides: SliderSlide[]) => void;
  credentials: Credential[];
}

const transitionTypes = [
  { value: "fade", label: "Fade (Desvanecer)" },
  { value: "slide", label: "Slide (Deslizar)" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip (Virar)" },
  { value: "none", label: "Nenhuma" },
];

const SliderSlidesManager = ({ slides, onSlidesChange, credentials }: SliderSlidesManagerProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [slideName, setSlideName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [reportId, setReportId] = useState("");
  const [reportSection, setReportSection] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [transitionType, setTransitionType] = useState("fade");
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const resetForm = () => {
    setUrl("");
    setSlideName("");
    setWorkspaceId("");
    setReportId("");
    setReportSection("");
    setCredentialId("");
    setDurationSeconds(30);
    setTransitionType("fade");
    setIsVisible(true);
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const parseDashboardUrl = (inputUrl: string) => {
    try {
      const match = inputUrl.match(/groups\/([^/]+)\/reports\/([^/]+)\/([^?]+)/);
      if (match) {
        setWorkspaceId(match[1]);
        setReportId(match[2]);
        setReportSection(match[3]);
        toast({
          title: "URL processada!",
          description: "Campos preenchidos automaticamente",
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.includes("powerbi.com") && value.includes("/reports/")) {
      parseDashboardUrl(value);
    }
  };

  const handleAddSlide = () => {
    if (!slideName || !workspaceId || !reportId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, Workspace ID e Report ID",
        variant: "destructive",
      });
      return;
    }

    const newSlide: SliderSlide = {
      slide_name: slideName,
      workspace_id: workspaceId,
      report_id: reportId,
      report_section: reportSection,
      credential_id: credentialId,
      duration_seconds: durationSeconds,
      slide_order: editingIndex !== null ? slides[editingIndex].slide_order : slides.length + 1,
      transition_type: transitionType,
      is_visible: isVisible,
    };

    if (editingIndex !== null) {
      const updatedSlides = [...slides];
      updatedSlides[editingIndex] = { ...updatedSlides[editingIndex], ...newSlide };
      onSlidesChange(updatedSlides);
    } else {
      onSlidesChange([...slides, newSlide]);
    }

    resetForm();
  };

  const handleEditSlide = (index: number) => {
    const slide = slides[index];
    setSlideName(slide.slide_name);
    setWorkspaceId(slide.workspace_id);
    setReportId(slide.report_id);
    setReportSection(slide.report_section);
    setCredentialId(slide.credential_id);
    setDurationSeconds(slide.duration_seconds);
    setTransitionType(slide.transition_type);
    setIsVisible(slide.is_visible);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleRemoveSlide = (index: number) => {
    const updatedSlides = slides.filter((_, i) => i !== index);
    // Reorder remaining slides
    const reorderedSlides = updatedSlides.map((slide, i) => ({
      ...slide,
      slide_order: i + 1,
    }));
    onSlidesChange(reorderedSlides);
  };

  const handleToggleVisibility = (index: number) => {
    const updatedSlides = [...slides];
    updatedSlides[index] = {
      ...updatedSlides[index],
      is_visible: !updatedSlides[index].is_visible,
    };
    onSlidesChange(updatedSlides);
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === slides.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedSlides = [...slides];
    [updatedSlides[index], updatedSlides[newIndex]] = [
      updatedSlides[newIndex],
      updatedSlides[index],
    ];

    // Update order
    const reorderedSlides = updatedSlides.map((slide, i) => ({
      ...slide,
      slide_order: i + 1,
    }));
    onSlidesChange(reorderedSlides);
  };

  const totalDuration = slides
    .filter((s) => s.is_visible)
    .reduce((acc, s) => acc + s.duration_seconds, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Slides do Slider</h3>
          {slides.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {slides.filter((s) => s.is_visible).length} slide(s) • {totalDuration}s total
            </Badge>
          )}
        </div>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Slide
          </Button>
        )}
      </div>

      {/* Add/Edit Slide Form */}
      {showAddForm && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {editingIndex !== null ? "Editar Slide" : "Novo Slide"}
              </h4>
            </div>

            {/* URL Parser */}
            <div className="space-y-2 p-3 rounded-lg bg-background/50 border border-border/50">
              <Label className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                URL do Power BI (auto-preencher)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://app.powerbi.com/groups/..."
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => url && parseDashboardUrl(url)}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Slide *</Label>
                <Input
                  value={slideName}
                  onChange={(e) => setSlideName(e.target.value)}
                  placeholder="Ex: Dashboard Vendas"
                />
              </div>
              <div className="space-y-2">
                <Label>Credencial</Label>
                <Select value={credentialId} onValueChange={setCredentialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id}>
                        {cred.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workspace ID *</Label>
                <Input
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Report ID *</Label>
                <Input
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-..."
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Report Section</Label>
                <Input
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  placeholder="ReportSection1"
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (segundos)</Label>
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Transição</Label>
                <Select value={transitionType} onValueChange={setTransitionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transitionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
              <Label>Visível na reprodução</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAddSlide}>
                {editingIndex !== null ? "Salvar Alterações" : "Adicionar Slide"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Slides Table */}
      {slides.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Slide</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead className="w-[100px]">Duração</TableHead>
                <TableHead className="w-[120px]">Transição</TableHead>
                <TableHead className="w-[80px] text-center">Visível</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slides.map((slide, index) => (
                <TableRow
                  key={slide.id || index}
                  className={!slide.is_visible ? "opacity-50" : ""}
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="font-mono text-sm">{slide.slide_order}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{slide.slide_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {slide.workspace_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{slide.duration_seconds}s</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {transitionTypes.find((t) => t.value === slide.transition_type)?.label ||
                        slide.transition_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleVisibility(index)}
                    >
                      {slide.is_visible ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSlide(index, "down")}
                        disabled={index === slides.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditSlide(index)}
                      >
                        ✏️
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSlide(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {slides.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum slide adicionado</p>
          <p className="text-sm">Clique em "Adicionar Slide" para começar</p>
        </div>
      )}
    </div>
  );
};

export default SliderSlidesManager;
