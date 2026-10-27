import { expect, it } from 'vitest';
import { proxy } from './proxy';
it('lets page auth verification run without requiring an API-host cookie on the frontend', () => {
  const response = proxy();
  expect(response.headers.get('location')).toBeNull();
  expect(response.headers.get('x-middleware-next')).toBe('1');
});
