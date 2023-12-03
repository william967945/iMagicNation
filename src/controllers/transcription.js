import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import fs from "fs";
import OpenAI from "openai";
import path from "path";

import {
    chatGPT,
  } from "./utils.js";

dotenv.config();

async function createTranscription(filename, naming) {
    // call chatgpt api
    const configuration = {
        organization: "org-O0J27zQrydIuKDx8csuyhqgH",
        apiKey: process.env.OPENAI_API_KEY,
    };
    const openai = new OpenAI(configuration);

    const zh_tw_transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(`${filename}`),
        model: "whisper-1",
        response_format: "srt",
        prompt: "請將上述srt文字轉換成繁體中文後，原封不動的回傳。"
    });

    // console.log("Transcription: ", transcription);

    // 將字幕轉換成繁體中文
    // let zh_tw_transcription = await chatGPT(
    //     `${transcription}\n------------\n請將上述srt文字轉換成繁體中文後，原封不動的回傳。`,
    //     "",
    //     openai
    // );

    const srtFilePath = path.join("./", naming + ".srt");
    await fs.promises.writeFile(path.resolve(srtFilePath), zh_tw_transcription);

}

export {
    createTranscription
};