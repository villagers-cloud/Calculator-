from playwright.sync_api import sync_playwright
import time

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000") # We need to run python -m http.server
        time.sleep(1)

        # Take a screenshot of dashboard
        page.screenshot(path="dashboard.png")

        # Click settings
        page.evaluate("document.querySelector('[data-navigate=\"settings\"]').click()")
        time.sleep(1)
        page.screenshot(path="settings.png")

        # Click reports
        page.evaluate("window.appRouter.navigate('reports')")
        time.sleep(1)
        page.screenshot(path="reports.png")

        print("Screenshots taken")
        browser.close()

if __name__ == "__main__":
    test()
