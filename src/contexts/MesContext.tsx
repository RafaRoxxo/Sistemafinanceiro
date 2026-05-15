import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface MesContextType {
  mesSelecionado: string;
  setMesSelecionado: (
    mes: string
  ) => void;
}

const MesContext = createContext<
  MesContextType | undefined
>(undefined);

function getCurrentMonth() {
  return new Date()
    .toISOString()
    .substring(0, 7);
}

function getPreviousMinuteMonth() {
  return new Date(
    Date.now() - 60000
  )
    .toISOString()
    .substring(0, 7);
}

export function MesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mesSelecionado, setMesSelecionado] =
    useState<string>(getCurrentMonth);

  useEffect(() => {
    const interval = setInterval(() => {
      const mesAtual = getCurrentMonth();

      setMesSelecionado((mesAnterior) => {
        const usuarioEstavaNoMesAtual =
          mesAnterior ===
          getPreviousMinuteMonth();

        if (
          usuarioEstavaNoMesAtual &&
          mesAnterior !== mesAtual
        ) {
          return mesAtual;
        }

        return mesAnterior;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MesContext.Provider
      value={{
        mesSelecionado,
        setMesSelecionado,
      }}
    >
      {children}
    </MesContext.Provider>
  );
}

export function useMes() {
  const context = useContext(MesContext);

  if (!context) {
    throw new Error(
      "useMes must be used within a MesProvider"
    );
  }

  return context;
}
