const getApiURL = () => {
    return "http://localhost:3000";
};

const getRandom = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}

export {
    getApiURL,
    getRandom
};