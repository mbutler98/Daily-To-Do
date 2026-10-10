"""Prints this computer's private Tailscale address, e.g. https://my-laptop.tail1234.ts.net
(used by start-beta.bat). Prints nothing if Tailscale isn't running or signed in. Same as Claude Alerts."""
import json
import shutil
import subprocess
import sys
from pathlib import Path


def tailscale():
    exe = shutil.which("tailscale")
    if exe:
        return exe
    p = Path(r"C:\Program Files\Tailscale\tailscale.exe")
    return str(p) if p.exists() else None


def main():
    exe = tailscale()
    if not exe:
        return 1
    try:
        out = subprocess.run([exe, "status", "--json"], capture_output=True, text=True, timeout=15).stdout
        name = (json.loads(out).get("Self") or {}).get("DNSName", "").rstrip(".")
    except Exception:
        return 1
    if not name:
        return 1
    print(f"https://{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
