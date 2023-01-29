const isUsernameValid = (val) => {
    const usernameRegex = /^[a-zA-Z0-9_.]+$/
    return usernameRegex.test(val) && val.length <= 20 && val.length >= 3
}

export { isUsernameValid };