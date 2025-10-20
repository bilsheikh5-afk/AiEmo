// Simple mock auth middleware
const auth = (req, res, next) => {
    // For demo purposes, just continue
    req.user = { id: 'demo-user' };
    next();
};

export default auth;
