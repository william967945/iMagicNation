import { Router } from "express";

import {
  getAllStory,
  getStoryByTitleOrType,
  getStoryByStoryId,
  getStoryProgress,
  postStoryProgressByUser,
  callChatGPT,
  resetStory,
  dallePromptTest,
  scoreTest,
  inquireDict
} from "../controllers/story.js";
import { getBlobImage, getVideo, getVoice } from "../controllers/utils.js";

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

// 字詞查詢
router.post("/story/inquiry", inquireDict);

// Dalle prompt圖片測試
router.post("/dalle/test", dallePromptTest)

// 取出 Blob 圖片
router.get("/dalle/blob", getBlobImage)

// 評分系統測試
router.post("/score/test", scoreTest)

// 聲音生成
router.post("/voice/test", getVoice)

// 影片匯出
router.post("/video/test", getVideo)

export default router;
