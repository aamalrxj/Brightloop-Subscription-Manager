export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);