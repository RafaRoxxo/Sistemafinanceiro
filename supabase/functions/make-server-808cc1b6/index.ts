// CRITICAL FIX: Force Supabase recompile - Timestamp: 2026-05-14T16:25:00
// All kv.delete calls replaced with kv.mdel batch operations
// Version: 4.0.0 - DEPLOYMENT READY

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { hashPassword, verifyPassword, generateToken } from "./auth.ts";
import { authMiddleware } from "./middleware.ts";
import { FORCE_RELOAD_VERSION } from "./force_reload.ts";

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
  return c.json({
    status: "ok",
    version: FORCE_RELOAD_VERSION,
    deployTimestamp: "2026-05-14T16:30:00",
    currentTime: new Date().toISOString(),
    timestamp: Date.now(),
    message: "Server v4.0.0 - kv.mdel batch operations ACTIVE - Cache busted"
  });
});

app.get("/make-server-808cc1b6/version", (c) => {
  return c.json({
    version: FORCE_RELOAD_VERSION,
    kvMethods: Object.keys(kv),
    updated: "2026-05-14T13:50:00Z",
    hasMdel: typeof kv.mdel === 'function',
    hasDel: typeof kv.del === 'function'
  });
});

// Test endpoint para verificar kv.mdel
app.get("/make-server-808cc1b6/test-delete", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    // Criar chaves de teste
    const testKey1 = `test:${userId}:key1`;
    const testKey2 = `test:${userId}:key2`;

    // Criar valores de teste
    await kv.set(testKey1, { test: "value1" });
    await kv.set(testKey2, { test: "value2" });

    // Verificar se foram criados
    const val1 = await kv.get(testKey1);
    const val2 = await kv.get(testKey2);

    // Deletar usando mdel
    await kv.mdel([testKey1, testKey2]);

    // Verificar se foram deletados
    const afterDel1 = await kv.get(testKey1);
    const afterDel2 = await kv.get(testKey2);

    return c.json({
      success: true,
      beforeDelete: { val1, val2 },
      afterDelete: { afterDel1, afterDel2 },
      mdelWorks: afterDel1 === null && afterDel2 === null
    });
  } catch (error) {
    return c.json({
      error: error.message,
      stack: error.stack
    }, 500);
  }
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
            from: "Sistema Financeiro <onboarding@resend.dev>",
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

// ==================== DEBUG E MANUTENÇÃO ====================

