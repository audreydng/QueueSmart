const { Pool } = require("pg")

const isTest = process.env.NODE_ENV === "test"

const pool = new Pool({
  connectionString: isTest
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL,
})

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
}
