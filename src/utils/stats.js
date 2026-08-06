// Least-squares linear trend line over a series of numbers (index = x).
// Returns an array the same length as values, one trend point per index.
export function linearTrend(values) {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [values[0]]

  const xs = values.map((_, i) => i)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)

  const denom = n * sumXX - sumX * sumX
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  return xs.map((x) => Math.round((slope * x + intercept) * 10) / 10)
}
