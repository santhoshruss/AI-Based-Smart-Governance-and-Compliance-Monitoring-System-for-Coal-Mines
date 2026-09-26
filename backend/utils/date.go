package utils

import (
	"fmt"
	"strings"
	"time"
)

// FormatDateFromDB converts an interface{} value scanned from a DATE/TIMESTAMP column to a YYYY-MM-DD string.
func FormatDateFromDB(val interface{}) string {
	if val == nil {
		return ""
	}
	switch v := val.(type) {
	case time.Time:
		return v.Format("2006-01-02")
	case *time.Time:
		if v == nil {
			return ""
		}
		return v.Format("2006-01-02")
	case []byte:
		s := strings.TrimSpace(string(v))
		if len(s) >= 10 && (s[4] == '-' || s[4] == '/') {
			return s[:10]
		}
		return s
	case string:
		s := strings.TrimSpace(v)
		if len(s) >= 10 && (s[4] == '-' || s[4] == '/') {
			return s[:10]
		}
		return s
	default:
		s := fmt.Sprintf("%v", v)
		if len(s) >= 10 && (s[4] == '-' || s[4] == '/') {
			return s[:10]
		}
		return s
	}
}

// ParseNullableDate parses string input to either a formatted YYYY-MM-DD string or nil for database queries.
func ParseNullableDate(d string) interface{} {
	d = strings.TrimSpace(d)
	if d == "" || d == "null" || d == "None" || d == "N/A" || d == "-" {
		return nil
	}
	// Standard date formats
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
		"02-01-2006",
		"02/01/2006",
		"2006/01/02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, d); err == nil {
			return t.Format("2006-01-02")
		}
	}
	return d
}
