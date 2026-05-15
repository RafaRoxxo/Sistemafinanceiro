import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { useAuth } from "../../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign, Droplet, Zap, Home, Wifi, ShoppingCart, Wallet, CreditCard, PiggyBank, User } from "lucide-react";

interface Pessoa {
  id: string;
  nome: string;
}

interface Caixinha {
  id: string;
  nome: string;
  saldo: number;
}

interface GastoGeral {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  mes_referencia: string;
  responsavel_id: string;
  forma_pagamento: "debito" | "pix" | "caixinha";
  caixinha_id?: string;
  parcelado?: boolean;
  parcela_atual?: number;
  total_parcelas?: number;
  gasto_pai_id?: string;
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
  gasto_geral_id?: string;
}

const categorias = [
  { value: "agua", label: "Água", icon: Droplet },
  { value: "luz", label: "Luz", icon: Zap },
  { value: "aluguel", label: "Aluguel", icon: Home },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "mercado", label: "Mercado", icon: ShoppingCart },
  { value: "emprestimo", label: "Empréstimo", icon: DollarSign },
  { value: "outros", label: "Outros", icon: DollarSign },
];

const formasPagamento = [
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Wallet },
  { value: "caixinha", label: "Caixinha", icon: PiggyBank },
];

export function GastosGeraisTab() {
  const { mesSelecionado } = useMes();
  const { user } = useAuth();
  const [gastos, setGastos] = useState<GastoGeral[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [gastoToEdit, setGastoToEdit] = useState<GastoGeral | null>(null);

  const [formData, setFormData] = useState({
    categoria: "outros",
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    responsavel_id: "",
    forma_pagamento: "pix" as "debito" | "pix" | "caixinha",
    caixinha_id: "",
    parcelado: false,
    parcela_atual: "1",
    total_parcelas: "1",
    criar_parcelas_anteriores: false,
    parcelas_anteriores_pagas: false,
    dividir_com_pessoas: false,
    pessoas_ids: [] as string[],
    dividir_igualmente: true,
    valores_individuais: {} as { [key: string]: string },
  });

  const [editFormData, setEditFormData] = useState({
    categoria: "outros",
    descricao: "",
    valor: "",
    data: "",
    responsavel_id: "",
    forma_pagamento: "pix" as "debito" | "pix" | "caixinha",
    caixinha_id: "",
  });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  const loadData = async () => {
    try {
      const [gastosRes, pessoasRes, caixinhasRes, dividasRes] = await Promise.all([
        api.gastoGeral.list(mesSelecionado),
        api.pessoa.list(),
        api.caixinha.list(),
        api.divida.list(),
      ]);

      setGastos(gastosRes.data as GastoGeral[]);
      const pessoasList = pessoasRes.data as Pessoa[];
      setPessoas(pessoasList);
      setCaixinhas(caixinhasRes.data as Caixinha[]);
      setDividas(dividasRes.data as Divida[]);

      // Encontrar pessoa "Eu"
      const euPessoa = pessoasList.find((p) => p.nome === "Eu");
      if (euPessoa) {
        setMePessoaId(euPessoa.id);
        setFormData((prev) => ({ ...prev, responsavel_id: euPessoa.id }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (!formData.responsavel_id) {
      toast.error("Selecione um responsável");
      return;
    }

    if (formData.forma_pagamento === "caixinha" && !formData.caixinha_id) {
      toast.error("Selecione uma caixinha");
      return;
    }

    if (formData.parcelado) {
      const parcelaAtual = parseInt(formData.parcela_atual);
      const totalParcelas = parseInt(formData.total_parcelas);
      if (parcelaAtual < 1 || parcelaAtual > totalParcelas) {
        toast.error("Parcela atual inválida");
        return;
      }
    }

    // Validação para divisão com pessoas
    if (formData.dividir_com_pessoas) {
      if (formData.pessoas_ids.length === 0) {
        toast.error("Selecione pelo menos uma pessoa para dividir");
        return;
      }

      // Se valores diferentes, validar soma
      if (!formData.dividir_igualmente) {
        const soma = formData.pessoas_ids.reduce((acc, id) => {
          return acc + parseFloat(formData.valores_individuais[id] || "0");
        }, 0);

        const valorTotal = parseFloat(formData.valor);
        if (Math.abs(soma - valorTotal) > 0.01) {
          toast.error(
            `A soma dos valores individuais (${formatCurrency(soma)}) deve ser igual ao total (${formatCurrency(valorTotal)})`
          );
          return;
        }
      }
    }

    try {
      const valor = parseFloat(formData.valor);

      await api.gastoGeral.create({
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: valor,
        data: formData.data,
        mes_referencia: mesSelecionado,
        responsavel_id: formData.responsavel_id,
        forma_pagamento: formData.forma_pagamento,
        caixinha_id: formData.forma_pagamento === "caixinha" ? formData.caixinha_id : undefined,
        parcelado: formData.parcelado,
        parcela_atual: formData.parcelado ? parseInt(formData.parcela_atual) : 1,
        total_parcelas: formData.parcelado ? parseInt(formData.total_parcelas) : 1,
        criar_parcelas_anteriores: formData.parcelado ? formData.criar_parcelas_anteriores : false,
        parcelas_anteriores_pagas: formData.parcelado ? formData.parcelas_anteriores_pagas : false,
        dividir_com_pessoas: formData.dividir_com_pessoas,
        pessoas_ids: formData.pessoas_ids,
        dividir_igualmente: formData.dividir_igualmente,
        valores_individuais: formData.valores_individuais,
      });

      toast.success(
        formData.parcelado
          ? `Gasto parcelado criado com sucesso`
          : "Gasto criado com sucesso"
      );

      setFormData({
        categoria: "outros",
        descricao: "",
        valor: "",
        data: new Date().toISOString().split("T")[0],
        responsavel_id: mePessoaId || "",
        forma_pagamento: "pix",
        caixinha_id: "",
        parcelado: false,
        parcela_atual: "1",
        total_parcelas: "1",
        criar_parcelas_anteriores: false,
        parcelas_anteriores_pagas: false,
        dividir_com_pessoas: false,
        pessoas_ids: [],
        dividir_igualmente: true,
        valores_individuais: {},
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao criar gasto:", error);
      toast.error("Erro ao criar gasto");
    }
  };

  const handleEditClick = (gasto: GastoGeral) => {
    setGastoToEdit(gasto);
    setEditFormData({
      categoria: gasto.categoria,
      descricao: gasto.descricao,
      valor: gasto.valor.toString(),
      data: gasto.data,
      responsavel_id: gasto.responsavel_id,
      forma_pagamento: gasto.forma_pagamento || "pix",
      caixinha_id: gasto.caixinha_id || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!gastoToEdit) return;

    if (!editFormData.valor || parseFloat(editFormData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (editFormData.forma_pagamento === "caixinha" && !editFormData.caixinha_id) {
      toast.error("Selecione uma caixinha");
      return;
    }

    try {
      await api.gastoGeral.update(gastoToEdit.id, {
        categoria: editFormData.categoria,
        descricao: editFormData.descricao,
        valor: parseFloat(editFormData.valor),
        data: editFormData.data,
        responsavel_id: editFormData.responsavel_id,
        forma_pagamento: editFormData.forma_pagamento,
        caixinha_id: editFormData.forma_pagamento === "caixinha" ? editFormData.caixinha_id : undefined,
      });

      toast.success("Gasto atualizado com sucesso");
      setEditDialogOpen(false);
      setGastoToEdit(null);
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar gasto:", error);
      toast.error("Erro ao atualizar gasto");
    }
  };

  const handleDeleteClick = (id: string) => {
    setGastoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!gastoToDelete) return;

    try {
      await api.gastoGeral.delete(gastoToDelete);
      toast.success("Gasto deletado com sucesso");
      setDeleteDialogOpen(false);
      setGastoToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao deletar gasto:", error);
      toast.error("Erro ao deletar gasto");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPessoaNome = (id: string) => {
    const pessoa = pessoas.find((p) => p.id === id);
    if (!pessoa) return "Desconhecido";
    if (id === mePessoaId) return "Eu";
    return pessoa.nome;
  };

  const getCaixinhaNome = (id: string) => {
    return caixinhas.find((c) => c.id === id)?.nome || "Caixinha não encontrada";
  };

  const getCategoriaLabel = (value: string) => {
    return categorias.find((c) => c.value === value)?.label || value;
  };

  const getCategoriaIcon = (value: string) => {
    const Icon = categorias.find((c) => c.value === value)?.icon || DollarSign;
    return Icon;
  };

  const getFormaPagamentoLabel = (value: string) => {
    return formasPagamento.find((f) => f.value === value)?.label || value;
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const totalGastos = gastos.reduce((sum, gasto) => {
    // Só contabilizar gastos onde eu sou o responsável
    if (gasto.responsavel_id === mePessoaId) {
      return sum + gasto.valor;
    }
    return sum;
  }, 0);

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Gastos Gerais</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {formatMonth(mesSelecionado)} - Total: {formatCurrency(totalGastos)}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Novo Gasto</span>
          <span className="sm:hidden text-xs">Gasto</span>
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Gasto Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger id="categoria">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    type="text"
                    placeholder="Ex: Conta de luz"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="responsavel">Responsável</Label>
                <Select
                  value={formData.responsavel_id}
                  onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
                >
                  <SelectTrigger id="responsavel">
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
                  {formData.responsavel_id === mePessoaId
                    ? "Gasto pessoal - contabilizado no seu financeiro"
                    : "Gasto de terceiro - gerará dívida automaticamente"}
                </p>
              </div>

              {/* Dividir com Pessoas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="dividir_com_pessoas"
                    type="checkbox"
                    checked={formData.dividir_com_pessoas}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dividir_com_pessoas: e.target.checked,
                        pessoas_ids: [],
                        valores_individuais: {},
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="dividir_com_pessoas" className="cursor-pointer">
                    Dividir com outras pessoas
                  </Label>
                </div>

                {formData.dividir_com_pessoas && (
                  <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    {/* Seleção de pessoas */}
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

                    {/* Tipo de divisão */}
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
                              {formatCurrency(parseFloat(formData.valor || "0") / formData.pessoas_ids.length)}
                            </span>
                          </div>
                        )}

                        {/* Valores individuais */}
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
                              <span className="font-bold">{formatCurrency(parseFloat(formData.valor || "0"))}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                  <Select
                    value={formData.forma_pagamento}
                    onValueChange={(value: "debito" | "pix" | "caixinha") =>
                      setFormData({ ...formData, forma_pagamento: value, caixinha_id: "" })
                    }
                  >
                    <SelectTrigger id="forma_pagamento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map((forma) => (
                        <SelectItem key={forma.value} value={forma.value}>
                          {forma.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.forma_pagamento === "caixinha" && (
                  <div>
                    <Label htmlFor="caixinha">Caixinha</Label>
                    <Select
                      value={formData.caixinha_id}
                      onValueChange={(value) => setFormData({ ...formData, caixinha_id: value })}
                    >
                      <SelectTrigger id="caixinha">
                        <SelectValue placeholder="Selecione uma caixinha" />
                      </SelectTrigger>
                      <SelectContent>
                        {caixinhas.map((caixinha) => (
                          <SelectItem key={caixinha.id} value={caixinha.id}>
                            {caixinha.nome} - {formatCurrency(caixinha.saldo)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Parcelamento */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="parcelado"
                    type="checkbox"
                    checked={formData.parcelado}
                    onChange={(e) => setFormData({ ...formData, parcelado: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="parcelado" className="cursor-pointer">
                    Parcelado (sem cartão)
                  </Label>
                </div>

                {formData.parcelado && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-md">
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
                          min="2"
                          value={formData.total_parcelas}
                          onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                        />
                      </div>
                    </div>

                    {parseInt(formData.parcela_atual) > 1 && (
                      <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800 font-medium">
                          Esta é a parcela {formData.parcela_atual} de {formData.total_parcelas}.
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            id="criar_parcelas_anteriores"
                            type="checkbox"
                            checked={formData.criar_parcelas_anteriores}
                            onChange={(e) =>
                              setFormData({ ...formData, criar_parcelas_anteriores: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <Label htmlFor="criar_parcelas_anteriores" className="cursor-pointer text-sm text-amber-800">
                            Criar parcelas anteriores (1 até {parseInt(formData.parcela_atual) - 1})
                          </Label>
                        </div>

                        {formData.criar_parcelas_anteriores && (
                          <div className="flex items-center gap-2">
                            <input
                              id="parcelas_anteriores_pagas"
                              type="checkbox"
                              checked={formData.parcelas_anteriores_pagas}
                              onChange={(e) =>
                                setFormData({ ...formData, parcelas_anteriores_pagas: e.target.checked })
                              }
                              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <Label htmlFor="parcelas_anteriores_pagas" className="cursor-pointer text-sm text-amber-800">
                              Marcar parcelas anteriores como pagas
                            </Label>
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Lista de gastos */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {gastos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhum gasto neste mês</p>
            </CardContent>
          </Card>
        ) : (
          gastos
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
            .map((gasto) => {
              const Icon = getCategoriaIcon(gasto.categoria);
              const isMyExpense = gasto.responsavel_id === mePessoaId;
              const dividasDoGasto = dividas.filter((d) => d.origem_tipo === "gasto_geral" && d.gasto_geral_id === gasto.id);
              const temDivida = dividasDoGasto.length > 0;

              return (
                <Card key={gasto.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold">{gasto.descricao}</p>
                            <p className="text-sm text-gray-600">{getCategoriaLabel(gasto.categoria)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Data:</span>{" "}
                            {new Date(gasto.data + "T00:00:00").toLocaleDateString("pt-BR")}
                          </div>
                          <div>
                            <span className="text-gray-600">Responsável:</span>{" "}
                            <span className={isMyExpense ? "text-blue-600 font-medium" : "text-orange-600 font-medium"}>
                              {getPessoaNome(gasto.responsavel_id)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Pagamento:</span>{" "}
                            {getFormaPagamentoLabel(gasto.forma_pagamento || "pix")}
                            {gasto.caixinha_id && ` - ${getCaixinhaNome(gasto.caixinha_id)}`}
                          </div>
                          {gasto.parcelado && (
                            <div>
                              <span className="text-gray-600">Parcela:</span>{" "}
                              {gasto.parcela_atual}/{gasto.total_parcelas}
                            </div>
                          )}
                        </div>

                        {temDivida && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {dividasDoGasto.map((divida) => (
                              <span key={divida.id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                <User className="h-3 w-3" />
                                {divida.pessoas.map((p) => getPessoaNome(p.pessoa_id)).join(", ")} - {formatCurrency(divida.valor_total)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <p className="font-bold text-lg">{formatCurrency(gasto.valor)}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick(gasto)}
                            className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(gasto.id)}
                            className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Dialog de edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>
              Altere os dados do gasto abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select
                value={editFormData.categoria}
                onValueChange={(value) => setEditFormData({ ...editFormData, categoria: value })}
              >
                <SelectTrigger id="edit-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Input
                id="edit-descricao"
                type="text"
                value={editFormData.descricao}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-valor">Valor</Label>
              <Input
                id="edit-valor"
                type="number"
                step="0.01"
                value={editFormData.valor}
                onChange={(e) => setEditFormData({ ...editFormData, valor: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={editFormData.data}
                onChange={(e) => setEditFormData({ ...editFormData, data: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-responsavel">Responsável</Label>
              <Select
                value={editFormData.responsavel_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, responsavel_id: value })}
              >
                <SelectTrigger id="edit-responsavel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((pessoa) => (
                    <SelectItem key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-forma_pagamento">Forma de Pagamento</Label>
              <Select
                value={editFormData.forma_pagamento}
                onValueChange={(value: "debito" | "pix" | "caixinha") =>
                  setEditFormData({ ...editFormData, forma_pagamento: value })
                }
              >
                <SelectTrigger id="edit-forma_pagamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma.value} value={forma.value}>
                      {forma.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editFormData.forma_pagamento === "caixinha" && (
              <div>
                <Label htmlFor="edit-caixinha">Caixinha</Label>
                <Select
                  value={editFormData.caixinha_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, caixinha_id: value })}
                >
                  <SelectTrigger id="edit-caixinha">
                    <SelectValue placeholder="Selecione uma caixinha" />
                  </SelectTrigger>
                  <SelectContent>
                    {caixinhas.map((caixinha) => (
                      <SelectItem key={caixinha.id} value={caixinha.id}>
                        {caixinha.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
