import { Context } from "npm:hono";
import { verifyToken } from "./auth.ts";

export async function authMiddleware(c: Context, next: () => Promise<void>) {
  console.log("🔐 Middleware de autenticação");
  const token = c.req.header("X-Auth-Token");
  console.log("🔐 X-Auth-Token:", token?.substring(0, 50) + "...");

  if (!token) {
    console.log("❌ Token não fornecido no header X-Auth-Token");
    return c.json({ error: "Token não fornecido" }, 401);
  }

  console.log("🔐 Verificando token...");
  const userId = await verifyToken(token);
  console.log("🔐 UserId do token:", userId);

  if (!userId) {
    console.log("❌ Token inválido ou expirado");
    return c.json({ error: "Token inválido ou expirado" }, 401);
  }

  console.log("✅ Autenticação bem-sucedida, userId:", userId);
  c.set("userId", userId);
  await next();
}
