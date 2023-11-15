import OpenAI from "openai";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { Blob } from "buffer";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInAnonymously } from "firebase/auth";
import { seq, auth } from "../../app.js";
import {
  chatGPT,
  gptJson,
  dalle,
  callDB,
  downloadImageToBuffer,
  uploadImage,
} from "./utils.js";
import axios from "axios";

dotenv.config();

// var qualityBoosterPrompt = ", 128-bit Pixel Art, 128-bit Pixel Art, 128-bit Pixel Art, 128-bit Pixel Art, 128-bit Pixel Art";
var qualityBoosterPrompt =
  ", pixel art, Detailed pixel art, 128-bit Pixel Art, 128-bit Art, Pixelized Style, minecraft";

const callChatGPT = async (req, res) => {
  try {
    let openaiApiKey = req.headers.bearer;

    let storyId = req.body.storyId;
    let userId = req.body.userId;
    let input = req.body.input;

    console.log("-----");
    console.log(storyId);
    console.log(userId);
    console.log(input);
    console.log("-----");

    // Sign in Firebase
    await signInAnonymously(auth)
      .then(async () => {
        // Signed in..
        console.log("Sign In successfully !");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
      });

    let query = `
    SELECT COUNT(id)
    FROM messages
    WHERE (authorId = '${userId}' AND storyId = '${storyId}')
    `;
    let dbResponse = await callDB(query);
    let messageCount = dbResponse[0]["COUNT(id)"];

    if (messageCount === 0 && input === "") {
      // 第一次 input
      // 讀取 stories table 的 initDialog, initImage

      let query = `
      SELECT initDialog, initImage, title, type
      FROM stories
      WHERE (id = ${storyId})
      `;
      let dbResponse = await callDB(query);

      // 回傳 initDialog, initImage
      let response = dbResponse;

      res.json(response);
      res.status(200);
    } else {
      // 課綱故事區count預設10次,素養5次
      /*
        用 storyId 查 type 是"素養"(count = 5)還是"課綱故事區"(count = 10)
        假如 count = 2 (沒觸發評分系統)
        Call ChatGPT, Dalle
        ChatGPT 的 reply, Dalle 的 imageSrc 寫到 DB 
        回傳 input, reply, imageSrc
      */
      // call chatgpt api
      const configuration = {
        organization: "org-O0J27zQrydIuKDx8csuyhqgH",
        apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
      };
      const openai = new OpenAI(configuration);

      if (messageCount >= 4) {
        if (messageCount < 5) {
          // 總結系統
          let query = `
          SELECT initDialog, type
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

          let concatenatedText = "";
          for (const item of wholeMessage) {
            concatenatedText += item.input + " " + item.reply + "\n\n";
          }
          let wholeStory = firstDialog + "\n" + concatenatedText;
          console.log(wholeStory);
          let questions = null;
          if (type !== "小說" && type !== "") {
            // 抓 word, phrase
            // 把 type 對應的 word, phrase 抓出來
            let content_query = `
            SELECT word, phrase
            FROM content
            WHERE (type = '${type}')
            `;
            let contentResult = await callDB(content_query);
            let word = contentResult[0]["word"];
            let phrase = contentResult[0]["phrase"];
            console.log("Word: ", word);
            console.log("Phrase: ", phrase);
            let word_array = word.split(" ");
            let wordsWithComma = word_array.join(",");
            let phrase_array = phrase.split(" ");
            let phrasesWithComma = phrase_array.join(",");

            var endingQuestion = await chatGPT(
              `${wholeStory}我:${input}\n------------\n請用繁體中文以大約50字上下，根據上述的劇情完成故事結尾`,
              "你是一位專門寫故事給國小學生的編劇。",
              openai
            );
            questions = await gptJson(
              `請用繁體中文利用提供的國字與詞語提出三個填空題，內容須滿足以下要求:\n\n1. 填空題的出題形式為: 三題填空題"一定要使用"第二點列出的國字、第三點的詞語出題，並將出現的國字與詞語挖空讓學生填寫。每題只有一個填空。填空題不需要跟上述劇情相關。最後不需要顯示答案。\n\n2. 國字: ${wordsWithComma}\n\n3. 詞語: ${phrasesWithComma}\n\n4. 在出填空題時須使用適合國小六年級學生程度的詞彙及句子進行出題，不能有語意艱澀難懂或違反字詞原本意思的句子，且句子要符合大眾常識，符合中文語法。 JSON 結構如下 {
                "words": "",
                "phrases": "",
                "question1": "",
                "question2": "",
                "question3": ""
              }`,
              "你是一位專門寫故事給國小學生的編劇。",
              openai
            );

            console.log(questions);

            var dallePrompt = await chatGPT(
              `${endingQuestion}\n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
              "You are a DALL-E prompt engineer.",
              openai
            );
          } else {
            var endingQuestion = await chatGPT(
              `${wholeStory}我:${input}\n------------\n請用繁體中文根據上述的劇情完成50字的故事結尾並提出一個道德觀念題。`,
              "你是一位專門寫故事給國小學生的編劇。",
              openai
            );
            var dallePrompt = await chatGPT(
              `${endingQuestion}\n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
              "You are a DALL-E prompt engineer.",
              openai
            );
          }

          let prompt = dallePrompt + qualityBoosterPrompt;
          let imageUrl = await dalle(prompt, openai);

          // upload image
          let downloadUrl = await uploadImage(
            imageUrl,
            userId,
            storyId,
            messageCount
          );

          // 寫入 DB (input, reply, imageSrc, storyId, authorId)
          let query3 = `
          INSERT INTO messages (input, reply, imageSrc, storyId, authorId, questions)
          VALUES ('${input}', '${endingQuestion}', '${downloadUrl}', '${storyId}', '${userId}', '${questions}')
          `;
          let dbResult = await callDB(query3);
          console.log("DBresult: ", dbResult);

          let query4 = `
          SELECT input, reply, imageSrc
          FROM messages
          WHERE (authorId = '${userId}' AND storyId = ${storyId})
          `;
          let historyReply = await callDB(query4);

          // generate response for api
          let response = historyReply;

          res.json(response);
          res.status(200);
        } else {
          // messageCount >= 5, 觸發評分系統

          let query = `
          SELECT questions
          FROM messages
          WHERE authorId = '${userId}' AND storyId = ${storyId} AND id = (SELECT MAX(id) FROM messages WHERE authorId = '${userId}' AND storyId = ${storyId})
          `;
          let lastReply = await callDB(query);
          console.log("lastReply: ", lastReply);
          let previousReply = lastReply[0]["questions"];

          let finalScore = await chatGPT(
            `問題: ${previousReply}\n\n我的回答: ${input}\n------------\n請用繁體中文依據"學生的回答"與"問題"的"相關性、契合度、完整性"給出0到100之間的分數並說明理由。格式如下:\n參考分數: <你的分數>\n參考評語: <你的評語>\n\n#lang: zh-tw`,
            "You are a teacher in elementary school.",
            openai
          );
          let dallePrompt = await chatGPT(
            `${finalScore}\n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
            "You are a DALL-E prompt engineer.",
            openai
          );
          console.log("199");
          let prompt = dallePrompt + qualityBoosterPrompt;
          let imageUrl = await dalle(prompt, openai);

          // upload image
          let downloadUrl = await uploadImage(
            imageUrl,
            userId,
            storyId,
            messageCount
          );

          let response = [
            {
              input: `${input}`,
              reply: `${finalScore}`,
              imageSrc: `${downloadUrl}`,
            },
          ];

          // 寫入 DB (input, reply, imageSrc, storyId, authorId)
          let query2 = `
          INSERT INTO messages (input, reply, imageSrc, storyId, authorId)
          VALUES ('${input}', '${finalScore}', '${downloadUrl}', '${storyId}', '${userId}')
          `;
          let dbResult = await callDB(query2);
          console.log("DBresult: ", dbResult);

          res.json(response);
          res.status(200);
        }
      } else {
        // 抓上一次的reply 沒有就抓 stories table 的 initDialog
        // 抓故事對應的 type ex. 一上康軒第一課
        let previousReply = "";
        let type = ""; // type: 一上康軒第一課
        let word = "";
        let phrase = "";

        let query = `
          SELECT initDialog, type
          FROM stories
          WHERE (id = ${storyId})
          `;
        let initDialog = await callDB(query);
        console.log("initDialog: ", initDialog);
        previousReply = initDialog[0]["initDialog"];
        type = initDialog[0]["type"];
        if (messageCount === 0) {
          // 設定有無課綱內容的條件
          // 有課綱內容條件
          if (type !== "小說" && type !== "") {
            // 把 type 對應的 word, phrase 抓出來
            let content_query = `
            SELECT word, phrase
            FROM content
            WHERE (type = '${type}')
            `;
            let contentResult = await callDB(content_query);
            word = contentResult[0]["word"];
            phrase = contentResult[0]["phrase"];
            console.log("Word: ", word);
            console.log("Phrase: ", phrase);
          }
        } else {
          // messageCount !== 0
          if (type !== "小說" && type !== "") {
            var queryA = `
            SELECT reply, word, phrase
            FROM messages
            WHERE authorId = '${userId}' AND storyId = ${storyId} AND id = (SELECT MAX(id) FROM messages WHERE authorId = '${userId}' AND storyId = ${storyId})
            `;
            let lastReply = await callDB(queryA);
            console.log("lastReply: ", lastReply);
            previousReply = lastReply[0]["reply"];
            word = lastReply[0]["word"];
            phrase = lastReply[0]["phrase"];
          } else {
            var queryA = `
            SELECT reply
            FROM messages
            WHERE authorId = '${userId}' AND storyId = ${storyId} AND id = (SELECT MAX(id) FROM messages WHERE authorId = '${userId}' AND storyId = ${storyId})
            `;
            let lastReply = await callDB(queryA);
            console.log("lastReply: ", lastReply);
            previousReply = lastReply[0]["reply"];
          }
        }

        // 分成 課綱內容 prompt 及 小說 prompt
        if (type !== "小說" && type !== "") {
          // 課綱內容 prompt
          // 將 word, phrase 轉換成 array
          let word_array = word.split(" ");
          let phrase_array = phrase.split(" ");
          console.log("Word_Array: ", word_array);
          console.log("Phrase_Array: ", phrase_array);

          // 隨機抓取 array 裡的 word, phrase
          // 抓 Word
          console.log("selectWord count: ", word_array.length / 5);
          let new_word_array = [];
          let finalWord = "";

          for (
            let index = 0;
            index < Math.ceil(word_array.length / 4);
            index++
          ) {
            let selectedWord = "";

            if (index === 0) {
              selectedWord =
                word_array[Math.floor(Math.random() * word_array.length)];
              console.log("selected word: ", selectedWord);
              finalWord = finalWord.concat(", ", selectedWord);
              new_word_array = new_word_array.concat(word_array);
            } else {
              selectedWord =
                new_word_array[
                  Math.floor(Math.random() * new_word_array.length)
                ];
              console.log("selected word: ", selectedWord);
              finalWord = finalWord.concat(", ", selectedWord);
            }
            new_word_array = new_word_array.filter(function (word) {
              return word !== selectedWord;
            });
            console.log("iter_word_array: ", new_word_array);
          }

          var message_word = new_word_array.join(" ");
          const [_, ...rest] = finalWord.split(",");
          const finalWordWithoutFirstComma = rest.join(",");

          // 抓 Phrase
          console.log("selectPhrase count: ", phrase_array.length / 5);
          let new_phrase_array = [];
          let finalPhrase = "";

          for (
            let index = 0;
            index < Math.ceil(phrase_array.length / 4);
            index++
          ) {
            let selectedPhrase = "";

            if (index === 0) {
              selectedPhrase =
                phrase_array[Math.floor(Math.random() * phrase_array.length)];
              console.log("selected Phrase: ", selectedPhrase);
              finalPhrase = finalPhrase.concat(", ", selectedPhrase);
              new_phrase_array = new_phrase_array.concat(phrase_array);
            } else {
              selectedPhrase =
                new_phrase_array[
                  Math.floor(Math.random() * new_phrase_array.length)
                ];
              console.log("selected Phrase: ", selectedPhrase);
              finalPhrase = finalPhrase.concat(", ", selectedPhrase);
            }
            new_phrase_array = new_phrase_array.filter(function (Phrase) {
              return Phrase !== selectedPhrase;
            });
            console.log("iter_Phrase_array: ", new_phrase_array);
          }

          var message_phrase = new_phrase_array.join(" ");
          const [_2, ...rest2] = finalPhrase.split(",");
          const finalPhraseWithoutFirstComma = rest2.join(",");

          console.log("這次選擇的國字: ", finalWordWithoutFirstComma);
          console.log("這次選擇的詞語: ", finalPhraseWithoutFirstComma);

          // 對 chatGPT 提供素材生成故事
          let element = await chatGPT(
            `"${previousReply}我:${input}"\n------------\n請隨機提供一個跟上述內容風格有關的名詞。不能跟內容重複。`,
            "",
            openai
          );
          var chatgptResponse = await chatGPT(
            `"${previousReply}我:${input}"\n------------\n請用繁體中文根據上述的故事內容續寫50字的第二人稱文字劇情。續寫的內容須滿足以下要求: \n\n1.故事內容須和「${input}」相關\n2.必須包含指定名詞「${element}」\n3.必須使用到國字「${finalWordWithoutFirstComma}」\n4.必須使用到詞語「${finalPhraseWithoutFirstComma}」\n5.在劇情結尾問主角接下來的行動\n6.使用適合國小六年級學生程度的詞彙及句子，不能有語意艱澀難懂或違反字詞原本意思的句子`,
            "你是一位專門寫故事給國小學生的編劇。",
            openai
          );
          var dallePrompt = await chatGPT(
            `${chatgptResponse} \n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
            "You are a DALL-E prompt engineer.",
            openai
          );
        } else {
          // 小說 prompt
          // 對 chatGPT 提供素材生成故事
          let element = await chatGPT(
            `"${previousReply}我:${input}"\n------------\n請隨機提供一個跟上述內容風格有關的名詞。不能跟內容重複。`,
            "",
            openai
          );
          var chatgptResponse = await chatGPT(
            `"${previousReply}\n我:${input}"\n------------\n請用繁體中文根據上述的故事內容繼續發展50字的第二人稱文字小說。續寫的內容須滿足以下要求: \n\n1.故事內容須和「${input}」相關\n2.必須包含指定名詞「${element}」\n3.在劇情結尾問主角接下來的行動\n4.使用適合國小六年級學生程度的詞彙及句子，不能有語意艱澀難懂或違反字詞原本意思的句子`,
            "你是一位專門寫故事給國小學生的編劇。",
            openai
          );
          var dallePrompt = await chatGPT(
            `${chatgptResponse} \n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
            "You are a DALL-E prompt engineer.",
            openai
          );
        }

        let prompt = dallePrompt + qualityBoosterPrompt;
        let imageUrl = await dalle(prompt, openai);

        let downloadUrl = await uploadImage(
          imageUrl,
          userId,
          storyId,
          messageCount
        );

        if (type !== "小說" && type !== "") {
          var writeReplyQuery = `
          INSERT INTO messages(input, reply, imageSrc, storyId, authorId, word, phrase)
            VALUES('${input}', '${chatgptResponse}', '${downloadUrl}', '${storyId}', '${userId}', '${message_word}', '${message_phrase}')
              `;
        } else {
          var writeReplyQuery = `
          INSERT INTO messages(input, reply, imageSrc, storyId, authorId)
            VALUES('${input}', '${chatgptResponse}', '${downloadUrl}', '${storyId}', '${userId}')
              `;
        }

        let dbResult = await callDB(writeReplyQuery);
        console.log("DBresult: ", dbResult);

        // 把之前的故事記錄全部抓出來
        let query2 = `
        SELECT input, reply, imageSrc
        FROM messages
            WHERE(authorId = '${userId}' AND storyId = ${storyId})
          `;
        let historyReply = await callDB(query2);
        // console.log("historyReply: ", historyReply);

        // generate response for api
        let response = historyReply;

        res.json(response);
        res.status(200);
      }
    }
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }
};

const getAllPrivateStory = async (req, res) => {};

const getAllStory = async (req, res) => {
  const [results, metadata] = await seq.query(`SELECT * from stories`);
  res.status = 200;
  res.send(results);
};

const getStoryByTitleOrType = async (req, res) => {
  if (req.query.title === undefined && req.query.type === undefined) {
    res.send({ err: "invalid api" });
  } else if (req.query.title !== undefined) {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM stories WHERE title = '${req.query.title}'`
      );

      if (results.length === 0) {
        res.send({ err: `story not found.Title: ${req.query.title} ` });
      } else {
        res.status = 200;
        res.send(results);
      }
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  } else {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM stories WHERE type = '${req.query.type}'`
      );

      if (results.length === 0) {
        res.send({ err: `story not found.Type: ${req.query.type} ` });
      } else {
        res.status = 200;
        res.send(results);
      }
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  }
};

const getStoryByStoryId = async (req, res) => {
  if (req.query.storyId === undefined) {
    res.send({ err: "invalid api" });
  } else {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM stories WHERE id = '${req.query.storyId}'`
      );

      if (results.length === 0) {
        res.send({ err: `story not found.storyId: ${req.query.storyId} ` });
      } else {
        res.status = 200;
        res.send(results);
      }
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  }
};

const getStoryProgress = async (req, res) => {
  try {
    let storyId = req.body.storyId;
    let userId = req.body.userId;
    console.log("-----");
    console.log(storyId);
    console.log(userId);
    console.log("-----");

    const [storyProgress, metadata] = await seq.query(`
      SELECT input, reply
      FROM messages
            WHERE(authorId = '${userId}' AND storyId = ${storyId})
    `);
    console.log("storyProgress: ", storyProgress);

    // let rowDeleted = result.affectedRows;
    res.send(storyProgress);
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }
};

const postStoryProgressByUser = async (req, res) => {
  if (req.body.storyId === undefined && req.body.userId === undefined) {
    res.send({ err: "invalid api" });
  } else {
    try {
      const [results, metadata] = await seq.query(
        `DELETE FROM messages WHERE storyId = '${req.body.storyId}' AND userId = '${req.body.userId} AND remainCount < '${req.body.remainCount} ')`
      );
      res.status = 200;
      res.send({ userId: req.body.userId, storyId: req.body.storyId });
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  }
};

const resetStory = async (req, res) => {
  try {
    let storyId = req.body.storyId;
    let userId = req.body.userId;
    console.log("-----");
    console.log(storyId);
    console.log(userId);
    console.log("-----");

    const [result, metadata] = await seq.query(`
            DELETE FROM messages
            WHERE (authorId = '${userId}' AND storyId = ${storyId})
            `);
    console.log("Result: ", result);

    let rowDeleted = result.affectedRows;

    if (rowDeleted === 0) {
      res.send({
        err: "No message deleted.",
        storyId: `${storyId}`,
        userId: `${userId}`,
      });
    } else {
      res.send({
        deletedRows: `${rowDeleted}`,
        storyId: `${storyId}`,
        userId: `${userId}`,
      });
    }
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }
};

const dallePromptTest = async (req, res) => {
  try {
    let openaiApiKey = req.headers.bearer;
    let input = req.body.input;

    let storyId = req.body.storyId;
    let partId = req.body.partId;

    // call chatgpt api
    const configuration = new Configuration({
      organization: "org-O0J27zQrydIuKDx8csuyhqgH",
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    let dallePrompt = await chatGPT(
      `${input}\n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."`,
      "You are a DALL-E prompt engineer.",
      openai
    );

    // let prompt = dallePrompt + ", pixel art, Detailed pixel art, 128-bit Pixel Art, 128-bit Art, Pixelized Style, minecraft";
    let prompt = dallePrompt + qualityBoosterPrompt;

    let imageUrl = await dalle(prompt, openai);

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
    const imageRef = ref(storage, `ethic_${storyId}_${partId}.png`);

    // 轉換成 Buffer
    let bufferData = await downloadImageToBuffer(imageUrl);
    // fs.writeFileSync('image.png', bufferData);
    // let imageFile = fs.readFileSync('image.png');

    const blob = new Blob([bufferData]); // JavaScript Blob
    console.log("blob: ", blob);
    let copyBlob = await blob.arrayBuffer();
    // 'file' comes from the Blob or File API
    uploadBytes(imageRef, copyBlob).then((snapshot) => {
      console.log("Uploaded a blob or file!");
      // get download url
      getDownloadURL(imageRef).then((url) => {
        let downloadUrl = url;

        let response = [
          {
            input: `${input}`,
            prompt: `${dallePrompt}`,
            imageSrc: `${downloadUrl}`,
          },
        ];
        res.json(response);
        res.status(200);
      });
    });
    console.log("End of uploading !");
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }
};

const scoreTest = async (req, res) => {
  try {
    let openaiApiKey = req.headers.bearer;
    let input = req.body.input;
    let question = req.body.question;

    // call chatgpt api
    const configuration = {
      organization: "org-O0J27zQrydIuKDx8csuyhqgH",
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    };
    const openai = new OpenAI(configuration);

    let finalScore = await chatGPT(
      `問題: ${question}\n\n學生的回答: ${input}\n------------\n請依據"學生的回答"與"問題"的"相關性、契合度、完整性"給出0到100之間的分數並說明理由。格式如下:\n參考分數: <你的分數>\n參考評語: <你的評語>`,
      "You are a teacher in elementary school.",
      openai
    );

    let response = [
      {
        question: `${question}`,
        input: `${input}`,
        reply: `${finalScore}`,
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

const inquireDict = async (req, res) => {
  try {
    let apiKey = process.env.DICT_API_KEY;
    let storyId = req.body.storyId;
    let userId = req.body.userId;
    let inquiry = req.body.inquiry;

    console.log("APIKEY: ", apiKey);
    console.log("storyId: ", storyId);
    console.log("userId: ", userId);
    console.log("inquiry: ", inquiry);

    let result = await axios({
      method: "get",
      url: `https://pedia.cloud.edu.tw/api/v2/Detail?term=${inquiry}&api_key=${apiKey}`,
    }).catch((error) => {
      console.error(error.response.data);
    });

    console.log("Result: ", result);
    let response = "";
    if (result) {
      response = result.data;
    } else {
      response = {
        result: "No definition !",
      };
    }

    res.json(response);
    res.status(200);
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }
};

export {
  callChatGPT,
  getAllStory,
  getStoryByTitleOrType,
  getStoryByStoryId,
  getStoryProgress,
  postStoryProgressByUser,
  resetStory,
  dallePromptTest,
  scoreTest,
  inquireDict,
};
