import express, { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { config } from 'dotenv';
import Sequelize from "sequelize";
import cors from 'cors';
import axios from 'axios';

import indexRouter from './src/routes/index.js';

var app = express();

config();

const port = process.env.PORT || 5000;

app.use(logger('dev'));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(join(__dirname, 'public')));
app.use(cors());
app.use('/', indexRouter);
// const seq = db;

// const seq = new Sequelize('mysql://root:CtkHleNgIv3HoFOwmhyI@containers-us-west-51.railway.app:5738/railway') // Example for sqlite

// seq.authenticate().then(() => {
//   console.log('Connection has been established sucessfully.');
// }).catch((error) => {
//   console.error('Unable to connect to the database: ', error);
// });
//
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  console.log("next-------------------------------------")
})


export default app;
// export { seq };

