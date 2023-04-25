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
// router.post("/story", async function (req, res) {
//     // body 參數寫進DB
//     res.send({ storyId: req.body.title + '的storyId' });
// });

// GET 使用者故事進度
router.get("/story/progress", async function (req, res) {
    let userToken = req.params.userToken
    res.send({
        userId: "1",
        storyId: "1",
        remainCount: "10",
        message: [
            {
                message: "ok",
                remainCount: "infinite",
                title: "奶奶的花",
                userId: "Base64(sha256)",
                chatGPTResponse: {
                    role: "assistant",
                    content: "奶奶和孫子在賭場內玩著21點，他們分別拿到了兩張牌。奶奶得到了10和8兩張牌，總共18點；而孫子得到了9和5兩張牌，總共14點。奶奶看著孫子的牌，猶豫了一會兒，最後決定要再拿一張牌，希望能夠獲得更高的點數。於是，奶奶要求莊家發牌，最後得到了3點，總共21點，贏得了這一輪的比賽。孫子嘆了一口氣，看著奶奶得意的樣子，也決定再拿一張牌，希望能夠追回一點差距。孫子要求莊家發牌，但手氣卻不如奶奶，最後得到了8點，總點數為22點，輸掉了這一輪的比賽。奶奶和孫子笑容滿面地換了一千元的籌碼，準備再接再厲，繼續在賭場內度過愉快的時光。"
                },
                image: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-O0J27zQrydIuKDx8csuyhqgH/user-0MNIW8x1rqWI11a4CdOGQAvy/img-9OClmPwtede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-04-14T08%3A01%3A20Z&ske=2023-04-15T08%3A01%3A20Z&sks=b&skv=2021-08-06&sig=FuTqCYA6mqTIXdgY7E8mKFkc4PtDK5P/xQ404nH7D38%3D",
                timestamp: "2023-04-14T11:34:58.303Z"
            }
        ]
    });
});
// POST 使用者故事進度
router.post("/story/progress", async function (req, res) {
    res.send({
        userId: "1",
        storyId: "1",
        remainCount: "10"
    });
});

// 使用者回答
router.post('/story/user/reply', userReply);


export default router;
