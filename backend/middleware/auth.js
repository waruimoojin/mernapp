const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
const authHeader = req.header('Authorization');
if (!authHeader) return res.status(401).json({ message: 'No token, authorization denied' });

// Le token pur est la partie après "Bearer "
const token = authHeader.split(' ')[1];
if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

try {
  const decoded = jwt.verify(token, 'secret_key'); // ⚠️ plus tard mets process.env.JWT_SECRET
  req.user = decoded.userId;
  next();
} catch (err) {
  res.status(401).json({ message: 'Invalid token' });
}

};
