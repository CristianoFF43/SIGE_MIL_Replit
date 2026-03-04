import { useState, useEffect, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKS, DEFAULT_PERMISSIONS, type AccessMeta, type MilitaryPersonnel, type Permission, type User } from "@shared/schema";
import { getAccessMeta, normalizeAccessValue, withAccessMeta } from "@shared/accessControl";

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
  canManageGlobalScope?: boolean;
  forcedCompany?: string | null;
  militaryOptions?: MilitaryPersonnel[];
  existingUsers?: User[];
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isPending = false,
  canManageGlobalScope = false,
  forcedCompany = null,
  militaryOptions = [],
  existingUsers = [],
}: UserDialogProps) {
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [militaryPickerOpen, setMilitaryPickerOpen] = useState(false);
  const [permissions, setPermissions] = useState<Permission>(DEFAULT_PERMISSIONS.user);
  const [accessMeta, setAccessMeta] = useState<AccessMeta>({
    assignedCompany: null,
    assignedSection: null,
    localRole: null,
    linkedMilitaryId: null,
    linkedMilitaryCpf: null,
    linkedMilitaryIdentity: null,
    linkedMilitaryEmail: null,
    linkedMilitaryName: null,
    linkedMilitaryRank: null,
  });

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
  const selectedMilitary = useMemo(
    () => militaryOptions.find((military) => military.id === accessMeta.linkedMilitaryId) || null,
    [militaryOptions, accessMeta.linkedMilitaryId],
  );

  const visibleMilitaryOptions = useMemo(() => {
    return militaryOptions
      .filter((military) => !forcedCompany || military.companhia === forcedCompany)
      .filter((military) => {
        return !existingUsers.some((existingUser) => {
          if (existingUser.id === user?.id) {
            return false;
          }

          const existingMeta = getAccessMeta(existingUser.permissions as Permission | null | undefined);
          return existingMeta.linkedMilitaryId === military.id;
        });
      })
      .sort((left, right) => {
        if (left.companhia !== right.companhia) {
          return left.companhia.localeCompare(right.companhia, "pt-BR");
        }
        return left.nomeCompleto.localeCompare(right.nomeCompleto, "pt-BR");
      });
  }, [existingUsers, forcedCompany, militaryOptions, user?.id]);

  const derivedCompany = selectedMilitary?.companhia || accessMeta.assignedCompany || null;
  const derivedSection = selectedMilitary?.secaoFracao || accessMeta.assignedSection || null;
  const linkIsLegacy = !accessMeta.linkedMilitaryId && (!!accessMeta.assignedCompany || !!accessMeta.assignedSection);

  // Update form when user prop changes
  useEffect(() => {
    if (user) {
      const meta = getAccessMeta(user.permissions as Permission | null | undefined);
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
        setUseCustomPermissions(canManageGlobalScope);
      } else {
        setPermissions(DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.user);
        setUseCustomPermissions(false);
      }
      setAccessMeta({
        assignedCompany: meta.assignedCompany || forcedCompany || null,
        assignedSection: meta.assignedSection || null,
        localRole: meta.localRole || (meta.assignedCompany ? "user" : null),
        linkedMilitaryId: meta.linkedMilitaryId || null,
        linkedMilitaryCpf: meta.linkedMilitaryCpf || null,
        linkedMilitaryIdentity: meta.linkedMilitaryIdentity || null,
        linkedMilitaryEmail: meta.linkedMilitaryEmail || null,
        linkedMilitaryName: meta.linkedMilitaryName || null,
        linkedMilitaryRank: meta.linkedMilitaryRank || null,
      });
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
      setAccessMeta({
        assignedCompany: null,
        assignedSection: null,
        localRole: null,
        linkedMilitaryId: null,
        linkedMilitaryCpf: null,
        linkedMilitaryIdentity: null,
        linkedMilitaryEmail: null,
        linkedMilitaryName: null,
        linkedMilitaryRank: null,
      });
    }
  }, [user, form, canManageGlobalScope, forcedCompany]);

  // Update permissions when role changes and not using custom permissions
  useEffect(() => {
    if (!useCustomPermissions || !canManageGlobalScope) {
      setPermissions(DEFAULT_PERMISSIONS[selectedRole]);
    }
  }, [selectedRole, useCustomPermissions, canManageGlobalScope]);

  const handleSubmit = async (values: UserFormValues) => {
    const normalizedMeta: AccessMeta = {
      assignedCompany: derivedCompany,
      assignedSection: derivedSection,
      localRole: (accessMeta.localRole || null) as AccessMeta["localRole"],
      linkedMilitaryId: accessMeta.linkedMilitaryId || null,
      linkedMilitaryCpf: selectedMilitary?.cpf || accessMeta.linkedMilitaryCpf || null,
      linkedMilitaryIdentity: selectedMilitary?.identidade || accessMeta.linkedMilitaryIdentity || null,
      linkedMilitaryEmail: selectedMilitary?.email || accessMeta.linkedMilitaryEmail || null,
      linkedMilitaryName: selectedMilitary?.nomeCompleto || accessMeta.linkedMilitaryName || null,
      linkedMilitaryRank: selectedMilitary?.postoGraduacao || accessMeta.linkedMilitaryRank || null,
    };

    await onSubmit({
      ...values,
      role: canManageGlobalScope ? values.role : "user",
      permissions: withAccessMeta(permissions, normalizedMeta),
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

  const updateAccessMeta = (key: keyof AccessMeta, value: string | null) => {
    setAccessMeta((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleLinkedMilitaryChange = (militaryId: number | null) => {
    const military = militaryOptions.find((option) => option.id === militaryId) || null;

    setAccessMeta((prev) => {
      if (!military) {
        return {
          ...prev,
          assignedCompany: null,
          assignedSection: null,
          localRole: null,
          linkedMilitaryId: null,
          linkedMilitaryCpf: null,
          linkedMilitaryIdentity: null,
          linkedMilitaryEmail: null,
          linkedMilitaryName: null,
          linkedMilitaryRank: null,
        };
      }

      return {
        ...prev,
        assignedCompany: military.companhia || null,
        assignedSection: military.secaoFracao || null,
        localRole: prev.localRole || "user",
        linkedMilitaryId: military.id,
        linkedMilitaryCpf: military.cpf || null,
        linkedMilitaryIdentity: military.identidade || null,
        linkedMilitaryEmail: military.email || null,
        linkedMilitaryName: military.nomeCompleto || null,
        linkedMilitaryRank: military.postoGraduacao || null,
      };
    });
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!canManageGlobalScope}>
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
                        {canManageGlobalScope
                          ? "Define o papel global do usuário. Apenas militares do S1 devem receber gerente/administrador global."
                          : "Escopo global bloqueado. Este usuário será mantido como usuário global e terá apenas escopo local."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {canManageGlobalScope && selectedRole !== "user" && (
                  <p
                    className={cn(
                      "text-sm",
                      accessMeta.linkedMilitaryId && normalizeAccessValue(derivedSection) === "S1"
                        ? "text-emerald-600"
                        : "text-amber-600",
                    )}
                  >
                    {accessMeta.linkedMilitaryId && normalizeAccessValue(derivedSection) === "S1"
                      ? "O militar vinculado pertence ao S1 e pode receber perfil global elevado."
                      : "Perfis globais de gerente/administrador exigem militar vinculado ao S1."}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Escopo Local por Companhia</CardTitle>
                    <CardDescription>
                      Vincule o usuário a um militar. Companhia e SEÇ/FRAÇÃO passam a ser sincronizadas automaticamente a partir desse militar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Militar Vinculado</Label>
                      <Popover open={militaryPickerOpen} onOpenChange={setMilitaryPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            data-testid="button-linked-military"
                          >
                            <span className="truncate text-left font-normal">
                              {selectedMilitary
                                ? `${selectedMilitary.postoGraduacao} - ${selectedMilitary.nomeCompleto} (${selectedMilitary.companhia})`
                                : accessMeta.linkedMilitaryName
                                  ? `${accessMeta.linkedMilitaryRank || "-"} - ${accessMeta.linkedMilitaryName}`
                                  : "Selecione o militar para sincronizar o acesso"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[520px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nome, posto, companhia ou secao..." />
                            <CommandList>
                              <CommandEmpty>Nenhum militar disponivel.</CommandEmpty>
                              <CommandGroup className="max-h-72 overflow-auto">
                                {visibleMilitaryOptions.map((military) => (
                                  <CommandItem
                                    key={military.id}
                                    value={`${military.postoGraduacao} ${military.nomeCompleto} ${military.companhia} ${military.secaoFracao || ""}`}
                                    onSelect={() => {
                                      handleLinkedMilitaryChange(military.id);
                                      setMilitaryPickerOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        accessMeta.linkedMilitaryId === military.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{`${military.postoGraduacao} - ${military.nomeCompleto}`}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {`${military.companhia}${military.secaoFracao ? ` • ${military.secaoFracao}` : ""}`}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {forcedCompany
                            ? `A lista esta restrita a ${forcedCompany}.`
                            : "Somente um usuario pode ficar vinculado a cada militar."}
                        </span>
                        {accessMeta.linkedMilitaryId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 text-xs"
                            onClick={() => handleLinkedMilitaryChange(null)}
                            data-testid="button-clear-linked-military"
                          >
                            Remover vinculo
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nível Local</Label>
                      <Select
                        value={accessMeta.localRole || "none"}
                        onValueChange={(value) => updateAccessMeta("localRole", value === "none" ? null : value)}
                        disabled={!derivedCompany}
                      >
                        <SelectTrigger data-testid="select-local-role">
                          <SelectValue placeholder="Sem escopo local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem escopo local</SelectItem>
                          <SelectItem value="user">Usuário Local</SelectItem>
                          <SelectItem value="manager">Gerente Local</SelectItem>
                          <SelectItem value="administrator">Administrador Local</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Companhia Sincronizada</Label>
                      <Input
                        value={derivedCompany || ""}
                        readOnly
                        placeholder="Definida pelo militar vinculado"
                        data-testid="input-derived-company"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>SEÇ/FRAÇÃO Sincronizada</Label>
                      <Input
                        value={derivedSection || ""}
                        readOnly
                        placeholder="Definida pelo militar vinculado"
                        data-testid="input-derived-section"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Status do Vínculo</Label>
                      <Input
                        value={accessMeta.linkedMilitaryId ? "Sincronizacao automatica ativa" : linkIsLegacy ? "Escopo legado sem sincronizacao" : "Sem militar vinculado"}
                        readOnly
                        data-testid="input-link-status"
                      />
                    </div>
                    {linkIsLegacy && (
                      <p className="text-xs text-amber-600 md:col-span-2">
                        Este usuario ainda usa companhia/secao legadas. Vincule um militar para ativar a sincronizacao automatica.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground md:col-span-2">
                      Gerente e Administrador globais so podem ser atribuídos quando o militar vinculado pertence ao S1.
                    </p>
                  </CardContent>
                </Card>

                {canManageGlobalScope && (
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
                      Customizar permissões globais (caso contrário, usar padrão do perfil)
                    </Label>
                  </div>
                )}

                {canManageGlobalScope && useCustomPermissions && (
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

                {(!canManageGlobalScope || !useCustomPermissions) && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Permissões Globais Padrão: {selectedRole === "user" ? "Usuário" : selectedRole === "manager" ? "Gerente" : "Administrador"}</CardTitle>
                      <CardDescription>
                        {canManageGlobalScope
                          ? "Marque a opção acima para customizar permissões globais específicas."
                          : "Este formulário está limitado ao escopo local. As permissões globais permanecem no perfil de usuário."}
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
