class Event {
    constructor(type, payload) {
        this.type = type
        this.payload = payload
    }
}
function routeEvent(event) {
    console.log(event.type)
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
        case "server_message":
            updateServerMessage(event)
            break
        case "ready_status":
            updateReadyStatus(event)
            break
        case "finish_game":
            gameState = {}
            updateVirtualDom({
                entryDashboard: true,
                waitingRoomDashboard: false,
                gameDashboard: false,
            })
            break
        case "room_settings":
            console.log(event)
            updateRoomSettings(event)
            break
        default:
            alert("unsupporting message type")
            break;
    }
}

//////////////////// SERVER EVENT FUNCTIONS //////////////////////

function updateGameState(event) {
    if (gameState.isGame) {
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

function updateReadyStatus(event) {
    const players = event.payload.clients
    updateDomReadyStatus(players)
}

function updateRoomSettings(event) {
    const data = event.payload
    console.log(data)
    roomSettings = data
    updateDomSettings(data)
}

function updateServerMessage(event) {
    const data = event.payload.message

    updateDomServerMessage(data)
}

function sendEvent(eventName, payload) {
    const event = new Event(eventName, payload)

    conn.send(JSON.stringify(event))
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