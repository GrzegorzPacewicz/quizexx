
const gameForm = document.getElementById('gameForm');
const connectButton = document.getElementById("connectButton")
const readyButton = document.getElementById("readyButton")

const answerAElement = document.getElementById('answerA');
const answerBElement = document.getElementById('answerB');
const answerCElement = document.getElementById('answerC');
const answerDElement = document.getElementById('answerD');


const displayRoundElement = document.getElementById('displayRound');
const displayCategoryElement = document.getElementById('displayCategory');
const displayQuestionElement = document.getElementById('displayQuestion');

const roomName = getRoomName();
let userName = "";

let ready = true;
let isAnswerSent = false;
let isPlayerReady = false;

let gameInfo = {
    clients: [""],
    category: "",
}

let gameState = {
    isGame: false,
    category: "",
    round: 1,
    question: "Test",
    answers: ["Lorem ipsum", "Lorem ipsum", "Lorem ipsum", "Lorem ipsum"],
    actions: [{ name: "", answer: null, round: 0 }],
    score: [{ name: "kuba", points: 10, roundsWon: [] }],
};

const entryDashboard = document.getElementById("entryDashboard")
const waitingRoomDashboard = document.getElementById("waitingRoomDashboard")
const gameDashboard = document.getElementById("gameDashboard")

let virtualDom = {
    entryDashboard: true,
    waitingRoomDashboard: false,
    gameDashboard: false,
}

handleVirtualDom()
//////////////// Listeners /////////

connectButton.addEventListener("click", () => {
    const nameInput = document.getElementById("userNameInput")
    const name = nameInput.value
    userName = name

    if (name !== "" && roomName !== "") {
        connectWs()
    }
})
readyButton.addEventListener("click", () => {
    if (isPlayerReady === true) return
    sendReadines()
    readyButton.disabled = true
    return
})

gameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!ready) return alert("you are not ready")
    const formData = new FormData(gameForm);

    //// to fix reset value in the future

    let answerValue = formData.get('q1');
    const answer = Number(answerValue)
    if (answerValue !== null) {
        sendAnswer(answer);
        formData = null
        return
    } else {
        console.log("Nie wybrano odpowiedzi");
    }
});

//////////////////////////////////////////////////////////////////////////////

class Event {
    constructor(type, payload) {
        this.type = type
        this.payload = payload
    }
}
function routeEvent(event) {
    if (event.type === undefined) {
        alert("no type field in the event")
    }
    switch (event.type) {
        case "update_gamestate":
            updateGameState(event)
            break
        case "update_players":
            updatePlayers(event)
            break
        case "room_msgAndInfo":
            updateAlerts(event)
            console.log(event)
            break
        default:
            alert("unsupporting message type")
            break;
    }
}

function updateAlerts(event) {
    console.log(event.type)
    const data = event.payload
    console.log(data.clients + "sssssssss")
    // <li class="text-black font-bold">Jakub ✔</li>
    // <li class="text-black font-bold">Krystian1229 ✔</li>
    // <li class="text-black font-bold">Jakub ❌</li>
    // <li class="text-black font-bold">Maciek ❌</li>
}

function sendEvent(eventName, payload) {
    const event = new Event(eventName, payload)

    conn.send(JSON.stringify(event))
}

function connectWs() {
    if (window.WebSocket) {
        const wsUrl = getWsUrl()
        conn = new WebSocket(wsUrl)
        conn.onopen = (e) => {
            console.log("ok")
            updateVirtualDom({
                entryDashboard: false,
                waitingRoomDashboard: true,
                gameDashboard: false,
            })
        }

        conn.onclose = (e) => {
            alert("closed connection with ws server ", e.data)
        }

        conn.onmessage = (e) => {
            console.log(e.data)
            const event = JSON.parse(e.data)
            routeEvent(event)
        }
    } else {
        alert("your browser doesn't support websockets")
    }
}
//////////////////////////////////////////

function getRoomName() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('roomName') || '';
}

function getWsUrl() {
    const baseUrl = "ws://localhost:8090/ws"
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const isNewGame = urlParams.get('newGame') === 'true';

    if (isNewGame) {
        const gameSettings = {
            difficulty: urlParams.get('difficulty') || '',
            maxRounds: urlParams.get('maxRounds') || '',
            category: urlParams.get('category') || '',
        }
        console.log(gameSettings)
        return `${baseUrl}?new=true&room=${roomName}&name=${userName}&difficulty=${gameSettings.difficulty}&maxRounds=${gameSettings.maxRounds}&category=${gameSettings.category}`
    } else {
        return `${baseUrl}?room=${roomName}&name=${userName}`
    }
}

/////////// DOM /////////

function updateVirtualDom(newVirtualDom) {
    virtualDom = newVirtualDom
    console.log(virtualDom)
    handleVirtualDom()
}

function handleVirtualDom() {
    entryDashboard.classList.remove("hidden");
    waitingRoomDashboard.classList.remove("hidden");
    gameDashboard.classList.remove("hidden");
    if (virtualDom.entryDashboard) {
        waitingRoomDashboard.classList.add("hidden");
        gameDashboard.classList.add("hidden");
    } else if (virtualDom.waitingRoomDashboard) {
        entryDashboard.classList.add("hidden");
        gameDashboard.classList.add("hidden");
    } else if (virtualDom.gameDashboard) {
        entryDashboard.classList.add("hidden");
        waitingRoomDashboard.classList.add("hidden");
    }
}

function updateDomGameState() {

    answerAElement.innerHTML = gameState.answers[0]
    answerBElement.innerHTML = gameState.answers[1]
    answerCElement.innerHTML = gameState.answers[2]
    answerDElement.innerHTML = gameState.answers[3]

    displayRoundElement.innerHTML = gameState.round
    displayQuestionElement.innerHTML = gameState.question
}

function updateDomScore(playerList) {
    const tableBody = document.getElementById('scoreTableBody');

    tableBody.innerHTML = '';

    playerList.forEach(player => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const pointsCell = document.createElement('td');

        nameCell.textContent = player.name;
        pointsCell.textContent = player.points;

        row.appendChild(nameCell);
        row.appendChild(pointsCell);
        tableBody.appendChild(row);
    });
}


///////////////////// SERVER EVENT FUNCTIONS //////////////////////

function updateGameState(event) {
    if (gameState.isGame === true) {
        updateVirtualDom({
            entryDashboard: false,
            waitingRoomDashboard: false,
            gameDashboard: true,
        })
    }
    gameState = event.payload
    console.log(gameState, "update")

    updateDomScore(gameState.score)
    updateDomGameState()
    return
}

function updatePlayers(event) {
    const newPlayersState = event.payload
    gameState.players = newPlayersState
    updateDomGameState()

    return
}

//////////////////// CLIENT EVENT FUNCTIONS ////////////////////

function sendReadines() {
    const payload = {
        name: userName,
        isReady: true,
    }
    sendEvent("ready_player", payload)
    return
}


function sendAnswer(answer) {
    const payload = {
        name: userName,
        round: gameState.round,
        answer,
        points: 0,
    }
    sendEvent("send_answer", payload)
    return
}