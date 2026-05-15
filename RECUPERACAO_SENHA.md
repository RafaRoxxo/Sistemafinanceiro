# Configuração de Recuperação de Senha por Email

## Visão Geral

O sistema agora possui recuperação de senha completa via email usando o serviço Resend.

## Como Funciona

1. **Usuário clica em "Esqueci minha senha"** na tela de login
2. **Digite o email** e solicita o reset
3. **Sistema gera um token único** válido por 24 horas
4. **Email é enviado** com link de recuperação
5. **Usuário clica no link** e define nova senha

## Configuração do Resend

### 1. Criar conta no Resend

1. Acesse [https://resend.com](https://resend.com)
2. Crie uma conta gratuita
3. Verifique seu email

### 2. Obter API Key

1. No dashboard do Resend, vá em **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "Sistema Financeiro")
4. Copie a API key gerada

### 3. Configurar Variáveis de Ambiente

No Supabase Edge Functions, adicione as variáveis:

```bash
# API Key do Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# URL da aplicação (para gerar links de reset)
APP_URL=https://seu-dominio.com
```

**Para desenvolvimento local:**

```bash
# No terminal, ao rodar edge functions localmente:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx APP_URL=http://localhost:5173 supabase functions serve
```

### 4. Configurar Domínio de Email (Opcional mas Recomendado)

No Resend:
1. Vá em **Domains**
2. Adicione seu domínio (ex: `sistema.com`)
3. Configure os registros DNS conforme instruções
4. Aguarde verificação

Depois, atualize o email de envio no código:
```typescript
from: "Sistema Financeiro <noreply@seudominio.com>"
```

## Endpoints da API

### POST /auth/forgot-password
Solicita reset de senha

**Request:**
```json
{
  "email": "usuario@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Se este email existir, você receberá instruções para redefinir sua senha."
}
```

### POST /auth/reset-password
Redefine a senha usando o token

**Request:**
```json
{
  "token": "uuid-do-token",
  "novaSenha": "novaSenha123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso"
}
```

## Funcionamento sem API Key

Se a variável `RESEND_API_KEY` não estiver configurada:

- O sistema **ainda funciona**
- O token é gerado normalmente
- O link de reset é **logado no console** do servidor
- Você pode copiar o link do console e enviar manualmente ao usuário
- Útil para desenvolvimento e testes

## Segurança

✅ **Token único** gerado com UUID  
✅ **Expira em 24 horas**  
✅ **Token deletado** após uso  
✅ **Não revela** se o email existe (por segurança)  
✅ **Senha hasheada** com bcrypt  

## Plano Gratuito do Resend

- **100 emails/dia** grátis
- Suficiente para a maioria dos casos de uso
- Upgrade disponível se necessário

## Troubleshooting

**Email não chega:**
- Verifique spam/lixo eletrônico
- Confirme que `RESEND_API_KEY` está correta
- Verifique logs do servidor para erros
- Teste com email do mesmo domínio verificado

**Token inválido:**
- Verifique se expirou (24h)
- Token só pode ser usado uma vez
- Gere um novo reset se necessário

**Erros no console:**
- Verifique se as variáveis de ambiente estão definidas
- Confirme que a API key do Resend é válida
