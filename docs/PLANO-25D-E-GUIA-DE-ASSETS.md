# Calabrejada XVI — plano 2.5D e guia de assets com IA

Status: proposta para discussão. Este documento não altera o jogo.

## 1. Direção proposta

Um jogo de travessia ambientado no caminho para a Calabrejada: rua tropical brasileira, república, palmeiras, pôr do sol rosa e laranja, iluminação turquesa e veículos de entrega dos patrocinadores de bebidas. Geometria blocada, silhuetas claras e câmera ortográfica inclinada, inspirada na leitura de Crossy Road.

A referência de GTA VI entra na paleta, no clima tropical e na composição das artes de campanha. O mundo jogável mantém formas simples e contraste alto. Reflexos e neon entram como detalhes; não devem esconder carros, troncos ou coletáveis.

Campanha proposta para público maior de 18 anos. Coletar representa pegar itens para a festa, sem animação de consumo. Este plano não inclui promoção de tabaco, coletáveis de tabaco ou veículos com publicidade de tabaco. Para uma terceira categoria de coleta, sugiro um ingresso da Calabrejada, um adesivo da república ou uma estrela dourada.

## 2. O que existe em raw-assets

| Arquivo | Observação e uso |
| --- | --- |
| `assets/raw-assets/logo-nostravamos.png` | Brasão com caveira de boné, copos vermelhos e estrela amarela. Referência de identidade e possível personagem. Preservar o original. |
| `assets/raw-assets/calabrejada-poster.png` | Base principal de ambientação: palmeiras, rosa, laranja, litoral, reflexos e tipografia branca com contorno preto. |
| `assets/raw-assets/29-sabores-51.jpeg` | Foto com cinco garrafas coloridas. Referência para silhueta e cores dos coletáveis; precisa separar uma garrafa por asset. |
| `assets/raw-assets/Logo 51 - 51  ice(6).pdf` | Fonte potencial de marca. Abrir e conferir qual variante corresponde ao produto antes de extrair. Não foi inspecionado visualmente nesta etapa. |
| `assets/raw-assets/new-age-logo.jpeg` | Logo NewAge disponível, mas em resolução pequena. Preferir original vetorial para aplicação grande. |
| `assets/raw-assets/chopp-newage.webp` | A imagem mostra uma garrafa Wienbier 55, Pilsen, 1,5 L. Confirmar se é o produto pretendido ou se o coletável deve ser copo de chopp NewAge. |
| `assets/raw-assets/logo-amsterdam.pdf` e `tabaco-pacote-amsterdam.webp` | Presentes no inventário; fora do escopo promocional deste plano. |

O pôster contém data e horário. Não transportar esses dados para o jogo antes de confirmar que são os dados finais da edição XVI.

## 3. Decisões de gameplay e campanha

- Meta: coletar pelo menos **16 itens na mesma partida**. Distância e pontos são estatísticas separadas.
- HUD: `ITENS 07/16` em destaque; distância em segundo plano. Depois da meta, continuar exibindo o total, por exemplo `19 · META 16 ATINGIDA`.
- Cada item vale uma coleta. Variações de sabor da garrafa não valem pontos extras.
- Rodízio sugerido: garrafa 29 Sabores → chopp/produto confirmado → ingresso da festa. Não reiniciar a sequência em cada faixa.
- Definir se o rodízio segue itens gerados ou itens efetivamente coletados. Recomendo seguir os coletados: perder um item não pula a categoria seguinte. Isso exige escolher a aparência do próximo item visível de forma consistente.
- Manter grain raro nos troncos; qualquer uma das categorias permitidas pode aparecer neles. O objeto acompanha o tronco.
- Morte imediata na água, em colisão e ao sair da área carregado pelo tronco, conforme a mecânica existente.
- Ao atingir 16, feedback curto e positivo, sem interromper a travessia.
- Na morte: congelar o resultado da partida e mostrar total de itens, distância, edição e instruções da campanha.
- Não associar quantidade coletada a quantidade de bebida consumida.