app.get("/make-server-808cc1b6/debug/dividas-pessoas", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");

    const pessoas = await kv.getByPrefix(`pessoa:${userId}:`);
    const dividas = await kv.getByPrefix(`divida:${userId}:`);
    const gastosGerais = await kv.getByPrefix(`gasto_geral:${userId}:`);
    const cartoes = await kv.getByPrefix(`cartao:${userId}:`);

    const pessoasIds = new Set(pessoas.map(p => p.id));
    const gastosIds = new Set(gastosGerais.map(g => g.id));
    const cartoesIds = new Set(cartoes.map(c => c.id));

    const dividasDetalhadas = dividas.map(d => {
      const pessoasValidas = d.pessoas?.map((p: any) => ({
        pessoa_id: p.pessoa_id,
        existe: pessoasIds.has(p.pessoa_id),
        valor: p.valor_individual,
        pago: p.pago,
      })) || [];

      return {
        id: d.id,
        descricao: d.descricao,
        valor_total: d.valor_total,
        data: d.data,
        origem_tipo: d.origem_tipo,
        gasto_geral_id: d.gasto_geral_id,
        gasto_geral_existe: d.gasto_geral_id ? gastosIds.has(d.gasto_geral_id) : null,
        cartao_id: d.cartao_id,
        cartao_existe: d.cartao_id ? cartoesIds.has(d.cartao_id) : null,
        pessoas: pessoasValidas,
        tem_pessoa_invalida: pessoasValidas.some((p: any) => !p.existe),
        deveria_ser_deletada:
          (!d.pessoas || d.pessoas.length === 0) ||
          pessoasValidas.some((p: any) => !p.existe) ||
          (d.origem_tipo === "gasto_geral" && d.gasto_geral_id && !gastosIds.has(d.gasto_geral_id)) ||
          (d.origem_tipo === "cartao" && d.cartao_id && !cartoesIds.has(d.cartao_id)),
      };
    });

    return c.json({
      success: true,
      data: {
        total_pessoas: pessoas.length,
        pessoas: pessoas.map(p => ({ id: p.id, nome: p.nome })),
        total_dividas: dividas.length,
        dividas: dividasDetalhadas,
        total_gastos_gerais: gastosGerais.length,
        total_cartoes: cartoes.length,
        dividas_orfas: dividasDetalhadas.filter(d => d.deveria_ser_deletada).length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar debug:", error);
    return c.json({ error: "Erro ao buscar debug" }, 500);
  }
});

app.post("/make-server-808cc1b6/limpar-dados-orfaos", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    let removidos = {
      parcelas: 0,
      compras: 0,
      dividas: 0,
      movimentacoes_caixinha: 0,
      gastos_gerais: 0,
    };

    // 1. Buscar todas as entidades
    const cartoes = await kv.getByPrefix(`cartao:${userId}:`);
    const compras = await kv.getByPrefix(`compra:${userId}:`);
    const parcelas = await kv.getByPrefix(`parcela:${userId}:`);
    const pessoas = await kv.getByPrefix(`pessoa:${userId}:`);
    const dividas = await kv.getByPrefix(`divida:${userId}:`);
    const caixinhas = await kv.getByPrefix(`caixinha:${userId}:`);
    const movimentacoesCaixinha = await kv.getByPrefix(`movimentacao_caixinha:${userId}:`);
    const gastosGerais = await kv.getByPrefix(`gasto_geral:${userId}:`);

    const cartoesIds = new Set(cartoes.map(c => c.id));
    const comprasIds = new Set(compras.map(c => c.id));
    const pessoasIds = new Set(pessoas.map(p => p.id));
    const caixinhasIds = new Set(caixinhas.map(c => c.id));
    const gastosGeraisIds = new Set(gastosGerais.map(g => g.id));

    // 2. Remover parcelas órfãs (sem compra válida)
    for (const parcela of parcelas) {
      if (!parcela.compra_id || !comprasIds.has(parcela.compra_id)) {
        await kv.del(`parcela:${userId}:${parcela.id}`);
        removidos.parcelas++;
      }
    }

    // 3. Remover compras órfãs (sem cartão válido)
    for (const compra of compras) {
      if (!compra.cartao_id || !cartoesIds.has(compra.cartao_id)) {
        // Deletar parcelas desta compra também
        const parcelasDaCompra = parcelas.filter(p => p.compra_id === compra.id);
        for (const parcela of parcelasDaCompra) {
          await kv.del(`parcela:${userId}:${parcela.id}`);
          removidos.parcelas++;
        }
        await kv.del(`compra:${userId}:${compra.id}`);
        removidos.compras++;
      }
    }

    // 4. Remover dívidas órfãs (sem pessoa válida ou sem gasto geral válido)
    for (const divida of dividas) {
      let deveDeletar = false;
      let motivo = "";

      // Verificar se não tem o campo pessoas ou está vazio
      if (!divida.pessoas || !Array.isArray(divida.pessoas) || divida.pessoas.length === 0) {
        deveDeletar = true;
        motivo = "sem pessoas vinculadas";
      } else {
        // Verificar se alguma pessoa da dívida não existe mais
        for (const pessoa of divida.pessoas) {
          if (!pessoa.pessoa_id || !pessoasIds.has(pessoa.pessoa_id)) {
            deveDeletar = true;
            motivo = `pessoa ${pessoa.pessoa_id} não existe`;
            break;
          }
        }
      }

      // Verificar se é de gasto geral e o gasto não existe mais
      if (!deveDeletar && divida.origem_tipo === "gasto_geral" && divida.gasto_geral_id) {
        if (!gastosGeraisIds.has(divida.gasto_geral_id)) {
          deveDeletar = true;
          motivo = `gasto geral ${divida.gasto_geral_id} não existe`;
        }
      }

      // Verificar se é de cartão e o cartão não existe mais
      if (!deveDeletar && divida.origem_tipo === "cartao" && divida.cartao_id) {
        if (!cartoesIds.has(divida.cartao_id)) {
          deveDeletar = true;
          motivo = `cartão ${divida.cartao_id} não existe`;
        }
      }

      if (deveDeletar) {
        console.log(`🗑️ Removendo dívida ${divida.id} - Motivo: ${motivo}`);
        await kv.del(`divida:${userId}:${divida.id}`);
        removidos.dividas++;
      }
    }

    // 5. Remover movimentações de caixinha órfãs (sem caixinha válida)
    for (const mov of movimentacoesCaixinha) {
      // Extrair caixinha_id da key: movimentacao_caixinha:userId:caixinhaId:movId
      const keyParts = mov.id?.split?.(":") || [];
      const caixinhaId = keyParts[2];

      if (!caixinhaId || !caixinhasIds.has(caixinhaId)) {
        await kv.del(`movimentacao_caixinha:${userId}:${caixinhaId}:${mov.id}`);
        removidos.movimentacoes_caixinha++;
      }
    }

    // 6. Remover gastos gerais órfãos (sem pessoa responsável válida)
    for (const gasto of gastosGerais) {
      if (gasto.responsavel_id && !pessoasIds.has(gasto.responsavel_id)) {
        await kv.del(`gasto_geral:${userId}:${gasto.id}`);
        removidos.gastos_gerais++;
      }
    }

    return c.json({
      success: true,
      message: "Limpeza concluída",
      removidos,
    });
  } catch (error) {
    console.error("❌ Erro ao limpar dados órfãos:", error);
    return c.json({ error: "Erro ao limpar dados órfãos" }, 500);
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

    // Buscar todas as compras deste cartão
    const compras = await kv.getByPrefix(`compra:${userId}:`);
    const comprasDoCartao = compras.filter((c) => c && c.cartao_id === id);

    // Deletar todas as parcelas de cada compra
    for (const compra of comprasDoCartao) {
      const parcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = parcelas.filter((p) => p && p.compra_id === compra.id);

      for (const parcela of parcelasDaCompra) {
        await kv.del(`parcela:${userId}:${parcela.id}`);
      }

      // Deletar a compra
      await kv.del(`compra:${userId}:${compra.id}`);
    }

    // Deletar o cartão
    await kv.del(`cartao:${userId}:${id}`);

    return c.json({
      success: true,
      message: `Cartão deletado junto com ${comprasDoCartao.length} compra(s) e suas parcelas`
    });
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

    // Verificar se é compra recorrente
    const isRecorrente = data.recorrente === true;

    let parcelasCriadas = 0;

    if (isRecorrente) {
      // COMPRA RECORRENTE: Criar parcelas para os próximos 12 meses
      console.log(`🔵 Criando parcelas RECORRENTES - Frequência: ${data.frequencia || 'mensal'}`);

      const mesCobranca = data.mes_cobranca; // YYYY-MM
      const [anoInicio, mesInicio] = mesCobranca.split("-").map(Number);
      const frequencia = data.frequencia || 'mensal';

      // Determinar quantas parcelas criar
      let numeroParcelas = 12; // Default: 12 meses
      if (frequencia === 'semanal') numeroParcelas = 52; // 52 semanas
      if (frequencia === 'anual') numeroParcelas = 3; // 3 anos

      for (let i = 0; i < numeroParcelas; i++) {
        try {
          const parcelaId = crypto.randomUUID();
          let dataCobranca: Date;

          // Calcular data baseado na frequência
          if (frequencia === 'semanal') {
            dataCobranca = new Date(anoInicio, mesInicio - 1, 1);
            dataCobranca.setDate(dataCobranca.getDate() + (i * 7));
          } else if (frequencia === 'anual') {
            dataCobranca = new Date(anoInicio + i, mesInicio - 1, 1);
          } else { // mensal (default)
            dataCobranca = new Date(anoInicio, mesInicio - 1 + i, 1);
          }

          const anoCobranca = dataCobranca.getFullYear();
          const mesCobranca = String(dataCobranca.getMonth() + 1).padStart(2, "0");
          const diaCobranca = String(dataCobranca.getDate()).padStart(2, "0");
          const dataCobrancaStr = `${anoCobranca}-${mesCobranca}-${diaCobranca}`;

          const parcela = {
            id: parcelaId,
            compra_id: compraId,
            numero_parcela: i + 1,
            total_parcelas: 999, // Indica que é recorrente (número alto)
            valor: data.valor_parcela,
            data_cobranca: dataCobrancaStr,
            foi_editada: false,
            recorrente: true,
            frequencia: frequencia,
          };

          await kv.set(`parcela:${userId}:${parcelaId}`, parcela);
          parcelasCriadas++;
          console.log(`  ✅ Parcela recorrente ${i + 1} salva - Data: ${dataCobrancaStr}`);
        } catch (error) {
          console.error(`  ❌ Erro ao criar parcela recorrente ${i + 1}:`, error);
        }
      }

      console.log(`✅ Total de ${parcelasCriadas} parcelas RECORRENTES criadas`);

    } else {
      // COMPRA PARCELADA NORMAL: Criar parcelas numeradas
      const parcelaAtual = data.parcela_atual || 1;
      const totalParcelas = data.total_parcelas || 1;
      const mesInicio = data.mes_cobranca; // YYYY-MM

      console.log(`🔵 Criando parcelas PARCELADAS - Parcela atual: ${parcelaAtual}, Total: ${totalParcelas}, Mês início: ${mesInicio}`);

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
            recorrente: false,
          };

          await kv.set(`parcela:${userId}:${parcelaId}`, parcela);
          parcelasCriadas++;
          console.log(`  ✅ Parcela ${i}/${totalParcelas} salva - ID: ${parcelaId} - Data: ${dataCobranca}`);
        } catch (error) {
          console.error(`  ❌ Erro ao criar parcela ${i}/${totalParcelas}:`, error);
        }
      }

      console.log(`✅ Total de ${parcelasCriadas} parcelas PARCELADAS criadas`);
    }

    // Se vincular_pessoa foi marcado, criar dívida automaticamente para TODAS as parcelas criadas
    if (data.vincular_pessoa) {
      const pessoasIds = data.pessoas_ids || (data.pessoa_id ? [data.pessoa_id] : []);

      if (pessoasIds.length > 0) {
        console.log(`🔵 Criando dívidas para ${pessoasIds.length} pessoa(s) - ${parcelasCriadas} parcelas`);

        const dividaPaiId = crypto.randomUUID();
        const dividirIgualmente = data.dividir_igualmente ?? true;

        // Buscar todas as parcelas criadas para criar dívidas correspondentes
        const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
        const parcelasDaCompra = todasParcelas.filter((p) => p.compra_id === compraId);

        for (const parcela of parcelasDaCompra) {
          // Criar UMA DÍVIDA INDIVIDUAL para cada pessoa
          for (const pessoaId of pessoasIds) {
            // Calcular valor individual desta pessoa
            let valorIndividual: number;
            if (dividirIgualmente) {
              valorIndividual = parcela.valor / pessoasIds.length;
            } else {
              valorIndividual = data.valores_individuais?.[pessoaId]
                ? parseFloat(data.valores_individuais[pessoaId])
                : 0;
            }

            const dividaId = crypto.randomUUID();
            const divida = {
              id: dividaId,
              usuario_id: userId,
              valor_total: valorIndividual,
              valor_parcela: valorIndividual,
              descricao: isRecorrente
                ? `${data.descricao} (Recorrente)`
                : parcela.total_parcelas > 1
                  ? `${data.descricao} (${parcela.numero_parcela}/${parcela.total_parcelas})`
                  : data.descricao,
              data: parcela.data_cobranca,
              observacoes: `Criado automaticamente a partir de compra no cartão`,
              pessoas: [
                {
                  pessoa_id: pessoaId,
                  valor_individual: valorIndividual,
                  pago: false,
                },
              ],
              dividir_igualmente: false,
              origem_tipo: "cartao",
              cartao_id: data.cartao_id,
              compra_id: compraId,
              parcela_id: parcela.id,
              parcelado: !isRecorrente && parcela.total_parcelas > 1,
              recorrente: isRecorrente,
              numero_parcela: parcela.numero_parcela,
              total_parcelas: parcela.total_parcelas,
              divida_pai_id: dividaPaiId,
            };

            await kv.set(`divida:${userId}:${dividaId}`, divida);
          }
        }

        console.log(`✅ ${parcelasDaCompra.length} dívidas criadas para ${pessoasIds.length} pessoa(s) vinculada(s)`);
      }
    }

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
      total_parcelas: data.total_parcelas !== undefined ? data.total_parcelas : parcela.total_parcelas,
      recorrente: data.recorrente !== undefined ? data.recorrente : parcela.recorrente,
      frequencia: data.frequencia !== undefined ? data.frequencia : parcela.frequencia,
    };

    await kv.set(`parcela:${userId}:${id}`, parcelaAtualizada);

    return c.json({ success: true, data: parcelaAtualizada });
  } catch (error) {
    console.error("Erro ao atualizar parcela:", error);
    return c.json({ error: "Erro ao atualizar parcela" }, 500);
  }
});

