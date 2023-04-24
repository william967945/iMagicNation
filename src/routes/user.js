import { Router } from 'express';

var router = Router();


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