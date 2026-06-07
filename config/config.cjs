require('dotenv').config();

const sslConfig = {
  use_env_variable: "DB_URL",
  dialect: "mysql",
  dialectOptions: {
    ssl: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2"
    }
  }
};

module.exports = {
  development: sslConfig,
  production: sslConfig,
};
