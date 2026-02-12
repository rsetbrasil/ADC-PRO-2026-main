## Problema

* O login falha com "Usuário não encontrado" quando a leitura de usuários no Supabase falha/está vazia.

* O fallback atual tenta Prisma (porta 5432) e pode falhar; AuthContext não usa `initialUsers` como reserva.

## Proposta de Correção

1. Fallback no AuthContext

* Alterar `fetchUsers` em [AuthContext.tsx](file:///c:/Users/Rafael/Desktop/ADC-PRO-2026-main/src/context/AuthContext.tsx) para:

  * Se `getUsersAction` retornar erro ou lista vazia, carregar `initialUsers` localmente.

  * Manter validação de sessão do `localStorage` com base na lista carregada.

1. Simplificar getUsersAction

* Em [auth.ts](file:///c:/Users/Rafael/Desktop/ADC-PRO-2026-main/src/app/actions/auth.ts):

  * Remover fallback Prisma e, em caso de erro do Supabase, retornar `{success:true, data: []}`.

  * (Opcional) Se a tabela `users` estiver vazia, permitir semear um admin padrão usando uma action separada com `SUPABASE_SERVICE_ROLE_KEY`.

1. Semeadura opcional de usuários

* Criar uma action utilitária `seedDefaultUsersAction()` que:

  * Confere se `users` está vazio.

  * Insere usuários padrão (admin/gerente/vendedor) com senhas provisórias.

  * Só roda se `SUPABASE_SERVICE_ROLE_KEY` estiver configurada.

  * Disponibilizar botão "Restaurar Usuários" na página de Usuários (já existe `restoreUsersAction` — podemos reutilizar e expor melhor no UI).

1. Healthcheck

* Adicionar endpoint `/api/health/supabase` que tenta `select 1` em `products` e retorna status/latência para diagnosticar rapidamente se o Supabase está online.

* Mostrar aviso discreto no login quando o healthcheck falhar (sem bloquear o login com dados locais).

## Benefícios

* Login funciona mesmo sem conexão estável com Supabase.

* Evita dependência de Prisma/porta 5432.

* Facilita diagnóstico e recuperação de usuários.

## Confirmação

* Posso aplicar as mudanças acima e validar no servidor local (porta 3100) e no Vercel, mantendo senhas fora do código e usando variáveis de ambiente para a semente opcional.

