import React, { useReducer, useEffect, useState } from "react"
import { useRouter } from 'next/router'
import { useLocalStorage } from "react-use"
import { useWebSocket } from "../hooks/WSClient"
import generateId from "../util/id"

export const GAME_TIME = 35
export const MAX_CLIENTS = 18

export const GameContext = React.createContext({
  gameId: "",
  playId: "",
  categories: {},
  questions: {},
  answers: {},
  name: "",
  creator: "",
  gameState: 0,
  currentQuestion: "",
  gameClock: GAME_TIME,
  playedQuestions: {},
  clients: {},
  clientAnswers: {},
  answerOverrides: [],
  toast: "",
  setCategory: str => {},
  setQuestion: str => {},
  setAnswer: str => {},
  setName: str => {},
  setCreator: str => {},
  isGameFilledIn: () => {},
  saveGame: (data) => {},
  startNewPlay: () => {},
  startPlaySession: () => {},
  startNewQuestion: (id) => {},
  endCurrentQuestion: () => {},
  overrideAnswer: (str) => {},
  rewriteAnswer: (str) => {},
  resetPlayState: () => {},
  getConnectedClients: () => {},
  setToast: (str) => {},
  queueAutoSave: (bool) => {}
})

const objReducer = (oldObj, newItem) => {
  return {
      ...oldObj,
      ...newItem
  }
}

const RETAIN_MSGS = [
  "Unsaved changes...",
  "Auto-saving...",
  "Saving..."
]

