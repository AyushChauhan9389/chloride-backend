#!/bin/sh
# Chloride — all-in-one DevOps utils CLI
#
#   curl -fsSL https://chloride.carbonkit.tech/install | sh
#
# Env:
#   CL_INSTALL_DIR   where to put the binary (default: ~/.local/bin)
set -eu

REPO="ayushChauhan9389/chloride"
ASSET="cl-x86_64-unknown-linux-musl"
BASE_URL="https://github.com/${REPO}/releases/latest/download"
INSTALL_DIR="${CL_INSTALL_DIR:-${HOME}/.local/bin}"

# stdout is still the terminal when the script itself arrives over a pipe.
if [ -t 1 ]; then
  B='\033[1m'; C='\033[36m'; R='\033[31m'; D='\033[2m'; N='\033[0m'
else
  B=''; C=''; R=''; D=''; N=''
fi

say()  { printf '%b\n' "$*"; }
die()  { printf '%b\n' "${R}error:${N} $*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

dl() { # dl <url> <dest>
  if have curl; then
    curl -fsL "$1" -o "$2"
  elif have wget; then
    wget -qO "$2" "$1"
  else
    die "need curl or wget to download"
  fi
}

say ""
say "  ${C}🧪 Chloride${N} ${D}— all-in-one DevOps utils CLI${N}"
say ""

os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Linux) ;;
  Darwin)
    die "no macOS build is published yet.\n  Build from source instead:\n    cargo install --git https://github.com/${REPO}"
    ;;
  *) die "unsupported operating system: ${os}" ;;
esac

case "$arch" in
  x86_64 | amd64) ;;
  *) die "unsupported architecture: ${arch} (only x86_64 is published today)" ;;
esac

tmp="$(mktemp -d 2>/dev/null || mktemp -d -t chloride)"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "${C}⬇${N}  fetching the latest release…"
dl "${BASE_URL}/${ASSET}" "${tmp}/cl" \
  || die "download failed.\n  Check that a release exists: https://github.com/${REPO}/releases/latest"

# Verify against the checksum published alongside the binary. Missing checksum
# is tolerated (older releases); a mismatching one never is.
if dl "${BASE_URL}/${ASSET}.sha256" "${tmp}/cl.sha256" 2>/dev/null; then
  expected="$(cut -d' ' -f1 < "${tmp}/cl.sha256")"
  actual=""
  if have sha256sum; then
    actual="$(sha256sum "${tmp}/cl" | cut -d' ' -f1)"
  elif have shasum; then
    actual="$(shasum -a 256 "${tmp}/cl" | cut -d' ' -f1)"
  else
    say "${D}   no sha256 tool found — skipping checksum verification${N}"
  fi
  if [ -n "$actual" ] && [ "$expected" != "$actual" ]; then
    die "checksum mismatch — refusing to install.\n  expected ${expected}\n  got      ${actual}"
  fi
fi

mkdir -p "$INSTALL_DIR" || die "cannot create ${INSTALL_DIR}"
chmod 755 "${tmp}/cl"
mv -f "${tmp}/cl" "${INSTALL_DIR}/cl" \
  || die "cannot write to ${INSTALL_DIR}\n  Set CL_INSTALL_DIR to a writable directory and re-run."

version="$("${INSTALL_DIR}/cl" --version 2>/dev/null || echo cl)"
say ""
say "${C}✔${N}  installed ${B}${version}${N} → ${INSTALL_DIR}/cl"

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*)
    say ""
    say "   run ${B}cl${N} to get started, ${B}cl login${N} to sign in"
    ;;
  *)
    say ""
    say "${D}   ${INSTALL_DIR} is not on your PATH yet. Add it:${N}"
    say "     echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ~/.bashrc   ${D}# or ~/.zshrc${N}"
    say "     export PATH=\"${INSTALL_DIR}:\$PATH\""
    ;;
esac
say ""
