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
  apiKey: `${process.env.FIREBASE_API_KEY}`,
  authDomain: `${process.env.FIREBASE_AUTH_DOMAIN}`,
  projectId: `${process.env.FIREBASE_PROJECT_ID}`,
  storageBucket: `${process.env.FIREBASE_STORAGEBUCKET}`,
  messagingSenderId: `${process.env.FIREBASE_MESSAGING_SENDER_ID}`,
  appId: `${process.env.FIREBASE_APP_ID}`,
  measurementId: `${process.env.FIREBASE_MEASUREMENT_ID}`
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
