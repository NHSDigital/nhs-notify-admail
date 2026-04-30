import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../../components/Login.js";
import { useAuth } from "../../components/AuthContext.js";

jest.mock("../../components/AuthContext.js", () => ({
  useAuth: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Shared mock functions — recreated before each test
// ---------------------------------------------------------------------------
let mockLogin;
let mockRespondToMfaChallenge;

beforeEach(() => {
  mockLogin = jest.fn().mockResolvedValue(false);
  mockRespondToMfaChallenge = jest.fn().mockResolvedValue(false);

  // Default context state: no MFA in progress, no error
  useAuth.mockReturnValue({
    error: null,
    login: mockLogin,
    mfaPending: null,
    respondToMfaChallenge: mockRespondToMfaChallenge,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Login — default username/password form", () => {
  test("renders the Notify Admail Login heading with username and password fields", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", { name: /Notify Admail Login/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  test("does not render the MFA or setup forms when mfaPending is null", () => {
    render(<Login />);

    expect(
      screen.queryByRole("heading", { name: /Two-factor authentication/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /Set up two-factor authentication/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("Login — SOFTWARE_TOKEN_MFA challenge form", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      error: null,
      login: mockLogin,
      mfaPending: {
        type: "SOFTWARE_TOKEN_MFA",
        session: "mfa-session-123",
        username: "user@example.com",
      },
      respondToMfaChallenge: mockRespondToMfaChallenge,
    });
  });

  test("renders the Two-factor authentication heading with an authentication code input", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", { name: /Two-factor authentication/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Authentication code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify/i })).toBeInTheDocument();
  });

  test("does not render the standard login or MFA-setup forms", () => {
    render(<Login />);

    expect(
      screen.queryByRole("heading", { name: /Notify Admail Login/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /Set up two-factor authentication/i,
      }),
    ).not.toBeInTheDocument();
  });

  test("typing a code and submitting calls respondToMfaChallenge with that code", async () => {
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/Authentication code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(mockRespondToMfaChallenge).toHaveBeenCalledWith("123456");
    });
  });

  test("strips non-digit characters from the entered code before submitting", async () => {
    render(<Login />);

    // The input's onChange strips non-digits via .replace(/\D/g, "")
    fireEvent.change(screen.getByLabelText(/Authentication code/i), {
      target: { value: "12ab56" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(mockRespondToMfaChallenge).toHaveBeenCalledWith("1256");
    });
  });
});

describe("Login — MFA_SETUP form", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      error: null,
      login: mockLogin,
      mfaPending: {
        type: "MFA_SETUP",
        session: "assoc-session-xyz",
        username: "user@example.com",
        secretCode: "MYSECRETCODE",
      },
      respondToMfaChallenge: mockRespondToMfaChallenge,
    });
  });

  test("renders the Set up two-factor authentication heading", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", {
        name: /Set up two-factor authentication/i,
      }),
    ).toBeInTheDocument();
  });

  test("displays the secretCode so the user can enrol their authenticator app", () => {
    render(<Login />);

    expect(screen.getByText("MYSECRETCODE")).toBeInTheDocument();
  });

  test("has a code input and Verify and sign in button", () => {
    render(<Login />);

    expect(
      screen.getByLabelText(/Enter the 6-digit code from your authenticator/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Verify and sign in/i }),
    ).toBeInTheDocument();
  });

  test("does not render the standard login or SOFTWARE_TOKEN_MFA forms", () => {
    render(<Login />);

    expect(
      screen.queryByRole("heading", { name: /Notify Admail Login/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Two-factor authentication$/i }),
    ).not.toBeInTheDocument();
  });

  test("submitting the setup form calls respondToMfaChallenge with the entered code", async () => {
    render(<Login />);

    fireEvent.change(
      screen.getByLabelText(/Enter the 6-digit code from your authenticator/i),
      { target: { value: "654321" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Verify and sign in/i }),
    );

    await waitFor(() => {
      expect(mockRespondToMfaChallenge).toHaveBeenCalledWith("654321");
    });
  });
});

describe("Login — error display", () => {
  test("renders the error message from context on the default login form", () => {
    useAuth.mockReturnValue({
      error: "Incorrect username or password.",
      login: mockLogin,
      mfaPending: null,
      respondToMfaChallenge: mockRespondToMfaChallenge,
    });

    render(<Login />);

    expect(
      screen.getByText("Incorrect username or password."),
    ).toBeInTheDocument();
  });

  test("renders the error message on the SOFTWARE_TOKEN_MFA form", () => {
    useAuth.mockReturnValue({
      error: "Invalid MFA code.",
      login: mockLogin,
      mfaPending: {
        type: "SOFTWARE_TOKEN_MFA",
        session: "sess",
        username: "user@example.com",
      },
      respondToMfaChallenge: mockRespondToMfaChallenge,
    });

    render(<Login />);

    expect(screen.getByText("Invalid MFA code.")).toBeInTheDocument();
  });

  test("renders the error message on the MFA_SETUP form", () => {
    useAuth.mockReturnValue({
      error: "Token verification failed.",
      login: mockLogin,
      mfaPending: {
        type: "MFA_SETUP",
        session: "sess",
        username: "user@example.com",
        secretCode: "SECRET",
      },
      respondToMfaChallenge: mockRespondToMfaChallenge,
    });

    render(<Login />);

    expect(screen.getByText("Token verification failed.")).toBeInTheDocument();
  });
});