// NOVO ENDPOINT V2 para bypass de cache
app.delete("/make-server-808cc1b6/parcela-v2/:id", authMiddleware, async (c) => {
  try {
    console.log("🟢 DELETE /parcela-v2/:id - NOVO ENDPOINT (bypass cache)");
    const userId = c.get("userId");
    const id = c.req.param("id");
    const deletarTodas = c.req.query("deletar_todas") === "true";
    const deletarProximas = c.req.query("deletar_proximas") === "true";
    const deletarAnteriores = c.req.query("deletar_anteriores") === "true";

    console.log(`  UserId: ${userId}, ParcelaId: ${id}, DeletarTodas: ${deletarTodas}, DeletarProximas: ${deletarProximas}, DeletarAnteriores: ${deletarAnteriores}`);

    const parcela = await kv.get(`parcela:${userId}:${id}`);
    console.log(`  Parcela encontrada:`, parcela ? "SIM" : "NÃO");

    if (!parcela) {
      console.log("❌ Parcela não encontrada");
      return c.json({ error: "Parcela não encontrada" }, 404);
    }

    if (deletarTodas && parcela.compra_id) {
      console.log(`  Deletando todas as parcelas da compra: ${parcela.compra_id}`);

      // Buscar todas as parcelas desta compra
      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) => p.compra_id === parcela.compra_id);
      console.log(`  Parcelas desta compra: ${parcelasDaCompra.length}`);

      // Coletar chaves para deletar em lote
      const keysToDelete: string[] = [];

      // Adicionar parcelas
      parcelasDaCompra.forEach((p) => {
        keysToDelete.push(`parcela:${userId}:${p.id}`);
      });

      // Buscar e adicionar TODAS as dívidas vinculadas (pode haver uma por pessoa)
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) => d.compra_id === parcela.compra_id);

      console.log(`  Dívidas vinculadas encontradas: ${dividasVinculadas.length}`);
      dividasVinculadas.forEach((d) => {
        keysToDelete.push(`divida:${userId}:${d.id}`);
      });

      // Adicionar a compra
      keysToDelete.push(`compra:${userId}:${parcela.compra_id}`);

      console.log(`  Total de itens a deletar: ${keysToDelete.length}`);
      console.log(`  Keys:`, keysToDelete);

      // Deletar tudo em lote usando mdel
      if (keysToDelete.length > 0) {
        try {
          console.log(`  Chamando kv.mdel...`);
          await kv.mdel(keysToDelete);
          console.log(`✅ ${keysToDelete.length} itens deletados em lote (v2)`);
        } catch (mdelError) {
          console.error(`❌ Erro no kv.mdel:`, mdelError);
          throw new Error(`Falha ao deletar em lote: ${mdelError.message}`);
        }
      }

      return c.json({
        success: true,
        message: `Todas as ${parcelasDaCompra.length} parcelas foram excluídas`
      });
    } else if (deletarProximas && parcela.compra_id) {
      console.log(`  Deletando parcelas PRÓXIMAS (a partir desta): ${parcela.compra_id}`);

      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) =>
        p.compra_id === parcela.compra_id && p.numero_parcela >= parcela.numero_parcela
      );

      const keysToDelete: string[] = [];
      parcelasDaCompra.forEach((p) => keysToDelete.push(`parcela:${userId}:${p.id}`));

      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela >= parcela.numero_parcela
      );
      dividasVinculadas.forEach((d) => keysToDelete.push(`divida:${userId}:${d.id}`));

      if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

      return c.json({ success: true, message: `${parcelasDaCompra.length} parcelas próximas excluídas` });
    } else if (deletarAnteriores && parcela.compra_id) {
      console.log(`  Deletando parcelas ANTERIORES (até esta): ${parcela.compra_id}`);

      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) =>
        p.compra_id === parcela.compra_id && p.numero_parcela <= parcela.numero_parcela
      );

      const keysToDelete: string[] = [];
      parcelasDaCompra.forEach((p) => keysToDelete.push(`parcela:${userId}:${p.id}`));

      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela <= parcela.numero_parcela
      );
      dividasVinculadas.forEach((d) => keysToDelete.push(`divida:${userId}:${d.id}`));

      if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

      return c.json({ success: true, message: `${parcelasDaCompra.length} parcelas anteriores excluídas` });
    } else {
      console.log(`  Deletando apenas esta parcela: ${id}`);

      // Coletar chaves para deletar
      const keysToDelete: string[] = [];
      keysToDelete.push(`parcela:${userId}:${id}`);

      // Buscar TODAS as dívidas vinculadas a esta parcela específica (pode haver uma por pessoa)
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela === parcela.numero_parcela
      );

      console.log(`  Dívidas vinculadas a esta parcela: ${dividasVinculadas.length}`);
      dividasVinculadas.forEach((d) => {
        keysToDelete.push(`divida:${userId}:${d.id}`);
      });

      console.log(`  Total de itens a deletar: ${keysToDelete.length}`);
      console.log(`  Keys:`, keysToDelete);

      // Deletar em lote
      try {
        console.log(`  Chamando kv.mdel...`);
        await kv.mdel(keysToDelete);
        console.log(`✅ Parcela excluída com sucesso (v2)`);
      } catch (mdelError) {
        console.error(`❌ Erro no kv.mdel:`, mdelError);
        throw new Error(`Falha ao deletar: ${mdelError.message}`);
      }

      return c.json({ success: true, message: "Parcela excluída com sucesso" });
    }
  } catch (error) {
    console.error("❌ ERRO GERAL ao excluir parcela (v2):", error);
    console.error("Stack trace:", error.stack);
    return c.json({ error: `Erro ao excluir parcela: ${error.message}` }, 500);
  }
});

