"""Deep QA audit of LandscapeCRM - tests every page, button, form, and interaction."""
import time
from playwright.sync_api import sync_playwright, Page

BASE = "http://localhost:5176"
SCREENSHOTS = "/home/will/LandscapeCRM/test-results"

def screenshot(page: Page, name: str):
    page.screenshot(path=f"{SCREENSHOTS}/{name}.png", full_page=True)

def login(page: Page):
    """Login with demo mode."""
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    # Set demo token and reload
    page.evaluate("localStorage.setItem('gs_token', 'demo_token')")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    screenshot(page, "00_after_login")
    # Verify we're past login
    url = page.url
    print(f"  After login URL: {url}")
    # Check if we see dashboard content
    body_text = page.locator("body").text_content()[:200]
    print(f"  Body preview: {body_text[:100]}")

def try_close_modal(page: Page):
    """Try to close any open modal."""
    for selector in ["button:has-text('Cancel')", "button:has-text('Close')", "button[aria-label='Close']", "[class*='modal'] button:first-child"]:
        try:
            btn = page.locator(selector)
            if btn.count() > 0 and btn.first.is_visible():
                btn.first.click(timeout=2000)
                time.sleep(0.3)
                return True
        except:
            pass
    # Try pressing Escape
    try:
        page.keyboard.press("Escape")
        time.sleep(0.3)
    except:
        pass
    return False

def audit_dashboard(page: Page):
    print("\n=== DASHBOARD ===")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "01_dashboard")

    # Check for summary cards / stats
    body = page.locator("body").text_content()
    has_numbers = any(c.isdigit() for c in body[:500])
    print(f"  Has numeric data: {has_numbers}")

    # Find all buttons
    buttons = page.locator("button:visible").all()
    print(f"  Visible buttons: {len(buttons)}")
    for btn in buttons[:15]:
        text = (btn.text_content() or "").strip()[:50]
        if text:
            print(f"    Button: '{text}'")

    # Check for charts
    svgs = page.locator("svg").count()
    print(f"  SVG elements (charts): {svgs}")

def audit_sidebar(page: Page):
    print("\n=== SIDEBAR NAVIGATION ===")
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    # Try various sidebar selectors
    links = page.locator("a[href]").all()
    nav_links = []
    for link in links:
        href = link.get_attribute("href") or ""
        text = (link.text_content() or "").strip()
        if href.startswith("/") and text and len(text) < 30:
            nav_links.append((href, text))

    print(f"  Navigation links found: {len(nav_links)}")
    for href, text in nav_links:
        print(f"    '{text}' -> {href}")
    return nav_links

