package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
)

type World struct {
	mu    sync.Mutex
	Tick  int `json:"tick"`
	Ships int `json:"ships"`
}

func (w *World) step() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.Tick++
}

func main() {
	world := &World{}
	http.HandleFunc("/state", func(rw http.ResponseWriter, r *http.Request) {
		world.mu.Lock()
		defer world.mu.Unlock()
		json.NewEncoder(rw).Encode(world)
	})
	log.Println("game server on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
