import { Router } from "express";

import {
  userReply,
  getAllStory,
  getStoryByTitleOrType,
  getStoryByStoryId,
  getStoryProgress,
  postStoryProgressByUser,
  callChatGPT,
  resetStory
} from "../controllers/story.js";

var router = Router();

router.get("/healthcheck", function (req, res) {
  let time = new Date();
  let message = "OK";
  const healthcheck = {
    time: new Date(),
    message: "OK",
  };
  try {
    res.json(healthcheck);
  } catch (e) {
    res.status(503).send();
  }
  console.log("healthcheck: ", time, message);
});

// story
// 故事書List
router.get("/story/list", getAllStory);

// 故事書by Title, Type
router.get("/story", getStoryByTitleOrType);

// 單一故事書
router.get("/story/one", getStoryByStoryId);

// 新增故事書
// router.post("/story", async function (req, res) {
//     // body 參數寫進DB
//     res.send({ storyId: req.body.title + '的storyId' });
// });

// GET 使用者故事進度
router.get("/story/progress", getStoryProgress);
// POST 使用者故事進度
// router.post("/story/progress", postStoryProgressByUser);

// 使用者回答
// router.post("/story/user/reply", userReply);

// Call ChatGPT
router.post("/story/callchatgpt", callChatGPT);

// 故事重置
router.post("/story/reset", resetStory);

export default router;
