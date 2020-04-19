/** @jsx jsx */
import React, { useState, useContext } from "react"
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

const GameBoard = ({className, mode = "view"}) => {
	const {
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
	} = useContext(GameContext)
	const [editing, setEditing] = useState("")
	const [inputC, setInputC] = useState("")
	const [inputQ, setInputQ] = useState("")
	const [inputA, setInputA] = useState("")

	const handleClick = ({target}) => {
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

		// TODO:
		// We could potentially think about "auto-saving"
		// after each new question is submitted

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
	}

	const go = () => {
		// TODO:
		// First, it should do a Save
		// Then, it should generate a "playId"
		// Then it should route to /play/<playId>
	}

	return gameStateReady ? (
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
								onClick={handleClick}
							>
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
									onClick={go}
								>
									LET'S PLAY!
								</Button>
							) : null
						}
					</div>
				) : null
			}
			<Modal
				style={{
					display: "flex",
					flexDirection: "column"
				}}
				open={editing.length > 0}
				onClose={handleClose}
				aria-labelledby="simple-modal-title"
				aria-describedby="simple-modal-description"
			>
				<div
					css={css`
						display: flex;
						flex-direction: column;
						background-color: white;
						margin: auto;
						padding: 4rem;
					`}
				>
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
	font-size: 1.25rem;

	& > div {
		padding: 1rem;
		border: 1px solid white;

		& > div {
			font-size: 1rem;
			margin: .5rem;
		}
	}

	#c_final,
	#g_final {
		grid-column: 1 / span 6;
	}
`

export default StyledGameBoard