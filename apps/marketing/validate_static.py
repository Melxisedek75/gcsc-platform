"""Offline marketing checks. Requires only the Python 3 standard library."""

from html.parser import HTMLParser
from pathlib import Path
import posixpath
import sys
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree


SITE = "https://xprnet.org"
APP = "gcsc.store"
PAGES = ("index.html", "whitepaper.html")
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


def require(condition, message):
    if not condition:
        raise ValueError(message)


class Page(HTMLParser):
    def __init__(self, name, source):
        super().__init__(convert_charrefs=True)
        self.name = name
        self.nodes = []
        self.ids = set()
        self.in_head = False
        self.template_depth = 0
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attributes):
        if tag == "template":
            self.template_depth += 1
        if self.template_depth:
            return
        if tag == "head":
            self.in_head = True
        names = [name for name, _ in attributes]
        require(len(names) == len(set(names)), f"{self.name}: duplicate attribute on {tag}")
        attrs = dict(attributes)
        if "id" in attrs:
            identity = attrs["id"]
            require(identity and identity not in self.ids, f"{self.name}: empty or duplicate ID: {identity}")
            self.ids.add(identity)
        require(tag != "base", f"{self.name}: base URL overrides need separate review")
        self.nodes.append((tag, attrs, self.in_head))

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "template" and self.template_depth:
            self.template_depth -= 1
        if tag == "head":
            self.in_head = False

    def metadata(self, key):
        return [attrs.get("content") or "" for tag, attrs, in_head in self.nodes
                if in_head and tag == "meta" and (attrs.get("name") == key or attrs.get("property") == key)]


def check_url(value, page, pages, paths):
    require(isinstance(value, str) and bool(value.strip()), f"{page}: empty URL")
    require("\\" not in value, f"{page}: unsafe URL: {value}")
    url = urlsplit(value)
    require(url.scheme in {"", "https", "mailto", "tel"}, f"{page}: unsafe URL: {value}")
    require(url.username is None and url.password is None, f"{page}: URL credentials are forbidden")
    if url.scheme in {"mailto", "tel"}:
        return url
    if url.scheme == "https":
        require(bool(url.hostname), f"{page}: unsafe URL: {value}")
        if url.netloc.lower() != "xprnet.org":
            return url
    else:
        require(not url.netloc, f"{page}: unsafe URL: {value}")

    decoded = unquote(url.path)
    require("\\" not in decoded, f"{page}: unsafe URL: {value}")
    if url.scheme or decoded.startswith("/"):
        target = decoded.lstrip("/") or "index.html"
    else:
        target = posixpath.join(posixpath.dirname(page), decoded) if decoded else page
    target = posixpath.normpath(target)
    require(target != ".." and not target.startswith("../"), f"{page}: link escapes site root: {value}")
    require(target in paths, f"{page}: missing local target: {value}")
    if url.fragment:
        require(target in pages and unquote(url.fragment) in pages[target].ids,
                f"{page}: missing anchor: {value}")
    return url


def check_robots(source):
    parser = RobotFileParser()
    parser.parse(source.splitlines())
    agents = {"*", "Googlebot", "Bingbot"}
    for raw_line in source.splitlines():
        directive, separator, value = raw_line.split("#", 1)[0].partition(":")
        if not separator:
            continue
        directive, value = directive.strip().lower(), value.strip()
        if directive == "user-agent":
            agents.add(value)
        if directive in {"allow", "disallow"}:
            require(not any(char in value for char in "*$"), "robots.txt wildcard rules require separate review")
    for agent in agents:
        for target in ("/", "/whitepaper.html"):
            require(parser.can_fetch(agent, SITE + target), f"robots.txt blocks {agent}: {target}")
    require(parser.site_maps() == [SITE + "/sitemap.xml"], "robots.txt must declare the homepage sitemap")


