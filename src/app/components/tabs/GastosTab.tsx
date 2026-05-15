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
import { Plus, CreditCard, ArrowLeft, Trash2, User } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

interface Cartao {
  id: string;
  nome: string;
}

interface Pessoa {
  id: string;
  nome: string;
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
  numero_parcela?: number;
  parcela_id?: string;
}

export function GastosTab() {
  const { mesSelecionado } = useMes();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"overview" | "cartao">("overview");
  const [selectedCartaoId, setSelectedCartaoId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parcelaToDelete, setParcelaToDelete] = useState<{ id: string; tipo: "esta" | "todas" | "proximas" | "anteriores" } | null>(null);

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
  });

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

      const pessoasList = pessoasRes.data as Pessoa[];
      setPessoas(pessoasList);

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

    if (formData.vincular_pessoa && formData.pessoas_ids.length === 0) {
      toast.error("Selecione pelo menos uma pessoa");
      return;
    }

    if (formData.vincular_pessoa && !formData.dividir_igualmente) {
      const soma = formData.pessoas_ids.reduce((acc, id) => {
        return acc + parseFloat(formData.valores_individuais[id] || "0");
      }, 0);
      const valorTotal = parseFloat(formData.valor_parcela);
      if (Math.abs(soma - valorTotal) > 0.01) {
        toast.error("A soma dos valores individuais deve ser igual ao total");
        return;
      }
    }

    try {
      await api.compra.create({
        descricao: formData.descricao,
        valor_parcela: parseFloat(formData.valor_parcela),
        tipo: formData.tipo,
        total_parcelas: parseInt(formData.total_parcelas),
        parcela_atual: parseInt(formData.parcela_atual),
        mes_cobranca: mesSelecionado,
        cartao_id: cartaoId,
        vincular_pessoa: formData.vincular_pessoa,
        pessoas_ids: formData.vincular_pessoa ? formData.pessoas_ids : undefined,
        dividir_igualmente: formData.vincular_pessoa ? formData.dividir_igualmente : undefined,
        valores_individuais: formData.vincular_pessoa && !formData.dividir_igualmente
          ? formData.valores_individuais
          : undefined,
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
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar gasto:", error);
      toast.error("Erro ao adicionar gasto");
    }
  };

  const handleDeleteClick = (parcelaId: string, tipo: "esta" | "todas" | "proximas" | "anteriores") => {
    setParcelaToDelete({ id: parcelaId, tipo });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!parcelaToDelete) return;

    try {
      if (parcelaToDelete.tipo === "esta") {
        // Delete simples
        await api.parcela.delete(parcelaToDelete.id);
      } else {
        // Delete com parâmetros (todas/proximas/anteriores)
        // Usar fetch diretamente porque api.parcela.delete não aceita query params
        const token = localStorage.getItem("token");

        const params = new URLSearchParams();
        if (parcelaToDelete.tipo === "todas") params.set("deletar_todas", "true");
        if (parcelaToDelete.tipo === "proximas") params.set("deletar_proximas", "true");
        if (parcelaToDelete.tipo === "anteriores") params.set("deletar_anteriores", "true");

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-808cc1b6/parcela/${parcelaToDelete.id}?${params.toString()}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${publicAnonKey}`,
              "X-Auth-Token": token || "",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao deletar");
        }
      }

      toast.success("Parcela(s) deletada(s) com sucesso");
      setDeleteDialogOpen(false);
      setParcelaToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao deletar parcela:", error);
      toast.error("Erro ao deletar parcela");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCartaoNome = (id: string) => {
    const cartao = cartoes.find((c) => c.id === id);
    return cartao?.nome || "Cartão removido";
  };

  const getPessoaNome = (id: string) => {
    const pessoa = pessoas.find((p) => p.id === id);
    return pessoa?.nome || "Desconhecido";
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const calcularValoresCartao = (cartaoId: string) => {
    const parcelasDoCartao = parcelas.filter((p) => p.cartao_id === cartaoId);
    const totalFatura = parcelasDoCartao.reduce((sum, p) => sum + (p.foi_editada ? (p.valor_editado || 0) : p.valor), 0);

    // Calcular meus gastos (parcelas sem dívidas)
    const meusGastos = parcelasDoCartao.reduce((sum, parcela) => {
      const temDivida = dividas.some((d) =>
        d.origem_tipo === "cartao" &&
        d.cartao_id === cartaoId &&
        d.parcela_id === parcela.id
      );
      if (!temDivida) {
        return sum + (parcela.foi_editada ? (parcela.valor_editado || 0) : parcela.valor);
      }
      return sum;
    }, 0);

    // Calcular devedores (soma das dívidas deste cartão neste mês)
    const devedores = dividas.reduce((sum, divida) => {
      if (divida.origem_tipo === "cartao" && divida.cartao_id === cartaoId) {
        const parcelaDaDivida = parcelas.find((p) => p.id === divida.parcela_id);
        if (parcelaDaDivida) {
          return sum + divida.valor_total;
        }
      }
      return sum;
    }, 0);

    return { totalFatura, meusGastos, devedores };
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (viewMode === "overview") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold truncate">Gastos com Cartões</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {cartoes.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8">
                <p className="text-gray-500 text-center">
                  Nenhum cartão cadastrado. Vá em "Cartões" para adicionar.
                </p>
              </CardContent>
            </Card>
          ) : (
            cartoes.map((cartao) => {
              const { totalFatura, meusGastos, devedores } = calcularValoresCartao(cartao.id);

              return (
                <Card
                  key={cartao.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedCartaoId(cartao.id);
                    setViewMode("cartao");
                  }}
                >
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">{cartao.nome}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">Meus Gastos:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(meusGastos)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">Devedores:</span>
                        <span className="font-semibold text-amber-600">{formatCurrency(devedores)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-gray-50 rounded px-2">
                        <span className="font-medium text-gray-800">Total da Fatura:</span>
                        <span className="font-bold text-lg text-gray-900">{formatCurrency(totalFatura)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // VIEW CARTAO ESPECÍFICO
  const selectedCartao = cartoes.find((c) => c.id === selectedCartaoId);
  const parcelasDoCartao = parcelas.filter((p) => p.cartao_id === selectedCartaoId);
  const { totalFatura, meusGastos, devedores } = calcularValoresCartao(selectedCartaoId || "");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setViewMode("overview");
            setSelectedCartaoId(null);
          }}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedCartao?.nome}</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova Compra</span>
        </button>
      </div>

      {/* Resumo da Fatura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Fatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Meus Gastos:</span>
              <span className="font-semibold text-blue-600 text-lg">{formatCurrency(meusGastos)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Devedores:</span>
              <span className="font-semibold text-amber-600 text-lg">{formatCurrency(devedores)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-gray-50 rounded px-3">
              <span className="font-bold text-gray-800 text-lg">Total da Fatura:</span>
              <span className="font-bold text-2xl text-gray-900">{formatCurrency(totalFatura)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Mercado, Netflix, Amazon"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vista">À Vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.tipo === "parcelado" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parcela_atual">Parcela Atual</Label>
                    <Input
                      id="parcela_atual"
                      type="number"
                      min="1"
                      value={formData.parcela_atual}
                      onChange={(e) => setFormData({ ...formData, parcela_atual: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                    <Input
                      id="total_parcelas"
                      type="number"
                      min="1"
                      value={formData.total_parcelas}
                      onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Dividir com Pessoas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="vincular_pessoa"
                    type="checkbox"
                    checked={formData.vincular_pessoa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vincular_pessoa: e.target.checked,
                        pessoas_ids: [],
                        valores_individuais: {},
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="vincular_pessoa" className="cursor-pointer">
                    Dividir com outras pessoas
                  </Label>
                </div>

                {formData.vincular_pessoa && (
                  <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div>
                      <Label className="text-sm font-medium">Selecione as pessoas</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pessoas
                          .filter((p) => p.id !== mePessoaId)
                          .map((pessoa) => (
                            <button
                              key={pessoa.id}
                              type="button"
                              onClick={() => {
                                const isSelected = formData.pessoas_ids.includes(pessoa.id);
                                if (isSelected) {
                                  const novosIds = formData.pessoas_ids.filter((id) => id !== pessoa.id);
                                  const novosValores = { ...formData.valores_individuais };
                                  delete novosValores[pessoa.id];
                                  setFormData({
                                    ...formData,
                                    pessoas_ids: novosIds,
                                    valores_individuais: novosValores,
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    pessoas_ids: [...formData.pessoas_ids, pessoa.id],
                                  });
                                }
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                formData.pessoas_ids.includes(pessoa.id)
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                              }`}
                            >
                              {pessoa.nome}
                            </button>
                          ))}
                      </div>
                    </div>

                    {formData.pessoas_ids.length > 0 && (
                      <>
                        <div className="flex gap-4 pt-2 border-t border-blue-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.dividir_igualmente}
                              onChange={() =>
                                setFormData({ ...formData, dividir_igualmente: true, valores_individuais: {} })
                              }
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm font-medium">Igual para todos</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={!formData.dividir_igualmente}
                              onChange={() => setFormData({ ...formData, dividir_igualmente: false })}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm font-medium">Valores diferentes</span>
                          </label>
                        </div>

                        {formData.dividir_igualmente && (
                          <div className="text-sm p-2 bg-white rounded border border-blue-200">
                            <span className="text-gray-600">Valor por pessoa:</span>{" "}
                            <span className="font-bold text-blue-600">
                              {formatCurrency(parseFloat(formData.valor_parcela || "0") / formData.pessoas_ids.length)}
                            </span>
                          </div>
                        )}

                        {!formData.dividir_igualmente && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Valores individuais</Label>
                            {formData.pessoas_ids.map((pessoaId) => (
                              <div key={pessoaId} className="flex items-center gap-2">
                                <span className="w-24 text-sm font-medium">{getPessoaNome(pessoaId)}:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={formData.valores_individuais[pessoaId] || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      valores_individuais: {
                                        ...formData.valores_individuais,
                                        [pessoaId]: e.target.value,
                                      },
                                    })
                                  }
                                  className="flex-1"
                                />
                              </div>
                            ))}
                            <div className="text-sm p-2 bg-white rounded border border-amber-300 mt-2">
                              <span className="text-gray-600">Soma dos valores:</span>{" "}
                              <span className="font-bold">
                                {formatCurrency(
                                  formData.pessoas_ids.reduce((acc, id) => {
                                    return acc + parseFloat(formData.valores_individuais[id] || "0");
                                  }, 0)
                                )}
                              </span>
                              {" / "}
                              <span className="text-gray-600">Total:</span>{" "}
                              <span className="font-bold">{formatCurrency(parseFloat(formData.valor_parcela || "0"))}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-col sm:flex-row">
                <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Parcelas */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Parcelas do Mês</h3>
        {parcelasDoCartao.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-gray-500 text-center">Nenhuma parcela neste mês.</p>
            </CardContent>
          </Card>
        ) : (
          parcelasDoCartao.map((parcela) => {
            const dividasDaParcela = dividas.filter((d) => d.parcela_id === parcela.id);
            const temDivida = dividasDaParcela.length > 0;

            return (
              <Card key={parcela.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">{parcela.compra_descricao}</p>
                        <p className="text-sm text-gray-500">
                          {parcela.total_parcelas > 1
                            ? `Parcela ${parcela.numero_parcela}/${parcela.total_parcelas}`
                            : "À vista"}
                        </p>
                        {temDivida && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {dividasDaParcela.map((divida) => (
                              <span key={divida.id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                <User className="h-3 w-3" />
                                {divida.pessoas.map((p) => getPessoaNome(p.pessoa_id)).join(", ")} - {formatCurrency(divida.valor_total)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(parcela.foi_editada ? (parcela.valor_editado || 0) : parcela.valor)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteClick(parcela.id, "esta")}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Apagar Esta
                      </Button>
                      {parcela.total_parcelas > 1 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(parcela.id, "anteriores")}
                          >
                            Apagar Anteriores
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(parcela.id, "proximas")}
                          >
                            Apagar Próximas
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(parcela.id, "todas")}
                          >
                            Apagar Todas
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Confirmação */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              {parcelaToDelete?.tipo === "esta" && "Tem certeza que deseja deletar esta parcela?"}
              {parcelaToDelete?.tipo === "todas" && "Tem certeza que deseja deletar TODAS as parcelas desta compra?"}
              {parcelaToDelete?.tipo === "proximas" && "Tem certeza que deseja deletar esta parcela e as PRÓXIMAS?"}
              {parcelaToDelete?.tipo === "anteriores" && "Tem certeza que deseja deletar esta parcela e as ANTERIORES?"}
              {" "}Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
