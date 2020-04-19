const generateId = () => {
    return ('0000000000' + Math.floor(Math.random() * 9999999999)).slice(-10)
}

export default generateId
