import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useMes } from "../../contexts/MesContext";
import { DashboardTab } from "./tabs/DashboardTab";
import { RendasTab } from "./tabs/RendasTab";
import { GastosTab } from "./tabs/GastosTab";
import { GastosGeraisTab } from "./tabs/GastosGeraisTab";
import { DevedoresTab } from "./tabs/DevedoresTab";
import { GuardadoTab } from "./tabs/GuardadoTab";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { LogOut, Trash2, ChevronLeft, ChevronRight, Calendar, Key } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

type Tab = "dashboard" | "rendas" | "gastos" | "gastosGerais" | "devedores" | "guardado";

export function FinanceSystem() {
  const { user, logout, deleteAccount } = useAuth();
  const { mesSelecionado, setMesSelecionado } = useMes();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success("Conta deletada com sucesso");
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar conta");
      setIsDeleting(false);
    }
  };

  const handleMesAnterior = () => {
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const data = new Date(ano, mes - 1, 1);
    data.setMonth(data.getMonth() - 1);
    const novoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    setMesSelecionado(novoMes);
  };

  const handleMesProximo = () => {
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const data = new Date(ano, mes - 1, 1);
    data.setMonth(data.getMonth() + 1);
    const novoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    setMesSelecionado(novoMes);
  };

  const handleMesAtual = () => {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    setMesSelecionado(mesAtual);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const mesAtual = new Date().toISOString().substring(0, 7);
  const isMesAtual = mesSelecionado === mesAtual;

  const handleChangePasswordClick = () => {
    setChangePasswordDialogOpen(true);
  };

  const confirmChangePassword = async () => {
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.auth.changePassword(senhaAtual, novaSenha);
      toast.success("Senha alterada com sucesso");
      setChangePasswordDialogOpen(false);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      const message = error instanceof Error ? error.message : "Erro ao alterar senha";

      if (message.includes("incorreta")) {
        toast.error("Senha atual incorreta");
      } else {
        toast.error(message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "rendas", label: "Rendas" },
    { id: "gastos", label: "Cartões" },
    { id: "gastosGerais", label: "Gastos Gerais" },
    { id: "devedores", label: "Pessoas & Dívidas" },
    { id: "guardado", label: "Poupança" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema Financeiro</h1>
            <p className="text-sm text-gray-600">Olá, {user?.nome}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleChangePasswordClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <Key className="h-4 w-4 mr-2" />
              Trocar Senha
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deletando..." : "Deletar Conta"}
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Navegação de Mês */}
        <div className="max-w-7xl mx-auto px-4 py-3 bg-white border-t">
          <div className="flex items-center justify-between">
            <button
              onClick={handleMesAnterior}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-semibold text-gray-900">{formatMonth(mesSelecionado)}</span>
              {!isMesAtual && (
                <button
                  onClick={handleMesAtual}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Ir para mês atual
                </button>
              )}
            </div>

            <button
              onClick={handleMesProximo}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "rendas" && <RendasTab />}
        {activeTab === "gastos" && <GastosTab />}
        {activeTab === "gastosGerais" && <GastosGeraisTab />}
        {activeTab === "devedores" && <DevedoresTab />}
        {activeTab === "guardado" && <GuardadoTab />}
      </main>

      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                placeholder="••••••••"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input
                id="novaSenha"
                type="password"
                placeholder="••••••••"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={isChangingPassword}
              />
              <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</Label>
              <Input
                id="confirmarNovaSenha"
                type="password"
                placeholder="••••••••"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setSenhaAtual("");
                setNovaSenha("");
                setConfirmarNovaSenha("");
              }}
              disabled={isChangingPassword}
            >
              Cancelar
            </Button>
            <Button onClick={confirmChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar sua conta? Esta ação é irreversível e todos os seus dados serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAccount} disabled={isDeleting}>
              {isDeleting ? "Deletando..." : "Deletar Conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
