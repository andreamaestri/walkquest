import subprocess
from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate requirements files from poetry.lock"

    def handle(self, *args, **kwargs):
        base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        req_dir = base_dir / "requirements"

        # Generate requirements files
        files = [
            ("base.txt", []),
            ("local.txt", ["--with", "dev"]),
            ("production.txt", ["--without", "dev"]),
        ]

        for filename, args in files:
            output = req_dir / filename
            cmd = ["poetry", "export", "-f", "requirements.txt", "--without-hashes"] + args

            try:
                requirements = subprocess.check_output(cmd).decode()

                # Format requirements
                formatted = []
                for line in requirements.splitlines():
                    if line.strip() and not line.startswith("#"):
                        try:
                            package, version = line.strip().split("==")
                            formatted.append(f"{package}=={version}  # https://github.com/{package}/{package}")
                        except ValueError:
                            formatted.append(line)

                # Write formatted requirements
                with open(output, "w") as f:
                    f.write("\n".join(formatted))

                self.stdout.write(self.style.SUCCESS(f"Generated {filename}"))

            except subprocess.CalledProcessError as e:
                self.stderr.write(self.style.ERROR(f"Error generating {filename}: {e}"))
