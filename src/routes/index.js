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

router.post('/story/user/reply', userReply);


export default router;
