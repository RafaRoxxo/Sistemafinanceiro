import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { hashPassword, verifyPassword, generateToken } from "./auth.tsx";
import { authMiddleware } from "./middleware.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Auth-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

app.get("/make-server-808cc1b6/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/make-server-808cc1b6/auth/register", async (c) => {
  try {
    console.log("📝 Iniciando registro de usuário");
    const body = await c.req.json();
    console.log("📝 Dados recebidos:", { ...body, senha: "***" });

    const { nome, email, senha } = body;

    if (!nome || !email || !senha) {
      console.log("❌ Campos faltando");
      return c.json({ error: "Todos os campos são obrigatórios" }, 400);
    }

    console.log("📝 Verificando se email já existe:", email);
    const existingUser = await kv.get(`user:email:${email}`);
    console.log("📝 Email já existe?", !!existingUser);

    if (existingUser) {
      return c.json({ error: "Email já cadastrado" }, 400);
    }

    const userId = crypto.randomUUID();
    console.log("📝 Gerando hash da senha...");
    const senhaHash = await hashPassword(senha);

    const user = {
      id: userId,
      nome,
      email,
      senha: senhaHash,
      created_at: new Date().toISOString(),
    };

    console.log("📝 Salvando usuário no banco...");
    await kv.set(`user:${userId}`, user);
    await kv.set(`user:email:${email}`, userId);

    console.log("📝 Gerando token...");
    const token = generateToken(userId);

    console.log("✅ Registro concluído com sucesso");
    return c.json({
      success: true,
      message: "Conta criada com sucesso",
      token,
      user: { id: userId, nome, email },
    });
  } catch (error) {
    console.error("❌ Erro no registro:", error);
    return c.json({ error: `Erro ao criar conta: ${error.message}` }, 500);
  }
});

app.post("/make-server-808cc1b6/auth/login", async (c) => {
  try {
    const { email, senha } = await c.req.json();
    console.log("🔐 LOGIN - Email recebido:", email);

    if (!email || !senha) {
      console.log("❌ LOGIN - Email ou senha faltando");
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    console.log("🔐 LOGIN - Buscando userId para email:", email);
    const userId = await kv.get(`user:email:${email}`);
    console.log("🔐 LOGIN - UserId encontrado:", userId);

    if (!userId) {
      console.log("❌ LOGIN - Usuário não encontrado para email:", email);
      // Vamos listar todos os emails para debug
      try {
        const allEmails = await kv.getByPrefix("user:email:");
        console.log("📋 Total de emails cadastrados no sistema:", allEmails.length);
        allEmails.forEach((emailData, index) => {
          console.log(`  ${index + 1}. Email:`, emailData);
        });
      } catch (e) {
        console.log("⚠️ Não foi possível listar emails:", e);
      }
      return c.json({ error: "Usuário não encontrado. Verifique se você já criou uma conta." }, 404);
    }

    console.log("🔐 LOGIN - Buscando dados do usuário:", userId);
    const user = await kv.get(`user:${userId}`);
    console.log("🔐 LOGIN - Usuário encontrado:", !!user);

    if (!user) {
      console.log("❌ LOGIN - Dados do usuário não encontrados");
      return c.json({ error: "Erro ao buscar dados do usuário" }, 500);
    }

    console.log("🔐 LOGIN - Verificando senha...");
    const isValid = await verifyPassword(senha, user.senha);
    console.log("🔐 LOGIN - Senha válida:", isValid);

    if (!isValid) {
      console.log("❌ LOGIN - Senha inválida");
      return c.json({ error: "Senha inválida" }, 401);
    }

    console.log("🔐 LOGIN - Gerando token...");
    const token = generateToken(userId);

    console.log("✅ LOGIN - Login bem-sucedido para:", email);
    return c.json({
      success: true,
      message: "Login realizado com sucesso",
      token,
      user: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (error) {
    console.error("❌ LOGIN - Erro no login:", error);
    return c.json({ error: "Erro ao fazer login" }, 500);
  }
});

app.post("/make-server-808cc1b6/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email é obrigatório" }, 400);
    }

    const userId = await kv.get(`user:email:${email}`);
    if (!userId) {
      // Por segurança, retornar sucesso mesmo se o email não existir
      return c.json({
        success: true,
        message: "Se este email existir, você receberá instruções para redefinir sua senha.",
      });
    }

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({
        success: true,
        message: "Se este email existir, você receberá instruções para redefinir sua senha.",
      });
    }

    // Gerar token de reset (válido por 24h)
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const resetData = {
      userId,
      email,
      token: resetToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Armazenar token (expira em 24h)
    await kv.set(`reset_token:${resetToken}`, resetData);

    // Enviar email com Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (RESEND_API_KEY) {
      try {
        const resetLink = `${APP_URL}?reset_token=${resetToken}`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Sistema Financeiro <noreply@sistema.com>",
            to: email,
            subject: "Redefinir sua senha",
            html: `
              <h2>Redefinir Senha</h2>
              <p>Olá, ${user.nome}!</p>
              <p>Você solicitou a redefinição de sua senha. Clique no link abaixo para continuar:</p>
              <p><a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Redefinir Senha</a></p>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p>${resetLink}</p>
              <p>Este link expira em 24 horas.</p>
              <p>Se você não solicitou esta redefinição, ignore este email.</p>
            `,
          }),
        });

        if (!response.ok) {
          console.error("Erro ao enviar email:", await response.text());
        } else {
          console.log("✅ Email de recuperação enviado para:", email);
        }
      } catch (error) {
        console.error("Erro ao enviar email:", error);
      }
    } else {
      console.log("⚠️ RESEND_API_KEY não configurado. Link de reset:", `${APP_URL}?reset_token=${resetToken}`);
    }

    return c.json({
      success: true,
      message: "Se este email existir, você receberá instruções para redefinir sua senha.",
    });
  } catch (error) {
    console.error("❌ Erro ao processar forgot-password:", error);
    return c.json({ error: "Erro ao processar solicitação" }, 500);
  }
});

