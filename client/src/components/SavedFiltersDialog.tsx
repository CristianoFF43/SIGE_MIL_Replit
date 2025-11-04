import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useFilterContext } from "@/hooks/useFilterContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookmarkPlus, Trash2, Play, Save } from "lucide-react";
import type { SavedFilterGroup, FilterTree } from "@shared/schema";

interface SavedFiltersDialogProps {
  children: React.ReactNode;
}

export function SavedFiltersDialog({ children }: SavedFiltersDialogProps) {
  const { toast } = useToast();
  const { filterTree, setFilterTree, setActiveFilterId } = useFilterContext();
  const [open, setOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [deleteFilterId, setDeleteFilterId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"private" | "shared">("private");

  const { data: savedFilters = [], isLoading } = useQuery<SavedFilterGroup[]>({
    queryKey: ["/api/filters"],
    queryFn: async () => {
      const response = await fetch("/api/filters", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch saved filters");
      }
      return response.json();
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; scope: "private" | "shared"; filterTree: FilterTree }) => {
      return await apiRequest("POST", "/api/filters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filters"] });
      toast({
        title: "Sucesso",
        description: "Filtro salvo com sucesso",
      });
      setShowSaveForm(false);
      setName("");
      setDescription("");
      setScope("private");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar filtro",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/filters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filters"] });
      toast({
        title: "Sucesso",
        description: "Filtro removido com sucesso",
      });
      setDeleteFilterId(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover filtro",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do filtro é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!filterTree) {
      toast({
        title: "Erro",
        description: "Nenhum filtro ativo para salvar",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      scope,
      filterTree,
    });
  };

  const handleLoad = (filter: SavedFilterGroup) => {
    setFilterTree(filter.filterTree);
    setActiveFilterId(filter.id);
    setOpen(false);
    toast({
      title: "Filtro carregado",
      description: `"${filter.name}" aplicado com sucesso`,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Filtros Salvos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showSaveForm && filterTree && (
              <Button
                onClick={() => setShowSaveForm(true)}
                className="w-full"
                data-testid="button-show-save-form"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Filtro Atual
              </Button>
            )}

            {showSaveForm && (
              <div className="space-y-3 p-4 border rounded-md bg-muted/50" data-testid="save-filter-form">
                <Input
                  placeholder="Nome do filtro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-filter-name"
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="textarea-filter-description"
                />
                <Select value={scope} onValueChange={(v: "private" | "shared") => setScope(v)}>
                  <SelectTrigger data-testid="select-filter-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privado (só eu)</SelectItem>
                    <SelectItem value="shared">Compartilhado (todos)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={createMutation.isPending}
                    data-testid="button-save-filter"
                  >
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveForm(false)}
                    data-testid="button-cancel-save"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando...</div>
              ) : savedFilters.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum filtro salvo ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                      data-testid={`saved-filter-${filter.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{filter.name}</h4>
                          <Badge variant={filter.scope === "shared" ? "default" : "secondary"}>
                            {filter.scope === "shared" ? "Compartilhado" : "Privado"}
                          </Badge>
                        </div>
                        {filter.description && (
                          <p className="text-sm text-muted-foreground mt-1">{filter.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoad(filter)}
                          data-testid={`button-load-${filter.id}`}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Carregar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteFilterId(filter.id)}
                          data-testid={`button-delete-${filter.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-close-dialog">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFilterId} onOpenChange={() => setDeleteFilterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este filtro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFilterId && deleteMutation.mutate(deleteFilterId)}
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
