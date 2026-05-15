import React, { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { LogOut, Trash2, TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

interface DashboardData {
  mes_referencia: string;
  total_renda: number;
  total_gastos: number;
  saldo: number;
  valor_guardado_mensal: number;
  total_guardado: number;
  gastos_por_cartao: Record<string, number>;
}

export function DashboardPage() {
  const { user, logout, deleteAccount } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.dashboard.get();
      setData(response.data as DashboardData);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success("Conta deletada com sucesso");
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar conta");
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-lg text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
            <p className="text-gray-600 mt-1">
              Olá, {user?.nome} | {data && formatMonth(data.mes_referencia)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={logout}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md bg-red-600 text-white hover:bg-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deletando..." : "Deletar conta"}
            </button>
          </div>
        </div>

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Rendas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(data.total_renda)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(data.total_gastos)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      data.saldo >= 0 ? "text-blue-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(data.saldo)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Guardado</CardTitle>
                  <PiggyBank className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(data.total_guardado)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mensal: {formatCurrency(data.valor_guardado_mensal)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {Object.keys(data.gastos_por_cartao).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por Cartão</CardTitle>
                  <CardDescription>Distribuição de gastos entre seus cartões</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(data.gastos_por_cartao).map(([cartao, valor]) => (
                      <div key={cartao} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                          <span className="font-medium">{cartao}</span>
                        </div>
                        <span className="text-lg font-semibold">{formatCurrency(valor)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Próximos Passos</CardTitle>
                <CardDescription>Continue desenvolvendo seu sistema financeiro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">✅ Sistema de autenticação completo</p>
                <p className="text-sm">✅ Backend com todas as entidades configuradas</p>
                <p className="text-sm">✅ Dashboard com resumo financeiro</p>
                <p className="text-sm text-muted-foreground">
                  💡 Adicione formulários para criar rendas, gastos e cartões
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 Implemente visualizações com gráficos (recharts)
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 Crie páginas para gerenciar parcelas e dívidas
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
