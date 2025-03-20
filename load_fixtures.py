#!/usr/bin/env python
"""
Script to load fixtures data directly without using the loaddata command.
This bypasses issues with fixture directory configuration.
"""
import os
import json
import sys
import django
from pathlib import Path

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.conf import settings
from django.apps import apps

def load_fixture(fixture_file):
    """
    Load a fixture file directly using Django's ORM.
    """
    try:
        with open(fixture_file, 'r') as f:
            print(f"Loading fixture: {fixture_file}")
            data = json.load(f)
            
            for item in data:
                model_name = item['model']
                app_label, model = model_name.split('.')
                Model = apps.get_model(app_label, model)
                
                fields = item.get('fields', {})
                
                # Handle models with UUID primary keys
                if model_name == 'walks.adventure' and 'pk' in item:
                    try:
                        # For Adventure model, use the UUID from the fixture
                        adventure_uuid = item['pk']
                        # Check if this Adventure already exists
                        adventure_exists = Model.objects.filter(pk=adventure_uuid).exists()
                        
                        if adventure_exists:
                            print(f"Adventure with ID {adventure_uuid} already exists, skipping")
                            continue
                        else:
                            # Create the Adventure with the specified UUID
                            obj = Model.objects.create(id=adventure_uuid, **fields)
                            print(f"Created {model_name} with ID: {adventure_uuid}")
                            continue
                    except Exception as e:
                        print(f"Error creating Adventure with UUID {item.get('pk')}: {str(e)}")
                        continue
                        
                # Special handling for foreign key relationships
                if model_name == 'walks.walk':
                    try:
                        # Check if the adventure field is a UUID string and convert it to an Adventure instance
                        if 'adventure' in fields and isinstance(fields['adventure'], str):
                            Adventure = apps.get_model('walks', 'Adventure')
                            adventure_instance = Adventure.objects.filter(pk=fields['adventure']).first()
                            
                            if adventure_instance:
                                fields['adventure'] = adventure_instance
                            else:
                                print(f"Skipping {model_name}: Adventure with ID {fields['adventure']} does not exist")
                                continue
                    except Exception as e:
                        print(f"Error handling adventure reference for {model_name}: {str(e)}")
                        continue
                        
                # Special handling for walk_related_categories to check foreign keys
                elif model_name == 'walks.walk_related_categories':
                    try:
                        # Check if the referenced walk exists
                        Walk = apps.get_model('walks', 'Walk')
                        walk_exists = Walk.objects.filter(pk=fields.get('walk_id')).exists()
                        
                        if not walk_exists:
                            print(f"Skipping {model_name}: Walk with ID {fields.get('walk_id')} does not exist")
                            continue
                            
                        # Check if the referenced category exists
                        WalkCategoryTag = apps.get_model('walks', 'WalkCategoryTag')
                        category_exists = WalkCategoryTag.objects.filter(id=fields.get('walkcategorytag_id')).exists()
                        
                        if not category_exists:
                            print(f"Skipping {model_name}: Category with ID {fields.get('walkcategorytag_id')} does not exist")
                            continue
                    except Exception as e:
                        print(f"Error checking references for {model_name}: {str(e)}")
                        continue
                
                # Check if this object already exists to avoid duplicates
                try:
                    if 'slug' in fields:
                        obj, created = Model.objects.get_or_create(slug=fields['slug'], defaults=fields)
                    elif 'name' in fields:
                        obj, created = Model.objects.get_or_create(name=fields['name'], defaults=fields)
                    else:
                        obj = Model.objects.create(**fields)
                        created = True
                    
                    if created:
                        print(f"Created {model_name}: {fields.get('name', fields.get('slug', 'Unknown'))}")
                    else:
                        print(f"Already exists: {model_name}: {fields.get('name', fields.get('slug', 'Unknown'))}")
                        
                except Exception as e:
                    print(f"Error creating {model_name}: {str(e)}")
        
        return True
    except Exception as e:
        print(f"Error loading fixture {fixture_file}: {str(e)}")
        return False

def main():
    # Define fixture files to load
    fixture_files = [
        'walkquest/walks/fixtures/initial_tags.json',
        'walkquest/walks/fixtures/initial_walks_updated.json',  # Using the updated walks file
        # Load relations after both tags and walks exist
        'walkquest/walks/fixtures/tag_relations.json',
    ]
    
    success = True
    for fixture_file in fixture_files:
        fixture_path = Path(settings.BASE_DIR) / fixture_file
        if not fixture_path.exists():
            print(f"Fixture file not found: {fixture_path}")
            success = False
            continue
        
        if not load_fixture(fixture_path):
            success = False
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())