import config from 'config';
import Sequelize from "sequelize";

//FIXME: 建議使用config帶入MySQL連線設置
// export default new MySql({
//   "connectionLimit": 10, //同時MySQL連線數上限
//   "host": config.mysql.host,
//   "user": config.mysql.username,
//   "password": config.mysql.password,
//   "database": config.mysql.database,
//   "charset": "utf8",
//   "multipleStatements": true //支援以分號分隔的多筆查詢語法與否
// });

export default new Sequelize(
  "railway", // DB schema
  "root", // DB username
  "dG5e8KdfhO2ZS4iFi8z1",
  {
    host: "containers-us-west-158.railway.app",
    dialect: "mysql",
    dialectOptions: {
      charset: 'utf8',
      multipleStatements: true
    }
  }
);