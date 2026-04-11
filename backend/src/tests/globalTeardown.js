const { pool } = require("../db/database")

module.exports = async function () {
  await pool.end()
}
