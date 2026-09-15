from playwright.sync_api import sync_playwright
import subprocess
import time

def run_benchmark():
    # Start the HTTP server
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    time.sleep(1) # wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto("http://localhost:8000")
            time.sleep(1)

            result = page.evaluate("""
                async () => {
                    // Seed data
                    const numRecords = 500;

                    let projects = await window.appDB.getAll('projects');

                    // Benchmark optimized implementation
                    const start = performance.now();

                    const clients = await window.appDB.getAll('clients');
                    const clientMap = new Map(clients.map(c => [c.id, c.name]));
                    for (let p of projects) {
                        if (p.clientId && clientMap.has(p.clientId)) {
                            p.clientNameTemp = clientMap.get(p.clientId);
                        }
                    }

                    const end = performance.now();
                    return end - start;
                }
            """)
            print(f"Optimized Time Taken (Single query + Map for 500 projects): {result:.2f} ms")
            browser.close()
    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    run_benchmark()
