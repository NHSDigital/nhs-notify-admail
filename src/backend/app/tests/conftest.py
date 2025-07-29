import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def mock_cognito_jwks():
    """
    Globally mocks the network call to fetch Cognito JWKS during tests.
    This prevents real network requests and allows the authenticator to initialize.
    """
    mock_response = MagicMock()
    # A fake key structure that matches what the CognitoAuthenticator expects
    mock_response.json.return_value = {
        "keys": [
            {
                "kid": "test_kid",
                "kty": "RSA",
                "use": "sig",
                "n": "test_n_value",
                "e": "test_e_value",
            }
        ]
    }
    mock_response.raise_for_status.return_value = None

    with patch("app.core.auth.requests.get", return_value=mock_response) as mock_get:
        yield mock_get


@pytest.fixture
def mock_auth():
    """Mock the Cognito authenticator."""
    with patch("app.core.auth.CognitoAuthenticator.validate_token") as mock_validate:
        mock_validate.return_value = {"username": "testuser"}
        yield
