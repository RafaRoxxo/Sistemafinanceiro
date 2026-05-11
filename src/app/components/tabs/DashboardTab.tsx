import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ChevronRight } from "lucide-react";

interface DashboardData {
  mes_referencia: string;
  total_renda: number;
  total_gastos: number;
  saldo: number;
  valor_guardado_mensal: number;
  meta_guardado_mensal: number;
  total_guardado: number;
  gastos_por_cartao: Record<string, number>;
}

interface MesResumo {
  mes: string;
  mesNome: string;
  renda: number;
  gastos: number;
  poupanca: number;
  saldo: number;
}

export function DashboardTab() {
  const { mesSelecionado, setMesSelecionado } = useMes();
  const [data, setData] = useState<DashboardData | null>(null);
  const [mesesResumo, setMesesResumo] = useState<MesResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date().toISOString().substring(0, 7));

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    loadDashboard(mesSelecionado);
    loadMesesResumo();
  }, [mesSelecionado]);

  useEffect(() => {
    // Verifica a cada minuto se o mês mudou
    const interval = setInterval(() => {
      const novoMes = new Date().toISOString().substring(0, 7);
      if (novoMes !== mesAtual) {
        setMesAtual(novoMes);
      }
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [mesAtual]);

  const loadDashboard = async (mes: string) => {
    try {
      const response = await api.dashboard.get(mes);
      setData(response.data as DashboardData);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMesesResumo = async () => {
    const meses = [];
    const mesesNomes = [
      "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
      "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
    ];

    for (let i = 0; i < 12; i++) {
      const mes = `${anoAtual}-${String(i + 1).padStart(2, "0")}`;
      try {
        const response = await api.dashboard.get(mes);
        const dados = response.data as DashboardData;

        meses.push({
          mes,
          mesNome: mesesNomes[i],
          renda: dados.total_renda || 0,
          gastos: dados.total_gastos || 0,
          poupanca: dados.valor_guardado_mensal || 0,
          saldo: dados.saldo || 0,
        });
      } catch (error) {
        meses.push({
          mes,
          mesNome: mesesNomes[i],
          renda: 0,
          gastos: 0,
          poupanca: 0,
          saldo: 0,
        });
      }
    }

    setMesesResumo(meses);
  };

  const handleMesClick = (mes: string) => {
    setMesSelecionado(mes);
    loadDashboard(mes);
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
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const mesAtualInfo = mesSelecionado === mesAtual;
  const mesSelecionadoAnterior = mesSelecionado < mesAtual;
  const mesSelecionadoPosterior = mesSelecionado > mesAtual;

  return (
    <div className="space-y-6">
      {/* Header com mês selecionado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {formatMonth(mesSelecionado)}
          </h2>
          {mesAtualInfo && (
            <p className="text-sm text-blue-600 font-medium mt-1">Mês atual</p>
          )}
          {mesSelecionadoAnterior && (
            <p className="text-sm text-gray-500 mt-1">Visualizando mês anterior</p>
          )}
          {mesSelecionadoPosterior && (
            <p className="text-sm text-gray-500 mt-1">Visualizando mês seguinte</p>
          )}
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Rendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.total_renda || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.total_gastos || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Poupança do Mês</CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data?.valor_guardado_mensal || 0)}
            </div>
            {data?.meta_guardado_mensal > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Meta: {formatCurrency(data.meta_guardado_mensal)}</span>
                  <span>{Math.round((data.valor_guardado_mensal / data.meta_guardado_mensal) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      (data.valor_guardado_mensal / data.meta_guardado_mensal) * 100 >= 100
                        ? "bg-green-600"
                        : "bg-purple-600"
                    }`}
                    style={{
                      width: `${Math.min((data.valor_guardado_mensal / data.meta_guardado_mensal) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (data?.saldo || 0) >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatCurrency(data?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meses do Ano */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Meses de {anoAtual}</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Rendas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Gastos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">Poupança</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mesesResumo.map((mes) => {
              const isMesAtual = mes.mes === mesAtual;
              const isSelecionado = mes.mes === mesSelecionado;

              return (
                <button
                  key={mes.mes}
                  onClick={() => handleMesClick(mes.mes)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    isSelecionado
                      ? "border-blue-500 bg-blue-50"
                      : isMesAtual
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`font-bold text-sm ${
                        isSelecionado || isMesAtual ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      {mes.mesNome}
                    </span>
                    {isMesAtual && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Atual
                      </span>
                    )}
                    <ChevronRight
                      className={`h-4 w-4 ${
                        isSelecionado ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Renda:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(mes.renda)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gastos:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(mes.gastos)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Poupança:</span>
                      <span className="font-semibold text-purple-600">
                        {formatCurrency(mes.poupanca)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Saldo:</span>
                      <span
                        className={`font-bold ${
                          mes.saldo >= 0 ? "text-blue-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(mes.saldo)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gastos por Cartão */}
      {data && Object.keys(data.gastos_por_cartao).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Cartão - {formatMonth(mesSelecionado)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.gastos_por_cartao).map(([cartao, valor]) => (
                <div key={cartao} className="flex justify-between items-center">
                  <span className="font-medium">{cartao}</span>
                  <span className="text-lg font-semibold">{formatCurrency(valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
