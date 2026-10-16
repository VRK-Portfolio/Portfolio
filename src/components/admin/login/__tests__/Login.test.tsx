import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginComponent from "../Login"; // Update import path as needed

// Mock next/navigation router
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("LoginComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should render the login component with fields and submit button", () => {
    const container = render(<LoginComponent />);
    expect(container.container).toBeInTheDocument();
  });

  it("should show validation errors when submitting empty form", async () => {
    const {container } = render(<LoginComponent />);

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submitButton);

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });

  it("should navigate to /admin/dashboard on successful login", async () => {
    // Mock successful API response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const {container } =render(<LoginComponent />);

    fireEvent.input(container.querySelector('input[name="email"]') as HTMLInputElement, {
      target: { value: "test@example.com" },
    });
    fireEvent.input(container.querySelector('input[name="password"]') as HTMLInputElement, {
      target: { value: "password123" },
    });

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  it("should display error message when login API fails", async () => {
    // Mock failed API response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    } as Response);

    const {container } = render(<LoginComponent />);

    fireEvent.input(container.querySelector('input[name="email"]') as HTMLInputElement, {
      target: { value: "wrong@example.com" },
    });
    fireEvent.input(container.querySelector('input[name="password"]') as HTMLInputElement, {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});