module.exports = {
  info(msg) {
    console.log("[INFO]", msg);
  },

  warn(msg) {
    console.warn("[WARN]", msg);
  },

  error(err) {
    console.error("[ERROR]", err);
  }
};