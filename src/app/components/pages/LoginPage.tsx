import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { api } from "../../../lib/api";

interface LoginPageProps {
  onNavigateToRegister: () => void;
}

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [forgotPasswordDialogOpen, setForgotPasswordDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Verificar se há token de reset na URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("reset_token");
    if (token) {
      setResetToken(token);
      setResetPasswordDialogOpen(true);
      // Limpar URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !senha) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, senha);
      toast.success("Login realizado com sucesso");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login";

      if (message.includes("não encontrado")) {
        toast.error("Usuário não encontrado");
      } else if (message.includes("inválida")) {
        toast.error("Senha inválida");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast.error("Digite seu email");
      return;
    }

    setIsSendingEmail(true);
    try {
      await api.auth.forgotPassword(forgotPasswordEmail);
      toast.success("Se este email existir, você receberá instruções para redefinir sua senha");
      setForgotPasswordDialogOpen(false);
      setForgotPasswordEmail("");
    } catch (error) {
      console.error("Erro ao solicitar reset:", error);
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleResetPassword = async () => {
    if (!novaSenha || !confirmarNovaSenha) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (novaSenha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsResetting(true);
    try {
      await api.auth.resetPassword(resetToken, novaSenha);
      toast.success("Senha redefinida com sucesso! Faça login com sua nova senha");
      setResetPasswordDialogOpen(false);
      setResetToken("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      const message = error instanceof Error ? error.message : "Erro ao resetar senha";

      if (message.includes("expirado")) {
        toast.error("Link expirado. Solicite um novo reset de senha");
      } else if (message.includes("inválido")) {
        toast.error("Link inválido");
      } else {
        toast.error(message);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Bem-vindo</CardTitle>
          <CardDescription className="text-center text-sm">
            Entre na sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordDialogOpen(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal Esqueci Minha Senha */}
      <Dialog open={forgotPasswordDialogOpen} onOpenChange={setForgotPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <Input
                id="forgotEmail"
                type="email"
                placeholder="seu@email.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                disabled={isSendingEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setForgotPasswordDialogOpen(false);
                setForgotPasswordEmail("");
              }}
              disabled={isSendingEmail}
            >
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword} disabled={isSendingEmail}>
              {isSendingEmail ? "Enviando..." : "Enviar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Redefinir Senha */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenhaReset">Nova Senha</Label>
              <Input
                id="novaSenhaReset"
                type="password"
                placeholder="••••••••"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={isResetting}
              />
              <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmarNovaSenhaReset">Confirmar Nova Senha</Label>
              <Input
                id="confirmarNovaSenhaReset"
                type="password"
                placeholder="••••••••"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                disabled={isResetting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setResetToken("");
                setNovaSenha("");
                setConfirmarNovaSenha("");
              }}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
