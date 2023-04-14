const config = require("config");
const axios = require("axios");

const db = require("./mysql");
const Q = require("q");

const { promiseWhilePromise } = require("./PromiseWhile");
// const domain = config.get("host");

class StoryService {
  constructor() {}
  static async sendNotification() {}
  static apiSend(req) {
    return axios({
      method: "POST",
      url: ``,
    });
  }
}
module.exports = StoryService;
