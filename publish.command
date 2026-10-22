#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
python3 publish.py
