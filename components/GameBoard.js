/** @jsx jsx */
import React, { useState, useContext, useEffect } from "react"
import styled from "@emotion/styled"
import { css, jsx } from "@emotion/core"
import { Modal } from '@material-ui/core'
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
		resetPlayState
	} = useContext(GameContext)
	const [editing, setEditing] = useState("")
	const [inputC, setInputC] = useState("")
	const [inputQ, setInputQ] = useState("")
	const [inputA, setInputA] = useState("")

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
		saveGame()

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
		console.log("Closing modal")
		setEditing("")

		if (gameState === 4)
			endCurrentQuestion()
	}

	const connectedClients = Object.keys(clients).filter(c => { return clients[c].connected })

	return gameState > 0 ? (
		<>
			<div className={className}>
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
					<div>
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
							onClick={saveGame}
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
									LET'S PLAY!
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
						INVITE PLAYERS TO JOIN:<br/>{`https://d12oqkjypbclqr.cloudfront.net/join/${playId}`}
						<br/>
						<Button
							css={css`
								margin-top: 1.5rem;
							`}
							onClick={startPlaySession}
						>
							LET'S START!
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
			<div
				css={css`
					padding: 2rem;
					display: flex;
					font-size: 2rem;
					color: white;
					justify-content: center;
					align-content: center;
					flex-wrap: wrap;
				`}
			>
				{
					connectedClients.map(c => {
						const client = clients[c]
						return (
							<div
								key={`client${c}`}
								css={css`
									text-align: center;
									margin: 1.5rem;
									padding: 2rem;
									background-color: blue;
									display: flex;
									flex-direction: column;
									width: calc((100vw - (${connectedClients.length}*8.5rem)) / ${connectedClients.length});
									min-width: calc((100vw - 50rem) / 6);
									max-width: calc((100vw - 26rem) / 3);
								`}
							>
								<div
									css={css`
										font-size: ${connectedClients.length <= 5 ? `2rem` : `1.25rem`};
										margin-bottom: 1.5rem;
									`}
								>
									{`${c}`}
								</div>
								<div
									css={css`
										font-size: ${connectedClients.length <= 5 ? `1.75rem` : `1.25rem`};
										margin-top: auto;
									`}
								>
									{`$${client.score}`}
								</div>
							</div>
						)
					})
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
													onChange={e => setInputC(e.target.value)}
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
													onChange={e => setInputQ(e.target.value)}
												/>
												<br/><br/>
												<Input
													type="text"
													size="48"
													placeholder="Answer"
													value={inputA}
													onChange={e => setInputA(e.target.value)}
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
								`}
							>
								<div
									css={css`
										font-size: 4rem;
										padding: 6rem;
									`}
								>
									{gameState === 3 ? questions[currentQuestion] : answers[currentQuestion]}
								</div>
								<div>
									{gameState === 3 ? `Time left: ${gameClock}` :
										(
											<div>
												{Object.keys(clientAnswers).map(c => {
													const cAns = clientAnswers[c]
													let tag
													let color
													if (cAns.toUpperCase() === answers[currentQuestion]) {
														tag = "CORRECT"
														color = "green"
													} else if (cAns === "<abstain>" || cAns.length <= 0) {
														tag = "SKIPPED"
														color = "white"
													} else {
														tag = "WRONG"
														color = "red"
													}
													return (
														<div
															key={`ans_${c}`}
															css={css`
																display: flex;
																flex-direction: row;
																margin: 1rem;
															`}
														>
															<div
																css={css`
																	margin-right: 1rem;
																`}
															>
																{c}
															</div>
															<div
																css={css`
																	margin-right: 1rem;
																	margin-left: 1rem;
																`}
															>
																{cAns}
															</div>
															<div
																css={css`
																	margin-left: auto;
																	color: ${color};
																	cursor: pointer;
																`}
																onClick={() => {
																	if (tag === "WRONG") {
																		overrideAnswer(c)
																	}
																}}
															>
																{tag}
															</div>
														</div>
													)
												})}
											</div>
										)
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
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	background-color: blue;
	color: white;
	margin: 1rem;
	text-align: center;
	font-size: 1.5rem;

	& > div {
		padding: 1rem;
		border: 1px solid white;
		display: flex;
    flex-direction: column;
		justify-content: center;
		min-height: 5rem;

		& > div {
			font-size: 1rem;
			margin: .5rem;
		}

		& > div.dollar {
			font-size: 3rem;
		}
	}

	#c_final,
	#g_final {
		grid-column: 1 / span 6;
	}
`

export default StyledGameBoard