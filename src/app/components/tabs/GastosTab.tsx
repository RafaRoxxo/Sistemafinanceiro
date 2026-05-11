import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

interface Renda {
  id: string;
  fonte_id?: string;
  data: string;
  valor: number;
  mes_referencia: string;
  valor_editado?: number;
  recorrente?: boolean;
}

export function RendasTab() {
  const { mesSelecionado } = useMes();
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rendaToDelete, setRendaToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editScopeDialogOpen, setEditScopeDialogOpen] = useState(false);
  const [rendaToEdit, setRendaToEdit] = useState<Renda | null>(null);
  const [editScope, setEditScope] = useState<"current" | "all">("current");

  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    recorrente: false,
  });

  const [editFormData, setEditFormData] = useState({
    valor: "",
    data: "",
    recorrente: false,
  });

  useEffect(() => {
    loadRendas();
  }, [mesSelecionado]);

  const loadRendas = async () => {
    try {
      const response = await api.renda.list(mesSelecionado);
      setRendas(response.data as Renda[]);
    } catch (error) {
      console.error("Erro ao carregar rendas:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      const mes = formData.data.substring(0, 7);

      await api.renda.create({
        data: formData.data,
        valor: parseFloat(formData.valor),
        mes_referencia: mes,
        recorrente: formData.recorrente,
      });

      toast.success(
        formData.recorrente
          ? "Renda recorrente adicionada em todos os meses seguintes"
          : "Renda adicionada com sucesso"
      );
      setFormData({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0], recorrente: false });
      setShowForm(false);
      loadRendas();
    } catch (error) {
      console.error("Erro ao adicionar renda:", error);
      toast.error("Erro ao adicionar renda");
    }
  };

  const handleDeleteClick = (id: string) => {
    setRendaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rendaToDelete) return;

    try {
      await api.renda.delete(rendaToDelete);
      toast.success("Renda deletada com sucesso");
      setDeleteDialogOpen(false);
      setRendaToDelete(null);
      loadRendas();
    } catch (error) {
      console.error("Erro ao deletar renda:", error);
      toast.error("Erro ao deletar renda");
    }
  };

  const handleEditClick = (renda: Renda) => {
    setRendaToEdit(renda);
    setEditFormData({
      valor: renda.valor?.toString() || "",
      data: renda.data || new Date().toISOString().split("T")[0],
      recorrente: renda.recorrente || false,
    });
    setEditDialogOpen(true);
  };

  const handleScopeChoice = (scope: "current" | "all") => {
    confirmEdit(scope);
  };

  const handleEditSubmit = () => {
    if (!rendaToEdit) return;

    // Se estava marcado como recorrente E continua recorrente, perguntar se quer editar todas
    if (rendaToEdit.recorrente && editFormData.recorrente) {
      setEditDialogOpen(false);
      setEditScopeDialogOpen(true);
    } else {
      // Se não era recorrente OU desmarcou recorrente, editar só esta
      confirmEdit("current");
    }
  };

  const confirmEdit = async (scope: "current" | "all") => {
    if (!rendaToEdit) return;

    try {
      await api.renda.update(rendaToEdit.id, {
        valor: parseFloat(editFormData.valor),
        data: editFormData.data,
        recorrente: editFormData.recorrente,
        editar_proximas: scope === "all",
      });

      toast.success(
        scope === "all"
          ? "Renda atualizada neste mês e nos próximos"
          : "Renda atualizada com sucesso"
      );
      setEditDialogOpen(false);
      setEditScopeDialogOpen(false);
      setRendaToEdit(null);
      setEditScope("current");
      loadRendas();
    } catch (error) {
      console.error("Erro ao editar renda:", error);
      toast.error("Erro ao editar renda");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Rendas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova Renda</span>
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Renda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="flex items-center gap-2">
                <input
                  id="recorrente"
                  type="checkbox"
                  checked={formData.recorrente}
                  onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="recorrente" className="cursor-pointer">
                  Renda recorrente (adicionar em todos os meses seguintes)
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
          <CardTitle>Histórico de Rendas - {formatMonth(mesSelecionado)}</CardTitle>
        </CardHeader>
        <CardContent>
          {rendas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma renda cadastrada. Clique em "Nova Renda" para adicionar.
            </p>
          ) : (
            <div className="space-y-2">
              {rendas.filter((renda) => renda && renda.id).map((renda) => (
                <div
                  key={renda.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-md gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">
                      {formatCurrency(renda.valor_editado || renda.valor || 0)}
                      {renda.recorrente && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Recorrente
                        </span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {renda.data ? new Date(renda.data + "T00:00:00").toLocaleDateString("pt-BR") : "Data não definida"} • {renda.mes_referencia || "N/A"}
                    </p>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(renda)}
                      className="text-blue-600 hover:text-blue-700 p-1.5 sm:p-2 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(renda.id)}
                      className="text-red-600 hover:text-red-700 p-1.5 sm:p-2 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editScopeDialogOpen} onOpenChange={setEditScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar renda recorrente</DialogTitle>
            <DialogDescription>
              Esta é uma renda recorrente. Como deseja editá-la?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => handleScopeChoice("current")} className="w-full">
              Editar apenas este mês
            </Button>
            <Button onClick={() => handleScopeChoice("all")} variant="outline" className="w-full">
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
            <DialogTitle>Editar Renda</DialogTitle>
            <DialogDescription>
              Altere os valores da renda abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="flex items-center gap-2">
              <input
                id="edit-recorrente"
                type="checkbox"
                checked={editFormData.recorrente}
                onChange={(e) => setEditFormData({ ...editFormData, recorrente: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="edit-recorrente" className="cursor-pointer">
                Renda recorrente (adicionar em todos os meses seguintes)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta renda? Esta ação não pode ser desfeita.
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
