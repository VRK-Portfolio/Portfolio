import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Card from "../Card";
import Button from "../../button/Button";
import userEvent, { UserEvent } from "@testing-library/user-event";
import Link from "next/link";

describe("Card component", () => {
    let user: UserEvent;
    // Initialize userEvent instance before each test
    beforeEach(() => {
        user = userEvent.setup();
    });
    const renderCard = (props = {}, children: React.ReactNode = "Card Content") => {
        const { container } = render(<Card {...props}>{children}</Card>);
        const card = container.querySelector('.cmp-card');
        
        return card;
    };
    test("should render the Card component", () => {
        const card = renderCard();
        expect(card).toBeInTheDocument();
    });

    test("should have the correct class name", () => {
        const card = renderCard();
        expect(card).toHaveClass("cmp-card");
    });

    test("should render the card component with a custom class set from prop", () => {
        const card = renderCard({className: "custom-class"});
        expect(card).toHaveClass("custom-class");
    });

    test("should render the children correctly", () => {
        const card = renderCard();
        expect(card).toHaveTextContent("Card Content");
    });

    test("should render the correct HTML tag based on the Tag props", () => {
        const card = renderCard({Tag: 'article'});
        expect(card?.tagName.toLowerCase()).toBe('article');
        const cardDiv = renderCard({Tag: 'div'});
        expect(cardDiv?.tagName.toLowerCase()).toBe('div');
    });

    test("should render the card component with the heading", () => {
        const card = renderCard({}, <Card.Heading Tag="h2">Heading Content</Card.Heading>);
        const heading = card?.querySelector('.cmp-card-heading');
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent("Heading Content");
    });

    test("should render the card component with the heading tag set by prop", () => {
        const card = renderCard({}, <Card.Heading Tag="h3">Heading Content</Card.Heading>);
        const heading = card?.querySelector('.cmp-card-heading');
        expect(heading?.tagName.toLowerCase()).toBe('h3');
    });

    test("should render the card component with the body", () => {
        const card = renderCard({}, <Card.Body>Body Content</Card.Body>);
        const body = card?.querySelector('.cmp-card-body');
        expect(body).toBeInTheDocument();
        expect(body).toHaveTextContent("Body Content");
    });

    test("should render the card component with the footer", () => {
        const card = renderCard({}, <Card.Footer>Footer Content</Card.Footer>);
        const footer = card?.querySelector('.cmp-card-footer');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveTextContent("Footer Content");
    });

    test("should render the card component with all sections", () => {
        const card = renderCard({}, (
            <>
                <Card.Heading Tag="h2">Heading Content</Card.Heading>
                <Card.Body>Body Content</Card.Body>
                <Card.Footer>Footer Content</Card.Footer>
            </>
        ));
        const heading = card?.querySelector('.cmp-card-heading');
        const body = card?.querySelector('.cmp-card-body');
        const footer = card?.querySelector('.cmp-card-footer');
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent("Heading Content");
        expect(body).toBeInTheDocument();
        expect(body).toHaveTextContent("Body Content");
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveTextContent("Footer Content");
    });

    test("should trigger the button click event ", async () => {
        const buttonClick = vi.fn();
        const card = renderCard({}, <Card.Footer><Button onClick={buttonClick}>Click Me</Button></Card.Footer>);
        const footer = card?.querySelector('.cmp-card-footer');
        const button = footer?.querySelector('button');
        expect(footer).toBeInTheDocument();
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent("Click Me");
        await user.click(button as HTMLButtonElement);
        expect(buttonClick).toHaveBeenCalledTimes(1);
        expect(button).toBeInstanceOf(HTMLButtonElement);
    });

    test("should render the card component with an image section", () => {
        const card = renderCard({}, <Card.Image imageUrl="/vercel.svg" />);
        const imageSection = card?.querySelector('.cmp-card-with-image');
        expect(imageSection).toBeInTheDocument();
    });

    test("should render the card component with a link in the footer", () => {
        const card = renderCard({}, <Card.Footer><Link href="/some-path">Click Here</Link></Card.Footer>);
        const footer = card?.querySelector('.cmp-card-footer a');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveTextContent("Click Here");
    });

    test("should render the card component with a heading and body", () => {
        const card = renderCard({}, (
            <>
                <Card.Heading Tag="h3">Heading Content</Card.Heading>
                <Card.Body>Body Content</Card.Body>
            </>
        ));
        const heading = card?.querySelector('.cmp-card-heading');
        const body = card?.querySelector('.cmp-card-body');
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent("Heading Content");
        expect(body).toBeInTheDocument();
        expect(body).toHaveTextContent("Body Content");
    });
});
