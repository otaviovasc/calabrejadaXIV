# Nostra Run — Calabrejada XVI

Jogo de travessia da República Nostravamos, com apresentação 2.5D, veículos personalizados, rios e troncos móveis.

## Jogar localmente

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Use setas/WASD ou os botões na tela. Colete pelo menos **16 itens na mesma partida**; pontos e distância não substituem essa meta. Ao morrer, tire um print ou baixe o resultado e poste no Instagram marcando **@repnostravamos** e **@calabrejadadalarapius**. Desafio simbólico para público +18, sem prêmio automático.

Os itens alternam entre 29 Sabores, garrafa Wienbier 55 e ingresso XVI. Cada item mantém sua própria arte até ser coletado. Veículos alternam 29 Sabores/51, NewAge e Calabrejada, usando imagens diferentes para cada direção.

## Verificar e compilar

```sh
npm run check:game
npm run build
npm run test:e2e
```

Os testes de navegador exigem os navegadores do Playwright instalados e permissão para abrir a porta local 4173. Os checks de lógica não precisam de servidor.

## Artes e apresentação

- `assets/*.png`: originais, preservados.
- `assets/optimized/`: cópias menores usadas pelo jogo.
- `npm run prepare:art`: recria essas cópias; requer `ffmpeg` instalado. Não é necessário para rodar o projeto com as cópias já presentes.
- `src/art.js`: carregamento, recorte de margens transparentes e catálogo de artes.
- `src/renderer.js`: projeção compartilhada por chão, veículos, plataformas, coleta e personagem; ordenação por profundidade.
- `src/main.js`: regras de movimento, dificuldade, colisão, pontuação e coleta.
- `src/ui.js` e `src/share.js`: meta de 16 e imagem de resultado 1080 × 1920.
- `assets/definitions.js`: ritmo de tráfego e raridade da coleta nos troncos. A frequência de coleta em terra é `LANE_PATTERN.pickups.landChance` (25% das faixas seguras elegíveis); nos troncos, 4% das faixas de rio. A primeira coleta continua garantida na faixa 4.

O visual utiliza sprites em uma projeção fixa 2.5D. Os veículos da esquerda recebem ajuste de inclinação durante o desenho para acompanhar o eixo da rua; suas logos não são espelhadas. A colisão continua no plano lógico, independente da altura aparente dos sprites.

As imagens em `artifacts/` são prévias da projeção produzidas a partir dos comandos de desenho, em cenas de inspeção. Não substituem um teste interativo no navegador.

## Logos no resultado

A tela de morte e o PNG usam a configuração compartilhada em `src/partners.js`: 51, NewAge e República Nostravamos sob “Patrocínio e realização”, mais um quarto cartão branco. Uma falha no carregamento das marcas impede baixar um resultado sem logos e oferece nova tentativa.

Para preencher o quarto espaço com uma futura marca, adicione o PNG transparente em `assets/raw-assets/`, altere o `imageUrl` da entrada `future` para `new URL('../assets/raw-assets/NOME-DA-LOGO.png', import.meta.url).href` e atualize seu `name` e `alt`. Mantenha `required: true`. A mesma configuração atualiza tela e download.

O brasão da república identifica a realização; não foi incluída publicidade de tabaco.

A correção de profundidade do rio desenha todas as plataformas antes dos personagens e aplica a altura da madeira aos pés. O teste de regressão verifica as extremidades esquerda/direita e o centro em ambos os sentidos de movimento.

As áreas seguras usam o piso pavimentado original. Árvores com colisão e palmeiras decorativas aparecem apenas nessas faixas; ruas e rios não recebem árvores. A tela de morte ocupa a janela para destacar as logos em uma grade 2 × 2, também usada no PNG.

## Movimento dos veículos com os sprites atuais

`src/vehicle-motion.js` controla suspensão, inclinação, deformação e rotação dos aros a partir da distância percorrida. Os aros são desenhados sobre as rodas da arte original, com posições específicas para cada veículo e sentido. Os PNGs originais e as logos são preservados.

Veículos da mesma faixa usam uma velocidade de cruzeiro comum para evitar correções bruscas quando um alcança o outro. O reaparecimento ocorre fora tanto da área jogável quanto do enquadramento inclinado da câmera. A fase da animação continua após esse reposicionamento.
