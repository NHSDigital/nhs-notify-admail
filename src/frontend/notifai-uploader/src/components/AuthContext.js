import { createContext, useContext, useState, useEffect } from "react";
import Login from "./Login.js";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const AuthContext = createContext();
const cognitoClient = new CognitoIdentityProviderClient({
  region: "eu-west-2",
});
const CLIENT_ID =
  window.env?.REACT_APP_COGNITO_ID || process.env.REACT_APP_COGNITO_ID;
const USER_POOL_ID =
  window.env?.REACT_APP_COGNITO_USER_POOL_ID ||
  process.env.REACT_APP_COGNITO_USER_POOL_ID;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      const idToken = sessionStorage.getItem("idToken");
      const accessToken = sessionStorage.getItem("accessToken");
      const userEmail = sessionStorage.getItem("userEmail");
      const refreshToken = sessionStorage.getItem("refreshToken");

      if (idToken && accessToken && userEmail) {
        setUser({
          email: userEmail,
          idToken: idToken,
          accessToken: accessToken,
          refreshToken: refreshToken,
        });
      }
    } catch (error) {
      console.error("Failed to initialize auth from session storage", error);
      setUser(null);
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const refreshSession = async () => {
    try {
      const refreshToken = sessionStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");

      const command = new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await cognitoClient.send(command);
      const newIdToken = response.AuthenticationResult.IdToken;
      const newAccessToken = response.AuthenticationResult.AccessToken;

      // Update session storage with new tokens
      sessionStorage.setItem("idToken", newIdToken);
      sessionStorage.setItem("accessToken", newAccessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
      setUser((prev) => ({
        ...prev,
        idToken: newIdToken,
        accessToken: newAccessToken,
        refreshToken: refreshToken,
      }));
      setError(null);
      return newAccessToken;
    } catch (err) {
      setError(err.message || "Failed to refresh token");
      setUser(null);
      sessionStorage.removeItem("idToken");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("userEmail");
      throw err;
    }
  };

  const login = async (username, password) => {
    let loginResponse = null;
    try {
      setError(null);
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });
      loginResponse = await cognitoClient.send(command);
      if (loginResponse.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        const challengeInput = {
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ClientId: CLIENT_ID,
          UserPoolId: USER_POOL_ID,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: password,
          },
          Session: loginResponse.Session,
        };
        const challengeConfirm = new RespondToAuthChallengeCommand(
          challengeInput
        );
        const challengeConfirmResponse = await cognitoClient.send(
          challengeConfirm
        );
        loginResponse = challengeConfirmResponse;
      }
      const { AccessToken, IdToken, RefreshToken } =
        loginResponse.AuthenticationResult;
      sessionStorage.setItem("accessToken", AccessToken);
      sessionStorage.setItem("refreshToken", RefreshToken);
      sessionStorage.setItem("idToken", IdToken);
      sessionStorage.setItem("userEmail", username);
      setUser({
        email: username,
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
      });
      return true;
    } catch (err) {
      setError(err.message || "Failed to sign in");
      return false;
    }
  };

  const logout = async () => {
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      if (accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken,
        });
        const response = await cognitoClient.send(command);
      }
      sessionStorage.removeItem("idToken");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      setUser(null);
      setError(null);
      return <Login />;
    } catch (err) {
      setError(err.message || "Failed to sign out");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, error, isAuthReady, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { user } = useAuth();

    if (!user) {
      return <Login />;
    }

    return <Component {...props} user={user} />;
  };
}
