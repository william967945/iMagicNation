import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import axios from "axios";

import { Blob } from "buffer";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
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
        size: "512x512",
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

async function uploadImage(imageUrl, userId, storyId, messageCount) {
    // Get a reference to the storage service, which is used to create references in your storage bucket
    const storage = getStorage();
    // Create a reference to 'mountains.jpg'
    const imageRef = ref(storage, `${userId}_${storyId}_${messageCount}.png`);

    // 轉換成 Buffer
    let bufferData = await downloadImageToBuffer(imageUrl);
    // fs.writeFileSync('image.png', bufferData);
    // let imageFile = fs.readFileSync('image.png');

    const blob = new Blob([bufferData]); // JavaScript Blob
    console.log("blob: ", blob)
    let copyBlob = await blob.arrayBuffer();

    let downloadUrl = "";
    // 'file' comes from the Blob or File API
    await uploadBytes(imageRef, copyBlob).then(async (snapshot) => {
        console.log('Uploaded a blob or file!');
        // get download url
        await getDownloadURL(imageRef).then((url) => {
            downloadUrl = url
        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode);
            console.log(errorMessage);
        });
    }).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode);
        console.log(errorMessage);
    });
    console.log("End of uploading !");

    return downloadUrl;
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
    getBlobImage,
    uploadImage
}

