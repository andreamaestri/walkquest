import pytest
from django.test import Client

from walkquest.users.models import User


@pytest.mark.django_db
class TestUserAPI:
    """/api/user and /api/preferences require an allauth X-Session-Token."""

    def setup_method(self):
        self.client = Client()

    @pytest.mark.parametrize("path", ["/api/user", "/api/preferences"])
    def test_requires_session_token(self, path):
        assert self.client.get(path).status_code == 401

    def test_update_preferences_requires_session_token(self):
        response = self.client.patch(
            "/api/preferences",
            {"dark_mode": True},
            content_type="application/json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestAuthentication:
    def setup_method(self):
        self.client = Client()
        self.signup_url = "/accounts/signup/"
        self.login_url = "/accounts/login/"
        self.logout_url = "/accounts/logout/"

    def test_signup_flow(self):
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password1": "TestPass123!",
            "password2": "TestPass123!",
            "name": "New User",
        }
        response = self.client.post(self.signup_url, data)
        assert response.status_code == 302  # Redirect after successful signup
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_login_flow(self):
        # Create a user first
        User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!",
        )

        # Test login
        response = self.client.post(
            self.login_url,
            {
                "login": "test@example.com",
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 302  # Redirect after successful login

    def test_logout_flow(self):
        # Create and login user
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!",
        )
        self.client.force_login(user)

        # Test logout
        response = self.client.post(self.logout_url)
        assert response.status_code == 302  # Redirect after logout
