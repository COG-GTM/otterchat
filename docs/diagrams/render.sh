#!/usr/bin/env bash
# Renders architecture.dot to PNG and SVG. Needs Graphviz (apt-get install graphviz fonts-dejavu).
set -euo pipefail
cd "$(dirname "$0")"
dot -Tpng -Gdpi=110 architecture.dot -o architecture.png
dot -Tsvg architecture.dot -o architecture.svg
