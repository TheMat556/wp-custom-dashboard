/** Returns true when `x` is a non-null string. Use with `.filter(isString)` to narrow `(string | undefined)[]` → `string[]`. */
export function isString(x: unknown): x is string {
  return typeof x === "string";
}
