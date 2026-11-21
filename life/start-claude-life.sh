#!/bin/sh
cd "$(dirname "$0")"
(sleep 1; open http://localhost:4747 2>/dev/null || xdg-open http://localhost:4747) &
node app/server.js
