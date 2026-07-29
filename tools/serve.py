#!/usr/bin/env python3
"""Serveur de développement pour AtoutMath.

`python3 -m http.server` n'envoie aucun en-tête de cache : le navigateur est
alors libre de réutiliser sa copie sans revalider. En développement, cela
donne des symptômes trompeurs — un CSS modifié qui n'est pas repris, donc une
mise en page à moitié à jour qu'on croit cassée.

Ce serveur envoie `Cache-Control: no-store` sur tout : chaque rechargement
part des fichiers du disque.

    python3 tools/serve.py [port]        # 8090 par défaut

Ne pas utiliser en production : `no-store` sur chaque fichier est exactement
ce qu'il ne faut pas faire pour des élèves sur une connexion lente.
"""

import functools
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Chrome DevTools sollicite ce chemin à chaque ouverture : le 404 est
        # attendu et n'a pas à polluer la sortie.
        if '/.well-known/appspecific/' in (args[0] if args else ''):
            return
        super().log_message(fmt, *args)



def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), handler) as httpd:
        print(f'AtoutMath servi sur http://localhost:{port}  (cache désactivé)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nArrêt du serveur.')


if __name__ == '__main__':
    main()
