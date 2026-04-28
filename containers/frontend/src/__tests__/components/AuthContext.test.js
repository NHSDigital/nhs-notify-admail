import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../components/AuthContext.js";
import {
  AssociateSoftwareTokenCommand,
  RespondToAuthChallengeCommand,
  VerifySoftwareTokenCommand,
  // __mockSend is a synthetic export added by our factory below so that the
  // test file can control cognitoClient.send without any TDZ issues.
  __mockSend as mockSend,
} from "@aws-sdk/client-cognito-identity-provider";

// AuthContext.js creates `cognitoClient = new CognitoIdentityProviderClient()`
// at module level — before any variable declared in this test file is initialised.
// Defining the send mock INSIDE the factory and re-exporting it as `__mockSend`
// avoids the temporal dead zone that would occur if we tried to close over an
// outer `const`/`let` variable.
jest.mock("@aws-sdk/client-cognito-identity-provider", () => {
  const send = jest.fn();
  return {
    __esModule: true,
    // Synthetic export so this file can import the reference directly.
    __mockSend: send,
    AssociateSoftwareTokenCommand: jest.fn(),
    CognitoIdentityProviderClient: jest.fn(() => ({ send })),
    GlobalSignOutCommand: jest.fn(),
    InitiateAuthCommand: jest.fn(),
    RespondToAuthChallengeCommand: jest.fn(),
    VerifySoftwareTokenCommand: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helper component that exercises the full AuthContext API surface
// ---------------------------------------------------------------------------
function TestComponent() {
  const { error, login, mfaPending, respondToMfaChallenge, user } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.email : "none"}</div>
      <div data-testid="error">{error || ""}</div>
      <div data-testid="mfa-type">{mfaPending?.type || ""}</div>
      <div data-testid="mfa-secret">{mfaPending?.secretCode || ""}</div>
      <button onClick={() => login("user@example.com", "pass")}>login</button>
      {/* Two respond buttons so each test can supply the exact TOTP code */}
      <button onClick={() => respondToMfaChallenge("123456")}>
        respond-mfa
      </button>
      <button onClick={() => respondToMfaChallenge("654321")}>
        respond-mfa-setup
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  );
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------
beforeEach(() => {
  sessionStorage.clear();
  // resetAllMocks clears call history AND the mockResolvedValueOnce queue on
  // every jest.fn() (including mockSend), giving each test a clean slate.
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("AuthProvider — login()", () => {
  test("direct success: stores tokens in sessionStorage, sets user, mfaPending stays null", async () => {
    mockSend.mockResolvedValueOnce({
      AuthenticationResult: {
        AccessToken: "access-token",
        IdToken: "id-token",
        RefreshToken: "refresh-token",
      },
    });

    renderWithProvider();

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user@example.com");
    });

    expect(screen.getByTestId("mfa-type")).toHaveTextContent("");
    expect(screen.getByTestId("error")).toHaveTextContent("");

    expect(sessionStorage.getItem("accessToken")).toBe("access-token");
    expect(sessionStorage.getItem("idToken")).toBe("id-token");
    expect(sessionStorage.getItem("refreshToken")).toBe("refresh-token");
    expect(sessionStorage.getItem("userEmail")).toBe("user@example.com");
  });

  test("SOFTWARE_TOKEN_MFA challenge: sets mfaPending with type and session, user stays logged out", async () => {
    mockSend.mockResolvedValueOnce({
      ChallengeName: "SOFTWARE_TOKEN_MFA",
      Session: "mfa-session-123",
    });

    renderWithProvider();

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("mfa-type")).toHaveTextContent(
        "SOFTWARE_TOKEN_MFA",
      );
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("mfa-secret")).toHaveTextContent("");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  test("MFA_SETUP challenge: calls AssociateSoftwareTokenCommand and sets mfaPending with secretCode", async () => {
    mockSend
      // InitiateAuthCommand → MFA_SETUP challenge
      .mockResolvedValueOnce({
        ChallengeName: "MFA_SETUP",
        Session: "setup-session-abc",
      })
      // AssociateSoftwareTokenCommand → TOTP secret + new session
      .mockResolvedValueOnce({
        SecretCode: "TESTSECRET",
        Session: "assoc-session-xyz",
      });

    renderWithProvider();

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("mfa-type")).toHaveTextContent("MFA_SETUP");
    });

    expect(screen.getByTestId("mfa-secret")).toHaveTextContent("TESTSECRET");
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    // AssociateSoftwareTokenCommand must receive the session from the initial
    // MFA_SETUP challenge response.
    expect(AssociateSoftwareTokenCommand).toHaveBeenCalledWith({
      Session: "setup-session-abc",
    });
  });
});

