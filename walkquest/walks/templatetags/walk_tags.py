from django import template
import re
import json

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """
    Template filter to get an item from a dictionary using a key.
    Returns empty string if key not found or dictionary is None.
    """
    if dictionary is None:
        return ''
    return dictionary.get(key, '')

@register.filter
def replace(value, arg):
    """
    Replace all instances of arg in value with spaces
    """
    return value.replace(arg, ' ') if value else ''

@register.filter
def title_with_spaces(value):
    """
    Convert string to title case and replace underscores with spaces
    """
    if not value:
        return ''
    return value.replace('_', ' ').title()

@register.filter
def default_if_none(value, default=''):
    """Return default value if value is None"""
    return value if value is not None else default

@register.simple_tag
def get_feature_icon(feature_icons, feature):
    """Get icon for a specific feature"""
    return feature_icons.get(feature, '') if feature_icons else ''

@register.filter
def default_list(value, default=None):
    """
    Return default list if value is None or empty
    """
    if value is None or value == '':
        return default or []
    return value

@register.filter(is_safe=True)
def as_json(value):
    """
    Safely convert value to JSON string
    """
    if value is None:
        return '[]'
    return json.dumps(value)
