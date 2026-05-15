import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, PiggyBank, TrendingUp, TrendingDown, Target, Calendar, Edit, Trash2, ChevronLeft, Wallet, Car, Plane, Home, Heart, Gift, Sparkles, ShoppingBag, GraduationCap } from "lucide-react";

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

interface Caixinha {
  id: string;
  nome: string;
  meta: number;
  cor: string;
  icone: string;
  saldo: number;
}

interface MovimentacaoCaixinha {
  id: string;
  caixinha_id: string;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
}

const CORES_DISPONIVEIS = [
  { nome: "Azul", valor: "#3B82F6" },
  { nome: "Verde", valor: "#10B981" },
  { nome: "Roxo", valor: "#8B5CF6" },
  { nome: "Rosa", valor: "#EC4899" },
  { nome: "Laranja", valor: "#F97316" },
  { nome: "Vermelho", valor: "#EF4444" },
  { nome: "Amarelo", valor: "#EAB308" },
  { nome: "Ciano", valor: "#06B6D4" },
];

const ICONES_DISPONIVEIS = [
  { nome: "Porquinho", valor: "piggy-bank", icon: PiggyBank },
  { nome: "Carteira", valor: "wallet", icon: Wallet },
  { nome: "Carro", valor: "car", icon: Car },
  { nome: "Aviao", valor: "plane", icon: Plane },
  { nome: "Casa", valor: "home", icon: Home },
  { nome: "Coracao", valor: "heart", icon: Heart },
  { nome: "Presente", valor: "gift", icon: Gift },
  { nome: "Estrela", valor: "sparkles", icon: Sparkles },
  { nome: "Compras", valor: "shopping-bag", icon: ShoppingBag },
  { nome: "Educacao", valor: "graduation-cap", icon: GraduationCap },
];

const getIconeComponent = (icone: string) => {
  const iconConfig = ICONES_DISPONIVEIS.find((i) => i.valor === icone);
  return iconConfig?.icon || PiggyBank;
};

