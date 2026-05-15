import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, User } from "../lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (
    email: string,
    senha: string
  ) => Promise<void>;
  register: (
    nome: string,
    email: string,
    senha: string
  ) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

const STORAGE_TOKEN = "token";
const STORAGE_USER = "user";

function clearAuthStorage() {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
}

function saveAuthStorage(
  token: string,
  user: User
) {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(
    STORAGE_USER,
    JSON.stringify(user)
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    try {
      const storedToken =
        localStorage.getItem(STORAGE_TOKEN);

      const storedUser =
        localStorage.getItem(STORAGE_USER);

      if (!storedToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      const isValidUser =
        parsedUser &&
        typeof parsedUser.id === "string" &&
        typeof parsedUser.nome === "string" &&
        typeof parsedUser.email === "string";

      if (!isValidUser) {
        clearAuthStorage();
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      setUser(parsedUser);
    } catch (error) {
      console.error(
        "Erro ao carregar autenticação:",
        error
      );

      clearAuthStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    email: string,
    senha: string
  ) => {
    const response =
      await api.auth.login(email, senha);

    if (!response.token || !response.user) {
      throw new Error(
        "Resposta inválida do servidor."
      );
    }

    saveAuthStorage(
      response.token,
      response.user
    );

    setToken(response.token);
    setUser(response.user);
  };

  const register = async (
    nome: string,
    email: string,
    senha: string
  ) => {
    const response =
      await api.auth.register(
        nome,
        email,
        senha
      );

    if (!response.token || !response.user) {
      throw new Error(
        "Resposta inválida do servidor."
      );
    }

    saveAuthStorage(
      response.token,
      response.user
    );

    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearAuthStorage();

    setToken(null);
    setUser(null);
  };

  const deleteAccount = async () => {
    await api.auth.deleteAccount();

    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        deleteAccount,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}
