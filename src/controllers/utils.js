import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import axios from "axios";
import fs from "fs";
import { Blob } from "buffer";
import { v4 as uuidv4 } from "uuid";
import videoshow from "videoshow";
import path from "path";
import musicMetadata from "music-metadata";
import OpenAI from "openai";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";

import { seq, auth } from "../../app.js";
import { createSpeech } from "./speech.js";
import { createTranscription } from "./transcription.js";

dotenv.config();

async function chatGPT(prompt, system, openai) {
  console.log("ChatGPT prompt: ", prompt);
  const completion = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  console.log(completion.choices[0].message);

  let response = completion.choices[0].message.content;

  return response;
}

async function gptJson(prompt, system, openai) {
  console.log("JSON prompt: ", prompt);
  const completion = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  console.log(completion.choices[0].message);

  let response = completion.choices[0].message.content;

  return response;
}

async function dalle(prompt, openai) {
  // DALL-E
  const imageResult = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });
  let imageUrl = imageResult.data[0].url;
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

// Microsoft tts start
// const speechApi = async (ssml) => {
//   var data = JSON.stringify({
//     ssml,
//     ttsAudioFormat: "audio-24khz-160kbitrate-mono-mp3",
//     offsetInPlainText: 0,
//     properties: {
//       SpeakTriggerSource: "AccTuningPagePlayButton",
//     },
//   });
//   console.log("speechApi" + data);

//   var config = {
//     method: "post",
//     url: "https://southeastasia.api.speech.microsoft.com/accfreetrial/texttospeech/acc/v3.0-beta1/vcg/speak",
//     responseType: "arraybuffer",
//     headers: {
//       authority: "southeastasia.api.speech.microsoft.com",
//       accept: "*/*",
//       "accept-language": "zh-TW,zh;q=0.9",
//       customvoiceconnectionid: uuidv4(),
//       origin: "https://speech.microsoft.com",
//       "sec-ch-ua":
//         '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
//       "sec-ch-ua-mobile": "?0",
//       "sec-ch-ua-platform": '"Windows"',
//       "sec-fetch-dest": "empty",
//       "sec-fetch-mode": "cors",
//       "sec-fetch-site": "same-site",
//       "user-agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
//       "content-type": "application/json",
//     },

//     data: data,
//   };

//   return new Promise((resolve, reject) => {
//     axios(config)
//       .then(function (response) {
//         resolve(response.data);
//       })
//       .catch(function (error) {
//         console.error(error);
//         reject(error);
//       });
//   });
// };

// function sleep() {
//   return new Promise((resolve) => setTimeout(resolve, 3000));
// }

const getVoice = async (str) => {
  let retry = 0;

  while (retry < 50) {
    try {
      console.log("Speech invocation attempt", retry + 1);
      const result = await speechApi(
        `<speak xmlns="http://www.w3.org/2001/10/synthesis" 
        xmlns:mstts="http://www.w3.org/2001/mstts" 
        xmlns:emo="http://www.w3.org/2009/10/emotionml" 
        version="1.0" 
        xml:lang="en-US">
        <voice name="zh-TW-YunJheNeural">
        <mstts:express-as  style="friendly" >
        <prosody rate="medium" pitch="0%">
        ${str}
        </prosody></mstts:express-as></voice></speak>`
      );
      console.log(result);

      const uint8Array = new Uint8Array(result);
      const concatenatedBuffer = Buffer.concat([result]);
      console.log(uint8Array);

      return uint8Array; // 执行成功，返回结果
    } catch (error) {
      console.error("Speech invocation failed:", error);
      await sleep(); // 暂停一段时间后再重试
    }
    retry++;
  }
  throw new Error(`Speech invocation failed after ${retryCount} retries`); // 重试次数用尽，抛出异常
};
// Microsoft tts end


