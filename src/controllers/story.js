import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { seq } from "../../app.js";

dotenv.config();

const userReply = async (req, res) => {
  try {
    // auth
    let apiKey = req.headers.apikey;
    let secret = req.headers.secret;
    let openaiApiKey = req.headers.bearer;
    console.log("apiKey: ", apiKey);
    console.log("secret: ", secret);
    console.log("openaiApiKey: ", openaiApiKey);
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
        { role: "user", content: `${reply}, 請生成大約70字左右的回答` },
      ],
    });
    console.log(completion.data.choices[0].message);
    let chatgptResponse = completion.data.choices[0].message.content;

    // call dalle api
    let prompt =
      "Create a cartoon-style, digital art image of " +
      chatgptResponse +
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

//
// const getOrder = async (req, res) => {
//     const orderId = req.params.orderId;
//     console.log('orderId: ', orderId);
//     const [results, metadata] = await seq.query(`SELECT * from Orders WHERE orderId = ${orderId}`);
//     console.log('Orders list: ', results);

//     let finalItemArray = [];
//     let itemArray = results[0].itemId.split(':');
//     for (let i = 0; i < itemArray.length; i++) {
//         const [itemName, metadata2] = await seq.query(`SELECT * from Menu WHERE menuId = ${itemArray[i]}`);
//         let itemTitle = itemName[0].title;
//         console.log('itemName: ', itemTitle);
//         finalItemArray.push(itemTitle);
//     }
//     results[0].itemId = finalItemArray.toString();
//     const response = {
//         result: results,
//         message: 'OK'
//     }
//     try {
//         res.json(response)
//         res.status(200)
//     } catch (error) {
//         console.log(error);
//         console.log("ERROR!!");
//         res.send(error);
//     }
// };

// const postOrder = async (req, res) => {
//     console.log('req data: ', req.body);
//     try {
//         let customerId = req.body.customer_id;
//         let amount = req.body.amount;
//         let mealType = req.body.mealType;
//         let paymentType = req.body.paymentType;
//         let itemId = req.body.itemId;

//         orderId++;
//         orderNumber++;
//         const [results, metadata] = await seq.query(`INSERT INTO Orders VALUES (${orderId},'accepted','${customerId}', '${amount}', '${mealType}','${paymentType}','${itemId}', '${orderNumber}')`);
//         console.log('Orders list: ', results);
//         const response = {
//             orderId: orderId.toString(),
//             orderNumber: orderNumber,
//             message: 'OK'
//         }

//         res.json(response)
//         res.status(200)
//     } catch (error) {
//         console.log(error);
//         console.log("ERROR!!");
//         res.send(error);
//     }
// };

const getAllStory = async (req, res) => {
  const [results, metadata] = await seq.query(`SELECT * from storys`);
  res.status = 200;
  res.send(results);
};

const getStoryByTitleOrType = async (req, res) => {
  if (req.query.title === undefined && req.query.type === undefined) {
    res.send({ err: "invalid api" });
  } else if (req.query.title !== undefined) {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM storys WHERE title = '${req.query.title}'`
      );
      res.status = 200;
      res.send(results);
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  } else {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM storys WHERE type='${req.query.Type}'`
      );
      res.status = 200;
      res.send(results);
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
        `SELECT * FROM storys WHERE storyId = '${req.query.storyId}'`
      );
      res.status = 200;
      res.send(results);
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
  }
};

const getStoryProgressByUser = async (req, res) => {
  if (req.query.storyId === undefined && req.query.userId === undefined) {
    res.send({ err: "invalid api" });
  } else {
    try {
      const [results, metadata] = await seq.query(
        `SELECT * FROM messages WHERE storyId = '${req.query.storyId}' AND userId = '${req.query.userId}'`
      );
      if (results.length > 0) {
        res.status = 200;
        var minCount = 10000;
        results.forEach((r) => {
          minCount = Math.min(r.remainCount, minCount);
        //   r.message = "ok";
          r.chatgptResponse = { content: r.chatgptResponse };
          delete r.id;
          delete r.storyId;
        //   delete r.reply;
        });

        var resultTemplete = {
          userId: req.query.userId,
          storyId: req.query.storyId,
          remainCount: minCount,
          message: results,
        };
        res.send(resultTemplete);
      } else {
        res.status = 200;
        const [storyRes, metastoryRes] = await seq.query(
          `SELECT * FROM storys WHERE storyId = '${req.query.storyId}'`
        );

        delete storyRes[0].id;
        delete storyRes[0].letters;
        delete storyRes[0].phrases;
        delete storyRes[0].type;
        delete storyRes[0].meaning;
        delete storyRes[0].words;
        // storyRes[0].message = "ok";
        // storyRes[0].image = { default: storyRes[0].initImage };
        // delete storyRes[0].initImage;
        var resultTemplete = {
          userId: req.query.userId,
          storyId: req.query.storyId,
          remainCount: storyRes[0].remainConut,
          // message: storyRes[0],
          message: []
        };
        res.send(resultTemplete);
      }
    } catch (error) {
      console.log(error);
      console.log("ERROR!!");
      res.send(error);
    }
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

export {
  userReply,
  getAllStory,
  getStoryByTitleOrType,
  getStoryByStoryId,
  getStoryProgressByUser,
  postStoryProgressByUser,
};
