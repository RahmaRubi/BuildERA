require('dotenv').config();

const sslConfig = {
  use_env_variable: "DB_URL",
  dialect: "mysql",
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false
    }
  }
};

module.exports = {
  development: sslConfig,
  production: sslConfig,
};
