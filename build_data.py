"""Create browser data from the attributed historical apps.csv (Python standard library)."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path


def build(source):
    records = []
    seen = set()
    with source.open(encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            name = row['App']
            if name in seen:
                raise ValueError(f'Duplicate app name: {name}')
            seen.add(name)
            rating = float(row['Rating']) if row['Rating'] not in ('', 'NaN', 'nan') else None
            price = float(row['Price'].replace('$', ''))
            reviews = int(row['Reviews'])
            if rating is not None and (not math.isfinite(rating) or not 1 <= rating <= 5):
                raise ValueError('Invalid rating')
            if not math.isfinite(price) or price < 0 or reviews < 0 or row['Type'] not in ('Free', 'Paid'):
                raise ValueError('Invalid numeric value or pricing type')
            if row['Type'] == 'Free' and price != 0:
                raise ValueError('Free app has nonzero price')
            records.append(dict(id=len(records), name=name, category=row['Category'], rating=rating,
                                reviews=reviews, installs=row['Installs'], type=row['Type'], price=price))
    output = Path(__file__).parent / 'data.js'
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    payload = json.dumps(records, ensure_ascii=True, separators=(',', ':'), allow_nan=False)
    output.write_text(f'// Derived from apps.csv; SHA-256: {digest}\nwindow.APP_DATA={payload};\n', encoding='utf-8')
    print(f'Wrote {len(records)} app records; source SHA-256: {digest}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Path to the original apps.csv')
    build(parser.parse_args().source)
