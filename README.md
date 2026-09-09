# Projeto Funcionários — V6 Multi-Setor (revisada)

Sistema web estático da Indemetal para gestão de funcionários, CPs e horas extras, preparado para vários setores em um único ambiente.

## Arquitetura
- Um único Firebase (`site-funcionario`) e um único site Netlify.
- Perfis: Administrador, Gestor e RH.
- Gestor é vinculado a um setor e trabalha somente com esse setor.
- Administrador e RH possuem visão geral.
- Funcionários e CPs carregam o setor no próprio registro.
- O Firestore aplica a restrição por perfil/setor; não é apenas um filtro visual.

## Setores iniciais
1. Serigrafia
2. Corte
3. Estamparia
4. Plotter
5. Embalagem
6. Comercial
7. Administração
8. Resina
9. Digital

Os setores ficam na coleção `setores` e podem ser ampliados pelo Administrador.

## Primeiro acesso
1. Firebase Authentication > E-mail/senha deve estar ativo.
2. O administrador principal usado no bootstrap é o UID configurado em `js/access.js`.
3. Entre pelo `index.html` e faça login.
4. A tela `acesso.html` libera apenas o perfil correspondente.
5. Administrador usa `admin.html` para cadastrar perfis de usuários e setores.
6. Para Gestor/RH, crie primeiro a conta no Firebase Authentication e depois cadastre o UID e perfil no painel do Administrador.

## Segurança
As regras em `firestore.rules` restringem funcionários e CPs por perfil/setor. Não use regras públicas.

## Índices
`firestore.indexes.json` contém o índice composto necessário para consultas de CP por setor + data. Se você não estiver usando Firebase CLI, o Firebase Console também poderá oferecer o link para criar o índice quando uma consulta precisar dele.

## Painel RH
`rh_painel.html` é uma área protegida para Administrador/RH. Monitora CPs em tempo real enquanto estiver aberta e pode usar notificações do navegador.

## Publicação
O projeto é estático e pode ser publicado pelo Netlify Drop. O diretório publicado é a raiz do projeto.


## Fluxo de CP V6
Para os setores diferentes de Administração: Gestor -> Gerente de Produção -> RH (aceite final) -> Gestor acompanha no histórico. Administração: Gestor -> RH (aceite final). O perfil gerente_producao tem painel próprio.
