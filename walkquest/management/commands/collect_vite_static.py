import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Ensures Vite static files are collected properly'

    def handle(self, *args, **options):
        self.stdout.write('Ensuring Vite static files are collected properly...')
        
        # Check if manifest.json exists in the expected location
        manifest_path = os.path.join(settings.APPS_DIR, 'static', 'dist', 'manifest.json')
        if os.path.exists(manifest_path):
            self.stdout.write(self.style.SUCCESS(f'Found manifest.json at {manifest_path}'))
        else:
            self.stdout.write(self.style.WARNING(f'manifest.json not found at {manifest_path}'))
            
        # Check static dirs
        for static_dir in settings.STATICFILES_DIRS:
            self.stdout.write(f'Static dir: {static_dir}')
            if os.path.exists(static_dir):
                self.stdout.write(self.style.SUCCESS(f'  - Directory exists'))
            else:
                self.stdout.write(self.style.ERROR(f'  - Directory does not exist'))
                
        self.stdout.write(self.style.SUCCESS('Done checking Vite static files'))