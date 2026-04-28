import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  RespondToAuthChallengeCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
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
  const [mfaPending, setMfaPending] = useState(null);

  useEffect(() => {
    try {
      const idToken = sessionStorage.getItem("idToken");
      const accessToken = sessionStorage.getItem("accessToken");
      const userEmail = sessionStorage.getItem("userEmail");
      const refreshToken = sessionStorage.getItem("refreshToken");

      if (idToken && accessToken && userEmail) {
        setUser({
          email: userEmail,
          idToken,
          accessToken,
          refreshToken,
        });
      }
    } catch (initError) {
      console.error(
        "Failed to initialize auth from session storage",
        initError,
      );
      setUser(null);
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const refreshSession = useCallback(async () => {
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
        refreshToken,
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
  }, []);

  const completeLogin = useCallback((username, authResult) => {
    const { AccessToken, IdToken, RefreshToken } = authResult;
    sessionStorage.setItem("accessToken", AccessToken);
    sessionStorage.setItem("refreshToken", RefreshToken);
    sessionStorage.setItem("idToken", IdToken);
    sessionStorage.setItem("userEmail", username); // NOSONAR jssecurity:S8475 - email extracted from verified Cognito
    setUser({
      email: username,
      idToken: IdToken,
      accessToken: AccessToken,
      refreshToken: RefreshToken,
    });
    setMfaPending(null);
  }, []);

  const login = useCallback(
    async (username, password) => {
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
        let loginResponse = await cognitoClient.send(command);

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
            challengeInput,
          );
          loginResponse = await cognitoClient.send(challengeConfirm);
        }

        // When MFA is enabled Cognito does not return AuthenticationResult on the
        // initial auth response – it returns a challenge that must be completed first.
        if (loginResponse.ChallengeName === "SOFTWARE_TOKEN_MFA") {
          setMfaPending({
            type: "SOFTWARE_TOKEN_MFA",
            session: loginResponse.Session,
            username,
          });
          return false;
        }

        if (loginResponse.ChallengeName === "MFA_SETUP") {
          // Fetch the TOTP secret so the user can enrol their authenticator app
          const assocResponse = await cognitoClient.send(
            new AssociateSoftwareTokenCommand({
              Session: loginResponse.Session,
            }),
          );
          setMfaPending({
            type: "MFA_SETUP",
            session: assocResponse.Session,
            username,
            secretCode: assocResponse.SecretCode,
          });
          return false;
        }

        completeLogin(username, loginResponse.AuthenticationResult);
        return true;
      } catch (err) {
        setError(err.message || "Failed to sign in");
        return false;
      }
    },
    [completeLogin],
  );

  const respondToMfaChallenge = useCallback(
    async (totpCode) => {
      if (!mfaPending) return false;
      try {
        setError(null);
        let authResult;

        if (mfaPending.type === "SOFTWARE_TOKEN_MFA") {
          const response = await cognitoClient.send(
            new RespondToAuthChallengeCommand({
              ChallengeName: "SOFTWARE_TOKEN_MFA",
              ClientId: CLIENT_ID,
              ChallengeResponses: {
                USERNAME: mfaPending.username,
                SOFTWARE_TOKEN_MFA_CODE: totpCode,
              },
              Session: mfaPending.session,
            }),
          );
          authResult = response.AuthenticationResult;
        } else if (mfaPending.type === "MFA_SETUP") {
          // Verify the TOTP code to complete MFA enrolment
          const verifyResponse = await cognitoClient.send(
            new VerifySoftwareTokenCommand({
              Session: mfaPending.session,
              UserCode: totpCode,
              FriendlyDeviceName: "Authenticator App",
            }),
          );
          // Respond to the MFA_SETUP challenge to finalise authentication
          const respondResponse = await cognitoClient.send(
            new RespondToAuthChallengeCommand({
              ChallengeName: "MFA_SETUP",
              ClientId: CLIENT_ID,
              ChallengeResponses: {
                USERNAME: mfaPending.username,
              },
              Session: verifyResponse.Session,
            }),
          );
          authResult = respondResponse.AuthenticationResult;
        }

        if (!authResult) {
          throw new Error("Authentication failed - no result returned");
        }

        completeLogin(mfaPending.username, authResult);
        return true;
      } catch (err) {
        setError(err.message || "MFA verification failed");
        return false;
      }
    },
    [mfaPending, completeLogin],
  );

  const logout = async () => {
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      if (accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken,
        });
        await cognitoClient.send(command);
      }
      sessionStorage.removeItem("idToken");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      setUser(null);
      setMfaPending(null);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to sign out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        error,
        isAuthReady,
        refreshSession,
        mfaPending,
        respondToMfaChallenge,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
