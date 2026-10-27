import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ActionForm } from './ActionForm';
vi.mock('@/components/ui/Dialog', () => ({
  Dialog: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));
it('requires review and confirmation before applying an action', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockResolvedValue(true);
  render(
    <ActionForm name="Member" report restricted={false} onSubmit={submit} />
  );
  await user.selectOptions(screen.getByLabelText('Action'), 'SUSPEND');
  await user.type(
    screen.getByLabelText('Internal reason'),
    'Reviewed repeated harassment'
  );
  await user.click(screen.getByRole('button', { name: 'Review action' }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Confirm action' }));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith({
      action: 'SUSPEND',
      durationHours: 24,
      reason: 'Reviewed repeated harassment',
    })
  );
});
it('does not offer account restrictions when only dismiss is permitted', () => {
  render(
    <ActionForm
      name="Admin"
      report
      restricted={false}
      onlyDismiss
      onSubmit={vi.fn()}
    />
  );
  expect(screen.getAllByRole('option')).toHaveLength(1);
  expect((screen.getByLabelText('Action') as HTMLSelectElement).value).toBe(
    'DISMISS'
  );
});
it('keeps the reason after a failed save', async () => {
  const user = userEvent.setup();
  render(
    <ActionForm
      name="Member"
      report
      restricted={false}
      onSubmit={vi.fn().mockResolvedValue(false)}
    />
  );
  fireEvent.change(screen.getByLabelText('Internal reason'), {
    target: { value: 'Need more evidence' },
  });
  await user.click(screen.getByRole('button', { name: 'Review action' }));
  await user.click(screen.getByRole('button', { name: 'Confirm action' }));
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Confirm action',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  );
  expect(
    (screen.getByLabelText('Internal reason') as HTMLTextAreaElement).value
  ).toBe('Need more evidence');
});
