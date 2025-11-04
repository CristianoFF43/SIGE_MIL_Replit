import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "@/components/stats-card";
import { BootstrapAdmin } from "@/components/bootstrap-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Building2, Shield, Activity, BarChart3, PieChart as PieChartIcon, TrendingUp, Circle, Radar, Scatter as ScatterIcon, Layers, CircleDot } from "lucide-react";
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

interface DashboardStats {
  total: number;
  byCompany: Record<string, number>;
  byRank: Record<string, number>;
  byStatus: Record<string, number>;
  byMission: Record<string, number>;
}

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
  scatter: ScatterIcon,
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

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, isAdmin } = useAuth();
  
  // Estado para seleção de gráficos
  const [chartType1, setChartType1] = useState<ChartType>("bar");
  const [chartType2, setChartType2] = useState<ChartType>("pie");
  const [chartType3, setChartType3] = useState<ChartType>("bar");
  const [metric1, setMetric1] = useState<string>("companhia");
  const [metric2, setMetric2] = useState<string>("situacao");
  const [metric3, setMetric3] = useState<string>("postoGraduacao");

  // Estado para modo de comparação
  const [compareMode1, setCompareMode1] = useState(false);
  const [compareMode2, setCompareMode2] = useState(false);
  const [compareMode3, setCompareMode3] = useState(false);
  const [metric1Compare, setMetric1Compare] = useState<string>("situacao");
  const [metric2Compare, setMetric2Compare] = useState<string>("companhia");
  const [metric3Compare, setMetric3Compare] = useState<string>("missaoOp");

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

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  // Buscar campos disponíveis
  const { data: availableFields } = useQuery<{ all: AvailableField[] }>({
    queryKey: ["/api/stats/fields"],
    enabled: isAuthenticated,
  });

  // Buscar dados dinâmicos para cada métrica
  const { data: data1Response } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric1],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric1)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && !!metric1,
  });

  const { data: data1CompareResponse } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric1Compare],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric1Compare)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && compareMode1 && !!metric1Compare,
  });

  const { data: data2Response } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric2],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric2)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && !!metric2,
  });

  const { data: data2CompareResponse } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric2Compare],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric2Compare)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && compareMode2 && !!metric2Compare,
  });

  const { data: data3Response } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric3],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric3)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && !!metric3,
  });

  const { data: data3CompareResponse } = useQuery<DynamicStatsResponse>({
    queryKey: ["/api/stats/dynamic", metric3Compare],
    queryFn: async () => {
      const response = await fetch(`/api/stats/dynamic?field=${encodeURIComponent(metric3Compare)}`);
      if (!response.ok) throw new Error("Failed to fetch dynamic stats");
      return response.json();
    },
    enabled: isAuthenticated && compareMode3 && !!metric3Compare,
  });

  if (authLoading || isLoading) {
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

  // Renderizar gráfico baseado no tipo selecionado
  const renderChart = (
    chartType: ChartType,
    data: any[],
    height = 300,
    compareData?: any[],
    primaryLabel?: string,
    compareLabel?: string
  ) => {
    const tooltipStyle = {
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "0.5rem",
    };

    const hasComparison = compareData && compareData.length > 0;

    switch (chartType) {
      case "bar":
        if (hasComparison) {
          // Merge datasets for comparison
          const mergedData = data.map(item => {
            const compareItem = compareData.find(c => c.name === item.name);
            return {
              name: item.name,
              [primaryLabel || "Primário"]: item.value,
              [compareLabel || "Comparação"]: compareItem?.value || 0,
            };
          });

          return (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey={primaryLabel || "Primário"} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey={compareLabel || "Comparação"} fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
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
          const mergedData = data.map(item => {
            const compareItem = compareData.find(c => c.name === item.name);
            return {
              name: item.name,
              [primaryLabel || "Primário"]: item.value,
              [compareLabel || "Comparação"]: compareItem?.value || 0,
            };
          });

          return (
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={primaryLabel || "Primário"}
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey={compareLabel || "Comparação"}
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", r: 5 }}
                  activeDot={{ r: 8 }}
                />
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
          const mergedData = data.map(item => {
            const compareItem = compareData.find(c => c.name === item.name);
            return {
              name: item.name,
              [primaryLabel || "Primário"]: item.value,
              [compareLabel || "Comparação"]: compareItem?.value || 0,
            };
          });

          return (
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey={primaryLabel || "Primário"}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey={compareLabel || "Comparação"}
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.4}
                />
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
          const mergedData = data.map(item => {
            const compareItem = compareData.find(c => c.name === item.name);
            return {
              name: item.name,
              [primaryLabel || "Primário"]: item.value,
              [compareLabel || "Comparação"]: compareItem?.value || 0,
            };
          });

          return (
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart data={mergedData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="name" className="text-xs" />
                <PolarRadiusAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <RechartsRadar
                  name={primaryLabel || "Primário"}
                  dataKey={primaryLabel || "Primário"}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <RechartsRadar
                  name={compareLabel || "Comparação"}
                  dataKey={compareLabel || "Comparação"}
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.4}
                />
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
          const mergedData = data.map(item => {
            const compareItem = compareData.find(c => c.name === item.name);
            return {
              name: item.name,
              [primaryLabel || "Primário"]: item.value,
              [compareLabel || "Comparação"]: compareItem?.value || 0,
            };
          });

          return (
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={mergedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey={primaryLabel || "Primário"} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey={compareLabel || "Comparação"} fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
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
                minAngle={15}
                label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                background
                clockWise
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

  // Preparar dados para os gráficos
  const data1 = prepareChartData(data1Response, metric1);
  const data1Compare = prepareChartData(data1CompareResponse, metric1Compare);
  const data2 = prepareChartData(data2Response, metric2);
  const data2Compare = prepareChartData(data2CompareResponse, metric2Compare);
  const data3 = prepareChartData(data3Response, metric3);
  const data3Compare = prepareChartData(data3CompareResponse, metric3Compare);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard Analítico</h1>
        <p className="text-muted-foreground">Visualizações interativas e análise de dados do efetivo</p>
      </div>

      {!isAdmin && user?.role === "user" && (
        <BootstrapAdmin />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Militares"
          value={stats?.total || 0}
          icon={Users}
          description="Efetivo total cadastrado"
        />
        <StatsCard
          title="Companhias"
          value={Object.keys(stats?.byCompany || {}).length}
          icon={Building2}
          description="Unidades operacionais"
        />
        <StatsCard
          title="Prontos"
          value={stats?.byStatus?.["Pronto"] || 0}
          icon={Shield}
          description="Militares em prontidão"
        />
        <StatsCard
          title="Em Missão"
          value={stats?.byMission?.["FORPRON"] || 0}
          icon={Activity}
          description="Destacados FORPRON"
        />
      </div>

      {/* Gráficos Interativos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Gráfico 1: {getFieldLabel(metric1)}</CardTitle>
                <CardDescription>Escolha o tipo de visualização, métrica e modo de comparação</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Tipo de Gráfico</label>
                <Tabs value={chartType1} onValueChange={(v) => setChartType1(v as ChartType)}>
                  <TabsList className="grid grid-cols-4 gap-1">
                    {(["bar", "pie", "line", "area", "radar", "scatter", "composed", "radialBar"] as ChartType[]).map((type) => {
                      const Icon = chartTypeIcons[type];
                      return (
                        <TabsTrigger key={type} value={type} title={type} data-testid={`chart1-type-${type}`} className="px-2">
                          <Icon className="h-4 w-4" />
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Dados a Exibir</label>
                <Select value={metric1} onValueChange={setMetric1}>
                  <SelectTrigger data-testid="chart1-metric-select">
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
                  id="compare1"
                  checked={compareMode1}
                  onCheckedChange={setCompareMode1}
                  data-testid="chart1-compare-switch"
                />
                <Label htmlFor="compare1" className="text-sm font-medium">Comparar com outra métrica</Label>
              </div>

              {compareMode1 && (
                <div className="flex-1 min-w-[180px]">
                  <label className="text-sm font-medium mb-2 block">2ª Métrica (Comparação)</label>
                  <Select value={metric1Compare} onValueChange={setMetric1Compare}>
                    <SelectTrigger data-testid="chart1-metric-compare-select">
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
            {data1.length > 0 ? (
              renderChart(
                chartType1,
                data1,
                350,
                compareMode1 ? data1Compare : undefined,
                getFieldLabel(metric1),
                compareMode1 ? getFieldLabel(metric1Compare) : undefined
              )
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Gráfico 2: {getFieldLabel(metric2)}</CardTitle>
                <CardDescription>Escolha o tipo de visualização, métrica e modo de comparação</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Tipo de Gráfico</label>
                <Tabs value={chartType2} onValueChange={(v) => setChartType2(v as ChartType)}>
                  <TabsList className="grid grid-cols-4 gap-1">
                    {(["bar", "pie", "line", "area", "radar", "scatter", "composed", "radialBar"] as ChartType[]).map((type) => {
                      const Icon = chartTypeIcons[type];
                      return (
                        <TabsTrigger key={type} value={type} title={type} data-testid={`chart2-type-${type}`} className="px-2">
                          <Icon className="h-4 w-4" />
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Dados a Exibir</label>
                <Select value={metric2} onValueChange={setMetric2}>
                  <SelectTrigger data-testid="chart2-metric-select">
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
                  id="compare2"
                  checked={compareMode2}
                  onCheckedChange={setCompareMode2}
                  data-testid="chart2-compare-switch"
                />
                <Label htmlFor="compare2" className="text-sm font-medium">Comparar com outra métrica</Label>
              </div>

              {compareMode2 && (
                <div className="flex-1 min-w-[180px]">
                  <label className="text-sm font-medium mb-2 block">2ª Métrica (Comparação)</label>
                  <Select value={metric2Compare} onValueChange={setMetric2Compare}>
                    <SelectTrigger data-testid="chart2-metric-compare-select">
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
            {data2.length > 0 ? (
              renderChart(
                chartType2,
                data2,
                350,
                compareMode2 ? data2Compare : undefined,
                getFieldLabel(metric2),
                compareMode2 ? getFieldLabel(metric2Compare) : undefined
              )
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 3 - Análise Detalhada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Gráfico 3: {getFieldLabel(metric3)}</CardTitle>
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
              compareMode3 ? data3Compare : undefined,
              getFieldLabel(metric3),
              compareMode3 ? getFieldLabel(metric3Compare) : undefined
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
