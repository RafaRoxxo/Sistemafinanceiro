import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { Plus, PiggyBank, TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";

interface Movimentacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
}

interface GuardadoMensal {
  mes_referencia: string;
  meta_mensal: number;
  valor_guardado: number;
}

export function GuardadoTab() {
  const { mesSelecionado } = useMes();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [guardadoMensal, setGuardadoMensal] = useState<GuardadoMensal | null>(null);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [valorGuardadoMesAtual, setValorGuardadoMesAtual] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showMovForm, setShowMovForm] = useState(false);
  const [showMensalForm, setShowMensalForm] = useState(false);

  const [movFormData, setMovFormData] = useState({
    tipo: "entrada",
    valor: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
  });

  const [mensalFormData, setMensalFormData] = useState({
    meta_mensal: "",
  });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  const loadData = async () => {
    try {
      const [movsRes, mensalRes] = await Promise.all([
        api.guardado.listMovimentacoes(),
        api.guardado.getMensal(mesSelecionado),
      ]);

      const movs = movsRes.data as Movimentacao[];
      setMovimentacoes(movs);

      const mensal = mensalRes.data as GuardadoMensal | null;
      setGuardadoMensal(mensal);

      console.log("🔵 Guardado Mensal carregado:", {
        mes: mesSelecionado,
        meta_mensal: mensal?.meta_mensal || 0,
        valor_guardado: mensal?.valor_guardado || 0,
      });

      setMensalFormData({
        meta_mensal: mensal?.meta_mensal?.toString() || "",
      });

      // Calcular total de movimentações de todos os meses
      const totalMovs = movs
        .filter((mov) => mov !== null && mov !== undefined)
        .reduce((acc, mov) => {
          return acc + (mov.tipo === "entrada" ? mov.valor : -mov.valor);
        }, 0);

      // Calcular valor guardado do mês atual com base nas movimentações
      const movsMesAtual = movs.filter((mov) => {
        if (!mov.data) return false;
        const mesMovimentacao = mov.data.substring(0, 7);
        return mesMovimentacao === mesSelecionado;
      });

      const valorMesAtual = movsMesAtual.reduce((acc, mov) => {
        return acc + (mov.tipo === "entrada" ? mov.valor : -mov.valor);
      }, 0);

      setValorGuardadoMesAtual(valorMesAtual);

      const guardadosRes = await api.guardado.listMensal();
      const guardados = (guardadosRes.data as GuardadoMensal[]) || [];
      const totalMensais = guardados
        .filter((g) => g !== null && g !== undefined)
        .reduce((sum, g) => sum + (g.valor_guardado || 0), 0);

      setTotalGuardado(totalMovs + totalMensais);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!movFormData.valor || parseFloat(movFormData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      const tipoMov = movFormData.tipo;
      const valorMov = parseFloat(movFormData.valor);

      console.log(`🔵 Criando movimentação: ${tipoMov} de R$ ${valorMov}`);

      await api.guardado.createMovimentacao({
        tipo: tipoMov,
        valor: valorMov,
        descricao: movFormData.descricao,
        data: movFormData.data,
      });

      setMovFormData({
        tipo: "entrada",
        valor: "",
        descricao: "",
        data: new Date().toISOString().split("T")[0],
      });
      setShowMovForm(false);

      // Recarregar dados e aguardar
      console.log("🔄 Recarregando dados após movimentação...");
      await loadData();

      toast.success(`${tipoMov === "entrada" ? "Entrada" : "Saída"} de ${formatCurrency(valorMov)} registrada`);
    } catch (error) {
      console.error("Erro ao adicionar movimentação:", error);
      toast.error("Erro ao adicionar movimentação");
    }
  };

  const handleMensalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const meta = parseFloat(mensalFormData.meta_mensal) || 0;

      // Usar o valor já calculado no estado
      console.log(`🔵 Atualizando guardado mensal: Meta=${meta}, Valor Calculado=${valorGuardadoMesAtual}`);

      await api.guardado.updateMensal(mesSelecionado, {
        meta_mensal: meta,
        valor_guardado: valorGuardadoMesAtual,
      });

      setShowMensalForm(false);

      // Recarregar dados e aguardar
      console.log("🔄 Recarregando dados após atualização mensal...");
      await loadData();

      toast.success(`Meta definida: ${formatCurrency(meta)}. Valor poupado: ${formatCurrency(valorGuardadoMesAtual)}`);
    } catch (error) {
      console.error("Erro ao atualizar meta mensal:", error);
      toast.error("Erro ao atualizar meta mensal");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (mes: string) => {
    const [year, month] = mes.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const percentualMeta = (() => {
    if (!guardadoMensal || guardadoMensal.meta_mensal <= 0) return 0;
    const progresso = (valorGuardadoMesAtual / guardadoMensal.meta_mensal) * 100;
    console.log("📊 Cálculo do progresso:", {
      valor_guardado_calculado: valorGuardadoMesAtual,
      meta_mensal: guardadoMensal.meta_mensal,
      progresso: progresso.toFixed(1) + "%",
    });
    return progresso;
  })();

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Poupança</h2>
          <p className="text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMensalForm(!showMensalForm)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Definir Meta Mensal
          </button>
          <button
            onClick={() => setShowMovForm(!showMovForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Total Poupado Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-6 w-6 text-purple-600" />
              Total Poupado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalGuardado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalGuardado)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Saldo acumulado total
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Valor Poupado no Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Poupado em {formatMonth(mesSelecionado)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${valorGuardadoMesAtual >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(valorGuardadoMesAtual)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Economia deste mês
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Meta Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(guardadoMensal?.meta_mensal || 0)}
            </p>
            {guardadoMensal && guardadoMensal.meta_mensal > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso</span>
                  <span>{percentualMeta.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      percentualMeta >= 100 ? "bg-green-600" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!guardadoMensal || guardadoMensal.meta_mensal === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Nenhuma meta definida
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {showMensalForm && (
        <Card>
          <CardHeader>
            <CardTitle>Definir Meta - {formatMonth(mesSelecionado)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMensalSubmit} className="space-y-4">
              <div>
                <Label htmlFor="meta_mensal">Meta do Mês</Label>
                <Input
                  id="meta_mensal"
                  type="number"
                  step="0.01"
                  placeholder="Quanto quer poupar este mês"
                  value={mensalFormData.meta_mensal}
                  onChange={(e) => setMensalFormData({ meta_mensal: e.target.value })}
                />
                <p className="text-sm text-gray-600 mt-2">
                  💡 O valor poupado é calculado automaticamente com base nas suas movimentações de entrada e saída.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Salvar Meta</Button>
                <Button type="button" variant="outline" onClick={() => setShowMensalForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showMovForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Movimentação Avulsa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMovSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={movFormData.tipo}
                  onValueChange={(value) => setMovFormData({ ...movFormData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (Depositar)</SelectItem>
                    <SelectItem value="saida">Saída (Retirar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Salário, Emergência médica"
                  value={movFormData.descricao}
                  onChange={(e) => setMovFormData({ ...movFormData, descricao: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={movFormData.valor}
                    onChange={(e) => setMovFormData({ ...movFormData, valor: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={movFormData.data}
                    onChange={(e) => setMovFormData({ ...movFormData, data: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setShowMovForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {movimentacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações Avulsas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movimentacoes
                .filter((mov) => mov && mov.id)
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map((mov) => (
                  <div
                    key={mov.id}
                    className={`flex justify-between items-center p-3 rounded-md ${
                      mov.tipo === "entrada" ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {mov.tipo === "entrada" ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{mov.descricao || "Sem descrição"}</p>
                        <p className="text-sm text-gray-600">
                          {mov.data ? new Date(mov.data).toLocaleDateString("pt-BR") : "Data não definida"}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-lg font-semibold ${
                        mov.tipo === "entrada" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {mov.tipo === "entrada" ? "+" : "-"}
                      {formatCurrency(mov.valor || 0)}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
