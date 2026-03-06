"""Verify all 5 fixes work against real backend."""
import time
import requests
from playwright.sync_api import sync_playwright, Page

BASE = "http://localhost:5176"
API = "http://localhost:8080/api/v1"
SS = "/home/will/LandscapeCRM/test-results"

def get_token():
    pwd = 'GreenAdmin123' + chr(33)
    r = requests.post(f'{API}/auth/login', json={'email':'admin@greenscape.com','password':pwd})
    return r.json()['access_token']

def ss(page, name):
    page.screenshot(path=f"{SS}/{name}.png", full_page=True)

def has_modal(page):
    return page.locator(".fixed.inset-0.z-50").count() > 0

PASS = 0
FAIL = 0

def check(name, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS: {name}")
    else:
        FAIL += 1
        print(f"  FAIL: {name}")

def main():
    global PASS, FAIL
    token = get_token()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # Auth
        page.goto(BASE)
        page.evaluate(f"localStorage.setItem('gs_token', '{token}')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # ===== FIX 1 & 2: Login — no demo mode =====
        print("\n=== FIX 1&2: Login page — demo mode removed ===")
        page.evaluate("localStorage.removeItem('gs_token')")
        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "v01_login")

        demo_btn = page.locator("button:has-text('Demo')")
        check("No demo button", demo_btn.count() == 0)

        # Try wrong password
        page.locator("input[type='email']").fill("admin@greenscape.com")
        page.locator("input[type='password']").fill("wrongpassword")
        page.locator("button:has-text('Sign In')").click()
        time.sleep(2)
        ss(page, "v01a_login_failed")
        token_after = page.evaluate("localStorage.getItem('gs_token')")
        check("Failed login doesn't set demo token", token_after != 'demo_token')

        # Try correct login (re-fill both fields since form may have cleared)
        page.locator("input[type='email']").fill("admin@greenscape.com")
        page.locator("input[type='password']").fill("GreenAdmin123!")
        page.locator("button:has-text('Sign In')").click()
        time.sleep(3)
        ss(page, "v01b_login_success")
        check("Real login works", "/login" not in page.url)

        # Re-auth for remaining tests
        token = get_token()
        page.evaluate(f"localStorage.setItem('gs_token', '{token}')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle"); time.sleep(2)

        # ===== FIX 3: Create Invoice button =====
        print("\n=== FIX 3: Create Invoice ===")
        page.goto(f"{BASE}/invoices")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "v02_invoices")

        new_inv_btn = page.locator("button:has-text('New Invoice')")
        check("New Invoice button exists", new_inv_btn.count() > 0)

        if new_inv_btn.count() > 0:
            new_inv_btn.click()
            time.sleep(0.5)
            check("New Invoice modal opens", has_modal(page))
            ss(page, "v02a_invoice_modal")

            if has_modal(page):
                # Fill form
                sel = page.locator(".fixed.inset-0.z-50 select:visible").first
                if sel.count() > 0:
                    opts = sel.locator("option").all()
                    if len(opts) > 1:
                        sel.select_option(index=1)

                # Fill due date
                date_input = page.locator(".fixed.inset-0.z-50 input[type='date']").first
                if date_input.count() > 0:
                    date_input.fill("2026-07-01")

                # Fill line item description
                desc_input = page.locator(".fixed.inset-0.z-50 input[placeholder='Description']").first
                if desc_input.count() > 0:
                    desc_input.fill("Lawn maintenance service")

                # Fill qty and price
                qty_input = page.locator(".fixed.inset-0.z-50 input[placeholder='Qty']").first
                if qty_input.count() > 0:
                    qty_input.clear()
                    qty_input.fill("2")
                price_input = page.locator(".fixed.inset-0.z-50 input[placeholder='Price']").first
                if price_input.count() > 0:
                    price_input.fill("350")

                time.sleep(0.5)
                ss(page, "v02b_invoice_filled")

                # Check totals
                total_text = page.locator("text=/Total:.*\\$/").text_content() if page.locator("text=/Total:.*\\$/").count() > 0 else ""
                check("Invoice totals calculated", "$" in total_text)

                page.locator("button:has-text('Create Invoice')").click()
                time.sleep(2)
                ss(page, "v02c_invoice_saved")
                check("Invoice created (modal closed)", not has_modal(page))

        # ===== FIX 4: Customer Delete button =====
        print("\n=== FIX 4: Customer Delete ===")
        page.goto(f"{BASE}/customers")
        page.wait_for_load_state("networkidle"); time.sleep(1)

        # Navigate to customer detail
        first_row = page.locator("table tbody tr").first
        if first_row.count() > 0:
            first_row.click()
            page.wait_for_load_state("networkidle"); time.sleep(1)
            ss(page, "v03_customer_detail")

            del_btn = page.locator("button:has-text('Delete')")
            check("Delete button exists on customer detail", del_btn.count() > 0)

            if del_btn.count() > 0:
                del_btn.first.click()
                time.sleep(0.5)
                ss(page, "v03a_delete_confirm")
                check("Delete confirmation modal appears", has_modal(page))

                # Click Cancel (don't actually delete)
                cancel = page.locator(".fixed.inset-0.z-50 button:has-text('Cancel')")
                if cancel.count() > 0:
                    cancel.first.click()
                    time.sleep(0.3)
                    check("Cancel closes delete modal", not has_modal(page))

        # ===== FIX 5: Job status transitions with pending =====
        print("\n=== FIX 5: Job status (pending) ===")
        # Find a pending job via API and navigate directly
        jobs_resp = requests.get(f"{API}/jobs", headers={"Authorization": f"Bearer {token}"})
        pending_job = next((j for j in jobs_resp.json() if j["status"] in ("pending", "scheduled")), None)
        if pending_job:
            page.goto(f"{BASE}/jobs/{pending_job['id']}")
            page.wait_for_load_state("networkidle"); time.sleep(2)
        else:
            page.goto(f"{BASE}/jobs")
            page.wait_for_load_state("networkidle"); time.sleep(1)

        if "/jobs/" in page.url:
            ss(page, "v04_job_detail")
            start_btn = page.locator("button:has-text('Start Job')")
            check("Start Job button visible for pending/scheduled", start_btn.count() > 0 and start_btn.first.is_visible())

            if start_btn.count() > 0 and start_btn.first.is_visible():
                start_btn.first.click()
                time.sleep(3)
                ss(page, "v04a_job_started")

                # Check for In Progress badge
                in_progress = page.locator("text=In Progress")
                check("Status changed to In Progress", in_progress.count() > 0)

        # ===== Equipment Save (bonus fix - CORS) =====
        print("\n=== BONUS: Equipment save ===")
        time.sleep(2)  # let backend settle after job transition
        page.goto(f"{BASE}/equipment")
        page.wait_for_load_state("networkidle"); time.sleep(2)

        page.locator("button:has-text('Add Equipment')").click()
        time.sleep(0.5)
        if has_modal(page):
            modal = page.locator(".fixed.inset-0.z-50")
            modal.locator("input").nth(0).fill("QA Verify Mower")  # Name
            modal.locator("input").nth(1).fill("mower")  # Type
            modal.locator("input").nth(2).fill("TestMake")  # Make
            modal.locator("input").nth(3).fill("TM-100")  # Model
            time.sleep(0.3)

            modal.locator("button:has-text('Add Equipment')").click()
            time.sleep(3)
            ss(page, "v05_equipment_saved")
            check("Equipment saved (modal closed)", not has_modal(page))

        # ===== Summary =====
        print(f"\n{'='*40}")
        print(f"RESULTS: {PASS} passed, {FAIL} failed")
        print(f"{'='*40}")

        browser.close()

if __name__ == "__main__":
    main()
