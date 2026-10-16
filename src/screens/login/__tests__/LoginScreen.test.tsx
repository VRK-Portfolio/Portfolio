import { describe, expect, test, vi } from "vitest";
import LoginScreen from "../LoginScreen";
import { render } from "@testing-library/react";

vi.mock('next/navigation');


describe("LoginScreen", () => {
    const renderLoginScreen = () => {
        const {container} = render(<LoginScreen />);
        return container;
    }
   test("should render login screen", () => {
       // Test implementation goes here
       const container = renderLoginScreen();
       expect(container.querySelector(".cmp-login-page")).toBeInTheDocument();
       expect(container).toBeTruthy();
   });
});