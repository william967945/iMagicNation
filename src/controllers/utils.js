import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { seq } from "../../app.js";
import axios from "axios";


dotenv.config();

async function chatGPT(prompt, system, openai) {
    console.log("ChatGPT prompt: ", prompt);
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
        ],
    });
    console.log(completion.data.choices[0].message);

    let response = completion.data.choices[0].message.content;

    return response;
}

async function dalle(prompt, openai) {
    // DALL-E
    const imageResult = await openai.createImage({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url"
    });
    let imageUrl = imageResult.data.data[0].url;
    console.log('imageUrl: ', imageUrl);

    // let imageUrl = "Taking a rest!";
    return imageUrl;
}

async function callDB(sql) {
    const [dbResult, metadata] = await seq.query(sql);
    console.log("dbResult: ", dbResult);

    return dbResult;
}

async function downloadImageToBuffer(url) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(response.data, 'binary');

    return buffer;
}

const getBlobImage = async (req, res) => {
    try {
        let id = req.body.id;

        let sql = `
        SELECT blobImage 
        FROM messages
        WHERE (id = '${id}')
        `
        console.log('sql: ', sql)
        const [dbResult, metadata] = await seq.query(sql);
        console.log("dbResult: ", dbResult);

        let blobImage = dbResult[0]['blobImage'];
        // blob to base64
        let base64Image = Buffer.from(blobImage).toString('base64')
        console.log('base64Image: ', base64Image)
        let response = [
            {
                base64Image: base64Image
            }
        ]
        res.json(response);
        res.status(200);
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
}




export {
    chatGPT,
    dalle,
    callDB,
    downloadImageToBuffer,
    getBlobImage
}