app.delete("/make-server-808cc1b6/parcela/:id", authMiddleware, async (c) => {
  try {
    console.log("🔵 DELETE /parcela/:id - Iniciando exclusão");
    const userId = c.get("userId");
    const id = c.req.param("id");
    const deletarTodas = c.req.query("deletar_todas") === "true";
    const deletarProximas = c.req.query("deletar_proximas") === "true";
    const deletarAnteriores = c.req.query("deletar_anteriores") === "true";

    console.log(`  UserId: ${userId}, ParcelaId: ${id}, DeletarTodas: ${deletarTodas}, DeletarProximas: ${deletarProximas}, DeletarAnteriores: ${deletarAnteriores}`);

    const parcela = await kv.get(`parcela:${userId}:${id}`);
    console.log(`  Parcela encontrada:`, parcela ? "SIM" : "NÃO");

    if (!parcela) {
      console.log("❌ Parcela não encontrada");
      return c.json({ error: "Parcela não encontrada" }, 404);
    }

    if (deletarTodas && parcela.compra_id) {
      console.log(`  Deletando todas as parcelas da compra: ${parcela.compra_id}`);

      // Buscar todas as parcelas desta compra
      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) => p.compra_id === parcela.compra_id);
      console.log(`  Parcelas desta compra: ${parcelasDaCompra.length}`);

      // Coletar chaves para deletar em lote
      const keysToDelete: string[] = [];

      // Adicionar parcelas
      parcelasDaCompra.forEach((p) => {
        keysToDelete.push(`parcela:${userId}:${p.id}`);
      });

      // Buscar e adicionar TODAS as dívidas vinculadas (pode haver uma por pessoa)
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) => d.compra_id === parcela.compra_id);

      console.log(`  Dívidas vinculadas encontradas: ${dividasVinculadas.length}`);
      dividasVinculadas.forEach((d) => {
        keysToDelete.push(`divida:${userId}:${d.id}`);
      });

      // Adicionar a compra
      keysToDelete.push(`compra:${userId}:${parcela.compra_id}`);

      console.log(`  Total de itens a deletar: ${keysToDelete.length}`);
      console.log(`  Keys:`, keysToDelete);

      // Deletar tudo em lote usando mdel
      if (keysToDelete.length > 0) {
        try {
          console.log(`  Chamando kv.mdel...`);
          await kv.mdel(keysToDelete);
          console.log(`✅ ${keysToDelete.length} itens deletados em lote`);
        } catch (mdelError) {
          console.error(`❌ Erro no kv.mdel:`, mdelError);
          throw new Error(`Falha ao deletar em lote: ${mdelError.message}`);
        }
      }

      return c.json({
        success: true,
        message: `Todas as ${parcelasDaCompra.length} parcelas foram excluídas`
      });
    } else if (deletarProximas && parcela.compra_id) {
      console.log(`  Deletando parcelas PRÓXIMAS (a partir desta): ${parcela.compra_id}`);

      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) =>
        p.compra_id === parcela.compra_id && p.numero_parcela >= parcela.numero_parcela
      );

      const keysToDelete: string[] = [];
      parcelasDaCompra.forEach((p) => keysToDelete.push(`parcela:${userId}:${p.id}`));

      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela >= parcela.numero_parcela
      );
      dividasVinculadas.forEach((d) => keysToDelete.push(`divida:${userId}:${d.id}`));

      if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

      return c.json({ success: true, message: `${parcelasDaCompra.length} parcelas próximas excluídas` });
    } else if (deletarAnteriores && parcela.compra_id) {
      console.log(`  Deletando parcelas ANTERIORES (até esta): ${parcela.compra_id}`);

      const todasParcelas = await kv.getByPrefix(`parcela:${userId}:`);
      const parcelasDaCompra = todasParcelas.filter((p) =>
        p.compra_id === parcela.compra_id && p.numero_parcela <= parcela.numero_parcela
      );

      const keysToDelete: string[] = [];
      parcelasDaCompra.forEach((p) => keysToDelete.push(`parcela:${userId}:${p.id}`));

      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela <= parcela.numero_parcela
      );
      dividasVinculadas.forEach((d) => keysToDelete.push(`divida:${userId}:${d.id}`));

      if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

      return c.json({ success: true, message: `${parcelasDaCompra.length} parcelas anteriores excluídas` });
    } else {
      console.log(`  Deletando apenas esta parcela: ${id}`);

      // Coletar chaves para deletar
      const keysToDelete: string[] = [];
      keysToDelete.push(`parcela:${userId}:${id}`);

      // Buscar TODAS as dívidas vinculadas a esta parcela específica (pode haver uma por pessoa)
      const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
      const dividasVinculadas = todasDividas.filter((d) =>
        d.compra_id === parcela.compra_id && d.numero_parcela === parcela.numero_parcela
      );

      console.log(`  Dívidas vinculadas a esta parcela: ${dividasVinculadas.length}`);
      dividasVinculadas.forEach((d) => {
        keysToDelete.push(`divida:${userId}:${d.id}`);
      });

      console.log(`  Total de itens a deletar: ${keysToDelete.length}`);
      console.log(`  Keys:`, keysToDelete);

      // Deletar em lote
      try {
        console.log(`  Chamando kv.mdel...`);
        await kv.mdel(keysToDelete);
        console.log(`✅ Parcela excluída com sucesso`);
      } catch (mdelError) {
        console.error(`❌ Erro no kv.mdel:`, mdelError);
        throw new Error(`Falha ao deletar: ${mdelError.message}`);
      }

      return c.json({ success: true, message: "Parcela excluída com sucesso" });
    }
  } catch (error) {
    console.error("❌ ERRO GERAL ao excluir parcela:", error);
    console.error("Stack trace:", error.stack);
    return c.json({
      error: "Erro ao excluir parcela",
      details: error.message,
      stack: error.stack
    }, 500);
  }
});

