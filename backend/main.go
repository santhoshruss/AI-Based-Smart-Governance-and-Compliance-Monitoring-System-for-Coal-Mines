package main

import (
	"log"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"coal-governance-backend/config"
	"coal-governance-backend/database"
	"coal-governance-backend/routes"
	"coal-governance-backend/services"
)

func main() {
	cfg := config.Load()

	database.Connect(cfg)
	defer database.DB.Close()

	// Start automated SLA Escalation Cron scheduler
	services.StartSLAEscalationCron(cfg)

	router := gin.Default()

	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	if cfg.CorsOrigins == "*" || cfg.CorsOrigins == "" {
		corsConfig.AllowAllOrigins = true
		corsConfig.AllowCredentials = false // cannot use AllowCredentials with AllowAllOrigins in standard CORS
	} else {
		origins := []string{}
		for _, o := range strings.Split(cfg.CorsOrigins, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
		corsConfig.AllowOrigins = origins
	}
	router.Use(cors.New(corsConfig))

	routes.RegisterRoutes(router, cfg)

	// Serve uploaded evidence photos and documents statically
	router.Static("/uploads", "./uploads")

	// Serve frontend directly from Go backend for single-port convenience
	router.StaticFile("/", "../frontend/index.html")
	router.StaticFile("/index.html", "../frontend/index.html")
	router.StaticFile("/login.html", "../frontend/login.html")
	router.StaticFile("/inspections.html", "../frontend/inspections.html")
	router.StaticFile("/violations.html", "../frontend/violations.html")
	router.StaticFile("/dashboard.html", "../frontend/dashboard.html")
	router.StaticFile("/mines.html", "../frontend/mines.html")
	router.StaticFile("/analytics.html", "../frontend/analytics.html")
	router.StaticFile("/corrective-actions.html", "../frontend/corrective-actions.html")
	router.StaticFile("/compliance.html", "../frontend/compliance.html")
	router.Static("/js", "../frontend/js")
	router.Static("/css", "../frontend/css")
	router.Static("/assets", "../frontend/assets")

	log.Printf("Coal Governance backend starting on port %s\n", cfg.AppPort)
	if err := router.Run(":" + cfg.AppPort); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
