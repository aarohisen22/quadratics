# Local web server for the game that tells the browser not to cache files,
# so a refresh always shows the latest changes.
# Run from the Game folder:  python3 tools/serve.py   then open http://localhost:8080
import http.server, socketserver, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with Server(('', 8080), NoCache) as httpd:
    print('Game running at http://localhost:8080  (Ctrl+C to stop)')
    httpd.serve_forever()
