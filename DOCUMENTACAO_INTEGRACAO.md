# Documentação de Integração - API PagixyPay (Faturamento Automático)

## 📌 Objetivo
Este documento descreve como realizar a integração entre sistemas externos (como **SmartCartão**) e o portal de faturamento **PagixyPay**, automatizando o cadastro de clientes e a geração imediata de cobranças.

---

## 🔧 Especificação Técnica

### 1. Endpoints
| Ambiente | URL |
| :--- | :--- |
| **Produção** | `https://pagixypay.vercel.app/api/clients` |
| **Desenvolvimento** | `http://localhost:3000/api/clients` |

### 2. Requisição (POST)
- **Método:** `POST`
- **Cabeçalhos:** `Content-Type: application/json`

### 3. Estrutura do JSON (Corpo)
```json
{
  "name": "Nome Completo do Cliente",
  "email": "cliente@email.com",
  "document": "123.456.789-01",
  "amount": "49.00"
}
```

### 4. Descrição dos Campos
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `name` | String | **Sim** | Nome completo do usuário no SmartCartão. |
| `email` | String | **Sim** | E-mail do usuário para envio da fatura. |
| `document` | String | **Sim** | CPF ou CNPJ (aceita pontuado ou apenas dígitos). |
| `amount` | String | Não | Valor da fatura (ex: "49.00"). Valor padrão: **R$ 49,00**. |

---

## 📤 Respostas da API (JSON)

### Sucesso (Status 200/201)
Retorna os dados da fatura gerada e o link de pagamento pronto para uso.
```json
{
  "message": "Fatura gerada com sucesso",
  "client": {
    "id": "uuid-do-cliente",
    "name": "Nome do Cliente"
  },
  "invoice": {
    "id": "uuid-da-fatura",
    "amount": 49.00,
    "status": "pending"
  },
  "payment_link": "https://pagixypay.vercel.app/pay/uuid-da-fatura"
}
```

---

## 💻 Exemplo de Implementação (Node.js/Axios)
```javascript
const axios = require('axios');

async function registrarVenda() {
  const dados = {
    name: 'João da Silva',
    email: 'joao@email.com',
    document: '12345678901',
    amount: '49.00'
  };

  try {
    const res = await axios.post('https://pagixypay.vercel.app/api/clients', dados);
    console.log('Fatura Criada! Link de Pagamento:', res.data.payment_link);
  } catch (error) {
    console.error('Erro na integração:', error.message);
  }
}
```

## 💡 Observações Importantes
- **Idempotência:** Se o e-mail já existir, o sistema atualizará os dados do cliente, mas **gerará uma nova fatura** pendente a cada requisição.
- **Formatação:** Recomenda-se enviar o valor (`amount`) com ponto decimal (padrão americano).
- **Sem Autenticação:** No momento, o endpoint está aberto para facilitar a integração direta; recomenda-se adicionar um token de segurança no futuro.

---
© 2026 PayGixy Platform • Integrações Automáticas
