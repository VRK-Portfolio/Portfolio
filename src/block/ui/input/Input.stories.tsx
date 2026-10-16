import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Input from './Input';

const meta = {
  component: Input,

} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {

  args: {
    label: 'Default Label',
    placeholder: 'Enter text here',
  }
};


export const ErrorField: Story = {
  args: {
    label: 'Default Label',
    placeholder: 'Enter text here',
    error: 'This field is required',
  }
};