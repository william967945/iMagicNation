import express, { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { config } from "dotenv";
import Sequelize from "sequelize";
import cors from "cors";
import axios from "axios";

import indexRouter from "./src/routes/index.js";
import userRouter from "./src/routes/user.js";

var app = express();

config();

const port = process.env.PORT || 5051;

app.use(logger("dev"));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(join(__dirname, 'public')));
app.use(cors());
app.use("/", indexRouter);
// app.use("/", userRouter);
// const seq = db;

const seq = new Sequelize(process.env.MYSQL_URL); // Example for sqlite

// const seq = new Sequelize(process.env.MYSQLDATABASE, process.env.MYSQLUSER, process.env.MYSQLPASSWORD, {
//   host: process.env.MYSQLHOST,
//   port: process.env.MYSQLPORT,
//   dialect: 'mysql',
// });

seq
  .authenticate()
  .then(() => {
    console.log("Connection has been established sucessfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database: ", error);
  });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log("next-------------------------------------");
});

// test2
// new test
export default app;
export { seq };
