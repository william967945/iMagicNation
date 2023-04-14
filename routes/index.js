var express = require("express");
var router = express.Router();
var promisify = require("../src/common/promisify").promisify;

router.get("/", async function (req, res) {
  res.send("imagicnation ready");
});

module.exports = router;
