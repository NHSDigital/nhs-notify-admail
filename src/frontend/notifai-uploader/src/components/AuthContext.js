import { createContext, useContext, useState, useEffect } from "react";
import Login from "./Login";
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
const CLIENT_ID = process.env.REACT_APP_COGNITO_ID;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const idToken = sessionStorage.getItem("idToken");
    const userEmail = sessionStorage.getItem("userEmail");
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (idToken && userEmail) {
      setUser({ email: userEmail, idToken, refreshToken });
    }
    setLoading(false);
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
      setUser((prev) => ({
        ...prev,
        idToken: newIdToken,
        accessToken: newAccessToken,
      }));
      setError(null);
      return newIdToken;
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
      const response = await cognitoClient.send(command);
      let idToken;
      if (response.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        const challengeInput = {
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ClientId: CLIENT_ID,
          UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: password,
          },
          Session: response.Session
        };
        const challengeConfirm = new RespondToAuthChallengeCommand(challengeInput);
        const challengeConfirmResponse = await cognitoClient.send(
          challengeConfirm
        );
        console.log(challengeConfirmResponse);
        const { AccessToken, IdToken, RefreshToken } = challengeConfirmResponse.AuthenticationResult;
        sessionStorage.setItem("idToken", IdToken);
        sessionStorage.setItem("accessToken", AccessToken);
        sessionStorage.setItem("refreshToken", RefreshToken);
        idToken = IdToken;
      } else {
        const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;
        sessionStorage.setItem("accessToken", AccessToken);
        sessionStorage.setItem("refreshToken", RefreshToken);
        sessionStorage.setItem("idToken", IdToken);
        idToken = IdToken;
      }
      sessionStorage.setItem("userEmail", username);
      setUser({ email: username, idToken });
      return true; // Indicate successful login
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
        console.log(response);
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
      value={{ user, login, logout, error, loading, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
