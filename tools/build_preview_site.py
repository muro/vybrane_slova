#!/usr/bin/env python3

from pathlib import Path
import shutil


root = Path(__file__).resolve().parent.parent
source = root / 'web'
output = root / 'dist'
client = output / 'client'
server = output / 'server'

shutil.rmtree(output, ignore_errors=True)
server.mkdir(parents=True)
shutil.copytree(source, client)
(server / 'index.js').write_text("""export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  },
};
""", encoding='utf-8')
