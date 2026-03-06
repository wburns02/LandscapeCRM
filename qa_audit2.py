"""Targeted QA audit - proper modal detection, form submission, all pages."""
import time
from playwright.sync_api import sync_playwright, Page

BASE = "http://localhost:5176"
SS = "/home/will/LandscapeCRM/test-results"

def ss(page, name):
    page.screenshot(path=f"{SS}/{name}.png", full_page=True)

def has_modal(page):
    """Detect the Modal component: fixed inset-0 z-50 with a relative child."""
    return page.locator(".fixed.inset-0.z-50").count() > 0

def close_modal(page):
    page.keyboard.press("Escape")
    time.sleep(0.3)

def test_add_customer(page):
    print("\n=== TEST: Add Customer ===")
    page.goto(f"{BASE}/customers")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    initial_count = page.locator("text=total customers").text_content()
    print(f"  Initial: {initial_count}")

    page.locator("button:has-text('Add Customer')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        # Fill form
        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        print(f"  Inputs: {len(inputs)}")
        for inp in inputs:
            placeholder = inp.get_attribute("placeholder") or ""
            print(f"    Input placeholder: '{placeholder}'")
            if "name" in placeholder.lower() or "john" in placeholder.lower():
                inp.fill("QA Test Customer")
            elif "email" in placeholder.lower():
                inp.fill("qatest@test.com")
            elif "phone" in placeholder.lower() or "555" in placeholder.lower():
                inp.fill("(512) 555-9999")
            elif "address" in placeholder.lower() or "main" in placeholder.lower():
                inp.fill("999 QA Test Blvd")
            elif "austin" in placeholder.lower() or "city" in placeholder.lower():
                inp.fill("Austin")
            elif placeholder == "TX" or "state" in placeholder.lower():
                inp.fill("TX")
            elif "zip" in placeholder.lower() or "787" in placeholder.lower():
                inp.fill("78701")

        # Check for select dropdowns
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        ss(page, "t01_customer_form_filled")

        # Click Save
        page.locator("button:has-text('Save Customer')").click()
        time.sleep(1)
        ss(page, "t01_customer_after_save")

        if has_modal(page):
            print("  FAIL: Modal still open after save")
            close_modal(page)
            return False
        else:
            new_count = page.locator("text=total customers").text_content()
            print(f"  After save: {new_count}")
            # Check if new customer appears
            if page.locator("text=QA Test Customer").count() > 0:
                print("  PASS: Customer created and visible")
                return True
            else:
                print("  WARN: Modal closed but customer not visible in list")
                return True
    else:
        print("  FAIL: Modal did not open")
        ss(page, "t01_customer_no_modal")
        return False

def test_customer_detail_and_edit(page):
    print("\n=== TEST: Customer Detail + Edit ===")
    page.goto(f"{BASE}/customers")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    # Click first customer card/row
    first_customer = page.locator("text=Sarah Mitchell").first
    if first_customer.count() > 0:
        first_customer.click()
        page.wait_for_load_state("networkidle")
        time.sleep(0.5)
        ss(page, "t02_customer_detail")
        print(f"  URL: {page.url}")

        if "/customers/" in page.url:
            print("  Navigation to detail OK")

            # Test Edit button
            edit_btn = page.locator("button:has-text('Edit')")
            if edit_btn.count() > 0:
                edit_btn.first.click()
                time.sleep(0.5)
                ss(page, "t02_customer_edit_modal")

                if has_modal(page):
                    print("  Edit modal opened OK")
                    close_modal(page)
                    return True
                else:
                    print("  FAIL: Edit button didn't open modal")
                    return False
            else:
                print("  FAIL: No Edit button on detail page")
                return False
        else:
            print("  FAIL: Did not navigate to detail")
            return False
    else:
        print("  FAIL: Could not find customer to click")
        return False

def test_add_job(page):
    print("\n=== TEST: Add Job ===")
    page.goto(f"{BASE}/jobs")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    page.locator("button:has-text('New Job')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t03_job_modal")

        # List all form fields
        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        textareas = page.locator(".fixed.inset-0.z-50 textarea:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}, Textareas: {len(textareas)}")

        for inp in inputs:
            placeholder = inp.get_attribute("placeholder") or ""
            name = inp.get_attribute("name") or ""
            itype = inp.get_attribute("type") or ""
            label = placeholder or name
            print(f"    Input: placeholder='{placeholder}' name='{name}' type='{itype}'")

            if "title" in label.lower() or "name" in label.lower():
                inp.fill("QA Test Job")
            elif itype == "date":
                inp.fill("2026-06-15")
            elif itype == "number":
                inp.fill("500")
            elif "hour" in label.lower() or "est" in label.lower():
                inp.fill("4")
            else:
                inp.fill("QA Test")

        for sel in selects:
            name = sel.get_attribute("name") or ""
            print(f"    Select: name='{name}'")
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        for ta in textareas:
            ta.fill("QA audit test job description")

        ss(page, "t03_job_form_filled")

        # Find Create/Save button
        save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Save')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            ss(page, "t03_job_after_save")

            if has_modal(page):
                print("  FAIL: Modal still open after save")
                close_modal(page)
                return False
            else:
                print("  PASS: Job created (modal closed)")
                return True
        else:
            print("  FAIL: No save button")
            close_modal(page)
            return False
    else:
        print("  FAIL: Modal did not open")
        return False

def test_job_detail_and_status(page):
    print("\n=== TEST: Job Detail + Status Transitions ===")
    page.goto(f"{BASE}/jobs")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    # Click first job card
    first_job = page.locator("text=Weekly Lawn Maintenance").first
    if first_job.count() > 0:
        first_job.click()
        page.wait_for_load_state("networkidle")
        time.sleep(0.5)
        ss(page, "t04_job_detail")
        print(f"  URL: {page.url}")

        if "/jobs/" in page.url:
            # Check status buttons
            for btn_text in ["Start", "Complete", "On Hold", "Resume", "Cancel"]:
                btn = page.locator(f"button:has-text('{btn_text}')")
                if btn.count() > 0 and btn.first.is_visible():
                    print(f"  Status button visible: '{btn_text}'")

            # Test Edit button
            edit_btn = page.locator("button:has-text('Edit')")
            if edit_btn.count() > 0:
                edit_btn.first.click()
                time.sleep(0.5)
                if has_modal(page):
                    print("  Edit modal OK")
                    close_modal(page)
                else:
                    print("  FAIL: Edit didn't open modal")

            # Test a status transition - click Start if available
            start_btn = page.locator("button:has-text('Start Job'), button:has-text('Start')")
            if start_btn.count() > 0 and start_btn.first.is_visible():
                start_btn.first.click()
                time.sleep(1)
                ss(page, "t04_job_after_start")
                print("  Clicked Start - checking result")

            return True
        else:
            print("  FAIL: Did not navigate to job detail")
            return False
    else:
        print("  FAIL: No job card to click")
        return False

def test_invoices_page(page):
    print("\n=== TEST: Invoices Page ===")
    page.goto(f"{BASE}/invoices")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t05_invoices")

    issues = []

    # Check for Add/Create Invoice button
    add_btn = page.locator("button:has-text('New Invoice'), button:has-text('Add Invoice'), button:has-text('Create Invoice')")
    if add_btn.count() == 0:
        print("  ISSUE: No 'New/Add/Create Invoice' button exists")
        issues.append("No Create Invoice button")

    # Check Record Payment buttons
    record_btns = page.locator("button:has-text('Record Payment')")
    count = record_btns.count()
    print(f"  Record Payment buttons: {count}")

    if count > 0:
        # Click first Record Payment
        record_btns.first.click()
        time.sleep(1)
        ss(page, "t05_after_record_payment")

        if has_modal(page):
            print("  Record Payment opened modal OK")
            close_modal(page)
        else:
            # Check if it just directly recorded (API call)
            print("  Record Payment: no modal (direct API call)")

    # Check Send button on draft invoices
    send_btn = page.locator("button:has-text('Send')")
    if send_btn.count() > 0:
        print(f"  Send buttons: {send_btn.count()}")

    # Check filter tabs
    for tab in ["All", "Draft", "Sent", "Paid", "Partial", "Overdue"]:
        btn = page.locator(f"button:has-text('{tab}')").first
        if btn.count() > 0:
            btn.click()
            time.sleep(0.3)

    return issues

def test_quotes_page(page):
    print("\n=== TEST: Quotes Page ===")
    page.goto(f"{BASE}/quotes")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t06_quotes")

    # Click New Quote
    page.locator("button:has-text('New Quote')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t06_quote_modal")

        # Examine form
        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        textareas = page.locator(".fixed.inset-0.z-50 textarea:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}, Textareas: {len(textareas)}")

        for inp in inputs:
            p = inp.get_attribute("placeholder") or ""
            n = inp.get_attribute("name") or ""
            t = inp.get_attribute("type") or ""
            print(f"    Input: p='{p}' n='{n}' t='{t}'")

        for sel in selects:
            n = sel.get_attribute("name") or ""
            opts = [o.text_content() for o in sel.locator("option").all()]
            print(f"    Select: n='{n}' options={opts[:5]}")

        # Fill form
        for inp in inputs:
            p = (inp.get_attribute("placeholder") or "").lower()
            n = (inp.get_attribute("name") or "").lower()
            t = (inp.get_attribute("type") or "").lower()
            label = p or n
            if "title" in label:
                inp.fill("QA Test Quote")
            elif t == "date":
                inp.fill("2026-06-15")
            elif t == "number":
                inp.fill("2500")
            elif "desc" in label:
                inp.fill("Test line item")
            else:
                inp.fill("QA Test")

        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        for ta in textareas:
            ta.fill("QA test notes")

        ss(page, "t06_quote_filled")

        save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Save')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            ss(page, "t06_quote_after_save")
            if has_modal(page):
                print("  FAIL: Modal still open")
                close_modal(page)
                return False
            else:
                print("  PASS: Quote created")
                return True
    else:
        print("  FAIL: Modal did not open")
        return False

def test_contracts(page):
    print("\n=== TEST: Contracts Page ===")
    page.goto(f"{BASE}/contracts")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t07_contracts")

    page.locator("button:has-text('New Contract')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t07_contract_modal")

        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        textareas = page.locator(".fixed.inset-0.z-50 textarea:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}, Textareas: {len(textareas)}")

        for inp in inputs:
            p = (inp.get_attribute("placeholder") or "").lower()
            t = (inp.get_attribute("type") or "").lower()
            if "title" in p or "name" in p:
                inp.fill("QA Test Contract")
            elif t == "date":
                inp.fill("2026-06-15")
            elif t == "number":
                inp.fill("5000")
            else:
                inp.fill("QA Test")

        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        for ta in textareas:
            ta.fill("QA test contract terms")

        save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Save')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            ss(page, "t07_contract_after_save")
            if has_modal(page):
                print("  FAIL: Modal still open")
                close_modal(page)
            else:
                print("  PASS: Contract created")
    else:
        print("  FAIL: No modal")

def test_crews(page):
    print("\n=== TEST: Crews Page ===")
    page.goto(f"{BASE}/crews")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t08_crews")

    page.locator("button:has-text('Add Crew')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t08_crew_modal")

        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}")

        for inp in inputs:
            p = (inp.get_attribute("placeholder") or "").lower()
            t = (inp.get_attribute("type") or "").lower()
            n = (inp.get_attribute("name") or "").lower()
            label = p or n
            print(f"    Input: p='{p}' n='{n}' t='{t}'")
            if "name" in label:
                inp.fill("QA Test Crew")
            elif "lead" in label or "foreman" in label:
                inp.fill("John QA")
            elif "phone" in label or t == "tel":
                inp.fill("555-0100")
            else:
                inp.fill("QA Test")

        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        save = page.locator(".fixed.inset-0.z-50 button:has-text('Create'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Add')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            if has_modal(page):
                print("  FAIL: Modal still open")
                ss(page, "t08_crew_fail")
                close_modal(page)
            else:
                print("  PASS: Crew created")
    else:
        print("  FAIL: No modal")

def test_equipment(page):
    print("\n=== TEST: Equipment Page ===")
    page.goto(f"{BASE}/equipment")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t09_equipment")

    page.locator("button:has-text('Add Equipment')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t09_equipment_modal")

        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}")

        for inp in inputs:
            p = (inp.get_attribute("placeholder") or "").lower()
            t = (inp.get_attribute("type") or "").lower()
            n = (inp.get_attribute("name") or "").lower()
            label = p or n
            print(f"    Input: p='{p}' n='{n}' t='{t}'")
            if "name" in label:
                inp.fill("QA Test Mower")
            elif t == "date":
                inp.fill("2024-01-15")
            elif t == "number":
                inp.fill("150")
            else:
                inp.fill("QA Test")

        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Create')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            ss(page, "t09_equipment_after_save")
            if has_modal(page):
                print("  FAIL: Modal still open")
                close_modal(page)
            else:
                print("  PASS: Equipment created")
    else:
        print("  FAIL: No modal")

