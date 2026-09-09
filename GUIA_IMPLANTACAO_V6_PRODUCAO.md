# Projeto Funcionários — V6.0 Produção

## Fluxo de CP

### Setores operacionais
Gestor → Gerente de Produção → RH → aceite final → Gestor acompanha no histórico.

### Administração
Gestor da Administração → RH → aceite final → Gestor acompanha no histórico.

Setores iniciais: Serigrafia, Corte, Estamparia, Plotter, Embalagem, Comercial, Administração, Resina e Digital.

## Perfis
- Administrador: visão e administração geral.
- Gestor: somente o setor vinculado.
- Gerente de Produção: liberação das CPs dos setores que passam pelo gerente.
- RH: recebimento, aceite final, recusa e histórico.

## Firebase
1. O projeto usa Firebase Authentication e Cloud Firestore.
2. O usuário precisa existir no Authentication antes do perfil ser associado em `usuarios/{UID}`.
3. O arquivo `firestore.rules` precisa ser publicado no Firestore.
4. O arquivo `firestore.indexes.json` contém o índice necessário para as consultas de CP.

## Netlify
Arraste a pasta do projeto para o deploy manual do site. Não publique o arquivo ZIP.

## Teste obrigatório
1. Criar Gestor de Serigrafia.
2. Criar uma CP de ocorrência.
3. Conferir CP como Pendente Gerente.
4. Entrar como Gerente e liberar.
5. Conferir CP como Pendente RH.
6. Entrar como RH, receber e dar aceite.
7. Voltar ao Gestor e conferir Aprovada pelo RH no histórico.
8. Repetir com recusa do Gerente e depois com recusa do RH.
9. Criar CP de Administração e confirmar que ela vai diretamente ao RH.

## Notificações
O painel do Gerente e o painel do RH usam atualizações em tempo real do Firestore. A notificação do navegador depende de o painel estar aberto e da permissão de notificações estar habilitada.
