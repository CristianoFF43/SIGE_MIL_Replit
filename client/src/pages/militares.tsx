import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useFilterContext } from "@/hooks/useFilterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Filter, X, BookmarkPlus, Save, UserPlus, Columns } from "lucide-react";
import { FilterBuilder } from "@/components/FilterBuilder";
import { SavedFiltersDialog } from "@/components/SavedFiltersDialog";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCPF, formatPhone, getStatusVariant } from "@/lib/utils";
import { COMPANIES, RANKS, STATUSES, MISSIONS } from "@shared/schema";
import type { MilitaryPersonnel, FilterTree, InsertMilitaryPersonnel, CustomFieldDefinition } from "@shared/schema";

// Ordenação hierárquica militar (do mais alto ao mais baixo)
const RANK_ORDER = [
  // Oficiais Generais
  "Gen Ex", "Gen Div", "Gen Brig",
  // Oficiais Superiores
  "Cel", "Ten Cel", "Maj",
  // Oficiais Intermediários e Subalternos
  "Cap", "1º Ten", "2º Ten",
  // Aspirante e Cadete
  "Asp Of", "Asp", "Cadete",
  // Subtenente
  "S Ten",
  // Sargentos
  "1º Sgt", "2º Sgt", "3º Sgt",
  // Taifeiro
  "Taifeiro",
  // Cabos
  "Cb EP", "CB EP", "Cb EV", "Cb",
  // Soldados
  "Sd EP", "SD EP", "Sd EV", "SD EV", "Sd 1ª Cl", "Sd 2ª Cl",
];

function getRankOrder(rank: string): number {
  const index = RANK_ORDER.indexOf(rank);
  return index === -1 ? 999 : index; // Postos não reconhecidos vão para o final
}

