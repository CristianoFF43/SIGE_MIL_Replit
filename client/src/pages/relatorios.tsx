import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, Download, Filter, X, BarChart3, PieChart as PieChartIcon, TrendingUp, Circle, Radar as RadarIcon, Columns } from "lucide-react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

const AVAILABLE_COLUMNS = [
  { id: 'ORD', label: 'Ordem' },
  { id: 'P/GRAD', label: 'Posto/Graduação' },
  { id: 'ARMA/QUADRO/SERV', label: 'Arma/Quadro/Serviço' },
  { id: 'NOME COMPLETO', label: 'Nome Completo' },
  { id: 'NOME GUERRA', label: 'Nome de Guerra' },
  { id: 'CIA', label: 'Companhia' },
  { id: 'SEÇÃO/FRAÇÃO', label: 'Seção/Fração' },
  { id: 'FUNÇÃO', label: 'Função' },
  { id: 'SITUAÇÃO', label: 'Situação' },
  { id: 'MISSÃO', label: 'Missão' },
  { id: 'CURSO', label: 'Curso' },
  { id: 'IDENTIDADE', label: 'Identidade' },
  { id: 'CPF', label: 'CPF' },
  { id: 'TELEFONE', label: 'Telefone' },
  { id: 'EMAIL', label: 'Email' },
];

export default function Relatorios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [metric, setMetric] = useState<DataMetric>("rank");

  // Filtros agora suportam arrays para multi-seleção
  const [filters, setFilters] = useState({
    companhia: [] as string[],
    posto: [] as string[],
    situacao: [] as string[],
    missaoOp: [] as string[],
    secaoFracao: [] as string[],
    funcao: [] as string[],
    search: "",
  });

  // Colunas selecionadas para exportação
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map(c => c.id)
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Extrair opções únicas para os novos filtros
  const uniqueSecoes = Array.from(new Set(militares.map(m => m.secaoFracao).filter(Boolean))) as string[];
  const uniqueFuncoes = Array.from(new Set(militares.map(m => m.funcao).filter(Boolean))) as string[];

  // Aplica filtros localmente para preview
  const filteredMilitares = militares.filter(militar => {
    if (filters.companhia.length > 0 && !filters.companhia.includes(militar.companhia)) return false;
    if (filters.posto.length > 0 && !filters.posto.includes(militar.postoGraduacao)) return false;
    if (filters.situacao.length > 0 && militar.situacao && !filters.situacao.includes(militar.situacao)) return false;
    if (filters.missaoOp.length > 0 && militar.missaoOp && !filters.missaoOp.includes(militar.missaoOp)) return false;
    if (filters.secaoFracao.length > 0 && militar.secaoFracao && !filters.secaoFracao.includes(militar.secaoFracao)) return false;
    if (filters.funcao.length > 0 && militar.funcao && !filters.funcao.includes(militar.funcao)) return false;

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

    // Adiciona filtros multi-valor
    filters.companhia.forEach(v => params.append('companhia', v));
    filters.posto.forEach(v => params.append('posto', v));
    filters.situacao.forEach(v => params.append('situacao', v));
    filters.missaoOp.forEach(v => params.append('missaoOp', v));
    filters.secaoFracao.forEach(v => params.append('secaoFracao', v));
    filters.funcao.forEach(v => params.append('funcao', v));

    if (filters.search) params.append('search', filters.search);

    // Adiciona colunas selecionadas
    selectedColumns.forEach(c => params.append('columns', c));

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
      companhia: [],
      posto: [],
      situacao: [],
      missaoOp: [],
      secaoFracao: [],
      funcao: [],
      search: "",
    });
  };

  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== "");

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.id));
  };

  const clearColumns = () => {
    setSelectedColumns([]);
  };

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
              <MultiSelect
                options={COMPANIES.map(c => ({ label: c, value: c }))}
                selected={filters.companhia}
                onChange={(val) => setFilters({ ...filters, companhia: val })}
                placeholder="Selecione companhias..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Posto/Graduação</label>
              <MultiSelect
                options={RANKS.map(r => ({ label: r, value: r }))}
                selected={filters.posto}
                onChange={(val) => setFilters({ ...filters, posto: val })}
                placeholder="Selecione postos..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Situação</label>
              <MultiSelect
                options={STATUSES.map(s => ({ label: s, value: s }))}
                selected={filters.situacao}
                onChange={(val) => setFilters({ ...filters, situacao: val })}
                placeholder="Selecione situações..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Missão</label>
              <MultiSelect
                options={MISSIONS.map(m => ({ label: m, value: m }))}
                selected={filters.missaoOp}
                onChange={(val) => setFilters({ ...filters, missaoOp: val })}
                placeholder="Selecione missões..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seção/Fração</label>
              <MultiSelect
                options={uniqueSecoes.map(s => ({ label: s, value: s }))}
                selected={filters.secaoFracao}
                onChange={(val) => setFilters({ ...filters, secaoFracao: val })}
                placeholder="Selecione seções..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Função</label>
              <MultiSelect
                options={uniqueFuncoes.map(f => ({ label: f, value: f }))}
                selected={filters.funcao}
                onChange={(val) => setFilters({ ...filters, funcao: val })}
                placeholder="Selecione funções..."
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium">Busca por Nome/CPF/Identidade</label>
              <Input
                placeholder="Digite nome, CPF ou identidade..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search-filter"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Colunas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Columns className="h-5 w-5 text-primary" />
              <CardTitle>Colunas do Relatório</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllColumns}>Selecionar Todas</Button>
              <Button variant="ghost" size="sm" onClick={clearColumns}>Limpar</Button>
            </div>
          </div>
          <CardDescription>
            Escolha quais colunas aparecerão nos arquivos Excel e PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 rounded-md border p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {AVAILABLE_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={selectedColumns.includes(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  <Label htmlFor={`col-${col.id}`} className="text-sm cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
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
              Gera arquivo Excel (.xlsx) com formatação profissional, incluindo as {selectedColumns.length} colunas selecionadas.
            </p>
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleExport("excel")}
              data-testid="button-export-excel"
              disabled={selectedColumns.length === 0}
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
              Gera relatório PDF com formatação militar profissional, incluindo as {selectedColumns.length} colunas selecionadas.
            </p>
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleExport("pdf")}
              data-testid="button-export-pdf"
              disabled={selectedColumns.length === 0}
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
