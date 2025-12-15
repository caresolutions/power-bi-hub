import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Plus, Trash2, Share2, Lock } from "lucide-react";
import { useDashboardBookmarks, DashboardBookmark } from "@/hooks/useDashboardBookmarks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BookmarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
  onApplyBookmark: (bookmarkState: any) => void;
  getCurrentState: () => any;
}

export const BookmarksDialog = ({
  open,
  onOpenChange,
  dashboardId,
  dashboardName,
  onApplyBookmark,
  getCurrentState,
}: BookmarksDialogProps) => {
  const { bookmarks, loading, createBookmark, deleteBookmark, updateBookmark } = useDashboardBookmarks(dashboardId);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setSaving(true);
    const currentState = getCurrentState();
    await createBookmark(newName, currentState, isShared);
    setNewName("");
    setIsShared(false);
    setShowCreate(false);
    setSaving(false);
  };

  const handleApply = (bookmark: DashboardBookmark) => {
    onApplyBookmark(bookmark.bookmark_state);
    onOpenChange(false);
  };

  const handleToggleShare = async (bookmark: DashboardBookmark) => {
    await updateBookmark(bookmark.id, { is_shared: !bookmark.is_shared });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Visualizações Salvas
          </DialogTitle>
          <DialogDescription>
            Salve e aplique estados específicos do relatório "{dashboardName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreate ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Salvar Visualização Atual
            </Button>
          ) : (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="bookmarkName">Nome da Visualização</Label>
                <Input
                  id="bookmarkName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Vendas Q1 2024"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="shareBookmark" className="text-sm">
                    Compartilhar com a empresa
                  </Label>
                </div>
                <Switch
                  id="shareBookmark"
                  checked={isShared}
                  onCheckedChange={setIsShared}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                    setIsShared(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="flex-1"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma visualização salva</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique no botão acima para salvar o estado atual
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                  >
                    <button
                      onClick={() => handleApply(bookmark)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bookmark.name}</span>
                        {bookmark.is_shared ? (
                          <Share2 className="h-3 w-3 text-primary" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(bookmark.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </button>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleShare(bookmark)}
                        title={bookmark.is_shared ? "Tornar privado" : "Compartilhar"}
                      >
                        {bookmark.is_shared ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteBookmark(bookmark.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
