"""API test suite for user functionality."""
import pytest
from django.test import Client
from django.urls import reverse
from rest_framework.test import APIClient

from walkquest.users.models import User
from .test_config import (
    TEST_USER_PASSWORD,
    TEST_USER_EMAIL,
    TEST_USER_USERNAME,
    TEST_NEW_USER_PASSWORD,
)


@pytest.mark.django_db
class TestUserAPI:
    """Test user API endpoints."""

    def setup_method(self):
        """Set up test client and create test user."""
        self.client = APIClient()
        self.test_user = User.objects.create_user(
            username=TEST_USER_USERNAME,
            email=TEST_USER_EMAIL,
            password=TEST_USER_PASSWORD,
        )
        self.client.force_authenticate(user=self.test_user)

    def test_get_user_authenticated(self):
        """Test authenticated user can get their profile."""
        response = self.client.get(reverse("user_api"))
        assert response.status_code == 200
        assert response.json()["email"] == TEST_USER_EMAIL
        assert response.json()["username"] == TEST_USER_USERNAME

    def test_get_user_unauthenticated(self):
        """Test unauthenticated access is rejected."""
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("user_api"))
        assert response.status_code == 401

    def test_get_preferences_authenticated(self):
        """Test authenticated user can get their preferences."""
        response = self.client.get(reverse("user-preferences"))
        assert response.status_code == 200
        assert "theme" in response.json()
        assert "language" in response.json()

    def test_update_preferences_authenticated(self):
        """Test authenticated user can update their preferences."""
        data = {"theme": "dark", "language": "fr"}
        response = self.client.patch(
            reverse("user-preferences"),
            data,
            format="json"
        )
        assert response.status_code == 200
        assert response.json()["theme"] == "dark"
        assert response.json()["language"] == "fr"

        # Verify persistence
        user = User.objects.get(id=self.test_user.id)
        assert user.preferences["theme"] == "dark"
        assert user.preferences["language"] == "fr"


@pytest.mark.django_db
class TestAuthentication:
    """Test authentication flows."""

    def setup_method(self):
        """Set up test client and URLs."""
        self.client = Client()
        self.signup_url = reverse("account_signup")
        self.login_url = reverse("account_login")
        self.logout_url = reverse("account_logout")

    def test_signup_flow(self):
        """Test user signup flow."""
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password1": TEST_NEW_USER_PASSWORD,
            "password2": TEST_NEW_USER_PASSWORD,
            "name": "New User",
        }
        response = self.client.post(self.signup_url, data)
        assert response.status_code == 302  # Redirect after successful signup
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_login_flow(self):
        """Test user login flow."""
        # Create a user first
        User.objects.create_user(
            username=TEST_USER_USERNAME,
            email=TEST_USER_EMAIL,
            password=TEST_USER_PASSWORD,
        )

        # Test login
        response = self.client.post(
            self.login_url,
            {
                "login": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
            }
        )
        assert response.status_code == 302  # Redirect after successful login

    def test_logout_flow(self):
        """Test user logout flow."""
        # Create and login user
        user = User.objects.create_user(
            username=TEST_USER_USERNAME,
            email=TEST_USER_EMAIL,
            password=TEST_USER_PASSWORD,
        )
        self.client.force_login(user)

        # Test logout
        response = self.client.post(self.logout_url)
        assert response.status_code == 302  # Redirect after logout
