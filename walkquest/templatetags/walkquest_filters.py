from django import template

register = template.Library()

@register.filter(name='slugify_title')
def slugify_title(value):
    """Convert a slug to a title by replacing underscores with spaces and capitalizing words"""
    if value:
        return value.replace('_', ' ').title()
    return value