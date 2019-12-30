module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_URL: process.env.DB_URL || 'postgresql://dunder_mifflin@localhost/blogful-auth',
  JWT_SECRET: process.env.JWT_SECRET || 'blogful-client-auth-toke',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '20s', //take away env var and tests will fail if expiresIn differs in test/setup.js
}
