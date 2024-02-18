package ws

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Manager struct {
	mutex sync.Mutex
	rooms map[string]*room
}

var (
	upgrader = &websocket.Upgrader{
		CheckOrigin:     checkOrigin,
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
)

func checkOrigin(r *http.Request) bool {
	return true
}

func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*room),
	}
}

func (m *Manager) GetRoomNamesList() []string {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	var names []string

	for roomName := range m.rooms {
		names = append(names, roomName)
	}

	return names
}

func (m *Manager) ServeHTTP(w http.ResponseWriter, req *http.Request) {

	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println(err)
		return
	}

	roomName := req.URL.Query().Get("room")
	if roomName == "" {
		return
	}
	name := req.URL.Query().Get("name")
	if name == "" || name == "serwer" || name == "klient" {
		return
	}
	isNewRoom := req.URL.Query().Get("new")
	difficulty := req.URL.Query().Get("difficulty")
	maxRounds := req.URL.Query().Get("maxRounds")
	category := req.URL.Query().Get("category")
	if len(category) >= 32 {
		return
	}
	log.Println(category, maxRounds, difficulty)
	log.Printf("New connection: %v connected to room: %v", name, roomName)

	currentRoom := m.GetRoom(roomName)

	if currentRoom == nil {
		settingsGPT := SettingsGPT{
			name:         name,
			gameCategory: category,
			difficulty:   difficulty,
			maxRounds:    maxRounds,
		}
		if isNewRoom == "true" {
			currentRoom = m.CreateRoom(settingsGPT)
			go currentRoom.Run(m)
		} else {
			conn.Close()
			return
		}

	}

	client := &client{
		conn:    conn,
		receive: make(chan []byte),
		room:    currentRoom,
		name:    name,
		answer:  -1,
		points:  0,
		isReady: false,
	}

	currentRoom.join <- client
	defer func() { currentRoom.leave <- client }()
	go client.write()
	client.read(m)
}
