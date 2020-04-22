/** @jsx jsx */
import React from "react"
import Head from 'next/head'
import { useRouter } from 'next/router'
import { css, jsx } from "@emotion/core"
import Main from "../../components/Main"
import GameBoard from "../../components/GameBoard"
import GameContestants from "../../components/GameContestants"
import GameProvider from "../../context/GameContext"
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
          <div
            css={css`
              display: grid;
              grid-template-columns: 5fr 1fr
            `}
          >
            <GameBoard mode="host"/>
            <GameContestants/>
          </div>
				</GameProvider>
			</Main>
		</>
	)
}

export default HostPage