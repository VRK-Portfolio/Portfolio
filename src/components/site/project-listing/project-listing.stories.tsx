import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import ProjectListing from './project-listing';

import { http } from 'msw/core/http';
import { HttpResponse } from 'msw';
import { mockProjectListingData } from '@/mocks/project-listing';

const meta = {
  component: ProjectListing,
} satisfies Meta<typeof ProjectListing>;

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
        http.get('*/api/projects', () => {
          return HttpResponse.json({
            data: mockProjectListingData,
            success: true,
            message: 'Fetched project listing successfully',
          });
        }),
      ],
    },
  },
};