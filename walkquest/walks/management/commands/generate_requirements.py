"""Command to generate requirements files from poetry.lock."""
import re
import subprocess
from pathlib import Path
from typing import List, Tuple, Optional

from django.core.management.base import BaseCommand, CommandError

ALLOWED_FORMATS = ["requirements.txt"]
ALLOWED_OPTIONS = ["--with", "--without", "--without-hashes"]
FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+\.txt$")


def validate_poetry_args(args: List[str]) -> bool:
    """Validate poetry command arguments."""
    if not args:
        return True
    return all(
        any(arg.startswith(opt) for opt in ALLOWED_OPTIONS)
        for arg in args
        if arg != "dev"
    )


def sanitize_package_name(package: str) -> Optional[str]:
    """Sanitize package name for GitHub URL construction."""
    if re.match(r"^[a-zA-Z0-9_.-]+$", package):
        return package
    return None


class Command(BaseCommand):
    """Generate requirements files from poetry.lock."""

    help = "Generate requirements files from poetry.lock"

    def handle(self, *args, **kwargs):
        """Execute the command."""
        try:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            req_dir = base_dir / "requirements"
            req_dir.mkdir(exist_ok=True)

            # Define requirements configurations
            files: List[Tuple[str, List[str]]] = [
                ("base.txt", []),
                ("local.txt", ["--with", "dev"]),
                ("production.txt", ["--without", "dev"]),
            ]

            for filename, poetry_args in files:
                if not FILENAME_PATTERN.match(filename):
                    raise CommandError(f"Invalid filename: {filename}")

                if not validate_poetry_args(poetry_args):
                    raise CommandError(f"Invalid poetry arguments: {poetry_args}")

                output = req_dir / filename
                cmd = ["poetry", "export", "-f", "requirements.txt"]
                if poetry_args:
                    cmd.extend(poetry_args)

                try:
                    # Use check=True for better error handling
                    result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        check=True,
                    )

                    # Format requirements
                    formatted = []
                    for line in result.stdout.splitlines():
                        if not line.strip() or line.startswith("#"):
                            continue

                        try:
                            if "==" in line:
                                package, version = line.strip().split("==")
                                pkg_name = sanitize_package_name(package)
                                if pkg_name:
                                    formatted.append(
                                        f"{package}=={version}  "
                                        f"# https://github.com/{pkg_name}/{pkg_name}"
                                    )
                                else:
                                    formatted.append(f"{package}=={version}")
                            else:
                                formatted.append(line)
                        except ValueError:
                            formatted.append(line)

                    # Write formatted requirements using Path
                    output.write_text("\n".join(formatted))

                    self.stdout.write(
                        self.style.SUCCESS(f"Generated {filename}")
                    )

                except subprocess.CalledProcessError as e:
                    self.stderr.write(
                        self.style.ERROR(
                            f"Error generating {filename}: {e.stderr}"
                        )
                    )
                except OSError as e:
                    self.stderr.write(
                        self.style.ERROR(
                            f"OS error while processing {filename}: {e}"
                        )
                    )

        except Exception as e:
            raise CommandError(f"Failed to generate requirements: {e}") from e
