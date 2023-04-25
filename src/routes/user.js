import { Router } from 'express';

import {
    getUserbyUserId,
    postUser
} from '../controllers/user.js'

var router = Router();


// 取得暱稱by Token
router.get("/user", getUserbyUserId);
// 新增暱稱
router.post("/user", postUser);


export default router;
