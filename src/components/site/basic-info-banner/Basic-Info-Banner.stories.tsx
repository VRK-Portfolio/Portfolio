import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import BasicInfoBanner from './Basic-Info-Banner';
import { http, HttpResponse } from 'msw';
import { basicInfoMock } from '@/mocks/basic-info';

const meta = {
  component: BasicInfoBanner,
} satisfies Meta<typeof BasicInfoBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/basic-info", () => {
          return HttpResponse.json({
            data: basicInfoMock,
            success: true,
            message: "Basic info fetched successfully"
          });
        })
      ]
    }
  }
};