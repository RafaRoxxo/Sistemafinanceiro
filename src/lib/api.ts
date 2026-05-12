import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-808cc1b6`;

const isDevelopment = import.meta.env.MODE === "development";

export interface User {
  id: string;
  nome: string;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  token?: string;
  user?: User;
}

function debugLog(...args: unknown[]) {
  if (isDevelopment) {
    console.log(...args);
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
      ...options.headers,
    };

    if (token) {
      headers["X-Auth-Token"] = token;
    }

    const fullUrl = `${API_URL}${endpoint}`;

    debugLog(
      "🔵 API:",
      options.method || "GET",
      endpoint
    );

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      const text = await response.text();

      console.error("❌ Resposta inválida:", text);

      throw new Error(
        "Servidor retornou uma resposta inválida."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Erro HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes("fetch")
    ) {
      throw new Error(
        "Servidor indisponível no momento."
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Erro inesperado.");
  }
}

function createCrud(base: string) {
  return {
    create: (data: unknown) =>
      fetchAPI(base, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`${base}${query}`);
    },

    update: (id: string, data: unknown) =>
      fetchAPI(`${base}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetchAPI(`${base}/${id}`, {
        method: "DELETE",
      }),
  };
}

export const api = {
  auth: {
    register: (nome: string, email: string, senha: string) =>
      fetchAPI<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha }),
      }),

    login: (email: string, senha: string) =>
      fetchAPI<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      }),

    deleteAccount: () =>
      fetchAPI("/auth/delete-account", {
        method: "DELETE",
      }),

    changePassword: (
      senhaAtual: string,
      novaSenha: string
    ) =>
      fetchAPI("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          senhaAtual,
          novaSenha,
        }),
      }),

    forgotPassword: (email: string) =>
      fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (
      token: string,
      novaSenha: string
    ) =>
      fetchAPI("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          novaSenha,
        }),
      }),
  },

  dashboard: {
    get: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`/dashboard${query}`);
    },
  },

  renda: createCrud("/renda"),

  cartao: {
    ...createCrud("/cartao"),
  },

  compra: {
    create: (data: unknown) =>
      fetchAPI("/compra", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: () => fetchAPI("/compra"),
  },

  parcela: {
    list: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`/parcela${query}`);
    },

    update: (id: string, data: unknown) =>
      fetchAPI(`/parcela/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetchAPI(`/parcela/${id}`, {
        method: "DELETE",
      }),

    pagarAntecipado: (data: unknown) =>
      fetchAPI("/parcela/pagar-antecipado", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    desmarcarPagamento: (id: string) =>
      fetchAPI(`/parcela/${id}/desmarcar-pagamento`, {
        method: "PUT",
      }),
  },

  pessoa: {
    create: (data: unknown) =>
      fetchAPI("/pessoa", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: () => fetchAPI("/pessoa"),
    
    update: (id: string, data: unknown) =>
      fetchAPI(`/pessoa/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetchAPI(`/pessoa/${id}`, {
        method: "DELETE",
      }),
  },

  divida: createCrud("/divida"),

  guardado: {
    createMovimentacao: (data: unknown) =>
      fetchAPI("/movimentacao-guardado", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listMovimentacoes: () =>
      fetchAPI("/movimentacao-guardado"),

    createMensal: (data: unknown) =>
      fetchAPI("/guardado-mensal", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateMensal: (
      mes: string,
      data: unknown
    ) =>
      fetchAPI(`/guardado-mensal/${mes}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    getMensal: (mes: string) =>
      fetchAPI(`/guardado-mensal/${mes}`),

    listMensal: () =>
      fetchAPI("/guardado-mensal"),
  },

  gastoGeral: createCrud("/gasto-geral"),
};