app.post("/make-server-808cc1b6/auth/reset-password", async (c) => {
  try {
    const { token, novaSenha } = await c.req.json();

    if (!token || !novaSenha) {
      return c.json({ error: "Token e nova senha são obrigatórios" }, 400);
    }

    if (novaSenha.length < 6) {
      return c.json({ error: "Senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Buscar dados do token
    const resetData = await kv.get(`reset_token:${token}`);
    if (!resetData) {
      return c.json({ error: "Token inválido ou expirado" }, 400);
    }

    // Verificar expiração
    const expiresAt = new Date(resetData.expiresAt);
    if (expiresAt < new Date()) {
      await kv.del(`reset_token:${token}`);
      return c.json({ error: "Token expirado" }, 400);
    }

    // Buscar usuário
    const user = await kv.get(`user:${resetData.userId}`);
    if (!user) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    // Atualizar senha
    const novaSenhaHash = await hashPassword(novaSenha);
    const userAtualizado = {
      ...user,
      senha: novaSenhaHash,
    };

    await kv.set(`user:${resetData.userId}`, userAtualizado);

    // Deletar token usado
    await kv.del(`reset_token:${token}`);

    console.log("✅ Senha resetada para usuário:", user.email);

    return c.json({
      success: true,
      message: "Senha redefinida com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao resetar senha:", error);
    return c.json({ error: "Erro ao resetar senha" }, 500);
  }
});

app.put("/make-server-808cc1b6/auth/change-password", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const { senhaAtual, novaSenha } = await c.req.json();

    if (!senhaAtual || !novaSenha) {
      return c.json({ error: "Senha atual e nova senha são obrigatórias" }, 400);
    }

    if (novaSenha.length < 6) {
      return c.json({ error: "Nova senha deve ter no mínimo 6 caracteres" }, 400);
    }

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    // Verificar senha atual
    const isValid = await verifyPassword(senhaAtual, user.senha);
    if (!isValid) {
      return c.json({ error: "Senha atual incorreta" }, 401);
    }

    // Atualizar senha
    const novaSenhaHash = await hashPassword(novaSenha);
    const userAtualizado = {
      ...user,
      senha: novaSenhaHash,
    };

    await kv.set(`user:${userId}`, userAtualizado);

    return c.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    return c.json({ error: "Erro ao alterar senha" }, 500);
  }
});

app.delete("/make-server-808cc1b6/auth/delete-account", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    // Deletar todas as chaves relacionadas ao usuário
    const keysToDelete: string[] = [
      `user:${userId}`,
      `user:email:${user.email}`,
    ];

    // Deletar dados de todas as entidades
    const prefixes = [
      `renda:${userId}:`,
      `cartao:${userId}:`,
      `compra:${userId}:`,
      `parcela:${userId}:`,
      `pessoa:${userId}:`,
      `divida:${userId}:`,
      `movimentacao_guardado:${userId}:`,
      `guardado_mensal:${userId}:`,
      `gasto_geral:${userId}:`,
    ];

    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      for (const item of items) {
        if (item && item.id) {
          keysToDelete.push(`${prefix}${item.id}`);
        }
      }
    }

    if (keysToDelete.length > 0) {
      await kv.mdel(keysToDelete);
    }

    return c.json({
      success: true,
      message: "Conta deletada com sucesso",
    });
  } catch (error) {
    console.log("Erro ao deletar conta:", error);
    return c.json({ error: "Erro ao deletar conta" }, 500);
  }
});

app.get("/make-server-808cc1b6/dashboard", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.query("mes") ?? new Date().toISOString().substring(0, 7);

    const rendas = await kv.getByPrefix(`renda:${userId}:`);
    const rendasMes = rendas.filter((r) => r && r.mes_referencia === mes);
    const totalRenda = rendasMes.reduce((sum, r) => sum + (r.valor_editado ?? r.valor), 0);

    const parcelas = await kv.getByPrefix(`parcela:${userId}:`);
    const parcelasMes = parcelas.filter((p) => {
      if (!p || !p.data_cobranca) return false;
      const dataCobranca = new Date(p.data_cobranca);
      return dataCobranca.toISOString().substring(0, 7) === mes;
    });
    const totalGastosCartao = parcelasMes.reduce(
      (sum, p) => sum + (p.foi_editada ? p.valor_editado : p.valor),
      0
    );

    const gastosGerais = await kv.getByPrefix(`gasto_geral:${userId}:`);
    const gastosGeraisMes = gastosGerais.filter((g) => g && g.mes_referencia === mes);
    const totalGastosGerais = gastosGeraisMes.reduce((sum, g) => sum + (g.valor || 0), 0);

    const totalGastos = totalGastosCartao + totalGastosGerais;

    const guardadosMensais = await kv.getByPrefix(`guardado_mensal:${userId}:`);
    const guardadoMes = guardadosMensais.find((g) => g && g.mes_referencia === mes);
    const metaMensal = guardadoMes?.meta_mensal ?? 0;

    const movimentacoes = await kv.getByPrefix(`movimentacao_guardado:${userId}:`);

    // Calcular valor guardado do mês atual baseado nas movimentações
    const movimentacoesMes = movimentacoes.filter((m) => {
      if (!m || !m.data) return false;
      const mesMovimentacao = m.data.substring(0, 7);
      return mesMovimentacao === mes;
    });

    const valorGuardadoMensal = movimentacoesMes.reduce((sum, m) => {
      return sum + (m.tipo === "entrada" ? m.valor : -m.valor);
    }, 0);

    // Total de todas as movimentações
    const totalMovimentacoes = movimentacoes.reduce((sum, m) => {
      if (!m) return sum;
      return sum + (m.tipo === "entrada" ? m.valor : -m.valor);
    }, 0);

    const totalGuardadosMensais = guardadosMensais.reduce((sum, g) => {
      if (!g) return sum;
      return sum + (g.valor_guardado ?? 0);
    }, 0);

    const totalGuardado = totalMovimentacoes + totalGuardadosMensais;

    const saldo = totalRenda - totalGastos - valorGuardadoMensal;

    const compras = await kv.getByPrefix(`compra:${userId}:`);
    const cartoes = await kv.getByPrefix(`cartao:${userId}:`);

    const gastosPorCartao: Record<string, number> = {};
    for (const parcela of parcelasMes) {
      const compra = compras.find((c) => c.id === parcela.compra_id);
      if (compra) {
        const cartao = cartoes.find((c) => c && c.id === compra.cartao_id);
        const nomeCartao = (cartao && cartao.nome) ? cartao.nome : "Sem cartão";
        gastosPorCartao[nomeCartao] =
          (gastosPorCartao[nomeCartao] ?? 0) +
          (parcela.foi_editada ? parcela.valor_editado : parcela.valor);
      }
    }

    return c.json({
      success: true,
      data: {
        mes_referencia: mes,
        total_renda: totalRenda,
        total_gastos: totalGastos,
        saldo,
        valor_guardado_mensal: valorGuardadoMensal,
        meta_guardado_mensal: metaMensal,
        total_guardado: totalGuardado,
        gastos_por_cartao: gastosPorCartao,
      },
    });
  } catch (error) {
    console.log("Erro ao buscar dashboard:", error);
    return c.json({ error: "Erro ao buscar dashboard" }, 500);
  }
});

// ==================== RENDA ====================

app.post("/make-server-808cc1b6/renda", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const mesInicio = data.mes_referencia; // YYYY-MM
    const [ano, mes] = mesInicio.split("-").map(Number);

    if (data.recorrente) {
      // Criar renda para todos os meses até dezembro do ano atual
      const anoAtual = new Date().getFullYear();
      const ultimoMes = ano === anoAtual ? 12 : 12; // Até dezembro

      for (let m = mes; m <= ultimoMes; m++) {
        const id = crypto.randomUUID();
        const mesRef = `${ano}-${String(m).padStart(2, "0")}`;
        const renda = {
          id,
          usuario_id: userId,
          data: data.data,
          valor: data.valor,
          mes_referencia: mesRef,
          recorrente: true,
        };
        await kv.set(`renda:${userId}:${id}`, renda);
      }
    } else {
      // Criar apenas uma renda
      const id = crypto.randomUUID();
      const renda = {
        id,
        usuario_id: userId,
        data: data.data,
        valor: data.valor,
        mes_referencia: data.mes_referencia,
        recorrente: false,
      };
      await kv.set(`renda:${userId}:${id}`, renda);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao criar renda:", error);
    return c.json({ error: "Erro ao criar renda" }, 500);
  }
});

