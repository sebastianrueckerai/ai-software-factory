package main

import (
	"bytes"
	"fmt"
	"net/http"
)

// notifyRollback tells the store that a purchase could not be granted.
func notifyRollback(storeURL, purchaseID string) error {
	resp, err := http.Post(
		fmt.Sprintf("%s/api/purchases/%s/rollback", storeURL, purchaseID),
		"application/json",
		bytes.NewReader(nil),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("store answered %d", resp.StatusCode)
	}
	return nil
}
