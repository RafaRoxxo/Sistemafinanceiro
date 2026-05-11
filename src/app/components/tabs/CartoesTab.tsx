import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useMes } from "../../../contexts/MesContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { toast } from "sonner";
import { Plus, CreditCard, Trash2 } from "lucide-react";

interface Cartao {
  id: string;
  nome: string;
  ativo: boolean;
}

export function CartoesTab() {
  const { mesSelecionado } = useMes();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cartaoToDelete, setCartaoToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "" });

  useEffect(() => {
    loadCartoes();
  }, [mesSelecionado]);

  const loadCartoes = async () => {
    try {
      const response = await api.cartao.list();
      setCartoes(response.data as Cartao[]);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Nome do cartão é obrigatório");
      return;
    }

    try {
      await api.cartao.create({ nome: formData.nome, ativo: true });
      toast.success("Cartão adicionado com sucesso");
      setFormData({ nome: "" });
      setShowForm(false);
      loadCartoes();
    } catch (error) {
      console.error("Erro ao adicionar cartão:", error);
      toast.error("Erro ao adicionar cartão");
    }
  };

  const handleDeleteClick = (id: string) => {
    setCartaoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!cartaoToDelete) return;

    try {
      await api.cartao.delete(cartaoToDelete);
      toast.success("Cartão deletado com sucesso");
      setDeleteDialogOpen(false);
      setCartaoToDelete(null);
      loadCartoes();
    } catch (error) {
      console.error("Erro ao deletar cartão:", error);
      toast.error("Erro ao deletar cartão");
    }
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cartões</h2>
          <p className="text-sm text-gray-500 mt-1">{formatMonth(mesSelecionado)}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Cartão</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Ex: Nubank, Inter, C6"
                  value={formData.nome}
                  onChange={(e) => setFormData({ nome: e.target.value })}
                  required
                />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cartoes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8">
              <p className="text-gray-500 text-center">
                Nenhum cartão cadastrado. Clique em "Novo Cartão" para adicionar.
              </p>
            </CardContent>
          </Card>
        ) : (
          cartoes.filter((cartao) => cartao && cartao.id && cartao.nome).map((cartao) => (
            <Card key={cartao.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-semibold">{cartao.nome}</p>
                      <p className="text-sm text-gray-500">
                        {cartao.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(cartao.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este cartão? Esta ação não pode ser desfeita.
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
