/** @jsx jsx */
import Head from 'next/head'
import { useRouter } from 'next/router'
import React from "react"
import { css, jsx } from "@emotion/core"
import Main from "../components/Main"
import Button from "../components/Button"
import generateId from "../util/id"

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>This is Jeoparty!</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Main
        css={css`
          justify-content: center;
        `}
      >
        <h1>
          This is Jeoparty!
        </h1>
        <Button
          onClick={() => {
            router.push(`/edit/${generateId()}`)
          }}
        >
          CREATE A GAME
        </Button>
      </Main>
    </>
  )
}
