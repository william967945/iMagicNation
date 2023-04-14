const e = require("express");
var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/story", async function (req, res) {
  console.log(req.query.Name);

  if (req.query.Name !== undefined) {
    res.send({ Name: req.query.Name });
  } else if (req.query.Type !== undefined) {
    res.send({ Type: req.query.Type });
  } else {
    res.send({ err: "invalid api" });
  }
});
router.get("/story/list", async function (req, res) {
  res.send({
    list: [
      {
        title: "奶奶的花",
        resource: {
          type: "C2",
          letter: ["我", "是", "大", "笨", "蛋"],
          words: ["奶奶", "花朵"],
          phrases: ["舉一反三"],
          meaning: "對家人的同理心",
        },
        initialDialog: "奶奶在花園裡澆花。",
        image: {
          default: "default picture's URL",
        },
        remainCount: 10,
      },
      {
        title: "奶奶的花",
        resource: {
          type: "C2",
          letter: ["我", "是", "大", "笨", "蛋"],
          words: ["奶奶", "花朵"],
          phrases: ["舉一反三"],
          meaning: "對家人的同理心",
        },
        initialDialog: "奶奶在花園裡澆花。",
        image: {
          default: "default picture's URL",
        },
        remainCount: 10,
      },
    ],
  });
});
router.get("/story/one", async function (req, res) {
  res.send({
    title: "奶奶的花",
    resource: {
      type: "C2",
      letter: ["我", "是", "大", "笨", "蛋"],
      words: ["奶奶", "花朵"],
      phrases: ["舉一反三"],
      meaning: "對家人的同理心",
    },
    initialDialog: "奶奶在花園裡澆花。",
    image: {
      default: "default picture's URL",
    },
    remainCount: 10,
  });
});
router.post("/story", async function (req, res) {
  res.send({ res: req.body });
});

router.post("/story/progress", async function (req, res) {
  res.send({ res: req.body });
});

module.exports = router;