def audit_page_with_crud(page: Page, name: str, path: str, screenshot_prefix: str):
    """Generic audit for a list page with CRUD modals."""
    print(f"\n=== {name.upper()} PAGE ===")
    page.goto(f"{BASE}{path}")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, f"{screenshot_prefix}_list")

    # Check page loaded (not blank/error)
    body = page.locator("body").text_content()[:300]
    has_404 = "not found" in body.lower() or "404" in body
    if has_404:
        print(f"  ERROR: Page shows 404/not found")
        return {"page": name, "status": "404", "issues": ["Page not found"]}

    issues = []

    # Count data rows
    rows = page.locator("table tbody tr, [class*='card' i]:not([class*='Card' i])").count()
    print(f"  Data rows/cards: {rows}")

    # Check search
    search = page.locator("input[type='search'], input[placeholder*='earch' i]")
    if search.count() > 0:
        print(f"  Search input found")
        search.first.fill("test")
        time.sleep(0.3)
        search.first.clear()
    else:
        print(f"  No search input")

    # Check filter buttons/tabs
    filters = page.locator("button[class*='tab' i], [role='tab'], button:has-text('All')").all()
    if filters:
        print(f"  Filter/tab buttons: {len(filters)}")
        for f in filters[:5]:
            text = (f.text_content() or "").strip()[:20]
            print(f"    Filter: '{text}'")

    # Find and click Add/New button
    add_btn = None
    for selector in ["button:has-text('Add')", "button:has-text('New')", "button:has-text('Create')"]:
        loc = page.locator(selector)
        if loc.count() > 0:
            add_btn = loc.first
            break

    if add_btn:
        add_text = (add_btn.text_content() or "").strip()
        print(f"  Add button found: '{add_text}'")
        add_btn.click()
        time.sleep(0.5)
        screenshot(page, f"{screenshot_prefix}_add_modal")

        modal = page.locator("[class*='modal' i], [class*='Modal'], [role='dialog'], [class*='overlay' i]")
        if modal.count() > 0:
            print(f"  Modal opened successfully")

            # List all form fields
            fields = modal.first.locator("input:visible, select:visible, textarea:visible").all()
            print(f"  Form fields: {len(fields)}")
            field_info = []
            for field in fields:
                tag = field.evaluate("el => el.tagName")
                ftype = field.get_attribute("type") or ""
                fname = field.get_attribute("name") or ""
                fplaceholder = field.get_attribute("placeholder") or ""
                label = fname or fplaceholder or ftype
                field_info.append({"tag": tag, "type": ftype, "name": fname, "placeholder": fplaceholder})
                print(f"    {tag} type={ftype} name={fname} placeholder={fplaceholder}")

            # Try to fill common fields
            for field in fields:
                fname = (field.get_attribute("name") or "").lower()
                fplaceholder = (field.get_attribute("placeholder") or "").lower()
                ftype = (field.get_attribute("type") or "").lower()
                tag = field.evaluate("el => el.tagName")

                if tag == "SELECT":
                    options = field.locator("option").all()
                    if len(options) > 1:
                        field.select_option(index=1)
                elif ftype == "email":
                    field.fill("qatest@example.com")
                elif ftype == "tel":
                    field.fill("555-0199")
                elif ftype == "number":
                    field.fill("100")
                elif ftype == "date":
                    field.fill("2026-06-15")
                elif "name" in fname or "name" in fplaceholder:
                    field.fill("QA Test " + name)
                elif "title" in fname or "title" in fplaceholder:
                    field.fill("QA Test " + name)
                elif "email" in fname or "email" in fplaceholder:
                    field.fill("qatest@example.com")
                elif "phone" in fname or "phone" in fplaceholder:
                    field.fill("555-0199")
                elif "address" in fname or "address" in fplaceholder:
                    field.fill("123 QA Test St")
                elif "city" in fname or "city" in fplaceholder:
                    field.fill("Testville")
                elif "state" in fname or "state" in fplaceholder:
                    field.fill("TX")
                elif "zip" in fname or "zip" in fplaceholder:
                    field.fill("75001")
                elif "amount" in fname or "total" in fname or "price" in fname or "cost" in fname:
                    field.fill("1500")
                elif "desc" in fname or "desc" in fplaceholder or "note" in fname:
                    if tag == "TEXTAREA":
                        field.fill("QA audit test description")
                    else:
                        field.fill("QA test")
                elif tag == "TEXTAREA":
                    field.fill("QA audit test notes")
                elif ftype in ("text", "") and not fname and not fplaceholder:
                    # Generic text field - fill with something
                    field.fill("QA Test")

            screenshot(page, f"{screenshot_prefix}_form_filled")

            # Try to save
            save_btn = None
            for selector in ["button:has-text('Save')", "button:has-text('Create')", "button:has-text('Add')", "button[type='submit']"]:
                loc = modal.first.locator(selector)
                if loc.count() > 0:
                    save_btn = loc.first
                    break

            if save_btn:
                save_text = (save_btn.text_content() or "").strip()
                print(f"  Clicking save: '{save_text}'")
                save_btn.click()
                time.sleep(1)
                screenshot(page, f"{screenshot_prefix}_after_save")

                # Check if modal closed
                still_open = page.locator("[class*='modal' i], [class*='Modal'], [role='dialog']").count()
                if still_open > 0:
                    # Check for validation errors
                    error_text = page.locator("[class*='error' i], [class*='Error'], [class*='invalid' i], text=required").all()
                    if error_text:
                        err_msgs = [e.text_content()[:50] for e in error_text[:3]]
                        print(f"  ISSUE: Form validation errors: {err_msgs}")
                        issues.append(f"Form validation errors: {err_msgs}")
                    else:
                        print(f"  ISSUE: Modal still open after save (no visible error)")
                        issues.append("Modal still open after save - save may have failed silently")
                    try_close_modal(page)
                else:
                    print(f"  Save successful (modal closed)")
            else:
                print(f"  ISSUE: No save/submit button found in modal")
                issues.append("No save button in modal")
                try_close_modal(page)
        else:
            print(f"  ISSUE: No modal appeared after clicking Add button")
            issues.append("Add button did not open a modal")
            screenshot(page, f"{screenshot_prefix}_no_modal")
    else:
        print(f"  No Add/New/Create button found")

    # Check for any visible buttons that might be broken
    all_btns = page.locator("button:visible").all()
    btn_texts = [(b.text_content() or "").strip()[:30] for b in all_btns]
    print(f"  All visible buttons: {btn_texts}")

    return {"page": name, "rows": rows, "issues": issues}

