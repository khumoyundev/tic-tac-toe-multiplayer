import gsap from "../libs/gsap/gsap.js";
import { isUsernameValid } from "./_utils.js";
import { io } from "../libs/socket.io/socket.io.esm.min.js";

const socket = io();

const X_CLASS = "board--cell-x",
    CIRCLE_CLASS = "board--cell-circle",
    opponentMouse = { x: 0, y: 0 },
    opponentCursor = new Image(),
    divEl = document.createElement("div"),
    isRegistered = localStorage.getItem("nickname");

const allCells = document.querySelectorAll("[data-cell]"),
    messageEl = document.getElementById("message"),
    overlayEl = document.getElementById("overlay"),
    boardEl = document.getElementById("board"),
    overlayMessageEl = document.getElementById("overlay-message"),
    registrationEl = document.getElementById("registration"),
    usernameEl = document.getElementById("username"),
    usernameBtn = document.getElementById("username-enter"),
    rememberMe = document.getElementById("remember-me"),
    opponentEl = document.getElementById("opponent");

let previousX,
    previousY,
    mouse = { x: 0, y: 0 },
    dx, dy, isX = false,
    opponentNickname = "",
    alreadySet = false,
    myTurn = false, alreadyShown = false,
    userOnPage = true,
    cssStyle = `
        position: fixed; 
        left: 50%; 
        top: 50%; 
        transform: translate(-50%, -50%); 
        width: 32px; 
        height: 32px; 
        z-index: 9999;
        color: white;
        text-align: center;
    `;

opponentCursor.src = "../res/cursor.png";

opponentCursor.style.cssText = cssStyle;
divEl.style.cssText = cssStyle;

const setOpponentMouse = (_mouse, _nickname) => {
    opponentMouse.x = _mouse.x;
    opponentMouse.y = _mouse.y;
    opponentNickname = _nickname;

    if (_nickname === "khumoyun" && !alreadySet) {
        opponentCursor.src = "../res/cursor-dev.png";
        alreadySet = true;
    } else {
        divEl.textContent = opponentNickname === "khumoyun" ? "Developer" : (_nickname || "player");
    }
};

const setOpponentPlay = (_target, _currentClass) => {
    allCells.forEach((_cell, _id) => {
        if (_id == _target) {
            place(_cell, _currentClass);
        }
    });
    myTurn = true;
};

const displayUserLeftMessage = _username => {
    new duDialog(null, 'Your opponent has left the game - ' + _username, {
        buttons: duDialog.OK_CANCEL,
        okText: 'Ok',
        callbacks: {
            okClick() {
                document.location.reload();
                this.hide();
            },
            cancelClick() {
                document.location.reload();
                this.hide();
            }
        }
    });
};

const sendMsg = _message => {
    Toastify({
        text: _message,
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "right",
        stopOnFocus: false,
        style: {
            background: "linear-gradient(to right, #0D324D, #7F5A83)",
        },
    }).showToast();

    let notification = new Notify('A message received!', {
        body: _message,
    });

    if (!Notify.needsPermission && !userOnPage) {
        alreadyShown = true;
        notification.show();
    }
};

const beginGame = _ => {

    let notification = new Notify('An opponed found!', {
        body: 'Please go to your tab and play with your opponent',
    });

    if (!Notify.needsPermission && !alreadyShown && !userOnPage) {
        alreadyShown = true;
        notification.show();
    }

    if (_) {
        isX = true;
        myTurn = true;
    }

    messageEl.style.opacity = 1;

    animateCursor();

    allCells.forEach((_cell, _id) => {
        /* "once" property prevents the user from multiple clicking */
        _cell.dataset.id = _id;
        _cell.addEventListener("click", handleClick, { once: true });
    });

    setBoardHoverClass();

    const intervalID = setInterval(() => {
        /* We need to prevent sending a lot of requests to the server */
        if (previousX != mouse.x || previousY != mouse.y) {
            previousX = mouse.x;
            previousY = mouse.y;
            socket.emit('cursor-move', { x: mouse.x, y: mouse.y });
        }
    }, 100);

    document.body.appendChild(opponentCursor);
    document.body.appendChild(divEl);

    hideEverythingExceptGameBoard();
}

const setUserOnPage = () => {
    if (document.hidden) userOnPage = false;
    else userOnPage = true;
};

/* Winning Combinations */
const W_COMBS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const hideEverythingExceptGameBoard = () => {
    gsap.to(opponentEl, {
        opacity: 0,
        onComplete() {
            opponentEl.style.pointerEvents = "none";
        }
    });

    gsap.to(registrationEl, {
        opacity: 0,
        onComplete() {
            registrationEl.style.pointerEvents = "none";
        }
    });

    gsap.to(boardEl, {
        opacity: 1,
        onComplete() {
            boardEl.style.pointerEvents = "all";
        }
    })
}

const getWinner = () => {
    /* Will work on this soon */
    return "Congrats! Reloading the page...";
}

const endGame = (_) => {

    gsap.to(overlayEl, {
        opacity: 1,
        duration: 0.7,
        onComplete() {
            overlayEl.style.pointerEvents = "all";
        }
    });

    if (!_) {
        overlayMessageEl.innerHTML = getWinner();
        setTimeout(() => {
            document.location.reload();
        }, 4000);
        return;
    }

    /* Wait 3 seconds to see the end result and refresh the page */
    setTimeout(() => {
        document.location.reload();
    }, 3000);

    overlayMessageEl.innerText = 'Draw!'
}

