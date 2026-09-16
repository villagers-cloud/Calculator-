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

                    // Clear existing if any
                    const existingProjects = await window.appDB.getAll('projects');
                    for (let p of existingProjects) {
                        if(p.id.startsWith('bench-')) await window.appDB.delete('projects', p.id);
                    }
                    const existingClients = await window.appDB.getAll('clients');
                    for (let c of existingClients) {
                        if(c.id.startsWith('bench-')) await window.appDB.delete('clients', c.id);
                    }

                    for (let i = 0; i < numRecords; i++) {
                        await window.appDB.put('clients', { id: `bench-client-${i}`, name: `Client ${i}` });
                    }
                    for (let i = 0; i < numRecords; i++) {
                        await window.appDB.put('projects', { id: `bench-proj-${i}`, clientId: `bench-client-${i}`, name: `Project ${i}` });
                    }

                    let projects = await window.appDB.getAll('projects');

                    // Benchmark current implementation
                    const start = performance.now();

                    for (let p of projects) {
                        if (p.clientId) {
                            const client = await window.appDB.get('clients', p.clientId);
                            if (client) p.clientNameTemp = client.name;
                        }
                    }

                    const end = performance.now();
                    return end - start;
                }
            """)
            print(f"Baseline Time Taken (N+1 query for 500 projects): {result:.2f} ms")
            browser.close()
    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    run_benchmark()
