const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const createError = require("http-errors");
const expressValidator = require("express-validator");


dotenv.config({ path: "./config.env" });
const env = process.env;
const port = env.PORT || 3000;
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(expressValidator());

// Get routes
app.use(require("./routes/user"));
/*
app.use((req, res, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = err || {};
  const errorCode = err.status || 500;
  res.status(errorCode);

  console.log(err.stack);
});
*/

// Get driver connection
const dbo = require("./db/conn");
app.listen(port, () => {

  // Perform a database connection when server starts
  dbo.connectToServer((err) => {
    if (err) {
      console.error(err);
    }
  });

  console.log(`Server is running on port: ${port}`);
});

