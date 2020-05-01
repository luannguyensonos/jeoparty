/** @jsx jsx */
import React, { useState, useContext, useEffect } from "react"
import styled from "@emotion/styled"
import { css, jsx } from "@emotion/core"
import { Modal } from '@material-ui/core'
import FuzzySet from "fuzzyset.js"
import { FaWindowClose, FaExclamationTriangle } from "react-icons/fa"
import Input from "../components/Input"
import Button from "../components/Button"
import { GameContext } from "../context/GameContext"

const RANGE = [1,2,3,4,5,6]
const DOLLAR_RANGE=[200,400,600,800,1000]

const saveInput = (id, str, setInput, setObj) => {
  if (str.length > 0)
  setObj({
    [id]: str.toUpperCase()
  })
  setInput("")
}

// This is a hack because the input element flops in and out
const focusEl = (id) => {
  setTimeout(() => {
    const input = document.getElementById(id)
    if (input) input.focus()
  }, 100)
}

const GameBoard = ({className, mode = "host"}) => {
  const {
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
    resetPlayState,
    rewriteAnswer,
    getConnectedClients,
    toast,
    setToast,
    queueAutoSave
  } = useContext(GameContext)
  const [editing, setEditing] = useState("")
  const [inputC, setInputC] = useState("")
  const [inputQ, setInputQ] = useState("")
  const [inputA, setInputA] = useState("")
  const [fuzzyAnswer, setFuzzyAnswer] = useState(null)

  const handleClick = ({target}) => {
    if (mode === "edit") {
      setEditing(target.id)
      const id = target.id.substr(2)
      if (target.id.startsWith("c")) {
        setInputC(categories[id] || "")
        focusEl("c_input")
      } else {
        setInputQ(questions[id] || "")
        setInputA(answers[id] || "")
        focusEl("q_input")
      }
    } else if (mode === "host") {
      if (!target.id.startsWith("c") && gameState >= 2)
        startNewQuestion(target.id.substr(2))
    }
  }

  const handleSave = (e) => {
    e.preventDefault()

    const id = editing.substr(2)
    if (editing.startsWith("c")) {
      saveInput(id, inputC, setInputC, setCategory)
    } else {
      saveInput(id, inputQ, setInputQ, setQuestion)
      saveInput(id, inputA, setInputA, setAnswer)
    }

    // Take this line out to disable auto-saving
    queueAutoSave(true)

    // Try to advance to the next question
    // This is janky, but it works. Oh well.
    const catId = Number.parseInt(id.slice(-1))
    let dollar = editing.startsWith("c") ?
      200 :
      Number.parseInt(id.split("_")[0])+200
    setEditing("")
    while (Number.isInteger(catId) && Number.isInteger(dollar) && dollar <= 1000) {
      if (
        !questions[`${dollar}_${catId}`] ||
        !answers[`${dollar}_${catId}`]
      ) {
        setEditing(`g_${dollar}_${catId}`)
        setInputQ("")
        setInputA("")
        focusEl("q_input")
        break
      } else {
        dollar += 200
      }
    }
  }

  const handleClose = () => {
    setEditing("")

    if (gameState === 4)
      endCurrentQuestion()
  }

  useEffect(() => {
    try {
      console.log("New question, new fuzzy")
      if (answers[currentQuestion]) {
        setFuzzyAnswer(new FuzzySet([answers[currentQuestion]]))
      }
    } catch (err) {
      console.log("Fuzzy error", err)
    }
  }, [currentQuestion])

  const connectedClients = getConnectedClients()

  return gameState > 0 ? (
    <>
      <div className={className}>
        {toast.length > 0 &&
          <div id="toastMsg">
            {toast}
          </div>
        }
        <div className="gameGrid">
          {RANGE.map((i) => {
            const cid = `c_${i}`
            return (
              <div
                id={cid}
                key={cid}
                onClick={handleClick}
              >
                {categories[i] || `CATEGORY ${i}`}
              </div>
            )
          })}
          {DOLLAR_RANGE.map((i) => {
            const squares = []
            RANGE.forEach(j => {
              const id = `${i}_${j}`
              squares.push(
                <div
                  id={`g_${id}`}
                  key={`g_${id}`}
                  onClick={playedQuestions[id] ? ()=>{} : handleClick}
                >
                  {mode === "host" ?
                    (
                      <div
                        className={`dollar`}
                        id={`d_${id}`}
                      >
                        {playedQuestions[id] ? `` : `$${i}`}
                      </div>
                    ) :
                    (
                      <>
                        <div
                          id={`q_${id}`}
                        >
                          Q: {questions[id] || ``}
                        </div>
                        <div
                          id={`a_${id}`}
                        >
                          A: {answers[id] || ``}
                        </div>
                      </>
                    )
                  }
                </div>
              )
            })
            return squares
          })}
          {mode === "edit" ?
            (
              <>
                <div
                  id="c_final"
                  onClick={handleClick}
                >
                  {categories.final || `FINAL CATEGORY`}
                </div>
                <div
                  id="g_final"
                  onClick={handleClick}
                >
                  <div
                    id="q_final"
                  >
                    Q: {questions.final || ``}
                  </div>
                  <div
                    id="a_final"
                  >
                    A: {answers.final || ``}
                  </div>
                </div>
              </>
            ) : null
          }
        </div>
        {mode === "edit" ?
          (
            <div css={css`text-align: center;`}>
              <Input
                type="text"
                size="24"
                placeholder="Untitled Game"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              &nbsp;&nbsp;BY:&nbsp;
              <Input
                type="text"
                size="12"
                placeholder="User_123"
                value={creator}
                onChange={e => setCreator(e.target.value)}
              />
              <Button
                css={css`
                  margin-left: 3rem;
                `}
                onClick={() => {saveGame()}}
              >
                SAVE GAME
              </Button>
              {isGameFilledIn() ?
                (
                  <Button
                    css={css`
                      margin-left: 3rem;
                    `}
                    onClick={startNewPlay}
                  >
                    HOST A GAME!
                  </Button>
                ) : null
              }
            </div>
          ) : gameState === 1 ?
          (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                text-align: center;
              `}
            >
              INVITE PLAYERS TO JOIN:<br/>{`https://d316uwj8ou6gkk.cloudfront.net/join/${playId}`}
              <br/>
              <Button
                css={css`
                  margin-top: 1.5rem;
                `}
                onClick={startPlaySession}
              >
                LET'S BEGIN!
              </Button>
              {
                Object.keys(playedQuestions).length > 0 && false ?
                (
                  <Button
                    css={css`
                      margin-top: 1.5rem;
                      background-color: #555;
                    `}
                    onClick={resetPlayState}
                  >
                    !!! RESET BOARD !!!
                  </Button>
                ) : null
              }
            </div>
          ) : null
        }
      </div>
      <Modal
        style={{
          display: "flex",
          flexDirection: "column"
        }}
        open={editing.length > 0 || gameState === 3 || gameState === 4}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            background-color: ${mode === "host" ? `blue` : `white`};
            margin: auto;
            padding: 4rem;
            max-width: 70vw;
            min-width: 60vw;
            overflow: scroll;

            @media only screen and (max-width: 899px) {
              padding: 1rem;
              max-width: 80vw;
            }
          `}
        >
          {mode === "edit" ?
            (
              <>
                <h3>
                  Editing&nbsp;
                  {editing.startsWith("c") ? `Category: ` : `Question: $`}
                  {editing.substr(2).replace("_", " for Category ")}
                </h3>
                <form
                  onSubmit={handleSave}
                >
                  {editing.startsWith("c") ?
                    (
                        <Input
                          id="c_input"
                          type="text"
                          size="48"
                          placeholder="Category"
                          value={inputC}
                          onChange={e => {
                            setInputC(e.target.value)
                            setToast("Unsaved changes...")
                          }}
                        />
                    ) :
                    (
                      <>
                        <Input
                          id="q_input"
                          type="text"
                          size="48"
                          placeholder="Question"
                          value={inputQ}
                          onChange={e => {
                            setInputQ(e.target.value)
                            setToast("Unsaved changes...")
                          }}
                        />
                        <br/><br/>
                        <Input
                          type="text"
                          size="48"
                          placeholder="Answer"
                          value={inputA}
                          onChange={e => {
                            setInputA(e.target.value)
                            setToast("Unsaved changes...")
                          }}
                        />
                      </>
                    )
                  }
                  <br/>
                  <Button
                    type="submit"
                    css={css`
                    margin-top: 1rem;
                    `}
                    onClick={handleSave}
                    >
                    SAVE
                  </Button>
                </form>
              </>
            ) :
            (
              <div
                css={css`
                  text-align: center;
                  color: white;
                  font-size: 2rem;

                  @media only screen and (max-width: 899px) {
                    font-size: 1rem;
                  }
                `}
              >
                <div
                  css={css`
                    font-size: 3.5rem;
                    padding: 4rem;

                    @media only screen and (max-width: 1439px) {
                      font-size: 2.5rem;
                      padding: 2rem;
                    }

                    @media only screen and (max-width: 899px) {
                      font-size: 1.5rem;
                      padding: 1rem;
                    }
                  `}
                >
                  {gameState === 3 ? questions[currentQuestion] : answers[currentQuestion]}
                </div>
                <div>
                  {gameState === 3 ? 
                    (
                      <div>
                        {`Time left: ${gameClock}`}
                        <div
                          css={css`
                            display: flex;
                            flex-direction: row;
                            margin: 1.5rem;
                            justify-content: center;
                            flex-wrap: wrap;
                          `}
                        >
                          {connectedClients.map(c => {
                            return (
                              <div
                                key={`in_${c}`}
                                css={css`
                                  margin: 1rem;
                                  width: 2rem;
                                  height: 2rem;
                                  background-color: ${clientAnswers && clientAnswers[c] && clientAnswers[c].length > 0 ? `#AFF880` : `#666`};

                                  @media only screen and (max-width: 899px) {
                                    width: 1rem;
                                    height: 1rem;
                                  }
                                `}
                              >
                              </div>
                            )
                          })}
                        </div>
                      </div>
                     ) : gameState === 4 && currentQuestion !== "wager" ?
                    (
                      <div
                        css={css`
                          display: grid;
                          grid-template-columns: 1fr 1fr;
                          font-size: 1.25rem;
                        `}
                      >
                        {connectedClients.map(c => {
                          if (!clientAnswers) return
                          const cAns = clientAnswers[c]

                          let fuzzyScore = 0
                          if (fuzzyAnswer && cAns && cAns.length > 0) {
                            const fuzzyLayer1 = fuzzyAnswer.get(cAns)
                            if (fuzzyLayer1 && fuzzyLayer1.length > 0) {
                              const fuzzyLayer2 = fuzzyLayer1[0]
                              if (fuzzyLayer2.length > 0) {
                                fuzzyScore = fuzzyLayer2[0]
                              }
                            }
                            console.log("Compare", cAns, answers[currentQuestion], fuzzyScore)
                          }

                          let tag
                          let color
                          if (!cAns || cAns === "<abstain>" || cAns.length <= 0) {
                            tag = "SKIPPED"
                            color = "#3333ff"
                          } else if (cAns.toUpperCase() === answers[currentQuestion] || answerOverrides.includes(c)) {
                            tag = "CORRECT"
                            color = "#33cc33"
                          } else if (fuzzyScore >= 0.6) {
                            tag = "FUZZY"
                            color = "#ffff00"
                          } else {
                            tag = "WRONG"
                            color = "#cc0000"
                          }
                          return (
                            <div
                              key={`ans_${c}`}
                              css={css`
                                display: flex;
                                flex-direction: row;
                                margin: 1rem;
                                border: 6px solid ${color};
                                cursor: pointer;
                                padding: 1.5rem;
                                overflow-wrap: anywhere;
                                
                                @media only screen and (max-width: 899px) {
                                  font-size: 1rem;
                                  padding: 0.75rem;
                                  margin: 0.25rem;
                                  border: 3px solid ${color};
                                }
                              `}
                              onClick={() => {
                                if (tag === "WRONG") {
                                  rewriteAnswer(c)
                                } else if (tag === "FUZZY") {
                                  overrideAnswer(c)
                                }
                              }}
                            >
                              <div
                                css={css`
                                  margin-right: 1rem;
                                  max-width: 40%;
                                `}
                              >
                                {c}
                              </div>
                              <div
                                css={css`
                                  margin-left: auto;
                                `}
                              >
                                <span css={css`margin-right: 1rem;`}>
                                  {cAns}
                                </span>
                                {tag === "WRONG" ?
                                  <FaWindowClose/> :
                                  tag === "FUZZY" ?
                                    <FaExclamationTriangle/> :
                                    null
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) :
                    null
                  }
                </div>
              </div>
            )
          }
        </div>
      </Modal>
    </>
  ) :
  (
    <div>
      Loading...
    </div>
  )
}

const StyledGameBoard = styled(GameBoard)`
  div.gameGrid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    background-color: blue;
    color: white;
    margin: 1rem;
    text-align: center;
    font-size: 1.25rem;
  
    & > div {
      padding: 0.75rem;
      border: 1px solid white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 4.5rem;
  
      & > div {
        font-size: 1rem;
        margin: .5rem;
      }
  
      & > div.dollar {
        font-size: 2rem;
      }
    }
  
    #c_final,
    #g_final {
      grid-column: 1 / span 6;
    }
  }

  @media only screen and (max-width: 899px) {
    div.gameGrid {
      font-size: 0.75rem;

      & > div {
        min-height: 1rem;

         & > div {
           font-size: 0.75rem;
         }

         & > div.dollar {
           font-size: 1rem;
         }
      }
    }
  }

  #toastMsg {
    background-color: #AAA;
    color: white;
    padding: 1rem;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);

  }
`

export default StyledGameBoard