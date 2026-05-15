import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { useAuth } from "../../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, User, Edit, Trash2, Users, DollarSign } from "lucide-react";

interface Pessoa {
  id: string;
  nome: string;
}

interface PessoaDivida {
  pessoa_id: string;
  valor_individual: number;
  pago: boolean;
}

interface Cartao {
  id: string;
  nome: string;
}

interface GastoGeral {
  id: string;
  descricao: string;
  categoria: string;
}

interface Divida {
  id: string;
  valor_total: number;
  valor_parcela?: number;
  descricao: string;
  data: string;
  observacoes?: string;
  pessoas: PessoaDivida[];
  dividir_igualmente: boolean;
  origem_tipo?: "cartao" | "gasto_geral";
  cartao_id?: string;
  gasto_geral_id?: string;
  parcelado?: boolean;
  numero_parcela?: number;
  total_parcelas?: number;
  divida_pai_id?: string;
}

export function DevedoresTab() {
  const { mesSelecionado } = useMes();
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [gastosGerais, setGastosGerais] = useState<GastoGeral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"overview" | "pessoa">("overview");
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  const [showPessoaForm, setShowPessoaForm] = useState(false);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);

  // Estados para editar/excluir pessoa
  const [editPessoaDialogOpen, setEditPessoaDialogOpen] = useState(false);
  const [deletePessoaDialogOpen, setDeletePessoaDialogOpen] = useState(false);
  const [pessoaToEdit, setPessoaToEdit] = useState<Pessoa | null>(null);
  const [pessoaToDelete, setPessoaToDelete] = useState<string | null>(null);
  const [editPessoaNome, setEditPessoaNome] = useState("");

  const [pessoaFormData, setPessoaFormData] = useState({ nome: "" });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  const loadData = async () => {
    try {
      const [pessoasRes, dividasRes, cartoesRes, gastosRes] = await Promise.all([
        api.pessoa.list(),
        api.divida.list(),
        api.cartao.list(),
        api.gastoGeral.list(mesSelecionado),
      ]);
      const pessoasList = pessoasRes.data as Pessoa[];
      setPessoas(pessoasList);
      const dividasList = dividasRes.data as Divida[];
      console.log("🔍 DEBUG - Total de dívidas carregadas:", dividasList.length);
      console.log("🔍 DEBUG - Dívidas:", dividasList);
      setDividas(dividasList);
      setCartoes(cartoesRes.data as Cartao[]);
      setGastosGerais(gastosRes.data as GastoGeral[]);

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
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePessoaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pessoaFormData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      await api.pessoa.create({ nome: pessoaFormData.nome });
      toast.success("Pessoa adicionada com sucesso");
      setPessoaFormData({ nome: "" });
      setShowPessoaForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar pessoa:", error);
      toast.error("Erro ao adicionar pessoa");
    }
  };

  const handleEditPessoaClick = (pessoa: Pessoa) => {
    setPessoaToEdit(pessoa);
    setEditPessoaNome(pessoa.nome);
    setEditPessoaDialogOpen(true);
  };

  const handleEditPessoaSubmit = async () => {
    if (!pessoaToEdit) return;

    if (!editPessoaNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      await api.pessoa.update(pessoaToEdit.id, { nome: editPessoaNome });
      toast.success("Pessoa atualizada com sucesso");
      setEditPessoaDialogOpen(false);
      setPessoaToEdit(null);
      setEditPessoaNome("");
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar pessoa:", error);
      toast.error("Erro ao atualizar pessoa");
    }
  };

  const handleDeletePessoaClick = (pessoaId: string) => {
    setPessoaToDelete(pessoaId);
    setDeletePessoaDialogOpen(true);
  };

  const confirmDeletePessoa = async () => {
    if (!pessoaToDelete) return;

    try {
      // Sempre remover vínculos (apagar todas as dívidas da pessoa)
      await api.pessoa.delete(`${pessoaToDelete}?remover_vinculos=true`);
      toast.success("Pessoa e suas dívidas excluídas com sucesso");
      setDeletePessoaDialogOpen(false);
      setPessoaToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir pessoa:", error);
      toast.error("Erro ao excluir pessoa");
    }
  };

  const handleMarcarPago = async (dividaId: string, pessoaId: string, pago: boolean) => {
    try {
      await api.divida.update(dividaId, {
        marcar_pago_pessoa: true,
        pessoa_id: pessoaId,
        pago: !pago,
      });
      toast.success(pago ? "Pagamento desmarcado" : "Marcado como pago");
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar dívida:", error);
      toast.error("Erro ao atualizar dívida");
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

  const getCartaoNome = (id: string) => {
    return cartoes.find((c) => c.id === id)?.nome || "Cartão removido";
  };

  const getGastoGeralDescricao = (id: string) => {
    const gasto = gastosGerais.find((g) => g.id === id);
    return gasto ? `${gasto.descricao} (${gasto.categoria})` : "Gasto removido";
  };

  const getOrigemNome = (divida: Divida) => {
    if (divida.origem_tipo === "cartao" && divida.cartao_id) {
      return getCartaoNome(divida.cartao_id);
    } else if (divida.origem_tipo === "gasto_geral" && divida.gasto_geral_id) {
      return getGastoGeralDescricao(divida.gasto_geral_id);
    }
    return "Origem não definida";
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const handlePessoaClick = (pessoaId: string) => {
    setSelectedPessoaId(pessoaId);
    setViewMode("pessoa");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedPessoaId(null);
  };

  // Resumo do mês selecionado
  const getDividasDoMesPorPessoa = () => {
    const resumo: Record<string, { totalMes: number; pendenteMes: number; pagoMes: number; dividasMes: number }> = {};

    pessoas.forEach((pessoa) => {
      resumo[pessoa.id] = {
        totalMes: 0,
        pendenteMes: 0,
        pagoMes: 0,
        dividasMes: 0,
      };
    });

    // Filtrar apenas dívidas do mês selecionado
    const dividasDoMes = dividas.filter((divida) => {
      if (!divida.data) return false;
      const mesDivida = divida.data.substring(0, 7);
      return mesDivida === mesSelecionado;
    });

    console.log("🔍 DEBUG - Mês selecionado:", mesSelecionado);
    console.log("🔍 DEBUG - Dívidas do mês filtradas:", dividasDoMes.length);
    console.log("🔍 DEBUG - Dívidas do mês:", dividasDoMes);

    dividasDoMes.forEach((divida) => {
      if (!divida.pessoas || !Array.isArray(divida.pessoas)) {
        console.log("⚠️ AVISO - Dívida sem pessoas:", divida);
        return;
      }

      divida.pessoas.forEach((pd) => {
        if (resumo[pd.pessoa_id]) {
          resumo[pd.pessoa_id].totalMes += pd.valor_individual;
          if (pd.pago) {
            resumo[pd.pessoa_id].pagoMes += pd.valor_individual;
          } else {
            resumo[pd.pessoa_id].pendenteMes += pd.valor_individual;
          }
          resumo[pd.pessoa_id].dividasMes++;
        }
      });
    });

    console.log("🔍 DEBUG - Resumo calculado:", resumo);
    return resumo;
  };

  // Resumo total (todas as dívidas)
  const getTotalGeralPorPessoa = () => {
    const resumo: Record<string, { totalGeral: number }> = {};

    pessoas.forEach((pessoa) => {
      resumo[pessoa.id] = {
        totalGeral: 0,
      };
    });

    dividas.forEach((divida) => {
      if (!divida.pessoas || !Array.isArray(divida.pessoas)) {
        return;
      }

      divida.pessoas.forEach((pd) => {
        if (resumo[pd.pessoa_id]) {
          resumo[pd.pessoa_id].totalGeral += pd.valor_individual;
        }
      });
    });

    return resumo;
  };

  const dividasDoMesPorPessoa = getDividasDoMesPorPessoa();
  const totalGeralPorPessoa = getTotalGeralPorPessoa();
  const selectedPessoa = pessoas.find((p) => p.id === selectedPessoaId);

  // Filtrar dívidas do mês selecionado para detalhes da pessoa
  const dividasDoMes = dividas.filter((divida) => {
    if (!divida.data) return false;
    const mesDivida = divida.data.substring(0, 7); // "YYYY-MM"
    return mesDivida === mesSelecionado;
  });

  const dividasFiltradas = selectedPessoaId
    ? dividasDoMes.filter((divida) =>
        divida.pessoas && divida.pessoas.some((p) => p.pessoa_id === selectedPessoaId)
      )
    : dividasDoMes;

  // Debug para pessoa selecionada
  if (selectedPessoaId) {
    console.log("🔍 DEBUG - Pessoa selecionada:", selectedPessoaId);
    console.log("🔍 DEBUG - Nome da pessoa:", getPessoaNome(selectedPessoaId));
    console.log("🔍 DEBUG - Total dívidas do mês:", dividasDoMes.length);
    console.log("🔍 DEBUG - Dívidas filtradas para pessoa:", dividasFiltradas.length);
    console.log("🔍 DEBUG - Dívidas filtradas:", dividasFiltradas);

    // Debug detalhado de cada dívida
    dividasFiltradas.forEach((divida, idx) => {
      console.log(`📝 DÍVIDA ${idx + 1}:`, {
        id: divida.id,
        descricao: divida.descricao,
        data: divida.data,
        valor_total: divida.valor_total,
        pessoas: divida.pessoas,
        parcelado: divida.parcelado,
        numero_parcela: divida.numero_parcela,
        total_parcelas: divida.total_parcelas,
      });

      // Verificar se a pessoa está na lista
      const pessoaDivida = divida.pessoas?.find((p) => p.pessoa_id === selectedPessoaId);
      console.log(`   👤 Dados da pessoa nesta dívida:`, pessoaDivida);
    });
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Pessoas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Gerencie pessoas e visualize suas dívidas</p>
        </div>
        <button
          onClick={() => setShowPessoaForm(!showPessoaForm)}
          className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova Pessoa</span>
          <span className="sm:hidden text-xs">Pessoa</span>
        </button>
      </div>

      {viewMode === "pessoa" && (
        <button
          onClick={handleBackToOverview}
          className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Voltar para listagem
        </button>
      )}

      {showPessoaForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Pessoa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePessoaSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Nome da pessoa"
                  value={pessoaFormData.nome}
                  onChange={(e) => setPessoaFormData({ nome: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setShowPessoaForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {viewMode === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {pessoas
            .filter((pessoa) => pessoa && pessoa.id && pessoa.nome)
            .map((pessoa) => {
              const resumoMes = dividasDoMesPorPessoa[pessoa.id] || { totalMes: 0, pendenteMes: 0, pagoMes: 0, dividasMes: 0 };
              const resumoGeral = totalGeralPorPessoa[pessoa.id] || { totalGeral: 0 };

              return (
                <Card
                  key={pessoa.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handlePessoaClick(pessoa.id)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {getPessoaNome(pessoa.id)}
                    </CardTitle>
                    {pessoa.nome !== "Eu" && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditPessoaClick(pessoa)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded-md transition-colors"
                          title="Editar pessoa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePessoaClick(pessoa.id)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded-md transition-colors"
                          title="Excluir pessoa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="font-bold text-blue-600">{formatCurrency(resumoMes.totalMes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Pago</p>
                          <p className="font-bold text-green-600">{formatCurrency(resumoMes.pagoMes)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Pendente</p>
                          <p className="font-bold text-red-600">{formatCurrency(resumoMes.pendenteMes)}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t text-sm">
                        <span className="text-gray-600">{resumoMes.dividasMes} {resumoMes.dividasMes === 1 ? "dívida" : "dívidas"}</span>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total geral</p>
                          <p className="font-bold text-gray-700">{formatCurrency(resumoGeral.totalGeral)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {viewMode === "pessoa" && selectedPessoa && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6" />
                Dívidas de {getPessoaNome(selectedPessoa.id)} - {formatMonth(mesSelecionado)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dividasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma dívida neste mês</p>
                  <p className="text-xs text-gray-400 mt-2">As dívidas são criadas automaticamente através de Cartões e Gastos Gerais</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dividasFiltradas
                    .filter((divida) => divida && divida.id)
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .map((divida) => {
                      const pessoaData = divida.pessoas?.find((p) => p.pessoa_id === selectedPessoaId);
                      if (!pessoaData) {
                        console.log("⚠️ AVISO - Dívida sem pessoaData encontrada:", {
                          dividaId: divida.id,
                          descricao: divida.descricao,
                          pessoas: divida.pessoas,
                          selectedPessoaId,
                        });
                        return null;
                      }

                      const pessoas = divida.pessoas || [];
                      const todasPagas = pessoas.length > 0 && pessoas.every((p) => p.pago);
                      const pessoasNomes = pessoas.map((p) => getPessoaNome(p.pessoa_id)).join(", ");

                      return (
                        <div
                          key={divida.id}
                          className={`p-4 rounded-md border-2 ${
                            todasPagas ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {pessoas.length > 1 && (
                                  <Users className="h-4 w-4 text-blue-600" />
                                )}
                                <p className="font-semibold text-lg">
                                  {divida.descricao || "Sem descrição"}
                                  {divida.parcelado && divida.numero_parcela && divida.total_parcelas && (
                                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                      Parcela {divida.numero_parcela}/{divida.total_parcelas}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p className="text-sm text-gray-600">{pessoasNomes}</p>
                              <p className="text-xs text-blue-600 font-medium">Origem: {getOrigemNome(divida)}</p>
                              <p className="text-xs text-gray-500">
                                {divida.data
                                  ? new Date(divida.data + "T00:00:00").toLocaleDateString("pt-BR")
                                  : "Data não definida"}
                              </p>
                              {divida.observacoes && (
                                <p className="text-xs text-gray-600 mt-1 italic">Obs: {divida.observacoes}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <p className="font-bold text-lg">{formatCurrency(pessoaData.valor_individual || 0)}</p>
                            </div>
                          </div>

                          {pessoas.length > 0 && (
                            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                              {pessoas.map((pd) => (
                                <div
                                  key={pd.pessoa_id}
                                  className="flex justify-between items-center text-sm"
                                >
                                  <span className="text-gray-700">{getPessoaNome(pd.pessoa_id)}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{formatCurrency(pd.valor_individual)}</span>
                                    <button
                                      onClick={() => handleMarcarPago(divida.id, pd.pessoa_id, pd.pago)}
                                      className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                                        pd.pago
                                          ? "bg-green-200 text-green-800 hover:bg-green-300"
                                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                      }`}
                                    >
                                      {pd.pago ? "✓ Pago" : "Pendente"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog para editar pessoa */}
      <Dialog open={editPessoaDialogOpen} onOpenChange={setEditPessoaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pessoa</DialogTitle>
            <DialogDescription>
              Altere o nome da pessoa abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-pessoa-nome">Nome</Label>
              <Input
                id="edit-pessoa-nome"
                type="text"
                placeholder="Nome da pessoa"
                value={editPessoaNome}
                onChange={(e) => setEditPessoaNome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPessoaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPessoaSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para excluir pessoa */}
      <Dialog open={deletePessoaDialogOpen} onOpenChange={setDeletePessoaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta pessoa? Todas as dívidas vinculadas a ela também serão excluídas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePessoaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeletePessoa}>
              Excluir pessoa e dívidas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