app.get("/make-server-808cc1b6/renda", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.query("mes");

    let rendas = await kv.getByPrefix(`renda:${userId}:`);

    // getByPrefix já retorna os valores diretamente, não { key, value }
    const rendasValidas = rendas.filter((r) => r && r.id);

    if (mes) {
      const resultado = rendasValidas.filter((r) => r.mes_referencia === mes);
      return c.json({ success: true, data: resultado });
    }

    return c.json({ success: true, data: rendasValidas });
  } catch (error) {
    console.error("❌ Erro ao buscar rendas:", error);
    return c.json({ error: `Erro ao buscar rendas: ${error.message}` }, 500);
  }
});

app.put("/make-server-808cc1b6/renda/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const rendaExistente = await kv.get(`renda:${userId}:${id}`);
    if (!rendaExistente) {
      return c.json({ error: "Renda não encontrada" }, 404);
    }

    if (data.editar_proximas && rendaExistente.recorrente) {
      // Editar esta renda e todas as próximas (mesmo mês ou posterior)
      const mesAtual = rendaExistente.mes_referencia;
      const todasRendas = await kv.getByPrefix(`renda:${userId}:`);

      for (const renda of todasRendas) {
        if (renda.recorrente && renda.mes_referencia >= mesAtual) {
          const rendaAtualizada = {
            ...renda,
            valor: data.valor !== undefined ? data.valor : renda.valor,
            data: data.data !== undefined ? data.data : renda.data,
            recorrente: data.recorrente !== undefined ? data.recorrente : renda.recorrente,
          };
          await kv.set(`renda:${userId}:${renda.id}`, rendaAtualizada);
        }
      }
    } else if (data.recorrente && !rendaExistente.recorrente) {
      // Transformar em recorrente - criar para os meses seguintes
      const mesAtual = rendaExistente.mes_referencia;
      const [ano, mes] = mesAtual.split("-").map(Number);
      const anoCorrente = new Date().getFullYear();

      // Atualizar a renda atual
      const rendaAtualizada = {
        ...rendaExistente,
        valor: data.valor !== undefined ? data.valor : rendaExistente.valor,
        data: data.data !== undefined ? data.data : rendaExistente.data,
        recorrente: true,
      };
      await kv.set(`renda:${userId}:${id}`, rendaAtualizada);

      // Criar rendas para os meses seguintes até dezembro
      for (let m = mes + 1; m <= 12; m++) {
        const novoId = crypto.randomUUID();
        const mesRef = `${ano}-${String(m).padStart(2, "0")}`;
        const novaRenda = {
          id: novoId,
          usuario_id: userId,
          data: data.data !== undefined ? data.data : rendaExistente.data,
          valor: data.valor !== undefined ? data.valor : rendaExistente.valor,
          mes_referencia: mesRef,
          recorrente: true,
        };
        await kv.set(`renda:${userId}:${novoId}`, novaRenda);
      }
    } else {
      // Editar apenas esta renda
      const rendaAtualizada = {
        ...rendaExistente,
        valor: data.valor !== undefined ? data.valor : rendaExistente.valor,
        data: data.data !== undefined ? data.data : rendaExistente.data,
        recorrente: data.recorrente !== undefined ? data.recorrente : false,
      };
      await kv.set(`renda:${userId}:${id}`, rendaAtualizada);
    }

    return c.json({ success: true, message: "Renda atualizada" });
  } catch (error) {
    console.error("❌ Erro ao atualizar renda:", error);
    return c.json({ error: "Erro ao atualizar renda" }, 500);
  }
});

app.delete("/make-server-808cc1b6/renda/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`renda:${userId}:${id}`);

    return c.json({ success: true, message: "Renda deletada" });
  } catch (error) {
    console.error("❌ Erro ao deletar renda:", error);
    return c.json({ error: "Erro ao deletar renda" }, 500);
  }
});

// ==================== CARTÃO ====================

app.post("/make-server-808cc1b6/cartao", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const id = crypto.randomUUID();
    const cartao = {
      id,
      usuario_id: userId,
      ...data,
      ativo: data.ativo ?? true,
    };

    await kv.set(`cartao:${userId}:${id}`, cartao);

    return c.json({ success: true, data: cartao });
  } catch (error) {
    console.log("Erro ao criar cartão:", error);
    return c.json({ error: "Erro ao criar cartão" }, 500);
  }
});

app.get("/make-server-808cc1b6/cartao", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const cartoes = await kv.getByPrefix(`cartao:${userId}:`);

    return c.json({ success: true, data: cartoes });
  } catch (error) {
    console.log("Erro ao buscar cartões:", error);
    return c.json({ error: "Erro ao buscar cartões" }, 500);
  }
});

