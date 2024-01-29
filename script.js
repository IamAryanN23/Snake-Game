const playBoard = document.querySelector(".play-board");
const scoreElement = document.querySelector(".score");
const highScoreElement = document.querySelector(".high-score");
const controls = document.querySelectorAll(".controls i");

let gameOver = false;
let foodX, foodY;
let snakeX = 5, snakeY = 5;
let velocityX = 0, velocityY = 0;
let snakeBody = [];
let setIntervalId;
let score = 0;
let superFoodActive = false;
let superFoodX, superFoodY;
let superFoodDuration = 5000; // 5 seconds
// Get high score from local storage

let highScore = localStorage.getItem("high-score") || 0;
highScoreElement.innerText = `High Score: ${highScore}`;

// Pass a random between 1 and 30 as food position

const updateFoodPosition = () => {
    foodX = Math.floor(Math.random() * 30) + 1;
    foodY = Math.floor(Math.random() * 30) + 1;
}


const updateSuperFoodPosition = () => {
    superFoodX = Math.floor(Math.random() * 30) + 1;
    superFoodY = Math.floor(Math.random() * 30) + 1;
};

const handleGameOver = () => {
    clearInterval(setIntervalId);
    alert("Game Over! Press OK to replay...");
    location.reload();
}

// Change velocity value based on key press

const changeDirection = e => {
    if (e.key === "ArrowUp" && velocityY != 1) {
        velocityX = 0;
        velocityY = -1;
    } else if (e.key === "ArrowDown" && velocityY != -1) {
        velocityX = 0;
        velocityY = 1;
    } else if (e.key === "ArrowLeft" && velocityX != 1) {
        velocityX = -1;
        velocityY = 0;
    } else if (e.key === "ArrowRight" && velocityX != -1) {
        velocityX = 1;
        velocityY = 0;
    }
}

// Change Direction on each key click

controls.forEach(button =>
    button.addEventListener("click", () =>
    changeDirection({ key: button.dataset.key })
    ));

// ...

const handleTeleport = () => {
    if (snakeX < 1) snakeX = 30;
    if (snakeX > 30) snakeX = 1;
    if (snakeY < 1) snakeY = 30;
    if (snakeY > 30) snakeY = 1;
};


const initGame = () => {
    if (gameOver) return handleGameOver();
    let html = `<div class="food" style="grid-area: ${foodY} / ${foodX}"></div>`;

    // When snake eat food
    if (snakeX === foodX && snakeY === foodY) {
        updateFoodPosition();
        snakeBody.push([foodY, foodX]); //Add food to snake body array
        score++;
        highScore = score >= highScore ? score : highScore; // if score > high score => high score = score

        // Activate super food randomly
        if (!superFoodActive && Math.random() < 0.2)
        {
            superFoodActive = true;
            updateSuperFoodPosition();
            html += `<div class="super-food" style="grid-area: ${superFoodY} / ${superFoodX}"></div>`;
            setTimeout(() => {
                superFoodActive = false;
                updateSuperFoodPosition();
            }, superFoodDuration);
        }

        setIntervalId = setInterval(initGame, 200); // Increase the interval duration to slow down the snake movement
        document.addEventListener("keyup", changeDirection);
        scoreElement.innerText = `Score: ${score}`;
        highScoreElement.innerText = `High Score: ${highScore}`;
    }

    // Update Snake Head
    snakeX += velocityX;
    snakeY += velocityY;

    handleTeleport(); // Handle teleportation

    // Shifting forward values of elements in snake body by one
    for (let i = snakeBody.length - 1; i > 0; i--) {
        snakeBody[i] = snakeBody[i - 1];
    }

    snakeBody[0] = [snakeX, snakeY];

    // Check snake head hit body or no
    for (let i = 0; i < snakeBody.length; i++) {
        html += `<div class="head" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;
        if (
            i !== 0 &&
            snakeBody[0][1] === snakeBody[i][1] &&
            snakeBody[0][0] === snakeBody[i][0]
        ) {
            gameOver = true;
        }
    }
    playBoard.innerHTML = html;
};

if (!gameOver) {
    updateFoodPosition();
    setIntervalId = setInterval(initGame, 200);
    document.addEventListener("keyup", changeDirection);
}

