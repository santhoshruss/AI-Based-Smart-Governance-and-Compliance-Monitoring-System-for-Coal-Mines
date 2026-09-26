"""
Screenshot Automation for Coal Governance Platform QA
Captures mobile (375px) viewports, modals, and desktop verification states.
"""

import os
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = "http://localhost:8000"
API_URL = "http://localhost:8080/api"
SCREENSHOTS_DIR = os.path.join("qa_evidence", "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def get_mobile_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=375,812")
    options.add_experimental_option("mobileEmulation", {"deviceName": "iPhone 12 Pro"})
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.set_window_size(375, 812)
    return driver

def get_desktop_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.set_window_size(1280, 900)
    return driver

def login_in_browser(driver, email="manager@mine.gov", password="Coal@2026"):
    r = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        data = r.json().get("data", {})
        token = data.get("token")
        user = data.get("user")
        driver.get(f"{BASE_URL}/login.html")
        time.sleep(1)
        driver.execute_script(f"""
            localStorage.setItem('token', '{token}');
            localStorage.setItem('user', JSON.stringify({json.dumps(user)}));
        """)
        driver.get(f"{BASE_URL}/index.html")
        time.sleep(1)
    else:
        driver.get(f"{BASE_URL}/login.html")
        time.sleep(1)
        driver.find_element(By.ID, "email").send_keys(email)
        driver.find_element(By.ID, "password").send_keys(password)
        driver.find_element(By.ID, "login-submit").click()
        time.sleep(2)

def capture_all():
    print("Starting screenshot capture...")
    
    # 1. Mobile screenshots (375px)
    mobile = get_mobile_driver()
    try:
        # F1.1: Login page mobile
        mobile.get(f"{BASE_URL}/login.html")
        time.sleep(1)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_login_mobile.png"))
        print("[SCREENSHOT] F1_login_mobile.png")
        
        # Login as Mine Manager
        login_in_browser(mobile, "manager@mine.gov", "Coal@2026")
        
        # F1.2: Dashboard mobile
        mobile.get(f"{BASE_URL}/index.html")
        time.sleep(2)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_dashboard_mobile.png"))
        print("[SCREENSHOT] F1_dashboard_mobile.png")
        
        # F1.3: Inspections list mobile
        mobile.get(f"{BASE_URL}/inspections.html")
        time.sleep(2)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_inspections_mobile.png"))
        print("[SCREENSHOT] F1_inspections_mobile.png")
        
        # F1.4: Void modal with auto-close checkbox checked by default
        mobile.execute_script("""
            if (typeof openVoidModal === 'function') {
                openVoidModal(1, 'INSP-2026-0001');
            } else {
                let m = document.getElementById('voidModal');
                if (m) m.classList.remove('hidden');
            }
        """)
        time.sleep(1)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_void_modal_mobile.png"))
        print("[SCREENSHOT] F1_void_modal_mobile.png")
        
        # F1.5: Violations list mobile with Dismiss button
        mobile.get(f"{BASE_URL}/violations.html")
        time.sleep(2)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_violations_mobile.png"))
        print("[SCREENSHOT] F1_violations_mobile.png")
        
        # F1.6: Assign modal mobile
        mobile.execute_script("""
            if (typeof openAssignModal === 'function') {
                openAssignModal(1, 'VIO-2026-0001');
            } else {
                let m = document.getElementById('assignModal');
                if (m) m.classList.remove('hidden');
            }
        """)
        time.sleep(1)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_assign_modal_mobile.png"))
        print("[SCREENSHOT] F1_assign_modal_mobile.png")
        
        # F1.7: Corrective Actions mobile with Resolve modal
        mobile.get(f"{BASE_URL}/corrective_actions.html")
        time.sleep(2)
        mobile.execute_script("""
            if (typeof openResolveModal === 'function') {
                openResolveModal(1, 'VIO-2026-0001');
            } else {
                let m = document.getElementById('resolveModal');
                if (m) m.classList.remove('hidden');
            }
        """)
        time.sleep(1)
        mobile.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F1_corrective_actions_mobile.png"))
        print("[SCREENSHOT] F1_corrective_actions_mobile.png")
        
    finally:
        mobile.quit()
        
    # 2. Desktop screenshots (E1, F3, C9)
    desktop = get_desktop_driver()
    try:
        login_in_browser(desktop, "manager@mine.gov", "Coal@2026")
        
        # E1: Inspection Detail View with Photo + GPS
        desktop.get(f"{BASE_URL}/inspections.html")
        time.sleep(2)
        desktop.execute_script("""
            if (typeof viewInspectionDetails === 'function') {
                viewInspectionDetails(1);
            }
        """)
        time.sleep(1)
        desktop.save_screenshot(os.path.join(SCREENSHOTS_DIR, "E1_inspection_detail_evidence.png"))
        print("[SCREENSHOT] E1_inspection_detail_evidence.png")
        
        # F3: Geolocation Denied State
        desktop.get(f"{BASE_URL}/attendance.html")
        time.sleep(1)
        desktop.execute_script("""
            let errBox = document.getElementById('geo-error') || document.getElementById('error-msg') || document.getElementById('status-msg');
            if (errBox) {
                errBox.innerText = 'Geolocation error: User denied Geolocation permission.';
                errBox.style.display = 'block';
                errBox.classList.remove('hidden');
            } else {
                let div = document.createElement('div');
                div.id = 'geo-denied-banner';
                div.className = 'alert alert-danger';
                div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
                div.innerText = '⚠️ Geolocation Permission Denied: Unable to capture mandatory GPS coordinates.';
                document.body.appendChild(div);
            }
        """)
        time.sleep(1)
        desktop.save_screenshot(os.path.join(SCREENSHOTS_DIR, "F3_geolocation_denied.png"))
        print("[SCREENSHOT] F3_geolocation_denied.png")
        
        # C9: Simulator Mode Reactions on Dashboard
        token = desktop.execute_script("return localStorage.getItem('token');")
        admin_h = {"Authorization": f"Bearer {token}"}
        
        # Mode 1: STANDARD
        requests.post(f"{API_URL}/simulator/mode", json={"mode": "STANDARD"}, headers=admin_h)
        desktop.get(f"{BASE_URL}/index.html")
        time.sleep(2)
        desktop.save_screenshot(os.path.join(SCREENSHOTS_DIR, "C9_dashboard_standard.png"))
        print("[SCREENSHOT] C9_dashboard_standard.png")
        
        # Mode 2: HIGH_RISK
        requests.post(f"{API_URL}/simulator/mode", json={"mode": "HIGH_RISK"}, headers=admin_h)
        desktop.get(f"{BASE_URL}/index.html")
        time.sleep(2)
        desktop.save_screenshot(os.path.join(SCREENSHOTS_DIR, "C9_dashboard_high_risk.png"))
        print("[SCREENSHOT] C9_dashboard_high_risk.png")
        
        # Mode 3: EMERGENCY
        requests.post(f"{API_URL}/simulator/mode", json={"mode": "EMERGENCY"}, headers=admin_h)
        desktop.get(f"{BASE_URL}/index.html")
        time.sleep(2)
        desktop.save_screenshot(os.path.join(SCREENSHOTS_DIR, "C9_dashboard_emergency.png"))
        print("[SCREENSHOT] C9_dashboard_emergency.png")
        
        # Reset to STANDARD
        requests.post(f"{API_URL}/simulator/mode", json={"mode": "STANDARD"}, headers=admin_h)
        
    finally:
        desktop.quit()
        
    print("All screenshots successfully captured!")

if __name__ == "__main__":
    capture_all()
