# Documentação de Integração - API PagixyPay (Faturamento & Automação)

## 📌 Objetivo
Este documento descreve a integração entre sistemas externos (como **SmartCartão**) e o portal **PagixyPay**, cobrindo o cadastro de clientes com acesso ao portal, geração de faturas e sincronização de pagamentos.

---

## 🔧 1. Cadastro & Sincronização de Cliente (POST /api/clients)

Este endpoint é usado para registrar o cliente no PagixyPay e criar automaticamente seu acesso ao portal financeiro.

### Requisição
- **Endpoint:** `https://pagixypay.vercel.app/api/clients`
- **Método:** `POST`
- **Corpo (JSON):**
```json
{
  "id": "ID_USUARIO_SMART_CARTAO",
  "name": "Nome Completo",
  "email": "cliente@email.com",
  "document": "123.456.789-01",
  "password": "senha_escolhida_pelo_cliente"
}
```

### Detalhes dos Campos
| Campo | Obrigatório | Descrição |
| :--- | :--- | :--- |
| `id` | Não | ID originário do seu sistema (enviado de volta nas notificações). |
| `name` | **Sim** | Nome completo do usuário. |
| `email` | **Sim** | E-mail (usado como login no portal financeiro). |
| `document` | **Sim** | CPF ou CNPJ. |
| `password` | Não | Senha de acesso ao portal PagixyPay. Se omitida, uma padrão será gerada. |

> **Nota:** Este endpoint **não gera faturas automáticas**. Ele apenas prepara o ambiente e o acesso do cliente. O faturamento deve ser configurado manualmente ou via assinatura dentro do PagixyPay.

---

## 🔗 2. Sincronização de Saída (Webhooks PagixyPay -> SmartCartão)

O PagixyPay enviará notificações para o seu sistema sempre que houver movimentação financeira. Para isso, configure a URL do seu webhook em **Configurações > API & Webhooks** dentro do painel PagixyPay.

### A. Nova Fatura Criada (`invoice.created`)
Enviado quando uma fatura é gerada manualmente ou automaticamente por uma assinatura (10 dias antes do vencimento).

**Payload:**
```json
{
  "event": "invoice.created",
  "timestamp": "2026-04-03T14:20:00Z",
  "invoice": {
    "id": "uuid-fatura",
    "amount": 49.00,
    "due_date": "2026-04-13",
    "status": "pending",
    "payment_link": "https://pagixypay.vercel.app/pay/uuid-fatura",
    "smartcartao_user_id": "ID_USUARIO_SMART_CARTAO"
  }
}
```

### B. Pagamento Confirmado (`payment.received`)
Enviado quando o pagamento é liquidado via PIX, Boleto ou Cartão. Use este evento para "limpar" a cobrança no painel da SmartCartão.

**Payload:**
```json
{
 "event": "payment.received",
 "timestamp": "2026-04-03T15:00:00Z",
 "invoice": {
    "id": "uuid-fatura",
    "status": "paid",
    "amount": 49.00,
    "external_reference": "ID_USUARIO_SMART_CARTAO"
 }
}
```

---

## 🤖 3. Automação de Assinaturas
O PagixyPay processa assinaturas ativas e gera a fatura correspondente **10 dias antes do vencimento**. 
- A fatura é gerada no status `pending`.
- O evento `invoice.created` é disparado para o seu webhook imediatamente.

---

## 💻 Sugestão de Fluxo no Painel SmartCartão
1. **Página de Clientes:** Exibir apenas as faturas recebidas via `invoice.created` que ainda não receberam o `payment.received`.
2. **Histórico Completo:** Se o cliente desejar ver faturas antigas ou detalhes da conta, redirecione-o para `https://pagixypay.vercel.app` usando as mesmas credenciais sincronizadas.

---
© 2026 PayGixy Platform • Integrações Inteligentes
