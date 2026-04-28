import type { StorybookConfig } from '@storybook/nextjs-vite';
import { existsSync } from 'node:fs';

const staticDirs = existsSync(new URL('../public', import.meta.url))
  ? ['../public']
  : [];

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs,
};

export default config;
