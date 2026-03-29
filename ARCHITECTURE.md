# FinFlow SaaS - Arquitetura e Modelagem

## 1. Arquitetura do Sistema
O sistema utiliza uma arquitetura **Full-Stack Monolítica Moderna** (Express + Vite + React) para facilitar o deploy e manutenção inicial, sendo facilmente desacoplável em microserviços futuramente.

- **Frontend**: React 19 + Tailwind CSS + Vite.
- **Backend**: Node.js (Express) integrado ao Vite.
- **Banco de Dados**: PostgreSQL via Supabase (BaaS).
- **Autenticação**: Supabase Auth (JWT).
- **Pagamentos**: Abstração para Gateways (Asaas, Iugu, Stripe).

## 2. Modelagem do Banco de Dados (PostgreSQL)

```sql
-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- 1. Empresas (Multi-tenant)
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  document text unique, -- CNPJ/CPF
  email text,
  phone text,
  settings jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- 2. Perfis de Usuários
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references companies(id),
  full_name text,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

-- 3. Clientes (CRM)
create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) not null,
  name text not null,
  email text not null,
  document text,
  phone text,
  status text default 'active', -- active, inactive, blocked
  address jsonb,
  created_at timestamp with time zone default now()
);

-- 4. Assinaturas (Recorrência)
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) not null,
  client_id uuid references clients(id) not null,
  plan_name text not null,
  amount decimal(10,2) not null,
  interval text not null, -- weekly, monthly, yearly
  status text default 'active', -- active, paused, cancelled
  next_billing_date date,
  gateway_id text, -- ID no gateway de pagamento
  created_at timestamp with time zone default now()
);

-- 5. Faturas (Invoices)
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) not null,
  client_id uuid references clients(id) not null,
  subscription_id uuid references subscriptions(id),
  amount decimal(10,2) not null,
  due_date date not null,
  status text default 'pending', -- pending, paid, overdue, cancelled
  payment_method text, -- pix, boleto, credit_card
  payment_link text,
  gateway_invoice_id text,
  created_at timestamp with time zone default now()
);

-- 6. Pagamentos (Transações)
create table payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) not null,
  amount decimal(10,2) not null,
  payment_date timestamp with time zone default now(),
  method text not null,
  gateway_transaction_id text,
  status text not null
);

-- 7. Logs de Atividade
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  user_id uuid references auth.users,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default now()
);
```

## 3. Estratégia de Gateway de Pagamento
Utilizaremos um **Payment Service Adapter**:
- `src/services/payments/GatewayInterface.ts`: Define os métodos `createCustomer`, `createInvoice`, `createSubscription`.
- `src/services/payments/AsaasAdapter.ts`: Implementação específica.
- `src/services/payments/StripeAdapter.ts`: Implementação específica.

## 4. Estratégia de Monetização (SaaS)
- **Starter**: Até 50 clientes, apenas Pix e Boleto. (R$ 99/mês)
- **Pro**: Clientes ilimitados, Cartão de Crédito, Régua de Cobrança. (R$ 199/mês)
- **Enterprise**: Multi-contas, API access, Suporte prioritário. (Sob consulta)
