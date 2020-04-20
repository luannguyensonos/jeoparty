const AWS = require("aws-sdk")
AWS.config.update({ region: process.env.AWS_REGION })
const DDB = new AWS.DynamoDB()
const DDBDoc = new AWS.DynamoDB.DocumentClient()

const GAMES_TABLE_NAME = process.env.DDB_GAMES_NAME || "jeoparty-games"
const PLAYS_TABLE_NAME = process.env.DDB_PLAYS_NAME || "jeoparty-plays"
const CLIENTS_TABLE_NAME = process.env.DDB_PLAY_CLIENTS_NAME || "jeoparty-play-clients"

// data should be a JS Object
const broadcastMessage = async (socket, playId, data, excludes = []) => {
  try {
    const connections = await getActiveConnections(playId)
    const postCalls = connections.Items.map(async ({ connectionId }) => {
      socket.send(JSON.stringify(data), connectionId)
    })  
  } catch (error) {
    console.log('Error broadcasting to clients: ', playId, error)
  }
}

// data should be a JS Object
const messageHost = async (socket, playId, data) => {
  try {
    const playResults = await getPlay(playId)
    const hostSocket = playResults.Item &&
      playResults.Item.hostSocket ?
        playResults.Item.hostSocket.S :
        null

    if (hostSocket) {
      const apiGwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        endpoint: `https://${socket.domain}/${socket.stage}`
      });
  
      apiGwManagementApi
        .postToConnection({
          ConnectionId: hostSocket,
          Data: JSON.stringify(data)
        })
        .promise()
    }
  } catch (error) {
    console.log('Error broadcasting to Host: ', playId, error)
  }
}

const getPlay = async (playId) => {
  const loadPlayParams = {
    TableName: PLAYS_TABLE_NAME,
    Key: {
      playId: { S: playId }
    },
    ProjectionExpression: "gameId, hostSocket, playedQuestions, clients"
  }
  let loadPlayResult
  try {
    loadPlayResult = await DDB.getItem(loadPlayParams).promise()
  } catch (error) {
    throw new Error(error)
  }
  return loadPlayResult
}

const getActiveConnections = async (playId) => {
  let connectionData
  try {
    const queryParams = {
      TableName: CLIENTS_TABLE_NAME,
      ProjectionExpression: "connectionId, nickname",
      KeyConditionExpression: "playId = :this_play",
      ExpressionAttributeValues: { ":this_play": playId }
    }
    connectionData = await DDBDoc.query(queryParams).promise()
  } catch (error) {
    throw new Error(error)
  }
  return connectionData
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
  let connectionData
  try {
    const queryParams = {
      TableName: CLIENTS_TABLE_NAME,
      IndexName: "connectionIndex",
      ProjectionExpression: "playId, connectionId, nickname",
      KeyConditionExpression: "connectionId = :this_conn",
      ExpressionAttributeValues: { ":this_conn": socket.id }
    }
    connectionData = await DDBDoc.query(queryParams).promise()
  } catch (error) {
    throw new Error(error)
  }

  const postCalls = connectionData.Items.map(async ({ playId, connectionId, nickname }) => {
    var params = {
      TableName: CLIENTS_TABLE_NAME,
      Key: {
        playId: { S: playId },
        connectionId: { S: connectionId }
      }
    }

    let result
    try {
      // console.log("Deleting from DDB", socket)
      result = await DDB.deleteItem(params).promise()

      // console.log("About to broadcast leaving", nickname)
      await messageHost(socket, playId, {
        "type": "disconnectedCb",
        "nickname": nickname
      })
    } catch (error) {
      console.log("Error while disconnecting", error)
      throw new Error(error)
    }
  })
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
    case "seedPlay":
      const seedParams = {
        TableName: PLAYS_TABLE_NAME,
        Item: {
          playId: { S: myData.playId },
          gameId: { S: myData.gameId },
          hostSocket: { S: socket.id }
        },
      }
      let seedResult
      try {
        seedResult = await DDB.putItem(seedParams).promise()
        await socket.send(JSON.stringify({
          "type": "seedPlayCb",
          "status": "success",
          "payload": seedResult
        }))
      } catch (error) {
        throw new Error(error)
      }
      break
    case "loadPlay":
      try {
        let loadPlayResult = await getPlay(myData.playId)
        let loadPlayConnections = await getActiveConnections(myData.playId)

        if (loadPlayResult.Item) {
          loadPlayResult.Item.playId = { S: myData.playId }
          loadPlayResult.Item.hostSocket = { S: socket.id }
          await DDB.putItem({
            TableName: PLAYS_TABLE_NAME,
            Item: loadPlayResult.Item
          }).promise()
        }
        await socket.send(JSON.stringify({
          "type": "loadPlayCb",
          "payload": loadPlayResult,
          "conns": loadPlayConnections
        }))
      } catch (error) {
        throw new Error(error)
      }
      break
    case "savePlay":
      const savePlayParams = {
        TableName: PLAYS_TABLE_NAME,
        Item: {
          playId: { S: myData.playId },
          gameId: { S: myData.gameId },
          hostSocket: { S: socket.id },
          playedQuestions: { S: JSON.stringify(myData.playedQuestions) },
          clients: { S: JSON.stringify(myData.clients) }
        },
      }
      let savePlayResult
      try {
        savePlayResult = await DDB.putItem(savePlayParams).promise()
        await socket.send(JSON.stringify({
          "type": "savePlayCb",
          "status": "success",
          "payload": savePlayResult
        }))
      } catch (error) {
        throw new Error(error)
      }
      break
    case "joinPlay":
      const joinPlayParams = {
        TableName: CLIENTS_TABLE_NAME,
        Item: {
          playId: { S: myData.playId },
          nickname: { S: myData.nickname },
          connectionId: { S: socket.id }
        },
      }
      let joinPlayResult
      try {
        joinPlayResult = await DDB.putItem(joinPlayParams).promise()
        await socket.send(JSON.stringify({
          "type": "joinPlayCb",
          "status": "success",
          "payload": joinPlayResult
        }))
      } catch (error) {
        throw new Error(error)
      }
      messageHost(socket, myData.playId, {
        "type": "joinPlayCb",
        "nickname": myData.nickname
      })
      break
    case "broadcastToClients":
      try {
        await broadcastMessage(socket, myData.playId, myData)
      } catch (error) {
        throw new Error(error)
      }
      break
    case "sendToHost":
      try {
        await messageHost(socket, myData.playId, myData)
      } catch (error) {
        throw new Error(error)
      }
      break
    default:
      // Send back immediately to the originator
      socket.send(data)
  }
})
