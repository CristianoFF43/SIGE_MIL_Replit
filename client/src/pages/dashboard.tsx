import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { militaryQuerySyncOptions, useMilitaryDataSync } from "@/lib/militarySync";
import { StatsCard } from "@/components/stats-card";
import { BootstrapAdmin } from "@/components/bootstrap-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, Shield, Target, UserX, HelpCircle, GripVertical, RotateCcw, BarChart3, PieChart as PieChartIcon, TrendingUp, Circle, Radar, Layers, CircleDot, type LucideIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { MilitaryPersonnel, UserPreference } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AvailableField {
  name: string;
  label: string;
  type: 'standard' | 'custom';
  fieldType?: string;
}

interface DynamicStatsResponse {
  field: string;
  data: Array<{ name: string; value: number }>;
}

interface CrossStatsResponse {
  fieldX: string;
  fieldY: string;
  data: Array<{ x: string; y: string; value: number }>;
}

type ChartType = "bar" | "pie" | "line" | "area" | "radar" | "scatter" | "composed" | "radialBar";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(145, 70%, 45%)", // Verde militar
  "hsl(200, 70%, 45%)", // Azul
  "hsl(30, 70%, 50%)",  // Laranja
  "hsl(270, 70%, 50%)", // Roxo
  "hsl(350, 70%, 50%)", // Vermelho
];

const chartTypeIcons: Record<ChartType, any> = {
  bar: BarChart3,
  pie: PieChartIcon,
  line: TrendingUp,
  area: Circle,
  radar: Radar,
  scatter: Circle,
  composed: Layers,
  radialBar: CircleDot,
};

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

const DASHBOARD_MINICARDS_PREFERENCE_KEY = "dashboard_minicards_order";

interface DashboardMiniCard {
  id: string;
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
}

