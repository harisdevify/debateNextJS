import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DebateSetup } from './DebateSetup';

it('submits the selected topic, language and mode without changing the matchmaking contract', () => {
  const onStart = vi.fn();
  render(<DebateSetup onStart={onStart} />);

  fireEvent.click(screen.getByRole('radio', { name: 'Technology & AI' }));
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

  fireEvent.click(screen.getByRole('radio', { name: 'Urdu' }));
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

  fireEvent.click(screen.getByRole('radio', { name: /Structured debate/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Check devices' }));

  expect(onStart).toHaveBeenCalledWith({ topic: 'technology', language: 'ur', mode: 'formal' });
});
