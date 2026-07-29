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

import datetime
import functools
import http.server
import json
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVIEWS = os.path.join(ROOT, 'reviews')
JOURNAL = os.path.join(REVIEWS, 'journal.jsonl')

MAX_REVIEW_BYTES = 512 * 1024


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

    def do_POST(self):
        """Reçoit un verdict de relecture depuis l'atelier et l'archive.

        C'est ce qui ferme la boucle de travail : l'avis donné dans le
        navigateur atterrit dans un fichier du dépôt, lisible directement,
        sans copier-coller ni presse-papier.
        """
        if self.path.split('?')[0] != '/_review':
            self.send_error(404, 'Seul /_review accepte POST')
            return

        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_REVIEW_BYTES:
            self.send_error(413, 'Charge utile absente ou trop grande')
            return

        try:
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            self.send_error(400, f'JSON invalide : {exc}')
            return

        payload.setdefault('ts', datetime.datetime.now().isoformat(timespec='seconds'))
        os.makedirs(REVIEWS, exist_ok=True)
        # Journal append-only : l'historique des décisions se relit dans
        # l'ordre, et une relecture ultérieure n'efface pas la précédente.
        with open(JOURNAL, 'a', encoding='utf-8') as fp:
            fp.write(json.dumps(payload, ensure_ascii=False) + '\n')

        verdict = payload.get('verdict', '?')
        generateur = payload.get('generateur', '?')
        signalements = len(payload.get('signalements') or [])
        print(f'  ▸ verdict « {verdict} » sur {generateur}'
              + (f' — {signalements} signalement(s)' if signalements else ''))

        body = json.dumps({'ok': True, 'fichier': 'reviews/journal.jsonl'}).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


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
