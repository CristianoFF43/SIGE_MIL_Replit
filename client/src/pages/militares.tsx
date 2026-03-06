import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  invalidateMilitaryQueries,
  isMilitaryQueryKey,
  MILITARY_QUERY_PREFIX,
  militaryQuerySyncOptions,
  notifyMilitaryDataChanged,
  useMilitaryDataSync,
} from "@/lib/militarySync";
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
import { Search, Trash2, Filter, X, BookmarkPlus, Save, UserPlus, Columns } from "lucide-react";
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
import { buildFilterOptions, buildFilterOptionValues } from "@/lib/filter-options";
import { COMPANIES, RANKS, STATUSES } from "@shared/schema";
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

function isBlankValue(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function renderPlainValue(value: string | number | null | undefined): ReactNode {
  if (isBlankValue(value)) {
    return null;
  }

  return value;
}
// Componente de célula editável
function EditableCell({
  value,
  onSave,
  className = "",
  placeholder = "",
  fieldType,
  militarId,
  savingMilitarId,
  fieldName,
  renderDisplay,
}: {
  value: string | number | null | undefined;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  fieldType?: "cpf" | "phone" | "email" | "text";
  militarId?: number;
  savingMilitarId?: { id: number; field: string } | null;
  fieldName?: string;
  renderDisplay?: (value: string | number | null | undefined) => ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const isSaving = savingMilitarId?.id === militarId && savingMilitarId?.field === fieldName;

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value?.toString() || "");
      setError("");
    }
  }, [isEditing, value]);

  const validateField = (val: string): string | null => {
    if (!val || val.trim() === "") return null; // Empty is ok for optional fields

    switch (fieldType) {
      case "cpf":
        // Remove apenas formatação permitida (. - espaços)
        const cpfCleaned = val.replace(/[\.\-\s]/g, "");
        // Verifica se contém apenas dígitos
        if (!/^[0-9]+$/.test(cpfCleaned)) {
          return "CPF deve conter apenas números";
        }
        if (cpfCleaned.length !== 11) {
          return "CPF deve ter exatamente 11 dígitos";
        }
        break;
      case "phone":
        // Remove apenas formatação permitida (( ) - espaços)
        const phoneCleaned = val.replace(/[\(\)\-\s]/g, "");
        // Verifica se contém apenas dígitos (e possivelmente + no início)
        const phoneOnlyDigits = phoneCleaned.replace(/^\+/, ""); // Remove + opcional
        if (!/^[0-9]+$/.test(phoneOnlyDigits)) {
          return "Telefone deve conter apenas números";
        }
        if (phoneOnlyDigits.length < 10 || phoneOnlyDigits.length > 11) {
          return "Telefone deve ter 10 ou 11 dígitos";
        }
        break;
      case "email":
        if (!val.includes("@") || !val.includes(".")) {
          return "Email inválido (deve conter @ e domínio)";
        }
        const emailParts = val.split("@");
        if (emailParts.length !== 2 || emailParts[0].length === 0 || emailParts[1].length < 3) {
          return "Email inválido";
        }
        break;
    }
    return null;
  };

  const handleSave = () => {
    const normalizedEditValue = editValue.trim();
    const normalizedCurrentValue = value?.toString().trim() || "";

    if (normalizedEditValue !== normalizedCurrentValue) {
      const validationError = validateField(normalizedEditValue);
      if (validationError) {
        setError(validationError);
        toast({
          title: "Erro de validação",
          description: validationError,
          variant: "destructive",
        });
        return;
      }
      onSave(normalizedEditValue);
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
    const hasValue = value !== null && value !== undefined && String(value).trim() !== "";
    const displayContent = hasValue
      ? (renderDisplay ? renderDisplay(value) : value)
      : null;

    return (
      <div
        onClick={() => !isSaving && setIsEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isSaving) {
              setIsEditing(true);
            }
          }
        }}
        className={`cursor-pointer hover-elevate rounded px-2 py-1 min-h-[2rem] flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${isSaving ? "opacity-50 cursor-wait" : ""} ${className}`}
        title={isSaving ? "Salvando..." : "Clique para editar"}
        tabIndex={0}
      >
        {isSaving ? (
          <span className="text-muted-foreground italic">Salvando...</span>
        ) : (
          displayContent
        )}
      </div>
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
  const {
    isAuthenticated,
    isLoading: authLoading,
    isManager,
    isGlobalAdmin,
    assignedCompany,
    canManageCompany,
  } = useAuth();
  const { filterTree, setFilterTree, clearFilter } = useFilterContext();
  useMilitaryDataSync(isAuthenticated);
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const viewMode = searchParams.get("view");
  const presetCompany = viewMode === "cia" ? searchParams.get("companhia") : null;
  const isCefView = viewMode === "cef";
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>(() => presetCompany || "all");
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

  useEffect(() => {
    if (presetCompany) {
      setFilterCompany(presetCompany);
    } else {
      setFilterCompany("all");
    }
  }, [presetCompany, isCefView, search]);

  const normalizeKey = (val?: string | null) => {
    if (!val) return "";
    return val
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");
  };

  const cefSecoes = ["1º PEF", "2º PEF", "3º PEF", "4º PEF", "5º PEF", "6º PEF"];

  const baseFilterTree: FilterTree | null = filterTree;
  const presetFilterTree: FilterTree | null = (() => {
    if (presetCompany) {
      return {
        type: "group",
        operator: "AND",
        children: [
          { type: "condition", field: "companhia", comparator: "=", value: presetCompany },
        ],
      };
    }
    if (isCefView) {
      return {
        type: "group",
        operator: "OR",
        children: [
          { type: "condition", field: "companhia", comparator: "IN", value: ["SEDE", "CEF"] },
          { type: "condition", field: "secaoFracao", comparator: "IN", value: cefSecoes as string[] },
        ],
      };
    }
    return null;
  })();

  const mergedFilterTree: FilterTree | null = presetFilterTree
    ? baseFilterTree
      ? {
        type: "group",
        operator: "AND",
        children: [presetFilterTree, baseFilterTree],
      }
      : presetFilterTree
    : baseFilterTree;

  const militaresQueryUrl = useMemo(
    () =>
      mergedFilterTree
        ? `${MILITARY_QUERY_PREFIX}?filter_tree=${encodeURIComponent(JSON.stringify(mergedFilterTree))}`
        : MILITARY_QUERY_PREFIX,
    [mergedFilterTree],
  );

  const { data: militares = [], isLoading } = useQuery<MilitaryPersonnel[]>({
    queryKey: [militaresQueryUrl],
    enabled: isAuthenticated,
    ...militaryQuerySyncOptions,
  });

  const companyOptions = useMemo(
    () => buildFilterOptions(militares.map((militar) => militar.companhia), COMPANIES),
    [militares],
  );
  const rankOptions = useMemo(
    () => buildFilterOptions(militares.map((militar) => militar.postoGraduacao), RANKS),
    [militares],
  );
  const statusOptions = useMemo(
    () => buildFilterOptions(militares.map((militar) => militar.situacao), STATUSES),
    [militares],
  );
  const filterValueOptions = useMemo(
    () => ({
      companhia: buildFilterOptionValues(militares.map((militar) => militar.companhia), COMPANIES),
      postoGraduacao: buildFilterOptionValues(militares.map((militar) => militar.postoGraduacao), RANKS),
      situacao: buildFilterOptionValues(militares.map((militar) => militar.situacao), STATUSES),
    }),
    [militares],
  );

  const { data: customFields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields"],
    enabled: isAuthenticated,
  });

  const updateMilitaresCaches = useCallback(
    (updater: (current: MilitaryPersonnel[]) => MilitaryPersonnel[]) => {
      queryClient.setQueriesData<MilitaryPersonnel[]>(
        {
          predicate: (query) => isMilitaryQueryKey(query.queryKey),
        },
        (current) => (current ? updater(current) : current),
      );
    },
    [],
  );

  const invalidateMilitaresQueries = useCallback(() => invalidateMilitaryQueries(), []);

  // Mutation para atualizar militar
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MilitaryPersonnel> }) => {
      const response = await apiRequest("PATCH", `/api/militares/${id}`, data);
      return await response.json() as MilitaryPersonnel;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        predicate: (query) => isMilitaryQueryKey(query.queryKey),
      });

      const previousQueries = queryClient.getQueriesData<MilitaryPersonnel[]>({
        predicate: (query) => isMilitaryQueryKey(query.queryKey),
      });

      updateMilitaresCaches((current) =>
        current.map((militar) =>
          militar.id === id
            ? ({
                ...militar,
                ...data,
              } as MilitaryPersonnel)
            : militar,
        ),
      );

      return { previousQueries };
    },
    onSuccess: (updatedMilitar) => {
      updateMilitaresCaches((current) =>
        current.map((militar) => (militar.id === updatedMilitar.id ? updatedMilitar : militar)),
      );
      invalidateMilitaresQueries();
      notifyMilitaryDataChanged();
      setSavingCell(null);
      toast({
        title: "Sucesso",
        description: "Dados atualizados",
      });
    },
    onError: (
      error: Error,
      _variables,
      context?: { previousQueries: Array<[readonly unknown[], MilitaryPersonnel[] | undefined]> },
    ) => {
      context?.previousQueries.forEach(([queryKey, previousData]) => {
        queryClient.setQueryData(queryKey, previousData);
      });
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
      invalidateMilitaresQueries();
      notifyMilitaryDataChanged();
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
      invalidateMilitaresQueries();
      notifyMilitaryDataChanged();
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

  const filteredMilitares = useMemo(
    () =>
      [...militares]
        .filter((militar) => {
          const matchesSearch =
            militar.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            militar.nomeGuerra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            militar.cpf?.includes(searchTerm);

          const matchesCompany = filterCompany === "all" || normalizeKey(militar.companhia) === normalizeKey(filterCompany);
          const matchesRank = filterRank === "all" || militar.postoGraduacao === filterRank;
          const matchesStatus = filterStatus === "all" || militar.situacao === filterStatus;

          return matchesSearch && matchesCompany && matchesRank && matchesStatus;
        })
        .sort((a, b) => {
          const rankDiff = getRankOrder(a.postoGraduacao) - getRankOrder(b.postoGraduacao);
          if (rankDiff !== 0) return rankDiff;

          if (a.ord && b.ord) return a.ord - b.ord;

          return (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "");
        }),
    [militares, searchTerm, filterCompany, filterRank, filterStatus],
  );

  const defaultCreateCompany =
    presetCompany ||
    (isCefView ? "CEF" : null) ||
    (filterCompany !== "all" ? filterCompany : null) ||
    assignedCompany ||
    null;

  const canCreateInCurrentScope = !!defaultCreateCompany && canManageCompany(defaultCreateCompany, "create");
  const canDeleteVisibleRows = filteredMilitares.some((militar) => canManageCompany(militar.companhia, "delete"));

  const handleCellUpdate = (id: number, field: keyof MilitaryPersonnel | string, value: string) => {
    setSavingCell({ id, field: field as string });
    const normalizedValue = value.trim();

    // Check if it's a custom field
    const customField = customFields.find(cf => cf.name === field);

    if (customField) {
      // Validate required fields on frontend (quick feedback)
      if (customField.required === 1 && normalizedValue === '') {
        toast({
          title: "Campo obrigatório",
          description: `${customField.label} não pode ser vazio`,
          variant: "destructive",
        });
        setSavingCell(null);
        return;
      }

      // Type-specific validation
      if (customField.fieldType === 'number' && normalizedValue !== '') {
        const numValue = parseFloat(normalizedValue);
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

      if (customField.fieldType === 'select' && normalizedValue !== '' && customField.options) {
        if (!customField.options.includes(normalizedValue)) {
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
        [field]: normalizedValue || null,
      };
      updateMutation.mutate({ id, data: { customFields: updatedCustomFields } });
    } else {
      // Standard field update
      let finalValue: any = normalizedValue || null;
      if (field === 'ord') {
        if (normalizedValue === '') {
          finalValue = null;
        } else {
          finalValue = parseInt(normalizedValue, 10);
          if (Number.isNaN(finalValue)) {
            toast({
              title: "Valor inválido",
              description: "Ord deve ser um número inteiro válido",
              variant: "destructive",
            });
            setSavingCell(null);
            return;
          }
        }
      }
      updateMutation.mutate({ id, data: { [field]: finalValue } });
    }
  };

  const handleAddNew = () => {
    if (!defaultCreateCompany || !canCreateInCurrentScope) {
      toast({
        title: "Acesso negado",
        description: "Você só pode adicionar militares dentro da sua companhia.",
        variant: "destructive",
      });
      return;
    }

    const newMilitar: InsertMilitaryPersonnel = {
      nomeCompleto: "Novo Militar",
      postoGraduacao: "Sd 1ª Cl",
      companhia: defaultCreateCompany,
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

  const heading = presetCompany
    ? `Efetivo - ${presetCompany}`
    : isCefView
      ? "Efetivo - CEF"
      : "Efetivo Total";
  const stickyHeaderClass = "sticky top-0 z-20 bg-background/95 shadow-[inset_0_-1px_0_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-background/90";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">{heading}</h1>
          <p className="text-muted-foreground">Gestão completa de militares - Edição inline estilo Excel</p>
        </div>
        {(isGlobalAdmin || canCreateInCurrentScope) && (
          <div className="flex gap-2">
            {isGlobalAdmin && (
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
            <Button onClick={handleAddNew} data-testid="button-add-militar" disabled={!canCreateInCurrentScope}>
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
            {companyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            {rankOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
                  valueOptions={filterValueOptions}
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
            A edição e exclusão respeitam o escopo global/local do usuário. Pressione Enter para salvar ou Esc para cancelar.
          </p>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-max [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className={`${stickyHeaderClass} w-[60px]`}>Ord</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[200px]`}>Nome Completo</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[150px]`}>Nome de Guerra</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[120px]`}>P/Grad</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[100px]`}>CIA</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[150px]`}>SEÇ/FRAÇÃO</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[150px]`}>Função</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[120px]`}>Situação</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[120px]`}>Missão</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[130px]`}>CPF</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[130px]`}>Telefone</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[200px]`}>Email</TableHead>
              <TableHead className={`${stickyHeaderClass} min-w-[100px]`}>TEMP</TableHead>
              {customFields.map((field) => (
                <TableHead key={field.id} className={`${stickyHeaderClass} min-w-[150px]`}>
                  {field.label}
                </TableHead>
              ))}
              {canDeleteVisibleRows && <TableHead className={`${stickyHeaderClass} w-[80px]`}>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMilitares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13 + customFields.length + (canDeleteVisibleRows ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  Nenhum militar encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredMilitares.map((militar) => {
                const canEditRow = canManageCompany(militar.companhia, "edit");
                const canDeleteRow = canManageCompany(militar.companhia, "delete");

                return (
                <TableRow key={militar.id} data-testid={`row-militar-${militar.id}`}>
                  <TableCell className="font-mono text-sm">
                    {canEditRow ? (
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
                    {canEditRow ? (
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
                    {canEditRow ? (
                      <EditableCell
                        value={militar.nomeGuerra}
                        onSave={(val) => handleCellUpdate(militar.id, "nomeGuerra", val)}
                        placeholder="Nome de guerra"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="nomeGuerra"
                      />
                    ) : (
                      renderPlainValue(militar.nomeGuerra)
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.postoGraduacao}
                        onSave={(val) => handleCellUpdate(militar.id, "postoGraduacao", val)}
                        placeholder="P/Grad"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="postoGraduacao"
                      />
                    ) : (
                      <Badge variant="outline">{militar.postoGraduacao}</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.companhia}
                        onSave={(val) => handleCellUpdate(militar.id, "companhia", val)}
                        placeholder="CIA"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="companhia"
                      />
                    ) : (
                      <Badge variant="secondary">{militar.companhia}</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.secaoFracao}
                        onSave={(val) => handleCellUpdate(militar.id, "secaoFracao", val)}
                        placeholder="SEÇ/FRAÇÃO"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="secaoFracao"
                      />
                    ) : (
                      renderPlainValue(militar.secaoFracao)
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.funcao}
                        onSave={(val) => handleCellUpdate(militar.id, "funcao", val)}
                        placeholder="Função"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="funcao"
                      />
                    ) : (
                      renderPlainValue(militar.funcao)
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.situacao}
                        onSave={(val) => handleCellUpdate(militar.id, "situacao", val)}
                        placeholder="Situação"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="situacao"
                        renderDisplay={(val) =>
                          val ? (
                            <Badge variant={getStatusVariant(String(val))}>
                              {String(val)}
                            </Badge>
                          ) : null
                        }
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
                    {canEditRow ? (
                      <EditableCell
                        value={militar.missaoOp}
                        onSave={(val) => handleCellUpdate(militar.id, "missaoOp", val)}
                        placeholder="Missão/Op"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="missaoOp"
                      />
                    ) : (
                      renderPlainValue(militar.missaoOp)
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
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
                    {canEditRow ? (
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
                    {canEditRow ? (
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
                      renderPlainValue(militar.email)
                    )}
                  </TableCell>

                  <TableCell>
                    {canEditRow ? (
                      <EditableCell
                        value={militar.temp}
                        onSave={(val) => handleCellUpdate(militar.id, "temp", val)}
                        placeholder="TEMP"
                        militarId={militar.id}
                        savingMilitarId={savingCell}
                        fieldName="temp"
                      />
                    ) : (
                      renderPlainValue(militar.temp)
                    )}
                  </TableCell>

                  {customFields.map((field) => {
                    const customFieldsData = (militar.customFields as Record<string, any>) || {};
                    const fieldValue = customFieldsData[field.name];

                    return (
                      <TableCell key={field.id}>
                        {canEditRow ? (
                          <EditableCell
                            value={fieldValue}
                            onSave={(val) => handleCellUpdate(militar.id, field.name, val)}
                            placeholder={field.label}
                            militarId={militar.id}
                            savingMilitarId={savingCell}
                            fieldName={field.name}
                          />
                        ) : (
                          renderPlainValue(fieldValue)
                        )}
                      </TableCell>
                    );
                  })}

                  {canDeleteVisibleRows && (
                    <TableCell>
                      {canDeleteRow && (
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
                      )}
                    </TableCell>
                  )}
                </TableRow>
                );
              })
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
