import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BarChart3, Lock, Shield } from "lucide-react";
import logoUrl from "@assets/LOGO 7º BIS_1761200936316.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="7º BIS" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground">SIGE-MIL Sistema Integrado de Gestão do Efetivo Militar</h1>
              <p className="text-sm text-muted-foreground">Exército Brasileiro - C Fron Roraima/ 7º BIS</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = "/api/login"}
            size="default"
            data-testid="button-login"
          >
            Entrar no Sistema
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Controle Completo do Efetivo Militar
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Sistema profissional de gestão e controle quantitativo e qualitativo de militares 
            com dashboards, relatórios e controle de acesso multinível.
          </p>
          <Button
            onClick={() => window.location.href = "/api/login"}
            size="lg"
            className="text-base px-8"
            data-testid="button-login-main"
          >
            Acessar com Google
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="hover-elevate">
            <CardContent className="p-6">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gestão de Militares</h3>
              <p className="text-sm text-muted-foreground">
                CRUD completo com dados detalhados de cada militar: posto, função, companhia, situação e missão.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dashboards Interativos</h3>
              <p className="text-sm text-muted-foreground">
                Estatísticas em tempo real por companhia, posto/graduação e situação operacional.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <Lock className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Controle de Acesso</h3>
              <p className="text-sm text-muted-foreground">
                Três níveis de permissão: Usuário (visualização), Gerente (edição limitada) e Administrador (controle total).
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Segurança</h3>
              <p className="text-sm text-muted-foreground">
                Autenticação segura via Google e registro de auditoria de todas as operações.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>SIGE-MIL - Sistema Integrado de Gestão do Efetivo Militar © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
