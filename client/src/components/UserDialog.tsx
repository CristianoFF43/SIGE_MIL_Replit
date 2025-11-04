import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RANKS, DEFAULT_PERMISSIONS, type Permission, type User } from "@shared/schema";

const userFormSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  nomeGuerra: z.string().optional(),
  postoGraduacao: z.string().optional(),
  role: z.enum(["user", "manager", "administrator"]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: UserFormValues & { permissions: Permission }) => Promise<void>;
  isPending?: boolean;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isPending = false,
}: UserDialogProps) {
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [permissions, setPermissions] = useState<Permission>(DEFAULT_PERMISSIONS.user);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      nomeGuerra: "",
      postoGraduacao: "",
      role: "user",
    },
  });

  const selectedRole = form.watch("role");

  // Update form when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        nomeGuerra: user.nomeGuerra || "",
        postoGraduacao: user.postoGraduacao || "",
        role: (user.role as "user" | "manager" | "administrator") || "user",
      });
      
      // Load user's custom permissions or default
      if (user.permissions) {
        setPermissions(user.permissions as Permission);
        setUseCustomPermissions(true);
      } else {
        setPermissions(DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.user);
        setUseCustomPermissions(false);
      }
    } else {
      form.reset({
        email: "",
        firstName: "",
        lastName: "",
        nomeGuerra: "",
        postoGraduacao: "",
        role: "user",
      });
      setPermissions(DEFAULT_PERMISSIONS.user);
      setUseCustomPermissions(false);
    }
  }, [user, form]);

  // Update permissions when role changes and not using custom permissions
  useEffect(() => {
    if (!useCustomPermissions) {
      setPermissions(DEFAULT_PERMISSIONS[selectedRole]);
    }
  }, [selectedRole, useCustomPermissions]);

  const handleSubmit = async (values: UserFormValues) => {
    await onSubmit({
      ...values,
      permissions,
    });
  };

  const updatePermission = (section: keyof Permission, key: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            {user ? "Editar Usuário" : "Adicionar Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Atualize as informações do usuário e suas permissões"
              : "Preencha os dados do novo usuário. Se não customizar as permissões, serão usadas as padrão do perfil selecionado."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic" data-testid="tab-basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="permissions" data-testid="tab-permissions">Permissões</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="João" data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Silva" data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="joao.silva@exercito.mil.br" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomeGuerra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Guerra</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Silva" data-testid="input-nomeGuerra" />
                        </FormControl>
                        <FormDescription>Apelido militar</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postoGraduacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posto/Graduação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-postoGraduacao">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RANKS.map((rank) => (
                              <SelectItem key={rank} value={rank} data-testid={`rank-${rank}`}>
                                {rank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perfil de Acesso *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user" data-testid="role-user">Usuário</SelectItem>
                          <SelectItem value="manager" data-testid="role-manager">Gerente</SelectItem>
                          <SelectItem value="administrator" data-testid="role-administrator">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define as permissões padrão. Você pode customizar na aba "Permissões".
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="custom-permissions"
                    checked={useCustomPermissions}
                    onCheckedChange={(checked) => {
                      setUseCustomPermissions(checked as boolean);
                      if (!checked) {
                        setPermissions(DEFAULT_PERMISSIONS[selectedRole]);
                      }
                    }}
                    data-testid="checkbox-custom-permissions"
                  />
                  <Label htmlFor="custom-permissions" className="cursor-pointer">
                    Customizar permissões (caso contrário, usar padrão do perfil)
                  </Label>
                </div>

                {useCustomPermissions && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Dashboard</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="dashboard-view"
                            checked={permissions.dashboard?.view || false}
                            onCheckedChange={(checked) => updatePermission("dashboard", "view", checked as boolean)}
                            data-testid="perm-dashboard-view"
                          />
                          <Label htmlFor="dashboard-view" className="cursor-pointer font-normal">Visualizar</Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Militares</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="militares-view"
                            checked={permissions.militares?.view || false}
                            onCheckedChange={(checked) => updatePermission("militares", "view", checked as boolean)}
                            data-testid="perm-militares-view"
                          />
                          <Label htmlFor="militares-view" className="cursor-pointer font-normal">Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="militares-edit"
                            checked={permissions.militares?.edit || false}
                            onCheckedChange={(checked) => updatePermission("militares", "edit", checked as boolean)}
                            data-testid="perm-militares-edit"
                          />
                          <Label htmlFor="militares-edit" className="cursor-pointer font-normal">Editar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="militares-create"
                            checked={permissions.militares?.create || false}
                            onCheckedChange={(checked) => updatePermission("militares", "create", checked as boolean)}
                            data-testid="perm-militares-create"
                          />
                          <Label htmlFor="militares-create" className="cursor-pointer font-normal">Criar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="militares-delete"
                            checked={permissions.militares?.delete || false}
                            onCheckedChange={(checked) => updatePermission("militares", "delete", checked as boolean)}
                            data-testid="perm-militares-delete"
                          />
                          <Label htmlFor="militares-delete" className="cursor-pointer font-normal">Excluir</Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Companhias</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="companhias-view"
                            checked={permissions.companhias?.view || false}
                            onCheckedChange={(checked) => updatePermission("companhias", "view", checked as boolean)}
                            data-testid="perm-companhias-view"
                          />
                          <Label htmlFor="companhias-view" className="cursor-pointer font-normal">Visualizar</Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Relatórios</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="relatorios-view"
                            checked={permissions.relatorios?.view || false}
                            onCheckedChange={(checked) => updatePermission("relatorios", "view", checked as boolean)}
                            data-testid="perm-relatorios-view"
                          />
                          <Label htmlFor="relatorios-view" className="cursor-pointer font-normal">Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="relatorios-export"
                            checked={permissions.relatorios?.export || false}
                            onCheckedChange={(checked) => updatePermission("relatorios", "export", checked as boolean)}
                            data-testid="perm-relatorios-export"
                          />
                          <Label htmlFor="relatorios-export" className="cursor-pointer font-normal">Exportar (Excel/PDF)</Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Usuários</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="usuarios-view"
                            checked={permissions.usuarios?.view || false}
                            onCheckedChange={(checked) => updatePermission("usuarios", "view", checked as boolean)}
                            data-testid="perm-usuarios-view"
                          />
                          <Label htmlFor="usuarios-view" className="cursor-pointer font-normal">Visualizar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="usuarios-manage"
                            checked={permissions.usuarios?.manage || false}
                            onCheckedChange={(checked) => updatePermission("usuarios", "manage", checked as boolean)}
                            data-testid="perm-usuarios-manage"
                          />
                          <Label htmlFor="usuarios-manage" className="cursor-pointer font-normal">Gerenciar (criar/editar/excluir)</Label>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Importar</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="importar-import"
                            checked={permissions.importar?.import || false}
                            onCheckedChange={(checked) => updatePermission("importar", "import", checked as boolean)}
                            data-testid="perm-importar-import"
                          />
                          <Label htmlFor="importar-import" className="cursor-pointer font-normal">Importar dados da planilha</Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {!useCustomPermissions && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Permissões Padrão: {selectedRole === "user" ? "Usuário" : selectedRole === "manager" ? "Gerente" : "Administrador"}</CardTitle>
                      <CardDescription>
                        Marque a opção acima para customizar permissões específicas
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Salvando..." : user ? "Atualizar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
