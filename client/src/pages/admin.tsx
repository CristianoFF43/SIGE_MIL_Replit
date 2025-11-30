import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Settings, Upload, UserPlus, Pencil, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { User } from "@shared/schema";
import { UserDialog } from "@/components/UserDialog";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [file, setFile] = useState<File | null>(null);
  const [localFileName, setLocalFileName] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const canViewUsers = hasPermission("usuarios", "view");
  const canManageUsers = hasPermission("usuarios", "manage");
  const canImport = hasPermission("importar", "import");

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
    } else if (!authLoading && !canViewUsers) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, canViewUsers, toast]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && canViewUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso",
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
        description: "Falha ao atualizar permissões",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/import/google-sheets", {
        spreadsheetUrl,
        sheetName,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Importação concluída!",
        description: `${data.total} militares importados com sucesso. ${data.skipped} linhas ignoradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSpreadsheetUrl("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Apenas administradores podem importar dados",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro na importação",
        description: error.message || "Falha ao importar dados da planilha",
        variant: "destructive",
      });
    },
  });

  const importUploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um arquivo para upload');

      const formData = new FormData();
      formData.append('file', file);

      // Create a promise that rejects after 60 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('O upload excedeu o tempo limite (60s). Verifique sua conexão.')), 60000);
      });

      // Race between the upload and the timeout
      return await Promise.race([
        apiRequest("POST", "/api/import/upload", formData),
        timeoutPromise
      ]) as Response;
    },
    onSuccess: async (res: Response) => {
      const data = await res.json();
      toast({
        title: "Importação por upload concluída!",
        description: `${data.total} registros importados. ${data.skipped} linhas ignoradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setFile(null);
      // Reset input value to allow re-uploading same file if needed
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Apenas administradores podem importar dados. Verifique suas permissões.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao importar arquivo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const importLocalFileMutation = useMutation({
    mutationFn: async () => {
      if (!localFileName.trim()) throw new Error('Informe o nome do arquivo local');
      return await apiRequest("POST", "/api/import/local-file", { fileName: localFileName.trim() });
    },
    onSuccess: async (res: Response) => {
      const data = await res.json();
      toast({
        title: "Importação de arquivo local concluída!",
        description: `${data.total} registros importados. ${data.skipped} linhas ignoradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/militares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setLocalFileName("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Apenas administradores podem importar dados",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro na importação local",
        description: error.message || "Falha ao importar arquivo local",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário criado!",
        description: "Usuário criado com sucesso",
      });
      setUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atualizado!",
        description: "Dados atualizados com sucesso",
      });
      setUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário excluído!",
        description: "Usuário removido do sistema",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = async (data: any) => {
    if (selectedUser) {
      await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
    } else {
      await createUserMutation.mutateAsync(data);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página</p>
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    if (role === "administrator") return <Badge variant="default">Administrador</Badge>;
    if (role === "manager") return <Badge variant="secondary">Gerente</Badge>;
    return <Badge variant="outline">Usuário</Badge>;
  };

  const userStats = {
    total: users.length,
    administrators: users.filter((u) => u.role === "administrator").length,
    managers: users.filter((u) => u.role === "manager").length,
    users: users.filter((u) => u.role === "user").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Administração</h1>
        <p className="text-muted-foreground">Gerenciamento de usuários e importação de dados</p>
      </div>

      {canImport && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Importar Dados</CardTitle>
            </div>
            <CardDescription>
              Importe todos os 900+ militares via Google Sheets ou upload de arquivo CSV/XLSX.
              <strong className="text-destructive"> ATENÇÃO: Esta operação substitui TODOS os dados existentes.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="spreadsheet-url">URL ou ID da Planilha</Label>
                <Input
                  id="spreadsheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  data-testid="input-spreadsheet-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Nome da Aba (opcional)</Label>
                <Input
                  id="sheet-name"
                  placeholder="Sheet1"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  data-testid="input-sheet-name"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!spreadsheetUrl || importMutation.isPending}
                data-testid="button-import"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importMutation.isPending ? "Importando..." : "Importar via URL"}
              </Button>
              {importMutation.isPending && (
                <p className="text-sm text-muted-foreground flex items-center">
                  Isso pode levar alguns minutos para 900+ registros...
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Arquivo CSV/XLSX</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  data-testid="input-file-upload"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => importUploadMutation.mutate()}
                  disabled={!file || importUploadMutation.isPending}
                  data-testid="button-upload-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importUploadMutation.isPending ? "Importando..." : "Importar por Upload"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4">
              <div className="space-y-2">
                <Label htmlFor="local-file-name">Importar arquivo local (servidor)</Label>
                <Input
                  id="local-file-name"
                  placeholder="Ex.: 7º BIS_EFETIVO POR CIA E TOTAL_APLICATIVO.csv"
                  value={localFileName}
                  onChange={(e) => setLocalFileName(e.target.value)}
                  data-testid="input-local-file-name"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => importLocalFileMutation.mutate()}
                  disabled={!localFileName.trim() || importLocalFileMutation.isPending}
                  data-testid="button-local-file-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importLocalFileMutation.isPending ? "Importando..." : "Importar arquivo local"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageUsers && (
        <CustomFieldsManager />
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{userStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.administrators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.managers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.users}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuários do Sistema</CardTitle>
            {canManageUsers && (
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setUserDialogOpen(true);
                }}
                data-testid="button-add-user"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nome de Guerra</TableHead>
                <TableHead>Posto/Grad</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                {canManageUsers && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(`${user.firstName} ${user.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground font-mono">#{user.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.email || "-"}</TableCell>
                  <TableCell className="text-sm">{user.nomeGuerra || "-"}</TableCell>
                  <TableCell className="text-sm">{user.postoGraduacao || "-"}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  {canManageUsers && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          data-testid={`button-edit-${user.id}`}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                          data-testid={`button-delete-${user.id}`}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
          }
        }}
        user={selectedUser}
        onSubmit={handleUserSubmit}
        isPending={createUserMutation.isPending || updateUserMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