def audit_detail_page(page: Page, name: str, list_path: str, screenshot_prefix: str):
    """Audit a detail page by clicking the first item in a list."""
    print(f"\n=== {name.upper()} DETAIL ===")
    page.goto(f"{BASE}{list_path}")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    issues = []

    # Find a link to a detail page
    detail_link = page.locator(f"a[href*='{list_path}/']").first
    if detail_link.count() > 0:
        detail_link.click()
        page.wait_for_load_state("networkidle")
        time.sleep(0.5)
    else:
        # Try clicking first table row
        clickable_row = page.locator("table tbody tr, [class*='cursor-pointer']").first
        if clickable_row.count() > 0:
            clickable_row.click()
            page.wait_for_load_state("networkidle")
            time.sleep(0.5)
        else:
            print(f"  Could not navigate to detail page")
            issues.append("No clickable link/row to navigate to detail")
            return {"page": f"{name} Detail", "issues": issues}

    screenshot(page, f"{screenshot_prefix}_detail")
    print(f"  URL: {page.url}")

    # Check for Edit button
    edit_btn = page.locator("button:has-text('Edit')")
    if edit_btn.count() > 0:
        print(f"  Edit button found")
        edit_btn.first.click()
        time.sleep(0.5)
        screenshot(page, f"{screenshot_prefix}_edit_modal")

        modal = page.locator("[class*='modal' i], [class*='Modal'], [role='dialog']")
        if modal.count() > 0:
            print(f"  Edit modal opened")
            # Check fields are pre-filled
            inputs = modal.first.locator("input:visible").all()
            prefilled = sum(1 for inp in inputs if inp.input_value())
            print(f"  Pre-filled inputs: {prefilled}/{len(inputs)}")

            try_close_modal(page)
        else:
            print(f"  ISSUE: Edit button didn't open modal")
            issues.append("Edit button doesn't open modal")
    else:
        print(f"  No Edit button found")

    # Check for Delete button
    delete_btn = page.locator("button:has-text('Delete')")
    if delete_btn.count() > 0:
        print(f"  Delete button found")

    # Check for status buttons on job detail
    if "job" in name.lower():
        status_btns = page.locator("button:has-text('Start'), button:has-text('Complete'), button:has-text('Hold'), button:has-text('Resume')").all()
        print(f"  Status transition buttons: {len(status_btns)}")
        for btn in status_btns:
            print(f"    Status: '{(btn.text_content() or '').strip()}'")

    # List all visible buttons
    all_btns = page.locator("button:visible").all()
    btn_texts = [(b.text_content() or "").strip()[:30] for b in all_btns]
    print(f"  All buttons: {btn_texts}")

    return {"page": f"{name} Detail", "issues": issues}