def test_inventory(page):
    print("\n=== TEST: Inventory Page ===")
    page.goto(f"{BASE}/inventory")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t10_inventory")

    page.locator("button:has-text('Add Item')").click()
    time.sleep(0.5)

    if has_modal(page):
        print("  Modal opened OK")
        ss(page, "t10_inventory_modal")

        inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
        selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
        textareas = page.locator(".fixed.inset-0.z-50 textarea:visible").all()
        print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}, Textareas: {len(textareas)}")

        for inp in inputs:
            p = (inp.get_attribute("placeholder") or "").lower()
            t = (inp.get_attribute("type") or "").lower()
            n = (inp.get_attribute("name") or "").lower()
            label = p or n
            print(f"    Input: p='{p}' n='{n}' t='{t}'")
            if "name" in label or "item" in label:
                inp.fill("QA Test Mulch")
            elif "sku" in label:
                inp.fill("QA-001")
            elif t == "number":
                inp.fill("50")
            else:
                inp.fill("QA Test")

        for sel in selects:
            options = sel.locator("option").all()
            if len(options) > 1:
                sel.select_option(index=1)

        for ta in textareas:
            ta.fill("QA test inventory item")

        save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Create')").first
        if save.count() > 0:
            save.click()
            time.sleep(1)
            ss(page, "t10_inventory_after_save")
            if has_modal(page):
                print("  FAIL: Modal still open")
                close_modal(page)
            else:
                print("  PASS: Item created")
    else:
        print("  FAIL: No modal")

