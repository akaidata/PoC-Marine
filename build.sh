#!/usr/bin/env bash
# Assembles the two standalone demo pages from src/.
# Each output is a single self-contained .html file — no server, no Node,
# no network. Just open it.
set -euo pipefail
cd "$(dirname "$0")"

emit () {                       # emit <out> <title> <glyph> <name> <sub> <whoic> <who> <whorole> <claimlabel> <panes> <appjs>
  local out="$1" title="$2" glyph="$3" name="$4" sub="$5"
  local whoic="$6" who="$7" whorole="$8" claimlabel="$9" panes="${10}" appjs="${11}"

  {
    echo '<!doctype html>'
    echo '<html lang="en">'
    echo '<head>'
    echo '<meta charset="utf-8">'
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
    echo "<title>${title}</title>"
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">'
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=Geist:wght@400..800&family=Geist+Mono:wght@400;500&display=swap">'
    echo '<style>'
    cat src/core.css
    cat src/app.css
    echo '</style>'
    echo '</head>'
    echo '<body>'

    sed -e "s|__GLYPH__|${glyph}|g" \
        -e "s|__APPNAME__|${name}|g" \
        -e "s|__APPSUB__|${sub}|g" \
        -e "s|__WHOIC__|${whoic}|g" \
        -e "s|__WHO__|${who}|g" \
        -e "s|__WHOROLE__|${whorole}|g" \
        -e "s|__CLAIMLABEL__|${claimlabel}|g" \
        -e "/__PANES__/r ${panes}" \
        -e "/__PANES__/d" \
        src/shell.html

    echo '<script>'
    cat src/core-data.js
    echo '</script>'
    echo '<script>'
    cat src/core-engine.js
    echo '</script>'

    if [ -f src/finance-parts.js ] && [ "${out}" = "finance.html" ]; then
      echo '<script>'
      cat src/finance-parts.js
      echo '</script>'
    fi

    echo '<script>'
    cat "${appjs}"
    echo '</script>'
    echo '</body>'
    echo '</html>'
  } > "${out}"

  printf '%-18s %6s KB\n' "${out}" "$(( $(wc -c < "${out}") / 1024 ))"
}

# ── panes per app ────────────────────────────────────────────────────
cat > /tmp/panes-super.html <<'EOF'
    <section class="pane" id="pane-capture"></section>
    <section class="pane" id="pane-check"></section>
    <section class="pane" id="pane-send"></section>
EOF

cat > /tmp/panes-finance.html <<'EOF'
    <section class="pane" id="pane-inbox"></section>
    <section class="pane" id="pane-extract"></section>
    <section class="pane" id="pane-policy"></section>
    <section class="pane" id="pane-alloc"></section>
    <section class="pane" id="pane-payload"></section>
    <section class="pane" id="pane-dashboard"></section>
    <section class="pane" id="pane-ask"></section>
EOF

emit "superintendent.html" \
     "Superintendent Receipts" \
     "SR" "Superintendent" "Expense capture" \
     "DC" "D. Charalambous" "Senior Technical Superintendent" \
     "This trip" \
     /tmp/panes-super.html src/super.js

emit "finance.html" \
     "Claim Review — Finance" \
     "FN" "Claim Review" "Owner recharge, VAT" \
     "MK" "M. Kyriakou" "Finance, Limassol office" \
     "Open claim" \
     /tmp/panes-finance.html src/finance.js
