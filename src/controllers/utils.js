import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { seq } from "../../app.js";


dotenv.config();

async function chatGPT(prompt, system, openai) {
    console.log("ChatGPT prompt: ", prompt);
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
        ],
        temperature: 1
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

export {
    chatGPT,
    dalle,
    callDB
}

