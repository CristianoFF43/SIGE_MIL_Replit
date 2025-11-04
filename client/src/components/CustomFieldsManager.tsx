import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, GripVertical, Columns } from "lucide-react";
import type { CustomFieldDefinition, InsertCustomFieldDefinition } from "@shared/schema";
import { FIELD_TYPES } from "@shared/schema";

interface FieldFormData {
  name: string;
  label: string;
  fieldType: "text" | "number" | "select" | "date";
  options: string;
  required: boolean;
}

export function CustomFieldsManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<FieldFormData>({
    name: "",
    label: "",
    fieldType: "text",
    options: "",
    required: false,
  });

  const { data: customFields = [], isLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomFieldDefinition) => {
      return await apiRequest("POST", "/api/custom-fields", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      toast({
        title: "Sucesso",
        description: "Campo customizado criado com sucesso",
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar campo customizado",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCustomFieldDefinition> }) => {
      return await apiRequest("PATCH", `/api/custom-fields/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      toast({
        title: "Sucesso",
        description: "Campo customizado atualizado com sucesso",
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar campo customizado",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      toast({
        title: "Sucesso",
        description: "Campo customizado removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover campo customizado",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      fieldType: "text",
      options: "",
      required: false,
    });
    setEditingField(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      fieldType: field.fieldType as "text" | "number" | "select" | "date",
      options: field.options ? field.options.join(", ") : "",
      required: field.required === 1,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    // Validações
    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do campo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.label.trim()) {
      toast({
        title: "Erro de validação",
        description: "Rótulo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Validar nome do campo (apenas letras, números e underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      toast({
        title: "Erro de validação",
        description: "Nome do campo deve conter apenas letras, números e underscores",
        variant: "destructive",
      });
      return;
    }

    if (formData.fieldType === "select" && !formData.options.trim()) {
      toast({
        title: "Erro de validação",
        description: "Campos do tipo 'select' devem ter opções",
        variant: "destructive",
      });
      return;
    }

    const data: InsertCustomFieldDefinition = {
      name: formData.name,
      label: formData.label,
      fieldType: formData.fieldType,
      options: formData.fieldType === "select"
        ? formData.options.split(",").map(opt => opt.trim()).filter(opt => opt.length > 0)
        : null,
      required: formData.required ? 1 : 0,
      orderIndex: editingField?.orderIndex ?? customFields.length,
    };

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (field: CustomFieldDefinition) => {
    if (confirm(`Tem certeza que deseja remover o campo "${field.label}"? Os dados armazenados neste campo serão perdidos.`)) {
      deleteMutation.mutate(field.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Gerenciar Colunas Customizadas
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Gerenciar Colunas Customizadas
            </CardTitle>
            <CardDescription>
              Adicione, edite ou remova colunas personalizadas para a tabela de militares
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="button-add-custom-field">
                <Plus className="h-4 w-4 mr-2" />
                Nova Coluna
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingField ? "Editar Campo Customizado" : "Novo Campo Customizado"}
                </DialogTitle>
                <DialogDescription>
                  Configure as propriedades do campo customizado
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome do Campo (interno) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="ex: especializacao"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!editingField}
                    data-testid="input-field-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas letras, números e underscores. Não pode ser alterado depois de criado.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">
                    Rótulo (exibição) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    placeholder="ex: Especialização"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    data-testid="input-field-label"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome que aparecerá no cabeçalho da tabela
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fieldType">
                    Tipo de Campo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.fieldType}
                    onValueChange={(value) => setFormData({ ...formData, fieldType: value as any })}
                  >
                    <SelectTrigger data-testid="select-field-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Seleção (dropdown)</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.fieldType === "select" && (
                  <div className="space-y-2">
                    <Label htmlFor="options">
                      Opções <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="options"
                      placeholder="Opção 1, Opção 2, Opção 3"
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                      data-testid="input-field-options"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe as opções por vírgula
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={formData.required}
                    onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                    data-testid="switch-field-required"
                  />
                  <Label htmlFor="required" className="cursor-pointer">
                    Campo obrigatório
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} data-testid="button-save-custom-field">
                  {editingField ? "Salvar Alterações" : "Criar Campo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {customFields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Columns className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum campo customizado criado ainda</p>
            <p className="text-sm mt-2">Clique em "Nova Coluna" para adicionar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Rótulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customFields
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((field) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{field.name}</TableCell>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {field.fieldType === "text" && "Texto"}
                        {field.fieldType === "number" && "Número"}
                        {field.fieldType === "select" && "Seleção"}
                        {field.fieldType === "date" && "Data"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.required === 1 ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(field)}
                          data-testid={`button-edit-field-${field.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(field)}
                          data-testid={`button-delete-field-${field.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
