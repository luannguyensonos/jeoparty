import React from "react"
import styled from "@emotion/styled"

const Button = styled.button`
	padding: .75rem;
	background-color: blue;
	color: white;
	font-size: 1rem;
	border-radius: 4px;
	cursor: pointer;
	&:hover {
		text-decoration: underline;
	}
`

export default Button