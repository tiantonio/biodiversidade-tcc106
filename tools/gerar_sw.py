#!/usr/bin/env python3
"""Gera o sw.js (service worker) com a lista de arquivos do site e uma versão baseada no conteúdo.

Rode SEMPRE que alterar qualquer arquivo do site (index.html, images/, audio/, js/, css/...):

    python3 tools/gerar_sw.py

Assim, quem já visitou o site recebe a versão nova e o modo offline continua completo.
"""
import hashlib
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTAS = ['images', 'audio', 'fonts', 'js', 'css', 'icons']
RAIZ_ARQUIVOS = ['index.html', 'manifest.webmanifest']
IGNORAR = {'og-share.jpg'}  # usada só na prévia de links, não precisa ficar offline


def listar():
    arqs = ['./'] + RAIZ_ARQUIVOS
    for pasta in PASTAS:
        base = os.path.join(RAIZ, pasta)
        if not os.path.isdir(base):
            continue
        for nome in sorted(os.listdir(base)):
            if nome in IGNORAR or nome.startswith('.'):
                continue
            arqs.append(f'{pasta}/{nome}')
    return arqs


def main():
    arqs = listar()
    h = hashlib.sha1()
    for a in arqs:
        caminho = os.path.join(RAIZ, 'index.html' if a == './' else a)
        h.update(a.encode())
        with open(caminho, 'rb') as f:
            h.update(f.read())
    versao = h.hexdigest()[:10]
    with open(os.path.join(RAIZ, 'tools', 'sw.template.js'), encoding='utf-8') as f:
        modelo = f.read()
    saida = modelo.replace('__VERSAO__', versao).replace('__ARQUIVOS__', json.dumps(arqs, ensure_ascii=False, indent=2))
    with open(os.path.join(RAIZ, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(saida)
    print(f'sw.js gerado: versão {versao}, {len(arqs)} arquivos em cache')


if __name__ == '__main__':
    sys.exit(main())
