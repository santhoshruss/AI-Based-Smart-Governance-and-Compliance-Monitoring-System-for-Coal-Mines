package database

import (
	"testing"
)

func TestRebind(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "no params",
			input:    "SELECT * FROM users",
			expected: "SELECT * FROM users",
		},
		{
			name:     "single param",
			input:    "SELECT * FROM users WHERE id = ?",
			expected: "SELECT * FROM users WHERE id = $1",
		},
		{
			name:     "multiple params",
			input:    "INSERT INTO mines (name, code, type) VALUES (?, ?, ?)",
			expected: "INSERT INTO mines (name, code, type) VALUES ($1, $2, $3)",
		},
		{
			name:     "params with string literal containing question mark",
			input:    "SELECT * FROM logs WHERE message = 'Is this working?' AND level = ?",
			expected: "SELECT * FROM logs WHERE message = 'Is this working?' AND level = $1",
		},
		{
			name:     "escaped single quotes inside string literal",
			input:    "SELECT * FROM logs WHERE message = 'Don''t know?' AND id = ?",
			expected: "SELECT * FROM logs WHERE message = 'Don''t know?' AND id = $1",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := Rebind(tc.input)
			if actual != tc.expected {
				t.Errorf("Rebind(%q) = %q, expected %q", tc.input, actual, tc.expected)
			}
		})
	}
}
