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

// Least-squares trend over irregularly spaced points. points: [{x, y}] with
// numeric x (e.g. day offset). Returns y-values of the fitted line at each x.
export function timeTrend(points) {
  const n = points.length
  if (n === 0) return []
  if (n === 1) return [points[0].y]
  const sx = points.reduce((a, p) => a + p.x, 0)
  const sy = points.reduce((a, p) => a + p.y, 0)
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0)
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0)
  const d = n * sxx - sx * sx
  const slope = d === 0 ? 0 : (n * sxy - sx * sy) / d
  const intercept = (sy - slope * sx) / n
  return points.map((p) => Math.round((slope * p.x + intercept) * 100) / 100)
}
