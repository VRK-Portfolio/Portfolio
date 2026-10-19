import type { Preview } from '@storybook/nextjs-vite'
import { mswLoader } from 'msw-storybook-addon/csf3';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

// @ts-ignore.
import '../src/app/styles/globals.css';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disables retries during testing/storybook development
    },
  },
});

const preview: Preview = {
  loaders: [mswLoader()],
  decorators: [withThemeByDataAttribute({
    themes: {
      light: 'light',
      dark: 'dark',
    },
    defaultTheme: 'light',
    attributeName: 'data-theme'
  }), (Story) => (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },

  initialGlobals: {
    locale: 'en',
    locales: {
      en: 'English',
      fr: 'French',
      ja: 'Japanese'
    }
  },

};

export default preview;