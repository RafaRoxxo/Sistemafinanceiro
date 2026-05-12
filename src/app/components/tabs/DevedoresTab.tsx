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
import { Plus, User, CheckCircle, Edit, Trash2, Users, DollarSign } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"overview" | "pessoa" | "allDividas">("overview");
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  const [showPessoaForm, setShowPessoaForm] = useState(false);
  const [showDividaForm, setShowDividaForm] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editScopeDialogOpen, setEditScopeDialogOpen] = useState(false);
  const [dividaToEdit, setDividaToEdit] = useState<Divida | null>(null);
  const [dividaToDelete, setDividaToDelete] = useState<string | null>(null);
  const [mePessoaId, setMePessoaId] = useState<string | null>(null);
  const [includeMeInDebt, setIncludeMeInDebt] = useState(false);
  const [includeMeInEdit, setIncludeMeInEdit] = useState(false);
  
  // Estados para editar/excluir pessoa
  const [editPessoaDialogOpen, setEditPessoaDialogOpen] = useState(false);
  const [deletePessoaDialogOpen, setDeletePessoaDialogOpen] = useState(false);
  const [pessoaToEdit, setPessoaToEdit] = useState<Pessoa | null>(null);
  const [pessoaToDelete, setPessoaToDelete] = useState<string | null>(null);
  const [editPessoaNome, setEditPessoaNome] = useState("");

  const [pessoaFormData, setPessoaFormData] = useState({ nome: "" });
  const [dividaFormData, setDividaFormData] = useState({
    pessoas_ids: [] as string[],
    valor_total: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
    observacoes: "",
    dividir_igualmente: true,
    origem_tipo: "cartao" as "cartao" | "gasto_geral",
    cartao_id: "",
    gasto_geral_id: "",
    parcelado: false,
    total_parcelas: "1",
    parcela_atual: "1",
    criar_parcelas_anteriores: true,
    parcelas_anteriores_pagas: "perguntar" as "pagas" | "pendentes" | "perguntar",
  });

  const [editFormData, setEditFormData] = useState({
    pessoas_ids: [] as string[],
    valor_total: "",
    descricao: "",
    data: "",
    observacoes: "",
    dividir_igualmente: true,
    origem_tipo: "cartao" as "cartao" | "gasto_geral",
    cartao_id: "",
    gasto_geral_id: "",
    parcelado: false,
    total_parcelas: "1",
    parcela_atual: "1",
  });

  useEffect(() => {
    loadData();
  }, [mesSelecionado]);

  // Sincronizar checkbox "Me incluir" com pessoas_ids no formulário de criação
  useEffect(() => {
    if (includeMeInDebt && mePessoaId && !dividaFormData.pessoas_ids.includes(mePessoaId)) {
      setDividaFormData({ ...dividaFormData, pessoas_ids: [...dividaFormData.pessoas_ids, mePessoaId] });
    } else if (!includeMeInDebt && mePessoaId && dividaFormData.pessoas_ids.includes(mePessoaId)) {
      setDividaFormData({
        ...dividaFormData,
        pessoas_ids: dividaFormData.pessoas_ids.filter((id) => id !== mePessoaId),
      });
    }
  }, [includeMeInDebt, mePessoaId]);

  // Sincronizar checkbox "Me incluir" com pessoas_ids no formulário de edição
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
      setDividas(dividasRes.data as Divida[]);
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

  const toggleDividaForm = () => {
    setShowDividaForm(!showDividaForm);
    setIncludeMeInDebt(false);
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
      await api.pessoa.delete(pessoaToDelete);
      toast.success("Pessoa excluída com sucesso");
      setDeletePessoaDialogOpen(false);
      setPessoaToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir pessoa:", error);
      toast.error("Erro ao excluir pessoa");
    }
  };

  const handleDividaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dividaFormData.pessoas_ids.length === 0) {
      toast.error("Selecione pelo menos uma pessoa");
      return;
    }

    if (!dividaFormData.valor_total || parseFloat(dividaFormData.valor_total) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (dividaFormData.origem_tipo === "cartao" && !dividaFormData.cartao_id) {
      toast.error("Selecione um cartão");
      return;
    }

    if (dividaFormData.origem_tipo === "gasto_geral" && !dividaFormData.gasto_geral_id) {
      toast.error("Selecione um gasto geral");
      return;
    }

    try {
      const valorTotal = parseFloat(dividaFormData.valor_total);
      const totalParcelas = parseInt(dividaFormData.total_parcelas);
      const parcelaAtual = parseInt(dividaFormData.parcela_atual);

      if (dividaFormData.parcelado && parcelaAtual > totalParcelas) {
        toast.error("Parcela atual não pode ser maior que total de parcelas");
        return;
      }

      const valorParcela = dividaFormData.parcelado ? valorTotal / totalParcelas : valorTotal;

      const pessoas = dividaFormData.pessoas_ids.map((pessoa_id) => ({
        pessoa_id,
        valor_individual: dividaFormData.dividir_igualmente
          ? valorParcela / dividaFormData.pessoas_ids.length
          : 0,
        pago: false,
      }));

      await api.divida.create({
        valor_total: valorTotal,
        valor_parcela: valorParcela,
        descricao: dividaFormData.descricao,
        data: dividaFormData.data,
        observacoes: dividaFormData.observacoes,
        pessoas,
        dividir_igualmente: dividaFormData.dividir_igualmente,
        origem_tipo: dividaFormData.origem_tipo,
        cartao_id: dividaFormData.origem_tipo === "cartao" ? dividaFormData.cartao_id : undefined,
        gasto_geral_id: dividaFormData.origem_tipo === "gasto_geral" ? dividaFormData.gasto_geral_id : undefined,
        parcelado: dividaFormData.parcelado,
        total_parcelas: dividaFormData.parcelado ? totalParcelas : 1,
        parcela_atual: dividaFormData.parcelado ? parcelaAtual : 1,
        criar_parcelas_anteriores: dividaFormData.parcelado && parcelaAtual > 1 ? dividaFormData.criar_parcelas_anteriores : false,
        parcelas_anteriores_pagas: dividaFormData.parcelas_anteriores_pagas === "pagas",
      });

      const totalParcelasCriadas = dividaFormData.parcelado 
        ? (dividaFormData.criar_parcelas_anteriores && parcelaAtual > 1 
            ? totalParcelas 
            : totalParcelas - parcelaAtual + 1)
        : 1;
      
      toast.success(
        dividaFormData.parcelado
          ? `Dívida parcelada adicionada (${totalParcelasCriadas} parcelas criadas)`
          : "Dívida adicionada com sucesso"
      );
      setDividaFormData({
        pessoas_ids: [],
        valor_total: "",
        descricao: "",
        data: new Date().toISOString().split("T")[0],
        observacoes: "",
        dividir_igualmente: true,
        origem_tipo: "cartao",
        cartao_id: "",
        gasto_geral_id: "",
        parcelado: false,
        total_parcelas: "1",
        parcela_atual: "1",
        criar_parcelas_anteriores: true,
        parcelas_anteriores_pagas: "perguntar",
      });
      setIncludeMeInDebt(false);
      setShowDividaForm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar dívida:", error);
      toast.error("Erro ao adicionar dívida");
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

  const handleEditClick = (divida: Divida) => {
    setDividaToEdit(divida);
    // Se for parcelada, usar valor_parcela ao invés de valor_total
    const valorParaEditar = divida.parcelado && divida.valor_parcela
      ? divida.valor_parcela
      : divida.valor_total;

    const pessoasIds = (divida.pessoas || []).map((p) => p.pessoa_id);
    setEditFormData({
      pessoas_ids: pessoasIds,
      valor_total: valorParaEditar?.toString() || "",
      descricao: divida.descricao || "",
      data: divida.data || new Date().toISOString().split("T")[0],
      observacoes: divida.observacoes || "",
      dividir_igualmente: divida.dividir_igualmente ?? true,
      origem_tipo: divida.origem_tipo || "cartao",
      cartao_id: divida.cartao_id || "",
      gasto_geral_id: divida.gasto_geral_id || "",
      parcelado: divida.parcelado || false,
      total_parcelas: divida.total_parcelas?.toString() || "1",
      parcela_atual: divida.numero_parcela?.toString() || "1",
    });
    // Definir estado do checkbox "Me incluir" com base se mePessoaId está nas pessoas
    setIncludeMeInEdit(mePessoaId ? pessoasIds.includes(mePessoaId) : false);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!dividaToEdit) return;

    if (editFormData.pessoas_ids.length === 0) {
      toast.error("Selecione pelo menos uma pessoa");
      return;
    }

    if (!editFormData.valor_total || parseFloat(editFormData.valor_total) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (editFormData.origem_tipo === "cartao" && !editFormData.cartao_id) {
      toast.error("Selecione um cartão");
      return;
    }

    if (editFormData.origem_tipo === "gasto_geral" && !editFormData.gasto_geral_id) {
      toast.error("Selecione um gasto geral");
      return;
    }

    // Validar parcela atual
    const parcelaAtual = parseInt(editFormData.parcela_atual);
    const totalParcelas = parseInt(editFormData.total_parcelas);
    if (parcelaAtual < 1 || parcelaAtual > totalParcelas) {
      toast.error(`Parcela atual deve estar entre 1 e ${totalParcelas}`);
      return;
    }

    // Se for uma dívida parcelada, perguntar escopo
    if (dividaToEdit.parcelado && dividaToEdit.divida_pai_id) {
      setEditDialogOpen(false);
      setEditScopeDialogOpen(true);
    } else {
      confirmEdit("current");
    }
  };

  const confirmEdit = async (scope: "current" | "all") => {
    if (!dividaToEdit) return;

    try {
      const valorEditado = parseFloat(editFormData.valor_total);
      const totalParcelas = parseInt(editFormData.total_parcelas);

      // Se for parcelada, valorEditado já é o valor da parcela
      // Se não for parcelada, valorEditado é o valor total
      const valorParcela = dividaToEdit.parcelado ? valorEditado : valorEditado;
      const valorTotal = dividaToEdit.parcelado
        ? dividaToEdit.valor_total // Manter o valor total original
        : valorEditado;

      const pessoasExistentes = dividaToEdit.pessoas || [];
      const pessoas = editFormData.pessoas_ids.map((pessoa_id) => {
        const pessoaExistente = pessoasExistentes.find((p) => p.pessoa_id === pessoa_id);
        return {
          pessoa_id,
          valor_individual: editFormData.dividir_igualmente
            ? valorParcela / editFormData.pessoas_ids.length
            : pessoaExistente?.valor_individual || 0,
          pago: pessoaExistente?.pago || false,
        };
      });

      await api.divida.update(dividaToEdit.id, {
        valor_total: valorTotal,
        valor_parcela: valorParcela,
        descricao: editFormData.descricao,
        data: editFormData.data,
        observacoes: editFormData.observacoes,
        pessoas,
        dividir_igualmente: editFormData.dividir_igualmente,
        origem_tipo: editFormData.origem_tipo,
        cartao_id: editFormData.origem_tipo === "cartao" ? editFormData.cartao_id : undefined,
        gasto_geral_id: editFormData.origem_tipo === "gasto_geral" ? editFormData.gasto_geral_id : undefined,
        parcelado: dividaToEdit.parcelado, // Manter valor original, não permitir alterar
        total_parcelas: totalParcelas,
        numero_parcela: parseInt(editFormData.parcela_atual), // Atualizar número da parcela
        editar_proximas: scope === "all",
        divida_pai_id: dividaToEdit.divida_pai_id,
        nova_parcela_atual: parseInt(editFormData.parcela_atual),
        parcela_atual_original: dividaToEdit.numero_parcela,
      });

      toast.success(
        scope === "all"
          ? "Dívida atualizada nesta parcela e nas próximas"
          : "Dívida atualizada com sucesso"
      );
      setEditDialogOpen(false);
      setEditScopeDialogOpen(false);
      setDividaToEdit(null);
      loadData();
    } catch (error) {
      console.error("Erro ao editar dívida:", error);
      toast.error("Erro ao editar dívida");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDividaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!dividaToDelete) return;

    try {
      await api.divida.delete(dividaToDelete);
      toast.success("Dívida deletada com sucesso");
      setDeleteDialogOpen(false);
      setDividaToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao deletar dívida:", error);
      toast.error("Erro ao deletar dívida");
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
      return `Cartão: ${getCartaoNome(divida.cartao_id)}`;
    } else if (divida.origem_tipo === "gasto_geral" && divida.gasto_geral_id) {
      return `Gasto Geral: ${getGastoGeralDescricao(divida.gasto_geral_id)}`;
    }
    return "Origem não definida";
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const togglePessoaSelection = (pessoaId: string, formType: "create" | "edit") => {
    if (formType === "create") {
      setDividaFormData((prev) => ({
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

  const handlePessoaClick = (pessoaId: string) => {
    setSelectedPessoaId(pessoaId);
    setViewMode("pessoa");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedPessoaId(null);
  };

  // Visão por pessoa - FILTRADO PELO MÊS SELECIONADO
  const getDividasPorPessoa = () => {
    const resumo: Record<string, { total: number; pendente: number; pago: number; dividas: any[] }> = {};

    pessoas.forEach((pessoa) => {
      resumo[pessoa.id] = {
        total: 0,
        pendente: 0,
        pago: 0,
        dividas: [],
      };
    });

    // Filtrar dívidas pelo mês selecionado
    const dividasDoMes = dividas.filter((divida) => {
      if (!divida.data) return false;
      const mesDivida = divida.data.substring(0, 7); // "YYYY-MM"
      return mesDivida === mesSelecionado;
    });

    dividasDoMes.forEach((divida) => {
      // Garantir que divida.pessoas existe e é um array
      if (!divida.pessoas || !Array.isArray(divida.pessoas)) {
        return;
      }

      divida.pessoas.forEach((pd) => {
        if (resumo[pd.pessoa_id]) {
          resumo[pd.pessoa_id].total += pd.valor_individual;
          if (pd.pago) {
            resumo[pd.pessoa_id].pago += pd.valor_individual;
          } else {
            resumo[pd.pessoa_id].pendente += pd.valor_individual;
          }
          resumo[pd.pessoa_id].dividas.push({
            ...divida,
            valor_individual: pd.valor_individual,
            pago: pd.pago,
          });
        }
      });
    });

    return resumo;
  };

  const dividasPorPessoa = getDividasPorPessoa();
  const selectedPessoa = pessoas.find((p) => p.id === selectedPessoaId);
  
  // Filtrar dívidas pelo mês selecionado primeiro
  const dividasDoMes = dividas.filter((divida) => {
    if (!divida.data) return false;
    const mesDivida = divida.data.substring(0, 7);
    return mesDivida === mesSelecionado;
  });
  
  const dividasFiltradas = selectedPessoaId
    ? dividasDoMes.filter((divida) =>
        divida.pessoas && divida.pessoas.some((p) => p.pessoa_id === selectedPessoaId)
      )
    : dividasDoMes;

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Pessoas & Dívidas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => setShowPessoaForm(!showPessoaForm)}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex-shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Pessoa</span>
            <span className="sm:hidden text-xs">Pessoa</span>
          </button>
          <button
            onClick={() => setViewMode("allDividas")}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex-shrink-0"
          >
            <span className="hidden sm:inline">Ver Todas as Dívidas</span>
            <span className="sm:hidden text-xs">Todas</span>
          </button>
          <button
            onClick={toggleDividaForm}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex-shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Dívida</span>
            <span className="sm:hidden text-xs">Dívida</span>
          </button>
        </div>
      </div>

      {(viewMode === "pessoa" || viewMode === "allDividas") && (
        <button
          onClick={handleBackToOverview}
          className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Voltar para visão geral
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

      {showDividaForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Dívida</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDividaSubmit} className="space-y-4">
              <div>
                <Label>Pessoas (selecione uma ou mais)</Label>
                {mePessoaId && (
                  <div className="flex items-center gap-2 mt-2 mb-3 p-2 bg-blue-50 rounded-md">
                    <input
                      id="includeMe"
                      type="checkbox"
                      checked={includeMeInDebt}
                      onChange={(e) => setIncludeMeInDebt(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="includeMe" className="text-sm font-medium text-blue-900 cursor-pointer">
                      Me incluir nesta dívida
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
                          dividaFormData.pessoas_ids.includes(pessoa.id)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {pessoa.nome}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Aluguel compartilhado, Conta de luz"
                  value={dividaFormData.descricao}
                  onChange={(e) => setDividaFormData({ ...dividaFormData, descricao: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_total">Valor Total</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={dividaFormData.valor_total}
                    onChange={(e) => setDividaFormData({ ...dividaFormData, valor_total: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dividaFormData.data}
                    onChange={(e) => setDividaFormData({ ...dividaFormData, data: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="origem_tipo">Origem da Dívida</Label>
                <Select
                  value={dividaFormData.origem_tipo}
                  onValueChange={(value: "cartao" | "gasto_geral") =>
                    setDividaFormData({ ...dividaFormData, origem_tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="gasto_geral">Gasto Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dividaFormData.origem_tipo === "cartao" && (
                <div>
                  <Label htmlFor="cartao">Cartão</Label>
                  <Select
                    value={dividaFormData.cartao_id}
                    onValueChange={(value) => setDividaFormData({ ...dividaFormData, cartao_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoes
                        .filter((cartao) => cartao && cartao.id && cartao.nome)
                        .map((cartao) => (
                          <SelectItem key={cartao.id} value={cartao.id}>
                            {cartao.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dividaFormData.origem_tipo === "gasto_geral" && (
                <div>
                  <Label htmlFor="gasto_geral">Gasto Geral</Label>
                  <Select
                    value={dividaFormData.gasto_geral_id}
                    onValueChange={(value) => setDividaFormData({ ...dividaFormData, gasto_geral_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um gasto geral" />
                    </SelectTrigger>
                    <SelectContent>
                      {gastosGerais
                        .filter((gasto) => gasto && gasto.id && gasto.descricao)
                        .map((gasto) => (
                          <SelectItem key={gasto.id} value={gasto.id}>
                            {gasto.descricao} - {gasto.categoria}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  type="text"
                  placeholder="Ex: Dinheiro na gaveta, Pix feito"
                  value={dividaFormData.observacoes}
                  onChange={(e) => setDividaFormData({ ...dividaFormData, observacoes: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="parcelado"
                  type="checkbox"
                  checked={dividaFormData.parcelado}
                  onChange={(e) =>
                    setDividaFormData({ ...dividaFormData, parcelado: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="parcelado" className="cursor-pointer">
                  Dívida parcelada (gerar parcelas para os próximos meses)
                </Label>
              </div>

              {dividaFormData.parcelado && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                      <Input
                        id="total_parcelas"
                        type="number"
                        min="2"
                        max="48"
                        value={dividaFormData.total_parcelas}
                        onChange={(e) => setDividaFormData({ ...dividaFormData, total_parcelas: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="parcela_atual">Qual parcela é essa?</Label>
                      <Input
                        id="parcela_atual"
                        type="number"
                        min="1"
                        max={dividaFormData.total_parcelas}
                        value={dividaFormData.parcela_atual}
                        onChange={(e) => setDividaFormData({ ...dividaFormData, parcela_atual: e.target.value })}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Número da parcela que vence em {formatMonth(mesSelecionado)}
                      </p>
                    </div>
                  </div>
                  
                  {parseInt(dividaFormData.parcela_atual) > 1 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
                      <p className="text-sm text-amber-800 font-medium">
                        Esta é a parcela {dividaFormData.parcela_atual} de {dividaFormData.total_parcelas}. 
                        Deseja criar as {parseInt(dividaFormData.parcela_atual) - 1} parcela(s) anterior(es)?
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <input
                          id="criar_parcelas_anteriores"
                          type="checkbox"
                          checked={dividaFormData.criar_parcelas_anteriores}
                          onChange={(e) => setDividaFormData({ ...dividaFormData, criar_parcelas_anteriores: e.target.checked })}
                          className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <Label htmlFor="criar_parcelas_anteriores" className="cursor-pointer text-sm text-amber-800">
                          Criar parcelas anteriores (1 até {parseInt(dividaFormData.parcela_atual) - 1})
                        </Label>
                      </div>

                      {dividaFormData.criar_parcelas_anteriores && (
                        <div className="space-y-2">
                          <Label className="text-sm text-amber-800">Como marcar as parcelas anteriores?</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => setDividaFormData({ ...dividaFormData, parcelas_anteriores_pagas: "pagas" })}
                              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                                dividaFormData.parcelas_anteriores_pagas === "pagas"
                                  ? "bg-green-600 text-white"
                                  : "bg-green-100 text-green-800 hover:bg-green-200"
                              }`}
                            >
                              Já foram pagas
                            </button>
                            <button
                              type="button"
                              onClick={() => setDividaFormData({ ...dividaFormData, parcelas_anteriores_pagas: "pendentes" })}
                              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                                dividaFormData.parcelas_anteriores_pagas === "pendentes"
                                  ? "bg-red-600 text-white"
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }`}
                            >
                              Ainda pendentes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="dividir_igualmente"
                  type="checkbox"
                  checked={dividaFormData.dividir_igualmente}
                  onChange={(e) =>
                    setDividaFormData({ ...dividaFormData, dividir_igualmente: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="dividir_igualmente" className="cursor-pointer">
                  Dividir valor igualmente entre as pessoas
                </Label>
              </div>

              <div className="flex gap-2 flex-col sm:flex-row">
                <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
                <Button type="button" variant="outline" onClick={toggleDividaForm} className="w-full sm:w-auto">
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
              const resumo = dividasPorPessoa[pessoa.id] || { total: 0, pendente: 0, pago: 0, dividas: [] };
              const temDividas = resumo.dividas.length > 0;

              return (
                <Card
                  key={pessoa.id}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${!temDividas ? "opacity-70" : ""}`}
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
                    {temDividas ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-md">
                          <div>
                            <p className="text-xs text-gray-600">Total</p>
                            <p className="font-bold text-blue-600">{formatCurrency(resumo.total)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Pago</p>
                            <p className="font-bold text-green-600">{formatCurrency(resumo.pago)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Pendente</p>
                            <p className="font-bold text-red-600">{formatCurrency(resumo.pendente)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 text-center">
                          {resumo.dividas.length} {resumo.dividas.length === 1 ? "dívida" : "dívidas"}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Sem dívidas neste mês</p>
                      </div>
                    )}
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
                Dívidas de {getPessoaNome(selectedPessoa.id)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md mb-6">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-bold text-lg text-blue-600">
                    {formatCurrency(dividasPorPessoa[selectedPessoa.id]?.total || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pago</p>
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(dividasPorPessoa[selectedPessoa.id]?.pago || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendente</p>
                  <p className="font-bold text-lg text-red-600">
                    {formatCurrency(dividasPorPessoa[selectedPessoa.id]?.pendente || 0)}
                  </p>
                </div>
              </div>

              {dividasFiltradas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma dívida para esta pessoa</p>
              ) : (
                <div className="space-y-3">
                  {dividasFiltradas
                    .filter((divida) => divida && divida.id)
                    .map((divida) => {
                      const pessoaData = divida.pessoas?.find((p) => p.pessoa_id === selectedPessoaId);
                      if (!pessoaData) return null;

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
                              <p className="text-xs text-blue-600 font-medium">{getOrigemNome(divida)}</p>
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
                              <p className="font-bold text-lg">{formatCurrency(divida.valor_total || 0)}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditClick(divida)}
                                  className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded-md transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(divida.id)}
                                  className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded-md transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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

      {viewMode === "allDividas" && (
        <Card>
          <CardHeader>
            <CardTitle>Todas as Dívidas - {formatMonth(mesSelecionado)}</CardTitle>
          </CardHeader>
          <CardContent>
            {dividasDoMes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma dívida neste mês</p>
            ) : (
              <div className="space-y-3">
                {dividasDoMes
                  .filter((divida) => divida && divida.id)
                  .map((divida) => {
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
                            <p className="text-xs text-blue-600 font-medium">{getOrigemNome(divida)}</p>
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
                            <p className="font-bold text-lg">{formatCurrency(divida.valor_total || 0)}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditClick(divida)}
                                className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(divida.id)}
                                className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded-md transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dívida</DialogTitle>
            <DialogDescription>Altere os dados da dívida abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Pessoas (selecione uma ou mais)</Label>
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
                    Me incluir nesta dívida
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
            </div>
            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Input
                id="edit-descricao"
                type="text"
                placeholder="Ex: Aluguel compartilhado"
                value={editFormData.descricao}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-valor_total">
                  {dividaToEdit?.parcelado ? "Valor da Parcela" : "Valor Total"}
                </Label>
                <Input
                  id="edit-valor_total"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editFormData.valor_total}
                  onChange={(e) => setEditFormData({ ...editFormData, valor_total: e.target.value })}
                />
                {dividaToEdit?.parcelado && dividaToEdit.valor_total && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valor total da dívida: {formatCurrency(dividaToEdit.valor_total)}
                  </p>
                )}
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
              <Label htmlFor="edit-origem_tipo">Origem da Dívida</Label>
              <Select
                value={editFormData.origem_tipo}
                onValueChange={(value: "cartao" | "gasto_geral") =>
                  setEditFormData({ ...editFormData, origem_tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="gasto_geral">Gasto Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editFormData.origem_tipo === "cartao" && (
              <div>
                <Label htmlFor="edit-cartao">Cartão</Label>
                <Select
                  value={editFormData.cartao_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, cartao_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cartoes
                      .filter((cartao) => cartao && cartao.id && cartao.nome)
                      .map((cartao) => (
                        <SelectItem key={cartao.id} value={cartao.id}>
                          {cartao.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editFormData.origem_tipo === "gasto_geral" && (
              <div>
                <Label htmlFor="edit-gasto_geral">Gasto Geral</Label>
                <Select
                  value={editFormData.gasto_geral_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, gasto_geral_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gasto geral" />
                  </SelectTrigger>
                  <SelectContent>
                    {gastosGerais
                      .filter((gasto) => gasto && gasto.id && gasto.descricao)
                      .map((gasto) => (
                        <SelectItem key={gasto.id} value={gasto.id}>
                          {gasto.descricao} - {gasto.categoria}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Input
                id="edit-observacoes"
                type="text"
                placeholder="Ex: Dinheiro na gaveta, Pix feito"
                value={editFormData.observacoes}
                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
              />
            </div>

            {dividaToEdit && dividaToEdit.parcelado && (
              <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                <p className="text-sm text-purple-800 font-medium mb-2">
                  <strong>Dívida Parcelada</strong> - Parcela {dividaToEdit.numero_parcela}/
                  {dividaToEdit.total_parcelas}
                </p>
                <p className="text-xs text-purple-700">
                  Após editar, você poderá escolher se deseja aplicar as mudanças apenas nesta parcela
                  ou em todas as parcelas futuras.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-total_parcelas">Total de Parcelas</Label>
                <Input
                  id="edit-total_parcelas"
                  type="number"
                  min="1"
                  max="48"
                  value={editFormData.total_parcelas}
                  onChange={(e) => setEditFormData({ ...editFormData, total_parcelas: e.target.value })}
                  disabled={dividaToEdit?.parcelado}
                />
                {dividaToEdit?.parcelado && (
                  <p className="text-xs text-gray-500 mt-1">
                    Não é possível alterar o total de parcelas
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-parcela_atual">Parcela Atual</Label>
                <Input
                  id="edit-parcela_atual"
                  type="number"
                  min="1"
                  max={editFormData.total_parcelas}
                  value={editFormData.parcela_atual}
                  onChange={(e) => setEditFormData({ ...editFormData, parcela_atual: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ao editar "todas futuras", renumera a partir desta parcela
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-dividir_igualmente"
                type="checkbox"
                checked={editFormData.dividir_igualmente}
                onChange={(e) => setEditFormData({ ...editFormData, dividir_igualmente: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="edit-dividir_igualmente" className="cursor-pointer">
                Dividir valor igualmente entre as pessoas
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

      <Dialog open={editScopeDialogOpen} onOpenChange={setEditScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dívida parcelada</DialogTitle>
            <DialogDescription>
              Como deseja aplicar as alterações nesta dívida parcelada?
              {editFormData.parcela_atual !== dividaToEdit?.numero_parcela?.toString() && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Atenção:</strong> Você alterou a parcela atual de{" "}
                  <strong>{dividaToEdit?.numero_parcela}</strong> para{" "}
                  <strong>{editFormData.parcela_atual}</strong>. Se editar "todas futuras", as
                  parcelas serão renumeradas a partir do novo número.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => confirmEdit("current")} className="w-full">
              Editar apenas esta parcela ({dividaToEdit?.numero_parcela}/{dividaToEdit?.total_parcelas})
            </Button>
            <Button onClick={() => confirmEdit("all")} variant="outline" className="w-full">
              Editar esta e todas as parcelas futuras
              {editFormData.parcela_atual !== dividaToEdit?.numero_parcela?.toString() && " + Renumerar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditScopeDialogOpen(false);
                setEditDialogOpen(true);
              }}
              className="w-full"
            >
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta dívida? Esta ação não pode ser desfeita.
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
              Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePessoaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeletePessoa}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