Antes de calibrar a frequência, medir quanto tempo e distância uma pessoa leva para chegar a 16. A raridade atual do grain não deve ser preservada automaticamente se tornar a campanha excessivamente difícil. Ajustar spawn em terra e manter a coleta no rio como oportunidade rara.

### Tela de morte

Dois estados:

1. Menos de 16: `FALTARAM X ITENS`, resultado e botão `TENTAR DE NOVO`.
2. Pelo menos 16: `DESAFIO XVI CONCLUÍDO`, total coletado e chamada para postar o print marcando `@repnostravamos` e `@calabrejadadalarapius`.

Não prometer prêmio, desconto, ingresso ou participação em sorteio enquanto a organização não definir a regra. O resultado deve falar “meta atingida”; não afirmar que uma publicação ou participação foi validada automaticamente.

### Card compartilhável

- Gerar uma arte vertical de 1080 × 1920 com resultado real, identidade da festa, personagem e os dois perfis escritos corretamente.
- Manter números, nome da edição e perfis em texto renderizado pelo jogo, nunca dentro de uma imagem gerada por IA.
- Reservar aproximadamente 250 px no topo e na base para a interface dos Stories; manter informação essencial no centro e validar no Instagram.
- Primeira entrega: tela de morte já bonita para print. Entrega seguinte: `BAIXAR RESULTADO` com composição própria; compartilhamento nativo se suportado, com download como alternativa.
- O card deve ser produzido com assets locais. Imagens remotas sem configuração adequada podem impedir exportação do canvas.
- Contador de itens precisa persistir até o usuário iniciar outra partida. Recomeçar só por ação explícita.

## 4. Como implementar a apresentação 2.5D

### Escolha recomendada

Usar um renderizador 3D leve com câmera ortográfica e modelos de baixa complexidade. O gameplay continua em um plano: posição lateral, índice da faixa, carros, troncos, colisões e coleta. A altura serve à apresentação e ao salto.

O projeto hoje usa Canvas 2D próprio em `src/engine.js`, gameplay em `src/main.js` e desenhos procedurais em `assets/textures.js`. Antes de trocar a apresentação, separar o estado e as regras da cena dos desenhos e do acesso direto à interface. Preservar os testes da água e da movimentação.

Isso evita gerar dezenas de sprites com ângulos inconsistentes. Carros, caminhões, palmeiras e troncos podem ser montados com poucos volumes; a IA não precisa produzir cada lado de cada objeto.

### Câmera e leitura

- Ponto de partida: câmera elevada aproximadamente 50–60° acima do chão, com rotação horizontal de 20–30°. Ajustar por teste em celular, sem tratar esses valores como configuração final.
- Projeção ortográfica, sem objetos diminuindo com a distância.
- Jogador na metade inferior, mantendo visão suficiente das próximas faixas.
- Câmera acompanha avanço com suavidade; não acompanha integralmente a deriva lateral de um tronco.
- Setas continuam correspondendo a avançar, voltar e andar ao longo da faixa. Confirmar entendimento dos controles com a câmera inclinada.
- Ordenação por profundidade do renderizador. Objetos altos próximos ao personagem podem reduzir opacidade ou ter altura limitada.
- Uma direção principal de luz; sombras simples e contato no chão. Limitar custo de sombras em celulares.

### Conversão dos elementos

| Elemento | Tratamento |
| --- | --- |
| Chão e ruas | Faixas planas com borda de meio-fio baixa; textura discreta. |
| Personagem | Volumes simples; animação curta de salto, sombra de contato e quatro orientações. |
| Veículos | Compacto, van e caminhão curto com dimensões visuais correspondentes às colisões. Logos aplicadas nas laterais. |
| Palmeiras | Tronco e copa simplificados; concentrar as maiores nas bordas. |
| República | Fachada com brasão e iluminação, em área decorativa ou ponto de partida. |
| Água | Canal urbano estilizado, cor turquesa e ondulações discretas. |
| Troncos | Madeira blocada, topo claro e extremidades visíveis; posição visual acompanha a plataforma lógica. |
| Coletáveis | Modelos simples e pequenos ícones de produto; altura e brilho distinguem da decoração. |
| HUD | Camada HTML independente da câmera, com números legíveis. |

