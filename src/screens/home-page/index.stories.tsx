import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Index from './index';
import { mockMySkills } from '@/mocks/my-skills';
import { basicInfoMock } from '@/mocks/basic-info';
import { http, HttpResponse } from 'msw';
import { mockProjectListingData } from '@/mocks/project-listing';
import { mockBlogListingData } from '@/mocks/recent-blogs';
import HeaderComponent from '@/components/site/header/Header';

const meta = {
  component: Index,
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (<>
    <HeaderComponent />
    <main>
      <Index />
    </main>
  </>),
  parameters: {
    msw: {
      handlers: [
                
        http.get('/api/basic-info', () => {
          return HttpResponse.json(
            {
              success: true,
              data: basicInfoMock,
            },
            {
              status: 200
            }
          );
        }),
,

        http.get('/api/my-skills', () => {
          return HttpResponse.json(
            {
              success: true,
              data: mockMySkills,
            },
            {
              status: 200
            }
          );
        }),

        http.get('*/api/projects', () => {
          return HttpResponse.json({
            data: mockProjectListingData,
            success: true,
            message: 'Fetched project listing successfully',
          });
        }),

        http.get('*/api/blogs', () => {
          return HttpResponse.json({
            data: mockBlogListingData,
            success: true,
            message: 'Fetched blog listing successfully',
          });
        }),
      ]
    }
  }
};