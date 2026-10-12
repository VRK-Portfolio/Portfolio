import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { http, HttpResponse } from 'msw';
import { mockBlogListingData } from '@/mocks/recent-blogs';
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
      handlers: [
        // 👈 Use wildcard '*/api/basic-info' without the '/mock' prefix
        http.get('*/api/blogs', () => {
          return HttpResponse.json({
            data: mockBlogListingData,
            success: true,
            message: 'Fetched blog listing successfully',
          });
        }),
      ],
    },
  },
};