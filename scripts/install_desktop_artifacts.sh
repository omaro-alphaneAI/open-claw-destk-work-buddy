#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_ROOT="${SCRIPT_DIR:h}"
APP_NAME="WorkBuddy Pet.app"
SOURCE_APP_DEFAULT="${PROJECT_ROOT}/dist/mac-arm64/${APP_NAME}"
INSTALL_ROOT_DEFAULT="${HOME}/Applications"
DESKTOP_DIR_DEFAULT="${HOME}/Desktop"

SOURCE_APP="${SOURCE_APP:-${SOURCE_APP_DEFAULT}}"
INSTALL_ROOT="${INSTALL_ROOT:-${INSTALL_ROOT_DEFAULT}}"
DESKTOP_DIR="${DESKTOP_DIR:-${DESKTOP_DIR_DEFAULT}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-app)
      SOURCE_APP="$2"
      shift 2
      ;;
    --install-root)
      INSTALL_ROOT="$2"
      shift 2
      ;;
    --desktop-dir)
      DESKTOP_DIR="$2"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

INSTALLED_APP="${INSTALL_ROOT}/${APP_NAME}"
DESKTOP_TOGGLE_APP="${DESKTOP_DIR}/桌宠.app"
FALLBACK_TOGGLE_SCRIPT="${DESKTOP_DIR}/桌宠.command"
LEGACY_DESKTOP_APP="${DESKTOP_DIR}/${APP_NAME}"
LEGACY_TOGGLE_SCRIPT="${DESKTOP_DIR}/桌宠开关.command"
LEGACY_TOGGLE_APP="${DESKTOP_DIR}/桌宠开关.app"
PROC_KEY="WorkBuddy Pet.app/Contents/MacOS/"

if [[ ! -d "${SOURCE_APP}" ]]; then
  echo "missing built app: ${SOURCE_APP}" >&2
  exit 1
fi

mkdir -p "${INSTALL_ROOT}" "${DESKTOP_DIR}"
rm -rf "${INSTALLED_APP}"
/usr/bin/ditto "${SOURCE_APP}" "${INSTALLED_APP}"
rm -rf \
  "${DESKTOP_TOGGLE_APP}" \
  "${FALLBACK_TOGGLE_SCRIPT}" \
  "${LEGACY_DESKTOP_APP}" \
  "${LEGACY_TOGGLE_SCRIPT}" \
  "${LEGACY_TOGGLE_APP}"

if command -v osacompile >/dev/null 2>&1; then
  osacompile -o "${DESKTOP_TOGGLE_APP}" \
    -e "set appPath to \"${INSTALLED_APP}\"" \
    -e "set procKey to \"${PROC_KEY}\"" \
    -e "try" \
    -e "  do shell script \"/usr/bin/pgrep -f \" & quoted form of procKey" \
    -e "  do shell script \"/usr/bin/pkill -f \" & quoted form of procKey & \" >/dev/null 2>&1 || true\"" \
    -e "on error" \
    -e "  do shell script \"/usr/bin/open \" & quoted form of appPath" \
    -e "end try"
else
  cat > "${FALLBACK_TOGGLE_SCRIPT}" <<EOF
#!/bin/zsh
set -euo pipefail

APP_PATH="${INSTALLED_APP}"
PROC_KEY="${PROC_KEY}"

if /usr/bin/pgrep -f "${PROC_KEY}" >/dev/null 2>&1; then
  /usr/bin/pkill -f "${PROC_KEY}" >/dev/null 2>&1 || true
else
  /usr/bin/open "${APP_PATH}"
fi
EOF

  chmod +x "${FALLBACK_TOGGLE_SCRIPT}"
fi

echo "installed:"
echo "${INSTALLED_APP}"
if [[ -d "${DESKTOP_TOGGLE_APP}" ]]; then
  echo "${DESKTOP_TOGGLE_APP}"
else
  echo "${FALLBACK_TOGGLE_SCRIPT}"
fi