app.put("/make-server-808cc1b6/cartao/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const existing = await kv.get(`cartao:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Cartão não encontrado" }, 404);
    }

    const updated = { ...existing, ...data };
    await kv.set(`cartao:${userId}:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.log("Erro ao atualizar cartão:", error);
    return c.json({ error: "Erro ao atualizar cartão" }, 500);
  }
});

app.delete("/make-server-808cc1b6/cartao/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`cartao:${userId}:${id}`);

    return c.json({ success: true, message: "Cartão deletado" });
  } catch (error) {
    console.log("Erro ao deletar cartão:", error);
    return c.json({ error: "Erro ao deletar cartão" }, 500);
  }
});

// ==================== COMPRA ====================

app.post("/make-server-808cc1b6/compra", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    console.log("🔵 POST /compra - Dados recebidos:", JSON.stringify(data, null, 2));

    const compraId = crypto.randomUUID();
    const compra = {
      id: compraId,
      usuario_id: userId,
      descricao: data.descricao,
      cartao_id: data.cartao_id,
      tipo: data.tipo,
    };

    await kv.set(`compra:${userId}:${compraId}`, compra);
    console.log(`✅ Compra salva: ${compraId}`);

    // Criar todas as parcelas a partir da parcela atual até a última
    const parcelaAtual = data.parcela_atual || 1;
    const totalParcelas = data.total_parcelas || 1;
    const mesInicio = data.mes_cobranca; // YYYY-MM

    console.log(`🔵 Criando parcelas - Parcela atual: ${parcelaAtual}, Total: ${totalParcelas}, Mês início: ${mesInicio}`);

    let parcelasCriadas = 0;
    for (let i = parcelaAtual; i <= totalParcelas; i++) {
      try {
        const parcelaId = crypto.randomUUID();
        const mesOffset = i - parcelaAtual; // Offset em relação ao mês de início

        // Calcular o mês de cobrança
        const [ano, mes] = mesInicio.split("-").map(Number);
        const dataMes = new Date(ano, mes - 1 + mesOffset, 1);
        const anoCobranca = dataMes.getFullYear();
        const mesCobranca = String(dataMes.getMonth() + 1).padStart(2, "0");
        const dataCobranca = `${anoCobranca}-${mesCobranca}-01`;

        const parcela = {
          id: parcelaId,
          compra_id: compraId,
          numero_parcela: i,
          total_parcelas: totalParcelas,
          valor: data.valor_parcela,
          data_cobranca: dataCobranca,
          foi_editada: false,
        };

        await kv.set(`parcela:${userId}:${parcelaId}`, parcela);
        parcelasCriadas++;
        console.log(`  ✅ Parcela ${i}/${totalParcelas} salva - ID: ${parcelaId} - Data: ${dataCobranca}`);
      } catch (error) {
        console.error(`  ❌ Erro ao criar parcela ${i}/${totalParcelas}:`, error);
      }
    }

    console.log(`✅ Total de ${parcelasCriadas} parcelas criadas de ${totalParcelas - parcelaAtual + 1} esperadas`);

    return c.json({ success: true, data: compra });
  } catch (error) {
    console.error("Erro ao criar compra:", error);
    return c.json({ error: "Erro ao criar compra" }, 500);
  }
});

app.get("/make-server-808cc1b6/compra", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const compras = await kv.getByPrefix(`compra:${userId}:`);

    return c.json({ success: true, data: compras });
  } catch (error) {
    console.log("Erro ao buscar compras:", error);
    return c.json({ error: "Erro ao buscar compras" }, 500);
  }
});

app.get("/make-server-808cc1b6/parcela", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.query("mes");

    let parcelas = await kv.getByPrefix(`parcela:${userId}:`);
    const compras = await kv.getByPrefix(`compra:${userId}:`);

    console.log(`🔵 GET /parcela - Total parcelas no banco: ${parcelas.length}, Filtro mês: ${mes || "nenhum"}`);

    if (mes) {
      const parcelasAntesFiltro = parcelas.length;
      console.log(`📊 Todas as parcelas antes do filtro:`);
      parcelas.forEach((p, idx) => {
        if (p && p.data_cobranca) {
          const mesCobranca = p.data_cobranca.substring(0, 7);
          console.log(`  ${idx + 1}. Parcela ${p.numero_parcela}/${p.total_parcelas} - Compra: ${p.compra_id?.substring(0, 8)} - Data: ${p.data_cobranca} (${mesCobranca})`);
        }
      });

      parcelas = parcelas.filter((p) => {
        if (!p || !p.data_cobranca) {
          console.log(`  ⚠️ Parcela sem data_cobranca ignorada`);
          return false;
        }
        // Extrair YYYY-MM diretamente da string data_cobranca (formato: "YYYY-MM-DD")
        const mesCobranca = p.data_cobranca.substring(0, 7);
        const match = mesCobranca === mes;
        if (match) {
          console.log(`  ✅ Match: Parcela ${p.numero_parcela}/${p.total_parcelas} - ${p.data_cobranca}`);
        }
        return match;
      });
      console.log(`📊 Parcelas após filtro para ${mes}: ${parcelas.length} de ${parcelasAntesFiltro}`);
    }

    // Enriquecer parcelas com informações da compra
    const parcelasEnriquecidas = parcelas.map((parcela) => {
      const compra = compras.find((c) => c && c.id === parcela.compra_id);
      return {
        ...parcela,
        compra_descricao: compra?.descricao || "Compra removida",
        cartao_id: compra?.cartao_id,
      };
    });

    return c.json({ success: true, data: parcelasEnriquecidas });
  } catch (error) {
    console.error("Erro ao buscar parcelas:", error);
    return c.json({ error: "Erro ao buscar parcelas" }, 500);
  }
});

app.post("/make-server-808cc1b6/parcela/pagar-antecipado", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const { compra_id, numero_parcela_inicial, quantidade_parcelas } = data;

    // Buscar todas as parcelas da compra
    const parcelas = await kv.getByPrefix(`parcela:${userId}:`);
    const parcelasDaCompra = parcelas.filter((p) => p.compra_id === compra_id);

    const dataPagamento = new Date().toISOString().split("T")[0];
    let parcelasAtualizadas = 0;

    // Marcar as parcelas como pagas antecipadamente
    for (let i = 0; i < quantidade_parcelas; i++) {
      const numeroParcelaAtual = numero_parcela_inicial + i;
      const parcela = parcelasDaCompra.find((p) => p.numero_parcela === numeroParcelaAtual);

      if (parcela && !parcela.pago_antecipado) {
        const parcelaAtualizada = {
          ...parcela,
          pago_antecipado: true,
          data_pagamento_antecipado: dataPagamento,
        };
        await kv.set(`parcela:${userId}:${parcela.id}`, parcelaAtualizada);
        parcelasAtualizadas++;
      }
    }

    return c.json({
      success: true,
      message: `${parcelasAtualizadas} parcela(s) marcada(s) como paga(s)`,
    });
  } catch (error) {
    console.error("Erro ao pagar antecipado:", error);
    return c.json({ error: "Erro ao pagar antecipado" }, 500);
  }
});

app.put("/make-server-808cc1b6/parcela/:id/desmarcar-pagamento", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const parcela = await kv.get(`parcela:${userId}:${id}`);
    if (!parcela) {
      return c.json({ error: "Parcela não encontrada" }, 404);
    }

    const parcelaAtualizada = {
      ...parcela,
      pago_antecipado: false,
      data_pagamento_antecipado: undefined,
    };

    await kv.set(`parcela:${userId}:${id}`, parcelaAtualizada);

    return c.json({ success: true, message: "Pagamento desmarcado" });
  } catch (error) {
    console.error("Erro ao desmarcar pagamento:", error);
    return c.json({ error: "Erro ao desmarcar pagamento" }, 500);
  }
});

app.put("/make-server-808cc1b6/parcela/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const parcela = await kv.get(`parcela:${userId}:${id}`);
    if (!parcela) {
      return c.json({ error: "Parcela não encontrada" }, 404);
    }

    const parcelaAtualizada = {
      ...parcela,
      foi_editada: true,
      valor_editado: data.valor_editado !== undefined ? data.valor_editado : parcela.valor_editado,
      numero_parcela: data.numero_parcela !== undefined ? data.numero_parcela : parcela.numero_parcela,
    };

    await kv.set(`parcela:${userId}:${id}`, parcelaAtualizada);

    return c.json({ success: true, data: parcelaAtualizada });
  } catch (error) {
    console.error("Erro ao atualizar parcela:", error);
    return c.json({ error: "Erro ao atualizar parcela" }, 500);
  }
});

app.delete("/make-server-808cc1b6/parcela/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const parcela = await kv.get(`parcela:${userId}:${id}`);
    if (!parcela) {
      return c.json({ error: "Parcela não encontrada" }, 404);
    }

    await kv.delete(`parcela:${userId}:${id}`);

    return c.json({ success: true, message: "Parcela excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir parcela:", error);
    return c.json({ error: "Erro ao excluir parcela" }, 500);
  }
});

// ==================== PESSOA ====================

app.post("/make-server-808cc1b6/pessoa", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const id = crypto.randomUUID();
    const pessoa = {
      id,
      usuario_id: userId,
      ...data,
    };

    await kv.set(`pessoa:${userId}:${id}`, pessoa);

    return c.json({ success: true, data: pessoa });
  } catch (error) {
    console.log("Erro ao criar pessoa:", error);
    return c.json({ error: "Erro ao criar pessoa" }, 500);
  }
});

app.get("/make-server-808cc1b6/pessoa", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const pessoas = await kv.getByPrefix(`pessoa:${userId}:`);

    return c.json({ success: true, data: pessoas });
  } catch (error) {
    console.log("Erro ao buscar pessoas:", error);
    return c.json({ error: "Erro ao buscar pessoas" }, 500);
  }
});

// ==================== DÍVIDA ====================

app.post("/make-server-808cc1b6/divida", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const parcelado = data.parcelado ?? false;
    const totalParcelas = data.total_parcelas ?? 1;
    const parcelaAtual = data.parcela_atual ?? 1;
    const valorParcela = data.valor_parcela ?? data.valor_total;

    // ID da dívida pai (para dívidas parceladas)
    const dividaPaiId = parcelado ? crypto.randomUUID() : null;

    // Processar pessoas
    let pessoasBase = data.pessoas || [];
    if (data.dividir_igualmente && pessoasBase.length > 0) {
      const valorPorPessoa = valorParcela / pessoasBase.length;
      pessoasBase = pessoasBase.map((p: any) => ({
        pessoa_id: p.pessoa_id,
        valor_individual: valorPorPessoa,
        pago: p.pago ?? false,
      }));
    }

    // Se for dívida simples (1 pessoa), manter compatibilidade
    if (!pessoasBase.length && data.pessoa_id) {
      pessoasBase = [{
        pessoa_id: data.pessoa_id,
        valor_individual: valorParcela,
        pago: data.pago ?? false,
      }];
    }

    if (parcelado) {
      // Criar parcelas para os meses seguintes
      const [ano, mes] = data.data.split("-").map(Number);

      for (let i = 0; i < (totalParcelas - parcelaAtual + 1); i++) {
        const numeroParcela = parcelaAtual + i;
        const dataParcelaMes = new Date(ano, mes - 1 + i, 1);
        const dataParcela = `${dataParcelaMes.getFullYear()}-${String(dataParcelaMes.getMonth() + 1).padStart(2, "0")}-01`;

        const parcelaId = crypto.randomUUID();
        const pessoas = pessoasBase.map((p: any) => ({ ...p, pago: false }));

        const divida = {
          id: parcelaId,
          usuario_id: userId,
          valor_total: data.valor_total,
          valor_parcela: valorParcela,
          descricao: data.descricao || "",
          data: dataParcela,
          observacoes: data.observacoes || "",
          pessoas,
          dividir_igualmente: data.dividir_igualmente ?? false,
          origem_tipo: data.origem_tipo || "cartao",
          cartao_id: data.cartao_id,
          gasto_geral_id: data.gasto_geral_id,
          parcelado: true,
          numero_parcela: numeroParcela,
          total_parcelas: totalParcelas,
          divida_pai_id: dividaPaiId,
        };

        await kv.set(`divida:${userId}:${parcelaId}`, divida);
      }

      return c.json({
        success: true,
        message: `${totalParcelas - parcelaAtual + 1} parcela(s) criada(s)`,
      });
    } else {
      // Criar dívida única
      const id = crypto.randomUUID();
      const divida = {
        id,
        usuario_id: userId,
        valor_total: data.valor_total || data.valor || 0,
        valor_parcela: valorParcela,
        descricao: data.descricao || "",
        data: data.data || new Date().toISOString().split("T")[0],
        observacoes: data.observacoes || "",
        pessoas: pessoasBase,
        dividir_igualmente: data.dividir_igualmente ?? false,
        origem_tipo: data.origem_tipo || "cartao",
        cartao_id: data.cartao_id,
        gasto_geral_id: data.gasto_geral_id,
        parcelado: false,
        numero_parcela: 1,
        total_parcelas: 1,
      };

      await kv.set(`divida:${userId}:${id}`, divida);

      return c.json({ success: true, data: divida });
    }
  } catch (error) {
    console.log("Erro ao criar dívida:", error);
    return c.json({ error: "Erro ao criar dívida" }, 500);
  }
});

app.get("/make-server-808cc1b6/divida", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const dividas = await kv.getByPrefix(`divida:${userId}:`);

    return c.json({ success: true, data: dividas });
  } catch (error) {
    console.log("Erro ao buscar dívidas:", error);
    return c.json({ error: "Erro ao buscar dívidas" }, 500);
  }
});

app.put("/make-server-808cc1b6/divida/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const existing = await kv.get(`divida:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Dívida não encontrada" }, 404);
    }

    // Atualizar status de pagamento de uma pessoa específica
    if (data.marcar_pago_pessoa && data.pessoa_id) {
      const pessoas = existing.pessoas || [];
      const pessoasAtualizadas = pessoas.map((p: any) => {
        if (p.pessoa_id === data.pessoa_id) {
          return { ...p, pago: data.pago };
        }
        return p;
      });

      const updated = { ...existing, pessoas: pessoasAtualizadas };
      await kv.set(`divida:${userId}:${id}`, updated);
      return c.json({ success: true, data: updated });
    }

    // Se for dívida parcelada e quiser editar todas as próximas
    if (data.editar_proximas && existing.parcelado && existing.divida_pai_id) {
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasPai = todasDividas
        .filter(
          (d) => d.divida_pai_id === existing.divida_pai_id && d.numero_parcela >= existing.numero_parcela
        )
        .sort((a, b) => a.numero_parcela - b.numero_parcela);

      const novaParcelaAtual = data.nova_parcela_atual ?? existing.numero_parcela;
      const parcelaOriginal = data.parcela_atual_original ?? existing.numero_parcela;
      const diferencaParcela = novaParcelaAtual - parcelaOriginal;

      for (let i = 0; i < dividasPai.length; i++) {
        const divida = dividasPai[i];
        let pessoas = data.pessoas || divida.pessoas || [];
        const valorParcela = data.valor_parcela ?? divida.valor_parcela;

        if (data.dividir_igualmente && pessoas.length > 0) {
          const valorPorPessoa = valorParcela / pessoas.length;
          pessoas = pessoas.map((p: any) => ({
            ...p,
            valor_individual: valorPorPessoa,
          }));
        }

        // Calcular novo número da parcela
        const novoNumeroParcela = divida.numero_parcela + diferencaParcela;

        // Calcular nova data (se mudou o número da parcela)
        let novaData = data.data ?? divida.data;
        if (diferencaParcela !== 0 && i > 0) {
          // Para parcelas subsequentes, ajustar data baseado na diferença
          const [ano, mes, dia] = novaData.split("-").map(Number);
          const dataBase = new Date(ano, mes - 1, dia);
          dataBase.setMonth(dataBase.getMonth() + i);
          novaData = `${dataBase.getFullYear()}-${String(dataBase.getMonth() + 1).padStart(2, "0")}-${String(dataBase.getDate()).padStart(2, "0")}`;
        } else if (i > 0) {
          // Manter lógica original para parcelas subsequentes se não mudou número
          const [ano, mes, dia] = divida.data.split("-").map(Number);
          const dataOriginal = new Date(ano, mes - 1, dia);
          novaData = `${dataOriginal.getFullYear()}-${String(dataOriginal.getMonth() + 1).padStart(2, "0")}-${String(dataOriginal.getDate()).padStart(2, "0")}`;
        }

        const updated = {
          ...divida,
          valor_total: data.valor_total ?? divida.valor_total,
          valor_parcela: valorParcela,
          descricao: data.descricao ?? divida.descricao,
          data: novaData,
          observacoes: data.observacoes ?? divida.observacoes,
          pessoas,
          dividir_igualmente: data.dividir_igualmente ?? divida.dividir_igualmente,
          origem_tipo: data.origem_tipo ?? divida.origem_tipo,
          cartao_id: data.cartao_id ?? divida.cartao_id,
          gasto_geral_id: data.gasto_geral_id ?? divida.gasto_geral_id,
          numero_parcela: novoNumeroParcela,
        };

        await kv.set(`divida:${userId}:${divida.id}`, updated);
      }

      return c.json({
        success: true,
        message: `${dividasPai.length} parcela(s) atualizada(s)`,
      });
    }

    // Recalcular divisão se necessário
    let pessoas = data.pessoas || existing.pessoas || [];
    if (data.dividir_igualmente && pessoas.length > 0 && data.valor_total) {
      const valorParcela = data.valor_parcela ?? existing.valor_parcela;
      const valorPorPessoa = valorParcela / pessoas.length;
      pessoas = pessoas.map((p: any) => ({
        ...p,
        valor_individual: valorPorPessoa,
      }));
    }

    const updated = {
      ...existing,
      valor_total: data.valor_total ?? existing.valor_total,
      valor_parcela: data.valor_parcela ?? existing.valor_parcela,
      descricao: data.descricao ?? existing.descricao,
      data: data.data ?? existing.data,
      observacoes: data.observacoes ?? existing.observacoes,
      pessoas,
      dividir_igualmente: data.dividir_igualmente ?? existing.dividir_igualmente,
      origem_tipo: data.origem_tipo ?? existing.origem_tipo,
      cartao_id: data.cartao_id ?? existing.cartao_id,
      gasto_geral_id: data.gasto_geral_id ?? existing.gasto_geral_id,
      parcelado: data.parcelado ?? existing.parcelado,
      total_parcelas: data.total_parcelas ?? existing.total_parcelas,
      numero_parcela: existing.numero_parcela,
      divida_pai_id: existing.divida_pai_id,
    };

    await kv.set(`divida:${userId}:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.log("Erro ao atualizar dívida:", error);
    return c.json({ error: "Erro ao atualizar dívida" }, 500);
  }
});

app.delete("/make-server-808cc1b6/divida/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await kv.del(`divida:${userId}:${id}`);

    return c.json({ success: true, message: "Dívida deletada" });
  } catch (error) {
    console.error("❌ Erro ao deletar dívida:", error);
    return c.json({ error: "Erro ao deletar dívida" }, 500);
  }
});

// ==================== GUARDADO ====================

app.post("/make-server-808cc1b6/movimentacao-guardado", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const id = crypto.randomUUID();
    const movimentacao = {
      id,
      usuario_id: userId,
      ...data,
      data: data.data ?? new Date().toISOString(),
    };

    await kv.set(`movimentacao_guardado:${userId}:${id}`, movimentacao);

    console.log(`✅ Movimentação criada: ${data.tipo} de ${data.valor} em ${data.data}`);

    return c.json({ success: true, data: movimentacao });
  } catch (error) {
    console.log("Erro ao criar movimentação guardado:", error);
    return c.json({ error: "Erro ao criar movimentação guardado" }, 500);
  }
});

app.get("/make-server-808cc1b6/movimentacao-guardado", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const movimentacoes = await kv.getByPrefix(`movimentacao_guardado:${userId}:`);

    return c.json({ success: true, data: movimentacoes });
  } catch (error) {
    console.log("Erro ao buscar movimentações guardado:", error);
    return c.json({ error: "Erro ao buscar movimentações guardado" }, 500);
  }
});

app.post("/make-server-808cc1b6/guardado-mensal", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const guardado = {
      id: crypto.randomUUID(),
      usuario_id: userId,
      mes_referencia: data.mes_referencia,
      meta_mensal: data.meta_mensal || 0,
      valor_guardado: data.valor_guardado || 0,
    };

    await kv.set(`guardado_mensal:${userId}:${data.mes_referencia}`, guardado);

    return c.json({ success: true, data: guardado });
  } catch (error) {
    console.log("Erro ao criar guardado mensal:", error);
    return c.json({ error: "Erro ao criar guardado mensal" }, 500);
  }
});

app.get("/make-server-808cc1b6/guardado-mensal", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const guardados = await kv.getByPrefix(`guardado_mensal:${userId}:`);

    return c.json({ success: true, data: guardados.map((g) => g.value) });
  } catch (error) {
    console.log("Erro ao buscar guardados mensais:", error);
    return c.json({ error: "Erro ao buscar guardados mensais" }, 500);
  }
});

app.get("/make-server-808cc1b6/guardado-mensal/:mes", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.param("mes");

    console.log(`🔵 GET /guardado-mensal/${mes}`);

    const guardado = await kv.get(`guardado_mensal:${userId}:${mes}`);

    if (!guardado) {
      console.log(`  ⚠️ Guardado mensal não encontrado para ${mes} - retornando valores zerados`);
      return c.json({
        success: true,
        data: {
          mes_referencia: mes,
          meta_mensal: 0,
          valor_guardado: 0,
        },
      });
    }

    console.log(`  ✅ Guardado encontrado: Meta=${guardado.meta_mensal}, Valor=${guardado.valor_guardado}`);
    return c.json({ success: true, data: guardado });
  } catch (error) {
    console.log("Erro ao buscar guardado mensal:", error);
    return c.json({ error: "Erro ao buscar guardado mensal" }, 500);
  }
});

app.put("/make-server-808cc1b6/guardado-mensal/:mes", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.param("mes");
    const data = await c.req.json();

    console.log(`🔵 PUT /guardado-mensal/${mes} - Dados recebidos:`, data);

    const existing = await kv.get(`guardado_mensal:${userId}:${mes}`);

    const guardado = {
      id: existing?.id || crypto.randomUUID(),
      usuario_id: userId,
      mes_referencia: mes,
      meta_mensal: data.meta_mensal ?? existing?.meta_mensal ?? 0,
      valor_guardado: data.valor_guardado ?? existing?.valor_guardado ?? 0,
    };

    console.log(`  📊 Guardado a ser salvo:`, guardado);

    await kv.set(`guardado_mensal:${userId}:${mes}`, guardado);

    console.log(`  ✅ Guardado mensal atualizado para ${mes}`);

    return c.json({ success: true, data: guardado });
  } catch (error) {
    console.log("Erro ao atualizar guardado mensal:", error);
    return c.json({ error: "Erro ao atualizar guardado mensal" }, 500);
  }
});

// ==================== GASTO GERAL ====================

app.post("/make-server-808cc1b6/gasto-geral", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const mesInicio = data.mes_referencia; // YYYY-MM
    const [ano, mes] = mesInicio.split("-").map(Number);

    // Encontrar pessoa "Eu" do usuário
    const todasPessoas = await kv.getByPrefix(`pessoa:${userId}:`);
    const pessoaEu = todasPessoas.find((p) => p.nome === "Eu");
    const euPessoaId = pessoaEu?.id;

    // Função auxiliar para criar dívidas
    const criarDividas = async (gastoId: string, pessoas: any[], valorTotal: number, mesRef: string) => {
      if (!pessoas || pessoas.length === 0) return;

      for (const pessoa of pessoas) {
        // Não criar dívida para "Eu"
        if (pessoa.pessoa_id === euPessoaId) continue;

        const dividaId = crypto.randomUUID();
        const divida = {
          id: dividaId,
          usuario_id: userId,
          valor_total: pessoa.valor_individual,
          valor_parcela: pessoa.valor_individual,
          descricao: `${data.descricao} (Gasto Geral)`,
          data: data.data,
          mes_referencia: mesRef,
          observacoes: `Criado automaticamente a partir de gasto geral: ${data.categoria}`,
          pessoas: [pessoa],
          dividir_igualmente: false,
          origem_tipo: "gasto_geral",
          gasto_geral_id: gastoId,
          parcelado: false,
          numero_parcela: 1,
          total_parcelas: 1,
        };
        await kv.set(`divida:${userId}:${dividaId}`, divida);
      }
    };

    // Calcular valor do gasto (apenas parte do usuário se ele está incluído)
    const calcularValorGasto = (pessoas: any[], valorTotal: number) => {
      if (!pessoas || pessoas.length === 0) return valorTotal;

      const pessoaEuNaLista = pessoas.find((p) => p.pessoa_id === euPessoaId);
      if (pessoaEuNaLista) {
        return pessoaEuNaLista.valor_individual;
      }
      return valorTotal;
    };

    if (data.recorrente) {
      // Criar gasto para todos os meses até dezembro do ano atual
      const anoAtual = new Date().getFullYear();
      const ultimoMes = ano === anoAtual ? 12 : 12;

      for (let m = mes; m <= ultimoMes; m++) {
        const id = crypto.randomUUID();
        const mesRef = `${ano}-${String(m).padStart(2, "0")}`;
        const valorGasto = calcularValorGasto(data.pessoas || [], data.valor);

        const gasto = {
          id,
          usuario_id: userId,
          categoria: data.categoria,
          descricao: data.descricao,
          valor: valorGasto,
          valor_total_original: data.valor,
          data: data.data,
          mes_referencia: mesRef,
          recorrente: true,
          pessoas: data.pessoas || [],
          dividir_igualmente: data.dividir_igualmente ?? true,
        };
        await kv.set(`gasto_geral:${userId}:${id}`, gasto);

        // Criar dívidas para outras pessoas
        await criarDividas(id, data.pessoas || [], data.valor, mesRef);
      }
    } else {
      // Criar apenas um gasto
      const id = crypto.randomUUID();
      const valorGasto = calcularValorGasto(data.pessoas || [], data.valor);

      const gasto = {
        id,
        usuario_id: userId,
        categoria: data.categoria,
        descricao: data.descricao,
        valor: valorGasto,
        valor_total_original: data.valor,
        data: data.data,
        mes_referencia: data.mes_referencia,
        recorrente: false,
        pessoas: data.pessoas || [],
        dividir_igualmente: data.dividir_igualmente ?? true,
      };
      await kv.set(`gasto_geral:${userId}:${id}`, gasto);

      // Criar dívidas para outras pessoas
      await criarDividas(id, data.pessoas || [], data.valor, data.mes_referencia);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao criar gasto geral:", error);
    return c.json({ error: "Erro ao criar gasto geral" }, 500);
  }
});

app.get("/make-server-808cc1b6/gasto-geral", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const mes = c.req.query("mes");

    let gastos = await kv.getByPrefix(`gasto_geral:${userId}:`);
    const gastosValidos = gastos.filter((g) => g && g.id);

    if (mes) {
      const resultado = gastosValidos.filter((g) => g.mes_referencia === mes);
      return c.json({ success: true, data: resultado });
    }

    return c.json({ success: true, data: gastosValidos });
  } catch (error) {
    console.error("❌ Erro ao buscar gastos gerais:", error);
    return c.json({ error: `Erro ao buscar gastos gerais: ${error.message}` }, 500);
  }
});

app.put("/make-server-808cc1b6/gasto-geral/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const gastoExistente = await kv.get(`gasto_geral:${userId}:${id}`);
    if (!gastoExistente) {
      return c.json({ error: "Gasto não encontrado" }, 404);
    }

    // Encontrar pessoa "Eu" do usuário
    const todasPessoas = await kv.getByPrefix(`pessoa:${userId}:`);
    const pessoaEu = todasPessoas.find((p) => p.nome === "Eu");
    const euPessoaId = pessoaEu?.id;

    // Função auxiliar para calcular valor do gasto
    const calcularValorGasto = (pessoas: any[], valorTotal: number) => {
      if (!pessoas || pessoas.length === 0) return valorTotal;
      const pessoaEuNaLista = pessoas.find((p) => p.pessoa_id === euPessoaId);
      if (pessoaEuNaLista) {
        return pessoaEuNaLista.valor_individual;
      }
      return valorTotal;
    };

    // Função auxiliar para gerenciar dívidas
    const gerenciarDividas = async (gastoId: string, pessoas: any[], valorTotal: number, mesRef: string, descricao: string, categoria: string, dataGasto: string) => {
      // Deletar dívidas antigas relacionadas a este gasto
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      for (const divida of todasDividas) {
        if (divida.gasto_geral_id === gastoId) {
          await kv.delete(`divida:${userId}:${divida.id}`);
        }
      }

      // Criar novas dívidas para pessoas que não são "Eu"
      if (!pessoas || pessoas.length === 0) return;

      for (const pessoa of pessoas) {
        if (pessoa.pessoa_id === euPessoaId) continue;

        const dividaId = crypto.randomUUID();
        const divida = {
          id: dividaId,
          usuario_id: userId,
          valor_total: pessoa.valor_individual,
          valor_parcela: pessoa.valor_individual,
          descricao: `${descricao} (Gasto Geral)`,
          data: dataGasto,
          mes_referencia: mesRef,
          observacoes: `Criado automaticamente a partir de gasto geral: ${categoria}`,
          pessoas: [pessoa],
          dividir_igualmente: false,
          origem_tipo: "gasto_geral",
          gasto_geral_id: gastoId,
          parcelado: false,
          numero_parcela: 1,
          total_parcelas: 1,
        };
        await kv.set(`divida:${userId}:${dividaId}`, divida);
      }
    };

    // Se for apenas para marcar/desmarcar pagamento de uma pessoa
    if (data.marcar_pago_pessoa) {
      const pessoas = gastoExistente.pessoas || [];
      const pessoasAtualizadas = pessoas.map((p) =>
        p.pessoa_id === data.pessoa_id ? { ...p, pago: data.pago } : p
      );

      const gastoAtualizado = {
        ...gastoExistente,
        pessoas: pessoasAtualizadas,
      };

      await kv.set(`gasto_geral:${userId}:${id}`, gastoAtualizado);

      // Atualizar dívida correspondente
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      for (const divida of todasDividas) {
        if (divida.gasto_geral_id === id && divida.pessoas && divida.pessoas.length > 0) {
          const pessoaDivida = divida.pessoas.find((p) => p.pessoa_id === data.pessoa_id);
          if (pessoaDivida) {
            const dividaAtualizada = {
              ...divida,
              pessoas: divida.pessoas.map((p) =>
                p.pessoa_id === data.pessoa_id ? { ...p, pago: data.pago } : p
              ),
            };
            await kv.set(`divida:${userId}:${divida.id}`, dividaAtualizada);
          }
        }
      }

      return c.json({ success: true, data: gastoAtualizado });
    }

    if (data.editar_proximas && gastoExistente.recorrente) {
      // Editar este gasto e todos os próximos (mesmo mês ou posterior)
      const mesAtual = gastoExistente.mes_referencia;
      const todosGastos = await kv.getByPrefix(`gasto_geral:${userId}:`);

      for (const gasto of todosGastos) {
        if (gasto.recorrente && gasto.mes_referencia >= mesAtual) {
          const novasPessoas = data.pessoas !== undefined ? data.pessoas : gasto.pessoas;
          const novoValorTotal = data.valor !== undefined ? data.valor : (gasto.valor_total_original || gasto.valor);
          const novoValorGasto = calcularValorGasto(novasPessoas, novoValorTotal);
          const novaDescricao = data.descricao !== undefined ? data.descricao : gasto.descricao;
          const novaCategoria = data.categoria !== undefined ? data.categoria : gasto.categoria;
          const novaData = data.data !== undefined ? data.data : gasto.data;

          const gastoAtualizado = {
            ...gasto,
            categoria: novaCategoria,
            descricao: novaDescricao,
            valor: novoValorGasto,
            valor_total_original: novoValorTotal,
            data: novaData,
            recorrente: data.recorrente !== undefined ? data.recorrente : gasto.recorrente,
            pessoas: novasPessoas,
            dividir_igualmente: data.dividir_igualmente !== undefined ? data.dividir_igualmente : gasto.dividir_igualmente,
          };
          await kv.set(`gasto_geral:${userId}:${gasto.id}`, gastoAtualizado);

          // Gerenciar dívidas
          await gerenciarDividas(gasto.id, novasPessoas, novoValorTotal, gasto.mes_referencia, novaDescricao, novaCategoria, novaData);
        }
      }
    } else if (data.recorrente && !gastoExistente.recorrente) {
      // Transformar em recorrente - criar para os meses seguintes
      const mesAtual = gastoExistente.mes_referencia;
      const [ano, mes] = mesAtual.split("-").map(Number);

      const novasPessoas = data.pessoas !== undefined ? data.pessoas : gastoExistente.pessoas;
      const novoValorTotal = data.valor !== undefined ? data.valor : (gastoExistente.valor_total_original || gastoExistente.valor);
      const novoValorGasto = calcularValorGasto(novasPessoas, novoValorTotal);
      const novaDescricao = data.descricao !== undefined ? data.descricao : gastoExistente.descricao;
      const novaCategoria = data.categoria !== undefined ? data.categoria : gastoExistente.categoria;
      const novaData = data.data !== undefined ? data.data : gastoExistente.data;

      // Atualizar o gasto atual
      const gastoAtualizado = {
        ...gastoExistente,
        categoria: novaCategoria,
        descricao: novaDescricao,
        valor: novoValorGasto,
        valor_total_original: novoValorTotal,
        data: novaData,
        recorrente: true,
        pessoas: novasPessoas,
        dividir_igualmente: data.dividir_igualmente !== undefined ? data.dividir_igualmente : gastoExistente.dividir_igualmente,
      };
      await kv.set(`gasto_geral:${userId}:${id}`, gastoAtualizado);

      // Gerenciar dívidas do gasto atual
      await gerenciarDividas(id, novasPessoas, novoValorTotal, mesAtual, novaDescricao, novaCategoria, novaData);

      // Criar gastos para os meses seguintes até dezembro
      for (let m = mes + 1; m <= 12; m++) {
        const novoId = crypto.randomUUID();
        const mesRef = `${ano}-${String(m).padStart(2, "0")}`;
        const novoGasto = {
          id: novoId,
          usuario_id: userId,
          categoria: novaCategoria,
          descricao: novaDescricao,
          valor: novoValorGasto,
          valor_total_original: novoValorTotal,
          data: novaData,
          mes_referencia: mesRef,
          recorrente: true,
          pessoas: novasPessoas,
          dividir_igualmente: data.dividir_igualmente !== undefined ? data.dividir_igualmente : gastoExistente.dividir_igualmente,
        };
        await kv.set(`gasto_geral:${userId}:${novoId}`, novoGasto);

        // Gerenciar dívidas do novo gasto
        await gerenciarDividas(novoId, novasPessoas, novoValorTotal, mesRef, novaDescricao, novaCategoria, novaData);
      }
    } else {
      // Editar apenas este gasto
      const novasPessoas = data.pessoas !== undefined ? data.pessoas : gastoExistente.pessoas;
      const novoValorTotal = data.valor !== undefined ? data.valor : (gastoExistente.valor_total_original || gastoExistente.valor);
      const novoValorGasto = calcularValorGasto(novasPessoas, novoValorTotal);
      const novaDescricao = data.descricao !== undefined ? data.descricao : gastoExistente.descricao;
      const novaCategoria = data.categoria !== undefined ? data.categoria : gastoExistente.categoria;
      const novaData = data.data !== undefined ? data.data : gastoExistente.data;

      const gastoAtualizado = {
        ...gastoExistente,
        categoria: novaCategoria,
        descricao: novaDescricao,
        valor: novoValorGasto,
        valor_total_original: novoValorTotal,
        data: novaData,
        recorrente: data.recorrente !== undefined ? data.recorrente : false,
        pessoas: novasPessoas,
        dividir_igualmente: data.dividir_igualmente !== undefined ? data.dividir_igualmente : gastoExistente.dividir_igualmente,
      };
      await kv.set(`gasto_geral:${userId}:${id}`, gastoAtualizado);

      // Gerenciar dívidas
      await gerenciarDividas(id, novasPessoas, novoValorTotal, gastoExistente.mes_referencia, novaDescricao, novaCategoria, novaData);
    }

    return c.json({ success: true, message: "Gasto atualizado" });
  } catch (error) {
    console.error("❌ Erro ao atualizar gasto:", error);
    return c.json({ error: "Erro ao atualizar gasto" }, 500);
  }
});

app.delete("/make-server-808cc1b6/gasto-geral/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    // Deletar dívidas associadas a este gasto
    const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
    for (const divida of todasDividas) {
      if (divida.gasto_geral_id === id) {
        await kv.delete(`divida:${userId}:${divida.id}`);
      }
    }

    // Deletar o gasto
    await kv.del(`gasto_geral:${userId}:${id}`);

    return c.json({ success: true, message: "Gasto deletado" });
  } catch (error) {
    console.error("❌ Erro ao deletar gasto:", error);
    return c.json({ error: "Erro ao deletar gasto" }, 500);
  }
});

Deno.serve(app.fetch);