def test_leads(page):
    print("\n=== TEST: Leads Page ===")
    page.goto(f"{BASE}/leads")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t11_leads")

    add = page.locator("button:has-text('Add Lead'), button:has-text('New Lead')").first
    if add.count() > 0:
        add.click()
        time.sleep(0.5)

        if has_modal(page):
            print("  Modal opened OK")
            ss(page, "t11_lead_modal")

            inputs = page.locator(".fixed.inset-0.z-50 input:visible").all()
            selects = page.locator(".fixed.inset-0.z-50 select:visible").all()
            textareas = page.locator(".fixed.inset-0.z-50 textarea:visible").all()
            print(f"  Inputs: {len(inputs)}, Selects: {len(selects)}, Textareas: {len(textareas)}")

            for inp in inputs:
                p = (inp.get_attribute("placeholder") or "").lower()
                t = (inp.get_attribute("type") or "").lower()
                n = (inp.get_attribute("name") or "").lower()
                label = p or n
                print(f"    Input: p='{p}' n='{n}' t='{t}'")
                if "name" in label:
                    inp.fill("QA Test Lead")
                elif "email" in label or t == "email":
                    inp.fill("qalead@test.com")
                elif "phone" in label or t == "tel":
                    inp.fill("555-0177")
                elif t == "number":
                    inp.fill("3000")
                else:
                    inp.fill("QA Test")

            for sel in selects:
                n = sel.get_attribute("name") or ""
                opts = [o.text_content() for o in sel.locator("option").all()]
                print(f"    Select: n='{n}' options={opts[:5]}")
                if len(opts) > 1:
                    sel.select_option(index=1)

            for ta in textareas:
                ta.fill("QA test lead notes")

            ss(page, "t11_lead_filled")

            save = page.locator(".fixed.inset-0.z-50 button:has-text('Add'), .fixed.inset-0.z-50 button:has-text('Save'), .fixed.inset-0.z-50 button:has-text('Create')").first
            if save.count() > 0:
                save.click()
                time.sleep(1)
                ss(page, "t11_lead_after_save")
                if has_modal(page):
                    print("  FAIL: Modal still open")
                    close_modal(page)
                else:
                    print("  PASS: Lead created")
        else:
            print("  FAIL: No modal")
    else:
        print("  FAIL: No Add Lead button")

