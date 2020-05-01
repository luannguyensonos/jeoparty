/** @jsx jsx */
import React, { useContext } from "react"
import styled from "@emotion/styled"
import { css, jsx } from "@emotion/core"
import { GameContext } from "../context/GameContext"

const BREAKPOINT = 5

const GameContestants = ({className}) => {
  // TODO: Maybe plumb through a color when they've submitted?
  const {
    // gameState,
    clients,
    // clientAnswers,
    getConnectedClients
  } = useContext(GameContext)
  
  const connectedClients = getConnectedClients()
  const numClients = connectedClients ? connectedClients.length : 0
  const compact = numClients > BREAKPOINT
  const spacing = compact ? .6 : 1.25

  return (
    <div className={className}>
      {
        connectedClients.map(c => {
          const client = clients[c]
          return (
            <div
              key={`client${c}`}
              css={css`
                text-align: ${compact ? `left` : `center`};
                margin: ${spacing}rem;
                padding: 1.5rem;
                background-color: blue;
                display: flex;
                flex-direction: ${compact ? `row` : `column`};
                font-size: 1.25rem;
                width: 100%;

                @media only screen and (max-width: 899px) {
                  flex-direction: column;
                  margin: 0.5rem;
                  text-align: center;
                  font-size: 0.75rem;
                  padding: 0.25rem;
                }
              `}
            >
              <div
                css={css`
                  ${compact ? `` : `margin-bottom: 1.5rem;`}
                  ${compact ? `width: 70%;` : ``}
                  overflow: hidden;

                  @media only screen and (max-width: 899px) {
                    margin-bottom: 0.5rem;
                    width: 100%;
                  }
                `}
              >
                {`${c}`}
              </div>
              <div
                css={css`
                  margin-${compact ? `left` : `top`}: auto;
                  ${compact ? `align-self: center;` : ``}

                  @media only screen and (max-width: 899px) {
                    margin-left: unset;
                    margin-top: auto;
                  }
                `}
              >
                {`$${client.score}`}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

const StyledGameContestants = styled(GameContestants)`
  display: flex;
  font-size: 2rem;
  color: white;
  justify-content: center;
  align-content: center;
  flex-wrap: wrap;
`

export default StyledGameContestants