Não transformar o rio em rua alagada ambígua: bordas, cor e troncos devem indicar claramente perigo de água.

## 5. Identidade e ambientação

Paleta inicial, derivada visualmente do pôster; ajustar no protótipo:

| Uso | Cor sugerida |
| --- | --- |
| Fundo escuro | `#171326` |
| Rosa da festa | `#FF2789` |
| Laranja do pôr do sol | `#FF8B45` |
| Turquesa da água e luzes | `#36C9CF` |
| Estrela e destaque de coleta | `#F8C51B` |
| Texto claro | `#FFF5EA` |

Ideias de cenário: muro com mural da Calabrejada, fachada da república, bandeirolas, caixas de som, grades, postes, palmeiras e um portal da festa ao fundo. Tudo que não participa da colisão fica claramente fora do caminho.

Veículos: caminhão de entrega 29 Sabores, van NewAge e carros civis de cores variadas. Não colocar o mascote bebendo ou dirigindo. Logos não precisam estar em todos os carros: alternar preserva a leitura e evita poluição visual.

Personagem pendente: caveirinha de boné inspirada no brasão ou galinha com boné e cores da república. Se for a caveirinha, manter expressão irreverente e proporções compactas, sem elementos de horror realista. Evitar recriar marcas de terceiros presentes no boné do brasão; usar estrela ou símbolo próprio aprovado.

## 6. O que gerar com IA e o que montar diretamente

**Gerar com IA:** quadro de direção de arte, conceitos do personagem e veículos, fundo da abertura, ilustração da tela de morte e pequenos elementos decorativos quando necessários.

**Montar no jogo/editor:** volumes dos modelos, câmera, animações, sombra, água, HUD, texto, contadores, botões, card de resultado e aplicação das logos oficiais.

**Tratar a partir dos originais:** remover fundo e preparar logos e referências de produtos, sem pedir à IA para redesenhar letras e marcas.

Nenhuma imagem de cenário deve vir com carros ou objetos que pareçam obstáculos mas não existam na lógica do jogo.

## 7. Passo a passo para gerar imagens

1. Abrir uma ferramenta de geração que aceite imagens de referência e edição.
2. Anexar os arquivos indicados em cada prompt. Informar qual referência define estilo e qual define identidade/produto.
3. Gerar primeiro o quadro de direção de arte. Escolher uma versão e anexá-la nas gerações seguintes para manter consistência.
4. Gerar um objeto por vez. Pedir variações separadas, sem uma prancha cheia de itens para recortar.
5. Para recortes, ativar a opção real de fundo transparente. Um padrão quadriculado desenhado não é transparência.
6. Conferir silhueta em tamanho pequeno, proporção, cores e ausência de marcas inventadas.
7. Guardar o prompt, referências e versão escolhida. Não sobrescrever raw-assets.
8. Exportar originais em PNG; otimizar as cópias de entrega depois da integração. Reservar imagens grandes para abertura e compartilhamento.

Pastas sugeridas: `assets/art/concepts/`, `assets/art/backgrounds/`, `assets/art/decals/`, `assets/art/ui/` e, caso modelos sejam exportados, `assets/models/`.

## 8. Prompts prontos

Os prompts abaixo geram material de arte e referência. Imagens conceituais de veículos e personagens não são modelos 3D prontos para importar.

### A. Quadro de direção de arte — gerar primeiro

Referências: pôster da Calabrejada, brasão da Nostravamos e imagem de Crossy Road da conversa. Se a imagem de Crossy Road não estiver disponível na ferramenta, anexá-la novamente.

Formato: horizontal, aproximadamente 1536 × 1024.