def audit_schedule(page: Page):
    print("\n=== SCHEDULE PAGE ===")
    page.goto(f"{BASE}/schedule")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "20_schedule")

    issues = []

    # Check for view toggle buttons
    view_btns = page.locator("button:has-text('Week'), button:has-text('Month'), button:has-text('Day')").all()
    print(f"  View buttons: {len(view_btns)}")
    for btn in view_btns:
        text = (btn.text_content() or "").strip()
        btn.click()
        time.sleep(0.5)
        screenshot(page, f"20a_schedule_{text.lower()}")
        print(f"    Clicked '{text}'")

    # Check for navigation (prev/next)
    # Look for chevron buttons or arrow buttons
    chevron_btns = page.locator("button:has(svg)").all()
    print(f"  Icon buttons (possible nav): {len(chevron_btns)}")

    # Check for Today button
    today_btn = page.locator("button:has-text('Today')")
    if today_btn.count() > 0:
        today_btn.click()
        time.sleep(0.3)
        print(f"  Clicked 'Today'")

    # Check for events/jobs on calendar
    events = page.locator("[class*='event' i], [class*='Event']").count()
    print(f"  Calendar events: {events}")

    return {"page": "Schedule", "issues": issues}

def audit_leads(page: Page):
    print("\n=== LEADS PAGE (Kanban) ===")
    page.goto(f"{BASE}/leads")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "21_leads")

    issues = []

    # Check for kanban columns
    body_text = page.locator("body").text_content()
    print(f"  Page has content: {len(body_text)} chars")

    # Check for column headers
    headers = page.locator("h2, h3, [class*='column' i] > *, [class*='header' i]").all()
    header_texts = [(h.text_content() or "").strip()[:30] for h in headers[:10]]
    print(f"  Headers: {header_texts}")

    # Check for Add Lead button
    add_btn = page.locator("button:has-text('Add'), button:has-text('New')").first
    if add_btn.count() > 0:
        add_btn.click()
        time.sleep(0.5)
        screenshot(page, "21a_leads_add")

        modal = page.locator("[class*='modal' i], [class*='Modal'], [role='dialog']")
        if modal.count() > 0:
            print(f"  Add Lead modal opened")
            fields = modal.first.locator("input:visible, select:visible, textarea:visible").all()
            print(f"  Fields: {len(fields)}")

            # Fill fields
            for field in fields:
                fname = (field.get_attribute("name") or "").lower()
                fplaceholder = (field.get_attribute("placeholder") or "").lower()
                tag = field.evaluate("el => el.tagName")
                ftype = (field.get_attribute("type") or "").lower()

                if tag == "SELECT":
                    options = field.locator("option").all()
                    if len(options) > 1:
                        field.select_option(index=1)
                elif "name" in fname or "name" in fplaceholder:
                    field.fill("QA Test Lead")
                elif "email" in fname or "email" in fplaceholder:
                    field.fill("qalead@example.com")
                elif "phone" in fname or "phone" in fplaceholder:
                    field.fill("555-0188")
                elif "source" in fname or "source" in fplaceholder:
                    field.fill("Website")
                elif ftype == "email":
                    field.fill("qalead@example.com")
                elif tag == "TEXTAREA":
                    field.fill("QA test lead notes")
                elif ftype in ("text", ""):
                    field.fill("QA Test")

            save_btn = modal.first.locator("button:has-text('Save'), button:has-text('Add'), button:has-text('Create'), button[type='submit']").first
            if save_btn.count() > 0:
                save_btn.click()
                time.sleep(1)
                screenshot(page, "21b_leads_after_save")
                still_open = page.locator("[class*='modal' i], [class*='Modal'], [role='dialog']").count()
                if still_open > 0:
                    print(f"  ISSUE: Lead modal still open after save")
                    issues.append("Lead modal still open after save")
                    try_close_modal(page)
                else:
                    print(f"  Lead saved successfully")
        else:
            print(f"  ISSUE: No modal after Add click")
            issues.append("Add Lead button doesn't open modal")

    return {"page": "Leads", "issues": issues}

