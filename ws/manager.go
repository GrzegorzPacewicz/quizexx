package ws

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type manager struct {
	rooms  map[string]*room
	mutex  sync.Mutex
	events map[string]EventHandler
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

func NewManager() *manager {
	m := &manager{
		rooms:  make(map[string]*room),
		events: make(map[string]EventHandler),
	}
	m.setupEventHandlers()
	log.Println(m.events)
	return m
}
func (m *manager) setupEventHandlers() {
	m.events[EventSendMessage] = SendMessage
	m.events[EventSendAnswer] = SendAnswer
}

func SendMessage(event Event, c *client) error {
	log.Println(event)
	return nil
}
func SendAnswer(event Event, c *client) error {
	log.Println(event)
	return nil
}

func (m *manager) routeEvent(event Event, c *client) error {
	if handler, ok := m.events[event.Type]; ok {
		if err := handler(event, c); err != nil {
			return err
		}
		return nil
	} else {
		return nil
	}
}

func (m *manager) ServeHTTP(w http.ResponseWriter, req *http.Request) {

	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Println(err)
		return
	}

	room := req.URL.Query().Get("room")
	if room == "" {
		return
	}
	name := req.URL.Query().Get("name")
	if name == "" || name == "serwer" || name == "klient" {
		return
	}

	log.Printf("New connection: %v connected to room: %v", name, room)

	currentRoom := m.GetRoom(room)

	if currentRoom == nil {
		currentRoom = m.CreateRoom(room)
		go currentRoom.Run(m)
	}

	client := &client{
		conn:    conn,
		receive: make(chan []byte),
		room:    currentRoom,
		name:    name,
	}

	currentRoom.join <- client
	log.Println(m.events)
	defer func() { currentRoom.leave <- client }()
	go client.write()
	client.read(m)
}
