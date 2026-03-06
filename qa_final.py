"""Final comprehensive QA audit against real backend."""
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

def close_modal(page):
    page.keyboard.press("Escape")
    time.sleep(0.3)

ISSUES = []

def issue(page_name, desc):
    ISSUES.append(f"[{page_name}] {desc}")
    print(f"  ISSUE: {desc}")

def main():
    token = get_token()
    print(f"Token obtained OK")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        # Auth
        page.goto(BASE)
        page.evaluate(f"localStorage.setItem('gs_token', '{token}')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        if "/login" in page.url:
            print("FATAL: Auth failed"); return

        # ========== DASHBOARD ==========
        print("\n=== DASHBOARD ===")
        ss(page, "f01_dashboard")
        body = page.locator("body").text_content()[:500]
        print(f"  Data loaded: {'Active' in body or 'Revenue' in body}")

        # ========== CUSTOMERS ==========
        print("\n=== CUSTOMERS ===")
        page.goto(f"{BASE}/customers")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f02_customers")

        count_el = page.locator("text=/\\d+ total customers/")
        print(f"  Count: {count_el.text_content() if count_el.count() > 0 else 'N/A'}")

        # Test: click customer row to go to detail
        first_row = page.locator("table tbody tr").first
        if first_row.count() > 0:
            first_row.click()
            page.wait_for_load_state("networkidle"); time.sleep(1)
            ss(page, "f02a_customer_detail")
            if "/customers/" in page.url:
                print(f"  Detail page: OK ({page.url})")

                # Check Delete button
                if page.locator("button:has-text('Delete')").count() == 0:
                    issue("Customer Detail", "No Delete button")

                # Check Edit modal
                edit_btn = page.locator("button:has-text('Edit')")
                if edit_btn.count() > 0:
                    edit_btn.first.click(); time.sleep(0.5)
                    if has_modal(page):
                        print("  Edit modal: OK")
                        close_modal(page)
                    else:
                        issue("Customer Detail", "Edit button doesn't open modal")
            else:
                issue("Customers", "Clicking row didn't navigate to detail")

        # ========== JOBS ==========
        print("\n=== JOBS ===")
        page.goto(f"{BASE}/jobs")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f03_jobs")

        # Navigate to job detail by clicking job title text
        job_title = page.locator("h3:has-text('Lawn'), h3:has-text('Mulch'), h3:has-text('Mowing')").first
        if job_title.count() > 0:
            job_title.click()
            page.wait_for_load_state("networkidle"); time.sleep(1)
            if "/jobs/" in page.url:
                ss(page, "f03a_job_detail")
                print(f"  Job detail: OK ({page.url})")

                # Check status buttons
                visible_status = []
                for s in ["Start", "Complete", "On Hold", "Resume", "Cancel"]:
                    btn = page.locator(f"button:has-text('{s}')")
                    if btn.count() > 0 and btn.first.is_visible():
                        visible_status.append(s)
                print(f"  Status buttons: {visible_status}")

                # Check Edit
                edit_btn = page.locator("button:has-text('Edit')")
                if edit_btn.count() > 0:
                    edit_btn.first.click(); time.sleep(0.5)
                    if has_modal(page):
                        print("  Edit modal: OK")
                        close_modal(page)
                    else:
                        issue("Job Detail", "Edit button doesn't open modal")

                # Test a status transition
                if "Start" in visible_status:
                    page.locator("button:has-text('Start')").first.click()
                    time.sleep(2)
                    ss(page, "f03b_job_started")
                    # Check if status changed visually
                    new_status = page.locator("text=In Progress, text=in_progress")
                    if new_status.count() > 0:
                        print("  Status transition: OK (started)")
                    else:
                        issue("Job Detail", "Start button didn't change status visually")
            else:
                issue("Jobs", "Clicking job card didn't navigate to detail")
        else:
            issue("Jobs", "No job cards found to click")

        # ========== INVOICES ==========
        print("\n=== INVOICES ===")
        page.goto(f"{BASE}/invoices")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f04_invoices")

        # Check for Create Invoice button
        create_inv = page.locator("button:has-text('New Invoice'), button:has-text('Add Invoice'), button:has-text('Create Invoice')")
        if create_inv.count() == 0:
            issue("Invoices", "No Create Invoice button — users cannot create invoices from this page")
        else:
            print("  Create Invoice button: OK")

        # Check Record Payment buttons
        record_btns = page.locator("button:has-text('Record Payment')")
        print(f"  Record Payment buttons: {record_btns.count()}")
        if record_btns.count() > 0:
            # Click one and see what happens
            record_btns.first.click()
            time.sleep(2)
            ss(page, "f04a_record_payment")
            if has_modal(page):
                print("  Record Payment: opens modal")
                close_modal(page)
            else:
                # Direct API call - check if it worked by seeing toast or status change
                print("  Record Payment: direct action (no modal)")

        # ========== QUOTES ==========
        print("\n=== QUOTES ===")
        page.goto(f"{BASE}/quotes")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f05_quotes")

        # Test creating a quote
        page.locator("button:has-text('New Quote')").click()
        time.sleep(0.5)
        if has_modal(page):
            ss(page, "f05a_quote_modal")
            # Fill title
            page.locator(".fixed.inset-0.z-50 input:visible").first.fill("QA Test Quote")
            # Select customer
            sel = page.locator(".fixed.inset-0.z-50 select:visible").first
            if sel.count() > 0:
                sel.select_option(index=1)
            # Fill line item
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            for inp in inputs:
                ph = (inp.get_attribute("placeholder") or "").lower()
                t = (inp.get_attribute("type") or "").lower()
                if "desc" in ph: inp.fill("Lawn maintenance")
                elif "qty" in ph: inp.fill("1")
                elif "price" in ph: inp.fill("500")
            ss(page, "f05b_quote_filled")
            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create Quote')").first
            if save.count() > 0:
                save.click(); time.sleep(2)
                ss(page, "f05c_quote_saved")
                if has_modal(page):
                    issue("Quotes", "Create Quote modal still open after save")
                    close_modal(page)
                else:
                    print("  Quote create: OK")
            else:
                issue("Quotes", "No Create Quote button in modal")
                close_modal(page)
        else:
            issue("Quotes", "New Quote button didn't open modal")

        # ========== CONTRACTS ==========
        print("\n=== CONTRACTS ===")
        page.goto(f"{BASE}/contracts")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f06_contracts")

        page.locator("button:has-text('New Contract')").click()
        time.sleep(0.5)
        if has_modal(page):
            ss(page, "f06a_contract_modal")
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "date": inp.fill("2026-06-01")
                elif t == "number": inp.fill("3000")
                elif not inp.input_value(): inp.fill("QA Test Contract")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1: sel.select_option(index=1)

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create')").first
            if save.count() > 0:
                save.click(); time.sleep(2)
                ss(page, "f06b_contract_saved")
                if has_modal(page):
                    issue("Contracts", "Create Contract modal still open after save")
                    close_modal(page)
                else:
                    print("  Contract create: OK")
        else:
            issue("Contracts", "New Contract button didn't open modal")

        # ========== CREWS ==========
        print("\n=== CREWS ===")
        page.goto(f"{BASE}/crews")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f07_crews")

        page.locator("button:has-text('Add Crew')").click()
        time.sleep(0.5)
        if has_modal(page):
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                if t == "color": continue
                if not inp.input_value(): inp.fill("QA Test Crew")
            save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click(); time.sleep(2)
                if has_modal(page):
                    issue("Crews", "Create Crew modal still open after save")
                    close_modal(page)
                else:
                    print("  Crew create: OK")

        # ========== EQUIPMENT ==========
        print("\n=== EQUIPMENT ===")
        page.goto(f"{BASE}/equipment")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f08_equipment")

        page.locator("button:has-text('Add Equipment')").click()
        time.sleep(0.5)
        if has_modal(page):
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                if t == "date": inp.fill("2024-01-15")
                elif t == "number": inp.fill("100")
                elif not inp.input_value(): inp.fill("QA Test Mower")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1: sel.select_option(index=1)
            save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click(); time.sleep(2)
                ss(page, "f08b_equipment_saved")
                if has_modal(page):
                    issue("Equipment", "Add Equipment modal still open after save")
                    close_modal(page)
                else:
                    print("  Equipment create: OK")

        # ========== INVENTORY ==========
        print("\n=== INVENTORY ===")
        page.goto(f"{BASE}/inventory")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f09_inventory")

        page.locator("button:has-text('Add Item')").click()
        time.sleep(0.5)
        if has_modal(page):
            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            for inp in inputs:
                t = (inp.get_attribute("type") or "").lower()
                ph = (inp.get_attribute("placeholder") or "").lower()
                if t == "number": inp.fill("50")
                elif "sku" in ph: inp.fill(f"QA-{int(time.time())%10000}")
                elif not inp.input_value(): inp.fill("QA Test Mulch")
            for sel in selects:
                opts = sel.locator("option").all()
                if len(opts) > 1: sel.select_option(index=1)
            save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save')").first
            if save.count() > 0:
                save.click(); time.sleep(2)
                ss(page, "f09b_inventory_saved")
                if has_modal(page):
                    issue("Inventory", "Add Item modal still open after save")
                    close_modal(page)
                else:
                    print("  Inventory create: OK")

        # ========== LEADS ==========
        print("\n=== LEADS ===")
        page.goto(f"{BASE}/leads")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f10_leads")

        add_lead = page.locator("button:has-text('Add Lead')").first
        if add_lead.count() > 0:
            add_lead.click(); time.sleep(0.5)
            if has_modal(page):
                inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
                selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
                for inp in inputs:
                    t = (inp.get_attribute("type") or "").lower()
                    if t == "email": inp.fill("qalead@test.com")
                    elif t == "tel": inp.fill("555-0177")
                    elif t == "number": inp.fill("5000")
                    elif not inp.input_value(): inp.fill("QA Test Lead")
                for sel in selects:
                    opts = sel.locator("option").all()
                    if len(opts) > 1: sel.select_option(index=1)
                save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Create')").first
                if save.count() > 0:
                    save.click(); time.sleep(2)
                    ss(page, "f10b_lead_saved")
                    if has_modal(page):
                        issue("Leads", "Add Lead modal still open after save")
                        close_modal(page)
                    else:
                        print("  Lead create: OK")

        # ========== SCHEDULE ==========
        print("\n=== SCHEDULE ===")
        page.goto(f"{BASE}/schedule")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f11_schedule")
        for view in ["Week", "Month"]:
            btn = page.locator(f"button:has-text('{view}')").first
            if btn.count() > 0:
                btn.click(); time.sleep(0.5)
                print(f"  {view}: OK")

        # ========== REPORTS ==========
        print("\n=== REPORTS ===")
        page.goto(f"{BASE}/reports")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f12_reports")
        svgs = page.locator("svg").count()
        print(f"  Charts (SVGs): {svgs}")

        # ========== SETTINGS ==========
        print("\n=== SETTINGS ===")
        page.goto(f"{BASE}/settings")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f13_settings")

        # ========== LOGIN PAGE (demo mode removal check) ==========
        print("\n=== LOGIN PAGE ===")
        page.evaluate("localStorage.removeItem('gs_token')")
        page.goto(f"{BASE}/login")
        page.wait_for_load_state("networkidle"); time.sleep(1)
        ss(page, "f14_login")

        demo_btn = page.locator("button:has-text('Demo'), button:has-text('demo')")
        if demo_btn.count() > 0:
            issue("Login", "Demo mode button still present — should be removed")

        # Try login with wrong password
        page.locator("input[type='email']").fill("admin@greenscape.com")
        page.locator("input[type='password']").fill("wrongpassword")
        page.locator("button:has-text('Sign In')").click()
        time.sleep(2)
        ss(page, "f14a_login_failed")

        # Check if it fell back to demo mode
        if "demo" in (page.evaluate("localStorage.getItem('gs_token')") or ""):
            issue("Login", "Failed login falls back to demo mode — should show error instead")
        else:
            print("  Failed login: no demo fallback (good)")

        # ========== SUMMARY ==========
        print("\n\n========================================")
        print("CONSOLE ERRORS:")
        real_errors = [e for e in console_errors if "favicon" not in e.lower()]
        for err in real_errors[:20]:
            print(f"  {err[:200]}")
        if not real_errors:
            print("  None")

        print(f"\n========================================")
        print(f"ISSUES FOUND ({len(ISSUES)}):")
        for i, iss in enumerate(ISSUES, 1):
            print(f"  {i}. {iss}")
        print("========================================")

        browser.close()

if __name__ == "__main__":
    main()
