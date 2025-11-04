# Revisão de Níveis de Acesso - SIGE-MIL

## Visão Geral

O sistema SIGE-MIL utiliza um sistema de permissões baseado em **3 roles (funções)** com permissões granulares por seção e ação.

## Roles Disponíveis

### 1. **user** (Usuário)
- **Acesso**: Somente leitura
- **Uso**: Operadores que precisam apenas visualizar dados

### 2. **manager** (Gerente)
- **Acesso**: Leitura + Edição + Exportação
- **Uso**: Supervisores que gerenciam efetivo e geram relatórios

### 3. **administrator** (Administrador)
- **Acesso**: Total (CRUD + Importação + Gerenciamento de usuários)
- **Uso**: Gestores do sistema

---

## Matriz de Permissões

| Seção | Ação | user | manager | administrator |
|-------|------|------|---------|---------------|
| **Dashboard** |
| | Visualizar | ✓ | ✓ | ✓ |
| **Militares (Efetivo)** |
| | Visualizar | ✓ | ✓ | ✓ |
| | Editar | ✗ | ✓ | ✓ |
| | Criar | ✗ | ✗ | ✓ |
| | Deletar | ✗ | ✗ | ✓ |
| **Companhias** |
| | Visualizar | ✓ | ✓ | ✓ |
| **Relatórios** |
| | Visualizar | ✓ | ✓ | ✓ |
| | Exportar | ✗ | ✓ | ✓ |
| **Usuários** |
| | Visualizar | ✗ | ✓ | ✓ |
| | Gerenciar | ✗ | ✗ | ✓ |
| **Importar Dados** |
| | Importar | ✗ | ✗ | ✓ |

---

## Detalhamento por Role

### User (Usuário)
```typescript
{
  dashboard: { view: true },
  militares: { view: true, edit: false, create: false, delete: false },
  companhias: { view: true },
  relatorios: { view: true, export: false },
  usuarios: { view: false, manage: false },
  importar: { import: false }
}
```

**Pode**:
- Visualizar dashboard com gráficos
- Consultar efetivo (tabela de militares)
- Visualizar cards de companhias
- Visualizar relatórios

**Não pode**:
- Editar, adicionar ou deletar militares
- Exportar relatórios (Excel/PDF)
- Ver lista de usuários
- Importar dados

---

### Manager (Gerente)
```typescript
{
  dashboard: { view: true },
  militares: { view: true, edit: true, create: false, delete: false },
  companhias: { view: true },
  relatorios: { view: true, export: true },
  usuarios: { view: true, manage: false },
  importar: { import: false }
}
```

**Pode**:
- Tudo que o **User** pode
- **Editar** dados de militares existentes (inline na tabela)
- **Exportar** relatórios em Excel/PDF
- **Visualizar** lista de usuários do sistema

**Não pode**:
- Criar novos militares
- Deletar militares
- Gerenciar usuários (alterar roles/permissões)
- Importar dados em massa

---

### Administrator (Administrador)
```typescript
{
  dashboard: { view: true },
  militares: { view: true, edit: true, create: true, delete: true },
  companhias: { view: true },
  relatorios: { view: true, export: true },
  usuarios: { view: true, manage: true },
  importar: { import: true }
}
```

**Pode**:
- Tudo que o **Manager** pode
- **Criar** novos militares
- **Deletar** militares
- **Gerenciar usuários**:
  - Criar/editar/deletar usuários
  - Alterar roles
  - Configurar permissões customizadas
- **Importar dados** em massa via Excel/Google Sheets
- Acesso total ao sistema

---

## Implementação Técnica

### Backend (Middleware)
```typescript
// server/routes.ts
app.get('/api/militares',
  isAuthenticated,                        // Verifica autenticação
  requirePermission("militares", "view"), // Verifica permissão
  handler
);
```

### Frontend (Hook)
```typescript
// client/src/hooks/useAuth.ts
const { hasPermission } = useAuth();

if (hasPermission("militares", "edit")) {
  // Mostra botão de editar
}
```

---

## Permissões Customizadas

Administradores podem configurar **permissões granulares customizadas** para usuários específicos, sobrescrevendo as permissões padrão da role.

**Exemplo**: Um usuário com role "user" pode receber permissão customizada para exportar relatórios sem ser promovido a "manager".

---

## Localização dos Arquivos

- **Definição de Permissões**: `shared/schema.ts:49-101`
- **Middleware de Verificação**: `server/firebaseAuth.ts`
- **Hook Frontend**: `client/src/hooks/useAuth.ts`
- **Dialog de Usuários**: `client/src/components/UserDialog.tsx`

---

## Recomendações de Segurança

1. ✅ **Verificação dupla**: Permissões são verificadas tanto no frontend (UI) quanto no backend (API)
2. ✅ **Principle of Least Privilege**: Cada role tem apenas as permissões necessárias
3. ✅ **Granularidade**: Permissões por seção e ação (não apenas por role)
4. ✅ **Permissões customizadas**: Flexibilidade para casos específicos sem criar novos roles

---

## Alterações Recentes (2025)

- ✓ Sistema de autenticação Firebase implementado
- ✓ Middleware de verificação de permissões em todas as rotas
- ✓ Interface de gerenciamento de usuários com tabs de permissões
- ✓ Suporte a permissões customizadas por usuário

---

**Última atualização**: 2025-11-04
