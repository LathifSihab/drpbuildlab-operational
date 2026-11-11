"""Phase 0: run the validation checks from docs/AI_PIPELINE.md section 3 on phase0/outputs/*.json.

Usage: python -I phase0/validate.py phase0/inputs phase0/outputs
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from prepare_threads import SECRET_PATTERNS  # noqa: E402  same scanner as intake

REQUEST_TYPES = {"new_build", "rebuild", "demo", "change_request", "integration", "platform_config", "bug_fix", "maintenance"}
ENGAGEMENTS = {"free_demo", "quote_requested", "quote_sent", "signed", "maintenance_contract", "unknown"}
PLATFORMS = {"shopify", "wix", "wordpress", "webflow", "squarespace", "storyblok", "drp_custom", "other", "none", "unknown"}
REQUIRED = ["title", "request_type", "engagement", "parties", "account_manager", "existing_site", "internal_direction",
            "objective", "scope_now", "deferred_scope", "pain_points", "requirements", "brand", "ai_skills", "tech_stack",
            "product_type", "integrations", "access_needed", "deadline", "urgency", "constraints", "contradictions",
            "assumptions", "open_questions"]


def check(inp: str, s: dict) -> list[str]:
    errs = []
    ids = set(re.findall(r'<(?:message|attachment) id="([MA]\d+)"', inp))
    roles = dict(re.findall(r'<message id="(M\d+)" role="(\w+)"', inp))

    # 1. schema (subset of the Zod schema)
    errs += [f"schema: missing {k}" for k in REQUIRED if k not in s]
    if s.get("request_type") not in REQUEST_TYPES:
        errs.append(f"schema: request_type {s.get('request_type')}")
    if s.get("engagement", {}).get("kind") not in ENGAGEMENTS:
        errs.append("schema: engagement.kind")
    if s.get("existing_site", {}).get("platform") not in PLATFORMS:
        errs.append("schema: existing_site.platform")
    if s.get("tech_stack", {}).get("approach") not in {"client_platform", "drp_default"}:
        errs.append("schema: tech_stack.approach")

    # 2. citations
    def walk(node, path):
        if isinstance(node, dict):
            if "source_ids" in node:
                for sid in node["source_ids"]:
                    if sid not in ids:
                        errs.append(f"citation: {path} cites unknown {sid}")
                cited = "text" in node and not path.startswith("open_questions")
                if cited and not node["source_ids"]:
                    errs.append(f"citation: {path} has no source")
            for k, v in node.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")
    walk(s, "")
    for i, c in enumerate(s.get("contradictions", [])):
        if len(set(c["source_ids"])) < 2:
            errs.append(f"citation: contradictions[{i}] needs two sources")
    for i, d in enumerate(s.get("internal_direction", [])):
        bad = [x for x in d["source_ids"] if roles.get(x) != "internal_note"]
        if bad:
            errs.append(f"citation: internal_direction[{i}] cites non-internal {bad}")

    # 3. deviations need a reason
    for i, d in enumerate(s.get("tech_stack", {}).get("deviations", [])):
        if not d.get("reason", "").strip():
            errs.append(f"deviation[{i}] has no reason")

    # 4. no secrets in output
    text = json.dumps(s, ensure_ascii=False)
    for kind, pat in SECRET_PATTERNS:
        if pat.search(text):
            errs.append(f"secret: {kind} in output")
    return errs


if __name__ == "__main__":
    inputs, outputs = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    failed = 0
    for out in sorted(outputs.glob("*.json")):
        n = out.name.split("-")[0]
        inp = (inputs / f"{n}.md").read_text(encoding="utf-8")
        errs = check(inp, json.loads(out.read_text(encoding="utf-8")))
        print(f"{out.name}: {'PASS' if not errs else 'FAIL'}")
        for e in errs:
            print("   ", e)
        failed += bool(errs)
    sys.exit(1 if failed else 0)
