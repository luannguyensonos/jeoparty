import React, { useEffect, useState } from "react"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Main from "../../components/Main"
import GameBoard from "../../components/GameBoard"
import GameProvider from "../../context/GameContext";

const EditPage = () => {
	const router = useRouter()
	const { gid } = router.query

	return (
		<>
			<Head>
				<title>This is Editing!</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Main>
				<GameProvider gameId={gid}>
					<GameBoard mode="edit" />
				</GameProvider>
			</Main>
		</>
	)
}

export default EditPage