> Crie um quadro de direção de arte para um jogo de travessia de divulgação de um evento universitário brasileiro exclusivo para adultos. Use a imagem de Crossy Road somente como referência de câmera ortográfica inclinada, geometria blocada e clareza de leitura. Use o pôster anexado como referência de paleta e ambiente: pôr do sol rosa e laranja, palmeiras, luz turquesa e asfalto com reflexos discretos. Use o brasão anexado como referência de identidade: preto, branco, estrela amarela e acessórios vermelhos. Mostre uma rua tropical próxima a uma república, um canal turquesa com troncos de madeira, carros blocados e uma pequena fachada de festa na lateral. Câmera elevada, sem ponto de fuga acentuado. Formas simples, contraste entre chão, obstáculos e personagem, sombras numa única direção. Centro jogável limpo. Sem textos, números, interfaces, marcas inventadas ou pessoas consumindo bebidas. Acabamento de jogo estilizado, sem fotografia e sem excesso de detalhes.

Salvar: `assets/art/concepts/art-direction-v01.png`.

### B. Personagem — caveirinha, se aprovada

Referências: brasão + quadro de direção escolhido.

Formato: quadrado, aproximadamente 1024 × 1024.

> Crie um conceito de personagem de jogo inspirado na caveira do brasão anexado: caveirinha compacta com boné preto, estrela amarela própria no boné e detalhe vermelho no figurino. Sem logos de times. Identidade irreverente de república universitária adulta, sem horror realista. Construa o corpo com poucos volumes geométricos, pernas curtas e silhueta facilmente reconhecível em uma tela pequena. Mostre um único personagem inteiro em pose neutra, visto de cima em três quartos com câmera ortográfica. Siga exatamente a linguagem de formas e a iluminação da referência de direção de arte. Sem objetos nas mãos, sem bebidas, sem texto, sem chão e sem sombra projetada. Fundo realmente transparente.

Salvar: `assets/art/concepts/mascot-skull-v01.png`.

Alternativa: substituir “caveirinha” por “galinha branca com boné preto e estrela amarela”; não gerar as duas famílias antes de escolher.

Após aprovar a aparência, pedir vistas frontal, lateral e traseira separadas como referência de modelagem. Não usar essas vistas como frames de animação sem conferir proporções.

### C. Veículo base

Referência: quadro de direção escolhido.

Formato: horizontal ou quadrado, 1024 px ou maior.

> Crie o conceito de um caminhão curto de entregas para um jogo de travessia com geometria blocada. Um único veículo inteiro, cabine compacta, baú retangular baixo, rodas simples e superfície lateral plana para posterior aplicação de uma logo oficial. Vista ortográfica de cima em três quartos. Frente voltada para a direita. Siga as cores, materiais foscos e iluminação da referência anexada. Silhueta reconhecível em tamanho pequeno. Baú sem escrita, sem logo e sem ilustrações. Sem motorista visível, sem cenário, sem chão, sem sombra projetada. Fundo realmente transparente.

Salvar: `assets/art/concepts/truck-base-v01.png`.

Variantes: repetir trocando caminhão por “van curta de entregas” e por “carro compacto civil”. Gerar pintura vermelha/amarela para o conceito 29 Sabores e branca/turquesa para NewAge. Aplicar marcas originais depois, como texturas no modelo. Não espelhar uma logo para criar o sentido oposto.

### D. Garrafa 29 Sabores

Referências: `29-sabores-51.jpeg` + quadro de direção escolhido.

Formato: quadrado 1024 × 1024, objeto central ocupando aproximadamente 70% da área.

> Crie uma referência de coletável para jogo a partir de UMA garrafa vermelha da foto anexada. Preserve a forma característica: corpo baixo e arredondado, tampa branca e faixa de rótulo. Simplifique em poucos volumes geométricos, com contraste e silhueta claros em tamanho pequeno. Use a linguagem visual do quadro de direção anexado. Mostre um único objeto inteiro, vista ortográfica em três quartos, com o rótulo como uma faixa lisa reservada para aplicação posterior da arte oficial. Sem letras inventadas, sem selo novo, sem cenário, sem chão e sem sombra projetada. Fundo realmente transparente.

Salvar: `assets/art/concepts/collectible-29-red-v01.png`.

Gerar amarelo e azul só depois de aprovar a primeira silhueta. Os sabores são variações visuais da mesma categoria. A marca deve vir do original e ser aplicada posteriormente.

