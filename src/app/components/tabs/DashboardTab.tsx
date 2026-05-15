import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Trash2,
} from "lucide-react";

import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { toast } from "sonner";

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

const mesesNomes = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

function formatCurrency(value = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatMonth(month: string) {
  const [year, monthNum] = month.split("-");
  const date = new Date(Number(year), Number(monthNum) - 1);
  const formatted = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getCurrentMonth() {
  return new Date().toISOString().substring(0, 7);
}

export function DashboardTab() {
  const { mesSelecionado, setMesSelecionado } = useMes();

  const [data, setData] = useState<DashboardData | null>(null);
  const [mesesResumo, setMesesResumo] = useState<MesResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(getCurrentMonth());

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    loadDashboard();
    loadMesesResumo();
  }, [mesSelecionado]);

  useEffect(() => {
    const interval = setInterval(() => {
      const novoMes = getCurrentMonth();
      setMesAtual((prev) => (prev !== novoMes ? novoMes : prev));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      const response = await api.dashboard.get(mesSelecionado);
      setData(response.data as DashboardData);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMesesResumo() {
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        const mes = `${anoAtual}-${String(i + 1).padStart(2, "0")}`;

        return api.dashboard.get(mes).catch(() => ({
          data: {
            total_renda: 0,
            total_gastos: 0,
            valor_guardado_mensal: 0,
            saldo: 0,
          },
        }));
      });

      const responses = await Promise.all(promises);

      const meses = responses.map((response, i) => {
        const dados = response.data as DashboardData;

        return {
          mes: `${anoAtual}-${String(i + 1).padStart(2, "0")}`,
          mesNome: mesesNomes[i],
          renda: dados?.total_renda || 0,
          gastos: dados?.total_gastos || 0,
          poupanca: dados?.valor_guardado_mensal || 0,
          saldo: dados?.saldo || 0,
        };
      });

      setMesesResumo(meses);
    } catch (error) {
      console.error("Erro ao carregar meses:", error);
    }
  }

  function handleMesClick(mes: string) {
    setMesSelecionado(mes);
  }

  async function handleDebugDividas() {
    try {
      const response = await api.debugDividasPessoas();
      const debug = response.data as any;

      console.log("🔍 DEBUG - Pessoas:", debug.pessoas);
      console.log("🔍 DEBUG - Dívidas:", debug.dividas);
      console.log("🔍 DEBUG - Total de dívidas órfãs:", debug.dividas_orfas);

      toast.info("Debug executado!", {
        description: `${debug.total_pessoas} pessoas, ${debug.total_dividas} dívidas (${debug.dividas_orfas} órfãs). Veja o console para detalhes.`,
      });
    } catch (error) {
      toast.error("Erro ao executar debug");
      console.error(error);
    }
  }

  async function handleLimparDadosOrfaos() {
    try {
      // Primeiro executar debug
      await handleDebugDividas();

      // Depois executar limpeza
      const response = await api.limparDadosOrfaos();
      const removidos = (response.data as any)?.removidos;

      toast.success("Limpeza concluída!", {
        description: `Removidos: ${removidos?.parcelas || 0} parcelas, ${removidos?.compras || 0} compras, ${removidos?.dividas || 0} dívidas, ${removidos?.gastos_gerais || 0} gastos gerais, ${removidos?.movimentacoes_caixinha || 0} movimentações`,
      });

      // Recarregar dashboard
      loadDashboard();
      loadMesesResumo();
    } catch (error) {
      toast.error("Erro ao limpar dados");
      console.error(error);
    }
  }

  const progressoMeta = useMemo(() => {
    const poupanca = data?.valor_guardado_mensal || 0;
    const meta = data?.meta_guardado_mensal || 0;

    if (!meta) return 0;
    return Math.min((poupanca / meta) * 100, 100);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const mesAtualInfo = mesSelecionado === mesAtual;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">
            {formatMonth(mesSelecionado)}
          </h2>
          {mesAtualInfo && (
            <span className="text-sm font-medium text-blue-500">
              Mês atual
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLimparDadosOrfaos}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Limpar Dados
        </Button>
      </div>

      {/* Cards principais - Design original */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card Total de Rendas */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Rendas
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(data?.total_renda)}
            </div>
          </CardContent>
        </Card>

        {/* Card Total de Gastos */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Gastos
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-rose-500">
              {formatCurrency(data?.total_gastos)}
            </div>
          </CardContent>
        </Card>

        {/* Card Poupança do Mês */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Poupança do Mês
            </CardTitle>
            <PiggyBank className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-violet-600">
              {formatCurrency(data?.valor_guardado_mensal)}
            </div>
            {(data?.meta_guardado_mensal || 0) > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Meta: {formatCurrency(data?.meta_guardado_mensal)}</span>
                  <span>{Math.round(progressoMeta)}%</span>
                </div>
                <Progress 
                  value={progressoMeta} 
                  className="mt-1 h-2 [&>div]:bg-emerald-500" 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Saldo */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo
            </CardTitle>
            <Wallet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data?.saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meses do Ano - Overview Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Meses do Ano</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {mesesResumo.map((mes) => {
            const isSelected = mes.mes === mesSelecionado;
            const isMesAtual = mes.mes === mesAtual;
            const saldoPositivo = mes.saldo >= 0;

            return (
              <button
                key={mes.mes}
                onClick={() => handleMesClick(mes.mes)}
                className={`relative flex flex-col items-start rounded-xl bg-card p-4 text-left transition-all ${
                  isSelected
                    ? "border border-border/30 shadow-xl shadow-primary/20"
                    : "border border-border/30 hover:shadow-md"
                }`}
              >
                {/* Header com mes e badge */}
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {mes.mesNome}
                  </span>
                  {isMesAtual && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Atual
                    </span>
                  )}
                </div>

                {/* Informações financeiras */}
                <div className="mt-3 flex w-full flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Renda</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(mes.renda)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gastos</span>
                    <span className="text-sm font-semibold text-rose-500">
                      {formatCurrency(mes.gastos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Poupança</span>
                    <span className="text-sm font-semibold text-violet-600">
                      {formatCurrency(mes.poupanca)}
                    </span>
                  </div>
                </div>

                {/* Separador e Saldo */}
                <div className="mt-2 w-full border-t border-border pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Saldo</span>
                    <span
                      className={`text-sm font-bold ${
                        saldoPositivo ? "text-emerald-600" : "text-rose-600"
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
      </div>
    </div>
  );
}
