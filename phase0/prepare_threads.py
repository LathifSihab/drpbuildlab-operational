"""Phase 0: prepare Outlook .msg threads the way docs/AI_PIPELINE.md section 1 describes.

Splits forwarded threads into messages (oldest first), labels roles from addresses,
redacts secrets, and lists attachments and links. Writes one <messages>/<attachments>
block per thread to phase0/inputs/. A throwaway prototype for the Phase 2 intake code.

Usage: python -I phase0/prepare_threads.py email phase0/inputs   (needs: pip install extract-msg)
"""
import pathlib
import re
import sys
from html import escape
from html.parser import HTMLParser

import extract_msg

DRP_DOMAIN = "drpbuildlab.com"

# ---------- HTML -> text (Graph returns text when asked; .msg files need this) ----------

class _Text(HTMLParser):
    BLOCK = {"p", "div", "br", "tr", "li", "h1", "h2", "h3", "h4", "table", "hr", "blockquote"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "head"):
            self.skip += 1
        if tag in self.BLOCK:
            self.parts.append("\n")
        if tag == "li":
            self.parts.append("- ")

    def handle_endtag(self, tag):
        if tag in ("style", "script", "head"):
            self.skip = max(0, self.skip - 1)
        if tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    p = _Text()
    p.feed(html)
    t = "".join(p.parts).replace("\r", "").replace("\xa0", " ").replace("⁣", "")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n\n", t)
    t = re.sub(r"\n[ \t]*-[ \t]*\n\s*", "\n- ", t)  # Outlook puts list bullets on their own line
    return t.replace("\x00", "").strip()


def body_text(msg) -> str:
    if msg.body and msg.body.strip():
        return msg.body.strip()
    return html_to_text(html_str(msg))


def html_str(msg) -> str:
    html = msg.htmlBody or b""
    if isinstance(html, str):
        return html
    m = re.search(rb'charset=["\']?([\w-]+)', html)
    try:
        return html.decode(m.group(1).decode() if m else "utf-8")
    except (LookupError, UnicodeDecodeError):
        return html.decode("utf-8", "replace")

# ---------- Thread splitting ----------

HEADER_START = re.compile(
    r"^(?:"
    r"(?:From|Van)\s*:.*"                                   # Outlook / Zimbra block
    r"|-{5,}\s*Forwarded message\s*-{5,}"                   # Gmail forward
    r"|Op .{5,80}? schreef .{1,120}:"                       # Gmail NL reply
    r"|On .{5,80}? wrote:"                                  # Gmail EN reply
    r"|Op .{5,80}? heeft .{1,120}? het volgende geschreven:"  # Apple Mail NL
    r")\s*$",
    re.MULTILINE,
)
FIELD = re.compile(r"^(From|Van|Sent|Verzonden|Date|Datum|To|Aan|Cc|CC|Subject|Onderwerp)\s*:\s*(.*)$")
ADDR = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def parse_segment(seg: str) -> dict:
    lines = seg.strip("\n").split("\n")
    first = lines[0].strip()
    meta = {"from": "", "date": "", "to": "", "cc": ""}
    body_start = 1
    m = re.match(r"^(?:Op|On) (.+?) (?:schreef|wrote|heeft) (.+?)(?: het volgende geschreven)?:$", first)
    if m and not FIELD.match(first):
        meta["date"], meta["from"] = m.group(1), m.group(2)
    else:
        # header block: field lines, possibly separated by blank lines, until the first non-field line
        i = 0 if FIELD.match(first) else 1
        while i < len(lines):
            line = lines[i].strip()
            fm = FIELD.match(line)
            if fm:
                key = fm.group(1).lower()
                key = {"van": "from", "verzonden": "date", "sent": "date", "datum": "date",
                       "aan": "to", "onderwerp": "subject"}.get(key, key)
                meta[key] = fm.group(2).strip()
            elif line:
                break
            i += 1
        body_start = i
    meta["body"] = "\n".join(lines[body_start:]).strip()
    return meta


def split_thread(top_meta: dict, text: str) -> list[dict]:
    starts = [m.start() for m in HEADER_START.finditer(text)]
    # merge a Gmail "Forwarded message" marker with the field block right after it
    parts, prev = [], 0
    for s in starts:
        if text[prev:s].strip() or not parts:
            parts.append(text[prev:s])
            prev = s
    parts.append(text[prev:])
    messages = [dict(top_meta, body=parts[0].strip())]
    for seg in parts[1:]:
        if seg.strip():
            messages.append(parse_segment(seg))
    return list(reversed(messages))  # oldest first

# ---------- Roles ----------

def domains(field: str) -> list[str]:
    return [a.split("@")[1].lower() for a in ADDR.findall(field or "")]


def role(meta: dict) -> str:
    sender = domains(meta.get("from", ""))
    if not sender or sender[0] != DRP_DOMAIN:
        return "external"
    rcpt = domains(meta.get("to", "")) + domains(meta.get("cc", ""))
    # unknown recipients: a DRP sender counts as drp_to_client (internal direction must be provable)
    if rcpt and all(d == DRP_DOMAIN for d in rcpt):
        return "internal_note"
    return "drp_to_client"

# ---------- Secrets ----------

SECRET_PATTERNS = [
    ("openai_api_key", re.compile(r"\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}")),
    ("anthropic_api_key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}")),
    ("github_token", re.compile(r"\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("slack_token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("stripe_key", re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}")),
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S)),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    ("password", re.compile(r"(?im)^(?:\s*)(?:password|passwd|wachtwoord|mot de passe)\s*[:=]\s*\S+.*$")),
]


