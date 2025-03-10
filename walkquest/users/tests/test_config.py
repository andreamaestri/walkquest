"""Test configuration settings."""
import os
from typing import Final

# Test user credentials - can be overridden by environment variables
TEST_USER_PASSWORD: Final = os.environ.get("TEST_USER_PASSWORD", "SecureTestPass123!")
TEST_USER_EMAIL: Final = os.environ.get("TEST_USER_EMAIL", "test@example.com")
TEST_USER_USERNAME: Final = os.environ.get("TEST_USER_USERNAME", "testuser")

# Default test password that meets Django's requirements
TEST_NEW_USER_PASSWORD: Final = os.environ.get(
    "TEST_NEW_USER_PASSWORD", "SecureNewPass123!",
)
