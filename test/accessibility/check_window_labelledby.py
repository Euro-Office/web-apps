"""Regression check: dialog windows must be named by their title.

Parses the Common.UI.Window template in apps/common/main/lib/component/Window.js
and verifies that the role="dialog|alertdialog" root carries aria-labelledby
pointing at the id of the header title element.
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "apps/common/main/lib/component/Window.js"

src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
text = src.read_text(encoding="utf-8")

root = re.search(r"var template = '<div class=\"asc-window.*?';", text, re.S)
if not root:
    print("FAIL: Window template not found")
    sys.exit(1)
tpl = root.group(0)

labelled = re.search(r'aria-labelledby="<%= id %>-title"', tpl)
title = re.search(r'class="title" id="<%= id %>-title"', tpl)

if not labelled:
    print("FAIL: dialog root has no aria-labelledby pointing at the title (aria-labelledby missing)")
    sys.exit(1)
if not title:
    print("FAIL: title element has no id matching aria-labelledby")
    sys.exit(1)

print("OK: dialog root is labelled by its title")
