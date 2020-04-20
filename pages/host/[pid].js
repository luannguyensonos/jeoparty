import React from "react"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Main from "../../components/Main"
import GameBoard from "../../components/GameBoard"
import GameProvider from "../../context/GameContext";
import { useLocalStorage } from "react-use";

const HostPage = () => {
	const router = useRouter()
  const { pid } = router.query
  
  const [localGameId,] = useLocalStorage("gameId")

	return (
		<>
			<Head>
				<title>This is Jeoparty!</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Main>
				<GameProvider gameId={localGameId} playId={pid}>
					<GameBoard mode="host"/>
				</GameProvider>
			</Main>
		</>
	)
}

export default HostPage