const getVideo = async (req, res) => {
  var str = req.body.buffer;

  let storyId = req.body.storyId;
  let userId = req.body.userId;

  // 抓所有 messages 的 reply
  // 總結系統
  let query = `
    SELECT initDialog, type, initImage
    FROM stories
    WHERE (id = ${storyId})
    `;
  let dbResponse = await callDB(query);
  let firstDialog = dbResponse[0]["initDialog"];
  let type = dbResponse[0]["type"];

  let query2 = `
    SELECT input, reply
    FROM messages
    WHERE (authorId = '${userId}' AND storyId = ${storyId})
    `;
  let wholeMessage = await callDB(query2);

  wholeMessage.splice(-1, 1);

  let concatenatedText = "";
  for (const item of wholeMessage) {
    concatenatedText += item.input + " " + item.reply;
  }
  let wholeStory = firstDialog + concatenatedText;

  let newWholeStory = wholeStory.replace(/[\r\n]/g, "");

  console.log("WholeStory: ", newWholeStory);

  const delimiters = ["，", "。", "？", ",", ".", "?", "\n"];
  const maxSize = 300;
  console.log("字数过多，正在对文本切片。。。");

  // call chatgpt api
  const configuration = {
    organization: "org-O0J27zQrydIuKDx8csuyhqgH",
    apiKey: process.env.OPENAI_API_KEY,
  };
  const openai = new OpenAI(configuration);

  // 整理所有message段落故事
  let concentrateStory = await chatGPT(
    `"${newWholeStory}"\n------------\n請用400字內，繁體中文，國小二年級的國語程度重新講述上述故事。`,
    "",
    openai
  );

  // const inputValue = "在一片茂密的森林中，有一群熱愛學習的猴子。牠們不僅懂事，還會一起商量如何節省開支，讓大家都能過上好日子。為了照顧牠們飼養的小動物，猴子們決定增加食物供應。"+
  // "他們要照顧的小動物包括老虎、大便、小雞和一些繽紛色彩的寶可夢。為了解決資源不足，猴子們決定尋找傳說中的「智慧果」，這果子能讓動物變得更聰明。" +
  // "在尋找智慧果的過程中，猴子們不得不越過彩虹橋，突破天空的限制。每次成功的冒險都被蓋章在地圖上，代表勇敢的探險。智慧果的核芯有奇妙的力量，能幫助牠們解決養育小動物的難題。"+
  // "作為猴子中的一員，你在猴王的帶領下攀上樹梢，找到了智慧果。果樹旁的魔法藤蔓閃耀著光輝，預示著一場奇幻旅程的開始。你摘下智慧果，利用小型機器將智慧注入食物，為朋友們帶來更多福分。"+
  // "但大便和寶可夢吃完智慧果後變得聰明，卻無法找到可樂果。你決定用神奇露水幫助牠們，混合了智慧果的精華和你的溫暖心意。這股露水可能讓它們找到失落的可樂果。"+
  // "然而，猴子蓋住了最後一顆可樂果，剝奪了大便和寶可夢的機會。但突然間，幻影蜜桃的香氣出現，帶來了轉機。你要如何幫助牠們呢？"+
  // "最終，猴子們以智慧和友情成功說服寶可夢停止破壞地球。整個森林充滿了分享和關懷，每個生命都共同維護家園的和平與安全。"; // 请替换成您的输入文本

  const inputValue = concentrateStory; // 请替换成您的输入文本
  const textHandler = inputValue.split("").reduce(
    (obj, char, index) => {
      obj.buffer.push(char);
      if (delimiters.indexOf(char) >= 0) obj.end = index;
      if (obj.buffer.length === maxSize) {
        obj.res.push(obj.buffer.splice(0, obj.end + 1 - obj.offset).join(""));
        obj.offset += obj.res[obj.res.length - 1].length;
      }
      return obj;
    },
    {
      buffer: [],
      end: 0,
      offset: 0,
      res: [],
    }
  );
  textHandler.res.push(textHandler.buffer.join(""));

  const tasks = textHandler.res;
  console.log("tasks:", tasks);
  console.log("Tasks Length: ", tasks.length);

  // 如果需要处理 buffers，您可以在这里添加相应的代码，这里只包含了文本切片部分的代码示例
  // this.currMp3Buffer = Buffer.concat([this.currMp3Buffer, buffers]);
  // let audioFileName = await getVoice(storyId, userId);
  

  // var allBuffer = Buffer.from("");
  // for (var i = 0; i < tasks.length; i++) {
  //   var buffer = await getVoice(tasks[i]);
  //   var nodeBuffer = Buffer.from(buffer);
  //   allBuffer = Buffer.concat([allBuffer, nodeBuffer]);
  // }

  const currTime = new Date().getTime().toString();
  var naming = `${storyId}_${userId}_` + currTime;

  const filePath = path.join("./", naming + ".mp3");
  //下載音檔 (Microsoft TTS)
  // fs.writeFileSync(path.resolve(filePath), allBuffer);
  // console.log("All Buffer: ", allBuffer);

  // OpenAI TTS
  let allBuffer = await createSpeech(concentrateStory, filePath)

  // OpenAI 音檔轉字幕
  await createTranscription(filePath, naming)

  // 下載圖片
  delete dbResponse[0].type;
  delete dbResponse[0].initDialog;
  dbResponse[0]["imageSrc"] = dbResponse[0]["initImage"];
  delete dbResponse[0]["initImage"];

  let query4 = `
    SELECT imageSrc
    FROM messages
    WHERE(authorId = '${userId}' AND storyId = ${storyId})
    `;
  let historyReply = await callDB(query4);
  historyReply.splice(-1, 1);
  console.log("HHHHSSSSSSSSSSSSSSSSS")
  console.log("History reply: ", historyReply)
  console.log("HHHHEEEEEEEEEEEEEEEEE")

  console.log("DBResponse: ", dbResponse[0]);

  historyReply.unshift(dbResponse[0]);

  async function downloadImage(url, filename) {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    fs.writeFile(filename, response.data, (err) => {
      if (err) throw err;
      console.log("Image downloaded successfully!");
    });
  }

  const imageArray = await historyReply.map(async (imageUrl, index) => {
    let url = imageUrl.imageSrc;
    let result = await downloadImage(url, `${naming}_${index}.png`);
    return `${naming}_${index}.png`;
  });

  const imagePath = await Promise.all(imageArray);
  // images: [path1, path2]
  console.log("ImageArray: ", imagePath);

  // decide loop second
  async function getDuration(buffer) {
    try {
      const metadata = await musicMetadata.parseBuffer(buffer, { duration: true });
      return metadata.format.duration;
    } catch (error) {
      console.log("Error reading metadata: ", error);
      return null;
    }
  }

  let duration = await getDuration(allBuffer);
  console.log("SSSSSSSSSSSSSS")
  console.log("Duration: ", duration)
  console.log("EEEEEEEEEEEEEE")

  var videoOptions = {
    fps: 24,
    // 根據mp3長度除圖片數量決定每張圖持續時間
    loop: duration / 6 + 1, // seconds
    transition: true,
    transitionDuration: 1, // seconds
    videoBitrate: 1024,
    videoCodec: "libx264",
    size: "640x?",
    audioBitrate: "128k",
    audioChannels: 2,
    audio: {
      fade: false, // 禁用聲音漸入漸出
      fadeIn: 0, // 設置聲音漸入時間（毫秒）
      fadeOut: 0, // 設置聲音漸出時間（毫秒）
    },
    format: "mp4",
    pixelFormat: "yuv420p",
  };

  videoshow(imagePath, videoOptions)
    .audio(`${naming}.mp3`)
    .subtitles(`${naming}.srt`)
    .save(`${naming}.mp4`)
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
          console.log("Sign In successfully !");
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
        });

      // Get a reference to the storage service, which is used to create references in your storage bucket
      const storage = getStorage();
      // Create a reference to 'mountains.jpg'
      const videoRef = ref(storage, `/video/${naming}.mp4`);

      let videoFile = fs.readFileSync(`${naming}.mp4`);

      const videoBlob = new Blob([videoFile]); // JavaScript Blob
      console.log("blob: ", videoBlob);
      let copyVideoBlob = await videoBlob.arrayBuffer();

      // 'file' comes from the Blob or File API
      await uploadBytes(videoRef, copyVideoBlob).then(async (snapshot) => {
        console.log("Uploaded a blob or file!");
        // get download url
        await getDownloadURL(videoRef).then((url) => {
          let downloadUrl = url;

          let response = [
            {
              videoSrc: `${downloadUrl}`,
            },
          ];

          // delete png
          for (let i = 0; i < imagePath.length; i++) {
            fs.unlinkSync(imagePath[i]);
            console.log("Delete File successfully.");
          }
          // delete mp3, mp4
          fs.unlinkSync(`${naming}.mp3`);
          fs.unlinkSync(`${naming}.mp4`);
          fs.unlinkSync(`${naming}.srt`);

          res.json(response);
          res.status(200);
        });
      });
    });
};

const importWorkSheet = async (req, res) => {
  //transformer
  const XLSX = require("xlsx");
  //name
  const workbook = XLSX.readFile("題目DB.xlsx");
  //sheet
  const worksheet = workbook.Sheets["工作表1"];

  const arrData = XLSX.utils.sheet_to_json(worksheet);

  //insert arrData in SQL
  // console.log(arrData);

  // get out arrData information
  for (const data of arrData) {
    const id = data["story_id"];
    const detail = data["part_detail"];

    console.log(id);
    console.log(detail);
  }
};

export {
  chatGPT,
  gptJson,
  dalle,
  callDB,
  downloadImageToBuffer,
  getBlobImage,
  uploadImage,
  getVoice,
  getVideo,
};