def test_schedule(page):
    print("\n=== TEST: Schedule Page ===")
    page.goto(f"{BASE}/schedule")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t12_schedule")

    # Test view toggles
    for view in ["Week", "Month"]:
        btn = page.locator(f"button:has-text('{view}')").first
        if btn.count() > 0:
            btn.click()
            time.sleep(0.5)
            ss(page, f"t12_schedule_{view.lower()}")
            print(f"  Switched to {view} view")

    # All buttons
    btns = page.locator("button:visible").all()
    for b in btns:
        t = (b.text_content() or "").strip()[:30]
        if t:
            print(f"    Button: '{t}'")

def test_photos(page):
    print("\n=== TEST: Photos Page ===")
    page.goto(f"{BASE}/photos")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t13_photos")
    body = page.locator("body").text_content()[:200]
    print(f"  Content: {body[:100]}")

def test_reports(page):
    print("\n=== TEST: Reports Page ===")
    page.goto(f"{BASE}/reports")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t14_reports")

    # Check all tabs/buttons
    btns = page.locator("button:visible").all()
    for b in btns:
        t = (b.text_content() or "").strip()[:30]
        if t:
            print(f"    Button: '{t}'")

    # Click any tabs
    tabs = page.locator("button:has-text('Revenue'), button:has-text('Jobs'), button:has-text('Crew')").all()
    for tab in tabs:
        text = (tab.text_content() or "").strip()
        tab.click()
        time.sleep(0.5)
        ss(page, f"t14_reports_{text.lower()[:10]}")
        print(f"  Clicked tab: '{text}'")

