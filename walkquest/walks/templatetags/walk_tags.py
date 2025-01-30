from django import template
from django.utils.safestring import mark_safe
import json
import re

register = template.Library()

def fix_svg_viewbox(text):
    """Fix incomplete SVG viewBox attributes"""
    if not isinstance(text, str):
        return text
    
    # Find viewBox attributes
    viewbox_pattern = r'viewBox="([^"]*)"'
    def replace_viewbox(match):
        numbers = match.group(1).split()
        if len(numbers) != 4:
            return 'viewBox="0 0 24 24"'
        return match.group(0)
    
    return re.sub(viewbox_pattern, replace_viewbox, text)

class SVGSafeJSONEncoder(json.JSONEncoder):
    def encode(self, obj):
        if isinstance(obj, str):
            obj = fix_svg_viewbox(obj)
        return super().encode(obj)

@register.filter(name='svg_safe_json')
def svg_safe_json(value):
    """Convert a value to SVG-safe JSON string"""
    try:
        # First fix any SVG viewBox issues
        if isinstance(value, dict):
            value = {k: fix_svg_viewbox(v) if isinstance(v, str) else v 
                    for k, v in value.items()}
        
        # Then encode to JSON
        return mark_safe(json.dumps(value, cls=SVGSafeJSONEncoder))
    except Exception as e:
        print(f"Error encoding JSON: {e}")
        return '{}'

@register.filter(name='as_json')
def as_json(value):
    """Convert a value to JSON string"""
    try:
        return json.dumps(value)
    except Exception as e:
        print(f"Error encoding JSON: {e}")
        return '{}'