const GameProvider = ({children, gameId, playId = null}) => {
  const router = useRouter()

  const [, setLocalGameId] = useLocalStorage("gameId", gameId)
  const [categories, setCategory] = useReducer(objReducer, {})
  const [questions, setQuestion] = useReducer(objReducer, {})
  const [answers, setAnswer] = useReducer(objReducer, {})
  const [name, setName] = useState("")
  const [creator, setCreator] = useState("")
  const [gameState, setGameState] = useState(0)
  const [toast, setToast] = useReducer((oldMsg, newMsg) => {
    if (newMsg.length > 0
      && newMsg !== oldMsg
      && !RETAIN_MSGS.includes(newMsg)) {
      setTimeout(() => {
        setToast("")
      }, 3000)
    }
    return newMsg
  }, "")
  const [autoSave, queueAutoSave] = useState(false)
  /*
    Game states:
      0 not loaded yet
      1 loaded but not started
      2 started
      3 in question
      4 in scoring mode
      5 awaiting the next question
      6 normal game done, show category and gather wagers
        final question loops back to state 3
      7 game is OVER
  */
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [gameClock, setGameClock] = useState(GAME_TIME)
  const [playedQuestions, addPlayedQuestion] = useReducer(objReducer, {})
  const [clientAnswers, setClientAnswers] = useReducer(objReducer, {})
  const [clientWagers, setClientWagers] = useReducer(objReducer, {})
  const [answerOverrides, setAnswerOverrides] = useState([])
  const [rejects, setRejects] = useState([])
  const [clients, setClients] = useReducer((oldObj, newObj) => {
    let retObj
    switch (newObj.action) {
      case "replace":
        retObj = {...newObj.obj}
        break
      case "setConnected":
        if (newObj.value) {
          const connected = Object.keys(oldObj)
            .filter(c => { return oldObj[c].connected })
          if (connected.length >= MAX_CLIENTS) {
            setRejects(oldArray => [...oldArray, newObj.connectionId])
            return oldObj
          }
        }
        const debug = false
        if (newObj.value && debug) {
          ["",1,2,3].forEach(i=>{
            oldObj[`${newObj.id}${i}`] = {
              score: 0,
              connectionId: newObj.connectionId,
              connected: true
            }
          })
        }
        else if (oldObj[newObj.id]) {
          oldObj[newObj.id].connectionId = newObj.connectionId
          oldObj[newObj.id].connected = newObj.value
        }
        else {
          oldObj[newObj.id] = {
            score: 0,
            connectionId: newObj.connectionId,
            connected: newObj.value
          }
        }
        retObj = {...oldObj}
        break
    }
    return retObj
  }, {})

  const { wsIsReady, sendMessage, resetConnection } = useWebSocket(message => {
    switch (message.type) {
      case "loadGameCb":
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
        if (gameState < 1)
          setGameState(1)
        break
      case "loadPlayCb":
        const loadedPlay = message.payload && message.payload.Item ? 
          message.payload.Item : 
          null
        if (loadedPlay) {
          if (loadedPlay.clients) {
            const loadedClients = JSON.parse(loadedPlay.clients.S)
            const loadedPlayConns = message.conns && message.conns.Items ?
              message.conns.Items :
              [];
            let activeClients = []
            loadedPlayConns.map(({nickname}) => {
              activeClients.push(nickname)
            })
            Object.keys(loadedClients).forEach(c => {
              loadedClients[c].connected = activeClients.includes(c)
            })
            setClients({
              action: "replace",
              obj: loadedClients
            })
          }

          if (loadedPlay.playedQuestions) {
            const loadedQuestions = JSON.parse(loadedPlay.playedQuestions.S)
            addPlayedQuestion(loadedQuestions)
          }
        } else {
          sendMessage({
            action: "seedPlay",
            playId,
            gameId
          })
        }
        break
      case "joinPlayCb":
        const newClient = message.nickname || null
        if (newClient) {
          setClients({
            action: "setConnected",
            id: newClient,
            value: true,
            connectionId: message.connectionId
          })
        }
        break
      case "disconnectedCb":
        const disconnectedClient = message.nickname || null
        if (disconnectedClient) {
          setClients({
            action: "setConnected",
            id: disconnectedClient,
            value: false
          })
        }
        break
      case "clientAnswer":
        if (message.nickname) {
          setClientAnswers({
            [message.nickname]: message.answer+""
          })
        }
        break
      case "saveGameCb":
        setToast("Saved!")
        break
    }
	})

  useEffect(() => {
    // Try to load game state
    if (wsIsReady) {
      sendMessage({
        action: "loadGame",
        gameId
      })

      if (playId) {
        sendMessage({
          action: "loadPlay",
          playId
        })
      }
    }
  }, [wsIsReady])

  useEffect(() => {
    if (rejects.length > 0) {
      rejects.forEach(r => {
        sendMessage({
          action: "sendToConnection",
          type: "joinRejection",
          playId,
          connectionId: r
        })
      })
      setRejects([])
    }
  }, [rejects])

  const isGameFilledIn = () => {
    return (
      Object.keys(categories).length === 7 &&
      Object.keys(questions).length === 31 &&
      Object.keys(answers).length === 31
    )
  }

  const saveGame = (auto = false) => {
    try {
      setToast(auto ? "Auto-saving..." : "Saving...")
      sendMessage({
        action: "saveGame",
        gameId,
        gameName: name || "Untitled",
        creator: creator || "Unknown",
        categories,
        questions,
        answers
      })
    } catch (err) {
      console.log("Failed to save", err)
      setToast("Save failed! Try saving again or reloading the page.")
      resetConnection()
    }
  }

  const savePlay = () => {
    if (wsIsReady)
      sendMessage({
        action: "savePlay",
        playId,
        gameId,
        playedQuestions,
        clients
      })
  }

  useEffect(() => {
    if (gameState >= 5)
      savePlay()
  }, [gameState])

  const startNewPlay = () => {
    setLocalGameId(gameId)
    saveGame(true)
    router.push(`/host/${generateId()}`)
  }

  const startPlaySession = () => {
    if (Object.keys(clients).length > 0) {
      setGameState(2)
    }
  }

  const getConnectedClients = () => {
    return Object.keys(clients).filter(c => { return clients[c].connected })
  }

  const startNewQuestion = (id) => {
    // Reset clientAnswers
    const newAnswers = Object.keys(clientAnswers).reduce((agg, c) => {
      agg[c] = ""
      return agg
    }, {})
    setClientAnswers(newAnswers)
    setAnswerOverrides([])

    if (id !== "wager") {
      const value = id === "final" ?
        null :
        Number.parseInt(id.split("_")[0])

      sendMessage({
        action: "broadcastToClients",
        type: "newQuestion",
        playId,
        question: questions[id],
        category: categories[id.slice(-1)],
        value: value
      })
    } else {
      getConnectedClients().forEach(c => {
        const thisClient = clients[c]
        sendMessage({
          action: "sendToConnection",
          type: "gatherWager",
          playId,
          connectionId: thisClient.connectionId,
          score: thisClient.score,
          category: categories.final
        })
      })
    }
    setCurrentQuestion(id)
    setGameState(3)
    setGameClock(GAME_TIME)
  }

  useEffect(() => {
    if (gameState === 3) {
      setTimeout(() => {
        const newClock = gameClock-1;
        setGameClock(newClock)

        if (
          newClock <= 0 ||
          Object.keys(clientAnswers).filter(c => clientAnswers[c].length > 0).length >=
            Object.keys(clients).filter(c => clients[c].connected).length
        ) {
          setGameState(4)
          sendMessage({
            action: "broadcastToClients",
            type: "timeExpired",
            answer: answers[currentQuestion],
            playId
          })
        }  
      }, 1000)
    }
  }, [gameClock, gameState])

  useEffect(() => {
    if (autoSave) {
      setTimeout(() => {
        saveGame(true)
      }, 1000)
      queueAutoSave(false)
    }
  }, [autoSave])

  const endCurrentQuestion = () => {
    addPlayedQuestion({
      [currentQuestion] : true
    })

    if (currentQuestion !== "wager") {
      const isFinal = currentQuestion === "final"

      // Increment scores
      Object.keys(clientAnswers).forEach(c => {
        const value = isFinal ?
          clientWagers[c] :
          Number.parseInt(currentQuestion.split("_")[0])
        const cAns = clientAnswers[c]
        if (!cAns || !clients[c]) return
        if (cAns.toUpperCase() === answers[currentQuestion] || answerOverrides.includes(c)) {
          clients[c].score += value
        } else if (isFinal || (cAns !== "<abstain>" && cAns.length > 0)) {
          clients[c].score -= value
        }
      })
      if (isFinal) {
        setGameState(7)
      } else {
        setGameState(5)
      }
    } else if (currentQuestion === "wager") {
      // Store the wagers off somewhere, then start the final question
      const wagers = Object.keys(clientAnswers).reduce((agg, c) => {
        agg[c] = Number.parseInt(clientAnswers[c]) || 0
        return agg
      }, {})
      setClientWagers(wagers)
      startNewQuestion("final")
    }
  }

  // Final Jeopardy
  useEffect(() => {
    if (gameState === 5) {
      if (Object.keys(playedQuestions).length >= 30) {
        setQuestion({
          "wager": `What is your wager for the final category? ${categories.final}`
        })
        setAnswer({
          "wager": "Get ready for your final clue. Good luck."
        })
        setGameState(6)
      }
    } else if (gameState === 6) {
      startNewQuestion("wager")
    } else if (gameState === 7) {
      // HANDLE THE END GAME HERE!
      const winner = getConnectedClients().reduce((agg, c) => {
        const score = clients[c].score
        if (score > agg.highest) {
          agg.highest = score
          agg.teams = [c]
        } else if (score === agg.highest) {
          agg.teams.push(c)
        }
        return agg
      }, {
        teams: [],
        highest: 0
      })

      console.log("WINNER", winner)
      getConnectedClients().forEach(c => {
        const thisClient = clients[c]
        sendMessage({
          action: "sendToConnection",
          type: "endGame",
          playId,
          connectionId: thisClient.connectionId,
          score: thisClient.score,
          winner: winner
        })
      })
    }
  }, [gameState])

  const overrideAnswer = (team) => {
    setAnswerOverrides(oldArray => [...oldArray, team])
  }

  const rewriteAnswer = (team) => {
    setClientAnswers({
      [team]: answers[currentQuestion]
    })
  }

  const resetPlayState = () => {
    // TODO: Implement this
    // It's hard because of the playedQuestions
    // and clients are both using the objReducer fn
  }

  return (
    <GameContext.Provider value={{
      gameId,
      playId,
      categories,
      questions,
      answers,
      name,
      creator,
      gameState,
      currentQuestion,
      gameClock,
      playedQuestions,
      clients,
      clientAnswers,
      answerOverrides,
      setCategory,
      setQuestion,
      setAnswer,
      setName,
      setCreator,
      isGameFilledIn,
      saveGame,
      startNewPlay,
      startPlaySession,
      startNewQuestion,
      endCurrentQuestion,
      overrideAnswer,
      rewriteAnswer,
      resetPlayState,
      getConnectedClients,
      toast,
      setToast,
      queueAutoSave
    }}>
      {children}
    </GameContext.Provider>
  )
}

export default GameProvider