// Componente de célula editável
function EditableCell({
  value,
  onSave,
  type = "text",
  options,
  className = "",
  placeholder = "",
  fieldType,
  militarId,
  savingMilitarId,
  fieldName,
}: {
  value: string | number | null | undefined;
  onSave: (newValue: string) => void;
  type?: "text" | "select";
  options?: readonly string[];
  className?: string;
  placeholder?: string;
  fieldType?: "cpf" | "phone" | "email" | "text";
  militarId?: number;
  savingMilitarId?: { id: number; field: string } | null;
  fieldName?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [error, setError] = useState("");
  const { toast } = useToast();
  
  const isSaving = savingMilitarId?.id === militarId && savingMilitarId?.field === fieldName;

  const validateField = (val: string): boolean => {
    if (!val || val.trim() === "") return true; // Empty is ok for optional fields
    
    switch (fieldType) {
      case "cpf":
        // Remove apenas formatação permitida (. - espaços)
        const cpfCleaned = val.replace(/[\.\-\s]/g, "");
        // Verifica se contém apenas dígitos
        if (!/^[0-9]+$/.test(cpfCleaned)) {
          setError("CPF deve conter apenas números");
          return false;
        }
        if (cpfCleaned.length !== 11) {
          setError("CPF deve ter exatamente 11 dígitos");
          return false;
        }
        break;
      case "phone":
        // Remove apenas formatação permitida (( ) - espaços)
        const phoneCleaned = val.replace(/[\(\)\-\s]/g, "");
        // Verifica se contém apenas dígitos (e possivelmente + no início)
        const phoneOnlyDigits = phoneCleaned.replace(/^\+/, ""); // Remove + opcional
        if (!/^[0-9]+$/.test(phoneOnlyDigits)) {
          setError("Telefone deve conter apenas números");
          return false;
        }
        if (phoneOnlyDigits.length < 10 || phoneOnlyDigits.length > 11) {
          setError("Telefone deve ter 10 ou 11 dígitos");
          return false;
        }
        break;
      case "email":
        if (!val.includes("@") || !val.includes(".")) {
          setError("Email inválido (deve conter @ e domínio)");
          return false;
        }
        const emailParts = val.split("@");
        if (emailParts.length !== 2 || emailParts[0].length === 0 || emailParts[1].length < 3) {
          setError("Email inválido");
          return false;
        }
        break;
    }
    setError("");
    return true;
  };

  const handleSave = () => {
    if (editValue !== value?.toString()) {
      if (!validateField(editValue)) {
        toast({
          title: "Erro de validação",
          description: error,
          variant: "destructive",
        });
        return;
      }
      onSave(editValue);
    }
    setIsEditing(false);
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value?.toString() || "");
      setIsEditing(false);
      setError("");
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => !isSaving && setIsEditing(true)}
        className={`cursor-pointer hover-elevate rounded px-2 py-1 min-h-[2rem] flex items-center ${isSaving ? "opacity-50 cursor-wait" : ""} ${className}`}
        title={isSaving ? "Salvando..." : "Clique para editar"}
      >
        {isSaving ? (
          <span className="text-muted-foreground italic">Salvando...</span>
        ) : (
          value || <span className="text-muted-foreground italic">{placeholder || "Vazio"}</span>
        )}
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <Select
        value={editValue}
        onValueChange={(val) => {
          setEditValue(val);
          onSave(val);
          setIsEditing(false);
        }}
        open={isEditing}
        onOpenChange={(open) => !open && setIsEditing(false)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`h-8 ${error ? "border-destructive" : ""}`}
        autoFocus
        placeholder={placeholder}
        disabled={isSaving}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function Militares() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, isManager, isAdmin } = useAuth();
  const { filterTree, setFilterTree, clearFilter } = useFilterContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterRank, setFilterRank] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [savingCell, setSavingCell] = useState<{ id: number; field: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Redirecionando para login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: militares = [], isLoading } = useQuery<MilitaryPersonnel[]>({
    queryKey: filterTree 
      ? [`/api/militares?filter_tree=${encodeURIComponent(JSON.stringify(filterTree))}`]
      : ["/api/militares"],
    enabled: isAuthenticated,
  });

  const { data: customFields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields"],
    enabled: isAuthenticated,
  });

  // Mutation para atualizar militar
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MilitaryPersonnel> }) => {
      await apiRequest("PATCH", `/api/militares/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      setSavingCell(null);
      toast({
        title: "Sucesso",
        description: "Dados atualizados",
      });
    },
    onError: (error: Error) => {
      setSavingCell(null);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Redirecionando para login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar dados",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar novo militar
  const createMutation = useMutation({
    mutationFn: async (data: InsertMilitaryPersonnel) => {
      return await apiRequest("POST", "/api/militares", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      toast({
        title: "Sucesso",
        description: "Militar adicionado com sucesso",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Redirecionando para login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao adicionar militar",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/militares/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      toast({
        title: "Sucesso",
        description: "Militar removido com sucesso",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Redirecionando para login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao remover militar",
        variant: "destructive",
      });
    },
  });

  const filteredMilitares = militares
    .filter((militar) => {
      const matchesSearch =
        militar.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        militar.nomeGuerra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        militar.cpf?.includes(searchTerm);

      const matchesCompany = filterCompany === "all" || militar.companhia === filterCompany;
      const matchesRank = filterRank === "all" || militar.postoGraduacao === filterRank;
      const matchesStatus = filterStatus === "all" || militar.situacao === filterStatus;

      return matchesSearch && matchesCompany && matchesRank && matchesStatus;
    })
    .sort((a, b) => {
      // Ordenar por hierarquia militar (posto/graduação)
      const rankDiff = getRankOrder(a.postoGraduacao) - getRankOrder(b.postoGraduacao);
      if (rankDiff !== 0) return rankDiff;

      // Se mesmo posto, ordenar por ord (número de ordem)
      if (a.ord && b.ord) return a.ord - b.ord;

      // Se não houver ord, ordenar por nome
      return (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "");
    });

  const handleCellUpdate = (id: number, field: keyof MilitaryPersonnel | string, value: string) => {
    setSavingCell({ id, field: field as string });
    
    // Check if it's a custom field
    const customField = customFields.find(cf => cf.name === field);
    
    if (customField) {
      // Validate required fields on frontend (quick feedback)
      if (customField.required === 1 && (!value || value.trim() === '')) {
        toast({
          title: "Campo obrigatório",
          description: `${customField.label} não pode ser vazio`,
          variant: "destructive",
        });
        setSavingCell(null);
        return;
      }
      
      // Type-specific validation
      if (customField.fieldType === 'number' && value && value.trim() !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          toast({
            title: "Valor inválido",
            description: `${customField.label} deve ser um número válido`,
            variant: "destructive",
          });
          setSavingCell(null);
          return;
        }
      }
      
      if (customField.fieldType === 'select' && value && customField.options) {
        if (!customField.options.includes(value)) {
          toast({
            title: "Valor inválido",
            description: `${customField.label}: valor não está entre as opções válidas`,
            variant: "destructive",
          });
          setSavingCell(null);
          return;
        }
      }
      
      // Update custom field in customFields JSONB column
      const militar = militares.find(m => m.id === id);
      const currentCustomFields = (militar?.customFields as Record<string, any>) || {};
      const updatedCustomFields = {
        ...currentCustomFields,
        [field]: value || null,
      };
      updateMutation.mutate({ id, data: { customFields: updatedCustomFields } });
    } else {
      // Standard field update
      updateMutation.mutate({ id, data: { [field]: value || null } });
    }
  };

  const handleAddNew = () => {
    const newMilitar: InsertMilitaryPersonnel = {
      nomeCompleto: "Novo Militar",
      postoGraduacao: "Sd 1ª Cl",
      companhia: "1ª CIA",
      ord: filteredMilitares.length + 1,
    };
    createMutation.mutate(newMilitar);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Efetivo Militar</h1>
          <p className="text-muted-foreground">Gestão completa de militares - Edição inline estilo Excel</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            {isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-manage-columns">
                    <Columns className="h-4 w-4 mr-2" />
                    Gerenciar Colunas
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerenciamento de Colunas Customizadas</DialogTitle>
                  </DialogHeader>
                  <CustomFieldsManager />
                </DialogContent>
              </Dialog>
            )}
            <Button onClick={handleAddNew} data-testid="button-add-militar">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Nova Linha
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, nome de guerra ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-company">
            <SelectValue placeholder="Companhia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {COMPANIES.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRank} onValueChange={setFilterRank}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-rank">
            <SelectValue placeholder="Posto/Grad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {RANKS.map((rank) => (
              <SelectItem key={rank} value={rank}>
                {rank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Sheet open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant={filterTree ? "default" : "outline"}
                data-testid="button-advanced-filter"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtro Avançado
                {filterTree && <span className="ml-2">(Ativo)</span>}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtro Avançado</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterBuilder
                  value={filterTree}
                  onChange={(tree) => {
                    setFilterTree(tree);
                    setAdvancedFilterOpen(false);
                  }}
                  onClose={() => setAdvancedFilterOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <SavedFiltersDialog>
            <Button variant="outline" data-testid="button-saved-filters">
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Filtros Salvos
            </Button>
          </SavedFiltersDialog>
        </div>

        {filterTree && (
          <Button
            variant="ghost"
            onClick={() => clearFilter()}
            data-testid="button-clear-filter"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Filtro Avançado
          </Button>
        )}
      </div>

      {/* Legenda de uso */}
      {isManager && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-primary mb-1">💡 Modo de Edição Ativo</p>
          <p className="text-muted-foreground">
            Clique em qualquer célula para editar. Pressione Enter para salvar ou Esc para cancelar. 
            As alterações são salvas automaticamente.
          </p>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ord</TableHead>
              <TableHead className="min-w-[200px]">Nome Completo</TableHead>
              <TableHead className="min-w-[150px]">Nome de Guerra</TableHead>
              <TableHead className="min-w-[120px]">P/Grad</TableHead>
              <TableHead className="min-w-[100px]">CIA</TableHead>
              <TableHead className="min-w-[150px]">SEÇ/FRAÇÃO</TableHead>
              <TableHead className="min-w-[150px]">Função</TableHead>
              <TableHead className="min-w-[120px]">Situação</TableHead>
              <TableHead className="min-w-[120px]">Missão</TableHead>
              <TableHead className="min-w-[130px]">CPF</TableHead>
              <TableHead className="min-w-[130px]">Telefone</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              {customFields.map((field) => (
                <TableHead key={field.id} className="min-w-[150px]">
                  {field.label}
                </TableHead>
              ))}
              {isAdmin && <TableHead className="w-[80px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMilitares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 13 + customFields.length : 12 + customFields.length} className="text-center py-8 text-muted-foreground">
                  Nenhum militar encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredMilitares.map((militar) => (
                <TableRow key={militar.id} data-testid={`row-militar-${militar.id}`}>
                  <TableCell className="font-mono text-sm">
                    {isManager ? (
                      <EditableCell
                        value={militar.ord}
                        onSave={(val) => handleCellUpdate(militar.id, "ord", val)}
                        placeholder="Ord"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="ord"
                      />
                    ) : (
                      militar.ord
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.nomeCompleto}
                        onSave={(val) => handleCellUpdate(militar.id, "nomeCompleto", val)}
                        placeholder="Nome completo"
                        className="font-medium"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="nomeCompleto"
                      />
                    ) : (
                      <span className="font-medium">{militar.nomeCompleto}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.nomeGuerra}
                        onSave={(val) => handleCellUpdate(militar.id, "nomeGuerra", val)}
                        placeholder="Nome de guerra"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="nomeGuerra"
                      />
                    ) : (
                      militar.nomeGuerra || "-"
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.postoGraduacao}
                        onSave={(val) => handleCellUpdate(militar.id, "postoGraduacao", val)}
                        type="select"
                        options={RANKS}
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="postoGraduacao"
                      />
                    ) : (
                      <Badge variant="outline">{militar.postoGraduacao}</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.companhia}
                        onSave={(val) => handleCellUpdate(militar.id, "companhia", val)}
                        type="select"
                        options={COMPANIES}
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="companhia"
                      />
                    ) : (
                      <Badge variant="secondary">{militar.companhia}</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.secaoFracao}
                        onSave={(val) => handleCellUpdate(militar.id, "secaoFracao", val)}
                        placeholder="SEÇ/FRAÇÃO"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="secaoFracao"
                      />
                    ) : (
                      militar.secaoFracao || "-"
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.funcao}
                        onSave={(val) => handleCellUpdate(militar.id, "funcao", val)}
                        placeholder="Função"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="funcao"
                      />
                    ) : (
                      militar.funcao || "-"
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.situacao}
                        onSave={(val) => handleCellUpdate(militar.id, "situacao", val)}
                        type="select"
                        options={STATUSES}
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="situacao"
                      />
                    ) : (
                      militar.situacao && (
                        <Badge variant={getStatusVariant(militar.situacao)}>
                          {militar.situacao}
                        </Badge>
                      )
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.missaoOp}
                        onSave={(val) => handleCellUpdate(militar.id, "missaoOp", val)}
                        type="select"
                        options={MISSIONS}
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="missaoOp"
                      />
                    ) : (
                      militar.missaoOp || "-"
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.cpf}
                        onSave={(val) => handleCellUpdate(militar.id, "cpf", val)}
                        placeholder="000.000.000-00"
                        className="font-mono text-sm"
                        fieldType="cpf"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="cpf"
                      />
                    ) : (
                      <span className="font-mono text-sm">{formatCPF(militar.cpf)}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.telefoneContato1}
                        onSave={(val) => handleCellUpdate(militar.id, "telefoneContato1", val)}
                        placeholder="(00) 00000-0000"
                        className="font-mono text-sm"
                        fieldType="phone"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="telefoneContato1"
                      />
                    ) : (
                      <span className="font-mono text-sm">{formatPhone(militar.telefoneContato1)}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isManager ? (
                      <EditableCell
                        value={militar.email}
                        onSave={(val) => handleCellUpdate(militar.id, "email", val)}
                        placeholder="email@exemplo.com"
                        fieldType="email"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="email"
                      />
                    ) : (
                      militar.email || "-"
                    )}
                  </TableCell>
                  
                  {customFields.map((field) => {
                    const customFieldsData = (militar.customFields as Record<string, any>) || {};
                    const fieldValue = customFieldsData[field.name];
                    
                    return (
                      <TableCell key={field.id}>
                        {isManager ? (
                          <EditableCell
                            value={fieldValue}
                            onSave={(val) => handleCellUpdate(militar.id, field.name, val)}
                            placeholder={field.label}
                            type={field.fieldType === "select" ? "select" : "text"}
                            options={field.options as string[] | undefined}
                            militarId={militar.id}
                            savingMilitarId={savingCell}
                            fieldName={field.name}
                          />
                        ) : (
                          fieldValue || "-"
                        )}
                      </TableCell>
                    );
                  })}
                  
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Confirma a remoção de ${militar.nomeCompleto}?`)) {
                            deleteMutation.mutate(militar.id);
                          }
                        }}
                        data-testid={`button-delete-${militar.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Mostrando {filteredMilitares.length} de {militares.length} militares
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            <span>Salvamento automático ativado</span>
          </div>
        )}
      </div>
    </div>
  );
}
