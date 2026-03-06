"""QA audit against the REAL backend API — no demo mode."""
import time
import requests
from playwright.sync_api import sync_playwright, Page

BASE = "http://localhost:5176"
API = "http://localhost:8080/api/v1"
SS = "/home/will/LandscapeCRM/test-results"

# Get a real token
def get_token():
    pwd = 'GreenAdmin123' + chr(33)
    r = requests.post(f'{API}/auth/login', json={'email':'admin@greenscape.com','password':pwd})
    return r.json()['access_token']

def ss(page, name):
    page.screenshot(path=f"{SS}/{name}.png", full_page=True)

def has_modal(page):
    return page.locator(".fixed.inset-0.z-50").count() > 0

def close_modal(page):
    page.keyboard.press("Escape")
    time.sleep(0.3)

def main():
    token = get_token()
    print(f"Got auth token: {token[:20]}...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        # Login with real token
        page.goto(BASE)
        page.evaluate(f"localStorage.setItem('gs_token', '{token}')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        ss(page, "r00_dashboard")
        print(f"URL after login: {page.url}")
        print(f"Title: {page.title()}")

        # Check if we're authenticated (not on login page)
        if "/login" in page.url:
            print("FAIL: Still on login page — auth not working")
            return

        # ======== DASHBOARD ========
        print("\n=== DASHBOARD ===")
        body = page.locator("body").text_content()[:500]
        has_data = any(word in body for word in ["Active", "Revenue", "Jobs", "Customers"])
        print(f"  Has dashboard data: {has_data}")
        ss(page, "r01_dashboard")

        # ======== CUSTOMERS ========
        print("\n=== CUSTOMERS ===")
        page.goto(f"{BASE}/customers")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r02_customers")

        cust_count_text = page.locator("text=/\\d+ total customers/").text_content() if page.locator("text=/\\d+ total customers/").count() > 0 else "not found"
        print(f"  Customer count: {cust_count_text}")

        # Test Add Customer
        page.locator("button:has-text('Add Customer')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add modal: OK")
            # Fill form
            modal_inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            for inp in modal_inputs:
                ph = (inp.get_attribute("placeholder") or "").lower()
                if "john" in ph or "name" in ph:
                    inp.fill("QA Backend Test")
                elif "email" in ph or "@" in ph:
                    inp.fill("qabackend@test.com")
                elif "555" in ph or "phone" in ph:
                    inp.fill("(512) 555-9876")
                elif "main" in ph or "address" in ph:
                    inp.fill("999 Backend Blvd")
                elif "austin" in ph or "city" in ph:
                    inp.fill("Austin")
                elif ph == "tx" or "state" in ph:
                    inp.fill("TX")
                elif "787" in ph or "zip" in ph:
                    inp.fill("78701")

            ss(page, "r02a_customer_filled")
            page.locator("button:has-text('Save Customer')").click()
            time.sleep(2)
            ss(page, "r02b_customer_saved")

            if has_modal(page):
                print("  ISSUE: Modal still open after save — save failed")
                # Check for error toast
                toast = page.locator("[class*='toast' i], [role='alert']")
                if toast.count() > 0:
                    print(f"  Toast: {toast.first.text_content()[:100]}")
                close_modal(page)
            else:
                print("  Save: OK — modal closed")
                # Verify new customer appears
                time.sleep(1)
                new_cust = page.locator("text=QA Backend Test")
                print(f"  New customer visible: {new_cust.count() > 0}")
        else:
            print("  ISSUE: Add modal didn't open")

        # Test customer detail
        print("\n  --- Customer Detail ---")
        page.goto(f"{BASE}/customers")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        # Find clickable customer
        first_row = page.locator("table tbody tr").first
        if first_row.count() > 0:
            first_row.click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            ss(page, "r02c_customer_detail")
            print(f"  Detail URL: {page.url}")

            # Test Edit
            edit_btn = page.locator("button:has-text('Edit')")
            if edit_btn.count() > 0:
                edit_btn.first.click()
                time.sleep(0.5)
                if has_modal(page):
                    print("  Edit modal: OK")
                    close_modal(page)
                else:
                    print("  ISSUE: Edit didn't open modal")

            # Test Delete
            del_btn = page.locator("button:has-text('Delete')")
            print(f"  Delete button: {'Found' if del_btn.count() > 0 else 'MISSING'}")

        # ======== JOBS ========
        print("\n=== JOBS ===")
        page.goto(f"{BASE}/jobs")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r03_jobs")

        jobs_count = page.locator("text=/\\d+ total jobs/").text_content() if page.locator("text=/\\d+ total jobs/").count() > 0 else "not found"
        print(f"  Jobs count: {jobs_count}")

        # Test filters
        for tab in ["Scheduled", "In Progress", "Completed", "On Hold"]:
            btn = page.locator(f"button:has-text('{tab}')").first
            if btn.count() > 0:
                btn.click()
                time.sleep(0.3)
                print(f"  Filter '{tab}': clicked OK")

        page.locator("button:has-text('All')").first.click()
        time.sleep(0.3)

        # Test Add Job
        page.locator("button:has-text('New Job')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Job modal: OK")
            ss(page, "r03a_job_modal")

            modal_inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            modal_selects = page.locator(".fixed.inset-0.z-50 select:visible").all()

            for inp in modal_inputs:
                ph = (inp.get_attribute("placeholder") or "").lower()
                t = (inp.get_attribute("type") or "").lower()
                if "maintenance" in ph or "title" in ph or (not ph and t not in ("date", "number")):
                    inp.fill("QA Backend Test Job")
                elif t == "date":
                    inp.fill("2026-06-15")
                elif t == "number" and "0.00" in ph:
                    inp.fill("500")
                elif t == "number":
                    inp.fill("4")

            for sel in modal_selects:
                options = sel.locator("option").all()
                if len(options) > 1:
                    sel.select_option(index=1)

            ss(page, "r03b_job_filled")

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create Job')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r03c_job_saved")
                if has_modal(page):
                    print("  ISSUE: Job modal still open after save")
                    toast = page.locator("[class*='toast' i], [role='alert']")
                    if toast.count() > 0:
                        print(f"  Toast: {toast.first.text_content()[:100]}")
                    close_modal(page)
                else:
                    print("  Job save: OK")
            else:
                print("  ISSUE: No Create Job button found")
                close_modal(page)
        else:
            print("  ISSUE: Add Job modal didn't open")

        # Job detail + status transitions
        print("\n  --- Job Detail ---")
        page.goto(f"{BASE}/jobs")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        job_card = page.locator("[class*='cursor-pointer']").first
        if job_card.count() > 0:
            job_card.click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            ss(page, "r03d_job_detail")
            print(f"  Detail URL: {page.url}")

            for status in ["Start", "Complete", "On Hold", "Resume"]:
                btn = page.locator(f"button:has-text('{status}')")
                if btn.count() > 0 and btn.first.is_visible():
                    print(f"  Status btn '{status}': visible")

        # ======== INVOICES ========
        print("\n=== INVOICES ===")
        page.goto(f"{BASE}/invoices")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r04_invoices")

        add_inv = page.locator("button:has-text('New Invoice'), button:has-text('Add Invoice'), button:has-text('Create Invoice')")
        print(f"  Create Invoice button: {'Found' if add_inv.count() > 0 else 'MISSING'}")

        record_btns = page.locator("button:has-text('Record Payment')")
        print(f"  Record Payment buttons: {record_btns.count()}")

        # ======== QUOTES ========
        print("\n=== QUOTES ===")
        page.goto(f"{BASE}/quotes")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r05_quotes")

        page.locator("button:has-text('New Quote')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Quote modal: OK")
            ss(page, "r05a_quote_modal")

            # Fill title
            title = page.locator(".fixed.inset-0.z-50 input:visible").first
            if title.count() > 0:
                title.fill("QA Test Quote")

            # Select customer
            sel = page.locator(".fixed.inset-0.z-50 select:visible").first
            if sel.count() > 0:
                options = sel.locator("option").all()
                if len(options) > 1:
                    sel.select_option(index=1)

            # Fill line items
            line_inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            for inp in line_inputs:
                ph = (inp.get_attribute("placeholder") or "").lower()
                t = (inp.get_attribute("type") or "").lower()
                if "desc" in ph:
                    inp.fill("Test line item")
                elif "qty" in ph:
                    inp.fill("2")
                elif "price" in ph:
                    inp.fill("250")

            ss(page, "r05b_quote_filled")

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create Quote')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r05c_quote_saved")
                if has_modal(page):
                    print("  ISSUE: Quote modal still open after save")
                    close_modal(page)
                else:
                    print("  Quote save: OK")
        else:
            print("  ISSUE: Quote modal didn't open")

        # ======== CONTRACTS ========
        print("\n=== CONTRACTS ===")
        page.goto(f"{BASE}/contracts")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r06_contracts")

        page.locator("button:has-text('New Contract')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Contract modal: OK")
            ss(page, "r06a_contract_modal")

            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "date":
                    inp.fill("2026-06-01")
                elif t == "number":
                    inp.fill("5000")
                elif "title" in ph or not ph:
                    inp.fill("QA Test Contract")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1:
                    sel.select_option(index=1)

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r06b_contract_saved")
                if has_modal(page):
                    print("  ISSUE: Contract modal still open")
                    close_modal(page)
                else:
                    print("  Contract save: OK")
        else:
            print("  ISSUE: Contract modal didn't open")

        # ======== CREWS ========
        print("\n=== CREWS ===")
        page.goto(f"{BASE}/crews")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r07_crews")

        page.locator("button:has-text('Add Crew')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Crew modal: OK")
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "color":
                    continue  # Skip color picker
                elif "crew" in ph or "name" in ph or not ph:
                    inp.fill("QA Test Crew")

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r07b_crew_saved")
                if has_modal(page):
                    print("  ISSUE: Crew modal still open")
                    close_modal(page)
                else:
                    print("  Crew save: OK")
        else:
            print("  ISSUE: Crew modal didn't open")

        # ======== EQUIPMENT ========
        print("\n=== EQUIPMENT ===")
        page.goto(f"{BASE}/equipment")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r08_equipment")

        page.locator("button:has-text('Add Equipment')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Equipment modal: OK")
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "date":
                    inp.fill("2024-01-15")
                elif t == "number":
                    inp.fill("100")
                elif "name" in ph or not ph:
                    inp.fill("QA Test Mower")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1:
                    sel.select_option(index=1)

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r08b_equipment_saved")
                if has_modal(page):
                    print("  ISSUE: Equipment modal still open")
                    close_modal(page)
                else:
                    print("  Equipment save: OK")

        # ======== INVENTORY ========
        print("\n=== INVENTORY ===")
        page.goto(f"{BASE}/inventory")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r09_inventory")

        page.locator("button:has-text('Add Item')").click()
        time.sleep(0.5)
        if has_modal(page):
            print("  Add Inventory modal: OK")
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "number":
                    inp.fill("50")
                elif "sku" in ph:
                    inp.fill("QA-001")
                elif "name" in ph or not ph:
                    inp.fill("QA Test Mulch")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1:
                    sel.select_option(index=1)

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click()
                time.sleep(2)
                ss(page, "r09b_inventory_saved")
                if has_modal(page):
                    print("  ISSUE: Inventory modal still open")
                    close_modal(page)
                else:
                    print("  Inventory save: OK")

        # ======== LEADS ========
        print("\n=== LEADS ===")
        page.goto(f"{BASE}/leads")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r10_leads")

        add_lead = page.locator("button:has-text('Add Lead'), button:has-text('New Lead')").first
        if add_lead.count() > 0:
            add_lead.click()
            time.sleep(0.5)
            if has_modal(page):
                print("  Add Lead modal: OK")
                inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
                selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
                for inp in inputs:
                    t = (inp.get_attribute("type") or "").lower()
                    ph = (inp.get_attribute("placeholder") or "").lower()
                    if t == "email":
                        inp.fill("qalead@test.com")
                    elif t == "tel":
                        inp.fill("555-0177")
                    elif t == "number":
                        inp.fill("5000")
                    elif "name" in ph or not ph:
                        inp.fill("QA Test Lead")
                for sel in selects:
                    opts = sel.locator("option").all()
                    if len(opts) > 1:
                        sel.select_option(index=1)

                save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Create')").first
                if save.count() > 0:
                    save.click()
                    time.sleep(2)
                    ss(page, "r10b_lead_saved")
                    if has_modal(page):
                        print("  ISSUE: Lead modal still open")
                        close_modal(page)
                    else:
                        print("  Lead save: OK")

        # ======== SCHEDULE ========
        print("\n=== SCHEDULE ===")
        page.goto(f"{BASE}/schedule")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r11_schedule")
        for view in ["Week", "Month"]:
            btn = page.locator(f"button:has-text('{view}')").first
            if btn.count() > 0:
                btn.click()
                time.sleep(0.5)
                print(f"  {view} view: OK")

        # ======== REPORTS ========
        print("\n=== REPORTS ===")
        page.goto(f"{BASE}/reports")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r12_reports")

        # ======== SETTINGS ========
        print("\n=== SETTINGS ===")
        page.goto(f"{BASE}/settings")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        ss(page, "r13_settings")

        # ======== CONSOLE ERRORS ========
        print("\n\n========================================")
        print("CONSOLE ERRORS:")
        for err in console_errors:
            if "favicon" not in err.lower():
                print(f"  {err[:200]}")
        if not [e for e in console_errors if "favicon" not in e.lower()]:
            print("  None")
        print("========================================")

        browser.close()

if __name__ == "__main__":
    main()
