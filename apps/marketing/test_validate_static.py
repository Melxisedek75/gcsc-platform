"""Offline regression cases for the marketing release checks."""

import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("marketing_checks", ROOT / "validate_static.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


class MarketingChecksTest(unittest.TestCase):
    def setUp(self):
        self.files = {
            path.relative_to(ROOT).as_posix(): path.read_text(encoding="utf-8")
            for path in ROOT.iterdir()
            if path.suffix in {".html", ".xml", ".txt"}
        }
        self.paths = {path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*") if path.is_file()}

    def validate(self):
        return checks.validate_site(self.files, self.paths)

    def change(self, old, new, file="index.html"):
        self.assertIn(old, self.files[file], "Mutation no longer matches the fixture")
        self.files[file] = self.files[file].replace(old, new, 1)

    def test_current_candidate(self):
        self.assertEqual(self.validate(), 7)

    def test_missing_canonical_is_rejected(self):
        self.change('<link rel="canonical" href="https://xprnet.org/">', "")
        with self.assertRaisesRegex(ValueError, "canonical"):
            self.validate()

    def test_social_images_must_resolve_inside_the_site(self):
        for prop in ("og:image", "twitter:image"):
            with self.subTest(property=prop):
                original = self.files["index.html"]
                self.change(f'{prop}" content="https://xprnet.org/assets/renovation-hero-v1.png',
                            f'{prop}" content="https://xprnet.org/assets/missing.png')
                with self.assertRaisesRegex(ValueError, "missing local target"):
                    self.validate()
                self.files["index.html"] = original

    def test_robots_cannot_block_homepage_or_draft(self):
        for agent, target in (("*", "/"), ("*", "/whitepaper.html"), ("Googlebot", "/")):
            with self.subTest(agent=agent, target=target):
                self.files["robots.txt"] = f"User-agent: {agent}\nDisallow: {target}\nSitemap: https://xprnet.org/sitemap.xml\n"
                with self.assertRaisesRegex(ValueError, "robots.txt blocks"):
                    self.validate()

    def test_commented_owner_cta_does_not_count(self):
        self.change('<a class="text-link" href="https://gcsc.store/#/dashboard?role=homeowner">',
                    '<!-- <a class="text-link" href="https://gcsc.store/#/dashboard?role=homeowner"> -->\n<a class="text-link" href="#pilot">')
        with self.assertRaisesRegex(ValueError, "owner and contractor"):
            self.validate()

    def test_robots_restrictions_do_not_depend_on_rule_order(self):
        for rules in ("Allow: /\nDisallow: /whitepaper.html", "Disallow: /whitepaper.html\nAllow: /"):
            with self.subTest(rules=rules):
                self.files["robots.txt"] = f"User-agent: *\n{rules}\nSitemap: https://xprnet.org/sitemap.xml\n"
                with self.assertRaisesRegex(ValueError, "robots.txt"):
                    self.validate()

    def test_robots_new_crawl_restrictions_require_review(self):
        self.files["robots.txt"] = "User-agent: *\nDisallow: /private\nSitemap: https://xprnet.org/sitemap.xml\n"
        with self.assertRaisesRegex(ValueError, "robots.txt"):
            self.validate()

    def test_unsafe_url_schemes_are_rejected(self):
        for url in ("javascript:alert(1)", "jav&#x61;script:alert(1)", "java&#9;script:alert(1)",
                    "data:text/html,test", "//untrusted.example/", "https://user:password@example.com/"):
            with self.subTest(url=url):
                original = self.files["index.html"]
                self.change('href="#approach"', f'href="{url}"')
                with self.assertRaisesRegex(ValueError, "unsafe URL|URL credentials"):
                    self.validate()
                self.files["index.html"] = original

    def test_duplicate_ids_are_rejected(self):
        self.change('id="pilot"', 'id="approach"')
        with self.assertRaisesRegex(ValueError, "duplicate ID"):
            self.validate()

    def test_missing_single_quoted_or_unquoted_target_is_rejected(self):
        for target in ("'missing.html'", "missing.html"):
            with self.subTest(target=target):
                original = self.files["index.html"]
                self.change('href="whitepaper.html"', f"href={target}")
                with self.assertRaisesRegex(ValueError, "missing local target"):
                    self.validate()
                self.files["index.html"] = original

    def test_single_quoted_valid_html_still_passes(self):
        self.change('href="whitepaper.html"', "href='whitepaper.html'")
        self.assertEqual(self.validate(), 7)

    def test_query_and_encoded_fragment_resolve_without_network(self):
        self.change('href="whitepaper.html"', 'href="whitepaper.html?ref=pilot#sum%6dary"')
        self.assertEqual(self.validate(), 7)

    def test_encoded_traversal_is_rejected(self):
        self.change('href="whitepaper.html"', 'href="%2e%2e/secrets.txt"')
        with self.assertRaisesRegex(ValueError, "escapes site root"):
            self.validate()

    def test_missing_fragment_is_rejected(self):
        self.change('href="#pilot"', 'href="#missing-section"')
        with self.assertRaisesRegex(ValueError, "missing anchor"):
            self.validate()

    def test_malformed_or_wrong_sitemap_is_rejected(self):
        for sitemap in ("<urlset>", self.files["sitemap.xml"].replace("https://xprnet.org/", "https://gcsc.store/")):
            with self.subTest(sitemap=sitemap):
                self.files["sitemap.xml"] = sitemap
                with self.assertRaisesRegex(ValueError, "sitemap"):
                    self.validate()

    def test_draft_noindex_is_required(self):
        self.change('content="noindex"', 'content="index"', file="whitepaper.html")
        with self.assertRaisesRegex(ValueError, "noindex"):
            self.validate()

    def test_homepage_cannot_be_noindex(self):
        self.change("</head>", '<meta name="robots" content="none"></head>')
        with self.assertRaisesRegex(ValueError, "homepage must remain indexable"):
            self.validate()

    def test_wrong_role_hint_is_rejected(self):
        self.change("?role=homeowner", "?role=owner")
        with self.assertRaisesRegex(ValueError, "account CTA"):
            self.validate()


if __name__ == "__main__":
    unittest.main()
