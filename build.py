#!/usr/bin/env python3
"""Assemble src/ (shell.html + engine.js + ui.js) into index.html, the playable single-file game."""
from pathlib import Path

root = Path(__file__).parent
shell = (root / "src/shell.html").read_text(encoding="utf-8")
engine = (root / "src/engine.js").read_text(encoding="utf-8")
ui = (root / "src/ui.js").read_text(encoding="utf-8")
body = shell.replace("/*ENGINE*/", engine).replace("/*UI*/", ui)
cut = body.index("</style>") + len("</style>")
html = (
    '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + body[:cut] + "\n</head>\n<body>\n" + body[cut:] + "\n</body>\n</html>\n"
)
(root / "index.html").write_text(html, encoding="utf-8")
print(f"index.html : {len(html):,} octets")
