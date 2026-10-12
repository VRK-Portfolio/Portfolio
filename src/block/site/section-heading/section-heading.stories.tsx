import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import SectionHeading from './section-heading';

const meta = {
  component: SectionHeading,
} satisfies Meta<typeof SectionHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "title": "Section Title",
    "subtitle": "Section Subtitle",
  },
};