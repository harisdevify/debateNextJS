import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ChatInputRow } from "./ChatInputRow";
it("keeps a rejected draft and clears it only after successful acknowledgement", async () => {
  const user = userEvent.setup();
  const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<ChatInputRow onSend={send} />);
  const input = screen.getByRole("textbox") as HTMLTextAreaElement;
  await user.type(input, "hello");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(input.disabled).toBe(false));
  expect(input.value).toBe("hello");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(input.value).toBe(""));
  expect(send).toHaveBeenCalledTimes(2);
  expect(input.maxLength).toBe(1000);
});
