// Wraps an async route handler so thrown errors/rejected promises reach
// Express's error-handling middleware instead of crashing the process.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
