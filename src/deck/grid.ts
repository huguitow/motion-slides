/** Next selected thumbnail in a grid of `count` items laid out in `columns`, or null if `key` does not move it. */
export function moveSelection(index: number, key: string, count: number, columns: number): number | null {
  const clamp = (value: number) => Math.min(Math.max(value, 0), count - 1);
  switch (key) {
    case 'ArrowRight':
      return clamp(index + 1);
    case 'ArrowLeft':
      return clamp(index - 1);
    case 'ArrowDown':
      return clamp(index + columns);
    case 'ArrowUp':
      return index - columns >= 0 ? index - columns : index;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
