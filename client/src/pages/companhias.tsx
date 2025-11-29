import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Shield, GripVertical, RotateCcw } from "lucide-react";
import type { MilitaryPersonnel, UserPreference } from "@shared/schema";
import { COMPANIES } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Ordenação hierárquica militar (do mais alto ao mais baixo)
const RANK_ORDER = [
  // Oficiais Generais
  "Gen Ex",
  "Gen Div",
  "Gen Brig",
  // Oficiais Superiores
  "Cel",
  "Ten Cel",
  "Maj",
  // Oficiais Intermediários e Subalternos
  "Cap",
  "1º Ten",
  "2º Ten",
  // Aspirante e Cadete
  "Asp Of",
  "Asp",
  "Cadete",
  // Subtenente
  "S Ten",
  // Sargentos
  "1º Sgt",
  "2º Sgt",
  "3º Sgt",
  // Taifeiro
  "Taifeiro",
  // Cabos
  "Cb EP",
  "CB EP",
  "Cb EV",
  "Cb",
  // Soldados
  "Sd EP",
  "SD EP",
  "Sd EV",
  "SD EV",
  "Sd 1ª Cl",
  "Sd 2ª Cl",
];

function getRankOrder(rank: string): number {
  const index = RANK_ORDER.indexOf(rank);
  return index === -1 ? 999 : index; // Postos não reconhecidos vão para o final
}

interface CompanyData {
  id: string;
  name: string;
  total: number;
  prontos: number;
  naoProntos: number;
  rankCounts: Record<string, number>;
}

interface CompanyCardProps {
  company: CompanyData;
  isOverlay?: boolean;
  className?: string;
  dragHandle?: React.ReactNode;
}

function CompanyCard({ company, isOverlay, className, dragHandle }: CompanyCardProps) {
  return (
    <Card className={`hover-elevate ${isOverlay ? 'shadow-2xl cursor-grabbing' : ''} ${className || ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dragHandle}
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {company.name}
            </CardTitle>
          </div>
          <Badge variant="default" className="font-mono">
            {company.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pronto</span>
            </div>
            <div className="text-2xl font-bold text-primary">{company.prontos}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Não Pronto</span>
            </div>
            <div className="text-2xl font-bold">{company.naoProntos}</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Distribuição por Posto/Graduação</p>
          <div className="space-y-2">
            {Object.entries(company.rankCounts)
              .sort(([rankA], [rankB]) => getRankOrder(rankA) - getRankOrder(rankB))
              .map(([rank, count]) => (
                <div key={rank} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{rank}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SortableCardProps {
  company: CompanyData;
}

function SortableCard({ company }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const DragHandle = (
    <div
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-accent rounded"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground" />
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <CompanyCard company={company} dragHandle={DragHandle} />
    </div>
  );
}

export default function Companhias() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const [companies, setCompanies] = useState<CompanyData[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    queryKey: ["/api/militares"],
    enabled: isAuthenticated,
  });

  // Fetch saved card order preference
  const { data: savedPreference } = useQuery<UserPreference>({
    queryKey: ["/api/preferences/companhias_card_order"],
    enabled: isAuthenticated && !!user,
  });

  // Save preference mutation
  const savePreferenceMutation = useMutation({
    mutationFn: async (cardOrder: string[]) => {
      const response = await fetch("/api/preferences/companhias_card_order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferenceValue: cardOrder }),
      });
      if (!response.ok) throw new Error("Failed to save preference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/companhias_card_order"] });
    },
  });

  // Delete preference mutation (reset to default)
  const resetPreferenceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/preferences/companhias_card_order", {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) throw new Error("Failed to reset preference");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/companhias_card_order"] });
      toast({
        title: "Layout redefinido",
        description: "A ordem dos cards foi restaurada ao padrão",
      });
    },
  });

  useEffect(() => {
    if (militares.length === 0) return;

    // Identificar militares dos PEFs
    const pefPersonnel = militares.filter((m) => {
      const secao = m.secaoFracao?.toUpperCase() || "";
      return secao.includes("1º PEF") ||
        secao.includes("2º PEF") ||
        secao.includes("3º PEF") ||
        secao.includes("4º PEF") ||
        secao.includes("5º PEF") ||
        secao.includes("6º PEF");
    });

    // Dados dos PEFs como um card único
    const pefData: CompanyData | null = pefPersonnel.length > 0 ? {
      id: "PEF",
      name: "PEF",
      total: pefPersonnel.length,
      prontos: pefPersonnel.filter((m) => m.situacao === "Pronto").length,
      naoProntos: pefPersonnel.filter((m) => m.situacao !== "Pronto").length,
      rankCounts: pefPersonnel.reduce((acc, m) => {
        acc[m.postoGraduacao] = (acc[m.postoGraduacao] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    } : null;

    // Dados das demais companhias (exceto CEF)
    const companiesData: CompanyData[] = COMPANIES
      .filter(company => company !== "CEF")
      .map((company) => {
        const companyPersonnel = militares.filter((m) => m.companhia === company);

        const prontos = companyPersonnel.filter((m) => m.situacao === "Pronto").length;
        const naoProntos = companyPersonnel.filter((m) => m.situacao !== "Pronto").length;

        const rankCounts: Record<string, number> = {};
        companyPersonnel.forEach((m) => {
          rankCounts[m.postoGraduacao] = (rankCounts[m.postoGraduacao] || 0) + 1;
        });

        return {
          id: company,
          name: company,
          total: companyPersonnel.length,
          prontos,
          naoProntos,
          rankCounts,
        };
      })
      .filter(company => company.total > 0);

    // Calculate Total Data
    const totalData: CompanyData = {
      id: "TOTAL",
      name: "EFETIVO TOTAL",
      total: militares.length,
      prontos: militares.filter(m => m.situacao === "Pronto").length,
      naoProntos: militares.filter(m => m.situacao !== "Pronto").length,
      rankCounts: militares.reduce((acc, m) => {
        acc[m.postoGraduacao] = (acc[m.postoGraduacao] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Adicionar card PEF no início e TOTAL
    const allCompaniesData = pefData
      ? [totalData, pefData, ...companiesData]
      : [totalData, ...companiesData];

    // Apply saved order if exists
    if (savedPreference && savedPreference.preferenceValue) {
      const savedOrder = savedPreference.preferenceValue as string[];
      const orderedCompanies = savedOrder
        .map(id => allCompaniesData.find(c => c.id === id))
        .filter(Boolean) as CompanyData[];

      // Add any new companies that weren't in saved order (at the end)
      const newCompanies = allCompaniesData.filter(
        c => !savedOrder.includes(c.id)
      );

      setCompanies([...orderedCompanies, ...newCompanies]);
    } else {
      setCompanies(allCompaniesData);
    }
  }, [militares, savedPreference]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCompanies((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save new order to backend
        const cardOrder = newOrder.map(c => c.id);
        savePreferenceMutation.mutate(cardOrder);

        return newOrder;
      });
    }
  };

  const handleResetLayout = () => {
    resetPreferenceMutation.mutate();
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
          <h1 className="text-3xl font-bold text-primary">Companhias</h1>
          <p className="text-muted-foreground">Visão geral por unidade operacional - Arraste os cards para reorganizar</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetLayout}
          disabled={resetPreferenceMutation.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Redefinir Layout
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={companies.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <SortableCard key={company.id} company={company} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
