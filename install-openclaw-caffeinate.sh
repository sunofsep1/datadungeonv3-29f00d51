#!/usr/bin/env bash
# install-openclaw-caffeinate.sh
#
# Installs a LaunchAgent that runs `caffeinate -dimsu` whenever the
# OpenClaw gateway LaunchAgent (ai.openclaw.gateway) is loaded. When the
# gateway is unloaded, caffeinate is stopped automatically — so your Mac
# can sleep normally if you ever turn OpenClaw off.
#
# Flags handled:
#   -d  prevent display sleep    (set, since some WhatsApp Web sessions tie to display state)
#   -i  prevent idle sleep
#   -m  prevent disk idle sleep
#   -s  prevent system sleep on AC power
#   -u  declare user is active
#
# Run once:   bash install-openclaw-caffeinate.sh
# Uninstall:  bash install-openclaw-caffeinate.sh --uninstall

set -euo pipefail

LABEL="ai.openclaw.caffeinate"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
DOMAIN="gui/$(id -u)"
LOG="/tmp/${LABEL}.log"

uninstall() {
  echo "Stopping ${LABEL}..."
  launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
  rm -f "${PLIST}"
  echo "Removed ${PLIST}"
  echo "Done. Your Mac will sleep normally per its Energy settings."
}

if [[ "${1:-}" == "--uninstall" ]]; then
  uninstall
  exit 0
fi

# Sanity check: gateway must already be installed, otherwise OtherJobEnabled
# has nothing to track.
if ! launchctl print "${DOMAIN}/ai.openclaw.gateway" >/dev/null 2>&1; then
  echo "Warning: ai.openclaw.gateway is not currently loaded in ${DOMAIN}."
  echo "Run 'openclaw gateway install' first, then re-run this script."
  echo "Continuing anyway — the agent will activate when the gateway loads."
fi

mkdir -p "${HOME}/Library/LaunchAgents"

cat > "${PLIST}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-dimsu</string>
  </array>

  <!-- Stay alive only while the OpenClaw gateway is loaded.
       When you unload the gateway, this job exits and the Mac can sleep. -->
  <key>KeepAlive</key>
  <dict>
    <key>OtherJobEnabled</key>
    <dict>
      <key>ai.openclaw.gateway</key>
      <true/>
    </dict>
  </dict>

  <key>RunAtLoad</key>
  <false/>

  <key>ProcessType</key>
  <string>Background</string>

  <key>StandardOutPath</key>
  <string>${LOG}</string>
  <key>StandardErrorPath</key>
  <string>${LOG}</string>
</dict>
</plist>
PLIST

# Tighten perms — plist contains your UID-scoped service config, no secrets,
# but 644 is the convention.
chmod 644 "${PLIST}"

# Reload (idempotent).
launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "${DOMAIN}" "${PLIST}"
launchctl enable "${DOMAIN}/${LABEL}"

echo
echo "Installed: ${PLIST}"
echo "Label:     ${DOMAIN}/${LABEL}"
echo
echo "Verify with:"
echo "  launchctl print ${DOMAIN}/${LABEL} | grep -E 'state|pid|program'"
echo "  pgrep -lf 'caffeinate -dimsu'"
echo
echo "Logs (if any):"
echo "  tail -f ${LOG}"
echo
echo "Uninstall later with:"
echo "  bash $(basename "$0") --uninstall"
