import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { seq } from "../../app.js";

dotenv.config();

const callChatGPT = async (req, res) => {
  try {
    let openaiApiKey = req.headers.bearer;

    let storyId = req.body.storyId;
    let userId = req.body.userId;
    let input = req.body.input;

    console.log('-----');
    console.log(storyId);
    console.log(userId);
    console.log(input);
    console.log('-----');

    // 取得 story 進度 by storyId, userId
    /*
      先用 storyId, userId 查有多少 message
      查到沒有紀錄 (使用者第一次 input)
      Call ChatGPT -> Dalle
      ChatGPT 的 reply, Dalle 的 imageSrc 寫到 DB 
      回傳所有 input, reply
  
      [
        {
          "input": "message1",
          "reply": "reply1"
        },
        {
          "input": "message2",
          "reply": "reply2"
        }
      ]

    */
    const [latestMessage, metadata] = await seq.query(`
            SELECT COUNT(id)
            FROM messages
            WHERE (authorId = '${userId}' AND storyId = '${storyId}')
            `);
    console.log("Count: ", latestMessage);

    let messageCount = latestMessage[0]['COUNT(id)']

    if (messageCount === 0 && input === "") {
      // 第一次 input
      // 讀取 stories table 的 initDialog, initImage
      const [initStory, metadata2] = await seq.query(`
            SELECT initDialog, initImage
            FROM stories
            WHERE (id = ${storyId})
            `);
      console.log("initStory: ", initStory);

      // 回傳 initDialog, initImage
      let response = initStory;

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
      const configuration = new Configuration({
        organization: "org-O0J27zQrydIuKDx8csuyhqgH",
        apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);


      if (messageCount >= 4) {
        if (messageCount < 5) {
          // 總結系統
          const [initDialog, metadata] = await seq.query(`
              SELECT initDialog
              FROM stories
              WHERE (id = ${storyId})
              `);
          console.log("initDialog: ", initDialog);
          let firstDialog = initDialog[0]['initDialog'];

          const [wholeMessage, metadata2] = await seq.query(`
              SELECT input, reply
              FROM messages
              WHERE (authorId = '${userId}' AND storyId = ${storyId})
              `);
          let concatenatedText = '';
          for (const item of wholeMessage) {
            concatenatedText += item.input + ' ' + item.reply + '\n';
          }
          let wholeStory = firstDialog + '\n' + concatenatedText;
          console.log(wholeStory);

          const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
              { role: "system", content: "You are a first grade elementary teacher." },
              { role: "user", content: `${wholeStory}\n\n${input}\n------------\n請根據上述的劇情完成故事結尾並提出一個道德觀念題。` },
            ],
          });
          let endingQuestion = completion.data.choices[0].message.content;

          // let response = [
          //   {
          //     input: `${input}`,
          //     reply: `${endingQuestion}`,
          //     imageSrc: `Not yet`
          //   }
          // ]

          // 寫入 DB (input, reply, imageSrc, storyId, authorId)
          const [dbResult, metadata3] = await seq.query(`
            INSERT INTO messages (input, reply, storyId, authorId)
            VALUES ('${input}', '${endingQuestion}', '${storyId}', '${userId}')
            `);
          console.log("DBresult: ", dbResult);

          // 把之前的故事記錄全部抓出來
          const [historyReply, metadata4] = await seq.query(`
            SELECT input, reply, imageSrc
            FROM messages
            WHERE (authorId = '${userId}' AND storyId = ${storyId})
            `);
          console.log("historyReply: ", historyReply);

          // generate response for api
          let response = historyReply;

          res.json(response);
          res.status(200);
        } else {
          // messageCount >= 5

          const [lastReply, metadata] = await seq.query(`
            SELECT reply
            FROM messages
            WHERE authorId = '${userId}' AND storyId = ${storyId} AND id = (SELECT MAX(id) FROM messages WHERE authorId = '${userId}' AND storyId = ${storyId})
            `);
          console.log("lastReply: ", lastReply);
          let previousReply = lastReply[0]['reply'];

          // 評分系統
          const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
              { role: "system", content: "You are a teacher in elementary school." },
              { role: "user", content: `問題: ${previousReply}\n\n學生的回答: ${input}\n------------\n請依據"學生的回答"與"問題"的"相關性、契合度、完整性"給出0到100之間的分數並說明理由。格式如下:\n參考分數: <你的分數>\n參考評語: <你的評語>` },
            ],
          });
          console.log(completion.data.choices[0].message);
          let finalScore = completion.data.choices[0].message.content;

          let response = [
            {
              input: `${input}`,
              reply: `${finalScore}`,
              imageSrc: `Not yet`
            }
          ]

          // 寫入 DB (input, reply, imageSrc, storyId, authorId)
          const [dbResult, metadata3] = await seq.query(`
            INSERT INTO messages (input, reply, storyId, authorId)
            VALUES ('${input}', '${finalScore}', '${storyId}', '${userId}')
            `);
          console.log("DBresult: ", dbResult);

          res.json(response);
          res.status(200);
        }
      } else {
        // 抓上一次的reply 沒有就抓 stories table 的 initDialog
        let previousReply = "";

        if (messageCount === 0) {
          const [initDialog, metadata] = await seq.query(`
            SELECT initDialog
            FROM stories
            WHERE (id = ${storyId})
            `);
          console.log("initDialog: ", initDialog);
          previousReply = initDialog[0]['initDialog'];
        } else {
          const [lastReply, metadata] = await seq.query(`
            SELECT reply
            FROM messages
            WHERE authorId = '${userId}' AND storyId = ${storyId} AND id = (SELECT MAX(id) FROM messages WHERE authorId = '${userId}' AND storyId = ${storyId})
            `);
          console.log("lastReply: ", lastReply);
          previousReply = lastReply[0]['reply'];
        }

        const completion = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a novelist." },
            // { role: "user", content: `${input}\n------------\n請根據上述的故事接續下去約50字的第一人稱故事，並根據故事提出一個決定主角行動的問題。` },
            { role: "user", content: `"${previousReply}\n我:${input}"\n------------\n請用繁體中文根據上述的故事內容繼續發展50字的第二人稱文字冒險小說。` },
            // { role: "user", content: `"${previousReply}\n我:${input}"\n------------\n請根據上述的故事內容繼續發展50字的第二人稱文字冒險小說。須包含下列字詞: 「贊、範、臣、羞辱、賞賜、求饒」`},
          ],
        });
        console.log(completion.data.choices[0].message);
        let chatgptResponse = completion.data.choices[0].message.content;

        // 取關鍵字
        const completion2 = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a DALL-E prompt engineer." },
            // { role: "user", content: `${chatgptResponse}\n------------\n"Please describe an illustration for the paragraph above"`}
            // { role: "user", content: `${chatgptResponse}\n------------\n"Provide a short (<10 token) but precise description of what this image looks like, only include the necessary nouns and verbs, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like."` }
            { role: "user", content: `${chatgptResponse}\n------------\n"Please use a single sentence without using commas within 30 words to describe what this image looks like, only include the necessary nouns, verbs, place and scene, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like. Provide a single sentence without using commas and like a subject verb object scene sentence. Within 30 words."` }
            // { role: "user", content: `"${chatgptResponse}"\n------------\nSummarize the story's character, appearance, general illustration style, and setting in a sentence of up to 20 words.`}
          ],
        });
        console.log(completion2.data.choices[0].message);
        let dallePrompt = completion2.data.choices[0].message.content;
        console.log('dallePrompt:', dallePrompt);

        // const completion3 = await openai.createChatCompletion({
        //   model: "gpt-3.5-turbo",
        //   messages: [
        //     { role: "system", content: "You are a DALL-E prompt engineer."},
        //     { role: "user", content: `${dallePrompt}\n------------\n"Provide a short (<70 token) but precise description of what this image looks like, as you would explain it to someone who does not have the context of the story. For example, do not use any names and describe what any charachters look like, and the general illustration style."`}
        //     // { role: "user", content: `"${chatgptResponse}"\n------------\nSummarize the story's character, appearance, and setting in a sentence of up to 20 words.`}
        //   ],
        // });
        // console.log(completion3.data.choices[0].message);
        // let dallePrompt2 = completion3.data.choices[0].message.content;
        // console.log('dallePrompt2:', dallePrompt2);

        // call dalle api
        // let prompt =
        //   "Create a cartoon-style, digital art image of " +
        //   dallePrompt +
        //   "\ncartoon-style, digital art, cutey, picture book, hand-drawn picture, pastel-style picture";
        // let prompt = dallePrompt + "\ncartoon-style, digital art, cutey, picture book, hand-drawn picture, pastel-style picture";
        // let prompt =  + dallePrompt + ", digital art, full hd";
        
        // let prompt = "The pixel art of " + dallePrompt + ", pixel art, cute";
        let prompt = "The pixel art of " + dallePrompt + ", Pixel Art, 32-bit Pixel Art, 32-bit Art, Pixelized Style, minecraft";

        // DALL-E
        const imageResult = await openai.createImage({
          prompt: `${prompt}`,
          n: 1,
          size: "1024x1024",
          response_format: "url"
        });
        let imageUrl = imageResult.data.data[0].url;
        // let imageUrl = imageResult.data.data[0].b64_json;
        console.log('imageUrl: ', imageUrl);

        // 寫入 DB (input, reply, imageSrc, storyId, authorId)
        const [dbResult, metadata] = await seq.query(`
            INSERT INTO messages (input, reply, imageSrc, storyId, authorId)
            VALUES ('${input}', '${chatgptResponse}', '${imageUrl}', '${storyId}', '${userId}')
            `);
        console.log("DBresult: ", dbResult);

        // 把之前的故事記錄全部抓出來
        const [historyReply, metadata2] = await seq.query(`
            SELECT input, reply, imageSrc
            FROM messages
            WHERE (authorId = '${userId}' AND storyId = ${storyId})
            `);
        console.log("historyReply: ", historyReply);

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
}

