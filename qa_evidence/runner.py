"""
Comprehensive Live QA Execution Script for Coal Governance Platform
Produces exact request/response data files, MySQL DB verification dumps, and test logs.
"""

import os
import sys
import json
import time
import requests
import pymysql

BASE_URL = "http://localhost:8080/api"
AI_URL = "http://localhost:5000"
FRONTEND_URL = "http://localhost:8000"

DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "Sandy@118",
    "database": "coal_governance",
    "autocommit": True,
    "cursorclass": pymysql.cursors.DictCursor
}

DATA_DIR = os.path.join("qa_evidence", "data")
DB_DIR = os.path.join("qa_evidence", "db")
SCREENSHOTS_DIR = os.path.join("qa_evidence", "screenshots")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def get_db():
    return pymysql.connect(**DB_CONFIG)

def reset_db():
    conn = pymysql.connect(host="127.0.0.1", user="root", password="Sandy@118", autocommit=True)
    cur = conn.cursor()
    cur.execute("DROP DATABASE IF EXISTS coal_governance")
    cur.execute("CREATE DATABASE coal_governance")
    cur.execute("USE coal_governance")
    with open("database/schema.sql", "r", encoding="utf-8") as f:
        for stmt in f.read().split(";"):
            s = stmt.strip()
            if s:
                cur.execute(s)
    with open("database/seed.sql", "r", encoding="utf-8") as f:
        for stmt in f.read().split(";"):
            s = stmt.strip()
            if s:
                cur.execute(s)
    conn.close()

def save_evidence(test_id, req_data, res_data, db_data=None):
    # Save HTTP request & response
    data_file = os.path.join(DATA_DIR, f"{test_id}.json")
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump({
            "test_id": test_id,
            "request": req_data,
            "response": res_data
        }, f, indent=2, default=str)
    
    # Save DB dump if provided
    if db_data is not None:
        db_file = os.path.join(DB_DIR, f"{test_id}_db.json")
        with open(db_file, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=2, default=str)
    
    print(f"[{test_id}] Evidence saved: {data_file}")

def query_db(query, args=None):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(query, args or ())
            return cur.fetchall()
    finally:
        conn.close()

def login(email, password="Coal@2026"):
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        data = r.json()
        token = data.get("data", {}).get("token")
        return token, r
    return None, r

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

print("QA Runner initialized successfully.")
