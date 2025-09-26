export function normalize(values: number[], value: number, invert = false): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 0.5;
  const normalized = (value - min) / (max - min);
  return invert ? 1 - normalized : normalized;
}

export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length || values.length === 0) {
    return 0;
  }
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = values.reduce((sum, v, idx) => sum + v * weights[idx], 0);
  return weightedSum / totalWeight;
}
