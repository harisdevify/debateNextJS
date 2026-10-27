import { Transform } from "class-transformer";

/** Trims string input before validation, so "   " counts as empty. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );
