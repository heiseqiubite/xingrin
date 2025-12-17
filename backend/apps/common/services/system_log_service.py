import glob
import json
import logging
import subprocess
from datetime import datetime


logger = logging.getLogger(__name__)


class SystemLogService:
    def __init__(self):
        self.log_globs = [
            "/app/backend/logs/*",
            "/opt/xingrin/logs/*",
        ]
        self.default_lines = 200
        self.max_lines = 10000
        self.timeout_seconds = 3

    def get_logs_content(self, lines: int | None = None) -> str:
        if lines is None:
            lines = self.default_lines

        lines = int(lines)
        if lines < 1:
            lines = 1
        if lines > self.max_lines:
            lines = self.max_lines

        files: list[str] = []
        for pattern in self.log_globs:
            matched = sorted(glob.glob(pattern))
            if matched:
                files = matched
                break
        if not files:
            return ""

        cmd = ["tail", "-q", "-n", str(lines), *files]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds,
            check=False,
        )

        if result.returncode != 0:
            logger.warning(
                "tail command failed: returncode=%s stderr=%s",
                result.returncode,
                (result.stderr or "").strip(),
            )

        raw = result.stdout or ""
        raw_lines = [ln for ln in raw.splitlines() if ln.strip()]

        parsed: list[tuple[datetime | None, int, str]] = []
        for idx, line in enumerate(raw_lines):
            ts: datetime | None = None
            if line.startswith("{") and line.endswith("}"):
                try:
                    obj = json.loads(line)
                    asctime = obj.get("asctime")
                    if isinstance(asctime, str):
                        ts = datetime.strptime(asctime, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    ts = None
            parsed.append((ts, idx, line))

        parsed.sort(key=lambda x: (x[0] is None, x[0] or datetime.min, x[1]))
        sorted_lines = [x[2] for x in parsed]
        if len(sorted_lines) > lines:
            sorted_lines = sorted_lines[-lines:]

        return "\n".join(sorted_lines) + ("\n" if sorted_lines else "")
