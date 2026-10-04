# Regras Estritas do Projeto Agenda Fácil

## 1. Preservação Absoluta de Dados Cadastrais e Operacionais
- **Tokens de Acesso:** NUNCA modificar, redefinir, invalidar ou apagar tokens já gerados (tokens de salão, compra, acesso de clientes, funcionários ou administradores).
- **Dados dos Salões e Proprietários:** NUNCA modificar, sobrescrever, resetar ou apagar dados já adicionados de salões (Nome do salão, Nome do proprietário, Telefone do proprietário, CPFs, RGs, Endereço, Chaves Pix, configurações e prazos de licença).
- **Dados dos Clientes:** NUNCA alterar nomes dos clientes, telefones, histórico de visitas, gastos ou tokens de clientes.
- **Agendamentos (Agenda / Cortes Marcados):** NUNCA apagar, redefinir ou substituir agendamentos já marcados e realizados por horários vazios ou mocks.
- **Caixa e Finanças:** NUNCA apagar ou modificar lançamentos financeiros já computados no caixa e fechamentos.
- **Produtos e Catálogo:** NUNCA apagar ou redefinir produtos à venda no catálogo ou no estoque.

## 2. Modificações Cirúrgicas e Específicas
- O aplicativo está em produção ativa sendo utilizado por múltiplos salões e clientes reais.
- Quando o usuário pedir uma modificação ou melhoria, alterar **DIRETAMENTE E EXCLUSIVAMENTE** o arquivo e a funcionalidade solicitada no prompt.
- Nenhuma outra parte do código, fluxos, configurações salvas, agendas, prazos ou dados persistidos pode ser tocada.
- Nunca reinicializar ou sobrepor estados persistidos ou banco com dados fictícios ou padrões.
