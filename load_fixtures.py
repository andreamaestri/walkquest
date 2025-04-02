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
import uuid

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
            
            # Store all the walk IDs for later reference
            all_walk_ids = set()
            missing_walk_ids = set()
            
            # First pass: Create all objects except for many-to-many relationships
            created_objects = {}
            for item in data:
                model_name = item['model']
                app_label, model = model_name.split('.')
                Model = apps.get_model(app_label, model)
                
                fields = item.get('fields', {})
                pk = item.get('pk')
                
                # Track all walk IDs 
                if model_name == 'walks.walk' and pk:
                    all_walk_ids.add(pk)
                
                # Skip many-to-many fields in first pass
                m2m_fields = {}
                regular_fields = {}
                
                for field_name, value in fields.items():
                    field = Model._meta.get_field(field_name) if hasattr(Model._meta, 'get_field') else None
                    # Check if this is a many-to-many field
                    if field and field.many_to_many:
                        m2m_fields[field_name] = value
                    else:
                        regular_fields[field_name] = value
                
                # Handle models with UUID primary keys
                if model_name == 'walks.adventure' and pk:
                    try:
                        # For Adventure model, use the UUID from the fixture
                        adventure_uuid = pk
                        # Check if this Adventure already exists
                        adventure_exists = Model.objects.filter(pk=adventure_uuid).exists()
                        
                        if adventure_exists:
                            print(f"Adventure with ID {adventure_uuid} already exists, skipping")
                            created_objects.setdefault(model_name, {})[pk] = Model.objects.get(pk=adventure_uuid)
                            continue
                        else:
                            # Create the Adventure with the specified UUID
                            obj = Model.objects.create(id=adventure_uuid, **regular_fields)
                            print(f"Created {model_name} with ID: {adventure_uuid}")
                            created_objects.setdefault(model_name, {})[pk] = obj
                            continue
                    except Exception as e:
                        print(f"Error creating Adventure with UUID {pk}: {str(e)}")
                        continue
                
                # Special handling for walk models with UUID primary keys
                if model_name == 'walks.walk' and pk:
                    try:
                        # Check if this Walk already exists by UUID
                        walk_exists = Model.objects.filter(pk=pk).exists()
                        
                        if walk_exists:
                            print(f"Walk with ID {pk} already exists, updating")
                            walk = Model.objects.get(pk=pk)
                            # Update fields
                            for field, value in regular_fields.items():
                                if field != 'id':  # Don't update the id field
                                    setattr(walk, field, value)
                            walk.save()
                            created_objects.setdefault(model_name, {})[pk] = walk
                            continue
                    except Exception as e:
                        print(f"Error checking Walk with UUID {pk}: {str(e)}")
                        
                # Special handling for foreign key relationships
                if model_name == 'walks.walk':
                    try:
                        # Check if the adventure field is a UUID string and convert it to an Adventure instance
                        if 'adventure' in regular_fields and isinstance(regular_fields['adventure'], str):
                            Adventure = apps.get_model('walks', 'Adventure')
                            adventure_instance = Adventure.objects.filter(pk=regular_fields['adventure']).first()
                            
                            if adventure_instance:
                                regular_fields['adventure'] = adventure_instance
                            else:
                                print(f"Skipping {model_name}: Adventure with ID {regular_fields['adventure']} does not exist")
                                continue
                    except Exception as e:
                        print(f"Error handling adventure reference for {model_name}: {str(e)}")
                        continue
                        
                # Special handling for walk_related_categories to check foreign keys
                elif model_name == 'walks.walk_related_categories':
                    walk_id = fields.get('walk_id')
                    category_id = fields.get('walkcategorytag_id')
                    
                    if walk_id:
                        try:
                            # Check if the referenced walk exists
                            Walk = apps.get_model('walks', 'Walk')
                            walk_exists = Walk.objects.filter(pk=walk_id).exists()
                            
                            if not walk_exists:
                                missing_walk_ids.add(walk_id)
                                print(f"Note: Walk with ID {walk_id} does not exist, will be handled later")
                                continue
                                
                            # Check if the referenced category exists
                            WalkCategoryTag = apps.get_model('walks', 'WalkCategoryTag')
                            category_exists = WalkCategoryTag.objects.filter(id=category_id).exists()
                            
                            if not category_exists:
                                print(f"Skipping {model_name}: Category with ID {category_id} does not exist")
                                continue
                        except Exception as e:
                            print(f"Error checking references for {model_name}: {str(e)}")
                            continue
                
                # Check if this object already exists to avoid duplicates
                try:
                    if model_name == 'walks.walk' and pk:
                        # For Walk model, use the UUID from the fixture
                        if not Model.objects.filter(pk=pk).exists():
                            # Try to create with the specified UUID
                            obj = Model.objects.create(id=pk, **regular_fields)
                            print(f"Created Walk with ID: {pk}")
                            created_objects.setdefault(model_name, {})[pk] = obj
                            all_walk_ids.add(pk)
                    elif 'slug' in regular_fields:
                        obj, created = Model.objects.get_or_create(slug=regular_fields['slug'], defaults=regular_fields)
                    elif 'name' in regular_fields:
                        obj, created = Model.objects.get_or_create(name=regular_fields['name'], defaults=regular_fields)
                    else:
                        obj = Model.objects.create(**regular_fields)
                        created = True
                    
                    if created:
                        print(f"Created {model_name}: {regular_fields.get('name', regular_fields.get('slug', pk or 'Unknown'))}")
                    else:
                        print(f"Already exists: {model_name}: {regular_fields.get('name', regular_fields.get('slug', pk or 'Unknown'))}")
                    
                    # Store created object for later m2m handling
                    created_objects.setdefault(model_name, {})[pk] = obj
                        
                except Exception as e:
                    print(f"Error creating {model_name}: {str(e)}")
            
            # Second pass: Handle many-to-many relationships
            for item in data:
                model_name = item['model']
                app_label, model = model_name.split('.')
                Model = apps.get_model(app_label, model)
                
                fields = item.get('fields', {})
                pk = item.get('pk')
                
                # Skip if object wasn't created or found
                if model_name not in created_objects or pk not in created_objects[model_name]:
                    continue
                
                obj = created_objects[model_name][pk]
                
                # Handle many-to-many fields
                for field_name, values in fields.items():
                    field = Model._meta.get_field(field_name) if hasattr(Model._meta, 'get_field') else None
                    
                    # If field is many-to-many and has values
                    if field and field.many_to_many and values:
                        related_model = field.related_model
                        
                        # Handle categories and related_categories
                        if field_name in ['categories', 'related_categories', 'features']:
                            m2m_field = getattr(obj, field_name)
                            
                            for value in values:
                                # If value is a string, try to find by name or slug
                                if isinstance(value, str):
                                    try:
                                        # Try to find the related object by name or slug
                                        related_obj = related_model.objects.filter(name=value).first()
                                        if not related_obj:
                                            # Try by slug - convert spaces to hyphens for slug
                                            slug = value.lower().replace(' ', '-')
                                            related_obj = related_model.objects.filter(slug=slug).first()
                                            
                                        if related_obj:
                                            m2m_field.add(related_obj)
                                            print(f"Added {field_name} '{value}' to {model_name} {obj}")
                                        else:
                                            # Create the category if it doesn't exist
                                            related_obj = related_model.objects.create(name=value)
                                            m2m_field.add(related_obj)
                                            print(f"Created and added {field_name} '{value}' to {model_name} {obj}")
                                    except Exception as e:
                                        print(f"Error adding {field_name} '{value}': {str(e)}")
                                # If value is a dict with name or id
                                elif isinstance(value, dict) and ('name' in value or 'id' in value):
                                    try:
                                        if 'name' in value:
                                            related_obj = related_model.objects.filter(name=value['name']).first()
                                            if not related_obj:
                                                related_obj = related_model.objects.create(name=value['name'])
                                                
                                        elif 'id' in value:
                                            related_obj = related_model.objects.filter(id=value['id']).first()
                                            
                                        if related_obj:
                                            m2m_field.add(related_obj)
                                            print(f"Added {field_name} from dict to {model_name} {obj}")
                                    except Exception as e:
                                        print(f"Error adding {field_name} from dict: {str(e)}")
                                # If value is an integer or primary key
                                elif isinstance(value, int):
                                    try:
                                        related_obj = related_model.objects.filter(id=value).first()
                                        if related_obj:
                                            m2m_field.add(related_obj)
                                            print(f"Added {field_name} ID {value} to {model_name} {obj}")
                                    except Exception as e:
                                        print(f"Error adding {field_name} ID {value}: {str(e)}")

            # Print missing walk IDs that were referenced
            if missing_walk_ids:
                print(f"\nFound {len(missing_walk_ids)} walk IDs referenced in relationships but not in walks table.")
                print("Creating placeholder walks for missing walk IDs...")
                
                # Create placeholder walks for missing IDs
                Walk = apps.get_model('walks', 'Walk')
                for walk_id in missing_walk_ids:
                    try:
                        # Check again if walk exists (might have been created in second pass)
                        if not Walk.objects.filter(pk=walk_id).exists():
                            # Create a placeholder walk
                            placeholder = Walk.objects.create(
                                id=walk_id,
                                walk_name=f"Placeholder walk {walk_id[:8]}",
                                description="Placeholder walk created by fixture loader"
                            )
                            print(f"Created placeholder walk with ID: {walk_id}")
                            all_walk_ids.add(walk_id)
                    except Exception as e:
                        print(f"Error creating placeholder walk {walk_id}: {str(e)}")
            
            # Third pass: Process the walk_related_categories separately
            # This will handle the walks_walk_related_categories table relationships
            if fixture_file.endswith('tag_relations.json'):
                print("\nProcessing category relationships from tag_relations.json...")
                for item in data:
                    model_name = item.get('model', '')
                    if model_name == 'walks.walk_related_categories':
                        fields = item.get('fields', {})
                        walk_id = fields.get('walk_id')
                        category_id = fields.get('walkcategorytag_id')
                        
                        if walk_id and category_id:
                            try:
                                Walk = apps.get_model('walks', 'Walk')
                                WalkCategoryTag = apps.get_model('walks', 'WalkCategoryTag')
                                
                                # Check if the walk exists now (should include placeholders)
                                walk = Walk.objects.filter(id=walk_id).first()
                                category = WalkCategoryTag.objects.filter(id=category_id).first()
                                
                                if walk and category:
                                    # Add to related_categories field directly
                                    walk.related_categories.add(category)
                                    print(f"Added category {category.name} to walk related_categories: {walk.walk_name}")
                                    
                                    # Also add to the categories field for direct access
                                    walk.categories.add(category)
                                    print(f"Added category {category.name} to walk categories: {walk.walk_name}")
                                else:
                                    if not walk:
                                        print(f"Still cannot find walk with ID {walk_id}")
                                    if not category:
                                        print(f"Cannot find category with ID {category_id}")
                            except Exception as e:
                                print(f"Error processing walk_related_categories {walk_id}, {category_id}: {str(e)}")

        return True
    except Exception as e:
        print(f"Error loading fixture {fixture_file}: {str(e)}")
        return False

def main():
    """
    Main entry point for the script.
    """
    try:
        # List of fixtures to load
        fixtures = [
            'walkquest/walks/fixtures/initial_tags.json',
            'walkquest/walks/fixtures/initial_walks_updated.json',
            'walkquest/walks/fixtures/tag_relations.json'
        ]
        
        # Load fixtures in order
        for fixture in fixtures:
            fixture_path = os.path.join(settings.BASE_DIR, fixture)
            if not os.path.exists(fixture_path):
                print(f"Warning: Fixture file {fixture_path} does not exist")
                continue
                
            print(f"\nLoading fixture: {fixture_path}")
            load_fixture(fixture_path)
            
        print("\nFixtures loaded successfully")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()