// ==================== DEBUG ENDPOINT - VERIFY DEPLOYMENT ====================
app.get("/make-server-808cc1b6/debug/deployment-info", (c) => {
  return c.json({
    deploymentVersion: "4.0.0",
    deploymentTimestamp: "2026-05-14T16:30:00",
    kvMethodsAvailable: {
      del: typeof kv.del === 'function',
      mdel: typeof kv.mdel === 'function',
      delete: typeof (kv as any).delete === 'function'
    },
    message: "If you see this, the new deployment is ACTIVE",
    deleteEndpointsUsing: "kv.mdel for batch operations",
    cacheStatus: "This endpoint forces Supabase to recompile"
  });
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

app.put("/make-server-808cc1b6/pessoa/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const existing = await kv.get(`pessoa:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Pessoa não encontrada" }, 404);
    }

    // Não permitir editar a pessoa "Eu"
    if (existing.nome === "Eu") {
      return c.json({ error: "Não é possível editar a pessoa 'Eu'" }, 400);
    }

    const updated = {
      ...existing,
      nome: data.nome ?? existing.nome,
    };

    await kv.set(`pessoa:${userId}:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.log("Erro ao atualizar pessoa:", error);
    return c.json({ error: "Erro ao atualizar pessoa" }, 500);
  }
});

app.delete("/make-server-808cc1b6/pessoa/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const removerVinculos = c.req.query("remover_vinculos") === "true";

    const existing = await kv.get(`pessoa:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Pessoa não encontrada" }, 404);
    }

    // Não permitir excluir a pessoa "Eu"
    if (existing.nome === "Eu") {
      return c.json({ error: "Não é possível excluir a pessoa 'Eu'" }, 400);
    }

    // Buscar dívidas vinculadas
    const dividas = await kv.getByPrefix(`divida:${userId}:`);
    const dividasVinculadas = dividas.filter((d) =>
      d.pessoas && d.pessoas.some((p: any) => p.pessoa_id === id)
    );

    if (dividasVinculadas.length > 0 && !removerVinculos) {
      // Se houver dívidas e não foi solicitado remover vínculos, retornar erro
      return c.json({
        error: `Esta pessoa possui ${dividasVinculadas.length} dívida(s) vinculada(s). Exclua as dívidas primeiro.`
      }, 400);
    }

    if (removerVinculos && dividasVinculadas.length > 0) {
      // Remover a pessoa de todas as dívidas vinculadas
      for (const divida of dividasVinculadas) {
        const pessoasAtualizadas = divida.pessoas.filter((p: any) => p.pessoa_id !== id);

        if (pessoasAtualizadas.length === 0) {
          // Se não sobrar ninguém na dívida, deletar a dívida
          await kv.del(`divida:${userId}:${divida.id}`);
        } else {
          // Se ainda houver outras pessoas, recalcular valores se for divisão igualitária
          let pessoasFinais = pessoasAtualizadas;
          if (divida.dividir_igualmente && divida.valor_parcela) {
            const valorPorPessoa = divida.valor_parcela / pessoasAtualizadas.length;
            pessoasFinais = pessoasAtualizadas.map((p: any) => ({
              ...p,
              valor_individual: valorPorPessoa
            }));
          }

          const dividaAtualizada = {
            ...divida,
            pessoas: pessoasFinais
          };
          await kv.set(`divida:${userId}:${divida.id}`, dividaAtualizada);
        }
      }

      console.log(`✅ Pessoa removida de ${dividasVinculadas.length} dívida(s)`);
    }

    // Excluir a pessoa
    await kv.del(`pessoa:${userId}:${id}`);

    return c.json({ success: true, message: "Pessoa excluída com sucesso" });
  } catch (error) {
    console.log("Erro ao excluir pessoa:", error);
    return c.json({ error: "Erro ao excluir pessoa" }, 500);
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
      let parcelasCriadas = 0;

      // Criar parcelas anteriores se solicitado
      const criarParcelasAnteriores = data.criar_parcelas_anteriores ?? false;
      const parcelasAnterioresPagas = data.parcelas_anteriores_pagas ?? false;

      if (criarParcelasAnteriores && parcelaAtual > 1) {
        for (let i = 1; i < parcelaAtual; i++) {
          const numeroParcela = i;
          const mesesAtras = parcelaAtual - i;
          const dataParcelaMes = new Date(ano, mes - 1 - mesesAtras, 1);
          const dataParcela = `${dataParcelaMes.getFullYear()}-${String(dataParcelaMes.getMonth() + 1).padStart(2, "0")}-01`;

          const parcelaId = crypto.randomUUID();
          const pessoas = pessoasBase.map((p: any) => ({ 
            ...p, 
            pago: parcelasAnterioresPagas 
          }));

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
            autor_id: data.autor_id,
          };

          await kv.set(`divida:${userId}:${parcelaId}`, divida);
          parcelasCriadas++;
        }
      }

      // Criar parcelas a partir da parcela atual até o total
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
          autor_id: data.autor_id,
        };

        await kv.set(`divida:${userId}:${parcelaId}`, divida);
        parcelasCriadas++;
      }

      return c.json({
        success: true,
        message: `${parcelasCriadas} parcela(s) criada(s)`,
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
        autor_id: data.autor_id,
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
          autor_id: data.autor_id ?? divida.autor_id,
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
      autor_id: data.autor_id ?? existing.autor_id,
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

// ==================== CAIXINHA ====================

app.post("/make-server-808cc1b6/caixinha", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const id = crypto.randomUUID();
    const caixinha = {
      id,
      usuario_id: userId,
      nome: data.nome,
      meta: data.meta || 0,
      cor: data.cor || "#3B82F6",
      icone: data.icone || "piggy-bank",
      created_at: new Date().toISOString(),
    };

    await kv.set(`caixinha:${userId}:${id}`, caixinha);

    return c.json({ success: true, data: caixinha });
  } catch (error) {
    console.log("Erro ao criar caixinha:", error);
    return c.json({ error: "Erro ao criar caixinha" }, 500);
  }
});

