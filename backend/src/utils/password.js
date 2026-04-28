const crypto = require("crypto")

const HASH_ALGORITHM = "pbkdf2_sha256"
const HASH_ITERATIONS = 120000
const HASH_KEYLEN = 32
const HASH_DIGEST = "sha256"
const HASH_SALT_BYTES = 16

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(HASH_SALT_BYTES).toString("hex")
  const derivedKey = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST)
  return `${HASH_ALGORITHM}$${HASH_ITERATIONS}$${salt}$${derivedKey.toString("hex")}`
}

async function hashPassword(password) {
  return hashPasswordSync(password)
}

function comparePasswordSync(password, storedHash) {
  const [algorithm, iterationsText, salt, expectedHex] = String(storedHash).split("$")

  if (algorithm !== HASH_ALGORITHM || !iterationsText || !salt || !expectedHex) {
    return false
  }

  const iterations = Number(iterationsText)
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false
  }

  const expected = Buffer.from(expectedHex, "hex")
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, expected.length, HASH_DIGEST)

  if (derivedKey.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(derivedKey, expected)
}

async function comparePassword(password, storedHash) {
  return comparePasswordSync(password, storedHash)
}

module.exports = {
  hashPassword,
  hashPasswordSync,
  comparePassword,
  comparePasswordSync,
}