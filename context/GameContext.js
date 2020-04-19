import React, { useReducer, useEffect, useState } from "react"
import { useWebSocket } from "../hooks/WSClient"

export const GameContext = React.createContext({
  gameId: "",
  categories: {},
  questions: {},
  answers: {},
  name: "",
  creator: "",
  gameStateReady: false,
  setCategory: str => {},
  setQuestion: str => {},
  setAnswer: str => {},
  setName: str => {},
  setCreator: str => {},
  isGameFilledIn: () => {},
  saveGame: (data) => {}
})

const objReducer = (oldObj, newItem) => {
  return {
      ...oldObj,
      ...newItem
  }
}

const GameProvider = ({children, gameId}) => {

  const [gameStateReady, setGameStateReady] = useState(false)
  const [categories, setCategory] = useReducer(objReducer, {})
  const [questions, setQuestion] = useReducer(objReducer, {})
  const [answers, setAnswer] = useReducer(objReducer, {})
  const [name, setName] = useState("")
  const [creator, setCreator] = useState("")

  const { wsIsReady, sendMessage } = useWebSocket(message => {
    console.log("Got a Websocket callback", message)
    switch (message.type) {
      case "loadGameCb":
        // TODO
        console.log(message)
        const loadedGame = message.payload && message.payload.Item ? 
          message.payload.Item : 
          null
        // gameName is the proxy for a successful load
        if (loadedGame && loadedGame.gameName) {
          setName(loadedGame.gameName.S)
          setCreator(loadedGame.creator.S)
          setCategory(JSON.parse(loadedGame.categories.S))
          setQuestion(JSON.parse(loadedGame.questions.S))
          setAnswer(JSON.parse(loadedGame.answers.S))
        }
        setGameStateReady(true)
        break
      default:
        console.log("No cb handler", message)
    }
	})


  useEffect(() => {
    // Try to load game state
    if (wsIsReady) {
      sendMessage({
        action: "loadGame",
        gameId
      })
    }
  }, [wsIsReady])

  const isGameFilledIn = () => {
    return (
      Object.keys(categories).length === 7 &&
      Object.keys(questions).length === 31 &&
      Object.keys(answers).length === 31
    )
  }

  const saveGame = () => {
		sendMessage({
			action: "saveGame",
			gameId,
			gameName: name || "Untitled",
			creator: creator || "Unknown",
			categories,
			questions,
			answers
		})
  }

  return (
    <GameContext.Provider value={{
      gameId,
      categories,
      questions,
      answers,
      name,
      creator,
      gameStateReady,
      setCategory,
      setQuestion,
      setAnswer,
      setName,
      setCreator,
      isGameFilledIn,
      saveGame
    }}>
      {children}
    </GameContext.Provider>
  )
}

export default GameProvider

