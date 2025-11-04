import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function BootstrapAdmin() {
  const { toast } = useToast();
  const [bootstrapped, setBootstrapped] = useState(false);

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/bootstrap/admin");
    },
    onSuccess: (data: any) => {
      setBootstrapped(true);
      toast({
        title: "Sucesso!",
        description: "Você foi promovido a administrador. Fazendo login novamente...",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    },
    onError: (error: Error) => {
      if (error.message.includes("403")) {
        toast({
          title: "Já existe um administrador",
          description: "O sistema já possui um administrador configurado.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao configurar administrador",
          variant: "destructive",
        });
      }
    },
  });

  if (bootstrapped) {
    return null;
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Configuração Inicial</CardTitle>
        </div>
        <CardDescription>
          Bem-vindo ao Sistema de Gestão de Efetivo Militar! Este sistema ainda não possui um administrador configurado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Como primeiro usuário a fazer login, você pode se tornar o administrador do sistema. 
          Isso lhe dará acesso completo para gerenciar outros usuários e suas permissões.
        </p>
        <Button 
          onClick={() => bootstrapMutation.mutate()}
          disabled={bootstrapMutation.isPending}
          data-testid="button-bootstrap-admin"
        >
          <Shield className="h-4 w-4 mr-2" />
          {bootstrapMutation.isPending ? "Configurando..." : "Tornar-me Administrador"}
        </Button>
      </CardContent>
    </Card>
  );
}
