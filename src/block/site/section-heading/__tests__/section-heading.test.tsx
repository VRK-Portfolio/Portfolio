import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import SectionHeading from "../section-heading";

describe("SectionHeading", () => {

    const renderSectionHeading = () => {
        const {container} = render(<SectionHeading title="Section Title" subtitle="Section Subtitle" Tag="h2" />);
        return container;
    };


    test("should render the section heading correctly", () => {
        const container = renderSectionHeading();
        expect(container).toBeInTheDocument();
    });

    test("should render the title correctly", () => {
        const container = renderSectionHeading();
        expect(container.querySelector("h2.cmp-section-heading__title")?.textContent).toBe("Section Title");
    });
    
    test("should render the subtitle correctly", () => {
        const container = renderSectionHeading();
        expect(container.querySelector("p.cmp-section-heading__subtitle")?.textContent).toBe("Section Subtitle");
    });

    test("should render the correct tag for the title", () => {
        const container = renderSectionHeading();
        expect(container.querySelector("h2.cmp-section-heading__title")).toBeInTheDocument();
    });

    test("should render the default tag when no Tag prop is provided", () => {
        const { container } = render(<SectionHeading title="Section Title" subtitle="Section Subtitle" />);
        expect(container.querySelector("h2.cmp-section-heading__title")).toBeInTheDocument();
    });

    test("should render the correct tag when a different Tag prop is provided", () => {
        const { container } = render(<SectionHeading title="Section Title" subtitle="Section Subtitle" Tag="h3" />);
        expect(container.querySelector("h3.cmp-section-heading__title")).toBeInTheDocument();
    });

    test("should render without crashing when no props are provided", () => {
        const { container } = render(<SectionHeading title="Section Title" />);
        expect(container).toBeInTheDocument();
    });

    test("should not render when subtitle is not provided", () => {
        const { container } = render(<SectionHeading title="Section Title" />);
        expect(container.querySelector("p.cmp-section-heading__subtitle")).not.toBeInTheDocument();
    });
});