import express, { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { config } from "dotenv";
import Sequelize from "sequelize";
import cors from "cors";
import process from "process";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

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

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGHjsmgCOFzkGd-BHfhkeUTJ0dlzLHIdQ",
  authDomain: "quant-5b96e.firebaseapp.com",
  projectId: "quant-5b96e",
  storageBucket: "quant-5b96e.appspot.com",
  messagingSenderId: "187727174752",
  appId: "1:187727174752:web:16a43c904e3a2d2582b705",
  measurementId: "G-QLJ6FB0NN2"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

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


export default app;
export { seq, auth };
