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
import { Plus, ShoppingCart, CreditCard, Edit, Trash2, ArrowLeft, DollarSign, Users } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Cartao {
  id: string;
  nome: string;
}

interface Compra {
  id: string;
  descricao: string;
  valor_total: number;
  tipo: string;
  numero_parcelas: number;
  data_inicio: string;
  cartao_id: string;
}

interface Parcela {
  id: string;
  compra_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_cobranca: string;
  foi_editada: boolean;
  valor_editado?: number;
  compra_descricao: string;
  cartao_id: string;
  pago_antecipado?: boolean;
  data_pagamento_antecipado?: string;
}

interface PessoaDivida {
  pessoa_id: string;
  valor_individual: number;
  pago: boolean;
}

interface Divida {
  id: string;
  valor_total: number;
  descricao: string;
  pessoas: PessoaDivida[];
  origem_tipo?: "cartao" | "gasto_geral";
  cartao_id?: string;
}

export function GastosTab() {
  const { mesSelecionado } = useMes();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [pessoas, setPessoas] = useState<any[]>([]);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"overview" | "cartao">("overview");
  const [selectedCartaoId, setSelectedCartaoId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCartaoForm, setShowCartaoForm] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [parcelaToEdit, setParcelaToEdit] = useState<Parcela | null>(null);
  const [deleteCartaoDialogOpen, setDeleteCartaoDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    descricao: "",
    valor_parcela: "",
    tipo: "vista",
    total_parcelas: "1",
    parcela_atual: "1",
    cartao_id: "",
    vincular_pessoa: false,
    pessoas_ids: [] as string[],
    dividir_igualmente: true,
    valores_individuais: {} as { [key: string]: string },
    recorrente: false,
    frequencia: "mensal" as "mensal" | "semanal" | "anual",
  });

  const [editFormData, setEditFormData] = useState({
    valor: "",
    numero_parcela: "",
    total_parcelas: "",
    pessoas_ids: [] as string[],
    dividir_igualmente: true,
    valores_individuais: {} as { [key: string]: string },
    recorrente: false,
    frequencia: "mensal" as "mensal" | "semanal" | "anual",
    autor_id: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteScopeDialogOpen, setDeleteScopeDialogOpen] = useState(false);
  const [parcelaToDelete, setParcelaToDelete] = useState<Parcela | null>(null);

  const [cartaoFormData, setCartaoFormData] = useState({ nome: "" });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  const loadData = async () => {
    try {
      const [cartoesRes, parcelasRes, dividasRes, pessoasRes] = await Promise.all([
        api.cartao.list(),
        api.parcela.list(mesSelecionado),
        api.divida.list(),
        api.pessoa.list(),
      ]);
      setCartoes(cartoesRes.data as Cartao[]);
      setParcelas(parcelasRes.data as Parcela[]);
      setDividas(dividasRes.data as Divida[]);

      const pessoasList = pessoasRes.data as any[];
      setPessoas(pessoasList);

      // Encontrar pessoa "Eu"
      const euPessoa = pessoasList.find((p) => p.nome === "Eu");
      if (euPessoa) {
        setMePessoaId(euPessoa.id);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.valor_parcela || parseFloat(formData.valor_parcela) <= 0) {
      toast.error("Valor da parcela inválido");
      return;
    }

    const cartaoId = selectedCartaoId || formData.cartao_id;
    if (!cartaoId) {
      toast.error("Selecione um cartão");
      return;
    }

    const totalParcelas = parseInt(formData.total_parcelas);
    const parcelaAtual = parseInt(formData.parcela_atual);

    if (parcelaAtual > totalParcelas) {
      toast.error("Numero da parcela nao pode ser maior que o total de parcelas");
      return;
    }

    if (formData.vincular_pessoa && formData.pessoas_ids.length === 0) {
      toast.error("Selecione pelo menos uma pessoa para vincular o gasto");
      return;
    }

    if (formData.vincular_pessoa && !formData.dividir_igualmente) {
      // Verificar se todos os valores individuais foram preenchidos
      const valoresFaltando = formData.pessoas_ids.some(
        (pessoaId) => !formData.valores_individuais[pessoaId] || parseFloat(formData.valores_individuais[pessoaId]) <= 0
      );
      if (valoresFaltando) {
        toast.error("Preencha todos os valores individuais");
        return;
      }
    }

    try {
      await api.compra.create({
        descricao: formData.descricao,
        valor_parcela: parseFloat(formData.valor_parcela),
        tipo: formData.tipo,
        total_parcelas: totalParcelas,
        parcela_atual: parcelaAtual,
        mes_cobranca: mesSelecionado,
        cartao_id: cartaoId,
        vincular_pessoa: formData.vincular_pessoa,
        pessoas_ids: formData.vincular_pessoa ? formData.pessoas_ids : undefined,
        dividir_igualmente: formData.vincular_pessoa ? formData.dividir_igualmente : undefined,
        valores_individuais: formData.vincular_pessoa && !formData.dividir_igualmente
          ? formData.valores_individuais
          : undefined,
        recorrente: formData.recorrente,
        frequencia: formData.recorrente ? formData.frequencia : undefined,
      });

      toast.success("Gasto adicionado com sucesso");
      setFormData({
        descricao: "",
        valor_parcela: "",
        tipo: "vista",
        total_parcelas: "1",
        parcela_atual: "1",
        cartao_id: selectedCartaoId || "",
        vincular_pessoa: false,
        pessoas_ids: [],
        dividir_igualmente: true,
        valores_individuais: {},
        recorrente: false,
        frequencia: "mensal",
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar gasto:", error);
      toast.error("Erro ao adicionar gasto");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCartaoNome = (id: string) => {
    if (!id) return "Sem cartão";
    const cartao = cartoes.find((c) => c.id === id);
    return cartao?.nome || "Cartão removido";
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const handleEditClick = (parcela: Parcela) => {
    setParcelaToEdit(parcela);

    // Buscar dívida vinculada para carregar pessoas
    const dividaVinculada = dividas.find(
      (d) => d.compra_id === parcela.compra_id && d.numero_parcela === parcela.numero_parcela
    );

    const pessoasIds = dividaVinculada?.pessoas?.map((p: any) => p.pessoa_id) || [];
    const dividirIgualmente = dividaVinculada?.dividir_igualmente ?? true;
    const valoresIndividuais: { [key: string]: string } = {};

    if (dividaVinculada?.pessoas && !dividirIgualmente) {
      dividaVinculada.pessoas.forEach((p: any) => {
        valoresIndividuais[p.pessoa_id] = p.valor_individual.toString();
      });
    }

    setEditFormData({
      valor: (parcela.foi_editada ? parcela.valor_editado || parcela.valor : parcela.valor).toString(),
      numero_parcela: parcela.numero_parcela.toString(),
      total_parcelas: parcela.total_parcelas.toString(),
      pessoas_ids: pessoasIds,
      dividir_igualmente: dividirIgualmente,
      valores_individuais: valoresIndividuais,
      recorrente: (parcela as any).recorrente || false,
      frequencia: (parcela as any).frequencia || "mensal",
      autor_id: (dividaVinculada as any)?.autor_id || mePessoaId || "",
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (parcela: Parcela) => {
    setParcelaToDelete(parcela);
    // Se for parcelada (total_parcelas > 1), mostrar dialog de escopo
    if (parcela.total_parcelas > 1) {
      setDeleteScopeDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!parcelaToEdit) return;

    const novoValor = parseFloat(editFormData.valor);
    if (isNaN(novoValor) || novoValor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const novaParcela = parseInt(editFormData.numero_parcela);
    if (isNaN(novaParcela) || novaParcela < 1) {
      toast.error("Número da parcela deve ser maior que 0");
      return;
    }

    const novoTotalParcelas = parseInt(editFormData.total_parcelas);
    if (isNaN(novoTotalParcelas) || novoTotalParcelas < 1) {
      toast.error("Total de parcelas deve ser maior que 0");
      return;
    }

    try {
      // Atualizar parcela
      await api.parcela.update(parcelaToEdit.id, {
        valor_editado: novoValor,
        numero_parcela: novaParcela,
        total_parcelas: novoTotalParcelas,
        recorrente: editFormData.recorrente,
        frequencia: editFormData.frequencia,
      });

      // Se tiver pessoas selecionadas, atualizar/criar dívida
      if (editFormData.pessoas_ids.length > 0) {
        // Buscar dívida existente
        const dividaExistente = dividas.find(
          (d) => d.compra_id === parcelaToEdit.compra_id && d.numero_parcela === parcelaToEdit.numero_parcela
        );

        // Calcular valores para cada pessoa
        let pessoas = [];
        if (editFormData.dividir_igualmente) {
          const valorPorPessoa = novoValor / editFormData.pessoas_ids.length;
          pessoas = editFormData.pessoas_ids.map((pessoa_id: string) => ({
            pessoa_id,
            valor_individual: valorPorPessoa,
            pago: false,
          }));
        } else {
          pessoas = editFormData.pessoas_ids.map((pessoa_id: string) => {
            const valorIndividual = editFormData.valores_individuais?.[pessoa_id]
              ? parseFloat(editFormData.valores_individuais[pessoa_id])
              : 0;
            return {
              pessoa_id,
              valor_individual: valorIndividual,
              pago: false,
            };
          });
        }

        const dividaData = {
          valor_total: novoValor,
          pessoas,
          dividir_igualmente: editFormData.dividir_igualmente,
          autor_id: editFormData.autor_id,
        };

        if (dividaExistente) {
          // Atualizar dívida existente
          await api.divida.update(dividaExistente.id, dividaData);
        } else {
          // Criar nova dívida
          await api.divida.create({
            ...dividaData,
            descricao: parcelaToEdit.compra_descricao,
            data: parcelaToEdit.data_cobranca,
            origem_tipo: "cartao",
            cartao_id: parcelaToEdit.cartao_id,
            compra_id: parcelaToEdit.compra_id,
            numero_parcela: novaParcela,
            total_parcelas: parcelaToEdit.total_parcelas,
          });
        }
      }

      toast.success("Parcela atualizada com sucesso");
      setEditDialogOpen(false);
      setParcelaToEdit(null);
      loadData();
    } catch (error) {
      console.error("Erro ao editar parcela:", error);
      toast.error("Erro ao editar parcela");
    }
  };

  const handleDeleteConfirm = async (scope: "current" | "all" = "current") => {
    if (!parcelaToDelete) return;

    try {
      // Enviar parâmetro de escopo na query string
      const endpoint = scope === "all"
        ? `${parcelaToDelete.id}?deletar_todas=true`
        : parcelaToDelete.id;

      await api.parcela.delete(endpoint);

      const mensagem = scope === "all"
        ? "Todas as parcelas foram excluídas"
        : "Parcela excluída com sucesso";

      toast.success(mensagem);
      setDeleteDialogOpen(false);
      setDeleteScopeDialogOpen(false);
      setParcelaToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir parcela:", error);
      toast.error("Erro ao excluir parcela");
    }
  };

  const handleCartaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cartaoFormData.nome.trim()) {
      toast.error("Nome do cartão é obrigatório");
      return;
    }

    try {
      await api.cartao.create({ nome: cartaoFormData.nome, ativo: true });
      toast.success("Cartão adicionado com sucesso");
      setCartaoFormData({ nome: "" });
      setShowCartaoForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar cartão:", error);
      toast.error("Erro ao adicionar cartão");
    }
  };

  const handleDeleteCartaoClick = (id: string) => {
    setCartaoToDelete(id);
    setDeleteCartaoDialogOpen(true);
  };

  const confirmDeleteCartao = async () => {
    if (!cartaoToDelete) return;

    try {
      await api.cartao.delete(cartaoToDelete);
      toast.success("Cartão deletado com sucesso");
      setDeleteCartaoDialogOpen(false);
      setCartaoToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao deletar cartão:", error);
      toast.error("Erro ao deletar cartão");
    }
  };

  const handleCartaoClick = (cartaoId: string) => {
    setSelectedCartaoId(cartaoId);
    setViewMode("cartao");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedCartaoId(null);
  };

  // Calcular totais por cartão (apenas parcelas do usuário)
  const getTotalPorCartao = () => {
    const totais: { [key: string]: number } = {};
    parcelas.forEach((parcela) => {
      const valor = parcela.foi_editada ? parcela.valor_editado || 0 : parcela.valor || 0;
      if (totais[parcela.cartao_id]) {
        totais[parcela.cartao_id] += valor;
      } else {
        totais[parcela.cartao_id] = valor;
      }
    });
    return totais;
  };

  // Calcular total de dívidas por cartão (apenas de outras pessoas)
  const getDividasPorCartao = () => {
    const totais: { [key: string]: number } = {};
    dividas.forEach((divida) => {
      if (divida.origem_tipo === "cartao" && divida.cartao_id) {
        // Somar apenas o valor das pessoas que NÃO são "Eu"
        const valorOutrasPessoas = (divida.pessoas || [])
          .filter((p) => p.pessoa_id !== mePessoaId)
          .reduce((sum, p) => sum + p.valor_individual, 0);

        if (totais[divida.cartao_id]) {
          totais[divida.cartao_id] += valorOutrasPessoas;
        } else {
          totais[divida.cartao_id] = valorOutrasPessoas;
        }
      }
    });
    return totais;
  };

  const totalPorCartao = getTotalPorCartao();
  const dividasPorCartao = getDividasPorCartao();

  // Calcular total da fatura por cartão (parcelas + dívidas)
  const totalFaturaPorCartao: { [key: string]: number } = {};
  [...Object.keys(totalPorCartao), ...Object.keys(dividasPorCartao)].forEach((cartaoId) => {
    totalFaturaPorCartao[cartaoId] =
      (totalPorCartao[cartaoId] || 0) + (dividasPorCartao[cartaoId] || 0);
  });

  const totalGeral = Object.values(totalFaturaPorCartao).reduce((sum, val) => sum + val, 0);

  // Dados para o gráfico de pizza
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
  const chartData = cartoes
    .filter((cartao) => totalFaturaPorCartao[cartao.id] > 0)
    .map((cartao, index) => ({
      name: cartao.nome,
      value: totalFaturaPorCartao[cartao.id] || 0,
      color: COLORS[index % COLORS.length],
    }));

  const parcelasFiltradas = selectedCartaoId
    ? parcelas.filter((p) => p.cartao_id === selectedCartaoId)
    : parcelas;

  const selectedCartao = cartoes.find((c) => c.id === selectedCartaoId);

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {viewMode === "cartao" && (
            <button
              onClick={handleBackToOverview}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold truncate">
              {viewMode === "overview" ? "Cartões" : selectedCartao?.nome || "Cartão"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {viewMode === "overview" && (
            <button
              onClick={() => setShowCartaoForm(!showCartaoForm)}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Cartão</span>
            </button>
          )}
          {viewMode === "cartao" && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Gasto</span>
            </button>
          )}
        </div>
      </div>

      {/* Visão Geral dos Cartões */}
      {viewMode === "overview" && (
        <>
          {showCartaoForm && (
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Cartão</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCartaoSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Cartão</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Ex: Nubank, Inter, C6"
                      value={cartaoFormData.nome}
                      onChange={(e) => setCartaoFormData({ nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">Salvar</Button>
                    <Button type="button" variant="outline" onClick={() => setShowCartaoForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Cards de Resumo e Gráfico */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            {/* Total Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  Total de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalGeral)}</p>
                <p className="text-sm text-gray-500 mt-2">Soma de todos os cartões</p>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Cartão</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum gasto registrado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Cartões */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {cartoes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8">
                  <p className="text-gray-500 text-center">
                    Nenhum cartão cadastrado. Clique em "Novo Cartão" para adicionar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              cartoes
                .filter((cartao) => cartao && cartao.id && cartao.nome)
                .map((cartao) => {
                  const meusGastos = totalPorCartao[cartao.id] || 0;
                  const gastosDevedores = dividasPorCartao[cartao.id] || 0;
                  const totalFatura = totalFaturaPorCartao[cartao.id] || 0;

                  return (
                    <Card
                      key={cartao.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleCartaoClick(cartao.id)}
                    >
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base sm:text-lg truncate">{cartao.nome}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCartaoClick(cartao.id);
                            }}
                            className="text-red-600 hover:text-red-700 p-1.5 sm:p-2 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Meus gastos:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(meusGastos)}</span>
                          </div>
                          {gastosDevedores > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Devedores:</span>
                              <span className="font-medium text-purple-600">{formatCurrency(gastosDevedores)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="font-semibold text-gray-900">Total da fatura:</span>
                            <span className="font-bold text-base sm:text-lg text-green-600">{formatCurrency(totalFatura)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </>
      )}

      {/* Visão Detalhada do Cartão */}
      {viewMode === "cartao" && (
        <>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Gasto de Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Supermercado, Netflix, TV, Celular"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="valor_parcela">Valor da Parcela</Label>
                <Input
                  id="valor_parcela"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.valor_parcela}
                  onChange={(e) => setFormData({ ...formData, valor_parcela: e.target.value })}
                  required
                />
              </div>

              {!selectedCartaoId && (
                <div>
                  <Label htmlFor="cartao">Cartão</Label>
                  <Select value={formData.cartao_id} onValueChange={(value) => setFormData({ ...formData, cartao_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoes.filter((cartao) => cartao && cartao.id && cartao.nome).map((cartao) => (
                        <SelectItem key={cartao.id} value={cartao.id}>
                          {cartao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo === "parcelado" && (
                  <div>
                    <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                    <Input
                      id="total_parcelas"
                      type="number"
                      min="2"
                      max="48"
                      value={formData.total_parcelas}
                      onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              {formData.tipo === "parcelado" && (
                <div>
                  <Label htmlFor="parcela_atual">Qual parcela é essa?</Label>
                  <Input
                    id="parcela_atual"
                    type="number"
                    min="1"
                    max={formData.total_parcelas}
                    value={formData.parcela_atual}
                    onChange={(e) => setFormData({ ...formData, parcela_atual: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Numero da parcela que vence em {formatMonth(mesSelecionado)}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(checked) => setFormData({ ...formData, recorrente: !!checked })}
                  />
                  <Label htmlFor="recorrente" className="flex items-center gap-2 cursor-pointer">
                    <ShoppingCart className="h-4 w-4" />
                    Gasto recorrente (gerado automaticamente todo mês)
                  </Label>
                </div>

                {formData.recorrente && (
                  <div>
                    <Label htmlFor="frequencia">Frequência</Label>
                    <Select value={formData.frequencia} onValueChange={(value: "mensal" | "semanal" | "anual") => setFormData({ ...formData, frequencia: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: Netflix, Spotify, Academia
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="vincular_pessoa"
                    checked={formData.vincular_pessoa}
                    onCheckedChange={(checked) => setFormData({ ...formData, vincular_pessoa: !!checked, pessoas_ids: [] })}
                  />
                  <Label htmlFor="vincular_pessoa" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Vincular a pessoas (criar dívida automaticamente)
                  </Label>
                </div>

                {formData.vincular_pessoa && (
                  <div className="space-y-3">
                    <div>
                      <Label>Selecione uma ou mais pessoas</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pessoas.filter((p) => p && p.id && p.nome && p.nome !== "Eu").map((pessoa) => (
                          <button
                            key={pessoa.id}
                            type="button"
                            onClick={() => {
                              const isSelected = formData.pessoas_ids.includes(pessoa.id);
                              const newPessoasIds = isSelected
                                ? formData.pessoas_ids.filter((id) => id !== pessoa.id)
                                : [...formData.pessoas_ids, pessoa.id];
                              setFormData({ ...formData, pessoas_ids: newPessoasIds });
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              formData.pessoas_ids.includes(pessoa.id)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {pessoa.nome}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="dividir_igualmente"
                        checked={formData.dividir_igualmente}
                        onCheckedChange={(checked) => setFormData({ ...formData, dividir_igualmente: !!checked })}
                      />
                      <Label htmlFor="dividir_igualmente" className="cursor-pointer">
                        Dividir valor igualmente entre as pessoas
                      </Label>
                    </div>

                    {!formData.dividir_igualmente && formData.pessoas_ids.length > 0 && (
                      <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700">Valores individuais:</p>
                        {formData.pessoas_ids.map((pessoaId) => {
                          const pessoa = pessoas.find((p) => p.id === pessoaId);
                          return (
                            <div key={pessoaId} className="flex items-center gap-2">
                              <Label className="w-24 text-sm">{pessoa?.nome}:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.valores_individuais[pessoaId] || ""}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  valores_individuais: {
                                    ...formData.valores_individuais,
                                    [pessoaId]: e.target.value
                                  }
                                })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Uma dívida será criada automaticamente para cada pessoa selecionada
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

          <Card>
            <CardHeader>
              <CardTitle>Gastos de {selectedCartao?.nome || "Cartão"} - {formatMonth(mesSelecionado)}</CardTitle>
            </CardHeader>
            <CardContent>
              {parcelasFiltradas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum gasto neste cartão neste mês. Clique em "Novo Gasto" para adicionar.
                </p>
              ) : (
                <div className="space-y-2">
                  {parcelasFiltradas.map((parcela) => (
                <div
                  key={parcela.id}
                  className="flex justify-between items-center p-3 rounded-md bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{parcela.compra_descricao}</p>
                      <p className="text-sm text-gray-600">
                        {getCartaoNome(parcela.cartao_id)}
                        {parcela.total_parcelas > 1 && (
                          <> • Parcela {parcela.numero_parcela}/{parcela.total_parcelas}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {formatCurrency(parcela.foi_editada ? parcela.valor_editado || 0 : parcela.valor || 0)}
                    </p>
                    <button
                      onClick={() => handleEditClick(parcela)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(parcela)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Diálogo de Edição de Parcela */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              {parcelaToEdit && (
                <>
                  Editando <strong>{parcelaToEdit.compra_descricao}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {parcelaToEdit && (
              <>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">Informações atuais</p>
                  <p className="font-medium">
                    Parcela {parcelaToEdit.numero_parcela}/{parcelaToEdit.total_parcelas}
                  </p>
                  <p className="text-sm text-gray-600">{getCartaoNome(parcelaToEdit.cartao_id)}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-valor">Valor</Label>
                    <Input
                      id="edit-valor"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editFormData.valor}
                      onChange={(e) => setEditFormData({ ...editFormData, valor: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Original: {formatCurrency(parcelaToEdit.valor)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="edit-numero_parcela">Número da Parcela</Label>
                    <Input
                      id="edit-numero_parcela"
                      type="number"
                      min="1"
                      placeholder="Ex: 1, 2, 3..."
                      value={editFormData.numero_parcela}
                      onChange={(e) => setEditFormData({ ...editFormData, numero_parcela: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Qual é esta parcela
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-total_parcelas">Total de Parcelas</Label>
                  <Input
                    id="edit-total_parcelas"
                    type="number"
                    min="1"
                    placeholder="Ex: 12"
                    value={editFormData.total_parcelas}
                    onChange={(e) => setEditFormData({ ...editFormData, total_parcelas: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quantas parcelas são no total (sem limite)
                  </p>
                </div>

                {/* Pessoas */}
                <div>
                  <Label>Pessoas Vinculadas</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {pessoas.map((pessoa) => (
                      <div key={pessoa.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-pessoa-${pessoa.id}`}
                          checked={editFormData.pessoas_ids.includes(pessoa.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditFormData({
                                ...editFormData,
                                pessoas_ids: [...editFormData.pessoas_ids, pessoa.id],
                              });
                            } else {
                              setEditFormData({
                                ...editFormData,
                                pessoas_ids: editFormData.pessoas_ids.filter((id) => id !== pessoa.id),
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`edit-pessoa-${pessoa.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {pessoa.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divisão */}
                {editFormData.pessoas_ids.length > 0 && (
                  <div>
                    <Label>Tipo de Divisão</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="edit-dividir_igualmente"
                        checked={editFormData.dividir_igualmente}
                        onCheckedChange={(checked) =>
                          setEditFormData({ ...editFormData, dividir_igualmente: checked as boolean })
                        }
                      />
                      <label htmlFor="edit-dividir_igualmente" className="text-sm cursor-pointer">
                        Dividir igualmente
                      </label>
                    </div>

                    {!editFormData.dividir_igualmente && (
                      <div className="space-y-2 mt-3">
                        <p className="text-sm text-gray-600">Valores individuais:</p>
                        {editFormData.pessoas_ids.map((pessoaId) => {
                          const pessoa = pessoas.find((p) => p.id === pessoaId);
                          return (
                            <div key={pessoaId} className="flex items-center gap-2">
                              <Label className="w-24 text-sm">{pessoa?.nome}:</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={editFormData.valores_individuais[pessoaId] || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    valores_individuais: {
                                      ...editFormData.valores_individuais,
                                      [pessoaId]: e.target.value,
                                    },
                                  })
                                }
                                className="flex-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Recorrência */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-recorrente"
                      checked={editFormData.recorrente}
                      onCheckedChange={(checked) =>
                        setEditFormData({ ...editFormData, recorrente: checked as boolean })
                      }
                    />
                    <label htmlFor="edit-recorrente" className="text-sm cursor-pointer">
                      Conta recorrente
                    </label>
                  </div>

                  {editFormData.recorrente && (
                    <div className="mt-2">
                      <Label htmlFor="edit-frequencia">Frequência</Label>
                      <Select
                        value={editFormData.frequencia}
                        onValueChange={(value) =>
                          setEditFormData({
                            ...editFormData,
                            frequencia: value as "mensal" | "semanal" | "anual",
                          })
                        }
                      >
                        <SelectTrigger id="edit-frequencia">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Autor/Responsável */}
                <div>
                  <Label htmlFor="edit-autor">Responsável pela dívida</Label>
                  <Select
                    value={editFormData.autor_id}
                    onValueChange={(value) => setEditFormData({ ...editFormData, autor_id: value })}
                  >
                    <SelectTrigger id="edit-autor">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoas.map((pessoa) => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Quem criou ou é responsável por esta dívida
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Escopo de Exclusão (parceladas) */}
      <Dialog open={deleteScopeDialogOpen} onOpenChange={setDeleteScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Parcela</DialogTitle>
            <DialogDescription>
              {parcelaToDelete && (
                <>
                  Esta é uma compra parcelada ({parcelaToDelete.numero_parcela}/{parcelaToDelete.total_parcelas}).
                  Como deseja proceder?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => handleDeleteConfirm("current")} variant="default" className="w-full">
              Excluir apenas esta parcela ({parcelaToDelete?.numero_parcela}/{parcelaToDelete?.total_parcelas})
            </Button>
            <Button onClick={() => handleDeleteConfirm("all")} variant="destructive" className="w-full">
              Excluir todas as parcelas desta compra
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteScopeDialogOpen(false);
                setParcelaToDelete(null);
              }}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              {parcelaToDelete && (
                <>
                  Tem certeza que deseja excluir a parcela {parcelaToDelete.numero_parcela}/
                  {parcelaToDelete.total_parcelas} de <strong>{parcelaToDelete.compra_descricao}</strong>?
                  Esta ação não pode ser desfeita.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteConfirm("current")}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Exclusão de Cartão */}
      <Dialog open={deleteCartaoDialogOpen} onOpenChange={setDeleteCartaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este cartão? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCartaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCartao}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
