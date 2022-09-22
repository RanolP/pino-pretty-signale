export function isObject(input: unknown): input is object {
  return input !== null && typeof input === 'object';
}