describe("AuthProvider — respondToMfaChallenge()", () => {
  test("SOFTWARE_TOKEN_MFA: sends RespondToAuthChallengeCommand with the TOTP code and completes login", async () => {
    mockSend
      // InitiateAuthCommand → SOFTWARE_TOKEN_MFA challenge
      .mockResolvedValueOnce({
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        Session: "mfa-session-123",
      })
      // RespondToAuthChallengeCommand → success
      .mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: "access-token",
          IdToken: "id-token",
          RefreshToken: "refresh-token",
        },
      });

    renderWithProvider();

    // Trigger the SOFTWARE_TOKEN_MFA challenge
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => {
      expect(screen.getByTestId("mfa-type")).toHaveTextContent(
        "SOFTWARE_TOKEN_MFA",
      );
    });

    // Submit the TOTP code
    fireEvent.click(screen.getByText("respond-mfa"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user@example.com");
    });

    expect(screen.getByTestId("mfa-type")).toHaveTextContent("");

    expect(RespondToAuthChallengeCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        ChallengeResponses: expect.objectContaining({
          USERNAME: "user@example.com",
          SOFTWARE_TOKEN_MFA_CODE: "123456",
        }),
        Session: "mfa-session-123",
      }),
    );
  });

  test("MFA_SETUP: calls VerifySoftwareTokenCommand then RespondToAuthChallengeCommand and completes login", async () => {
    mockSend
      // InitiateAuthCommand → MFA_SETUP challenge
      .mockResolvedValueOnce({
        ChallengeName: "MFA_SETUP",
        Session: "setup-session-abc",
      })
      // AssociateSoftwareTokenCommand → TOTP secret + new session
      .mockResolvedValueOnce({
        SecretCode: "TESTSECRET",
        Session: "assoc-session-xyz",
      })
      // VerifySoftwareTokenCommand → session for the final respond call
      .mockResolvedValueOnce({
        Session: "verify-session-xyz",
      })
      // RespondToAuthChallengeCommand (MFA_SETUP) → success
      .mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: "access-token",
          IdToken: "id-token",
          RefreshToken: "refresh-token",
        },
      });

    renderWithProvider();

    // Trigger the MFA_SETUP challenge
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => {
      expect(screen.getByTestId("mfa-type")).toHaveTextContent("MFA_SETUP");
    });

    // Submit the TOTP code ("654321" distinguishes this case from the SOFTWARE_TOKEN_MFA test)
    fireEvent.click(screen.getByText("respond-mfa-setup"));
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user@example.com");
    });

    expect(screen.getByTestId("mfa-type")).toHaveTextContent("");

    // VerifySoftwareTokenCommand must receive the TOTP code and the session
    // returned by AssociateSoftwareTokenCommand.
    expect(VerifySoftwareTokenCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        UserCode: "654321",
        Session: "assoc-session-xyz",
      }),
    );

    // RespondToAuthChallengeCommand must use the session returned by VerifySoftwareToken.
    expect(RespondToAuthChallengeCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ChallengeName: "MFA_SETUP",
        ChallengeResponses: expect.objectContaining({
          USERNAME: "user@example.com",
        }),
        Session: "verify-session-xyz",
      }),
    );
  });
});

describe("AuthProvider — error handling", () => {
  test("when send() throws during login, sets error state and keeps user logged out", async () => {
    mockSend.mockRejectedValueOnce(new Error("Invalid credentials"));

    renderWithProvider();

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Invalid credentials",
      );
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("mfa-type")).toHaveTextContent("");
  });

  test("when send() throws during respondToMfaChallenge, sets error state", async () => {
    mockSend
      // InitiateAuthCommand → SOFTWARE_TOKEN_MFA challenge
      .mockResolvedValueOnce({
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        Session: "mfa-session-123",
      })
      // RespondToAuthChallengeCommand → throws
      .mockRejectedValueOnce(new Error("Invalid MFA code"));

    renderWithProvider();

    fireEvent.click(screen.getByText("login"));
    await waitFor(() => {
      expect(screen.getByTestId("mfa-type")).toHaveTextContent(
        "SOFTWARE_TOKEN_MFA",
      );
    });

    fireEvent.click(screen.getByText("respond-mfa"));
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid MFA code");
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});