const place = (_cell, _class) => {
    _cell.classList.add(_class);

    if (checkWin(_class)) endGame(false);
    else if (isDraw()) endGame(true);

    setBoardHoverClass();
}

const isDraw = () => {
    return [...allCells].every(_cell => {
        return _cell.classList.contains(X_CLASS) || _cell.classList.contains(CIRCLE_CLASS)
    })
}

const checkWin = (_cClass) => {
    return W_COMBS.some(_combination => {
        return _combination.every(_index => {
            return allCells[_index].classList.contains(_cClass);
        });
    });
}

const setBoardHoverClass = () => {
    boardEl.classList.remove("x-turn");
    boardEl.classList.remove("circle-turn");

    if (isX) {
        boardEl.classList.add("x-turn");
        return;
    }

    boardEl.classList.add("circle-turn");
}

const handleClick = (_e) => {
    const target = _e.target.dataset.id;
    const currentClass = isX ? X_CLASS : CIRCLE_CLASS;

    if (myTurn) {
        place(_e.target, currentClass);
        socket.emit("play", target, currentClass);
    }

    myTurn = false;
}

const displayOpponentOverlay = () => {
    gsap.to(opponentEl, {
        opacity: 1,
        onComplete() {
            opponentEl.style.pointerEvents = "all";
        }
    });
}

const hideOpponentOverlay = () => {
    const tm = gsap.timeline();

    tm.to(opponentEl, {
        opacity: 0,
        onComplete() {
            opponentEl.style.pointerEvents = "none";
        }
    });

    tm.to(boardEl, {
        opacity: 1,
        onComplete() {
            boardEl.style.pointerEvents = "all";
        }
    })
}

const hideRegistration = () => {
    socket.emit("registered-user", {})

    const timeline = gsap.timeline();

    timeline.to(registrationEl, {
        opacity: 0,
        onComplete() {
            registrationEl.style.pointerEvents = "none";
        }
    });

    timeline.to(opponentEl, {
        opacity: 1,
        onComplete() {
            opponentEl.style.pointerEvents = "all";
        }
    });
}

const handleRegistration = _event => {
    if (!isUsernameValid(usernameEl.value)) {
        usernameEl.style.borderColor = "red"
        return;
    }

    usernameEl.style.borderColor = "#2c3e50";
    socket.emit("set-username", usernameEl.value);

    if (rememberMe.checked) localStorage.setItem("nickname", usernameEl.value);

    if (Notify.isSupported()) Notify.requestPermission();


    hideRegistration();
}

const handleReg = _event => {
    if (!isUsernameValid(usernameEl.value)) {
        usernameEl.style.borderColor = "red"
        return;
    } else usernameEl.style.borderColor = "#2c3e50";

    if (!(_event.key === "Enter")) return;

    socket.emit("set-username", usernameEl.value);

    if (rememberMe.checked) localStorage.setItem("nickname", usernameEl.value);

    try {
        if (Notify.isSupported()) Notify.requestPermission();
    } catch (_) { }

    hideRegistration();
}

const mouseMove = _event => {
    mouse.x = (100 / innerWidth) * _event.clientX;
    mouse.y = (100 / innerHeight) * _event.clientY;
}

const animateCursor = () => {
    opponentEl.style.opacity = 0;
    opponentEl.style.pointerEvents = "none";

    // For smooth cursor movement...
    let cursorLeft = parseFloat(opponentCursor.style.left.replace("%", ""));
    let cursorTop = parseFloat(opponentCursor.style.top.replace("%", ""));

    dx = opponentMouse.x - cursorLeft;
    dy = opponentMouse.y - cursorTop;

    opponentCursor.style.left = cursorLeft + (dx / 20) + "%";
    opponentCursor.style.top = cursorTop + (dy / 20) + "%";
    divEl.style.left = (cursorLeft + (dx / 20)) + "%";
    divEl.style.top = (cursorTop + (dy / 20) + 5) + "%";

    requestAnimationFrame(animateCursor);
}

const notify = _message => {
    socket.emit("notify", _message);

    // Sends to the current user
    Toastify({
        text: _message,
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "right",
        stopOnFocus: false,
        style: {
            background: "white",
            color: "#144"
        },
    }).showToast();
};

const storeUser = () => storeUser = rememberMe.checked;

const sendMessage = _message => {
    if (_message.key != "Enter") return;

    if (_message.target.value.length < 40 && _message.target.value !== "") {
        notify(_message.target.value);
        _message.target.value = "";
    } else {
        Toastify({
            text: "Oops, message is too short, or too big.",
            duration: 3000,
            close: true,
            gravity: "bottom",
            position: "right",
            stopOnFocus: false,
            style: {
                background: "#DC143C",
                color: "white"
            },
        }).showToast();
    }
}

if (isRegistered) {
    let nickname = localStorage.getItem("nickname");

    socket.emit("set-username", nickname);

    hideRegistration();
}

socket.on("cursor-move", setOpponentMouse);

socket.on("opponent", setOpponentPlay);

socket.on("opponent-disconnected", displayUserLeftMessage);

socket.on("set-notify", sendMsg);

socket.on("start-game", beginGame);

rememberMe.addEventListener("change", storeUser);

usernameBtn.addEventListener("click", handleRegistration);

usernameEl.addEventListener("keydown", handleReg);

messageEl.addEventListener("keydown", sendMessage);

window.addEventListener("mousemove", mouseMove);

document.addEventListener('visibilitychange', setUserOnPage);