def test_settings(page):
    print("\n=== TEST: Settings Page ===")
    page.goto(f"{BASE}/settings")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    ss(page, "t15_settings")

    body = page.locator("body").text_content()[:300]
    print(f"  Content: {body[:150]}")

    # Check tabs
    btns = page.locator("button:visible").all()
    for b in btns:
        t = (b.text_content() or "").strip()[:30]
        if t:
            print(f"    Button: '{t}'")

def test_delete_buttons(page):
    """Test delete buttons on various pages."""
    print("\n=== TEST: Delete Buttons ===")

    # Navigate to customer detail
    page.goto(f"{BASE}/customers")
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    page.locator("text=Sarah Mitchell").first.click()
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    del_btn = page.locator("button:has-text('Delete')")
    if del_btn.count() > 0:
        print("  Customer detail: Delete button exists")
        # Don't actually delete
    else:
        print("  Customer detail: No Delete button")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        # Login
        page.goto(BASE)
        page.evaluate("localStorage.setItem('gs_token', 'demo_token')")
        page.goto(BASE)
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # Run all tests
        test_add_customer(page)
        test_customer_detail_and_edit(page)
        test_add_job(page)
        test_job_detail_and_status(page)
        test_invoices_page(page)
        test_quotes_page(page)
        test_contracts(page)
        test_crews(page)
        test_equipment(page)
        test_inventory(page)
        test_leads(page)
        test_schedule(page)
        test_photos(page)
        test_reports(page)
        test_settings(page)
        test_delete_buttons(page)

        print("\n\n========================================")
        print("CONSOLE ERRORS:")
        for err in console_errors:
            print(f"  {err[:200]}")
        if not console_errors:
            print("  None")
        print("========================================")

        browser.close()

if __name__ == "__main__":
    main()
