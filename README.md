# Biodiversidade Urbana — TCC 2026

Site do TCC do Grupo 106 (BioCambuí) — Colégio Inspire, São José dos Campos (SP).

Publicado via GitHub Pages: https://tiantonio.github.io/biodiversidade-tcc106/

## O que tem no site

- **Início, Mapeamento (galeria de coletas), Espécies (25) e Equipe**
- **Sons** de 6 animais (gravações do [Xeno-canto](https://xeno-canto.org), licença CC BY-NC-SA 4.0, com crédito no cartão)
- **Jogos:** *Quem sou eu?* (quiz) e *Travessia Segura*
- **Links diretos:** `#especie/<id>` (por exemplo `#especie/lobo`), `#jogos/quiz`, `#jogos/travessia`, `#apresentacao` (QR gigante)
- **Funciona offline** depois da primeira visita (PWA)
- Prévia de compartilhamento (WhatsApp/redes) e ícone de app

## Estrutura

| Pasta / arquivo | Para quê |
|---|---|
| `index.html` | O site (páginas, espécies e galeria) |
| `js/quiz.js`, `js/travessia.js` | Os dois jogos |
| `js/feira.js` | Compartilhar, modo apresentação, aviso rápido e modo offline |
| `css/extra.css` | Estilos de acessibilidade, jogos e modo apresentação |
| `images/`, `audio/`, `fonts/`, `icons/` | Fotos (WebP), sons (MP3), fontes e ícones |
| `sw.js`, `manifest.webmanifest` | Modo offline e instalação como app |
| `material-impresso/qr-codes-especies.pdf` | Folha para imprimir: um QR por espécie, mais site e jogos |
| `tools/` | Gerador do `sw.js` |

## Manutenção

Depois de **qualquer alteração** nos arquivos do site, rode:

```bash
python3 tools/gerar_sw.py
```

Isso atualiza a lista de arquivos e a versão do modo offline, para quem já visitou receber a versão nova.

## Pontos de restauração

- Branch `versao-1.0`: o site sem sons, jogos e espécies novas.
- Branch `sons`: o site só com os três primeiros sons.

Para voltar a uma delas: GitHub → Settings → Pages → trocar a branch de publicação.
