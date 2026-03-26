#!/usr/bin/env python3
"""
Machine-translate missing seed entries where non-English locales still equal English.

Dependency:
  pip install deep-translator

Run from repo root:
  python3 scripts/i18n/machine_translate_booking_seed.py
  python3 scripts/i18n/machine_translate_booking_seed.py --seed convex/translations/seedLayersTranslations.ts
"""

import argparse
import json
import re
import time
from pathlib import Path
from deep_translator import GoogleTranslator

def parse_args():
    parser = argparse.ArgumentParser(
        description="Machine-translate seed entries where de/pl/es/fr/ja still equal en."
    )
    parser.add_argument(
        "--seed",
        default="convex/translations/seedBookingWindowTranslations.ts",
        help="Path to the seed file to translate.",
    )
    parser.add_argument(
        "--cache",
        default=None,
        help="Optional path for translation cache JSON. Defaults to /tmp/<seed-stem>_machine_translation_cache.json",
    )
    parser.add_argument(
        "--untranslated",
        default=None,
        help="Optional path for unresolved entries JSON. Defaults to /tmp/<seed-stem>_untranslated_after.json",
    )
    return parser.parse_args()


args = parse_args()
SEED_PATH = Path(args.seed)
seed_stem = SEED_PATH.stem
CACHE_PATH = Path(args.cache) if args.cache else Path(f"/tmp/{seed_stem}_machine_translation_cache.json")
UNTRANSLATED_PATH = Path(args.untranslated) if args.untranslated else Path(f"/tmp/{seed_stem}_untranslated_after.json")

block_re = re.compile(
    r"\{\s*key:\s*'([^']+)',\s*values:\s*\{\s*en:\s*'((?:\\.|[^'\\])*)',\s*de:\s*'((?:\\.|[^'\\])*)',\s*pl:\s*'((?:\\.|[^'\\])*)',\s*es:\s*'((?:\\.|[^'\\])*)',\s*fr:\s*'((?:\\.|[^'\\])*)',\s*ja:\s*'((?:\\.|[^'\\])*)',\s*\},\s*\},",
    re.M,
)

def unescape_ts(s: str) -> str:
    s = s.replace('\\\\', '\\')
    s = s.replace("\\'", "'")
    return s

def escape_ts(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'")

placeholder_re = re.compile(r'\{[^}]+\}')

def protect_placeholders(text: str):
    placeholders = []
    def repl(match):
        idx = len(placeholders)
        placeholders.append(match.group(0))
        return f'__PH_{idx}__'
    return placeholder_re.sub(repl, text), placeholders

def restore_placeholders(text: str, placeholders):
    out = text
    for i, ph in enumerate(placeholders):
        out = out.replace(f'__PH_{i}__', ph)
    return out

manual_overrides = {
    'No Show': {
        'de': 'Nicht erschienen',
        'pl': 'Nie stawił się',
        'es': 'No asistió',
        'fr': 'Absent',
        'ja': '無断欠席',
    },
    'Check In': {
        'de': 'Einchecken',
        'pl': 'Zamelduj',
        'es': 'Registrar llegada',
        'fr': "Enregistrer l'arrivée",
        'ja': 'チェックイン',
    },
    'Checked In': {
        'de': 'Eingecheckt',
        'pl': 'Zameldowano',
        'es': 'Registrado',
        'fr': "Arrivée enregistrée",
        'ja': 'チェックイン済み',
    },
}

src = SEED_PATH.read_text()
remaining = []
for m in block_re.finditer(src):
    key, en_raw, de_raw, pl_raw, es_raw, fr_raw, ja_raw = m.groups()
    if de_raw == en_raw and pl_raw == en_raw and es_raw == en_raw and fr_raw == en_raw and ja_raw == en_raw:
        remaining.append({'key': key, 'en': unescape_ts(en_raw)})

print(f'remaining_keys={len(remaining)}')

unique_en = sorted({item['en'] for item in remaining})
print(f'unique_en={len(unique_en)}')

if CACHE_PATH.exists():
    cache = json.loads(CACHE_PATH.read_text())
else:
    cache = {}

for en in unique_en:
    cache.setdefault(en, {})
    if en in manual_overrides:
        cache[en].update(manual_overrides[en])

locales = [('de', 'de'), ('pl', 'pl'), ('es', 'es'), ('fr', 'fr'), ('ja', 'ja')]

for loc, target in locales:
    translator = GoogleTranslator(source='en', target=target)
    pending = [en for en in unique_en if loc not in cache[en] or not cache[en][loc]]
    print(f'{loc}: pending={len(pending)}')
    for idx, en in enumerate(pending, start=1):
        protected, ph = protect_placeholders(en)
        translated = None
        for attempt in range(1, 4):
            try:
                translated = translator.translate(protected)
                break
            except Exception as err:
                if attempt == 3:
                    raise
                time.sleep(1.0 * attempt)
        restored = restore_placeholders(translated, ph)
        cache[en][loc] = restored
        if idx % 10 == 0 or idx == len(pending):
            print(f'{loc}: {idx}/{len(pending)}')
        if idx % 25 == 0:
            CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2))

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2))

# apply cache to seed

def replace_block(match):
    key, en_raw, de_raw, pl_raw, es_raw, fr_raw, ja_raw = match.groups()
    if not (de_raw == en_raw and pl_raw == en_raw and es_raw == en_raw and fr_raw == en_raw and ja_raw == en_raw):
        return match.group(0)
    en = unescape_ts(en_raw)
    tr = cache.get(en, {})
    if not all(loc in tr and tr[loc] for loc in ('de', 'pl', 'es', 'fr', 'ja')):
        return match.group(0)
    return (
        "      {\n"
        f"        key: '{key}',\n"
        "        values: {\n"
        f"          en: '{en_raw}',\n"
        f"          de: '{escape_ts(tr['de'])}',\n"
        f"          pl: '{escape_ts(tr['pl'])}',\n"
        f"          es: '{escape_ts(tr['es'])}',\n"
        f"          fr: '{escape_ts(tr['fr'])}',\n"
        f"          ja: '{escape_ts(tr['ja'])}',\n"
        "        },\n"
        "      },"
    )

new_src = block_re.sub(replace_block, src)
SEED_PATH.write_text(new_src)

still = []
for m in block_re.finditer(new_src):
    key, en_raw, de_raw, pl_raw, es_raw, fr_raw, ja_raw = m.groups()
    if de_raw == en_raw and pl_raw == en_raw and es_raw == en_raw and fr_raw == en_raw and ja_raw == en_raw:
        still.append({'key': key, 'en': unescape_ts(en_raw)})

UNTRANSLATED_PATH.write_text(json.dumps(still, ensure_ascii=False, indent=2))
print('remaining_after', len(still))
