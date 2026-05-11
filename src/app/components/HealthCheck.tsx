import { useEffect, useState } from "react";
import { projectId } from "/utils/supabase/info";

export function HealthCheck() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-808cc1b6/health`;
        console.log("🏥 Verificando saúde do servidor:", url);

        const response = await fetch(url);
        const data = await response.json();

        console.log("🏥 Resposta do health check:", data);

        if (data.status === "ok") {
          setStatus("ok");
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("🏥 Erro no health check:", error);
        setStatus("error");
      }
    };

    checkHealth();
  }, []);

  if (status === "checking") {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-md text-sm">
        ⏳ Verificando servidor...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-md text-sm max-w-md">
        <p className="font-bold">❌ Servidor indisponível</p>
        <p className="mt-1">
          A Edge Function do Supabase não foi deployada ou está offline.
        </p>
        <p className="mt-1 text-xs">
          Abra as configurações do Make e clique em "Deploy Edge Function"
        </p>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded-md text-sm">
      ✅ Servidor online
    </div>
  );
}