app.get("/make-server-808cc1b6/caixinha", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const caixinhas = await kv.getByPrefix(`caixinha:${userId}:`);

    // Para cada caixinha, calcular o saldo atual baseado nas movimentações
    const caixinhasComSaldo = await Promise.all(
      caixinhas.map(async (caixinha) => {
        const movimentacoes = await kv.getByPrefix(`movimentacao_caixinha:${userId}:${caixinha.id}:`);
        const saldo = movimentacoes.reduce((acc, mov) => {
          return acc + (mov.tipo === "entrada" ? mov.valor : -mov.valor);
        }, 0);
        return { ...caixinha, saldo };
      })
    );

    return c.json({ success: true, data: caixinhasComSaldo });
  } catch (error) {
    console.log("Erro ao buscar caixinhas:", error);
    return c.json({ error: "Erro ao buscar caixinhas" }, 500);
  }
});

app.put("/make-server-808cc1b6/caixinha/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const existing = await kv.get(`caixinha:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Caixinha não encontrada" }, 404);
    }

    const updated = {
      ...existing,
      nome: data.nome ?? existing.nome,
      meta: data.meta ?? existing.meta,
      cor: data.cor ?? existing.cor,
      icone: data.icone ?? existing.icone,
    };

    await kv.set(`caixinha:${userId}:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.log("Erro ao atualizar caixinha:", error);
    return c.json({ error: "Erro ao atualizar caixinha" }, 500);
  }
});

app.delete("/make-server-808cc1b6/caixinha/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const existing = await kv.get(`caixinha:${userId}:${id}`);
    if (!existing) {
      return c.json({ error: "Caixinha não encontrada" }, 404);
    }

    // Deletar todas as movimentações dessa caixinha
    const movimentacoes = await kv.getByPrefix(`movimentacao_caixinha:${userId}:${id}:`);
    for (const mov of movimentacoes) {
      await kv.del(`movimentacao_caixinha:${userId}:${id}:${mov.id}`);
    }

    await kv.del(`caixinha:${userId}:${id}`);

    return c.json({ success: true, message: "Caixinha excluída com sucesso" });
  } catch (error) {
    console.log("Erro ao excluir caixinha:", error);
    return c.json({ error: "Erro ao excluir caixinha" }, 500);
  }
});

// Movimentações de caixinha
app.post("/make-server-808cc1b6/movimentacao-caixinha", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    // Verificar se a caixinha existe
    const caixinha = await kv.get(`caixinha:${userId}:${data.caixinha_id}`);
    if (!caixinha) {
      return c.json({ error: "Caixinha não encontrada" }, 404);
    }

    const id = crypto.randomUUID();
    const movimentacao = {
      id,
      usuario_id: userId,
      caixinha_id: data.caixinha_id,
      tipo: data.tipo, // "entrada" ou "saida"
      valor: data.valor,
      descricao: data.descricao || "",
      data: data.data || new Date().toISOString().split("T")[0],
    };

    await kv.set(`movimentacao_caixinha:${userId}:${data.caixinha_id}:${id}`, movimentacao);

    return c.json({ success: true, data: movimentacao });
  } catch (error) {
    console.log("Erro ao criar movimentação de caixinha:", error);
    return c.json({ error: "Erro ao criar movimentação de caixinha" }, 500);
  }
});

app.get("/make-server-808cc1b6/movimentacao-caixinha/:caixinhaId", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const caixinhaId = c.req.param("caixinhaId");

    const movimentacoes = await kv.getByPrefix(`movimentacao_caixinha:${userId}:${caixinhaId}:`);

    return c.json({ success: true, data: movimentacoes });
  } catch (error) {
    console.log("Erro ao buscar movimentações de caixinha:", error);
    return c.json({ error: "Erro ao buscar movimentações de caixinha" }, 500);
  }
});

app.delete("/make-server-808cc1b6/movimentacao-caixinha/:caixinhaId/:movId", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const caixinhaId = c.req.param("caixinhaId");
    const movId = c.req.param("movId");

    const existing = await kv.get(`movimentacao_caixinha:${userId}:${caixinhaId}:${movId}`);
    if (!existing) {
      return c.json({ error: "Movimentação não encontrada" }, 404);
    }

    await kv.del(`movimentacao_caixinha:${userId}:${caixinhaId}:${movId}`);

    return c.json({ success: true, message: "Movimentação excluída com sucesso" });
  } catch (error) {
    console.log("Erro ao excluir movimentação de caixinha:", error);
    return c.json({ error: "Erro ao excluir movimentação de caixinha" }, 500);
  }
});

// ==================== GASTO GERAL ====================

app.post("/make-server-808cc1b6/gasto-geral", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    console.log("🔵 POST /gasto-geral - Dados recebidos:", JSON.stringify(data, null, 2));

    // Validação básica
    if (!data.responsavel_id) {
      return c.json({ error: "Responsável é obrigatório" }, 400);
    }

    if (data.forma_pagamento === "caixinha" && !data.caixinha_id) {
      return c.json({ error: "Caixinha é obrigatória quando forma de pagamento é caixinha" }, 400);
    }

    // Encontrar pessoa "Eu"
    const todasPessoas = await kv.getByPrefix(`pessoa:${userId}:`);
    const pessoaEu = todasPessoas.find((p) => p.nome === "Eu");
    const euPessoaId = pessoaEu?.id;

    const isParcelado = data.parcelado === true;
    const parcelaAtual = data.parcela_atual || 1;
    const totalParcelas = data.total_parcelas || 1;
    const criarParcelasAnteriores = data.criar_parcelas_anteriores === true;
    const parcelasAnterioresPagas = data.parcelas_anteriores_pagas === true;

    // Se for parcelado, criar múltiplos gastos
    if (isParcelado && totalParcelas > 1) {
      console.log(`🔵 Criando gasto PARCELADO - Parcela atual: ${parcelaAtual}, Total: ${totalParcelas}`);

      const gastoPaiId = crypto.randomUUID();
      let gastosParaCriar: number[] = [];

      // Determinar quais parcelas criar
      if (criarParcelasAnteriores && parcelaAtual > 1) {
        // Criar todas as parcelas (anteriores + atual + futuras)
        gastosParaCriar = Array.from({ length: totalParcelas }, (_, i) => i + 1);
      } else {
        // Criar apenas da parcela atual em diante
        gastosParaCriar = Array.from(
          { length: totalParcelas - parcelaAtual + 1 },
          (_, i) => parcelaAtual + i
        );
      }

      for (const numParcela of gastosParaCriar) {
        // Calcular data da parcela
        const [ano, mes, dia] = data.data.split("-").map(Number);
        const dataParcela = new Date(ano, mes - 1 + (numParcela - parcelaAtual), dia);
        const dataParcelaStr = dataParcela.toISOString().split("T")[0];
        const mesRef = `${dataParcela.getFullYear()}-${String(dataParcela.getMonth() + 1).padStart(2, "0")}`;

        const gastoId = crypto.randomUUID();
        const valorParcela = data.valor / totalParcelas;

        // Status de pagamento da parcela
        const estaPaga = numParcela < parcelaAtual && parcelasAnterioresPagas;

        const gasto = {
          id: gastoId,
          usuario_id: userId,
          categoria: data.categoria,
          descricao: data.descricao,
          valor: valorParcela,
          data: dataParcelaStr,
          mes_referencia: mesRef,
          responsavel_id: data.responsavel_id,
          forma_pagamento: data.forma_pagamento,
          caixinha_id: data.caixinha_id,
          parcelado: true,
          parcela_atual: numParcela,
          total_parcelas: totalParcelas,
          gasto_pai_id: gastoPaiId,
          paga: estaPaga,
        };

        await kv.set(`gasto_geral:${userId}:${gastoId}`, gasto);

        // Descontar da caixinha se necessário (apenas se não estiver marcada como paga)
        if (!estaPaga && data.forma_pagamento === "caixinha" && data.caixinha_id) {
          const caixinha = await kv.get(`caixinha:${userId}:${data.caixinha_id}`);
          if (caixinha) {
            const novoSaldo = caixinha.saldo - valorParcela;
            await kv.set(`caixinha:${userId}:${data.caixinha_id}`, {
              ...caixinha,
              saldo: novoSaldo,
            });

            // Registrar movimentação
            const movId = crypto.randomUUID();
            const movimentacao = {
              id: movId,
              tipo: "saida",
              valor: valorParcela,
              descricao: `${data.descricao} (${numParcela}/${totalParcelas})`,
              data: dataParcelaStr,
              gasto_geral_id: gastoId,
            };
            await kv.set(`movimentacao_caixinha:${userId}:${data.caixinha_id}:${movId}`, movimentacao);
          }
        }

        // Criar dívida(s) se responsável não for "Eu" OU se dividir com pessoas
        if (data.dividir_com_pessoas && data.pessoas_ids && data.pessoas_ids.length > 0) {
          // Dividir entre múltiplas pessoas
          for (const pessoaId of data.pessoas_ids) {
            if (pessoaId === euPessoaId) continue; // Pular "Eu"

            // Calcular valor individual
            let valorIndividual: number;
            if (data.dividir_igualmente) {
              valorIndividual = valorParcela / data.pessoas_ids.length;
            } else {
              const valorPessoaTotal = parseFloat(data.valores_individuais?.[pessoaId] || "0");
              valorIndividual = valorPessoaTotal / totalParcelas;
            }

            const dividaId = crypto.randomUUID();
            const divida = {
              id: dividaId,
              usuario_id: userId,
              valor_total: valorIndividual,
              valor_parcela: valorIndividual,
              descricao: `${data.descricao} (${numParcela}/${totalParcelas})`,
              data: dataParcelaStr,
              observacoes: `Criado automaticamente a partir de gasto geral parcelado (dividido)`,
              pessoas: [
                {
                  pessoa_id: pessoaId,
                  valor_individual: valorIndividual,
                  pago: estaPaga,
                },
              ],
              dividir_igualmente: false,
              origem_tipo: "gasto_geral",
              gasto_geral_id: gastoId,
              parcelado: true,
              numero_parcela: numParcela,
              total_parcelas: totalParcelas,
              divida_pai_id: gastoPaiId,
            };
            await kv.set(`divida:${userId}:${dividaId}`, divida);
          }
        } else if (data.responsavel_id !== euPessoaId) {
          // Responsável único (lógica original)
          const dividaId = crypto.randomUUID();
          const divida = {
            id: dividaId,
            usuario_id: userId,
            valor_total: valorParcela,
            valor_parcela: valorParcela,
            descricao: `${data.descricao} (${numParcela}/${totalParcelas})`,
            data: dataParcelaStr,
            observacoes: `Criado automaticamente a partir de gasto geral parcelado`,
            pessoas: [
              {
                pessoa_id: data.responsavel_id,
                valor_individual: valorParcela,
                pago: estaPaga,
              },
            ],
            dividir_igualmente: false,
            origem_tipo: "gasto_geral",
            gasto_geral_id: gastoId,
            parcelado: true,
            numero_parcela: numParcela,
            total_parcelas: totalParcelas,
            divida_pai_id: gastoPaiId,
          };
          await kv.set(`divida:${userId}:${dividaId}`, divida);
        }

        console.log(`  ✅ Parcela ${numParcela}/${totalParcelas} criada`);
      }

      return c.json({ success: true, message: `${gastosParaCriar.length} parcelas criadas` });
    } else {
      // Gasto único (não parcelado)
      const gastoId = crypto.randomUUID();
      const gasto = {
        id: gastoId,
        usuario_id: userId,
        categoria: data.categoria,
        descricao: data.descricao,
        valor: data.valor,
        data: data.data,
        mes_referencia: data.mes_referencia,
        responsavel_id: data.responsavel_id,
        forma_pagamento: data.forma_pagamento,
        caixinha_id: data.caixinha_id,
        parcelado: false,
        parcela_atual: 1,
        total_parcelas: 1,
      };

      await kv.set(`gasto_geral:${userId}:${gastoId}`, gasto);

      // Descontar da caixinha se necessário
      if (data.forma_pagamento === "caixinha" && data.caixinha_id) {
        const caixinha = await kv.get(`caixinha:${userId}:${data.caixinha_id}`);
        if (caixinha) {
          const novoSaldo = caixinha.saldo - data.valor;
          await kv.set(`caixinha:${userId}:${data.caixinha_id}`, {
            ...caixinha,
            saldo: novoSaldo,
          });

          // Registrar movimentação
          const movId = crypto.randomUUID();
          const movimentacao = {
            id: movId,
            tipo: "saida",
            valor: data.valor,
            descricao: data.descricao,
            data: data.data,
            gasto_geral_id: gastoId,
          };
          await kv.set(`movimentacao_caixinha:${userId}:${data.caixinha_id}:${movId}`, movimentacao);
        }
      }

      // Criar dívida(s) se responsável não for "Eu" OU se dividir com pessoas
      if (data.dividir_com_pessoas && data.pessoas_ids && data.pessoas_ids.length > 0) {
        // Dividir entre múltiplas pessoas
        for (const pessoaId of data.pessoas_ids) {
          if (pessoaId === euPessoaId) continue; // Pular "Eu"

          // Calcular valor individual
          let valorIndividual: number;
          if (data.dividir_igualmente) {
            valorIndividual = data.valor / data.pessoas_ids.length;
          } else {
            valorIndividual = parseFloat(data.valores_individuais?.[pessoaId] || "0");
          }

          const dividaId = crypto.randomUUID();
          const divida = {
            id: dividaId,
            usuario_id: userId,
            valor_total: valorIndividual,
            valor_parcela: valorIndividual,
            descricao: data.descricao,
            data: data.data,
            observacoes: `Criado automaticamente a partir de gasto geral (dividido): ${data.categoria}`,
            pessoas: [
              {
                pessoa_id: pessoaId,
                valor_individual: valorIndividual,
                pago: false,
              },
            ],
            dividir_igualmente: false,
            origem_tipo: "gasto_geral",
            gasto_geral_id: gastoId,
            parcelado: false,
            numero_parcela: 1,
            total_parcelas: 1,
          };
          await kv.set(`divida:${userId}:${dividaId}`, divida);
        }
      } else if (data.responsavel_id !== euPessoaId) {
        // Responsável único (lógica original)
        const dividaId = crypto.randomUUID();
        const divida = {
          id: dividaId,
          usuario_id: userId,
          valor_total: data.valor,
          valor_parcela: data.valor,
          descricao: data.descricao,
          data: data.data,
          observacoes: `Criado automaticamente a partir de gasto geral: ${data.categoria}`,
          pessoas: [
            {
              pessoa_id: data.responsavel_id,
              valor_individual: data.valor,
              pago: false,
            },
          ],
          dividir_igualmente: false,
          origem_tipo: "gasto_geral",
          gasto_geral_id: gastoId,
          parcelado: false,
          numero_parcela: 1,
          total_parcelas: 1,
        };
        await kv.set(`divida:${userId}:${dividaId}`, divida);
      }

      return c.json({ success: true, data: gasto });
    }
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

    // Atualizar gasto
    const gastoAtualizado = {
      ...gastoExistente,
      categoria: data.categoria ?? gastoExistente.categoria,
      descricao: data.descricao ?? gastoExistente.descricao,
      valor: data.valor ?? gastoExistente.valor,
      data: data.data ?? gastoExistente.data,
      responsavel_id: data.responsavel_id ?? gastoExistente.responsavel_id,
      forma_pagamento: data.forma_pagamento ?? gastoExistente.forma_pagamento,
      caixinha_id: data.caixinha_id ?? gastoExistente.caixinha_id,
    };

    await kv.set(`gasto_geral:${userId}:${id}`, gastoAtualizado);

    // Atualizar dívida associada se existir
    const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
    for (const divida of todasDividas) {
      if (divida.gasto_geral_id === id) {
        const dividaAtualizada = {
          ...divida,
          descricao: data.descricao ?? divida.descricao,
          valor_total: data.valor ?? divida.valor_total,
          valor_parcela: data.valor ?? divida.valor_parcela,
          data: data.data ?? divida.data,
        };
        await kv.set(`divida:${userId}:${divida.id}`, dividaAtualizada);
      }
    }

    return c.json({ success: true, data: gastoAtualizado });
  } catch (error) {
    console.error("❌ Erro ao atualizar gasto:", error);
    return c.json({ error: "Erro ao atualizar gasto" }, 500);
  }
});

app.delete("/make-server-808cc1b6/gasto-geral/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const gasto = await kv.get(`gasto_geral:${userId}:${id}`);
    if (!gasto) {
      return c.json({ error: "Gasto não encontrado" }, 404);
    }

    // Devolver valor à caixinha se veio de lá e não foi pago
    if (gasto.forma_pagamento === "caixinha" && gasto.caixinha_id && !gasto.paga) {
      const caixinha = await kv.get(`caixinha:${userId}:${gasto.caixinha_id}`);
      if (caixinha) {
        const novoSaldo = caixinha.saldo + gasto.valor;
        await kv.set(`caixinha:${userId}:${gasto.caixinha_id}`, {
          ...caixinha,
          saldo: novoSaldo,
        });

        // Registrar movimentação de devolução
        const movId = crypto.randomUUID();
        const movimentacao = {
          id: movId,
          tipo: "entrada",
          valor: gasto.valor,
          descricao: `Devolução: ${gasto.descricao} (gasto excluído)`,
          data: new Date().toISOString().split("T")[0],
          gasto_geral_id: id,
        };
        await kv.set(`movimentacao_caixinha:${userId}:${gasto.caixinha_id}:${movId}`, movimentacao);
      }
    }

    // Deletar dívidas associadas
    const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
    for (const divida of todasDividas) {
      if (divida.gasto_geral_id === id) {
        await kv.del(`divida:${userId}:${divida.id}`);
      }
    }

    // Deletar movimentações associadas
    const todasMovimentacoes = await kv.getByPrefix(`movimentacao_caixinha:${userId}:`);
    for (const mov of todasMovimentacoes) {
      if (mov.gasto_geral_id === id) {
        const caixinhaId = mov.id.split(":")[2]; // Extrair caixinha_id da key
        await kv.del(`movimentacao_caixinha:${userId}:${caixinhaId}:${mov.id}`);
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

// Endpoint especial para marcar parcela como paga
app.post("/make-server-808cc1b6/gasto-geral/:id/marcar-pago", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    const gasto = await kv.get(`gasto_geral:${userId}:${id}`);
    if (!gasto) {
      return c.json({ error: "Gasto não encontrado" }, 404);
    }

    // Marcar como paga
    const gastoAtualizado = { ...gasto, paga: true };
    await kv.set(`gasto_geral:${userId}:${id}`, gastoAtualizado);

    // Devolver à caixinha se veio de lá
    if (gasto.forma_pagamento === "caixinha" && gasto.caixinha_id) {
      const caixinha = await kv.get(`caixinha:${userId}:${gasto.caixinha_id}`);
      if (caixinha) {
        const novoSaldo = caixinha.saldo + gasto.valor;
        await kv.set(`caixinha:${userId}:${gasto.caixinha_id}`, {
          ...caixinha,
          saldo: novoSaldo,
        });

        // Registrar movimentação de entrada
        const movId = crypto.randomUUID();
        const movimentacao = {
          id: movId,
          tipo: "entrada",
          valor: gasto.valor,
          descricao: `Devolução: ${gasto.descricao}${gasto.parcelado ? ` (${gasto.parcela_atual}/${gasto.total_parcelas})` : ""}`,
          data: new Date().toISOString().split("T")[0],
          gasto_geral_id: id,
        };
        await kv.set(`movimentacao_caixinha:${userId}:${gasto.caixinha_id}:${movId}`, movimentacao);
      }
    }

    // Marcar dívida correspondente como paga
    const todasDividas = await kv.getByPrefix(`divida:${userId}:`);
    for (const divida of todasDividas) {
      if (divida.gasto_geral_id === id) {
        const dividaAtualizada = {
          ...divida,
          pessoas: divida.pessoas?.map((p: any) => ({ ...p, pago: true })) || [],
        };
        await kv.set(`divida:${userId}:${divida.id}`, dividaAtualizada);
      }
    }

    return c.json({ success: true, data: gastoAtualizado });
  } catch (error) {
    console.error("❌ Erro ao marcar como pago:", error);
    return c.json({ error: "Erro ao marcar como pago" }, 500);
  }
});


Deno.serve(app.fetch);