def validate_site(files, paths):
    for required in (*PAGES, "robots.txt", "sitemap.xml"):
        require(required in files, f"Missing marketing file: {required}")
    pages = {name: Page(name, files[name]) for name in PAGES}
    for name, page in pages.items():
        for tag, attrs, _ in page.nodes:
            for key in ("href", "src", "poster", "action"):
                if key in attrs:
                    check_url(attrs[key], name, pages, paths)
            if attrs.get("target") == "_blank":
                require("noopener" in str(attrs.get("rel") or "").split(), f"{name}: new-tab link requires noopener")
            if tag == "meta":
                require(str(attrs.get("http-equiv", "")).lower() != "refresh", f"{name}: refresh redirect requires separate review")

    home = pages["index.html"]
    canonicals = [attrs.get("href") for tag, attrs, in_head in home.nodes
                  if tag == "link" and in_head and "canonical" in str(attrs.get("rel") or "").split()]
    require(canonicals == [SITE + "/"], "Homepage canonical must be exactly https://xprnet.org/")
    for key, expected in (("og:url", SITE + "/"), ("og:type", "website"), ("twitter:card", "summary_large_image")):
        require(home.metadata(key) == [expected], f"Homepage {key} is missing or inconsistent")
    for key in ("description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description"):
        values = home.metadata(key)
        require(len(values) == 1 and bool(values[0].strip()), f"Homepage {key} must have one nonempty value")
    images = []
    for key in ("og:image", "twitter:image"):
        values = home.metadata(key)
        require(len(values) == 1, f"Homepage {key} must have one image")
        image = urlsplit(values[0])
        require(image.scheme == "https" and image.netloc == "xprnet.org", f"Homepage {key} must use an absolute site image")
        check_url(values[0], "index.html", pages, paths)
        images.append(values[0])
    require(images[0] == images[1], "Homepage social images must agree")

    for content in home.metadata("robots") + home.metadata("googlebot") + home.metadata("bingbot"):
        directives = set(content.lower().replace(",", " ").split())
        require(not directives.intersection({"noindex", "none"}), "The homepage must remain indexable")
    draft_directives = {directive for content in pages["whitepaper.html"].metadata("robots")
                        for directive in content.lower().replace(",", " ").split()}
    require(bool(draft_directives.intersection({"noindex", "none"})), "Historical draft must be noindex")

    roles = set()
    account_ctas = 0
    for tag, attrs, _ in home.nodes:
        if tag != "a" or "href" not in attrs:
            continue
        url = urlsplit(attrs["href"])
        if url.hostname != APP:
            continue
        if url.path in {"", "/"} and not url.query and not url.fragment:
            continue  # The footer links to platform home, not account access.
        require(url.scheme == "https" and url.netloc == APP and url.path == "/" and not url.query,
                "Invalid account CTA origin or path")
        route = urlsplit(url.fragment)
        require(route.path == "/dashboard" and not route.fragment, "Invalid account CTA route")
        query = parse_qs(route.query, keep_blank_values=True, strict_parsing=True)
        require(not query or (set(query) == {"role"} and query["role"] in (["homeowner"], ["contractor"])),
                "Invalid account CTA role hint")
        roles.add(query["role"][0] if query else "general")
        account_ctas += 1
    require(roles == {"general", "homeowner", "contractor"}, "Missing general, owner and contractor account CTAs")

    check_robots(files["robots.txt"])
    try:
        sitemap = ElementTree.fromstring(files["sitemap.xml"])
    except ElementTree.ParseError as error:
        raise ValueError(f"Invalid sitemap XML: {error}") from error
    require(sitemap.tag == f"{{{SITEMAP_NS}}}urlset", "Invalid sitemap root or namespace")
    require(len(sitemap) == 1 and sitemap[0].tag == f"{{{SITEMAP_NS}}}url", "The sitemap must contain only one URL")
    locations = [element.text for element in sitemap.findall(f"{{{SITEMAP_NS}}}url/{{{SITEMAP_NS}}}loc")]
    require(locations == [SITE + "/"], "The sitemap must list only the homepage")
    return account_ctas


def main():
    root = Path(__file__).resolve().parent
    files = {name: (root / name).read_text(encoding="utf-8") for name in (*PAGES, "robots.txt", "sitemap.xml")}
    paths = {path.relative_to(root).as_posix() for path in root.rglob("*")
             if path.is_file() and path.resolve().is_relative_to(root)}
    count = validate_site(files, paths)
    print(f"Marketing static checks PASS: {len(PAGES)} pages, {count} account CTAs")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(f"Marketing static checks FAIL: {error}", file=sys.stderr)
        sys.exit(1)
