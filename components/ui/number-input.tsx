"use client";

import { useState, type ComponentProps } from "react";

type NumberInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Number field that can be emptied while typing. The text is kept locally, so
 * clearing it never turns into 0; the parent keeps its last valid number until a
 * new one is typed. Mark it `required` so an empty field can't be submitted.
 */
export function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const [text, setText] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Pick up changes made outside this field, such as choosing another species.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== Number(text) || text === "") setText(String(value));
  }

  return <input {...props} type="number" value={text} onChange={(event) => {
    const next = event.target.value;
    setText(next);
    if (next !== "" && Number.isFinite(Number(next))) onValueChange(Number(next));
  }} />;
}
