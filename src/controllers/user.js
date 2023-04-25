import { seq } from '../../app.js';


const getUserbyUserId = async (req, res) => {

    let userId = req.query.userId
    console.log('req params: ', userId)

    try {
        const [userInfo, metadata] = await seq.query(`
            SELECT email
            FROM users
            WHERE userId = '${userId}'
        `);
        console.log('UserInfo: ', userInfo)
        let username = userInfo[0].email

        // generate response for api
        let responseTs = Math.floor(new Date().getTime() / 1000);
        const response = {
            name: `${username}`,
            userId: `${userId}`,
            timestamp: `${responseTs}`
        }
        console.log('response: ', response);

        res.json(response)
        res.status(200)
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
}

const postUser = async (req, res) => {

    let username = req.body.name;

    try {
        const [latestUserId, latestUserIdMetadata] = await seq.query(`
            SELECT MAX(id) AS id
            FROM users
        `)
        console.log('latestUserId: ', latestUserId)

        let nextUserId = (latestUserId[0].id + 1).toString()
        
        let writeTs = Math.floor(new Date().getTime() / 1000);
        const [userInfo, metadata] = await seq.query(`
            INSERT INTO users
            (email, password, userId, timestamp)
            VALUES
            ('${username}', '${username}}', '${nextUserId}', '${writeTs}')
        `);


        let responseTs = Math.floor(new Date().getTime() / 1000);
        // generate response for api
        const response = {
            name: `${username}`,
            userId: `${nextUserId}`,
            timestamp: `${responseTs}`
        }

        console.log('response: ', response);

        res.json(response)
        res.status(200)
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
}


export {
    getUserbyUserId,
    postUser
}