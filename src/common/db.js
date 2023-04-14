// const config = require('config');
const MySql = require("../lib/mysql");
const config = require("config");

//FIXME: 建議使用config帶入MySQL連線設置
module.exports = new MySql(config.get("MySQL"));
