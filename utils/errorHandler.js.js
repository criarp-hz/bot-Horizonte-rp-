const logger = require("./logger");

module.exports = client => {

  process.on("unhandledRejection", err => {
    logger.error("Unhandled Rejection:");
    logger.error(err);
  });

  process.on("uncaughtException", err => {
    logger.error("Uncaught Exception:");
    logger.error(err);
  });

  client.on("error", err => {
    logger.error("Discord Client Error:");
    logger.error(err);
  });

};