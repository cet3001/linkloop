#!/usr/bin/env python3
"""
Memory API -- ChromaDB + Ollama RAG (Mac)
Port: 11500

Endpoints:
  GET  /health          - liveness check
  POST /store           - upsert {id, text, collection?, metadata?}
  POST /query           - search {text, collection?, n_results?}

Each agent gets its own collection. Default collection: "shared".
"""
import os, json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import chromadb
import requests

CHROMA_PATH = os.environ.get('CHROMA_PATH', '/Users/cet3001/code/ollama-memory/chroma_db')
OLLAMA_URL  = os.environ.get('OLLAMA_URL',  'http://127.0.0.1:11434')
EMBED_MODEL = 'nomic-embed-text'
PORT        = int(os.environ.get('MEMORY_API_PORT', '11500'))

_client = chromadb.PersistentClient(path=CHROMA_PATH)

def get_embedding(text: str) -> list:
    r = requests.post(f'{OLLAMA_URL}/api/embeddings',
                      json={'model': EMBED_MODEL, 'prompt': text}, timeout=30)
    r.raise_for_status()
    return r.json()['embedding']

def col(name='shared'):
    return _client.get_or_create_collection(name=name)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n)) if n else {}

    def do_GET(self):
        if urlparse(self.path).path == '/health':
            self._json({'status': 'ok', 'chroma': CHROMA_PATH, 'ollama': OLLAMA_URL})
        else:
            self._json({'error': 'not found'}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        b = self._body()
        try:
            if path == '/store':
                c = col(b.get('collection', 'shared'))
                emb = get_embedding(b['text'])
                meta = b.get('metadata', {}) or {}
                if not meta:
                    meta = {'source': 'api'}
                c.upsert(ids=[b['id']], embeddings=[emb],
                         documents=[b['text']], metadatas=[meta])
                self._json({'stored': b['id']})
            elif path == '/query':
                c = col(b.get('collection', 'shared'))
                emb = get_embedding(b['text'])
                res = c.query(query_embeddings=[emb],
                              n_results=b.get('n_results', 5))
                self._json({'results': [
                    {'id': i, 'text': d, 'metadata': m, 'distance': dist}
                    for i, d, m, dist in zip(res['ids'][0], res['documents'][0],
                                             res['metadatas'][0], res['distances'][0])
                ]})
            else:
                self._json({'error': 'not found'}, 404)
        except Exception as e:
            self._json({'error': str(e)}, 500)

if __name__ == '__main__':
    os.makedirs(CHROMA_PATH, exist_ok=True)
    print(f'[memory-api] listening on http://127.0.0.1:{PORT}')
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
