from django.contrib.staticfiles.apps import StaticFilesConfig


class WalkQuestStaticFilesConfig(StaticFilesConfig):
    # css/app.css is the Tailwind v4 entry point: Vite bundles it into dist/,
    # and its `@import "tailwindcss"` breaks manifest post-processing.
    ignore_patterns = [*StaticFilesConfig.ignore_patterns, "css/app.css"]
