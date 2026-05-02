const path = require("path")
const dotenv = require("dotenv")

const backendEnvPath = path.resolve(__dirname, "../../.env")
const cwdEnvPath = path.resolve(process.cwd(), ".env")

dotenv.config()

if (cwdEnvPath !== backendEnvPath) {
  dotenv.config({ path: backendEnvPath })
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret || !secret.trim()) {
    const error = new Error(
      `JWT_SECRET is required. Set it in ${backendEnvPath} or as an environment variable.`
    )
    error.code = "CONFIGURATION_ERROR"
    throw error
  }

  return secret
}

function validateRuntimeEnv() {
  getJwtSecret()
}

module.exports = {
  backendEnvPath,
  getJwtSecret,
  validateRuntimeEnv,
}