export function GuardadoTab() {
  const { mesSelecionado } = useMes();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [guardadoMensal, setGuardadoMensal] = useState<GuardadoMensal | null>(null);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [valorGuardadoMesAtual, setValorGuardadoMesAtual] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showMovForm, setShowMovForm] = useState(false);
  const [showMensalForm, setShowMensalForm] = useState(false);

  // Estados para caixinhas
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([]);
  const [showCaixinhaForm, setShowCaixinhaForm] = useState(false);
  const [editCaixinhaDialog, setEditCaixinhaDialog] = useState(false);
  const [deleteCaixinhaDialog, setDeleteCaixinhaDialog] = useState(false);
  const [caixinhaToEdit, setCaixinhaToEdit] = useState<Caixinha | null>(null);
  const [caixinhaToDelete, setCaixinhaToDelete] = useState<string | null>(null);
  const [selectedCaixinha, setSelectedCaixinha] = useState<Caixinha | null>(null);
  const [movimentacoesCaixinha, setMovimentacoesCaixinha] = useState<MovimentacaoCaixinha[]>([]);
  const [showMovCaixinhaForm, setShowMovCaixinhaForm] = useState(false);

  const [movFormData, setMovFormData] = useState({
    tipo: "entrada",
    valor: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
  });

  const [mensalFormData, setMensalFormData] = useState({
    meta_mensal: "",
  });

  const [caixinhaFormData, setCaixinhaFormData] = useState({
    nome: "",
    meta: "",
    cor: "#3B82F6",
    icone: "piggy-bank",
  });

  const [movCaixinhaFormData, setMovCaixinhaFormData] = useState({
    tipo: "entrada",
    valor: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  useEffect(() => {
    if (selectedCaixinha) {
      loadMovimentacoesCaixinha(selectedCaixinha.id);
    }
  }, [selectedCaixinha]);

  const loadData = async () => {
    try {
      const [movsRes, mensalRes, caixinhasRes] = await Promise.all([
        api.guardado.listMovimentacoes(),
        api.guardado.getMensal(mesSelecionado),
        api.caixinha.list(),
      ]);

      const movs = movsRes.data as Movimentacao[];
      setMovimentacoes(movs);

      const mensal = mensalRes.data as GuardadoMensal | null;
      setGuardadoMensal(mensal);

      setCaixinhas((caixinhasRes.data as Caixinha[]) || []);

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

      // Adicionar saldo das caixinhas ao total guardado
      const totalCaixinhas = ((caixinhasRes.data as Caixinha[]) || []).reduce(
        (sum, c) => sum + (c.saldo || 0),
        0
      );

      setTotalGuardado(totalMovs + totalMensais + totalCaixinhas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMovimentacoesCaixinha = async (caixinhaId: string) => {
    try {
      const res = await api.caixinha.listMovimentacoes(caixinhaId);
      setMovimentacoesCaixinha((res.data as MovimentacaoCaixinha[]) || []);
    } catch (error) {
      console.error("Erro ao carregar movimentacoes da caixinha:", error);
    }
  };

  const handleMovSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!movFormData.valor || parseFloat(movFormData.valor) <= 0) {
      toast.error("Valor invalido");
      return;
    }

    try {
      const tipoMov = movFormData.tipo;
      const valorMov = parseFloat(movFormData.valor);

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

      await loadData();

      toast.success(`${tipoMov === "entrada" ? "Entrada" : "Saida"} de ${formatCurrency(valorMov)} registrada`);
    } catch (error) {
      console.error("Erro ao adicionar movimentacao:", error);
      toast.error("Erro ao adicionar movimentacao");
    }
  };

  const handleMensalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const meta = parseFloat(mensalFormData.meta_mensal) || 0;

      await api.guardado.updateMensal(mesSelecionado, {
        meta_mensal: meta,
        valor_guardado: valorGuardadoMesAtual,
      });

      setShowMensalForm(false);

      await loadData();

      toast.success(`Meta definida: ${formatCurrency(meta)}`);
    } catch (error) {
      console.error("Erro ao atualizar meta mensal:", error);
      toast.error("Erro ao atualizar meta mensal");
    }
  };

  const handleCaixinhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!caixinhaFormData.nome.trim()) {
      toast.error("Nome da caixinha e obrigatorio");
      return;
    }

    try {
      await api.caixinha.create({
        nome: caixinhaFormData.nome,
        meta: parseFloat(caixinhaFormData.meta) || 0,
        cor: caixinhaFormData.cor,
        icone: caixinhaFormData.icone,
      });

      setCaixinhaFormData({
        nome: "",
        meta: "",
        cor: "#3B82F6",
        icone: "piggy-bank",
      });
      setShowCaixinhaForm(false);

      await loadData();

      toast.success("Caixinha criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar caixinha:", error);
      toast.error("Erro ao criar caixinha");
    }
  };

  const handleEditCaixinhaClick = (caixinha: Caixinha) => {
    setCaixinhaToEdit(caixinha);
    setCaixinhaFormData({
      nome: caixinha.nome,
      meta: caixinha.meta.toString(),
      cor: caixinha.cor,
      icone: caixinha.icone,
    });
    setEditCaixinhaDialog(true);
  };

  const handleEditCaixinhaSubmit = async () => {
    if (!caixinhaToEdit) return;

    if (!caixinhaFormData.nome.trim()) {
      toast.error("Nome da caixinha e obrigatorio");
      return;
    }

    try {
      await api.caixinha.update(caixinhaToEdit.id, {
        nome: caixinhaFormData.nome,
        meta: parseFloat(caixinhaFormData.meta) || 0,
        cor: caixinhaFormData.cor,
        icone: caixinhaFormData.icone,
      });

      setEditCaixinhaDialog(false);
      setCaixinhaToEdit(null);
      setCaixinhaFormData({
        nome: "",
        meta: "",
        cor: "#3B82F6",
        icone: "piggy-bank",
      });

      await loadData();

      toast.success("Caixinha atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar caixinha:", error);
      toast.error("Erro ao atualizar caixinha");
    }
  };

  const handleDeleteCaixinhaClick = (caixinhaId: string) => {
    setCaixinhaToDelete(caixinhaId);
    setDeleteCaixinhaDialog(true);
  };

  const confirmDeleteCaixinha = async () => {
    if (!caixinhaToDelete) return;

    try {
      await api.caixinha.delete(caixinhaToDelete);
      setDeleteCaixinhaDialog(false);
      setCaixinhaToDelete(null);
      await loadData();
      toast.success("Caixinha excluida!");
    } catch (error) {
      console.error("Erro ao excluir caixinha:", error);
      toast.error("Erro ao excluir caixinha");
    }
  };

  const handleMovCaixinhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaixinha) return;

    if (!movCaixinhaFormData.valor || parseFloat(movCaixinhaFormData.valor) <= 0) {
      toast.error("Valor invalido");
      return;
    }

    try {
      const tipoMov = movCaixinhaFormData.tipo;
      const valorMov = parseFloat(movCaixinhaFormData.valor);

      await api.caixinha.createMovimentacao({
        caixinha_id: selectedCaixinha.id,
        tipo: tipoMov,
        valor: valorMov,
        descricao: movCaixinhaFormData.descricao,
        data: movCaixinhaFormData.data,
      });

      setMovCaixinhaFormData({
        tipo: "entrada",
        valor: "",
        descricao: "",
        data: new Date().toISOString().split("T")[0],
      });
      setShowMovCaixinhaForm(false);

      await loadData();
      await loadMovimentacoesCaixinha(selectedCaixinha.id);
      
      // Atualizar o selectedCaixinha com o novo saldo
      const updatedCaixinhas = (await api.caixinha.list()).data as Caixinha[];
      const updatedCaixinha = updatedCaixinhas.find(c => c.id === selectedCaixinha.id);
      if (updatedCaixinha) {
        setSelectedCaixinha(updatedCaixinha);
      }

      toast.success(`${tipoMov === "entrada" ? "Deposito" : "Retirada"} de ${formatCurrency(valorMov)} registrada`);
    } catch (error) {
      console.error("Erro ao adicionar movimentacao:", error);
      toast.error("Erro ao adicionar movimentacao");
    }
  };

  const handleDeleteMovCaixinha = async (movId: string) => {
    if (!selectedCaixinha) return;

    try {
      await api.caixinha.deleteMovimentacao(selectedCaixinha.id, movId);
      await loadData();
      await loadMovimentacoesCaixinha(selectedCaixinha.id);
      
      // Atualizar o selectedCaixinha com o novo saldo
      const updatedCaixinhas = (await api.caixinha.list()).data as Caixinha[];
      const updatedCaixinha = updatedCaixinhas.find(c => c.id === selectedCaixinha.id);
      if (updatedCaixinha) {
        setSelectedCaixinha(updatedCaixinha);
      }

      toast.success("Movimentacao excluida!");
    } catch (error) {
      console.error("Erro ao excluir movimentacao:", error);
      toast.error("Erro ao excluir movimentacao");
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
    return progresso;
  })();

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  // Visualizacao detalhada de uma caixinha
  if (selectedCaixinha) {
    const IconComponent = getIconeComponent(selectedCaixinha.icone);
    const percentualCaixinha = selectedCaixinha.meta > 0 
      ? (selectedCaixinha.saldo / selectedCaixinha.meta) * 100 
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedCaixinha(null)}>
            <ChevronLeft className="h-5 w-5 mr-1" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: selectedCaixinha.cor }}
            >
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedCaixinha.nome}</h2>
              <p className="text-sm text-gray-500">
                Meta: {selectedCaixinha.meta > 0 ? formatCurrency(selectedCaixinha.meta) : "Sem meta definida"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-6 w-6" style={{ color: selectedCaixinha.cor }} />
                Saldo Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${selectedCaixinha.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(selectedCaixinha.saldo)}
              </p>
              {selectedCaixinha.meta > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progresso</span>
                    <span>{percentualCaixinha.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${Math.min(percentualCaixinha, 100)}%`,
                        backgroundColor: selectedCaixinha.cor
                      }}
                    />
                  </div>
                  {percentualCaixinha >= 100 && (
                    <p className="text-sm text-green-600 font-medium mt-2">Meta atingida!</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-600" />
                Falta para a Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCaixinha.meta > 0 ? (
                <>
                  <p className={`text-3xl font-bold ${selectedCaixinha.meta - selectedCaixinha.saldo <= 0 ? "text-green-600" : "text-blue-600"}`}>
                    {selectedCaixinha.meta - selectedCaixinha.saldo <= 0 
                      ? formatCurrency(0)
                      : formatCurrency(selectedCaixinha.meta - selectedCaixinha.saldo)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedCaixinha.meta - selectedCaixinha.saldo <= 0 
                      ? "Voce ja atingiu sua meta!"
                      : "Continue economizando!"}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Sem meta definida</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setShowMovCaixinhaForm(!showMovCaixinhaForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentacao
          </Button>
        </div>

        {showMovCaixinhaForm && (
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Movimentacao</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMovCaixinhaSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tipo_caixinha">Tipo</Label>
                  <Select
                    value={movCaixinhaFormData.tipo}
                    onValueChange={(value) => setMovCaixinhaFormData({ ...movCaixinhaFormData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Depositar</SelectItem>
                      <SelectItem value="saida">Retirar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descricao_caixinha">Descricao</Label>
                  <Input
                    id="descricao_caixinha"
                    type="text"
                    placeholder="Ex: Salario, Emergencia"
                    value={movCaixinhaFormData.descricao}
                    onChange={(e) => setMovCaixinhaFormData({ ...movCaixinhaFormData, descricao: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor_caixinha">Valor</Label>
                    <Input
                      id="valor_caixinha"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={movCaixinhaFormData.valor}
                      onChange={(e) => setMovCaixinhaFormData({ ...movCaixinhaFormData, valor: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_caixinha">Data</Label>
                    <Input
                      id="data_caixinha"
                      type="date"
                      value={movCaixinhaFormData.data}
                      onChange={(e) => setMovCaixinhaFormData({ ...movCaixinhaFormData, data: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Salvar</Button>
                  <Button type="button" variant="outline" onClick={() => setShowMovCaixinhaForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {movimentacoesCaixinha.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historico de Movimentacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movimentacoesCaixinha
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
                          <p className="font-medium">{mov.descricao || "Sem descricao"}</p>
                          <p className="text-sm text-gray-600">
                            {mov.data ? new Date(mov.data).toLocaleDateString("pt-BR") : "Data nao definida"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p
                          className={`text-lg font-semibold ${
                            mov.tipo === "entrada" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {mov.tipo === "entrada" ? "+" : "-"}
                          {formatCurrency(mov.valor || 0)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMovCaixinha(mov.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {movimentacoesCaixinha.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Nenhuma movimentacao nesta caixinha ainda.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Poupanca</h2>
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
            Nova Movimentacao
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
              Saldo acumulado total (incluindo caixinhas)
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Valor Poupado no Mes */}
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
              Economia deste mes (movimentacoes avulsas)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Meta Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              Meta do Mes
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
            {(!guardadoMensal || guardadoMensal.meta_mensal === 0) && (
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
                <Label htmlFor="meta_mensal">Meta do Mes</Label>
                <Input
                  id="meta_mensal"
                  type="number"
                  step="0.01"
                  placeholder="Quanto quer poupar este mes"
                  value={mensalFormData.meta_mensal}
                  onChange={(e) => setMensalFormData({ meta_mensal: e.target.value })}
                />
                <p className="text-sm text-gray-600 mt-2">
                  O valor poupado e calculado automaticamente com base nas suas movimentacoes de entrada e saida.
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
            <CardTitle>Adicionar Movimentacao Avulsa</CardTitle>
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
                    <SelectItem value="saida">Saida (Retirar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao">Descricao</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Salario, Emergencia medica"
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

      {/* Secao de Caixinhas */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-purple-600" />
            Minhas Caixinhas
          </h3>
          <Button onClick={() => setShowCaixinhaForm(!showCaixinhaForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Caixinha
          </Button>
        </div>

        {showCaixinhaForm && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Criar Nova Caixinha</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCaixinhaSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome_caixinha">Nome da Caixinha</Label>
                  <Input
                    id="nome_caixinha"
                    type="text"
                    placeholder="Ex: Viagem, Emergencia, Carro novo"
                    value={caixinhaFormData.nome}
                    onChange={(e) => setCaixinhaFormData({ ...caixinhaFormData, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="meta_caixinha">Meta (opcional)</Label>
                  <Input
                    id="meta_caixinha"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={caixinhaFormData.meta}
                    onChange={(e) => setCaixinhaFormData({ ...caixinhaFormData, meta: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CORES_DISPONIVEIS.map((cor) => (
                      <button
                        key={cor.valor}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          caixinhaFormData.cor === cor.valor ? "border-gray-800 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: cor.valor }}
                        onClick={() => setCaixinhaFormData({ ...caixinhaFormData, cor: cor.valor })}
                        title={cor.nome}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Icone</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ICONES_DISPONIVEIS.map((icone) => {
                      const Icon = icone.icon;
                      return (
                        <button
                          key={icone.valor}
                          type="button"
                          className={`p-2 rounded-md border-2 ${
                            caixinhaFormData.icone === icone.valor
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setCaixinhaFormData({ ...caixinhaFormData, icone: icone.valor })}
                          title={icone.nome}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Criar Caixinha</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCaixinhaForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {caixinhas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <PiggyBank className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Voce ainda nao tem nenhuma caixinha.</p>
              <p className="text-sm">Crie uma para comecar a guardar dinheiro para seus objetivos!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {caixinhas.map((caixinha) => {
              const IconComponent = getIconeComponent(caixinha.icone);
              const percentual = caixinha.meta > 0 ? (caixinha.saldo / caixinha.meta) * 100 : 0;

              return (
                <Card
                  key={caixinha.id}
                  className="cursor-pointer hover:shadow-md transition-shadow relative group"
                  onClick={() => setSelectedCaixinha(caixinha)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCaixinhaClick(caixinha);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCaixinhaClick(caixinha.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: caixinha.cor }}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg">{caixinha.nome}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${caixinha.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(caixinha.saldo)}
                    </p>
                    {caixinha.meta > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Meta: {formatCurrency(caixinha.meta)}</span>
                          <span>{percentual.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(percentual, 100)}%`,
                              backgroundColor: caixinha.cor,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {caixinha.meta === 0 && (
                      <p className="text-xs text-gray-500 mt-2">Sem meta definida</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historico de Movimentacoes Avulsas */}
      {movimentacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historico de Movimentacoes Avulsas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movimentacoes
                .filter((mov) => mov && mov.id)
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .slice(0, 10)
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
                        <p className="font-medium">{mov.descricao || "Sem descricao"}</p>
                        <p className="text-sm text-gray-600">
                          {mov.data ? new Date(mov.data).toLocaleDateString("pt-BR") : "Data nao definida"}
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

      {/* Dialog para editar caixinha */}
      <Dialog open={editCaixinhaDialog} onOpenChange={setEditCaixinhaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Caixinha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_nome_caixinha">Nome da Caixinha</Label>
              <Input
                id="edit_nome_caixinha"
                type="text"
                value={caixinhaFormData.nome}
                onChange={(e) => setCaixinhaFormData({ ...caixinhaFormData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_meta_caixinha">Meta (opcional)</Label>
              <Input
                id="edit_meta_caixinha"
                type="number"
                step="0.01"
                value={caixinhaFormData.meta}
                onChange={(e) => setCaixinhaFormData({ ...caixinhaFormData, meta: e.target.value })}
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button
                    key={cor.valor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      caixinhaFormData.cor === cor.valor ? "border-gray-800 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: cor.valor }}
                    onClick={() => setCaixinhaFormData({ ...caixinhaFormData, cor: cor.valor })}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Icone</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ICONES_DISPONIVEIS.map((icone) => {
                  const Icon = icone.icon;
                  return (
                    <button
                      key={icone.valor}
                      type="button"
                      className={`p-2 rounded-md border-2 ${
                        caixinhaFormData.icone === icone.valor
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setCaixinhaFormData({ ...caixinhaFormData, icone: icone.valor })}
                      title={icone.nome}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCaixinhaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCaixinhaSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusao de caixinha */}
      <Dialog open={deleteCaixinhaDialog} onOpenChange={setDeleteCaixinhaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Caixinha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta caixinha? Todas as movimentacoes serao perdidas. Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCaixinhaDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCaixinha}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
