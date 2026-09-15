from playwright.sync_api import sync_playwright
import time

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000") # We need to run python -m http.server
        time.sleep(1)

        # Output the classlist of the drawer to see if it opened
        class_list = page.evaluate("document.querySelector('#filterMenuDrawer').className")
        print("Drawer classes initially:", class_list)

        # Open filter menu through the global nav top bar, e.g. from Dashboard
        print("Clicking top filter button")
        page.evaluate("document.querySelector('.global-filter-btn').click()")
        time.sleep(1)

        # Check active state of drawer
        class_list_after = page.evaluate("document.querySelector('#filterMenuDrawer').className")
        print("Drawer classes after click:", class_list_after)

        # Take a screenshot to see if it opened
        page.screenshot(path="dashboard_filter_open.png")

        print("Screenshots taken")
        browser.close()

if __name__ == "__main__":
    test()
