"""Build the public career feed from open job feeds."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree


PUBLIC_FEED = "https://mathdept.ru/vacancies.json"
MAX_AGE = timedelta(hours=48)
HH_FEEDS = {
    "hh-ml": ("ML Engineer", "ml", r"\bml\b|машинн\w+ обучен"),
    "hh-model": ("математическое моделирование", "model", r"математическ\w+ модел"),
    "hh-data": ("аналитик данных", "data", r"аналитик\w* данн|data analyst"),
    "hh-education": ("преподаватель математики", "education", r"(учитель|преподаватель).*математик"),
}
GREENHOUSE = {"physicsx": "PhysicsX", "constructorknowledgelabs": "Constructor Labs"}
ASHBY = {"root-access": "Root Access"}
FOREIGN_FIELDS = (
    (r"simulation|modelling|modeling|numerical|scientific software", "model"),
    (r"machine learning|\bml engineer\b|\bai engineer\b", "ml"),
    (r"data scientist|data analyst|data engineer", "data"),
)


def download(url):
    request = Request(url, headers={"User-Agent": "MathDept vacancy feed (https://mathdept.ru)"})
    with urlopen(request, timeout=12) as response:
        body = response.read(2_000_001)
    if len(body) > 2_000_000:
        raise ValueError("Feed response is too large")
    return body


def timestamp(value):
    if not value:
        return None
    try:
        date = datetime.fromisoformat(value)
    except ValueError:
        try:
            date = parsedate_to_datetime(value)
        except (ValueError, TypeError):
            return None
    return date.astimezone(UTC).isoformat() if date.tzinfo else None


def text(value, limit=240):
    return " ".join(unescape(value or "").split())[:limit]


def vacancy(title, organization, location, url, field, *, published=None):
    return {"title": text(title), "organization": text(organization, 120),
            "location": text(location, 120), "url": url, "field": field, "published": published}


def hh_jobs(query, field, pattern):
    params = urlencode({"text": query, "area": 113, "order_by": "publication_time", "search_field": "name"})
    body = download("https://hh.ru/search/vacancy/rss?" + params)
    if b"<!DOCTYPE" in body.upper():
        raise ValueError("Unexpected RSS document type")
    channel = ElementTree.fromstring(body).find("channel")
    if channel is None:
        raise ValueError("Missing RSS channel")
    matches = []
    for item in channel.findall("item"):
        url, title = item.findtext("link", ""), item.findtext("title", "")
        if not re.fullmatch(r"https://hh\.ru/vacancy/\d+", url) or not re.search(pattern, title, re.I):
            continue
        info = {}
        for field_text in re.findall(r"<p[^>]*>(.*?)</p>", item.findtext("description", ""), re.I | re.S):
            label, _, value = re.sub(r"<[^>]+>", "", field_text).partition(":")
            info[text(label)] = text(value)
        published = timestamp(item.findtext("pubDate"))
        job = vacancy(title, info.get("Вакансия компании"), info.get("Регион"), url, field, published=published)
        if published and job["title"]:
            matches.append(job)
    return sorted(matches, key=lambda job: job["published"], reverse=True)[:3]


def foreign_jobs(board, employer, provider):
    endpoint = (f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs" if provider == "greenhouse"
                else f"https://api.ashbyhq.com/posting-api/job-board/{board}")
    matches = []
    for item in json.loads(download(endpoint))["jobs"]:
        title = item["title"]
        field = next((name for pattern, name in FOREIGN_FIELDS if re.search(pattern, title, re.I)), None)
        if not field or item.get("isListed") is False:
            continue
        if provider == "greenhouse":
            url, location = item["absolute_url"], item["location"]["name"]
            published = None  # Greenhouse exposes the edit date, not the original posting date.
            ranked_at = timestamp(item.get("updated_at"))
            hosts = {"job-boards.greenhouse.io", "job-boards.eu.greenhouse.io", "boards.greenhouse.io"}
        else:
            url, location = item["jobUrl"], item["location"]
            published = timestamp(item.get("publishedAt"))
            ranked_at = published
            hosts = {"jobs.ashbyhq.com"}
        parsed = urlsplit(url)
        if parsed.scheme == "https" and parsed.netloc in hosts:
            matches.append((ranked_at or "", vacancy(title, employer, location, url, field, published=published)))
    return [job for _, job in sorted(matches, key=lambda match: match[0], reverse=True)[:3]]


def sources():
    for name, params in HH_FEEDS.items():
        yield name, "ru", hh_jobs, params
    for provider, boards in (("greenhouse", GREENHOUSE), ("ashby", ASHBY)):
        for board, employer in boards.items():
            yield board, "international", foreign_jobs, (board, employer, provider)


def refresh(source, previous, now):
    name, market, fetch, params = source
    try:
        jobs = fetch(*params)
        print(f"{name}: {len(jobs)} matching vacancies")
        return {"market": market, "checkedAt": datetime.now(UTC).isoformat(), "jobs": jobs}
    except (OSError, ValueError, KeyError, TypeError, ElementTree.ParseError) as error:
        print(f"{name}: {error}", file=sys.stderr)
        saved = previous.get(name, {})
        checked = timestamp(saved.get("checkedAt"))
        if checked and now - datetime.fromisoformat(checked) <= MAX_AGE:
            return saved
        return {"market": market, "checkedAt": None, "jobs": []}


def main(output):
    try:
        previous = json.loads(download(PUBLIC_FEED)).get("sources", {})
    except (OSError, ValueError):
        previous = {}
    now = datetime.now(UTC)
    feeds = list(sources())
    with ThreadPoolExecutor(max_workers=4) as pool:
        tasks = {source[0]: pool.submit(refresh, source, previous, now) for source in feeds}
        result = {"sources": {name: task.result() for name, task in tasks.items()}}
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
