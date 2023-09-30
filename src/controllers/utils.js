import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import axios from "axios";
import fs from 'fs';
import { Blob } from "buffer";
import { v4 as uuidv4 } from 'uuid';
import videoshow from "videoshow";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

import { seq, auth } from "../../app.js";


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
        response_format: "url",
    });
    let imageUrl = imageResult.data.data[0].url;
    console.log("imageUrl: ", imageUrl);

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
        method: "GET",
        responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data, "binary");

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
    console.log("blob: ", blob);
    let copyBlob = await blob.arrayBuffer();

    let downloadUrl = "";
    // 'file' comes from the Blob or File API
    await uploadBytes(imageRef, copyBlob)
        .then(async (snapshot) => {
            console.log("Uploaded a blob or file!");
            // get download url
            await getDownloadURL(imageRef)
                .then((url) => {
                    downloadUrl = url;
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    console.log(errorCode);
                    console.log(errorMessage);
                });
        })
        .catch((error) => {
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
        `;
        console.log("sql: ", sql);
        const [dbResult, metadata] = await seq.query(sql);
        console.log("dbResult: ", dbResult);

        let blobImage = dbResult[0]["blobImage"];
        // blob to base64
        let base64Image = Buffer.from(blobImage).toString("base64");
        console.log("base64Image: ", base64Image);
        let response = [
            {
                base64Image: base64Image,
            },
        ];
        res.json(response);
        res.status(200);
    } catch (error) {
        console.log(error);
        console.log("ERROR!!");
        res.send(error);
    }
};

const speechApi = async (ssml) => {
    var data = JSON.stringify({
        ssml,
        ttsAudioFormat: "audio-24khz-160kbitrate-mono-mp3",
        offsetInPlainText: 0,
        properties: {
            SpeakTriggerSource: "AccTuningPagePlayButton",
        },
    });
    console.log("speechApi" + data);

    var config = {
        method: "post",
        url: "https://southeastasia.api.speech.microsoft.com/accfreetrial/texttospeech/acc/v3.0-beta1/vcg/speak",
        responseType: "arraybuffer",
        headers: {
            authority: "southeastasia.api.speech.microsoft.com",
            accept: "/",
            "accept-language": "zh-CN,zh;q=0.9",
            customvoiceconnectionid: uuidv4(),
            origin: "https://speech.microsoft.com/",
            "sec-ch-ua":
                '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
            "content-type": "application/json",
        },

        data: data,
    };

    return new Promise((resolve, reject) => {
        axios(config)
            .then(function (response) {
                resolve(response.data);
            })
            .catch(function (error) {
                console.error(error);
                reject(error);
            });
    });
};

function sleep() {
    return new Promise((resolve) => setTimeout(resolve, 3000));
}


const getVoice = async (req, res) => {
    var str = req.body.str;
    let retry = 0;
    while (retry < 50) {
        try {
            console.log("Speech invocation attempt", retry + 1);
            const result = await speechApi(
                ` <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="zh-CN-YunxiNeural"><mstts:express-as  style="Default" ><prosody rate="0%" pitch="0%">${str}</prosody></mstts:express-as></voice></speak> `
            );
            console.log(result);
            const currTime = new Date().getTime().toString();
            const filePath = path.join("./", currTime + ".mp3");
            const uint8Array = new Uint8Array(result);

            const nodeBuffer = Buffer.from(uint8Array);
            console.log(nodeBuffer);
            //   下載音檔
            //   fs.writeFileSync(path.resolve(filePath), nodeBuffer);

            console.log(uint8Array);

            res.type("application/octet-stream").send(uint8Array);
            return result; // 执行成功，返回结果
        } catch (error) {
            console.error("Speech invocation failed:", error);
            await sleep(); // 暂停一段时间后再重试
        }
        retry++;
    }
    throw new Error(`Speech invocation failed after ${retry} retries`); // 重试次数用尽，抛出异常
};

const getVideo = async (req, res) => {
    var str = req.body.buffer;

    var videoOptions = {
        fps: 25,
        loop: 5, // seconds
        transition: true,
        transitionDuration: 1, // seconds
        videoBitrate: 1024,
        videoCodec: "libx264",
        size: "640x?",
        audioBitrate: "128k",
        audioChannels: 2,
        format: "mp4",
        pixelFormat: "yuv420p",
    };

    let videoName = "titoktest"
    // images: [url1, url2] or [path1, path2]
    videoshow(['image.png', 'image_2.png'], videoOptions)
        .audio("./audio.mp3")
        .save(`${videoName}.mp4`)
        .on("start", function (command) {
            console.log("ffmpeg process started:", command);
        })
        .on("error", function (err, stdout, stderr) {
            console.error("Error:", err);
            console.error("ffmpeg stderr:", stderr);
        })
        .on("end", async function (output) {
            console.error("Video created in:", output);
            await signInAnonymously(auth)
                .then(async () => {
                    // Signed in..
                    console.log("Sign In successfully !")
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                });

            // Get a reference to the storage service, which is used to create references in your storage bucket
            const storage = getStorage();
            // Create a reference to 'mountains.jpg'
            const videoRef = ref(storage, `/video/${videoName}.mp4`);

            let videoFile = fs.readFileSync(`${videoName}.mp4`);

            const videoBlob = new Blob([videoFile]); // JavaScript Blob
            console.log("blob: ", videoBlob)
            let copyVideoBlob = await videoBlob.arrayBuffer();

            // 'file' comes from the Blob or File API
            await uploadBytes(videoRef, copyVideoBlob).then(async (snapshot) => {
                console.log('Uploaded a blob or file!');
                // get download url
                await getDownloadURL(videoRef).then((url) => {
                    let downloadUrl = url

                    let response = [
                        {
                            videoSrc: `${downloadUrl}`,
                        }
                    ]
                    res.json(response);
                    res.status(200);
                })
            });
        })

};

export {
    chatGPT,
    dalle,
    callDB,
    downloadImageToBuffer,
    getBlobImage,
    uploadImage,
    getVoice,
    getVideo,
};
