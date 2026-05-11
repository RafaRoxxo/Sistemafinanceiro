import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  ChevronRight,
} from "lucide-react";

interface DashboardData {
  mes_referencia: string;
  total_renda: number;
  total_gastos: number;
  saldo: number;
  valor_guardado_mensal: number;
  meta_guardado_mensal: number;
  total_guardado: number;
  gastos_por_cartao: Record<
    string,
    number
  >;
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
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function formatMonth(month: string) {
  const [year, monthNum] =
    month.split("-");

  const date = new Date(
    Number(year),
    Number(monthNum) - 1
  );

  const formatted =
    date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
}

function getCurrentMonth() {
  return new Date()
    .toISOString()
    .substring(0, 7);
}

export function DashboardTab() {
  const {
    mesSelecionado,
    setMesSelecionado,
  } = useMes();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [mesesResumo, setMesesResumo] =
    useState<MesResumo[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [mesAtual, setMesAtual] =
    useState(getCurrentMonth());

  const anoAtual =
    new Date().getFullYear();

  useEffect(() => {
    loadDashboard();
    loadMesesResumo();
  }, [mesSelecionado]);

  useEffect(() => {
    const interval = setInterval(() => {
      const novoMes =
        getCurrentMonth();

      setMesAtual((prev) =>
        prev !== novoMes
          ? novoMes
          : prev
      );
    }, 60000);

    return () =>
      clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      setIsLoading(true);

      const response =
        await api.dashboard.get(
          mesSelecionado
        );

      setData(
        response.data as DashboardData
      );
    } catch (error) {
      console.error(
        "Erro ao carregar dashboard:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMesesResumo() {
    try {
      const promises = Array.from(
        { length: 12 },
        (_, i) => {
          const mes = `${anoAtual}-${String(
            i + 1
          ).padStart(2, "0")}`;

          return api.dashboard
            .get(mes)
            .catch(() => ({
              data: {
                total_renda: 0,
                total_gastos: 0,
                valor_guardado_mensal: 0,
                saldo: 0,
              },
            }));
        }
      );

      const responses =
        await Promise.all(promises);

      const meses =
        responses.map(
          (response, i) => ({
            mes: `${anoAtual}-${String(
              i + 1
            ).padStart(2, "0")}`,

            mesNome: mesesNomes[i],

            renda:
              response.data
                ?.total_renda || 0,

            gastos:
              response.data
                ?.total_gastos || 0,

            poupanca:
              response.data
                ?.valor_guardado_mensal ||
              0,

            saldo:
              response.data?.saldo || 0,
          })
        );

      setMesesResumo(meses);
    } catch (error) {
      console.error(
        "Erro ao carregar meses:",
        error
      );
    }
  }

  function handleMesClick(
    mes: string
  ) {
    setMesSelecionado(mes);
  }

  const progressoMeta = useMemo(() => {
    const poupanca =
      data?.valor_guardado_mensal || 0;

    const meta =
      data?.meta_guardado_mensal || 0;

    if (!meta) return 0;

    return Math.min(
      (poupanca / meta) * 100,
      100
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        Carregando...
      </div>
    );
  }

  const mesAtualInfo =
    mesSelecionado === mesAtual;

  const mesSelecionadoAnterior =
    mesSelecionado < mesAtual;

  const mesSelecionadoPosterior =
    mesSelecionado > mesAtual;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {formatMonth(
              mesSelecionado
            )}
          </h2>

          {mesAtualInfo && (
            <p className="text-xs sm:text-sm text-blue-600 font-medium mt-1">
              Mês atual
            </p>
          )}

          {mesSelecionadoAnterior && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Visualizando mês anterior
            </p>
          )}

          {mesSelecionadoPosterior && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Visualizando mês seguinte
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total de Rendas
            </CardTitle>

            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>

          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {formatCurrency(
                data?.total_renda
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total de Gastos
            </CardTitle>

            <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>

          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {formatCurrency(
                data?.total_gastos
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Poupança do Mês
            </CardTitle>

            <PiggyBank className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>

          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {formatCurrency(
                data?.valor_guardado_mensal
              )}
            </div>

            {(data?.meta_guardado_mensal ||
              0) > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>
                    Meta:{" "}
                    {formatCurrency(
                      data?.meta_guardado_mensal
                    )}
                  </span>

                  <span>
                    {Math.round(
                      progressoMeta
                    )}
                    %
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      progressoMeta >= 100
                        ? "bg-green-600"
                        : "bg-purple-600"
                    }`}
                    style={{
                      width: `${progressoMeta}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Saldo
            </CardTitle>

            <Wallet className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>

          <CardContent>
            <div
              className={`text-lg sm:text-2xl font-bold ${
                (data?.saldo || 0) >= 0
                  ? "text-blue-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(
                data?.saldo
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
