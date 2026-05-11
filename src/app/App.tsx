import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { MesProvider } from "../contexts/MesContext";
import { LoginPage } from "./components/pages/LoginPage";
import ResetPasswordPage from "./components/pages/ResetPasswordPage";
import { RegisterPage } from "./components/pages/RegisterPage";
import { FinanceSystem } from "./components/FinanceSystem";
import { Toaster } from "./components/ui/sonner";

type Page = "login" | "register" | "reset-password";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("login");

    // Detectar se está na rota de reset-password
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset_token")) {
      setCurrentPage("reset-password");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-lg text-gray-600">Carregando...</p>
      </div>
    );
  }

 // Página de reset password (não precisa estar logado)
  if (currentPage === "reset-password") {
    return (
      <>
        <ResetPasswordPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }
  if (!user) {
    if (currentPage === "register") {
      return (
        <>
          <RegisterPage onNavigateToLogin={() => setCurrentPage("login")} />
          <Toaster position="top-right" richColors />
        </>
      );
    }
    return (
      <>
        <LoginPage onNavigateToRegister={() => setCurrentPage("register")} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <MesProvider>
      <FinanceSystem />
      <Toaster position="top-right" richColors />
    </MesProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
