#!/usr/bin/env python3
"""Static file server for Cocoa Hollow + a /shot endpoint the page posts
rendered frames to. Lets the art be reviewed without screen-capturing."""

import base64
import http.server
import json
import os
import socketserver
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4780


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != '/shot':
            self.send_error(404)
            return
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n)
        try:
            data = json.loads(body)
            name = ''.join(c for c in data.get('name', 'shot')
                           if c.isalnum() or c in '-_')
            outdir = os.path.join(ROOT, 'shots')
            os.makedirs(outdir, exist_ok=True)
            if 'text' in data:                       # error report
                path = os.path.join(outdir, name + '.txt')
                with open(path, 'w') as f:
                    f.write(data['text'])
            else:
                raw = data['png'].split(',', 1)[1]
                path = os.path.join(outdir, name + '.png')
                with open(path, 'wb') as f:
                    f.write(base64.b64decode(raw))
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(path.encode())
        except Exception as e:
            self.send_error(500, str(e))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        print(f'serving {ROOT} on http://127.0.0.1:{PORT}')
        httpd.serve_forever()
