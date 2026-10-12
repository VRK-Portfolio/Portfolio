import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { mockMySkills } from '@/mocks/my-skills';
import MySkills from './My-Skills';

const meta = {
  component: MySkills,
} satisfies Meta<typeof MySkills>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
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
      ]
    }
  }
};