### E. Chopp — depende da confirmação de produto

Referências: logo NewAge + quadro de direção. Se o produto correto for Wienbier 55, usar também `chopp-newage.webp` e gerar uma garrafa, não um copo com marca presumida.

> Crie o conceito de um coletável para jogo: um copo de chopp com líquido dourado e espuma clara, apresentado como objeto isolado. Estilo geométrico de baixa complexidade, mesma câmera ortográfica e iluminação da direção de arte anexada. Silhueta legível em tamanho pequeno, contraste forte e uma pequena área frontal lisa para aplicação posterior de uma marca oficial. Sem texto, sem logos inventadas, sem mãos, sem personagem consumindo, sem cenário e sem sombra projetada. Fundo realmente transparente.

Salvar após confirmação: `assets/art/concepts/collectible-chopp-v01.png`.

### F. Terceiro coletável sugerido — ingresso XVI

Referências: pôster + quadro de direção.

> Crie o conceito de um ingresso de festa como coletável de jogo. Um único ticket grosso e levemente inclinado, formato retangular com dois recortes laterais, rosa vibrante, borda branca e pequeno emblema de estrela amarela. Volumes simples e acabamento fosco, vista ortográfica em três quartos, seguindo a referência anexada. Área central lisa para inserir depois o numeral XVI. Leitura clara em tamanho pequeno. Sem texto gerado, sem marcas, sem cenário, sem sombra projetada. Fundo realmente transparente.

Salvar: `assets/art/concepts/collectible-ticket-v01.png`.

### G. Fachada da república

Referências: brasão + pôster + quadro de direção. Uma foto real da fachada, se disponível, melhorará a identidade; sem foto, tratar o resultado como cenário fictício.

> Crie um conceito de fachada de república universitária brasileira para um jogo de formas blocadas. Construção de dois pavimentos, entrada acolhedora com luz rosa e turquesa, detalhes pretos, brancos e vermelhos, uma estrela amarela e uma placa frontal vazia para aplicar o brasão oficial depois. Palmeira lateral e decoração de festa discreta. Vista ortográfica em três quartos, materiais foscos e volumes simples conforme a direção de arte anexada. A fachada fica fora da pista de jogo. Sem pessoas, sem texto gerado, sem logos inventadas e sem publicidade de tabaco. Fundo realmente transparente.

Salvar: `assets/art/concepts/republic-house-v01.png`.

### H. Fundo da abertura e do card de resultado

Referências: pôster + quadro de direção. Gerar o fundo uma vez e reutilizar com layouts diferentes.

Formato: vertical 9:16, preferencialmente 1080 × 1920 ou maior na mesma proporção.

> Crie um fundo vertical para a campanha de um evento universitário brasileiro adulto. Siga a paleta do pôster anexado: céu de pôr do sol rosa e laranja, palmeiras em silhueta, rua tropical e luzes turquesa discretas. Traduza o ambiente para a linguagem geométrica estilizada da direção de arte. Palmeiras e construções concentradas nas bordas. Reserve os 60% centrais da composição com baixo detalhe e contraste controlado para inserir título, placar e instruções posteriormente. Não inclua texto, números, logos, selos, botões, interface, cartazes legíveis ou pessoas consumindo bebidas. Evite pontos muito claros atrás da futura área de texto. Sem moldura.

Salvar: `assets/art/backgrounds/campaign-sunset-vertical-v01.png`.

### I. Ilustração para morte e meta atingida

Referências: personagem aprovado + quadro de direção.

Formato: quadrado 1024 × 1024, fundo transparente.

> Use exatamente o personagem da referência anexada, mantendo rosto, cores, roupa e proporções. Mostre o personagem sentado no chão, com expressão de surpresa bem-humorada após uma tentativa de atravessar uma rua. Pequenas estrelas gráficas ao redor da cabeça. Estilo de jogo geométrico, acabamento limpo. Sem ferimentos, sangue, veículo, bebida, texto ou números. Um único personagem inteiro, sem cortar acessórios. Fundo realmente transparente, sem sombra projetada.

