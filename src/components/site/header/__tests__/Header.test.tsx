import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import Header from "../Header";
import './../Header.css';
import userEvent, { UserEvent } from "@testing-library/user-event";

describe("Header component", () => {
    let user: UserEvent;

     beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        user = userEvent.setup();
    });
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });
    const renderHeader = () => {
        const { container } = render(<Header />);
        return { container };
    }
   test("should render the header component", () => {
       const { container } = renderHeader();
       expect(container).toBeInTheDocument();
   });

   test("should load the classname when passed as a prop", () => {
       const { container } = render(<Header className="custom-class" />);
       const header = container.querySelector(".cmp-header");
       expect(header).toHaveClass("custom-class");
   });
   test("should have a logo", () => {
       const { container } = renderHeader();
       const logo = container.querySelector(".cmp-header__logo");
       expect(logo).toBeInTheDocument();
   });

   test("should have a nav", () => {
       const { container } = renderHeader();
       const nav = container.querySelector(".cmp-header__menu");
       expect(nav).toBeInTheDocument();
   });

   test("should have a button to toggle the light and dark theme", () => {
       const { container } = renderHeader();
       const toggleButton = container.querySelector(".cmp-header__theme");
       expect(toggleButton).toBeInTheDocument();
   });

   test("should have a hamburger menu button", () => {
       const { container } = renderHeader();
       const hamburgerButton = container.querySelector(".cmp-header__hamburger");
       expect(hamburgerButton).toBeInTheDocument();
   });

   test("should toggle the menu visibility when hamburger button is clicked", async () => {
       const { container } = renderHeader();
       const hamburgerButton = container.querySelector(".cmp-header__hamburger button") as HTMLElement;
       const nav = container.querySelector(".cmp-header__nav") as HTMLElement;

       // Initially, the menu should be hidden
       expect(nav.classList.contains("hidden")).toBe(true);

       // Click the hamburger button to show the menu
       await user.click(hamburgerButton);
       expect(nav.classList.contains("hidden")).toBe(true);

       // Click the hamburger button again to hide the menu
       await user.click(hamburgerButton);
       expect(nav.classList.contains("hidden")).toBe(true);
   });

   test("should show the menu when hamburger button is clicked on mobile", async () => {
       const { container } = renderHeader();
       const hamburgerButton = container.querySelector(".cmp-header__hamburger") as HTMLElement;
       const nav = container.querySelector(".cmp-header__nav") as HTMLElement;

       // Initially, the menu should be hidden
       expect(nav.classList.contains("hidden")).toBe(true);

       // Click the hamburger button to show the menu
       await user.click(hamburgerButton);
       expect(nav.classList.contains("hidden")).not.toBe(true);
   });

   test("should toggle the hamburger icon to close icon on click of a button on mobile view", async () => {
       const { container } = renderHeader();
       const hamburgerButton = container.querySelector(".cmp-header__hamburger") as HTMLElement;
       const icon = hamburgerButton.querySelector(".sr-only") as HTMLElement;

       // Initially, the icon should be the hamburger icon
       expect(icon.textContent).toBe("Open Menu");

       // Click the hamburger button to toggle the icon
       await user.click(hamburgerButton);
       expect(icon.textContent).toBe("Close Menu");

       // Click the hamburger button again to toggle back to the hamburger icon
       await user.click(hamburgerButton);
       expect(icon.textContent).toBe("Open Menu");
   })

   test("should update the sr-only text of the hamburger button based on menu visibility", async () => {
       const { container } = renderHeader();
       const hamburgerButton = container.querySelector(".cmp-header__hamburger") as HTMLElement;
       const srOnly = hamburgerButton.querySelector(".sr-only") as HTMLElement;

       // Initially, the sr-only text should indicate "Open Menu"
       expect(srOnly.textContent).toBe("Open Menu");

       // Click the hamburger button to show the menu
       await user.click(hamburgerButton);
       expect(srOnly.textContent).toBe("Close Menu");

       // Click the hamburger button again to hide the menu
       await user.click(hamburgerButton);
       expect(srOnly.textContent).toBe("Open Menu");
   });

   test("toggle the theme from dark to light and vice versa on click of a theme button", async () => {
       const { container } = renderHeader();
       const themeButton = container.querySelector(".cmp-header__theme") as HTMLElement;

       // Initially, the theme should be light
       expect(document.documentElement.getAttribute('data-theme')).toBeOneOf(["light" , null]);

       // Click the theme button to switch to dark theme
       await user.click(themeButton);
       expect(document.documentElement.getAttribute('data-theme')).toBe("dark");

       // Click the theme button again to switch back to light theme
       await user.click(themeButton);
       expect(document.documentElement.getAttribute('data-theme')).toBe("light");
   });

   test("should respect an existing dark theme and toggle it to light", async () => {
       document.documentElement.setAttribute('data-theme', 'dark');
       const { container } = renderHeader();
       const themeButton = container.querySelector<HTMLButtonElement>(".cmp-header__theme");
       expect(themeButton).not.toBeNull();
       expect(themeButton?.querySelector('.lucide-sun')).toBeInTheDocument();

       await user.click(themeButton!);

       expect(document.documentElement.getAttribute('data-theme')).toBe('light');
       expect(themeButton?.querySelector('.lucide-moon')).toBeInTheDocument();
   });

   test("should synchronize the theme icon with external attribute changes", async () => {
       const { container, unmount } = render(<Header />);
       const themeButton = container.querySelector(".cmp-header__theme");
       expect(themeButton?.querySelector('.lucide-moon')).toBeInTheDocument();

       await act(async () => {
           document.documentElement.setAttribute('data-theme', 'dark');
       });
       expect(themeButton?.querySelector('.lucide-sun')).toBeInTheDocument();

       await act(async () => {
           document.documentElement.removeAttribute('data-theme');
       });
       expect(themeButton?.querySelector('.lucide-moon')).toBeInTheDocument();

       const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
       unmount();
       expect(disconnect).toHaveBeenCalledOnce();
       disconnect.mockRestore();
   });

   test("should render the theme on the server without document", () => {
       vi.stubGlobal('document', undefined);
       try {
           expect(renderToString(<Header />)).toContain('lucide-moon');
       } finally {
           vi.unstubAllGlobals();
       }
   });
});