import fs from "fs";
import path from "path";
import OpenAI from "openai";


async function createSpeech(text, filePath) {
    const openai = new OpenAI();

    // const speechFile = path.resolve("./speech.mp3");

    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: `${text}`,
    });
    // console.log(speechFile);

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(path.resolve(filePath), buffer);

    return buffer
}

export {
    createSpeech
};