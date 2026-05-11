export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    iat: Math.floor(Date.now() / 1000),
  };

  const payloadB64 = btoa(JSON.stringify(payload));
  return `simple.${payloadB64}.token`;
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    console.log("🔑 Verificando token:", token.substring(0, 50) + "...");

    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("❌ Token mal formatado, partes:", parts.length);
      return null;
    }

    const payloadStr = atob(parts[1]);
    console.log("🔑 Payload decodificado:", payloadStr);

    const payload = JSON.parse(payloadStr);
    console.log("🔑 Payload parseado:", payload);

    const now = Math.floor(Date.now() / 1000);
    console.log("🔑 Timestamp atual:", now, "| Expira em:", payload.exp);

    if (payload.exp < now) {
      console.log("❌ Token expirado");
      return null;
    }

    console.log("✅ Token válido, userId:", payload.userId);
    return payload.userId;
  } catch (error) {
    console.error("❌ Erro ao verificar token:", error);
    return null;
  }
}
