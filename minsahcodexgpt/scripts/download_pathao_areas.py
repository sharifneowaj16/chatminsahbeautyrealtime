#!/usr/bin/env python3
"""
Download Pathao area JSON files one-by-one from a text file of URLs.

Default input:
  pathao-area-download-links-by-zone.txt

Example:
  python scripts/download_pathao_areas.py
  python scripts/download_pathao_areas.py --output "C:\\Users\\Administrator\\Downloads\\Area"
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


DEFAULT_LINK_FILE = "pathao-area-download-links-by-zone.txt"
DEFAULT_OUTPUT_DIR = str(Path.home() / "Downloads" / "Area")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download Pathao area JSON files sequentially.")
    parser.add_argument("--links", default=DEFAULT_LINK_FILE, help="Text file with one URL per line.")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR, help="Folder where JSON files will be saved.")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay in seconds between downloads.")
    parser.add_argument("--retries", type=int, default=3, help="Retry count per URL.")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds.")
    parser.add_argument("--overwrite", action="store_true", help="Download again even if file exists.")
    return parser.parse_args()


def safe_slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip())
    return cleaned.strip("-") or "unknown"


def filename_from_url(url: str) -> str:
    query = parse_qs(urlparse(url).query)
    city_id = query.get("city_id", ["unknown"])[0]
    zone_id = query.get("zone_id", ["unknown"])[0]
    return f"pathao-areas-linked-city-{safe_slug(city_id)}-zone-{safe_slug(zone_id)}.json"


def load_links(path: Path) -> list[str]:
    links = []
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#"):
            links.append(line)
    return links


def download_json(url: str, timeout: int) -> bytes:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "MinsahBeauty-PathaoAreaDownloader/1.0",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        return response.read()


def validate_json(data: bytes) -> None:
    json.loads(data.decode("utf-8-sig"))


def main() -> int:
    args = parse_args()
    link_file = Path(args.links)
    output_dir = Path(args.output)

    if not link_file.exists():
        print(f"Link file not found: {link_file}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    links = load_links(link_file)

    print(f"Links found: {len(links)}")
    print(f"Output dir: {output_dir}")

    success = 0
    skipped = 0
    failed: list[tuple[str, str]] = []

    for index, url in enumerate(links, start=1):
        output_path = output_dir / filename_from_url(url)

        if output_path.exists() and not args.overwrite:
            skipped += 1
            print(f"[{index}/{len(links)}] SKIP {output_path.name}")
            continue

        last_error = ""
        for attempt in range(1, args.retries + 1):
            try:
                print(f"[{index}/{len(links)}] Downloading {output_path.name} (try {attempt})")
                data = download_json(url, args.timeout)
                validate_json(data)
                output_path.write_bytes(data)
                success += 1
                last_error = ""
                break
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
                last_error = str(error)
                print(f"  failed: {last_error}")
                if attempt < args.retries:
                    time.sleep(1.5 * attempt)

        if last_error:
            failed.append((url, last_error))

        time.sleep(args.delay)

    if failed:
        failed_path = output_dir / "failed-area-downloads.txt"
        failed_path.write_text(
            "\n".join(f"{url}\t{error}" for url, error in failed),
            encoding="utf-8",
        )
        print(f"Failed list saved: {failed_path}")

    print(f"Done. success={success}, skipped={skipped}, failed={len(failed)}")
    return 0 if not failed else 2


if __name__ == "__main__":
    raise SystemExit(main())
