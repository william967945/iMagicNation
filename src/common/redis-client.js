const config = require('config');

const Redis = require('ioredis');

//FIXME: 建議使用config帶入REDIS連線設置
module.exports = new Redis({
  host: '127.0.0.1',
  db: 1
});