Salvar: `assets/art/ui/mascot-game-over-v01.png`.

Segunda variação: pedir “personagem em pose de comemoração com braços levantados e confetes rosa e amarelos”, mantendo as demais instruções. Salvar `mascot-goal-v01.png`. O número 16 e a condição de sucesso serão inseridos pelo jogo.

## 9. Tratamento das logos e produtos

- Manter os arquivos originais intactos.
- Procurar versão vetorial oficial ou exportar do PDF quando corresponder à marca correta.
- Remover apenas fundo externo de logos, preservando áreas brancas internas. Não usar remoção global da cor branca no brasão.
- Separar garrafas da foto sem cortar tampas ou base; conferir contorno em fundo claro e escuro.
- Pedir arquivos melhores ao patrocinador quando o original pequeno não sustentar o uso. Não inventar detalhes ausentes com IA.
- Exportar versões com margem transparente e proporções preservadas.
- Aplicar logo nas duas laterais dos veículos com orientação correta e sem deformação ilegível.
- Não incluir textos pequenos de rótulo que virem ruído visual no coletável. Reservar produto completo para tela de apresentação, caso necessário.
- Conferir com os organizadores a relação entre 29 Sabores e a variante de logo 51 presente no PDF, além da relação NewAge/Wienbier 55, antes de fechar artes.

## 10. Ordem de implementação e critérios de aceite

### Etapa 1 — regra da campanha

Separar pontos, distância e itens coletados; implementar meta 16, rodízio confirmado e dois estados de resultado. Temporariamente pode usar os desenhos atuais.

Aceite: 15 não atinge a meta; 16 e 17 atingem; coletar em terra ou tronco soma uma vez; reiniciar zera a partida; tela de morte mostra o total real e os dois perfis corretos.

### Etapa 2 — prova visual 2.5D

Separar regras da apresentação e construir uma pequena cena com jogador, duas ruas, uma margem, rio e troncos. Usar volumes provisórios antes de investir em arte final.

Aceite: controles compreensíveis com câmera inclinada; desenho e colisão correspondem; jogador não fica escondido; deriva e saltos entre troncos continuam corretos; desempenho estável no celular de referência definido com a organização.

### Etapa 3 — kit de identidade e cenário

Aprovar quadro de arte e personagem. Preparar logos, modelos de veículos, três categorias de coleta e fachada. Aplicar paleta, palmeiras e iluminação.

Aceite: todos os assets compartilham câmera, escala, luz e linguagem de formas; marcas e textos oficiais não foram redesenhados pela IA; obstáculos e decoração são distinguíveis.

### Etapa 4 — tela de morte e compartilhamento

Montar composição responsiva para print e exportação vertical. Renderizar estatísticas e instruções sobre fundo aprovado.

Aceite: resultado legível em celular, perfis sem cortes, imagem exportada corresponde à partida, download funciona e falha de compartilhamento tem alternativa. Validar a imagem em uma prévia real de Story.

### Etapa 5 — equilíbrio e validação final

Medir tentativas, tempo e distância até 16. Ajustar frequência de coleta e dificuldade sem tornar o rio obrigatório para a meta. Testar desktop e toque, reinício, morte por carro/água/borda, diferentes tamanhos de tela e celulares menos potentes.

## 11. Decisões pendentes da organização

1. Personagem: caveirinha ou galinha caracterizada?
2. Produto correto do coletável NewAge: copo de chopp ou garrafa Wienbier 55?
3. Terceira categoria sem tabaco: ingresso, adesivo ou estrela?
4. O que acontece após postar: conclusão simbólica, benefício ou sorteio? Não publicar promessa antes de definir.
5. Confirmar público exclusivamente maior de 18 anos, grafia dos perfis e dados finais do evento.
6. Há foto da fachada, vetor do brasão e logos oficiais em alta resolução?

Primeiro resultado recomendado para aprovação: um quadro de arte, um personagem e um mockup da tela de morte. Só então produzir o restante da família visual.


