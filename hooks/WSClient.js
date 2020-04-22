import React, { useEffect, useState } from "react"

// Using this websocket as a proxy to make API calls for now
export const useWebSocket = (cb, keepAlive = false) => {
  const [wsClient, setWsClient] = useState(null)
  const [wsIsReady, setIsReady] = useState(false)

  useEffect(() => {
    // TODO: Fix the env variable (it's not currently working)
    // Sonos WSS
    const WS_URL = process.env.WS_SOCKET_URL || "wss://ua7tiplvsh.execute-api.us-east-1.amazonaws.com/dev/"
    // Personal WSS
    // const WS_URL = process.env.WS_SOCKET_URL || "wss://fccbc7mdt3.execute-api.us-east-1.amazonaws.com/dev/"
    if (!wsClient) {
        console.log("Creating WS connection:", process.env.WS_SOCKET_URL, WS_URL)
        setWsClient(new WebSocket(WS_URL))
    } else {
        console.log("Adding WS listeners:", wsClient)

        // On Connection Established...
        wsClient.addEventListener('open', function (event) {
            // console.log("Handling WS connection open", event)
            setIsReady(true)

            // keep alive
            if (keepAlive) {
              setInterval(() => {
                wsClient.send(JSON.stringify({
                  action: "keepAlive"
                }))
              }, 30000)
            }

            cb({type: "openCb"})
        })

        // On Event Received...
        wsClient.addEventListener('message', function (event) {
            const message = JSON.parse(event.data)
            // console.log("Handling WS message", message)
            cb(message)
        })
    }
  }, [wsClient])

  const sendMessage = (data, cb) => {
    wsClient.send(JSON.stringify(data))
  }

  return {
    wsIsReady,
    sendMessage
  }
}