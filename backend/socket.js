const AWS = require("aws-sdk")
AWS.config.update({ region: process.env.AWS_REGION })
const DDB = new AWS.DynamoDB()
const DDBDoc = new AWS.DynamoDB.DocumentClient()

const GAMES_TABLE_NAME = process.env.DDB_GAMES_NAME || "jeoparty-games"

const broadcastMessage = async (socket, playId, data, excludes = []) => {
  // TODO!
}

/**
 * Connect
 */

on('connect', async (data, socket) => {
  console.log('connect', data, socket)
})

/**
 * Disconnect
 */

on('disconnect', async (data, socket) => {
  console.log('disconnect', socket)
  // TODO!
  // await socket.send(JSON.stringify({ status: 'disconnected' }))
})

/**
 * Default
 */

on('default', async (data, socket) => {

  console.log('default', socket, data)
  const myData = JSON.parse(data)

  switch (myData.action) {
    case "saveGame":
      const saveParams = {
        TableName: GAMES_TABLE_NAME,
        Item: {
          gameId: { S: myData.gameId },
          gameName: { S: myData.gameName },
          creator: { S: myData.creator },
          categories: { S: JSON.stringify(myData.categories) },
          questions: { S: JSON.stringify(myData.questions) },
          answers: { S: JSON.stringify(myData.answers) }
        },
      }
      let saveResult
      try {
        saveResult = await DDB.putItem(saveParams).promise()
        await socket.send(JSON.stringify({
          "type": "saveGameCb",
          "status": "success",
          "payload": saveResult
        }))
      } catch (error) {
        throw new Error(error)
      }
      break
    case "loadGame":
      const loadParams = {
        TableName: GAMES_TABLE_NAME,
        Key: {
          gameId: { S: myData.gameId }
        },
        ProjectionExpression: "gameName, creator, categories, questions, answers"
      }
      let loadResult
      try {
        loadResult = await DDB.getItem(loadParams).promise()
        await socket.send(JSON.stringify({
          "type": "loadGameCb",
          "payload": loadResult
        }))
      } catch (error) {
        throw new Error(error)
      }
      break
    default:
      // Send back immediately to the originator
      socket.send(data)
  }
})
