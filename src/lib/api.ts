import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-808cc1b6`;

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

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
      ...options.headers,
    };

    if (token) {
      headers["X-Auth-Token"] = token;
    }

    const fullUrl = `${API_URL}${endpoint}`;
    console.log("🔵 Requisição:", options.method || "GET", fullUrl);
    console.log("🔵 X-Auth-Token:", headers["X-Auth-Token"] || "não definido");
    console.log("🔵 Body:", options.body);

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    console.log("✅ Status:", response.status, response.statusText);

    let data;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      console.log("✅ Resposta JSON:", data);
    } else {
      const text = await response.text();
      console.error("❌ Resposta não é JSON:", text);
      throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      const errorMsg = data.error || `Erro HTTP ${response.status}: ${response.statusText}`;
      console.error("❌ Erro do servidor:", errorMsg);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("❌ Erro de rede - a Edge Function pode não estar deployada");
      throw new Error("Servidor indisponível. Verifique se a Edge Function foi deployada.");
    }
    console.error("❌ Erro completo:", error);
    throw error;
  }
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

    changePassword: (senhaAtual: string, novaSenha: string) =>
      fetchAPI("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ senhaAtual, novaSenha }),
      }),

    forgotPassword: (email: string) =>
      fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, novaSenha: string) =>
      fetchAPI("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha }),
      }),
  },

  dashboard: {
    get: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`/dashboard${query}`);
    },
  },

  renda: {
    create: (data: unknown) =>
      fetchAPI("/renda", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`/renda${query}`);
    },
    update: (id: string, data: unknown) =>
      fetchAPI(`/renda/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/renda/${id}`, {
        method: "DELETE",
      }),
  },

  cartao: {
    create: (data: unknown) =>
      fetchAPI("/cartao", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: () => fetchAPI("/cartao"),
    update: (id: string, data: unknown) =>
      fetchAPI(`/cartao/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/cartao/${id}`, {
        method: "DELETE",
      }),
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
  },

  divida: {
    create: (data: unknown) =>
      fetchAPI("/divida", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: () => fetchAPI("/divida"),
    update: (id: string, data: unknown) =>
      fetchAPI(`/divida/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/divida/${id}`, {
        method: "DELETE",
      }),
  },

  guardado: {
    createMovimentacao: (data: unknown) =>
      fetchAPI("/movimentacao-guardado", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listMovimentacoes: () => fetchAPI("/movimentacao-guardado"),
    createMensal: (data: unknown) =>
      fetchAPI("/guardado-mensal", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateMensal: (mes: string, data: unknown) =>
      fetchAPI(`/guardado-mensal/${mes}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getMensal: (mes: string) => fetchAPI(`/guardado-mensal/${mes}`),
    listMensal: () => fetchAPI("/guardado-mensal"),
  },

  gastoGeral: {
    create: (data: unknown) =>
      fetchAPI("/gasto-geral", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (mes?: string) => {
      const query = mes ? `?mes=${mes}` : "";
      return fetchAPI(`/gasto-geral${query}`);
    },
    update: (id: string, data: unknown) =>
      fetchAPI(`/gasto-geral/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/gasto-geral/${id}`, {
        method: "DELETE",
      }),
  },
};
