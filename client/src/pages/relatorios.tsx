import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText, Download, Filter, X, BarChart3, PieChart as PieChartIcon, TrendingUp, Circle, Radar as RadarIcon } from "lucide-react";
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
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { MilitaryPersonnel } from "@shared/schema";
import { getRankCategory } from "@/lib/utils";
import { COMPANIES, RANKS, STATUSES, MISSIONS } from "@shared/schema";

type ChartType = "bar" | "pie" | "line" | "area" | "radar";
type DataMetric = "company" | "rank" | "status" | "mission";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(145, 70%, 45%)",
  "hsl(200, 70%, 45%)",
  "hsl(30, 70%, 50%)",
  "hsl(270, 70%, 50%)",
  "hsl(350, 70%, 50%)",
];

const metricLabels: Record<DataMetric, string> = {
  company: "Companhias",
  rank: "Postos/Graduações",
  status: "Situações",
  mission: "Missões",
};

const chartTypeIcons: Record<ChartType, any> = {
  bar: BarChart3,
  pie: PieChartIcon,
  line: TrendingUp,
  area: Circle,
  radar: RadarIcon,
};

export default function Relatorios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [metric, setMetric] = useState<DataMetric>("rank");
  const [filters, setFilters] = useState({
    companhia: "",
    posto: "",
    situacao: "",
    missaoOp: "",
    search: "",
  });

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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Aplica filtros localmente para preview
  const filteredMilitares = militares.filter(militar => {
    if (filters.companhia && militar.companhia !== filters.companhia) return false;
    if (filters.posto && militar.postoGraduacao !== filters.posto) return false;
    if (filters.situacao && militar.situacao !== filters.situacao) return false;
    if (filters.missaoOp && militar.missaoOp !== filters.missaoOp) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = militar.nomeCompleto.toLowerCase().includes(searchLower);
      const matchesGuerra = militar.nomeGuerra?.toLowerCase().includes(searchLower);
      const matchesCPF = militar.cpf?.includes(filters.search);
      const matchesId = militar.identidade?.includes(filters.search);
      if (!matchesName && !matchesGuerra && !matchesCPF && !matchesId) return false;
    }
    return true;
  });

  // Preparar dados baseado na métrica selecionada
  const getChartDataForMetric = (selectedMetric: DataMetric) => {
    const dataMap: Record<string, number> = {};
    
    filteredMilitares.forEach((militar) => {
      let key: string;
      switch (selectedMetric) {
        case "company":
          key = militar.companhia;
          break;
        case "rank":
          key = militar.postoGraduacao;
          break;
        case "status":
          key = militar.situacao || "Sem status";
          break;
        case "mission":
          key = militar.missaoOp || "Sem missão";
          break;
      }
      dataMap[key] = (dataMap[key] || 0) + 1;
    });
    
    return Object.entries(dataMap).map(([name, value]) => ({
      name,
      value,
      total: value, // Para compatibilidade com diferentes tipos de gráfico
    }));
  };

  const chartData = getChartDataForMetric(metric);

  // Função para renderizar gráfico baseado no tipo selecionado
  const renderChart = (type: ChartType, data: any[], height = 400) => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={120} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total de Militares">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height / 3, 150)}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={120} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} name="Quantidade" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={120} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="value" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" name="Quantidade" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="name" className="text-xs" />
              <PolarRadiusAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <RechartsRadar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="Quantidade" />
            </RadarChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    // Constrói query string com filtros
    const params = new URLSearchParams();
    if (filters.companhia) params.append('companhia', filters.companhia);
    if (filters.posto) params.append('posto', filters.posto);
    if (filters.situacao) params.append('situacao', filters.situacao);
    if (filters.missaoOp) params.append('missaoOp', filters.missaoOp);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/api/export/${format}${queryString ? `?${queryString}` : ''}`;

    try {
      // Usa apiRequest para incluir Authorization e baixar o arquivo
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Falha ao exportar ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      // Tenta extrair o nome do arquivo dos headers
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `relatorio.${format === 'excel' ? 'xlsx' : 'pdf'}`;

      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlBlob);

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} gerado com ${filteredMilitares.length} militar(es)`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message || "Falha ao gerar arquivo",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      companhia: "",
      posto: "",
      situacao: "",
      missaoOp: "",
      search: "",
    });
  };

  const hasFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary" data-testid="heading-relatorios">Relatórios</h1>
        <p className="text-muted-foreground">Análise detalhada e exportação de dados do efetivo militar</p>
      </div>

      {/* Card de Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>Filtros de Exportação</CardTitle>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            )}
          </div>
          <CardDescription>
            Aplique filtros para refinar os dados antes de exportar. 
            <strong className="text-foreground"> {filteredMilitares.length} militar(es) selecionado(s)</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Companhia</label>
              <Select value={filters.companhia} onValueChange={(value) => setFilters({...filters, companhia: value === "all" ? "" : value})}>
                <SelectTrigger data-testid="select-companhia-filter">
                  <SelectValue placeholder="Todas as companhias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as companhias</SelectItem>
                  {COMPANIES.map(cia => (
                    <SelectItem key={cia} value={cia}>{cia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Posto/Graduação</label>
              <Select value={filters.posto} onValueChange={(value) => setFilters({...filters, posto: value === "all" ? "" : value})}>
                <SelectTrigger data-testid="select-posto-filter">
                  <SelectValue placeholder="Todos os postos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os postos</SelectItem>
                  {RANKS.map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Situação</label>
              <Select value={filters.situacao} onValueChange={(value) => setFilters({...filters, situacao: value === "all" ? "" : value})}>
                <SelectTrigger data-testid="select-situacao-filter">
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Missão</label>
              <Select value={filters.missaoOp} onValueChange={(value) => setFilters({...filters, missaoOp: value === "all" ? "" : value})}>
                <SelectTrigger data-testid="select-missao-filter">
                  <SelectValue placeholder="Todas as missões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as missões</SelectItem>
                  {MISSIONS.map(mission => (
                    <SelectItem key={mission} value={mission}>{mission}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Busca por Nome/CPF/Identidade</label>
              <Input
                placeholder="Digite nome, CPF ou identidade..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                data-testid="input-search-filter"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso visual do total a exportar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">Total que será exportado:</div>
            <div className="text-5xl font-bold text-primary" data-testid="text-export-total">
              {filteredMilitares.length}
            </div>
            <div className="text-sm font-medium mt-2">
              {hasFilters ? (
                <span className="text-amber-600">⚠️ Filtros ativos - exportando dados filtrados</span>
              ) : (
                <span className="text-green-600">✓ Sem filtros - exportando TODOS os {militares.length} militares</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Exportação */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Exportar Excel
            </CardTitle>
            <CardDescription>
              Planilha formatada com todos os dados dos militares
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gera arquivo Excel (.xlsx) com formatação profissional, incluindo todos os campos: 
              ORD, P/GRAD, nome completo, companhia, função, situação, missão, CPF, telefone e email.
            </p>
            <Button 
              variant="default" 
              className="w-full" 
              onClick={() => handleExport("excel")} 
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar {filteredMilitares.length} Militar(es) em Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Exportar PDF
            </CardTitle>
            <CardDescription>
              Relatório oficial com cabeçalho do 7º BIS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gera relatório PDF com formatação militar profissional, incluindo cabeçalho do 
              Exército Brasileiro, 7º BIS, data/hora do relatório e tabela formatada.
            </p>
            <Button 
              variant="default" 
              className="w-full" 
              onClick={() => handleExport("pdf")} 
              data-testid="button-export-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar {filteredMilitares.length} Militar(es) em PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Distribuição */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Distribuição: {metricLabels[metric]}</CardTitle>
              <CardDescription>Visualização dos dados filtrados</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">Tipo de Gráfico</label>
              <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <TabsList className="grid grid-cols-5">
                  {(["bar", "pie", "line", "area", "radar"] as ChartType[]).map((type) => {
                    const Icon = chartTypeIcons[type];
                    return (
                      <TabsTrigger key={type} value={type} title={type} data-testid={`relatorios-chart-type-${type}`}>
                        <Icon className="h-4 w-4" />
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">Dados a Exibir</label>
              <Select value={metric} onValueChange={(v) => setMetric(v as DataMetric)}>
                <SelectTrigger data-testid="relatorios-chart-metric-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company" data-testid="metric-company">Por Companhia</SelectItem>
                  <SelectItem value="rank" data-testid="metric-rank">Por Posto/Graduação</SelectItem>
                  <SelectItem value="status" data-testid="metric-status">Por Situação</SelectItem>
                  <SelectItem value="mission" data-testid="metric-mission">Por Missão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            renderChart(chartType, chartData, 400)
          ) : (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              Nenhum militar encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