def audit_photos(page: Page):
    print("\n=== PHOTOS PAGE ===")
    page.goto(f"{BASE}/photos")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "22_photos")

    body = page.locator("body").text_content()[:200]
    print(f"  Content: {body[:100]}")
    return {"page": "Photos", "issues": []}

def audit_reports(page: Page):
    print("\n=== REPORTS PAGE ===")
    page.goto(f"{BASE}/reports")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "23_reports")

    issues = []

    # Check for chart elements
    svgs = page.locator("svg").count()
    print(f"  SVG elements: {svgs}")

    # Check tabs/sections
    tabs = page.locator("[role='tab'], button[class*='tab' i]").all()
    print(f"  Tabs: {len(tabs)}")
    for tab in tabs:
        text = (tab.text_content() or "").strip()
        print(f"    Tab: '{text}'")
        try:
            tab.click()
            time.sleep(0.5)
            screenshot(page, f"23a_reports_{text.lower().replace(' ', '_')[:15]}")
        except:
            print(f"    Could not click tab '{text}'")

    # Check all visible buttons
    btns = page.locator("button:visible").all()
    for btn in btns[:10]:
        text = (btn.text_content() or "").strip()[:30]
        if text:
            print(f"    Button: '{text}'")

    return {"page": "Reports", "issues": issues}

def audit_settings(page: Page):
    print("\n=== SETTINGS PAGE ===")
    page.goto(f"{BASE}/settings")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    screenshot(page, "24_settings")

    body = page.locator("body").text_content()[:200]
    print(f"  Content preview: {body[:100]}")

    # Check for 404
    if "not found" in body.lower() or "404" in body:
        print(f"  Settings page: 404/not found")
        return {"page": "Settings", "issues": ["Page not found"]}

    tabs = page.locator("[role='tab'], button[class*='tab' i], a[class*='tab' i]").all()
    print(f"  Tabs: {len(tabs)}")
    for tab in tabs:
        text = (tab.text_content() or "").strip()
        print(f"    Tab: '{text}'")

    return {"page": "Settings", "issues": []}

def full_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        # Set demo token FIRST then navigate
        page.goto(BASE)
        page.evaluate("localStorage.setItem('gs_token', 'demo_token')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        screenshot(page, "00_after_login")
        print(f"After login URL: {page.url}")
        print(f"Title: {page.title()}")

        all_issues = []

        audit_dashboard(page)
        audit_sidebar(page)

        # CRUD pages
        for name, path, prefix in [
            ("Customers", "/customers", "02"),
            ("Jobs", "/jobs", "04"),
            ("Inventory", "/inventory", "07"),
            ("Quotes", "/quotes", "08"),
            ("Invoices", "/invoices", "09"),
            ("Contracts", "/contracts", "10"),
            ("Crews", "/crews", "11"),
            ("Equipment", "/equipment", "12"),
        ]:
            result = audit_page_with_crud(page, name, path, prefix)
            all_issues.append(result)

        # Detail pages
        for name, path, prefix in [
            ("Customer", "/customers", "03"),
            ("Job", "/jobs", "05"),
        ]:
            result = audit_detail_page(page, name, path, prefix)
            all_issues.append(result)

        # Special pages
        audit_schedule(page)
        all_issues.append(audit_leads(page))
        all_issues.append(audit_photos(page))
        all_issues.append(audit_reports(page))
        all_issues.append(audit_settings(page))

        print("\n\n========================================")
        print("=== CONSOLE ERRORS ===")
        print("========================================")
        for err in console_errors:
            print(f"  {err[:200]}")
        if not console_errors:
            print("  No console errors detected")

        print("\n\n========================================")
        print("=== ISSUES SUMMARY ===")
        print("========================================")
        for result in all_issues:
            if result and result.get("issues"):
                for issue in result["issues"]:
                    print(f"  [{result['page']}] {issue}")

        print("\n=== DEEP AUDIT COMPLETE ===")
        browser.close()

if __name__ == "__main__":
    full_audit()
