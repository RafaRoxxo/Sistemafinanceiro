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
import { Plus, Trash2, Edit, DollarSign, Droplet, Zap, Home, Wifi, ShoppingCart, CheckCircle, User } from "lucide-react";

interface PessoaGasto {
  pessoa_id: string;
  valor_individual: number;
  pago: boolean;
}

interface Pessoa {
  id: string;
  nome: string;
}

interface GastoGeral {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  mes_referencia: string;
  recorrente?: boolean;
  pessoas?: PessoaGasto[];
  dividir_igualmente?: boolean;
}

const categorias = [
  { value: "agua", label: "Água", icon: Droplet },
  { value: "luz", label: "Luz", icon: Zap },
  { value: "aluguel", label: "Aluguel", icon: Home },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "mercado", label: "Mercado", icon: ShoppingCart },
  { value: "outros", label: "Outros", icon: DollarSign },
];

export function GastosGeraisTab() {
  const { mesSelecionado } = useMes();
  const { user } = useAuth();
  const [gastos, setGastos] = useState<GastoGeral[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editScopeDialogOpen, setEditScopeDialogOpen] = useState(false);
  const [gastoToEdit, setGastoToEdit] = useState<GastoGeral | null>(null);
  const [includeMeInGasto, setIncludeMeInGasto] = useState(false);
  const [includeMeInEdit, setIncludeMeInEdit] = useState(false);

  const [formData, setFormData] = useState({
    categoria: "outros",
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    recorrente: false,
    pessoas_ids: [] as string[],
    dividir_igualmente: true,
  });

  const [editFormData, setEditFormData] = useState({
    categoria: "outros",
    descricao: "",
    valor: "",
    data: "",
    recorrente: false,
    pessoas_ids: [] as string[],
    dividir_igualmente: true,
  });

  useEffect(() => {
    loadGastos();
  }, [mesSelecionado]);

  useEffect(() => {
    if (includeMeInGasto && mePessoaId && !formData.pessoas_ids.includes(mePessoaId)) {
      setFormData({ ...formData, pessoas_ids: [...formData.pessoas_ids, mePessoaId] });
    } else if (!includeMeInGasto && mePessoaId && formData.pessoas_ids.includes(mePessoaId)) {
      setFormData({
        ...formData,
        pessoas_ids: formData.pessoas_ids.filter((id) => id !== mePessoaId),
      });
    }
  }, [includeMeInGasto, mePessoaId]);

  useEffect(() => {
    if (includeMeInEdit && mePessoaId && !editFormData.pessoas_ids.includes(mePessoaId)) {
      setEditFormData({ ...editFormData, pessoas_ids: [...editFormData.pessoas_ids, mePessoaId] });
    } else if (!includeMeInEdit && mePessoaId && editFormData.pessoas_ids.includes(mePessoaId)) {
      setEditFormData({
        ...editFormData,
        pessoas_ids: editFormData.pessoas_ids.filter((id) => id !== mePessoaId),
      });
    }
  }, [includeMeInEdit, mePessoaId]);

  const loadGastos = async () => {
    try {
      const [gastosRes, pessoasRes] = await Promise.all([
        api.gastoGeral.list(mesSelecionado),
        api.pessoa.list(),
      ]);
      setGastos(gastosRes.data as GastoGeral[]);
      const pessoasList = pessoasRes.data as Pessoa[];
      setPessoas(pessoasList);

      // Encontrar ou criar pessoa "Eu"
      let euPessoa = pessoasList.find((p) => p.nome === "Eu");
      if (!euPessoa && user) {
        try {
          const newPessoaRes = await api.pessoa.create({ nome: "Eu" });
          euPessoa = newPessoaRes.data as Pessoa;
          setPessoas([...pessoasList, euPessoa]);
        } catch (error) {
          console.error("Erro ao criar pessoa 'Eu':", error);
        }
      }
      if (euPessoa) {
        setMePessoaId(euPessoa.id);
      }
    } catch (error) {
      console.error("Erro ao carregar gastos gerais:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoriaInfo = (categoria: string) => {
    return categorias.find((c) => c.value === categoria) || categorias[categorias.length - 1];
  };

  const getPessoaNome = (id: string) => {
    const pessoa = pessoas.find((p) => p.id === id);
    if (!pessoa) return "Desconhecido";
    if (id === mePessoaId) return "Eu";
    return pessoa.nome;
  };

  const togglePessoaSelection = (pessoaId: string, formType: "create" | "edit") => {
    if (formType === "create") {
      setFormData((prev) => ({
        ...prev,
        pessoas_ids: prev.pessoas_ids.includes(pessoaId)
          ? prev.pessoas_ids.filter((id) => id !== pessoaId)
          : [...prev.pessoas_ids, pessoaId],
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        pessoas_ids: prev.pessoas_ids.includes(pessoaId)
          ? prev.pessoas_ids.filter((id) => id !== pessoaId)
          : [...prev.pessoas_ids, pessoaId],
      }));
    }
  };

  const handleMarcarPago = async (gastoId: string, pessoaId: string, pago: boolean) => {
    try {
      await api.gastoGeral.update(gastoId, {
        marcar_pago_pessoa: true,
        pessoa_id: pessoaId,
        pago: !pago,
      });
      toast.success(pago ? "Pagamento desmarcado" : "Marcado como pago");
      loadGastos();
    } catch (error) {
      console.error("Erro ao atualizar gasto:", error);
      toast.error("Erro ao atualizar gasto");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      const mes = formData.data.substring(0, 7);
      const valor = parseFloat(formData.valor);

      const pessoas =
        formData.pessoas_ids.length > 0
          ? formData.pessoas_ids.map((pessoa_id) => ({
              pessoa_id,
              valor_individual: formData.dividir_igualmente
                ? valor / formData.pessoas_ids.length
                : 0,
              pago: false,
            }))
          : undefined;

      await api.gastoGeral.create({
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: valor,
        data: formData.data,
        mes_referencia: mes,
        recorrente: formData.recorrente,
        pessoas: pessoas,
        dividir_igualmente: formData.dividir_igualmente,
      });

      toast.success(
        formData.recorrente
          ? "Gasto recorrente adicionado em todos os meses seguintes"
          : "Gasto adicionado com sucesso"
      );
      setFormData({
        categoria: "outros",
        descricao: "",
        valor: "",
        data: new Date().toISOString().split("T")[0],
        recorrente: false,
        pessoas_ids: [],
        dividir_igualmente: true,
      });
      setIncludeMeInGasto(false);
      setShowForm(false);
      loadGastos();
    } catch (error) {
      console.error("Erro ao adicionar gasto:", error);
      toast.error("Erro ao adicionar gasto");
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
      loadGastos();
    } catch (error) {
      console.error("Erro ao deletar gasto:", error);
      toast.error("Erro ao deletar gasto");
    }
  };

  const handleEditClick = (gasto: GastoGeral) => {
    setGastoToEdit(gasto);
    const pessoasIds = (gasto.pessoas || []).map((p) => p.pessoa_id);
    setEditFormData({
      categoria: gasto.categoria,
      descricao: gasto.descricao,
      valor: gasto.valor?.toString() || "",
      data: gasto.data || new Date().toISOString().split("T")[0],
      recorrente: gasto.recorrente || false,
      pessoas_ids: pessoasIds,
      dividir_igualmente: gasto.dividir_igualmente ?? true,
    });
    setIncludeMeInEdit(mePessoaId ? pessoasIds.includes(mePessoaId) : false);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!gastoToEdit) return;

    if (gastoToEdit.recorrente && editFormData.recorrente) {
      setEditDialogOpen(false);
      setEditScopeDialogOpen(true);
    } else {
      confirmEdit("current");
    }
  };

  const confirmEdit = async (scope: "current" | "all") => {
    if (!gastoToEdit) return;

    try {
      const valor = parseFloat(editFormData.valor);
      const pessoasExistentes = gastoToEdit.pessoas || [];
      const pessoas =
        editFormData.pessoas_ids.length > 0
          ? editFormData.pessoas_ids.map((pessoa_id) => {
              const pessoaExistente = pessoasExistentes.find((p) => p.pessoa_id === pessoa_id);
              return {
                pessoa_id,
                valor_individual: editFormData.dividir_igualmente
                  ? valor / editFormData.pessoas_ids.length
                  : pessoaExistente?.valor_individual || 0,
                pago: pessoaExistente?.pago || false,
              };
            })
          : undefined;

      await api.gastoGeral.update(gastoToEdit.id, {
        categoria: editFormData.categoria,
        descricao: editFormData.descricao,
        valor: valor,
        data: editFormData.data,
        recorrente: editFormData.recorrente,
        editar_proximas: scope === "all",
        pessoas: pessoas,
        dividir_igualmente: editFormData.dividir_igualmente,
      });

      toast.success(
        scope === "all"
          ? "Gasto atualizado neste mês e nos próximos"
          : "Gasto atualizado com sucesso"
      );
      setEditDialogOpen(false);
      setEditScopeDialogOpen(false);
      setGastoToEdit(null);
      loadGastos();
    } catch (error) {
      console.error("Erro ao editar gasto:", error);
      toast.error("Erro ao editar gasto");
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + (g.valor || 0), 0);

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Gastos Gerais</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Novo Gasto</span>
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total de Gastos - {formatMonth(mesSelecionado)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalGastos)}</p>
          <p className="text-sm text-gray-500 mt-1">{gastos.length} gasto(s) registrado(s)</p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Gasto Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
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
                  placeholder="Ex: Conta de luz de abril"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  required
                />
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
                <Label>Pessoas (opcional - para dividir o gasto)</Label>
                {mePessoaId && (
                  <div className="flex items-center gap-2 mt-2 mb-3 p-2 bg-blue-50 rounded-md">
                    <input
                      id="includeMeCreate"
                      type="checkbox"
                      checked={includeMeInGasto}
                      onChange={(e) => setIncludeMeInGasto(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="includeMeCreate" className="text-sm font-medium text-blue-900 cursor-pointer">
                      Me incluir neste gasto
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {pessoas
                    .filter((pessoa) => pessoa && pessoa.id && pessoa.nome && pessoa.id !== mePessoaId)
                    .map((pessoa) => (
                      <button
                        key={pessoa.id}
                        type="button"
                        onClick={() => togglePessoaSelection(pessoa.id, "create")}
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
                {formData.pessoas_ids.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <p>
                      Valor por pessoa: {formatCurrency(parseFloat(formData.valor || "0") / formData.pessoas_ids.length)}
                    </p>
                    {includeMeInGasto && (
                      <p className="text-blue-600 font-medium">
                        Seu gasto será: {formatCurrency(parseFloat(formData.valor || "0") / formData.pessoas_ids.length)}
                      </p>
                    )}
                    {!includeMeInGasto && (
                      <p className="text-orange-600 font-medium">
                        Este valor não aparecerá nos seus gastos (só nas dívidas das outras pessoas)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="recorrente"
                  type="checkbox"
                  checked={formData.recorrente}
                  onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="recorrente" className="cursor-pointer">
                  Gasto recorrente (adicionar em todos os meses seguintes)
                </Label>
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

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Gastos - {formatMonth(mesSelecionado)}</CardTitle>
        </CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum gasto cadastrado. Clique em "Novo Gasto" para adicionar.
            </p>
          ) : (
            <div className="space-y-2">
              {gastos
                .filter((gasto) => gasto && gasto.id)
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map((gasto) => {
                  const catInfo = getCategoriaInfo(gasto.categoria);
                  const IconComponent = catInfo.icon;
                  const pessoas = gasto.pessoas || [];
                  const todasPagas = pessoas.length > 0 && pessoas.every((p) => p.pago);
                  return (
                    <div
                      key={gasto.id}
                      className={`p-3 sm:p-4 rounded-md border-2 ${
                        todasPagas ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          {todasPagas ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <IconComponent className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <p className="font-medium text-sm sm:text-base">
                                {gasto.descricao}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {gasto.recorrente && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Recorrente
                                  </span>
                                )}
                                {todasPagas && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Pago
                                  </span>
                                )}
                                {pessoas.length > 0 && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Dividido ({pessoas.length})
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              {catInfo.label} •{" "}
                              {gasto.data
                                ? new Date(gasto.data + "T00:00:00").toLocaleDateString("pt-BR")
                                : "Data não definida"}
                            </p>
                            {pessoas.length > 0 && (
                              <div className="mt-2 space-y-1.5 bg-white bg-opacity-60 rounded p-2">
                                <p className="text-xs font-medium text-gray-700">Divisão:</p>
                                {pessoas.map((pd) => (
                                  <div
                                    key={pd.pessoa_id}
                                    className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1.5 text-xs sm:text-sm"
                                  >
                                    <span className="text-gray-700 font-medium">{getPessoaNome(pd.pessoa_id)}</span>
                                    <div className="flex items-center justify-between xs:justify-end gap-2 sm:gap-3">
                                      <span className="font-semibold">{formatCurrency(pd.valor_individual)}</span>
                                      <button
                                        onClick={() => handleMarcarPago(gasto.id, pd.pessoa_id, pd.pago)}
                                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                                          pd.pago
                                            ? "bg-green-600 text-white hover:bg-green-700"
                                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        }`}
                                      >
                                        {pd.pago ? "Pago" : "Pendente"}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 flex-shrink-0">
                          <div className="text-left sm:text-right">
                            <p className="text-base sm:text-lg font-semibold text-red-600">
                              {formatCurrency(gasto.valor || 0)}
                            </p>
                            {pessoas.length > 0 && (
                              <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                                Minha parte
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEditClick(gasto)}
                              className="text-blue-600 hover:text-blue-700 p-1.5 sm:p-2 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(gasto.id)}
                              className="text-red-600 hover:text-red-700 p-1.5 sm:p-2 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editScopeDialogOpen} onOpenChange={setEditScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto recorrente</DialogTitle>
            <DialogDescription>
              Este é um gasto recorrente. Como deseja editá-lo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => confirmEdit("current")} className="w-full">
              Editar apenas este mês
            </Button>
            <Button onClick={() => confirmEdit("all")} variant="outline" className="w-full">
              Editar este mês e todos os próximos
            </Button>
            <Button variant="outline" onClick={() => setEditScopeDialogOpen(false)} className="w-full">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
            <DialogDescription>Altere os valores do gasto abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select
                value={editFormData.categoria}
                onValueChange={(value) => setEditFormData({ ...editFormData, categoria: value })}
              >
                <SelectTrigger>
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
                placeholder="Ex: Conta de luz de abril"
                value={editFormData.descricao}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
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
            </div>
            <div>
              <Label>Pessoas (opcional - para dividir o gasto)</Label>
              {mePessoaId && (
                <div className="flex items-center gap-2 mt-2 mb-3 p-2 bg-blue-50 rounded-md">
                  <input
                    id="includeMeEdit"
                    type="checkbox"
                    checked={includeMeInEdit}
                    onChange={(e) => setIncludeMeInEdit(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeMeEdit" className="text-sm font-medium text-blue-900 cursor-pointer">
                    Me incluir neste gasto
                  </label>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {pessoas
                  .filter((pessoa) => pessoa && pessoa.id && pessoa.nome && pessoa.id !== mePessoaId)
                  .map((pessoa) => (
                    <button
                      key={pessoa.id}
                      type="button"
                      onClick={() => togglePessoaSelection(pessoa.id, "edit")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        editFormData.pessoas_ids.includes(pessoa.id)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {pessoa.nome}
                    </button>
                  ))}
              </div>
              {editFormData.pessoas_ids.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>
                    Valor por pessoa:{" "}
                    {formatCurrency(parseFloat(editFormData.valor || "0") / editFormData.pessoas_ids.length)}
                  </p>
                  {includeMeInEdit && (
                    <p className="text-blue-600 font-medium">
                      Seu gasto será: {formatCurrency(parseFloat(editFormData.valor || "0") / editFormData.pessoas_ids.length)}
                    </p>
                  )}
                  {!includeMeInEdit && (
                    <p className="text-orange-600 font-medium">
                      Este valor não aparecerá nos seus gastos (só nas dívidas das outras pessoas)
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-recorrente"
                type="checkbox"
                checked={editFormData.recorrente}
                onChange={(e) => setEditFormData({ ...editFormData, recorrente: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="edit-recorrente" className="cursor-pointer">
                Gasto recorrente
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este gasto? Esta ação não pode ser desfeita.
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
