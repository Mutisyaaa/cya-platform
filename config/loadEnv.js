const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envFiles = [
  path.join(__dirname, "..", "server", ".env"),
  path.join(__dirname, "..", ".env"),
];

envFiles.forEach((envPath, index) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({
      path: envPath,
      override: index > 0,
    });
  }
});

module.exports = envFiles;
