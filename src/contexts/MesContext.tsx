import React, { createContext, useContext, useState, useEffect } from "react";

interface MesContextType {
  mesSelecionado: string;
  setMesSelecionado: (mes: string) => void;
}

const MesContext = createContext<MesContextType | undefined>(undefined);

export function MesProvider({ children }: { children: React.ReactNode }) {
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    return new Date().toISOString().substring(0, 7);
  });

  useEffect(() => {
    // Verifica a cada minuto se o mês mudou
    const interval = setInterval(() => {
      const mesAtualAgora = new Date().toISOString().substring(0, 7);
      // Só atualiza automaticamente se o usuário estiver visualizando o mês que era atual
      setMesSelecionado((mesAnterior) => {
        const mesAnteriorEraAtual = mesAnterior === new Date(Date.now() - 60000).toISOString().substring(0, 7);
        if (mesAnteriorEraAtual && mesAtualAgora !== mesAnterior) {
          return mesAtualAgora;
        }
        return mesAnterior;
      });
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <MesContext.Provider value={{ mesSelecionado, setMesSelecionado }}>
      {children}
    </MesContext.Provider>
  );
}

export function useMes() {
  const context = useContext(MesContext);
  if (context === undefined) {
    throw new Error("useMes must be used within a MesProvider");
  }
  return context;
}
