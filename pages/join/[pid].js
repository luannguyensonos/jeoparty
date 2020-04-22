/** @jsx jsx */
import React, { useState, useEffect } from "react"
import Head from 'next/head'
import { useRouter } from 'next/router'
import { css, jsx } from "@emotion/core"
import Main from "../../components/Main"
import Input from "../../components/Input"
import Button from "../../components/Button"
import { useWebSocket } from "../../hooks/WSClient"
import { GAME_TIME } from "../../context/GameContext"

const MAX_LEN = 20
const CLIENT_TIME = GAME_TIME-1

const JoinPage = () => {
	const router = useRouter()
  const { pid } = router.query
  
  const [inputNick, setInputNick] = useState("")
  const [joined, setJoined] = useState(0)
  const [question, setQuestion] = useState("")
  const [inputA, setInputA] = useState("")
  const [gameClock, setGameClock] = useState(0)
  const [message, setMessage] = useState({})
  
  const { wsIsReady, sendMessage } = useWebSocket(message => {
    switch (message.type) {
      case "joinPlayCb":
        setJoined(1)
        break
      case "joinRejection":
        setJoined(2)
        break
      case "newQuestion":
        if (message.question) {
          setInputA("")
          setQuestion(message.question)
          setGameClock(CLIENT_TIME)
          setJoined(1)
        }
        break
      case "timeExpired":
        setQuestion("")
        setGameClock(0)
        break
      case "gatherWager":
        setQuestion(message.category)
        setJoined(3)
        setGameClock(CLIENT_TIME)
        setMessage(message)
        break
      case "endGame":
        setMessage(message)
        setJoined(4)
        console.log(message)
        break
      default:
        console.log("No cb handler", message)
    }
	})

  const joinPlay = (e) => {
    e.preventDefault()

    if (inputNick.length > 0 && wsIsReady)
      sendMessage({
        action: "joinPlay",
        playId: pid,
        nickname: inputNick
      })
  }

  const resetFormState = () => {
    setQuestion("")
    setGameClock(0)
    setInputA("")
  }

  const submitAnswer = (e) => {
    e.preventDefault()

    if (question.length > 0 && inputA.length > 0 && wsIsReady) {
      let toSend = inputA
      if (joined === 3) {
        const wager = Number.parseInt(inputA.replace(/\D/g,''))
        if (wager >= 0 && wager <= message.score)
          toSend = wager
        else
          return
      }
      sendMessage({
        action: "sendToHost",
        type: "clientAnswer",
        playId: pid,
        answer: toSend,
        nickname: inputNick
      })
      resetFormState()
    }
  }

  const skipQuestion = (e) => {
    e.preventDefault()

    if (question.length > 0 && wsIsReady) {
      sendMessage({
        action: "sendToHost",
        type: "clientAnswer",
        playId: pid,
        answer: "<abstain>",
        nickname: inputNick
      })
      resetFormState()
    }

  }

  useEffect(() => {
    if (question.length > 0 && gameClock > 0) {
      setTimeout(() => {
        const newClock = gameClock-1;
        setGameClock(newClock)
      }, 1000)
    }
  }, [gameClock])

	return (
		<>
			<Head>
				<title>This is Jeoparty!</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Main>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            text-align: center;
            padding-top: ${joined > 0 ? `1rem` : `3rem`};
            margin: 1rem;
          `}
        >
          {joined <= 0 ?
            (
              <div>
                <form
                  onSubmit={joinPlay}
                >
                  <Input
                    css={css`min-width: 60vw;`}
                    type="text"
                    size={MAX_LEN}
                    maxLength={MAX_LEN}
                    placeholder="Enter team name..."
                    value={inputNick}
                    onChange={e => setInputNick(e.target.value)}
                  />
                  <span
                    css={css`
                      margin-left: 1rem;
                      color: #AAA;
                    `}
                  >
                    {`${inputNick.length}/${MAX_LEN}`}
                  </span>
                  <br/>
                  <Button
                    css={css`min-width: 80vw;`}
                    type="submit"
                    css={css`
                    margin-top: 1rem;
                    `}
                    onClick={joinPlay}
                  >
                    Join the party!
                  </Button>
                </form>
              </div>
            ) :
            (
              <div>
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    background-color: blue;
                    color: white;
                    min-width: 80vw;
                    min-height: 15vh;
                  `}
                >
                  <div>
                    {joined === 2 ? `Sorry! Party is at max capacity.` :
                      joined === 3 ?
                        (
                          <div>
                            <div css={css`margin-bottom: .5rem;`}>
                              What is your wager for the final category?
                            </div>
                            <div css={css`margin-bottom: 1.5rem;`}>
                              {`${message.category}`}
                            </div>
                            <div>
                              {`You have $${message.score}`}
                            </div>
                          </div>
                        ) :
                        joined === 4 && message.winner && message.winner.teams ?
                          (
                            <div>
                              <div css={css`margin-bottom: .5rem;`}>
                                {message.winner.teams.includes(inputNick) ?
                                  (message.winner.teams.length > 1 ?
                                    `You tied for the win!` : `Congrats, you won!`) :
                                  `The winning team had a score of $${message.winner.highest}`}
                              </div>
                              <div css={css`margin-bottom: 1.5rem;`}>
                                {`You ended with $${message.score}`}
                              </div>
                              <div>
                                Thanks for playing Jeoparty!
                              </div>
                            </div>
                          ) :
                          question.length > 0 ? 
                            question : 
                              `Waiting for the next question`}
                  </div>
                </div>
                {joined === 1 || joined === 3 ?
                  (                    
                    <form
                      onSubmit={submitAnswer}
                    >
                      <Input
                        id="answerInput"
                        css={css`min-width: 80vw;`}
                        type="text"
                        size="20"
                        placeholder="Enter the answer..."
                        value={inputA}
                        onChange={e => setInputA(e.target.value)}
                      />
                      <br/>
                      <Button
                        type="submit"
                        css={css`
                          margin-top: .5rem;
                          width: 80vw;
                          background-color: ${question.length > 0 && gameClock > 0 ? `blue` : `#AAA`}
                        `}
                        onClick={submitAnswer}
                      >
                        {`Submit${question.length > 0 && gameClock > 0 ? ` (Timer: ${gameClock})` : ``}`}
                      </Button>
                      <br/>
                      {joined === 1 ?
                        <Button
                          css={css`
                            margin-top: .5rem;
                            width: 80vw;
                            background-color: #AAA;
                          `}
                          onClick={skipQuestion}
                        >
                          Skip this one
                        </Button>
                        : null
                      }
                    </form>
                  ) : null
                }
              </div>
            )
          }
        </div>
			</Main>
		</>
	)
}

export default JoinPage