var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/user", async function (req, res) {
  res.send({
    name: "暱稱",
    token: "Base64(sha256)",
  });
});
router.post("/user", async function (req, res) {
  res.send({
    name: "暱稱",
    token: "Base64(sha256)",
  });
});

module.exports = router;
