import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle, signInWithEmail, registerWithEmail } from "@/lib/firebase";
import { Shield, Mail, Chrome, TestTube } from "lucide-react";
import logoUrl from "@assets/LOGO 7º BIS_1761200936316.png";
import { apiRequest } from "@/lib/queryClient";

const isTestMode = import.meta.env.VITE_TEST_MODE === 'true';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  async function handleGoogleSignIn() {
    console.log("[LOGIN] Iniciando login com Google...");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      console.log("[LOGIN] Login com Google bem-sucedido:", user.email);

      toast({
        title: "Login realizado",
        description: `Bem-vindo, ${user.displayName || user.email}!`,
      });

      // Força um recarregamento para garantir que o estado de autenticação seja atualizado
      setLocation("/");
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Falha ao fazer login com Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    console.log("[LOGIN] Iniciando login com email:", loginEmail);

    // Validação básica de email
    if (!loginEmail || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      toast({
        title: "Erro de validação",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    if (!loginPassword || loginPassword.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await signInWithEmail(loginEmail, loginPassword);
      console.log("[LOGIN] Login com email bem-sucedido:", user.email);

      toast({
        title: "Login realizado",
        description: `Bem-vindo, ${user.email}!`,
      });

      // Força um recarregamento para garantir que o estado de autenticação seja atualizado
      setLocation("/");
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    console.log("[LOGIN] Iniciando registro com email:", registerEmail);

    // Validação básica de email
    if (!registerEmail || !registerEmail.includes('@') || !registerEmail.includes('.')) {
      toast({
        title: "Erro de validação",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    if (!registerPassword || registerPassword.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await registerWithEmail(registerEmail, registerPassword);
      console.log("[LOGIN] Registro bem-sucedido:", user.email);

      toast({
        title: "Conta criada",
        description: `Bem-vindo, ${user.email}!`,
      });

      // Força um recarregamento para garantir que o estado de autenticação seja atualizado
      setLocation("/");
    } catch (error: any) {
      console.error("Erro no registro:", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Falha ao criar conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestLogin() {
    if (!isTestMode) return;

    setLoading(true);
    try {
      const testSecret = import.meta.env.VITE_TEST_AUTH_SECRET || 'test-secret-123';
      const sub = `test-user-${Date.now()}`;
      const email = `testuser${Date.now()}@test.com`;

      const response = await fetch('/api/test-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Auth-Secret': testSecret,
        },
        body: JSON.stringify({
          sub,
          email,
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
        }),
      });

      if (!response.ok) {
        throw new Error('Test login failed');
      }

      const data = await response.json();
      console.log('[TEST-LOGIN] Success:', data);

      toast({
        title: "Test Login",
        description: `Logged in as ${data.user.email}`,
      });

      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      console.error('[TEST-LOGIN] Error:', error);
      toast({
        title: "Test Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={logoUrl} alt="7º BIS" className="h-32 object-contain" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">SIGE-MIL 7º BIS</CardTitle>
            <CardDescription>
              Sistema de Gestão do Efetivo Militar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="google" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google" data-testid="tab-google">
                <Chrome className="h-4 w-4 mr-2" />
                Google
              </TabsTrigger>
              <TabsTrigger value="login" data-testid="tab-login">
                <Mail className="h-4 w-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                <Shield className="h-4 w-4 mr-2" />
                Criar Conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4">
              <div className="text-sm text-muted-foreground text-center mb-4">
                Entre com sua conta Google. Você poderá escolher qual email usar.
              </div>
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full"
                size="lg"
                data-testid="button-google-signin"
              >
                <Chrome className="h-5 w-5 mr-2" />
                {loading ? "Entrando..." : "Entrar com Google"}
              </Button>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    data-testid="input-login-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    data-testid="input-login-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  data-testid="button-email-login"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    data-testid="input-register-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-register-password"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm">Confirmar Senha</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-register-confirm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  data-testid="button-email-register"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {isTestMode && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground text-center mb-2">
                Test Mode Active
              </div>
              <Button
                onClick={handleTestLogin}
                disabled={loading}
                variant="outline"
                className="w-full"
                data-testid="button-test-login"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Login (Auto)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
