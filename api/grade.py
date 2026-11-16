import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from _venturebot.ai import grade

MAX_BODY_SIZE = 1024 * 1024


class handler(BaseHTTPRequestHandler):
    def _headers(self, status, length=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if length is not None:
            self.send_header("Content-Length", str(length))
        self.end_headers()

    def do_OPTIONS(self):
        self._headers(204, 0)

    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._write(400, {"error": "Invalid Content-Length."})
            return
        if size < 0 or size > MAX_BODY_SIZE:
            self._write(413, {"error": "Request body is too large."})
            return
        try:
            body = json.loads(self.rfile.read(size).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._write(400, {"error": "Invalid JSON body."})
            return
        self._write(*grade(body))

    def _write(self, status, payload):
        encoded = json.dumps(payload).encode("utf-8")
        self._headers(status, len(encoded))
        self.wfile.write(encoded)
