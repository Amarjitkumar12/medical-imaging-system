// Auto-detect database type based on environment
const usePostgreSQL = process.env.DATABASE_URL && !process.env.MONGODB_URI;

if (usePostgreSQL) {
  console.log('🐘 Using PostgreSQL (Railway)');
  module.exports = require('./database-postgresql');
} else {
  console.log('🍃 Using MongoDB');
  module.exports = require('./database');
}