import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Badge from './Badge';

const meta = {
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const WithCloseButton: Story = {
  args: {
    children: "Badge with Close Button",
    close: true,
    onClose: () => alert('Badge closed'),
  },
};