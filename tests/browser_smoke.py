"""Exercise the built application at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "example-tool")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/example-tool/")
                page.locator('#summary strong').wait_for()
                assert 'Second Beach' in page.locator('#stops').inner_text()
                page.locator('#filter').select_option('all')
                page.get_by_text('Second Beach pool deck', exact=True).wait_for()
                assert '10:00 am' in page.locator('#stops').inner_text()
                page.locator('#wash').uncheck()
                assert 'Wheelchair access:' not in page.locator('#stops').inner_text()
                sent = []
                page.on('request', lambda req: sent.append((req.method,req.url)))
                page.locator('#file').set_input_files(dict(name='outside.gpx', mimeType='application/gpx+xml',
                    buffer=b'<gpx><trk><trkseg><trkpt lat="49.4" lon="-122.9"/><trkpt lat="49.41" lon="-122.9"/></trkseg></trk></gpx>'))
                page.get_by_text('Outside coverage', exact=True).first.wait_for()
                page.get_by_text('This track does not enter the City of Vancouver.').wait_for()
                assert all(m=='GET' and '/example-tool/' in url for m,url in sent),sent
                page.locator('#file').set_input_files(dict(name='bad.gpx', mimeType='application/gpx+xml', buffer=b'not xml'))
                page.get_by_role('alert').get_by_text('Choose a valid GPX track or route.').wait_for()
                page.locator('#example').click()
                page.get_by_text('English Bay to Second Beach',exact=True).wait_for()
                page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)
                assert not errors, errors
                browser.close()
            print("Browser checks passed")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
