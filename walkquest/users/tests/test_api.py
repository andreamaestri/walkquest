import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import Client
from walkquest.users.models import User

@pytest.mark.django_db
class TestUserAPI:
    def setup_method(self):
        self.client = APIClient()
        self.test_user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.test_user)

    def test_get_user_authenticated(self):
        response = self.client.get("/api/user")
        assert response.status_code == 200
        assert response.json()["email"] == "test@example.com"
        assert response.json()["username"] == "testuser"

    def test_get_user_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/user")
        assert response.status_code == 401

    def test_get_preferences_authenticated(self):
        response = self.client.get("/api/preferences")
        assert response.status_code == 200
        assert "theme" in response.json()
        assert "language" in response.json()

    def test_update_preferences_authenticated(self):
        data = {"theme": "dark", "language": "fr"}
        response = self.client.patch("/api/preferences", data, format="json")
        assert response.status_code == 200
        assert response.json()["theme"] == "dark"
        assert response.json()["language"] == "fr"

        # Verify persistence
        user = User.objects.get(id=self.test_user.id)
        assert user.preferences["theme"] == "dark"
        assert user.preferences["language"] == "fr"

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
            "name": "New User"
        }
        response = self.client.post(self.signup_url, data)
        assert response.status_code == 302  # Redirect after successful signup
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_login_flow(self):
        # Create a user first
        User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!"
        )

        # Test login
        response = self.client.post(self.login_url, {
            "login": "test@example.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 302  # Redirect after successful login

    def test_logout_flow(self):
        # Create and login user
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!"
        )
        self.client.force_login(user)

        # Test logout
        response = self.client.post(self.logout_url)
        assert response.status_code == 302  # Redirect after logout