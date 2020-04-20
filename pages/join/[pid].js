/** @jsx jsx */
import React, { useState, useEffect } from "react"
import Head from 'next/head'
import { useRouter } from 'next/router'
import { css, jsx } from "@emotion/core"
import Main from "../../components/Main"
import Input from "../../components/Input"
import Button from "../../components/Button"
import { useWebSocket } from "../../hooks/WSClient"

const JoinPage = () => {
	const router = useRouter()
  const { pid } = router.query
  
  const [inputNick, setInputNick] = useState("")
  const [joined, setJoined] = useState(false)
  const [question, setQuestion] = useState("")
  const [inputA, setInputA] = useState("")
  
  const { wsIsReady, sendMessage } = useWebSocket(message => {
    console.log("Got a Websocket callback", message)
    switch (message.type) {
      case "joinPlayCb":
        // TODO
        console.log(message)
        setJoined(true)
        break
      case "newQuestion":
        setQuestion(message.question)
        break
      case "timeExpired":
        setQuestion("")
        break
      default:
        console.log("No cb handler", message)
    }
	})

  const joinPlay = (e) => {
    e.preventDefault()

    if (inputNick.length > 0 && wsIsReady)
      console.log("Sending join call", inputNick)
      sendMessage({
        action: "joinPlay",
        playId: pid,
        nickname: inputNick
      })
  }

  const submitAnswer = (e) => {
    e.preventDefault()

    if (inputA.length > 0 && wsIsReady)
      sendMessage({
        action: "sendToHost",
        type: "clientAnswer",
        playId: pid,
        answer: inputA,
        nickname: inputNick
      })

    setInputA("")
  }

  const skipQuestion = (e) => {
    e.preventDefault()

    if (wsIsReady)
      sendMessage({
        action: "sendToHost",
        type: "clientAnswer",
        playId: pid,
        answer: "<abstain>",
        nickname: inputNick
      })
    setQuestion("")
  }

  useEffect(() => {
    if (question.length > 0)
      setTimeout(() => {
        const input = document.getElementById("answerInput")
        if (input)
          input.focus()
      }, 100)
  }, [question])

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
            padding-top: ${joined ? `` : `3rem`};
            margin: 1rem;
          `}
        >
          {!joined ?
            (
              <div>
                <form
                  onSubmit={joinPlay}
                >
                  <Input
                    css={css`min-width: 80vw;`}
                    type="text"
                    size="20"
                    placeholder="Enter team name..."
                    value={inputNick}
                    onChange={e => setInputNick(e.target.value)}
                  />
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
                    {question.length > 0 ? question : `Waiting for the next question`}
                  </div>
                </div>
                {question.length > 0 ?
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
                        `}
                        onClick={submitAnswer}
                      >
                        Submit
                      </Button>
                      <br/>
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