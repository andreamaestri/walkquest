from django import template

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """
    Template filter to get an item from a dictionary using a key.
    Returns empty string if key not found.
    """
    return dictionary.get(key, '')

@register.simple_tag
def get_feature_icon(feature_icons, feature):
    """Get icon for a specific feature"""
    return feature_icons.get(feature, '')
