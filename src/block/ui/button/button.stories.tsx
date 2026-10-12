import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Button from './Button';

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimaryButton: Story = {
  args: {
    "children": 'Primary Button',
    "variant": 'primary',
  },
};


export const PrimaryOutlineButton: Story = {
  args: {
    "children": 'Outline Button',
    "outline": true,
    "variant": 'primary',
  },
};

export const SecondaryButton: Story = {
  args: {
    "children": 'Secondary Button',
    "outline": false,
    "variant": 'secondary',
  },
};


export const SecondaryOutlineButton: Story = {
  args: {
    "children": 'Secondary Outline Button',
    "outline": true,
    "variant": 'secondary'
  },
};

export const DangerButton: Story = {
  args: {
    "children": 'Danger Button',
    "variant": 'danger',
  },
};


export const DangerOutlineButton: Story = {
  args: {
    "children": 'Danger Outline Button',
    "outline": true,
    "variant": 'danger',
    type: 'button',
    className: '',
  },
};

export const GhostButton: Story = {
  args: {
    "children": 'Ghost Button',
    "variant": 'ghost',
  },
};

