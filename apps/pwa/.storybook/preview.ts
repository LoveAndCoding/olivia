import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FAF8FF' },
        { name: 'dark', value: '#12101C' },
        { name: 'desktop', value: '#E8E4FF' },
      ],
    },
  },
};

export default preview;
