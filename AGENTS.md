# Regras Estritas do Projeto Agenda Fácil

## 1. Preservação Absoluta de Dados Cadastrais e Operacionais
- **Dados dos Salões e Proprietários:** NUNCA modificar, sobrescrever, resetar ou apagar dados já adicionados de salões (Nome do salão, Nome do proprietário, Telefone do proprietário, CPF, RG, Endereço e configurações específicas).
- **Agendamentos (Agenda / Cortes Marcados):** NUNCA apagar, redefinir ou substituir agendamentos já marcados e realizados por horários vazios ou mocks.
- **Caixa e Finanças:** NUNCA apagar ou modificar lançamentos financeiros já computados no caixa.
- **Produtos e Catálogo:** NUNCA apagar ou redefinir produtos à venda no catálogo ou no estoque.

## 2. Modificações Cirúrgicas e Específicas
- Quando o usuário pedir uma modificação ou melhoria, alterar **DIRETAMENTE E EXCLUSIVAMENTE** o arquivo e a funcionalidade solicitada.
- O restante do código, fluxos e estruturas existentes devem permanecer estritamente intocados.
- Nunca reinicializar ou sobrepor estados persistidos ou banco com dados fictícios.