def redact(text: str) -> tuple[str, list[str]]:
    found = []
    for kind, pat in SECRET_PATTERNS:
        def sub(_m, kind=kind):
            found.append(kind)
            return f"[REDACTED secret: {kind}]"
        text = pat.sub(sub, text)
    return text, found

# ---------- Noise ----------

NOISE = re.compile(r"^\s*(?:Get Outlook for (?:iOS|Android)|Get\s*$|Outlook for iOS)\s*$", re.M | re.I)


def clean(text: str) -> str:
    text = NOISE.sub("", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()

# ---------- Attachments and links ----------

URL = re.compile(r"https?://[^\s<>\"')\]]+")
MENTIONED = re.compile(r"^<([^<>\n]+\.(?:pdf|png|jpe?g|heic|docx?|xlsx?|zip|pptx?|mov|mp4))>$", re.M | re.I)


def attachments_for(msg, messages) -> list[dict]:
    items = []
    html = html_str(msg)
    for a in msg.attachments:
        name = (a.longFilename or a.shortFilename or "unnamed").strip("\x00 ")
        cid = (getattr(a, "cid", None) or "").strip("\x00")
        if getattr(a, "hidden", False) or (cid and f"cid:{cid}" in html):
            continue  # inline image (signature, logo)
        size = len(a.data) if isinstance(a.data, (bytes, bytearray)) else 0
        items.append({"kind": "file", "name": name, "size": size, "in": messages[-1]["label"]})
    seen = set()
    for m in messages:
        for url in URL.findall(m["body"]):
            url = url.rstrip(".,;:")
            if url not in seen:
                seen.add(url)
                items.append({"kind": "link", "name": url.split("/")[2], "url": url, "in": m["label"]})
        for name in MENTIONED.findall(m["body"]):
            if re.fullmatch(r"(?i)image\d*\.(?:png|jpe?g)", name):
                continue  # generic pasted/signature image names carry no information
            items.append({"kind": "mentioned", "name": name, "in": m["label"]})
    for i, it in enumerate(items, 1):
        it["label"] = f"A{i}"
    return items

# ---------- Main ----------

class _Att:
    def __init__(self, part):
        self.longFilename = part.get_filename() or "unnamed"
        self.shortFilename = None
        self.data = part.get_payload(decode=True) or b""
        self.hidden = part.get_content_disposition() == "inline"
        self.cid = (part.get("Content-ID") or "").strip("<>")


class EmlMessage:
    """Minimal adapter so .eml files (test fixtures) look like extract_msg messages."""

    def __init__(self, path):
        from email import policy
        from email.parser import BytesParser
        m = BytesParser(policy=policy.default).parse(open(path, "rb"))
        self.sender, self.to, self.cc, self.date = m["From"], m["To"], m["Cc"], m["Date"]
        plain = m.get_body(preferencelist=("plain",))
        html = m.get_body(preferencelist=("html",))
        self.body = plain.get_content() if plain else ""
        self.htmlBody = html.get_content() if html else ""
        self.attachments = [_Att(p) for p in m.iter_attachments()]

    def close(self):
        pass


def prepare(path: pathlib.Path) -> tuple[str, dict]:
    msg = EmlMessage(path) if path.suffix.lower() == ".eml" else extract_msg.openMsg(str(path))
    top = {"from": msg.sender or "", "to": msg.to or "", "cc": msg.cc or "", "date": str(msg.date)}
    messages = split_thread(top, body_text(msg))
    redactions = []
    for i, m in enumerate(messages, 1):
        m["label"] = f"M{i}"
        m["role"] = role(m)
        m["body"], found = redact(clean(m["body"]))
        redactions += [(m["label"], k) for k in found]
    atts = attachments_for(msg, messages)
    msg.close()

    out = ["<messages>"]
    for m in messages:
        out.append(f'<message id="{m["label"]}" role="{m["role"]}" date="{escape(m["date"])}" '
                   f'from="{escape(m["from"])}" to="{escape(m.get("to", ""))}">')
        out.append(m["body"])
        out.append("</message>")
    out.append("</messages>\n<attachments>")
    for a in atts:
        extra = f' url="{escape(a["url"])}"' if a["kind"] == "link" else ""
        extra += f' size="{a["size"]} bytes"' if a["kind"] == "file" else ""
        out.append(f'<attachment id="{a["label"]}" kind="{a["kind"]}" name="{escape(a["name"])}"{extra} in="{a["in"]}"/>')
    out.append("</attachments>")
    stats = {"messages": len(messages), "attachments": len(atts), "redactions": redactions,
             "roles": [m["role"] for m in messages]}
    return "\n".join(out), stats


if __name__ == "__main__":
    src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    start = int(sys.argv[3]) if len(sys.argv) > 3 else 1  # numbering offset, e.g. 6 for synthetic threads
    dst.mkdir(parents=True, exist_ok=True)
    files = [p for p in src.iterdir() if p.suffix.lower() in (".msg", ".eml")]
    for n, f in enumerate(sorted(files, key=lambda p: (p.stat().st_mtime, p.name)), start):
        text, stats = prepare(f)
        out = dst / f"{n}.md"
        out.write_text(f"<!-- source: {f.name} -->\n{text}\n", encoding="utf-8")
        print(n, f.name, stats)
