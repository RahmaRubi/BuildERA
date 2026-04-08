require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: "DB_URL",
    dialect: process.env.DB_DIALECT
  },
  production: {
    use_env_variable: "DB_URL",
    dialect: process.env.DB_DIALECT
  }
};