import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Card from './Card';
import Link from "next/link";

const meta = {
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {

  },
  render: () => {
    return (
      <Card>
        <Card.Heading>Heading Content</Card.Heading>
        <Card.Body>Body Content</Card.Body>
        <Card.Footer>Footer Content</Card.Footer>
      </Card>
    );
  },
};

export const WithImage: Story = {
  args: {

  },
  render: () => {
    return (
      <Card>
        <Card.Image imageUrl="/vercel.svg" />
        <Card.Heading>Heading Content</Card.Heading>
        <Card.Body>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Iste expedita dolor cupiditate, repudiandae totam reiciendis? Expedita quae mollitia officia necessitatibus commodi natus quo
        </Card.Body>
        <Card.Footer>
          <Link href="/some-path">
            Click Here
          </Link>
        </Card.Footer>
      </Card>
    );
  },
};