const userReply = async (req, res) => {
  try {
    // auth
    let apiKey = req.headers.apikey;
    let secret = req.headers.secret;
    let openaiApiKey = req.headers.bearer;
    console.log("apiKey: ", apiKey);
    console.log("secret: ", secret);
    if (apiKey === "S_202304140629871681424970") {
      if (secret !== "7CEB8CF4BBAD69F6B67889B90F6474BAF542B4AD") {
        res.json({
          message: "Wrong secret!!",
        });
        res.status(400);
        throw new Error("Wrong secret!!");
      }
    } else {
      res.json({
        message: "No apiKey exist!!",
      });
      res.status(400);
      throw new Error("No apiKey exist!!");
    }

    // 接收使用者回覆
    let storyId = req.body.storyId;
    let userId = req.body.userId;
    let reply = req.body.reply;
    let timestamp = req.body.timestamp;

    // 取得 story 進度 by storyId, userId
    const [latestMessage, metadata] = await seq.query(`
            SELECT MIN(remainCount) AS remainCount
            FROM messages
            WHERE EXISTS (
                SELECT userId FROM messages WHERE (userId = ${userId} AND storyId = ${storyId})
            ) 
            AND (userId = ${userId} AND storyId = ${storyId})
            `);
    console.log("Latest message: ", latestMessage);

    // call chatgpt api
    const configuration = new Configuration({
      organization: "org-O0J27zQrydIuKDx8csuyhqgH",
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a storyteller." },
        { role: "user", content: `${reply}, 請生成大約70字左右的回答` },
      ],
    });
    console.log(completion.data.choices[0].message);
    let chatgptResponse = completion.data.choices[0].message.content;

    // 取關鍵字
    const completion2 = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a prompt engineer." },
        { role: "user", content: `${chatgptResponse}, 請生成適合 DALL·E 的 prompt` },
      ],
    });
    console.log(completion2.data.choices[0].message);
    let dallePrompt = completion2.data.choices[0].message.content;

    // call dalle api
    let prompt =
      "Create a cartoon-style, digital art image of " +
      dallePrompt +
      "\ncartoon-style, digital art, cutey, picture book, hand-drawn picture, pastel-style picture";
    // let prompt = "Grandma and her grandson were playing blackjack in the casino with a minimum bet of $10. Grandma wasn't familiar with the rules, but her grandson kept giving her pointers. In the first round, grandma had bad luck and went over 21, losing to her grandson. In the second round, grandma learned how to hit and stand at the right time, and finally won the game. In the following rounds, the two were evenly matched, and other gamblers in the casino began to take notice of the elderly grandma and her grandson. Some praised them, while others looked down on them. After several hours of playing, grandma and her grandson successfully won over $100 in gambling money. They left the casino happy and headed home. Grandma said, This is the best day of my life. We won! The grandson also said with a smile, We'll be even better next time!" + ', digital art, cartoon-style art, cutey-style art';
    // let prompt = `Create a cartoon-style, digital art image of a grandma and her grandson playing blackjack at a casino. The minimum bet is $10. Grandma is not familiar with the rules, but her grandson keeps giving her pointers. In the first round, grandma has bad luck and her total points exceed 21, losing to her grandson. In the second round, grandma learns when to hit and when to stand, ultimately winning the game. For the next few rounds, grandma and her grandson are evenly matched, and other casino-goers start to notice the elderly duo. Some people admire them, while others are dismissive. After several hours of playing, grandma and her grandson win over $100 in winnings. They happily leave the casino and head back home. Grandma says, "This is the best day of my life. We won!" Her grandson also says with a big smile, "Next time, we'll be even better!" Make sure to include cute and cartoonish elements in the image to enhance the storytelling.`
    const imageResult = await openai.createImage({
      prompt: `${prompt}`,
      n: 1,
      size: "256x256",
    });
    let imageUrl = imageResult.data.data[0].url;
    console.log(imageUrl);

    // write into DB
    let writeTs = Math.floor(new Date().getTime() / 1000);
    if (latestMessage[0].remainCount === null) {
      // 取 storyId 的 remainConut
      const [storyInitCount, metadata] = await seq.query(`
                SELECT remainCount
                FROM storys 
                WHERE EXISTS (
                    SELECT * FROM storys WHERE storyId = ${storyId}
                )
                AND
                storyId = ${storyId}
            `);

      let remainConut = storyInitCount[0].remainCount;
      // 寫入 new row (remainCount - 1) into messages table
      var nextRemainCount = remainConut - 1;
      const [a, a1] = await seq.query(`
                INSERT INTO messages 
                (storyId, userId, reply, chatgptResponse, image, remainCount, timestamp)
                VALUES 
                ('${storyId}', '${userId}', '${reply}', '${chatgptResponse}', '${imageUrl}', '${nextRemainCount}', '${writeTs}')
            `);
    } else {
      // remainCount - 1 後 更新 reply, chatgptResponse, image
      let curRemainCount = latestMessage[0].remainCount;
      var nextRemainCount = curRemainCount - 1;
      const [a, a1] = await seq.query(`
                INSERT INTO messages 
                (storyId, userId, reply, chatgptResponse, image, remainCount, timestamp)
                VALUES 
                ('${storyId}', '${userId}', '${reply}', '${chatgptResponse}', '${imageUrl}', '${nextRemainCount}', '${writeTs}')
            `);
    }

    let responseTs = Math.floor(new Date().getTime() / 1000);
    // generate response for api
    const response = {
      message: "ok",
      remainCount: nextRemainCount,
      storyId: `${storyId}`,
      userId: `${userId}`,
      chatGPTResponse: chatgptResponse,
      // chatGPTResponse: "william維修中",
      image: `${imageUrl}`,
      // image: "william維修中",
      timestamp: `${responseTs}`,
    };

    console.log("response: ", response);

    res.json(response);
    res.status(200);
  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }

  let responseTs = new Date();
  // generate response for api
  const response = {
    message: "ok",
    remainCount: nextRemainCount,
    storyId: `${storyId}`,
    userId: `${userId}`,
    chatGPTResponse: chatgptResponse,
    // chatGPTResponse: "william維修中",
    image: `${imageUrl}`,
    // image: "william維修中",
    timestamp: responseTs,
  };

  console.log("response: ", response);

  res.json(response);
  res.status(200);
};

