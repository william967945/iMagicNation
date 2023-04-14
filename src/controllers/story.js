import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config();

const configuration = new Configuration({
    organization: "org-O0J27zQrydIuKDx8csuyhqgH",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// chat gpt
// const completion = await openai.createChatCompletion({
//     model: "gpt-3.5-turbo",
//     messages: [{role: "user", content: "Hello world"}],
//   });
//   console.log(completion.data.choices[0].message);


// dalle
// const response = await openai.createImage({
//     prompt: "奶奶在花園裡種花，弟弟也陪著她一起澆水",
//     n: 1,
//     size: "1024x1024",
// });
// const image_url = response.data.data[0].url;

// console.log(image_url);


const userReply = async (req, res) => {
    try {
        // 接收使用者回覆
        let storyTitle = req.body.title;
        let userToken = req.body.token;
        let reply = req.body.reply;
        let timestamp = req.body.timestamp;

        // call chatgpt api
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