interface SortableMiniCardProps {
  card: DashboardMiniCard;
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

function trimText(value?: string | null): string {
  return value?.trim() ?? "";
}

function isProntoSituation(value?: string | null): boolean {
  return normalizeText(value) === "pronto";
}

function parsePreferenceOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mergeCardOrder(baseOrder: string[], defaultOrder: string[]): string[] {
  const uniqueBase = Array.from(new Set(baseOrder)).filter((id) => defaultOrder.includes(id));
  const missing = defaultOrder.filter((id) => !uniqueBase.includes(id));
  return [...uniqueBase, ...missing];
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function SortableMiniCard({ card }: SortableMiniCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-accent/70"
          aria-label={`Arrastar card ${card.title}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <StatsCard
        title={card.title}
        value={card.value}
        icon={card.icon}
        description={card.description}
      />
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, isGlobalAdmin, isLocalAdmin, isLocalManager } = useAuth();
  const queryClient = useQueryClient();
  useMilitaryDataSync(isAuthenticated);

  const [chartType3, setChartType3] = useState<ChartType>("bar");
  const [metric3, setMetric3] = useState<string>("postoGraduacao");

  const [compareMode3, setCompareMode3] = useState(false);
  const [metric3Compare, setMetric3Compare] = useState<string>("missaoOp");
  const [miniCardOrder, setMiniCardOrder] = useState<string[]>([]);
  const [hasCustomOrder, setHasCustomOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Redirecionando para login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: militares = [], isLoading: isMilitaresLoading } = useQuery<MilitaryPersonnel[]>({
    queryKey: ["/api/militares"],
    enabled: isAuthenticated,
    ...militaryQuerySyncOptions,
  });

  // Buscar campos disponíveis
  const { data: availableFields, isLoading: isFieldsLoading } = useQuery<{ all: AvailableField[] }>({
    queryKey: ["/api/stats/fields"],
    enabled: isAuthenticated,
  });

  const { data: savedPreference } = useQuery<UserPreference>({
    queryKey: [`/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`],
    enabled: isAuthenticated && !!user,
  });

  const savePreferenceMutation = useMutation({
    mutationFn: async (cardOrder: string[]) => {
      const response = await apiRequest("PUT", `/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`, {
        preferenceValue: cardOrder,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`] });
    },
  });

  const resetPreferenceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`);
    },
    onSuccess: () => {
      queryClient.setQueryData([`/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`], null);
      queryClient.invalidateQueries({ queryKey: [`/api/preferences/${DASHBOARD_MINICARDS_PREFERENCE_KEY}`] });
      toast({
        title: "Layout redefinido",
        description: "A ordem dos minicards foi restaurada ao padrão.",
      });
    },
  });

  const defaultMiniCards = useMemo<DashboardMiniCard[]>(() => {
    const totalMilitares = militares.length;
    const companhias = new Set<string>();
    let prontos = 0;
    let semDestino = 0;
    const missaoMap = new Map<string, { label: string; count: number }>();

    militares.forEach((militar) => {
      const companhia = trimText(militar.companhia);
      const situacao = trimText(militar.situacao);
      const missao = trimText(militar.missaoOp);

      if (companhia) {
        companhias.add(companhia);
      }

      if (isProntoSituation(situacao)) {
        prontos += 1;
      }

      if (missao) {
        const missaoKey = normalizeText(missao);
        const current = missaoMap.get(missaoKey);
        if (current) {
          current.count += 1;
        } else {
          missaoMap.set(missaoKey, { label: missao, count: 1 });
        }
      }

      if (!situacao && !missao) {
        semDestino += 1;
      }
    });

    const missaoCards = Array.from(missaoMap.entries())
      .sort(([, a], [, b]) => a.label.localeCompare(b.label, "pt-BR"))
      .map(([missaoKey, missao]) => ({
        id: `missao:${encodeURIComponent(missaoKey)}`,
        title: missao.label,
        value: missao.count,
        icon: Target,
        description: "Militares nessa missão",
      }));

    const cards: DashboardMiniCard[] = [
      {
        id: "total",
        title: "Todos os Militares",
        value: totalMilitares,
        icon: Users,
        description: "Efetivo total cadastrado",
      },
      {
        id: "companhias",
        title: "Companhias",
        value: companhias.size,
        icon: Building2,
        description: "Companhias com efetivo",
      },
      {
        id: "prontos",
        title: "Prontos",
        value: prontos,
        icon: Shield,
        description: "Situação igual a Pronto",
      },
      {
        id: "nao-prontos",
        title: "Não Prontos",
        value: totalMilitares - prontos,
        icon: UserX,
        description: "Situação diferente de Pronto",
      },
      ...missaoCards,
    ];

    if (semDestino > 0) {
      cards.push({
        id: "sem-destino",
        title: "Sem Destino",
        value: semDestino,
        icon: HelpCircle,
        description: "Sem Situação e sem Missão",
      });
    }

    return cards;
  }, [militares]);

  const defaultMiniCardOrder = useMemo(
    () => defaultMiniCards.map((card) => card.id),
    [defaultMiniCards],
  );

  useEffect(() => {
    if (defaultMiniCardOrder.length === 0) {
      setMiniCardOrder([]);
      return;
    }

    const savedOrder = parsePreferenceOrder(savedPreference?.preferenceValue);
    setMiniCardOrder((currentOrder) => {
      const source = hasCustomOrder
        ? currentOrder
        : (savedOrder.length > 0 ? savedOrder : currentOrder);
      const mergedOrder = mergeCardOrder(source, defaultMiniCardOrder);
      return arraysEqual(currentOrder, mergedOrder) ? currentOrder : mergedOrder;
    });
  }, [defaultMiniCardOrder, savedPreference, hasCustomOrder]);

  const orderedMiniCards = useMemo(() => {
    if (miniCardOrder.length === 0) {
      return defaultMiniCards;
    }

    const cardMap = new Map(defaultMiniCards.map((card) => [card.id, card]));
    return miniCardOrder
      .map((cardId) => cardMap.get(cardId))
      .filter((card): card is DashboardMiniCard => !!card);
  }, [defaultMiniCards, miniCardOrder]);

  const handleMiniCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setHasCustomOrder(true);
    setMiniCardOrder((currentOrder) => {
      const oldIndex = currentOrder.findIndex((cardId) => cardId === active.id);
      const newIndex = currentOrder.findIndex((cardId) => cardId === over.id);
      if (oldIndex === -1 || newIndex === -1) return currentOrder;

      const reordered = arrayMove(currentOrder, oldIndex, newIndex);
      savePreferenceMutation.mutate(reordered);
      return reordered;
    });
  };

  const handleResetMiniCards = () => {
    setMiniCardOrder(defaultMiniCardOrder);
    resetPreferenceMutation.mutate(undefined, {
      onSuccess: () => {
        setHasCustomOrder(false);
      },
    });
  };

  const { data: data3Response } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric3],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/dynamic?field=${encodeURIComponent(metric3)}`);
      return res.json();
    },
    enabled: isAuthenticated && !!metric3,
  });

  const { data: data3CrossResponse } = useQuery<CrossStatsResponse>({
    queryKey: ["/api/stats/cross", metric3, metric3Compare],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/cross?fieldX=${encodeURIComponent(metric3)}&fieldY=${encodeURIComponent(metric3Compare)}`);
      return res.json();
    },
    enabled: isAuthenticated && compareMode3 && !!metric3 && !!metric3Compare,
  });

  if (authLoading || isMilitaresLoading || isFieldsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Função para preparar dados dos gráficos com ordenação hierárquica
  const prepareChartData = (response: DynamicStatsResponse | undefined, fieldName: string) => {
    if (!response || !response.data) return [];

    const data = response.data.map(item => ({
      name: item.name,
      value: item.value,
      valor: item.value, // Para compatibilidade com BarChart
    }));

    // Aplicar ordenação hierárquica para postos/graduações
    if (fieldName === "postoGraduacao") {
      return data.sort((a, b) => getRankOrder(a.name) - getRankOrder(b.name));
    }

    return data;
  };

  // Obter label do campo
  const getFieldLabel = (fieldName: string): string => {
    const field = availableFields?.all?.find(f => f.name === fieldName);
    return field?.label || fieldName;
  };

  const sortCategories = (values: string[], fieldName: string) => {
    if (fieldName === "postoGraduacao") {
      return values.sort((a, b) => getRankOrder(a) - getRankOrder(b));
    }
    return values.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  };

  const buildCrossDataset = (response: CrossStatsResponse | undefined, primaryField: string, compareField: string) => {
    if (!response || !response.data) return { data: [], keys: [] as string[] };

    const rowMap: Record<string, Record<string, number>> = {};
    const xSet = new Set<string>();
    const ySet = new Set<string>();

    response.data.forEach((item) => {
      xSet.add(item.x);
      ySet.add(item.y);
      if (!rowMap[item.x]) rowMap[item.x] = {};
      rowMap[item.x][item.y] = item.value;
    });

    const xValues = sortCategories(Array.from(xSet), primaryField);
    const yValues = sortCategories(Array.from(ySet), compareField);

    const data = xValues.map((name) => {
      const row: Record<string, any> = { name };
      yValues.forEach((key) => {
        row[key] = rowMap[name]?.[key] || 0;
      });
      return row;
    });

    return { data, keys: yValues };
  };

  // Renderizar gráfico baseado no tipo selecionado
  const renderChart = (
    chartType: ChartType,
    data: any[],
    height = 300,
    compareData?: any[],
    primaryLabel?: string,
    compareLabel?: string,
    crossKeys?: string[]
  ) => {
    const tooltipStyle = {
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "0.5rem",
    };

    const hasComparison = compareData && compareData.length > 0;

    if (hasComparison && (chartType === "pie" || chartType === "scatter" || chartType === "radialBar")) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          Comparação disponível apenas para gráficos de barra, linha, área, radar ou composto.
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        if (hasComparison) {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(crossKeys || []).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        if (hasComparison) {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(crossKeys || []).map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        if (hasComparison) {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(crossKeys || []).map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "radar":
        if (hasComparison) {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart data={compareData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="name" className="text-xs" />
                <PolarRadiusAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(crossKeys || []).map((key, index) => (
                  <RechartsRadar
                    key={key}
                    name={key}
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.4}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="name" className="text-xs" />
              <PolarRadiusAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <RechartsRadar
                name="Efetivo"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="category"
                dataKey="name"
                name="Categoria"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis type="number" dataKey="value" name="Valor" className="text-xs" />
              <ZAxis range={[100, 1000]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
              {hasComparison && <Legend />}
              <Scatter
                name={primaryLabel || "Primário"}
                data={data}
                fill="hsl(var(--primary))"
                shape="circle"
              />
              {hasComparison && (
                <Scatter
                  name={compareLabel || "Comparação"}
                  data={compareData}
                  fill="hsl(var(--chart-2))"
                  shape="triangle"
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "composed":
        if (hasComparison) {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {(crossKeys || []).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Quantidade" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-2))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-2))", r: 5 }}
                name="Tendência"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "radialBar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="10%"
              outerRadius="90%"
              data={data.map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length],
              }))}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                background
                dataKey="value"
              />
              <Legend
                iconSize={10}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Preparar dados para o gráfico
  const data3 = prepareChartData(data3Response, metric3);

  const cross3 = buildCrossDataset(data3CrossResponse, metric3, metric3Compare);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard Analítico</h1>
        <p className="text-muted-foreground">Visualizações interativas e análise de dados do efetivo</p>
      </div>

      {!isGlobalAdmin && !isLocalAdmin && !isLocalManager && user?.role === "user" && (
        <BootstrapAdmin />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Arraste os minicards para reorganizar a visualização.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetMiniCards}
            disabled={resetPreferenceMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar ordem padrão
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleMiniCardDragEnd}
        >
          <SortableContext
            items={orderedMiniCards.map((card) => card.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {orderedMiniCards.map((card) => (
                <SortableMiniCard key={card.id} card={card} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Gráfico final */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Gráfico: {getFieldLabel(metric3)}</CardTitle>
              <CardDescription>Escolha o tipo de visualização, métrica e modo de comparação</CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">Tipo de Gráfico</label>
              <Tabs value={chartType3} onValueChange={(v) => setChartType3(v as ChartType)}>
                <TabsList className="grid grid-cols-4 gap-1">
                  {(["bar", "pie", "line", "area", "radar", "scatter", "composed", "radialBar"] as ChartType[]).map((type) => {
                    const Icon = chartTypeIcons[type];
                    return (
                      <TabsTrigger key={type} value={type} title={type} data-testid={`chart3-type-${type}`} className="px-2">
                        <Icon className="h-4 w-4" />
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">Dados a Exibir</label>
              <Select value={metric3} onValueChange={setMetric3}>
                <SelectTrigger data-testid="chart3-metric-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFields?.all?.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[180px]">
              <Switch
                id="compare3"
                checked={compareMode3}
                onCheckedChange={setCompareMode3}
                data-testid="chart3-compare-switch"
              />
              <Label htmlFor="compare3" className="text-sm font-medium">Comparar com outra métrica</Label>
            </div>

            {compareMode3 && (
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">2ª Métrica (Comparação)</label>
                <Select value={metric3Compare} onValueChange={setMetric3Compare}>
                  <SelectTrigger data-testid="chart3-metric-compare-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields?.all?.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            {data3.length > 0 ? (
              renderChart(
                chartType3,
                data3,
                400,
                compareMode3 ? cross3.data : undefined,
                getFieldLabel(metric3),
                compareMode3 ? getFieldLabel(metric3Compare) : undefined,
                compareMode3 ? cross3.keys : undefined
              )
            ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
