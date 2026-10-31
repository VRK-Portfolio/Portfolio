import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { handlers } from '@/mocks/recent-blogs';
import RecentBlogs from './recent-blogs';

const meta = {
  component: RecentBlogs,
} satisfies Meta<typeof RecentBlogs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
    maxCount: 3,
  },
  parameters: {
    msw: {
      handlers,
    },
  },
};