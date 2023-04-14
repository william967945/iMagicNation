import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { or } from "sequelize";

dotenv.config();


const userReply = async (req, res) => {
    try {
        // auth
        let apiKey = req.headers.apikey;
        let secret = req.headers.secret;
        let openaiApiKey = req.headers.bearer;
        console.log('apiKey: ', apiKey)
        console.log('secret: ', secret)
        console.log('openaiApiKey: ', openaiApiKey)
        if (apiKey === 'S_202304140629871681424970') {
            if (secret !== '7CEB8CF4BBAD69F6B67889B90F6474BAF542B4AD') {
                res.json({
                    "message": "Wrong secret!!"
                })
                res.status(400)
                throw new Error('Wrong secret!!');
                
                
            }
        } else {
            res.json({
                "message": "No apiKey exist!!"
            })
            res.status(400)
            throw new Error('No apiKey exist!!');
        }


        // 接收使用者回覆
        let storyTitle = req.body.title;
        let userToken = req.body.token;
        let reply = req.body.reply;
        let timestamp = req.body.timestamp;

        // call chatgpt api
        const configuration = new Configuration({
            organization: "org-O0J27zQrydIuKDx8csuyhqgH",
            apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);

        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `${reply}` }],
        });
        console.log(completion.data.choices[0].message);

        // call dalle api

        let prompt = reply + ', cartoon, digital art, full hd, cutey'
        const imageResult = await openai.createImage({
            prompt: `${prompt}`,
            n: 1,
            size: "256x256",
        });
        const imageUrl = imageResult.data.data[0].url;
        console.log(imageUrl);

        let currentTs = new Date()
        // generate response for api
        const response = {
            message: "ok",
            remainCount: 'infinite',
            title: "奶奶的花",
            token: "Base64(sha256)",
            chatGPTResponse: completion.data.choices[0].message,
            image: `${imageUrl}`,
            timestamp: currentTs
        }

        console.log('response: ', response);

        res.json(response)
        res.status(200)
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
};
//
const getOrder = async (req, res) => {
    const orderId = req.params.orderId;
    console.log('orderId: ', orderId);
    const [results, metadata] = await seq.query(`SELECT * from Orders WHERE orderId = ${orderId}`);
    console.log('Orders list: ', results);

    let finalItemArray = [];
    let itemArray = results[0].itemId.split(':');
    for (let i = 0; i < itemArray.length; i++) {
        const [itemName, metadata2] = await seq.query(`SELECT * from Menu WHERE menuId = ${itemArray[i]}`);
        let itemTitle = itemName[0].title;
        console.log('itemName: ', itemTitle);
        finalItemArray.push(itemTitle);
    }
    results[0].itemId = finalItemArray.toString();
    const response = {
        result: results,
        message: 'OK'
    }
    try {
        res.json(response)
        res.status(200)
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
};

const postOrder = async (req, res) => {
    console.log('req data: ', req.body);
    try {
        let customerId = req.body.customer_id;
        let amount = req.body.amount;
        let mealType = req.body.mealType;
        let paymentType = req.body.paymentType;
        let itemId = req.body.itemId;

        orderId++;
        orderNumber++;
        const [results, metadata] = await seq.query(`INSERT INTO Orders VALUES (${orderId},'accepted','${customerId}', '${amount}', '${mealType}','${paymentType}','${itemId}', '${orderNumber}')`);
        console.log('Orders list: ', results);
        const response = {
            orderId: orderId.toString(),
            orderNumber: orderNumber,
            message: 'OK'
        }

        res.json(response)
        res.status(200)
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
};





export {
    userReply,
    getOrder,
    postOrder
}