import { Router } from 'express';

import {
    userReply
} from '../controllers/story.js';

var router = Router();

router.get('/healthcheck', function (req, res) {
    let time = new Date();
    let message = 'OK';
    const healthcheck = {
        time: new Date(),
        message: 'OK'
    }
    try {
        res.json(healthcheck)
    } catch (e) {
        res.status(503).send()
    }
    console.log('healthcheck: ', time, message);
})

// story
// 故事書List
router.get("/story/list", async function (req, res) {
    res.send({
        list: [
            {
                storyId: "xxxxxx",
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
                storyId: "xxxxxx",
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
// 故事書by Name, Type
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
// 單一故事書
router.get("/story/one", async function (req, res) {
    let storyId = req.params.storyId
    res.send({
        storyId: storyId,
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

// 新增故事書
router.post("/story", async function (req, res) {
    // body 參數寫進DB
    res.send({ storyId: req.body.title + '的storyId' });
});
// GET 使用者故事進度
router.get("/story/progress", async function (req, res) {
    let userToken = req.params.userToken
    res.send({
        userToken: userToken,
        storyToken: "Io31412421421",
        remainCount: "10"
    });
});
// POST 使用者故事進度
router.post("/story/progress", async function (req, res) {
    res.send({ res: req.body });
});

// 使用者回答
router.post('/story/user/reply', userReply);

// 取得暱稱by Token
router.get("/user", async function (req, res) {
    // 抓 params: token
    // DB 查 token 對應的 暱稱
    // 回傳暱稱
    res.send({
        name: "暱稱",
        token: "Base64(sha256)",
        timestamp: new Date()
    });
});
// 新增暱稱
router.post("/user", async function (req, res) {
    // 抓 body 參數
    // 參數寫進 DB
    // 回傳 暱稱, 生成token, timestamp
    let name = req.body.name;
    let token = name + "的token";

    res.send({
        name: name,
        token: token,
        timestamp: new Date()
    });
});


export default router;