const getAllPrivateStory = async (req, res) => {

}

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
        res.send({ err: `story not found. Title: ${req.query.title}` });
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
        `SELECT * FROM stories WHERE type='${req.query.type}'`
      );

      if (results.length === 0) {
        res.send({ err: `story not found. Type: ${req.query.type}` });
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
        res.send({ err: `story not found. storyId: ${req.query.storyId}` });
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
    console.log('-----');
    console.log(storyId);
    console.log(userId);
    console.log('-----');

    const [storyProgress, metadata] = await seq.query(`
      SELECT input, reply
      FROM messages
      WHERE (authorId = '${userId}' AND storyId = ${storyId})
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
        `DELETE FROM messages WHERE storyId = '${req.body.storyId}' AND userId = '${req.body.userId} AND remainCount < '${req.body.remainCount}')`
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
    console.log('-----');
    console.log(storyId);
    console.log(userId);
    console.log('-----');

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
        userId: `${userId}`
      })
    } else {
      res.send({
        deletedRows: `${rowDeleted}`,
        storyId: `${storyId}`,
        userId: `${userId}`
      })
    }

  } catch (error) {
    console.log(error);
    console.log("ERROR!!");
    res.send(error);
  }


};

export {
  callChatGPT,
  userReply,
  getAllStory,
  getStoryByTitleOrType,
  getStoryByStoryId,
  getStoryProgress,
  postStoryProgressByUser,
  resetStory
};
