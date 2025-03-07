"""
This module is deprecated. Use schemas.py instead for Django Ninja schemas.

This file is kept for backward compatibility but should not be used in new code.
"""

# Import warning module to log deprecation warnings
import warnings

warnings.warn(
    "The serializers.py module is deprecated. Use schemas.py instead for Django Ninja schemas.",
    DeprecationWarning,
    stacklevel=2,
)
