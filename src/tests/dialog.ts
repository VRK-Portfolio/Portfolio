import { vi } from "vitest";

export const mockDialogMethods = () => {
    const prototype = HTMLDialogElement.prototype;
    const originalShowModal = Object.getOwnPropertyDescriptor(prototype, "showModal");
    const originalClose = Object.getOwnPropertyDescriptor(prototype, "close");
    const showModal = vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event("close"));
    });

    // jsdom does not implement the native dialog methods.
    Object.defineProperties(prototype, {
        showModal: { configurable: true, writable: true, value: showModal },
        close: { configurable: true, writable: true, value: close },
    });

    return {
        showModal,
        close,
        restore: () => {
            if (originalShowModal) {
                Object.defineProperty(prototype, "showModal", originalShowModal);
            } else {
                Reflect.deleteProperty(prototype, "showModal");
            }
            if (originalClose) {
                Object.defineProperty(prototype, "close", originalClose);
            } else {
                Reflect.deleteProperty(prototype, "close");
            }
        },
    };
};
