# Backlog

## Prioridade Alta

- [ ] Implementar exportacao/importacao de backup SQLite (`.db`).
  - [ ] Executar processamento SQLite em Web Worker para nao bloquear a UI.
  - [ ] Usar Comlink para simplificar comunicacao entre UI e Worker.
  - [ ] Carregar `sql.js` de forma lazy (import dinamico) apenas ao abrir fluxo de importar/exportar SQLite.
  - [ ] Configurar code splitting para manter o bundle inicial leve.
  - [ ] Definir `schema_version` em tabela `meta` para evolucao de formato.
  - [ ] Criar tabela com payload JSON canonical (`contact_json`) + colunas auxiliares para busca.
- [ ] Reforcar deduplicacao com regras configuraveis e fluxo de revisao antes de mesclar.
- [ ] Criar testes automatizados para fluxos criticos:
  - importacao (CSV/VCF/JSON)
  - exportacao (CSV/VCF/JSON)
  - importacao/exportacao SQLite
  - CRUD de contatos
  - exclusao/restauracao
  - mesclagem

## Prioridade Media

- [ ] Melhorar parsing/normalizacao de formatos de entrada:
  - Outlook CSV (campos adicionais/legados)
  - vCard avancado (mais propriedades e variacoes)
- [ ] Criar backup/restore completo versionado do estado local.

## Prioridade Futura

- [ ] Adicionar criptografia de backups exportados.
