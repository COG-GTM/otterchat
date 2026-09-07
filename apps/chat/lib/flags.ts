import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter(),
  description: 'An example flag to verify the Flags SDK setup',
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
});
